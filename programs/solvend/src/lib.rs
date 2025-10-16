use anchor_lang::prelude::*;

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
#[instruction(nonce: u64)]
pub struct CreateVoucher<'info> {
    #[account(
        init, 
        payer = authority,
        space = 8 + 83,
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
        space = 8 + 76, 
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
}