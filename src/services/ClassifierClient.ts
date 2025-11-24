import axios from "axios";

export class ClassifierClient {
  static async predictCategory(tx: {
    reference: string;
    remarks: string;
    debit: number;
    credit: number;
  }): Promise<string> {
    try {
      const mlServiceUrl = process.env.ML_SERVICE_URL || "http://localhost:8000";
      const predictUrl = `${mlServiceUrl}/predict`;
      
      console.log(`📤 Calling ML service at ${predictUrl}`);
      
      const response = await axios.post(predictUrl, tx, {
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
    } catch (error: any) {
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

