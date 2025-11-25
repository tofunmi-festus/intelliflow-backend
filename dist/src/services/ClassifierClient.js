"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassifierClient = void 0;
const axios_1 = __importDefault(require("axios"));
class ClassifierClient {
    static async predictCategory(tx) {
        try {
            const mlServiceUrl = process.env.ML_SERVICE_URL || "http://localhost:8000";
            const predictUrl = `${mlServiceUrl}/predict`;
            console.log(`📤 Calling ML service at ${predictUrl}`);
            const response = await axios_1.default.post(predictUrl, tx, {
                timeout: 15000, // 15 second timeout
                headers: {
                    "Content-Type": "application/json",
                },
            });
            if (!response.data || !response.data.predicted_category) {
                console.warn("⚠️ ML service returned unexpected response:", response.data);
                return "UNCATEGORIZED";
            }
            console.log(`✅ Prediction for ${tx.reference}:`, response.data.predicted_category);
            return response.data.predicted_category;
        }
        catch (error) {
            const errorInfo = {
                message: error.message,
                code: error.code,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                url: error.config?.url,
                method: error.config?.method,
            };
            console.error("❌ ML Service Error:", JSON.stringify(errorInfo, null, 2));
            // Throw error instead of swallowing it so caller can handle it
            throw new Error(`ML Service failed: ${error.message} (${error.response?.status || error.code})`);
        }
    }
}
exports.ClassifierClient = ClassifierClient;
