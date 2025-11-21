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
            const response = await axios_1.default.post("http://localhost:8000/predict", tx);
            return response.data.predicted_category;
        }
        catch (error) {
            console.error("Error calling classifier API", error);
            throw new Error("Failed to classify transaction");
        }
    }
}
exports.ClassifierClient = ClassifierClient;
