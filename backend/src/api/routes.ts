import { Router } from 'express';
import { validateOtpHandler } from './controllers/purchase.controller';

const router = Router();

// Route for the vending machine to validate an OTP
router.post('/validate-otp', validateOtpHandler);

// TODO: Add a route for /claim-proof

export default router;
