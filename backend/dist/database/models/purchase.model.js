"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Purchase = void 0;
const mongoose_1 = require("mongoose");
const PurchaseSchema = new mongoose_1.Schema({
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
        enum: ["PENDING", "VOUCHER_CREATED", "REDEEMED", "EXPIRED"],
        default: "PENDING",
    },
}, { timestamps: true });
exports.Purchase = (0, mongoose_1.model)("Purchase", PurchaseSchema);
