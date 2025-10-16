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
        
        msg!("Machine initialized with price: {} lamports", machine.token_mint);
        msg!("Price set to: {}", machine.price);
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