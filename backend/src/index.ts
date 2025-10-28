import "dotenv/config";
import express from "express";
import apiRoutes from "./api/routes";
import { connectToDatabase } from "./database/connect";

async function main() {
  await connectToDatabase();

  const app = express();
  app.use(express.json());

  const port = process.env.PORT || 3000;

  app.use("/api", apiRoutes);

  app.listen(port, () => {
    console.log(`✅ API Server is running on http://localhost:${port}`);

    // Listeners disabled - using immediate confirmation via /api/purchase/confirm instead
    // This avoids RPC rate limiting from free Solana devnet
    // Uncomment if using paid RPC or for production with webhooks
    // startPaymentListener();
    // startReportListener();

    console.log(
      "ℹ️  Using immediate payment confirmation (listeners disabled)"
    );
  });
}

main();
