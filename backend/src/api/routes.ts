// src/routes.ts
<<<<<<< HEAD
import express from 'express';
import { validateOtpHandler, createPurchaseHandler } from './controllers/purchase.controller';
import { getClaimProof } from './controllers/claims.controller';
import {
  createReportPurchaseHandler,
  executeReportPurchaseHandler, // <-- ADDED
} from './controllers/report.controller';
import { submitDistributionRootHandler, attachReportDataHandler } from './controllers/admin.controller';
import { verifyAdminSignature } from './middleware/auth.middleware';
=======
import express from "express";
import {
  attachReportDataHandler,
  submitDistributionRootHandler,
} from "./controllers/admin.controller";
import { getClaimProof } from "./controllers/claims.controller";
import {
  confirmPaymentHandler,
  createPurchaseHandler,
  getPurchaseStatusHandler,
  validateOtpHandler,
} from "./controllers/purchase.controller";
import { createReportPurchaseHandler } from "./controllers/report.controller";
import { verifyAdminSignature } from "./middleware/auth.middleware";
>>>>>>> 5f6fd85129b9404c9817c964c5f6ca4349984a36

const router = express.Router();

// Purchase routes
router.post("/purchase/create", createPurchaseHandler);
router.get("/purchase/status/:referenceId", getPurchaseStatusHandler);
router.post("/purchase/confirm", confirmPaymentHandler);
router.post("/validate-otp", validateOtpHandler);

// Claims routes
router.get("/claim-proof/:claimant", getClaimProof);

// Report routes
<<<<<<< HEAD
router.post('/report/create', createReportPurchaseHandler);
router.post('/report/execute', executeReportPurchaseHandler);
=======
router.post("/report/create", createReportPurchaseHandler);
>>>>>>> 5f6fd85129b9404c9817c964c5f6ca4349984a36

// Admin routes (with authentication)
router.post(
  "/admin/submit-distribution-root",
  verifyAdminSignature,
  submitDistributionRootHandler
);
router.post(
  "/admin/attach-report-data",
  verifyAdminSignature,
  attachReportDataHandler
);

export default router;
