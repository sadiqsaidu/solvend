use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("FGWgre3gcnWmAod7vDuL7ziMV28bgSrG7ng69g1kZfUW");

#[program]
pub mod solvend {
    use super::*;

    // Initialize machine
    pub fn initialize_machine(
        ctx: Context<InitializeMachine>,
        price: u64,
        token_mint: Pubkey,
    ) -> Result<()> {
        let machine = &mut ctx.accounts.machine_config;
        machine.owner = ctx.accounts.owner.key();
        machine.price = price;
        machine.token_mint = token_mint;
        machine.total_sales = 0;
        machine.bump = ctx.bumps.machine_config;
        
        msg!("Machine initialized for token: {}", machine.token_mint);
        msg!("Price set to: {}", machine.price);
        Ok(())
    }

    // Initialize the treasury
    pub fn initialize_treasury(ctx: Context<InitializeTreasury>) -> Result<()> {
        let treasury = &mut ctx.accounts.treasury;
        treasury.token_account = ctx.accounts.treasury_token_account.key();
        treasury.total_collected = 0;
        treasury.bump = ctx.bumps.treasury;

        msg!("Treasury initializd with token account: {}", treasury.token_account);
        Ok(())
    }

    // create purchase voucher (after confirmed payment)
    pub fn create_voucher(
        ctx: Context<CreateVoucher>,
        hash_otp: [u8; 32],
        expiry_ts: i64,
        is_free: bool,
        nonce: u64,
    ) -> Result<()> {
        let voucher = &mut ctx.accounts.voucher;
        let clock = Clock::get()?;

        require!(expiry_ts > clock.unix_timestamp, ErrorCode::InvalidExpiry);

        voucher.user = ctx.accounts.user.key();
        voucher.hash_otp = hash_otp;
        voucher.expiry_ts = expiry_ts;
        voucher.redeemed = false;
        voucher.is_free = is_free;
        voucher.nonce = nonce;
        voucher.bump = ctx.bumps.voucher;

        msg!("Voucher created for user: {}", ctx.accounts.user.key());
        Ok(())
    }

    // redeem voucher (after dispensing)
    pub fn redeem_voucher(ctx: Context<RedeemVoucher>) -> Result<()> {
        let voucher = &mut ctx.accounts.voucher; 
        let clock = Clock::get()?;

        require!(!voucher.redeemed, ErrorCode::AlreadyRedeemed);
        require!(clock.unix_timestamp <= voucher.expiry_ts, ErrorCode::VoucherExpired);

        voucher.redeemed = true;

        emit!(VoucherRedeemed {
            user: voucher.user,
            timestamp: clock.unix_timestamp,
            is_free: voucher.is_free,
        });

        Ok(())
    }

    // increment user progress 
    pub fn increment_progress(
        ctx: Context<IncrementProgress>,
        opt_in: bool, 
    ) -> Result<()> {
        let progress = &mut ctx.accounts.user_progress;
        let machine = &mut ctx.accounts.machine_config;

        if progress.purchase_count == 0 {
            // initialize on first purchase
            progress.user = ctx.accounts.user.key();
            progress.opt_in = opt_in;
            progress.total_earnings = 0;
            progress.bump = ctx.bumps.user_progress;
        }

        require!(progress.purchase_count < 10, ErrorCode::ProgressFull);

        progress.purchase_count += 1;
        machine.total_sales += 1;

        emit!(ProgressIncremented {
            user: progress.user, 
            new_count: progress.purchase_count,
        });

        Ok(())
    }

    // record NFT Mint (called by backend after minting)
    pub fn set_nft_mint(
        ctx: Context<SetNftMint>,
        nft_mint: Pubkey,
    ) -> Result<()> {
        let progress = &mut ctx.accounts.user_progress;

        require!(progress.purchase_count >= 10, ErrorCode::InsufficientPurchases);
        require!(progress.nft_mint.is_none(), ErrorCode::NftAlreadyMinted);

        progress.nft_mint = Some(nft_mint);

        Ok(())
    }

