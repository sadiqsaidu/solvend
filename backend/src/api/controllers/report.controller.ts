// src/controllers/report.controller.ts
import { Request, Response } from 'express';
import { Report, ReportType, getReportPrice } from '../../database/models/report.model';
import { v4 as uuidv4 } from 'uuid';
// --- FIXED IMPORTS ---
import { getBuyReportAccounts } from '../../services/solana.service'; // <-- ADDED
import { PublicKey } from '@solana/web3.js'; // <-- ADDED
// --- END FIX ---

export async function createReportPurchaseHandler(req: Request, res: Response) {
  try {
    const { buyerWallet, reportType, timeframeDays } = req.body;
    
    // Validate required fields
    if (!buyerWallet || !reportType || !timeframeDays) {
      return res.status(400).json({ 
        error: 'buyerWallet, reportType, and timeframeDays are required' 
      });
    }

    // Validate report type
    if (!Object.values(ReportType).includes(reportType)) {
      return res.status(400).json({ 
        error: 'Invalid reportType. Must be one of: Daily, Weekly, Monthly' 
      });
    }

    // Validate timeframe
    if (timeframeDays <= 0 || timeframeDays > 365) {
      return res.status(400).json({ 
        error: 'timeframeDays must be between 1 and 365' 
      });
    }

    // Calculate price based on report type (matching smart contract)
    const amount = getReportPrice(reportType);

    // Generate unique reference ID
    const referenceId = uuidv4();
    
    // Generate report ID based on timestamp and reference
    const reportId = `report-${Date.now()}-${referenceId.substring(0, 8)}`;

    // Create report purchase record in database
    const report = new Report({
      referenceId,
      reportId,
      buyerWallet,
      reportType,
      timeframeDays,
      amount,
      status: 'PENDING'
    });

    await report.save();

    // Return payment information
    const treasuryTokenAccount = process.env.TREASURY_TOKEN_ACCOUNT;
    if (!treasuryTokenAccount) {
      return res.status(500).json({ error: 'Treasury token account not configured' });
    }

    return res.json({
      referenceId,
      reportId,
      treasuryTokenAccount,
      reportType,
      timeframeDays,
      amount,
      memo: referenceId
    });
  } catch (err) {
    console.error('[createReportPurchaseHandler]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// --- START OF FIX ---
// NEW HANDLER: called by the frontend after payment is confirmed (report is PAID)
export async function executeReportPurchaseHandler(req: Request, res: Response) {
  try {
    const { reportId, userTokenAccount } = req.body;
    if (!reportId || !userTokenAccount) {
      return res.status(400).json({ error: 'reportId and userTokenAccount are required' });
    }

    // Find the paid report in the database
    const report = await Report.findOne({ 
      reportId, 
      status: 'PAID' 
    });

    if (!report) {
      return res.status(404).json({ error: 'Paid report not found. Check status.' });
    }

    // Convert string reportType to enum number for on-chain instruction
    let reportTypeNum: number;
    switch (report.reportType) {
      case ReportType.Daily: reportTypeNum = 0; break;
      case ReportType.Weekly: reportTypeNum = 1; break;
      case ReportType.Monthly: reportTypeNum = 2; break;
      default: return res.status(500).json({ error: 'Invalid report type in database' });
    }

    // Get all the accounts required for the `buyReport` instruction
    const accounts = await getBuyReportAccounts({
      buyerPubkey: report.buyerWallet,
      buyerTokenAccountPubkey: userTokenAccount,
      reportType: reportTypeNum,
      timeframeDays: report.timeframeDays,
      programIdString: process.env.PROGRAM_ID!,
    });

    return res.json({
      success: true,
      message: 'Accounts retrieved. Build and send transaction from frontend.',
      accounts: {
        report: accounts.reportPda.toBase58(),
        treasury: accounts.treasuryPda.toBase58(),
        treasuryTokenAccount: accounts.treasuryTokenPda.toBase58(),
        buyerTokenAccount: accounts.buyerTokenAccount.toBase58(),
        ownerTokenAccount: accounts.ownerTokenAccount.toBase58(),
        machineConfig: accounts.machinePda.toBase58(),
        buyer: report.buyerWallet,
        tokenProgram: accounts.tokenProgram.toBase58(),
        systemProgram: accounts.systemProgram.toBase58(),
      },
      instructionData: {
        reportType: reportTypeNum,
        timeframeDays: report.timeframeDays,
      }
    });

  } catch (err) {
    console.error('[executeReportPurchaseHandler]', err);
    let errorMessage = 'Internal server error';
    if (err instanceof Error) {
      errorMessage = err.message;
    }
    return res.status(500).json({ error: errorMessage });
  }
}
// --- END OF FIX ---
