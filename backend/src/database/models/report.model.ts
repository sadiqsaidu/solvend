import { Schema, model, Document } from 'mongoose';

// Interface for TypeScript type safety
export interface IReport extends Document {
  referenceId: string;
  reportId: string;
  buyerWallet: string;
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

export const Report = model<IReport>('Report', ReportSchema);
