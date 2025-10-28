import { Schema, model, Document } from 'mongoose';

// Interface for TypeScript type safety
export interface IPurchase extends Document {
  referenceId: string;
  transactionSignature?: string;
  userWallet: string;
  amount?: number;
  otpHash?: string;
  otp?: string; // Plain OTP for development (remove in production)
  otpExpiry?: Date;
  nonce?: number;
  status: 'PENDING' | 'VOUCHER_CREATED' | 'REDEEMED' | 'EXPIRED';
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseSchema = new Schema<IPurchase>({
  referenceId: { type: String, required: true, unique: true, index: true },
  transactionSignature: { type: String },
  userWallet: { type: String, required: true },
  amount: { type: Number },
  otpHash: { type: String },
  otp: { type: String }, // Plain OTP for development (remove in production)
  otpExpiry: { type: Date },
  nonce: { type: Number },
  status: { 
    type: String, 
    enum: ['PENDING', 'VOUCHER_CREATED', 'REDEEMED', 'EXPIRED'], 
    default: 'PENDING' 
  },
}, { timestamps: true });

export const Purchase = model<IPurchase>('Purchase', PurchaseSchema);