    // reset user progress after redeeming NFT
    pub fn reset_progress(ctx: Context<ResetProgress>) -> Result<()> {
        let progress = &mut ctx.accounts.user_progress;

        require!(progress.nft_mint.is_some(), ErrorCode::NoNftToRedeem);

        progress.purchase_count = 0;
        progress.nft_mint = None;

        Ok(())
    }

    // buy report
    pub fn buy_report(
        ctx: Context<BuyReport>,
        report_type: ReportType,
        timeframe_days: u8,
    ) -> Result<()> {
        let report = &mut ctx.accounts.report;
        let treasury = &ctx.accounts.treasury;
        let clock = Clock::get()?;

        let price = get_report_price(report_type);

        // transfer usdc from buyer to treasury
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer_token_account.to_account_info(),
                    to: ctx.accounts.treasury_token_account.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                },
            ),
            price,
        )?;

        // calculate and send 10% to machine owner
        let owner_share = price * 10 / 100;
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.treasury_token_account.to_account_info(),
                    to: ctx.accounts.owner_token_account.to_account_info(),
                    authority: ctx.accounts.treasury.to_account_info(),
                },
                &[&[b"treasury", &[treasury.bump]]],
            ),
            owner_share,
        )?;

        // create report record
        report.report_id = treasury.total_collected / price;
        report.buyer = ctx.accounts.buyer.key();
        report.report_type = report_type;
        report.timeframe_days = timeframe_days;
        report.paid_amount = price;
        report.ipfs_cid = None;
        report.status = ReportStatus::Pending;
        report.created_at = clock.unix_timestamp;
        report.remaining_for_distribution = price - owner_share; // 90%
        report.bump = ctx.bumps.report; 

        let treasury = &mut ctx.accounts.treasury;
        treasury.total_collected += price;

        emit!(ReportPurchased {
            report_id: report.report_id,
            buyer: report.buyer,
            report_type,
            paid_amount: price,
        });

        Ok(())
    }

    // attach report data
    pub fn attach_report_data(
        ctx: Context<AttachReportData>,
        ipfs_cid: String,
    ) -> Result<()> {
        let report = &mut ctx.accounts.report;

        require!(report.status == ReportStatus::Pending, ErrorCode::ReportNotPending);
        require!(ipfs_cid.len() <= 64, ErrorCode::CidTooLong);

        report.ipfs_cid = Some(ipfs_cid);
        report.status = ReportStatus::Ready; 

        emit!(ReportReady {
            report_id: report.report_id, 
            ipfs_cid: report.ipfs_cid.clone().unwrap(),
        });

        Ok(())
    }

    // distributes earnings
    pub fn distribute_earnings<'info>(
        ctx: Context<'_, '_, 'info, 'info, DistributeEarnings<'info>>, // <-- FIX: Changed the third '_' to 'info'
        report_id: u64,
        num_recipient: u8,
    ) -> Result<()> {
        let report = &mut ctx.accounts.report;
        let treasury = &ctx.accounts.treasury;

        require!(report.status == ReportStatus::Ready, ErrorCode::ReportNotReady);
        require!(report.remaining_for_distribution > 0, ErrorCode::AlreadyDistributed);

        let share_per_user = report.remaining_for_distribution / num_recipient as u64;

        let accounts = &ctx.remaining_accounts;
        require!(accounts.len() == (num_recipient as usize * 2), ErrorCode::InvalidAccountCount);
        
        for i in 0..(num_recipient as usize) {
            let user_token_account_info = &accounts[i * 2];
            let user_progress_info = &accounts[i * 2 + 1];

            // Deserialize and verify accounts
            let user_token_account = Account::<TokenAccount>::try_from(user_token_account_info)?;
            let user_progress = Account::<UserProgress>::try_from(user_progress_info)?;
            
            require!(
                user_token_account.owner == user_progress.user,
                ErrorCode::UserAccountMismatch
            );

            // Transfer to user
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.treasury_token_account.to_account_info(),
                        to: user_token_account_info.to_account_info(),
                        authority: ctx.accounts.treasury.to_account_info(),
                    },
                    &[&[b"treasury", &[treasury.bump]]],
                ),
                share_per_user,
            )?;

            // Re-deserialize mutably to update user progress earnings 
            let mut user_progress = Account::<UserProgress>::try_from(user_progress_info)?;
            user_progress.total_earnings += share_per_user;
            user_progress.exit(&crate::ID)?;
        }

        report.remaining_for_distribution = 0;
        report.status = ReportStatus::Distributed;

        emit!(EarningsDistributed {
            report_id, 
            total_amount: share_per_user * num_recipient as u64,
            num_recipient,
        });

        Ok(())
    }

}

