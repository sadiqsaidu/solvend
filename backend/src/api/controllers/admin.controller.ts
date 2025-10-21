import { Request, Response } from 'express';
import { Report } from '../../database/models/report.model';
import { submitDistributionRootOnChain, attachReportDataOnChain } from '../../services/solana.service';
import { Keypair } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';

const BACKEND_WALLET_PATH = process.env.BACKEND_WALLET_PATH || './keys/backend.json';

function loadWalletKeypair(): Keypair {
  const kp = JSON.parse(fs.readFileSync(path.resolve(BACKEND_WALLET_PATH), 'utf8'));
  return Keypair.fromSecretKey(Uint8Array.from(kp));
}

export async function submitDistributionRootHandler(req: Request, res: Response) {
  try {
    const { root, reportId, buyerWallet } = req.body;
    
    if (!root || !reportId || !buyerWallet) {
      return res.status(400).json({ error: 'root, reportId, and buyerWallet are required' });
    }

    // Find the report in database
    const report = await Report.findOne({ 
      reportId, 
      buyerWallet, 
      status: 'READY' 
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found or not ready' });
    }

    // Convert hex string to number array
    const merkleRoot = Array.from(Buffer.from(root, 'hex'));

    // Call on-chain function
    const backendKeypair = loadWalletKeypair();
    const tx = await submitDistributionRootOnChain({
      reportId: parseInt(reportId),
      buyerPubkey: buyerWallet,
      merkleRoot,
      backendKeypair,
      programIdString: process.env.PROGRAM_ID!,
    });

    // Update report in database
    report.merkleRoot = root;
    report.status = 'DISTRIBUTION_READY';
    await report.save();

    return res.json({ 
      success: true, 
      transactionSignature: tx,
      reportId: report.reportId
    });
  } catch (err) {
    console.error('[submitDistributionRootHandler]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function attachReportDataHandler(req: Request, res: Response) {
  try {
    const { reportId, buyerWallet, ipfsCid } = req.body;
    
    if (!reportId || !buyerWallet || !ipfsCid) {
      return res.status(400).json({ error: 'reportId, buyerWallet, and ipfsCid are required' });
    }

    // Find the report in database
    const report = await Report.findOne({ 
      reportId, 
      buyerWallet, 
      status: 'PAID' 
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found or not paid' });
    }

    // Call on-chain function
    const backendKeypair = loadWalletKeypair();
    const tx = await attachReportDataOnChain({
      reportId: parseInt(reportId),
      buyerPubkey: buyerWallet,
      ipfsCid,
      backendKeypair,
      programIdString: process.env.PROGRAM_ID!,
    });

    // Update report in database
    report.ipfsCid = ipfsCid;
    report.status = 'READY';
    await report.save();

    return res.json({ 
      success: true, 
      transactionSignature: tx,
      reportId: report.reportId,
      ipfsCid
    });
  } catch (err) {
    console.error('[attachReportDataHandler]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
