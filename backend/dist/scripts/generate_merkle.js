"use strict";
// scripts/generate_merkle.ts
/**
 * Small Merkle tree generator that matches on-chain leaf construction:
 * leaf = keccak( claimant_pubkey (bytes) || amount (u64 little-endian) )
 *
 * Produces JSON: { root: "<hex>", leaves: [...], proofs: { "<claimant>": { amount: "<string>", proof: ["hex", ...] } } }
 *
 * Usage: node ./dist/scripts/generate_merkle.js or ts-node scripts/generate_merkle.ts
 *
 * NOTE: This is a simple implementation using keccak256 and a binary Merkle tree.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const js_sha3_1 = require("js-sha3");
const web3_js_1 = require("@solana/web3.js");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function u64ToLE(amount) {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(amount);
    return buf;
}
function leafHash(claimant, amount) {
    const claimantBytes = new web3_js_1.PublicKey(claimant).toBuffer();
    const amountBytes = u64ToLE(amount);
    const joined = Buffer.concat([claimantBytes, amountBytes]);
    const hex = (0, js_sha3_1.keccak256)(joined);
    return Buffer.from(hex, 'hex');
}
function buildMerkle(leaves) {
    if (leaves.length === 0)
        throw new Error('no leaves');
    let layer = leaves.slice();
    const layers = [layer.map(l => l.toString('hex'))];
    while (layer.length > 1) {
        const next = [];
        for (let i = 0; i < layer.length; i += 2) {
            if (i + 1 === layer.length) {
                // duplicate last if odd
                next.push(layer[i]);
            }
            else {
                const left = layer[i];
                const right = layer[i + 1];
                // concatenate left||right and hash
                const data = Buffer.concat([left, right]);
                const h = Buffer.from((0, js_sha3_1.keccak256)(data), 'hex');
                next.push(h);
            }
        }
        layer = next;
        layers.push(layer.map(l => l.toString('hex')));
    }
    const root = layer[0].toString('hex');
    return { root, layers };
}
// Compute Merkle proof for a given index
function getProof(layersHex, index) {
    const proof = [];
    for (let i = 0; i < layersHex.length - 1; i++) {
        const layer = layersHex[i];
        const isRightNode = index % 2;
        const pairIndex = isRightNode ? index - 1 : index + 1;
        if (pairIndex < layer.length)
            proof.push(layer[pairIndex]);
        index = Math.floor(index / 2);
    }
    return proof;
}
// Example usage - replace this list with your actual claimants+amounts
const items = [
    // TODO: replace with real claimant and amount (amount as BigInt in smallest unit)
    { claimant: '9wVhY...replace_with_pubkey', amount: 100n },
    // add more
];
const leaves = items.map(it => leafHash(it.claimant, it.amount));
const merkle = buildMerkle(leaves);
const proofs = {};
const layers = merkle.layers;
for (let i = 0; i < items.length; i++) {
    const claimant = items[i].claimant;
    const amount = items[i].amount.toString();
    const proof = getProof(layers, i);
    proofs[claimant] = { amount, proof };
}
const out = {
    root: merkle.root,
    layers: merkle.layers,
    leaves: items.map((it, i) => ({ claimant: it.claimant, amount: it.amount.toString(), leaf: leaves[i].toString('hex') })),
    proofs,
};
const outPath = path_1.default.resolve(process.env.MERKLE_JSON_PATH || './data/merkle_tree.json');
fs_1.default.mkdirSync(path_1.default.dirname(outPath), { recursive: true });
fs_1.default.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log('[generate_merkle] written to', outPath);
