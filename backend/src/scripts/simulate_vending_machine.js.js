const { MongoClient } = require('mongodb');
const { keccak256 } = require('js-sha3');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/solvend';

async function main() {
  const referenceId = process.argv[2];
  const otp = process.argv[3];
  const machineId = process.argv[4] || 'local-vending-sim';

  if (!referenceId || !otp) {
    console.error('Usage: node simulate_vending_machine.js <referenceId> <otp> [machineId]');
    process.exit(1);
  }

  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db();
  const purchases = db.collection('purchases');
  const claims = db.collection('claims');

  const purchase = await purchases.findOne({ referenceId });
  if (!purchase) {
    console.error('Purchase not found for', referenceId);
    await client.close();
    process.exit(2);
  }

  if (!purchase.otpHash) {
    console.error('No OTP issued for this purchase (status:', purchase.status, ')');
    await client.close();
    process.exit(3);
  }

  if (purchase.otpExpiry && new Date(purchase.otpExpiry) < new Date()) {
    console.error('OTP expired at', purchase.otpExpiry);
    await client.close();
    process.exit(4);
  }

  const otpHash = keccak256(otp);
  if (otpHash !== purchase.otpHash) {
    console.error('Invalid OTP');
    await client.close();
    process.exit(5);
  }

  await purchases.updateOne(
    { _id: purchase._id },
    { $set: { status: 'REDEEMED', redeemedAt: new Date(), updatedAt: new Date() } }
  );

  await claims.insertOne({
    purchaseId: purchase._id,
    referenceId: purchase.referenceId,
    redeemedAt: new Date(),
    machineId,
    userWallet: purchase.userWallet || null,
  });

  console.log('✅ Purchase', referenceId, 'redeemed by machine', machineId);
  await client.close();
}

main().catch(err => { console.error(err); process.exit(1); });