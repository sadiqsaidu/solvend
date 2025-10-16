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

// ============ EVENTS ============
#[event]
pub struct VoucherRedeemed {
    pub user: Pubkey,
    pub timestamp: i64,
    pub is_free: bool,
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
}