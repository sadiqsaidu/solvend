## Solvend (Anchor/Solana Program)

Solvend is an Anchor-based Solana program that models a simple vending workflow with two phases:

- Initialize a machine configuration with a payment token and price.
- Create time-bound vouchers off-chain after you confirm payment, and redeem them on-chain to record dispensing.

This separation lets you handle fiat/USDC payment confirmations off-chain while keeping issuance and redemption of vouchers verifiable on-chain.

### Program ID

The program declares the following ID in `programs/solvend/src/lib.rs`:

```
FGWgre3gcnWmAod7vDuL7ziMV28bgSrG7ng69g1kZfUW
```

Update your local ID if you redeploy under a different keypair.

---

### Accounts

- `MachineConfig`
  - `owner: Pubkey` — wallet that initialized the machine
  - `token_mint: Pubkey` — SPL token mint for payments (e.g., USDC)
  - `price: u64` — price in smallest token units (e.g., USDC has 6 decimals)
  - `total_sales: u64` — placeholder for future accounting (not incremented yet)
  - `bump: u8` — PDA bump

- `Voucher`
  - `user: Pubkey` — end user receiving the voucher
  - `hash_otp: [u8; 32]` — hash of an OTP or secret used by the dispenser
  - `expiry_ts: i64` — unix timestamp when the voucher expires
  - `redeemed: bool` — whether the voucher has been redeemed
  - `is_free: bool` — marks whether payment was waived (e.g., free vend)
  - `nonce: u64` — unique value to derive a unique PDA per user/issuance
  - `bump: u8` — PDA bump

---

### PDAs

- `MachineConfig` PDA: `seeds = [b"machine"]`
- `Voucher` PDA: `seeds = [b"voucher", user.key().as_ref(), nonce.to_le_bytes()]`

These are created and derived via Anchor using the provided seeds and stored bump.

---

### Instructions

1) `initialize_machine(price: u64, token_mint: Pubkey)`

Accounts:

- `machine_config` (PDA, init, payer = owner)
- `owner` (signer, mutable)
- `system_program` (auto-resolved)

Behavior:

- Creates the `MachineConfig` PDA and stores `owner`, `price`, `token_mint`, sets `total_sales = 0` and saves the bump.

2) `create_voucher(hash_otp: [u8; 32], expiry_ts: i64, is_free: bool, nonce: u64)`

Accounts:

- `voucher` (PDA, init, payer = authority)
- `user` (any account; the user receiving the voucher)
- `authority` (signer, mutable; the backend/merchant issuing the voucher)
- `system_program` (auto-resolved)

Behavior:

- Requires `expiry_ts` be in the future.
- Writes a voucher for `user` with supplied values and saves the bump.

3) `redeem_voucher()`

Accounts:

- `voucher` (PDA, mut)
- `authority` (signer)

Behavior:

- Requires the voucher is not already redeemed and not expired.
- Marks voucher `redeemed = true` and emits `VoucherRedeemed` event with `user`, timestamp, `is_free`.

---

### Building

```bash
anchor build
```

Artifacts will be under `target/` including the IDL.

### Localnet and Deployment

```bash
# Start a local validator
solana-test-validator -r

# In another shell, set cluster and keypair
solana config set --url localhost

# Deploy
anchor deploy
```

If you change the deployed program ID, update `declare_id!` in `lib.rs` and any client config pointing to the program.

---

### Testing

Tests live under `tests/`. Example for initializing the machine (TypeScript test):

```ts
const tx = await program.methods
  .initializeMachine(priceOnChain, usdcMint)
  .accounts({
    machineConfig: machineConfigPDA,
    owner: owner.publicKey,
  })
  .rpc();
```

Note:

- `systemProgram` is auto-resolved by Anchor; do not pass it manually.
- The `machineConfig` PDA is derived with `seeds = ["machine"]` as in the test helper:

```ts
const [machineConfigPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("machine")],
  program.programId,
);
```

Run all tests:

```bash
anchor test
```

---

### Example Voucher Flow (client-side outline)

1. User pays off-chain or via SPL token transfer you verify.
2. Backend confirms payment, then issues a voucher on-chain:

```ts
await program.methods
  .createVoucher(hashOtp, expiryTs, false, nonce)
  .accounts({
    voucher: voucherPda,
    user: userPubkey,
    authority: backendAuthority.publicKey,
  })
  .signers([backendAuthority])
  .rpc();
```

3. Dispenser validates OTP and redeems on-chain to record success:

```ts
await program.methods
  .redeemVoucher()
  .accounts({
    voucher: voucherPda,
    authority: dispenserAuthority.publicKey,
  })
  .signers([dispenserAuthority])
  .rpc();
```

---

### Notes and Considerations

- Prices must be provided in smallest token units (e.g., USDC has 6 decimals).
- `total_sales` currently is not incremented; extend logic as needed.
- `hash_otp` should be computed off-chain (e.g., SHA-256 of an OTP/secret).
- `authority` semantics for issuing and redeeming can be tailored to your trust model.


