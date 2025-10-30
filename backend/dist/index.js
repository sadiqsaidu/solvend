"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const routes_1 = __importDefault(require("./api/routes"));
const connect_1 = require("./database/connect");
async function main() {
    await (0, connect_1.connectToDatabase)();
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    const port = process.env.PORT || 3000;
    app.use("/api", routes_1.default);
    app.listen(port, () => {
        console.log(`✅ API Server is running on http://localhost:${port}`);
        // Listeners disabled - using immediate confirmation via /api/purchase/confirm instead
        // This avoids RPC rate limiting from free Solana devnet
        // Uncomment if using paid RPC or for production with webhooks
        // startPaymentListener();
        // startReportListener();
        console.log("ℹ️  Using immediate payment confirmation (listeners disabled)");
    });
}
main();
