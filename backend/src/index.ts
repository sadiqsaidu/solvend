import express from 'express';
import 'dotenv/config';
import { connectToDatabase } from './database/connect';
import apiRoutes from './api/routes';
import { startPaymentListener } from './listeners/blockchain.listener';
import { startReportListener } from './listeners/report.listener';

async function main() {
  await connectToDatabase();

  const app = express();
  app.use(express.json());

  const port = process.env.PORT || 3000;

  app.use('/api', apiRoutes);
  
  app.listen(port, () => {
    console.log(`✅ API Server is running on http://localhost:${port}`);
    startPaymentListener();
    startReportListener();
  });
}

main();