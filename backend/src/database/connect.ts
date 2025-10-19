import mongoose from 'mongoose';
import 'dotenv/config';

export async function connectToDatabase() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("MONGO_URI not found in .env file");
    process.exit(1);
  }
  try {
    await mongoose.connect(mongoUri);
    console.log("🔌 Connected to MongoDB");
  } catch (error) {
    console.error("Failed to connect to MongoDB", error);
    process.exit(1);
  }
}