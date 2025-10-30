"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClaimProof = getClaimProof;
const fs_1 = __importDefault(require("fs"));
/**
 * Simple getClaimProof controller:
 * - Expects the server has generated a Merkle tree JSON file (or DB entry) containing:
 *   { root: "0x...", leaves: [{ claimant: "...", amount: "<string>", leaf: "hex" }], proofs: { "<claimant>": { amount, proof: ["hex1","hex2"] } } }
 *
 * You need to produce/store that JSON using the generator (see scripts/generate_merkle.ts).
 */
const MERKLE_JSON_PATH = process.env.MERKLE_JSON_PATH || './data/merkle_tree.json';
async function getClaimProof(req, res) {
    try {
        const claimant = req.params.claimant;
        if (!claimant)
            return res.status(400).json({ error: 'claimant required' });
        if (!fs_1.default.existsSync(MERKLE_JSON_PATH)) {
            return res.status(500).json({ error: 'merkle-not-generated' });
        }
        const raw = fs_1.default.readFileSync(MERKLE_JSON_PATH, 'utf8');
        const tree = JSON.parse(raw);
        const entry = tree.proofs?.[claimant];
        if (!entry)
            return res.status(404).json({ error: 'no-proof-for-claimant' });
        // return amount (string or number) and proof (array of hex strings), plus root
        return res.json({ root: tree.root, amount: entry.amount, proof: entry.proof });
    }
    catch (err) {
        console.error('[getClaimProof] error', err);
        return res.status(500).json({ error: 'internal' });
    }
}
