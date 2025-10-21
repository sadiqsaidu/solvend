// src/controllers/claims.controller.ts
import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { keccak256 } from 'js-sha3';
import { PublicKey } from '@solana/web3.js';

/**
 * Simple getClaimProof controller:
 * - Expects the server has generated a Merkle tree JSON file (or DB entry) containing:
 *   { root: "0x...", leaves: [{ claimant: "...", amount: "<string>", leaf: "hex" }], proofs: { "<claimant>": { amount, proof: ["hex1","hex2"] } } }
 *
 * You need to produce/store that JSON using the generator (see scripts/generate_merkle.ts).
 */

const MERKLE_JSON_PATH = process.env.MERKLE_JSON_PATH || './data/merkle_tree.json';

export async function getClaimProof(req: Request, res: Response) {
  try {
    const claimant = req.params.claimant;
    if (!claimant) return res.status(400).json({ error: 'claimant required' });

    if (!fs.existsSync(MERKLE_JSON_PATH)) {
      return res.status(500).json({ error: 'merkle-not-generated' });
    }

    const raw = fs.readFileSync(MERKLE_JSON_PATH, 'utf8');
    const tree = JSON.parse(raw);

    const entry = tree.proofs?.[claimant];
    if (!entry) return res.status(404).json({ error: 'no-proof-for-claimant' });

    // return amount (string or number) and proof (array of hex strings), plus root
    return res.json({ root: tree.root, amount: entry.amount, proof: entry.proof });
  } catch (err) {
    console.error('[getClaimProof] error', err);
    return res.status(500).json({ error: 'internal' });
  }
}
