use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use solana_program::keccak;

declare_id!("FGWgre3gcnWmAod7vDuL7ziMV28bgSrG7ng69g1kZfUW");

#[program]
pub mod solvend {
    use super::*;

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
        Ok(())
    }

    pub fn initialize_treasury(ctx: Context<InitializeTreasury>) -> Result<()> {
        let treasury = &mut ctx.accounts.treasury;
        treasury.token_account = ctx.accounts.treasury_token_account.key();
        treasury.total_collected = 0;
        treasury.report_count = 0;
        treasury.bump = ctx.bumps.treasury;
        Ok(())
    }

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
        Ok(())
    }

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

    pub fn increment_progress(
        ctx: Context<IncrementProgress>,
        opt_in: bool,
    ) -> Result<()> {
        let progress = &mut ctx.accounts.user_progress;
        if progress.purchase_count == 0 && progress.user == Pubkey::default() {
            progress.user = ctx.accounts.user.key();
            progress.opt_in = opt_in;
            progress.total_earnings = 0;
            progress.bump = ctx.bumps.user_progress;
        }
        if progress.purchase_count < 10 {
            progress.purchase_count += 1;
        }
        ctx.accounts.machine_config.total_sales += 1;
        emit!(ProgressIncremented {
            user: progress.user,
            new_count: progress.purchase_count,
        });
        Ok(())
    }

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

    pub fn reset_progress(ctx: Context<ResetProgress>) -> Result<()> {
        let progress = &mut ctx.accounts.user_progress;
        require!(progress.nft_mint.is_some(), ErrorCode::NoNftToRedeem);
        progress.purchase_count = 0;
        progress.nft_mint = None;
        Ok(())
    }

    pub fn buy_report(
        ctx: Context<BuyReport>,
        report_type: ReportType,
        timeframe_days: u8,
    ) -> Result<()> {
        let report = &mut ctx.accounts.report;
        let treasury = &mut ctx.accounts.treasury;
        let clock = Clock::get()?;
        let price = get_report_price(report_type);

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

        let owner_share = price
            .checked_mul(10)
            .ok_or(ErrorCode::CalculationOverflow)?
            .checked_div(100)
            .ok_or(ErrorCode::CalculationOverflow)?;
            
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.treasury_token_account.to_account_info(),
                    to: ctx.accounts.owner_token_account.to_account_info(),
                    authority: treasury.to_account_info(),
                },
                &[&[b"treasury", &[treasury.bump]]],
            ),
            owner_share,
        )?;

        report.report_id = treasury.report_count;
        report.buyer = ctx.accounts.buyer.key();
        report.report_type = report_type;
        report.timeframe_days = timeframe_days;
        report.paid_amount = price;
        report.ipfs_cid = None;
        report.status = ReportStatus::Pending;
        report.created_at = clock.unix_timestamp;
        report.remaining_for_distribution = price - owner_share;
        report.merkle_root = None;
        report.bump = ctx.bumps.report;
        
        treasury.total_collected += price;
        treasury.report_count += 1;

        emit!(ReportPurchased {
            report_id: report.report_id,
            buyer: report.buyer,
            report_type,
            paid_amount: price,
        });

        Ok(())
    }

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

    pub fn submit_distribution_root(
        ctx: Context<SubmitDistributionRoot>,
        merkle_root: [u8; 32],
    ) -> Result<()> {
        let report = &mut ctx.accounts.report;
        require!(report.status == ReportStatus::Ready, ErrorCode::ReportNotReady);
        require!(report.merkle_root.is_none(), ErrorCode::DistributionRootAlreadySet);
        report.merkle_root = Some(merkle_root);
        report.status = ReportStatus::DistributionReady;
        Ok(())
    }

    pub fn claim_earnings(
        ctx: Context<ClaimEarnings>,
        amount: u64,
        proof: Vec<[u8; 32]>,
    ) -> Result<()> {
        let report = &mut ctx.accounts.report;
        let treasury = &ctx.accounts.treasury;
        let claimant = &ctx.accounts.claimant;
        let merkle_root = report.merkle_root.ok_or(ErrorCode::DistributionNotReady)?;

        require!(report.status == ReportStatus::DistributionReady, ErrorCode::DistributionNotReady);
        require!(amount <= report.remaining_for_distribution, ErrorCode::InsufficientFundsForClaim);

        let leaf = keccak::hashv(&[claimant.key().as_ref(), &amount.to_le_bytes()]);
        require!(verify_merkle_proof(proof, merkle_root, leaf.to_bytes()), ErrorCode::InvalidMerkleProof);

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.treasury_token_account.to_account_info(),
                    to: ctx.accounts.claimant_token_account.to_account_info(),
                    authority: treasury.to_account_info(),
                },
                &[&[b"treasury", &[treasury.bump]]],
            ),
            amount,
        )?;

        report.remaining_for_distribution = report
            .remaining_for_distribution
            .checked_sub(amount)
            .ok_or(ErrorCode::CalculationOverflow)?;

        let claim_record = &mut ctx.accounts.claim_record;
        claim_record.claimant = claimant.key();
        claim_record.report_id = report.report_id;
        claim_record.amount = amount;
        claim_record.bump = ctx.bumps.claim_record;

        Ok(())
    }
}

