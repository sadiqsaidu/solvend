// src/routes.ts
import express from 'express';
import { validateOtpHandler, createPurchaseHandler } from './controllers/purchase.controller';
import { getClaimProof } from './controllers/claims.controller';
import { createReportPurchaseHandler } from './controllers/report.controller';
import { submitDistributionRootHandler, attachReportDataHandler } from './controllers/admin.controller';
import { verifyAdminSignature } from './middleware/auth.middleware';

const router = express.Router();

// Purchase routes
router.post('/purchase/create', createPurchaseHandler);
router.post('/validate-otp', validateOtpHandler);

// Claims routes
router.get('/claim-proof/:claimant', getClaimProof);

// Report routes
router.post('/report/create', createReportPurchaseHandler);

// Admin routes (with authentication)
router.post('/admin/submit-distribution-root', verifyAdminSignature, submitDistributionRootHandler);
router.post('/admin/attach-report-data', verifyAdminSignature, attachReportDataHandler);

export default router;
