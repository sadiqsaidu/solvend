import { Request, Response } from 'express';
import { Report, ReportType, getReportPrice } from '../../database/models/report.model';
import { v4 as uuidv4 } from 'uuid';

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
