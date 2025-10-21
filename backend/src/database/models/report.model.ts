import { Schema, model, Document } from 'mongoose';

// Report type enum matching smart contract
export enum ReportType {
  Daily = 'Daily',
  Weekly = 'Weekly',
  Monthly = 'Monthly'
}

// Interface for TypeScript type safety
export interface IReport extends Document {
  referenceId: string;
  reportId: string;
  buyerWallet: string;
  reportType: ReportType;
  timeframeDays: number;
  amount: number;
  status: 'PENDING' | 'PAID' | 'READY' | 'DISTRIBUTION_READY';
  transactionSignature?: string;
  ipfsCid?: string;
  merkleRoot?: string;
}

const ReportSchema = new Schema<IReport>({
  referenceId: { type: String, required: true, unique: true, index: true },
  reportId: { type: String, required: true },
  buyerWallet: { type: String, required: true },
  reportType: { 
    type: String, 
    enum: Object.values(ReportType), 
    required: true 
  },
  timeframeDays: { type: Number, required: true, min: 1, max: 365 },
  amount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['PENDING', 'PAID', 'READY', 'DISTRIBUTION_READY'], 
    default: 'PENDING' 
  },
  transactionSignature: { type: String },
  ipfsCid: { type: String },
  merkleRoot: { type: String },
}, { timestamps: true });

// Price calculation function matching smart contract
export function getReportPrice(reportType: ReportType): number {
  switch (reportType) {
    case ReportType.Daily:
      return 1_000_000; // 1 USDC in smallest units
    case ReportType.Weekly:
      return 5_000_000; // 5 USDC in smallest units
    case ReportType.Monthly:
      return 20_000_000; // 20 USDC in smallest units
    default:
      throw new Error(`Invalid report type: ${reportType}`);
  }
}

export const Report = model<IReport>('Report', ReportSchema);
