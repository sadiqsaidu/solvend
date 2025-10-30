"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitDistributionRootHandler = submitDistributionRootHandler;
exports.attachReportDataHandler = attachReportDataHandler;
const report_model_1 = require("../../database/models/report.model");
const solana_service_1 = require("../../services/solana.service");
const web3_js_1 = require("@solana/web3.js");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const BACKEND_WALLET_PATH = process.env.BACKEND_WALLET_PATH || './keys/backend.json';
function loadWalletKeypair() {
    const kp = JSON.parse(fs_1.default.readFileSync(path_1.default.resolve(BACKEND_WALLET_PATH), 'utf8'));
    return web3_js_1.Keypair.fromSecretKey(Uint8Array.from(kp));
}
async function submitDistributionRootHandler(req, res) {
    try {
        const { root, reportId, buyerWallet } = req.body;
        if (!root || !reportId || !buyerWallet) {
            return res.status(400).json({ error: 'root, reportId, and buyerWallet are required' });
        }
        // Find the report in database
        const report = await report_model_1.Report.findOne({
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
        const tx = await (0, solana_service_1.submitDistributionRootOnChain)({
            reportId: parseInt(reportId),
            buyerPubkey: buyerWallet,
            merkleRoot,
            backendKeypair,
            programIdString: process.env.PROGRAM_ID,
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
    }
    catch (err) {
        console.error('[submitDistributionRootHandler]', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
async function attachReportDataHandler(req, res) {
    try {
        const { reportId, buyerWallet, ipfsCid } = req.body;
        if (!reportId || !buyerWallet || !ipfsCid) {
            return res.status(400).json({ error: 'reportId, buyerWallet, and ipfsCid are required' });
        }
        // Find the report in database
        const report = await report_model_1.Report.findOne({
            reportId,
            buyerWallet,
            status: 'PAID'
        });
        if (!report) {
            return res.status(404).json({ error: 'Report not found or not paid' });
        }
        // Call on-chain function
        const backendKeypair = loadWalletKeypair();
        const tx = await (0, solana_service_1.attachReportDataOnChain)({
            reportId: parseInt(reportId),
            buyerPubkey: buyerWallet,
            ipfsCid,
            backendKeypair,
            programIdString: process.env.PROGRAM_ID,
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
    }
    catch (err) {
        console.error('[attachReportDataHandler]', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
