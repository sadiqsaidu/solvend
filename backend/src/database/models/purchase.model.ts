import { Schema, model, Document } from 'mongoose';

// Interface for TypeScript type safety
export interface IPurchase extends Document {
  referenceId: string;
  transactionSignature?: string;
  userWallet: string;
  otpHash?: string;
  otpExpiry?: Date;
  nonce?: number;
  status: 'PENDING' | 'VOUCHER_CREATED' | 'REDEEMED' | 'EXPIRED';
}

const PurchaseSchema = new Schema<IPurchase>({
  referenceId: { type: String, required: true, unique: true, index: true },
  transactionSignature: { type: String },
  userWallet: { type: String, required: true },
  otpHash: { type: String },
  otpExpiry: { type: Date },
  nonce: { type: Number },
  status: { 
    type: String, 
    enum: ['PENDING', 'VOUCHER_CREATED', 'REDEEMED', 'EXPIRED'], 
    default: 'PENDING' 
  },
}, { timestamps: true });

export const Purchase = model<IPurchase>('Purchase', PurchaseSchema);