fn verify_merkle_proof(proof: Vec<[u8; 32]>, root: [u8; 32], leaf: [u8; 32]) -> bool {
    let mut computed_hash = leaf;
    for proof_element in proof.iter() {
        if computed_hash <= *proof_element {
            computed_hash = keccak::hashv(&[&computed_hash, proof_element]).to_bytes();
        } else {
            computed_hash = keccak::hashv(&[proof_element, &computed_hash]).to_bytes();
        }
    }
    computed_hash == root
}

#[account]
pub struct MachineConfig {
    pub owner: Pubkey,
    pub token_mint: Pubkey,
    pub price: u64,
    pub total_sales: u64,
    pub bump: u8,
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
    pub report_count: u64,
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
    pub merkle_root: Option<[u8; 32]>,
    pub bump: u8,
}

#[account]
pub struct ClaimRecord {
    pub claimant: Pubkey,
    pub report_id: u64,
    pub amount: u64,
    pub bump: u8,
}

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
    DistributionReady,
    Distributed,
}

pub fn get_report_price(report_type: ReportType) -> u64 {
    match report_type {
        ReportType::Daily => 1_000_000u64,
        ReportType::Weekly => 5_000_000u64,
        ReportType::Monthly => 20_000_000u64,
    }
}

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
        space = 8 + 32 + 8 + 8 + 1,
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
    pub treasury_token_account: Account<'info, TokenAccount>,
    pub usdc_mint: Account<'info, Mint>,
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
    #[account(constraint = authority.key() == machine_config.owner @ ErrorCode::OwnerAccountMismatch)]
    pub authority: Signer<'info>,
    #[account(seeds = [b"machine"], bump = machine_config.bump)]
    pub machine_config: Account<'info, MachineConfig>,
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
    #[account(constraint = authority.key() == machine_config.owner @ ErrorCode::OwnerAccountMismatch)]
    pub authority: Signer<'info>,
    #[account(seeds = [b"machine"], bump = machine_config.bump)]
    pub machine_config: Account<'info, MachineConfig>,
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
    #[account(mut, seeds = [b"machine"], bump = machine_config.bump)]
    pub machine_config: Account<'info, MachineConfig>,
    /// CHECK: user whose progress is being tracked
    pub user: AccountInfo<'info>,
    #[account(constraint = authority.key() == machine_config.owner @ ErrorCode::OwnerAccountMismatch)]
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
    #[account(constraint = authority.key() == machine_config.owner @ ErrorCode::OwnerAccountMismatch)]
    pub authority: Signer<'info>,
    #[account(seeds = [b"machine"], bump = machine_config.bump)]
    pub machine_config: Account<'info, MachineConfig>,
}

#[derive(Accounts)]
pub struct ResetProgress<'info> {
    #[account(
        mut,
        seeds = [b"user", user_progress.user.as_ref()],
        bump = user_progress.bump
    )]
    pub user_progress: Account<'info, UserProgress>,
    #[account(constraint = authority.key() == machine_config.owner @ ErrorCode::OwnerAccountMismatch)]
    pub authority: Signer<'info>,
    #[account(seeds = [b"machine"], bump = machine_config.bump)]
    pub machine_config: Account<'info, MachineConfig>,
}