// ============ ACCOUNT STRUCTURES ============

#[account]
pub struct MachineConfig {
    pub owner: Pubkey,          //32
    pub token_mint: Pubkey,     //32
    pub price: u64,             //8
    pub total_sales: u64,       //8
    pub bump: u8,               //1
}

#[account]
pub struct Voucher {
    pub user: Pubkey, 
    pub hash_otp: [u8; 32], 
    pub expiry_ts: i64, 
    pub redeemed: bool, 
    pub is_free: bool,
    pub nonce: u64, 
    pub bump: u8,
}

#[account]
pub struct UserProgress {
    pub user: Pubkey, 
    pub purchase_count: u8,
    pub nft_mint: Option<Pubkey>,
    pub opt_in: bool, 
    pub total_earnings: u64,
    pub bump: u8,
}

#[account]
pub struct Treasury {
    pub token_account: Pubkey,
    pub total_collected: u64,
    pub bump: u8,
}

#[account]
pub struct Report {
    pub report_id: u64,
    pub buyer: Pubkey,
    pub report_type: ReportType,
    pub timeframe_days: u8, 
    pub paid_amount: u64,
    pub ipfs_cid: Option<String>,
    pub status: ReportStatus, 
    pub created_at: i64, 
    pub remaining_for_distribution: u64,
    pub bump: u8,
}

// ============ ENUMS ============
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ReportType {
    Daily,
    Weekly,
    Monthly,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ReportStatus {
    Pending, 
    Ready, 
    Distributed,
}

pub fn get_report_price(report_type: ReportType) -> u64 {
    match report_type {
        ReportType::Daily => 1_000_000u64,      // 1 usdc
        ReportType::Weekly => 5_000_000u64,     // 5 usdc
        ReportType::Monthly => 20_000_000u64,   // 20 usdc
    }
}

// ============ CONTEXTS ============

#[derive(Accounts)]
pub struct InitializeMachine<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + 32 + 32 + 8 + 8 + 1,
        seeds = [b"machine"],
        bump
    )]
    pub machine_config: Account<'info, MachineConfig>,

    #[account(mut)]
    pub owner: Signer<'info>, 

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeTreasury<'info> {
    #[account(
        init, 
        payer = authority, 
        space = 8 + 32 + 8 + 1,
        seeds = [b"treasury"],
        bump
    )]
    pub treasury: Account<'info, Treasury>,

    #[account(
        init,
        payer = authority,
        token::mint = usdc_mint, 
        token::authority = treasury, 
        seeds = [b"treasury", b"usdtoken"],
        bump
    )]
    pub treasury_token_account: Account <'info, TokenAccount>,

    pub usdc_mint: Account<'info, token::Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>, 
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(nonce: u64)]
pub struct CreateVoucher<'info> {
    #[account(
        init, 
        payer = authority,
        space = 8 + 32 + 32 + 8 + 1 + 1 + 8 + 1,
        seeds = [b"voucher", user.key().as_ref(), nonce.to_le_bytes().as_ref()],
        bump
    )]
    pub voucher: Account<'info, Voucher>,

    /// CHECK: User wallet receiving voucher
    pub user: AccountInfo<'info>,

    #[account(mut)]
    pub authority: Signer<'info>, // Backend/merchant authority

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RedeemVoucher<'info> {
    #[account(
        mut,
        seeds = [b"voucher", voucher.user.as_ref(), voucher.nonce.to_le_bytes().as_ref()],
        bump = voucher.bump
    )]
    pub voucher: Account<'info, Voucher>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct IncrementProgress<'info> {
    #[account(
        init_if_needed, 
        payer = authority, 
        space = 8 + 32 + 1 + 33 + 1 + 8 + 1, 
        seeds = [b"user", user.key().as_ref()],
        bump
    )]
    pub user_progress: Account<'info, UserProgress>,

    #[account(mut)]
    pub machine_config: Account<'info, MachineConfig>,

    /// CHECK: user whose progress is being tracked
    pub user: AccountInfo<'info>,

    #[account(mut)]
    pub authority: Signer<'info>, 
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetNftMint<'info> {
    #[account(
        mut,
        seeds = [b"user", user_progress.user.as_ref()],
        bump = user_progress.bump
    )]
    pub user_progress: Account<'info, UserProgress>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ResetProgress<'info> {
    #[account(
        mut, 
        seeds = [b"user", user_progress.user.as_ref()],
        bump = user_progress.bump
    )]
    pub user_progress: Account<'info, UserProgress>, 

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct BuyReport<'info> {
    #[account(
        init,
        payer = buyer,
        space = 8 + 136, 
        seeds = [b"report", treasury.total_collected.to_le_bytes().as_ref()],
        bump
    )]
    pub report: Account<'info, Report>,

    #[account(mut)]
    pub treasury: Account<'info, Treasury>,

    #[account(mut)]
    pub treasury_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub buyer_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub owner_token_account: Account<'info, TokenAccount>,

    pub machine_config: Account<'info, MachineConfig>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AttachReportData<'info> {
    #[account(
        mut,
        seeds = [b"report", report.report_id.to_le_bytes().as_ref()],
        bump = report.bump
    )]
    pub report: Account<'info, Report>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(report_id: u64)]
