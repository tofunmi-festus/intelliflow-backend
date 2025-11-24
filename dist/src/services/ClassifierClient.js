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
            // const mlServiceUrl = "https://web-production-e8681.up.railway.app";
            console.log(`Calling ML service at ${mlServiceUrl}/predict with:`, tx);
            const response = await axios_1.default.post(`${mlServiceUrl}/predict`, tx, {
                timeout: 10000, // 10 second timeout
            });
            if (!response.data || !response.data.predicted_category) {
                console.warn("ML service returned unexpected response:", response.data);
                return "UNCATEGORIZED";
            }
            console.log(`Prediction successful:`, response.data.predicted_category);
            return response.data.predicted_category;
        }
        catch (error) {
            console.error("Error calling classifier API:", {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data,
                config: error.config?.url,
            });
            // Return default category instead of throwing
            // This prevents the entire transaction fetch from failing
            return "UNCATEGORIZED";
        }
    }
}
exports.ClassifierClient = ClassifierClient;
