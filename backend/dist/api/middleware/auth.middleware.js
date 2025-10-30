"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAdminSignature = verifyAdminSignature;
const web3_js_1 = require("@solana/web3.js");
const crypto_1 = __importDefault(require("crypto"));
const BACKEND_WALLET_PUBKEY = process.env.BACKEND_WALLET_PUBKEY;
function verifyAdminSignature(req, res, next) {
    try {
        if (!BACKEND_WALLET_PUBKEY) {
            return res.status(500).json({ error: 'Backend wallet not configured' });
        }
        const signature = req.headers['x-signature'];
        const timestamp = req.headers['x-timestamp'];
        const publicKey = req.headers['x-public-key'];
        if (!signature || !timestamp || !publicKey) {
            return res.status(401).json({ error: 'Missing authentication headers' });
        }
        // Verify the public key matches the backend wallet
        if (publicKey !== BACKEND_WALLET_PUBKEY) {
            return res.status(401).json({ error: 'Invalid public key' });
        }
        // Create the message that was signed (timestamp + request body)
        const message = timestamp + JSON.stringify(req.body);
        const messageBuffer = Buffer.from(message, 'utf8');
        const signatureBuffer = Buffer.from(signature, 'hex');
        // Verify the signature
        const expectedPublicKey = new web3_js_1.PublicKey(publicKey);
        const isValid = crypto_1.default.verify(null, messageBuffer, expectedPublicKey.toBuffer(), signatureBuffer);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid signature' });
        }
        // Check timestamp is recent (within 5 minutes)
        const now = Date.now();
        const requestTime = parseInt(timestamp);
        if (now - requestTime > 5 * 60 * 1000) {
            return res.status(401).json({ error: 'Request expired' });
        }
        next();
    }
    catch (error) {
        console.error('[verifyAdminSignature]', error);
        return res.status(401).json({ error: 'Authentication failed' });
    }
}
