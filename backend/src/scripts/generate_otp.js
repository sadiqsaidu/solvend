const { MongoClient } = require('mongodb');
const { keccak256 } = require('js-sha3');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/solvend';

async function main() {
  const referenceId = process.argv[2];
  if (!referenceId) {
    console.error('Usage: node generate_otp.js <referenceId>');
    process.exit(1);
  }

  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(); // DB from URI path
  const purchases = db.collection('purchases');

  const purchase = await purchases.findOne({ referenceId });
  if (!purchase) {
    console.error('Purchase not found for', referenceId);
    await client.close();
    process.exit(2);
  }

  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  const otpHashHex = keccak256(otp);
  const otpExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await purchases.updateOne(
    { _id: purchase._id },
    {
      $set: {
        otpHash: otpHashHex,
        otpExpiry,
        status: 'OTP_ISSUED',
        updatedAt: new Date(),
      },
    }
  );

  console.log('OTP for', referenceId, '=', otp);
  console.log('Expires at', otpExpiry.toISOString());
  await client.close();
}

main().catch(err => { console.error(err); process.exit(1); });