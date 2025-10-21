import { Request, Response } from 'express';
import { Report } from '../../database/models/report.model';
import { v4 as uuidv4 } from 'uuid';

export async function createReportPurchaseHandler(req: Request, res: Response) {
  try {
    const { buyerWallet, reportId, amount } = req.body;
    
    if (!buyerWallet || !reportId || !amount) {
      return res.status(400).json({ error: 'buyerWallet, reportId, and amount are required' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    // Generate unique reference ID
    const referenceId = uuidv4();

    // Create report purchase record in database
    const report = new Report({
      referenceId,
      reportId,
      buyerWallet,
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
      treasuryTokenAccount,
      amount,
      memo: referenceId
    });
  } catch (err) {
    console.error('[createReportPurchaseHandler]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
