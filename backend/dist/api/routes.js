"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes.ts
const express_1 = __importDefault(require("express"));
const purchase_controller_1 = require("./controllers/purchase.controller");
const claims_controller_1 = require("./controllers/claims.controller");
const report_controller_1 = require("./controllers/report.controller");
const admin_controller_1 = require("./controllers/admin.controller");
const auth_middleware_1 = require("./middleware/auth.middleware");
const router = express_1.default.Router();
// Purchase routes
router.post('/purchase/create', purchase_controller_1.createPurchaseHandler);
router.post('/validate-otp', purchase_controller_1.validateOtpHandler);
// Claims routes
router.get('/claim-proof/:claimant', claims_controller_1.getClaimProof);
// Report routes
router.post('/report/create', report_controller_1.createReportPurchaseHandler);
// Called by the user *after* payment is confirmed (not admin protected)
router.post('/report/execute', report_controller_1.executeReportPurchaseHandler);
// Admin routes (with authentication)
router.post('/admin/submit-distribution-root', auth_middleware_1.verifyAdminSignature, admin_controller_1.submitDistributionRootHandler);
router.post('/admin/attach-report-data', auth_middleware_1.verifyAdminSignature, admin_controller_1.attachReportDataHandler);
exports.default = router;
