// src/routes.ts
import express from 'express';
import { validateOtpHandler } from './controllers/purchase.controller'; // <-- fixed to plural "purchase.controllers"
import { getClaimProof } from './controllers/claims.controller'; // new route

const router = express.Router();

router.post('/validate-otp', validateOtpHandler);
router.get('/claim-proof/:claimant', getClaimProof);

// ... other routes

export default router;