#[derive(Accounts)]
pub struct BuyReport<'info> {
    #[account(
        init,
        payer = buyer,
        space = 8 + 178,
        seeds = [b"report", buyer.key().as_ref(), treasury.report_count.to_le_bytes().as_ref()],
        bump
    )]
    pub report: Account<'info, Report>,
    #[account(mut, seeds = [b"treasury"], bump = treasury.bump)]
    pub treasury: Account<'info, Treasury>,
    #[account(mut, constraint = treasury_token_account.key() == treasury.token_account)]
    pub treasury_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub buyer_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = owner_token_account.owner == machine_config.owner @ ErrorCode::OwnerAccountMismatch
    )]
    pub owner_token_account: Account<'info, TokenAccount>,
    #[account(seeds = [b"machine"], bump = machine_config.bump)]
    pub machine_config: Account<'info, MachineConfig>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(report_id: u64)]
pub struct AttachReportData<'info> {
    #[account(
        mut,
        seeds = [b"report", buyer.key().as_ref(), report_id.to_le_bytes().as_ref()],
        bump = report.bump
    )]
    pub report: Account<'info, Report>,
    /// CHECK: The buyer of the report, needed for PDA validation.
    pub buyer: AccountInfo<'info>,
    #[account(constraint = authority.key() == machine_config.owner @ ErrorCode::OwnerAccountMismatch)]
    pub authority: Signer<'info>,
    #[account(seeds = [b"machine"], bump = machine_config.bump)]
    pub machine_config: Account<'info, MachineConfig>,
}

#[derive(Accounts)]
#[instruction(report_id: u64)]
pub struct SubmitDistributionRoot<'info> {
    #[account(
        mut,
        seeds = [b"report", buyer.key().as_ref(), report_id.to_le_bytes().as_ref()],
        bump = report.bump
    )]
    pub report: Account<'info, Report>,
    /// CHECK: The buyer of the report, needed for PDA validation.
    pub buyer: AccountInfo<'info>,
    #[account(constraint = authority.key() == machine_config.owner @ ErrorCode::OwnerAccountMismatch)]
    pub authority: Signer<'info>,
    #[account(seeds = [b"machine"], bump = machine_config.bump)]
    pub machine_config: Account<'info, MachineConfig>,
}

#[derive(Accounts)]
#[instruction(report_id: u64)]
pub struct ClaimEarnings<'info> {
    #[account(
        mut,
        seeds = [b"report", buyer.key().as_ref(), report_id.to_le_bytes().as_ref()],
        bump = report.bump
    )]
    pub report: Account<'info, Report>,
    /// CHECK: The buyer of the report, needed for PDA validation.
    pub buyer: AccountInfo<'info>,
    #[account(seeds = [b"treasury"], bump = treasury.bump)]
    pub treasury: Account<'info, Treasury>,
    #[account(mut, seeds=[b"treasury", b"usdtoken"], bump)]
    pub treasury_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub claimant_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub claimant: Signer<'info>,
    #[account(
        init,
        payer = claimant,
        space = 8 + 32 + 8 + 8 + 1,
        seeds = [b"claim", claimant.key().as_ref(), report_id.to_le_bytes().as_ref()],
        bump
    )]
    pub claim_record: Account<'info, ClaimRecord>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

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
    pub paid_amount: u64,
}
#[event]
pub struct ReportReady {
    pub report_id: u64,
    pub ipfs_cid: String,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid expiry timestamp")]
    InvalidExpiry,
    #[msg("Voucher already redeemed")]
    AlreadyRedeemed,
    #[msg("Voucher has expired")]
    VoucherExpired,
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
    #[msg("Report not ready for distribution root")]
    ReportNotReady,
    #[msg("Distribution root has already been set")]
    DistributionRootAlreadySet,
    #[msg("Distribution is not ready for claims")]
    DistributionNotReady,
    #[msg("Invalid Merkle Proof")]
    InvalidMerkleProof,
    #[msg("Owner token account does not match machine owner")]
    OwnerAccountMismatch,
    #[msg("Insufficient funds remaining for this claim")]
    InsufficientFundsForClaim,
    #[msg("Calculation overflow")]
    CalculationOverflow,
}