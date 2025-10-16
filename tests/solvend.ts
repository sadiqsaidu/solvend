import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Solvend } from "../target/types/solvend";
import { assert } from "chai";
import { PublicKey } from "@solana/web3.js";

describe("solvend", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.solvend as Program<Solvend>;
  const owner = provider.wallet as anchor.Wallet;

  // ----- Test Setup -----
  // USDC Devnet mint address: Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr
  const usdcMint = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"); 

  // Price equilalent to 500 naira
  const priceInUsdc = 0.34;

  const usdcDecimals = 6;

  const priceOnChain = new anchor.BN(priceInUsdc * Math.pow(10, usdcDecimals));

  const [machineConfigPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("machine")],
    program.programId,
  );

  it("Is initialized!", async () => {
    const tx = await program.methods
      .initializeMachine(priceOnChain, usdcMint)
      .accounts({
        owner: owner.publicKey,
      })
      .rpc();

    console.log("Transaction signature:", tx);

    // verifying the result
    const machineAccount = await program.account.machineConfig.fetch(machineConfigPDA);

    // Assert that data was stored correctly 
    assert.ok(machineAccount.owner.equals(owner.publicKey), "Owner is correct"); 
    assert.ok(machineAccount.tokenMint.equals(usdcMint), "Token mint is correct");
    assert.ok(machineAccount.price.eq(priceOnChain), "Price is set correct");
    assert.strictEqual(machineAccount.totalSales.toNumber(), 0, "Initial sales should be 0");

    console.log("✅ Machine initialized successfully!");
    console.log(`   - Token Mint: ${machineAccount.tokenMint.toBase58()}`);
    console.log(`   - Price (on-chain): ${machineAccount.price.toString()}`);
  })
});