pub struct DistributeEarnings<'info> {
    #[account(
        mut,
        seeds = [b"report", report_id.to_le_bytes().as_ref()],
        bump = report.bump
    )]
    pub report: Account<'info, Report>,

    #[account(
        seeds = [b"treasury"],
        bump = treasury.bump
    )]
    pub treasury: Account<'info, Treasury>,

    #[account(mut)]
    pub treasury_token_account: Account<'info, TokenAccount>,

    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token>,
    // remaining_accounts: [user_token_account_0, user_progress_0, ...]
}

// ============ EVENTS ============
#[event]
pub struct VoucherRedeemed {
    pub user: Pubkey,
    pub timestamp: i64,
    pub is_free: bool,
}

#[event]
pub struct ProgressIncremented {
    pub user: Pubkey, 
    pub new_count: u8,
}

#[event]
pub struct ReportPurchased {
    pub report_id: u64,
    pub buyer: Pubkey,
    pub report_type: ReportType,
    pub paid_amount: u64
}

#[event]
pub struct ReportReady {
    pub report_id: u64,
    pub ipfs_cid: String,
}

#[event]
pub struct EarningsDistributed {
    pub report_id: u64, 
    pub total_amount: u64,
    pub num_recipient: u8,
}

// ============ ERRORS ============

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid expiry timestamp")]
    InvalidExpiry,
    #[msg("Voucher already redeemed")]
    AlreadyRedeemed,
    #[msg("Voucher has expired")]
    VoucherExpired,
    #[msg("Progress already at maximum (10)")]
    ProgressFull,
    #[msg("Insufficient purchases for NFT mint")]
    InsufficientPurchases,
    #[msg("NFT already minted for this user")]
    NftAlreadyMinted,
    #[msg("No NFT to redeem")]
    NoNftToRedeem,
    #[msg("Report is not in pending status")]
    ReportNotPending,
    #[msg("IPFS CID too long (max 64 chars)")]
    CidTooLong,
    #[msg("Report not ready for distribution")]
    ReportNotReady,
    #[msg("Earnings already distributed")]
    AlreadyDistributed,
    #[msg("Invalid number of accounts provided")]
    InvalidAccountCount,
    #[msg("User token account does not match progress account")]
    UserAccountMismatch,
}