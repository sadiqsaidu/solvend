"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Report = exports.ReportType = void 0;
exports.getReportPrice = getReportPrice;
const mongoose_1 = require("mongoose");
// Report type enum matching smart contract
var ReportType;
(function (ReportType) {
    ReportType["Daily"] = "Daily";
    ReportType["Weekly"] = "Weekly";
    ReportType["Monthly"] = "Monthly";
})(ReportType || (exports.ReportType = ReportType = {}));
const ReportSchema = new mongoose_1.Schema({
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
function getReportPrice(reportType) {
    switch (reportType) {
        case ReportType.Daily:
            return 1000000; // 1 USDC in smallest units
        case ReportType.Weekly:
            return 5000000; // 5 USDC in smallest units
        case ReportType.Monthly:
            return 20000000; // 20 USDC in smallest units
        default:
            throw new Error(`Invalid report type: ${reportType}`);
    }
}
exports.Report = (0, mongoose_1.model)('Report', ReportSchema);
