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
      const endpoint = `${mlServiceUrl}/predict`;
      
      console.log("🔵 ML Service Request:", {
        url: endpoint,
        method: "POST",
        payload: tx,
        timeout: "30000ms",
      });
      
      const response = await axios.post(endpoint, tx, {
        timeout: 30000, // 30 second timeout (increased from 10)
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("🟢 ML Service Response:", {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
      });

      if (!response.data || !response.data.predicted_category) {
        console.warn("⚠️ ML service returned unexpected response format:", response.data);
        console.warn("Expected: { predicted_category: string }, Got:", response.data);
        return "UNCATEGORIZED";
      }

      console.log(`✅ Prediction successful: ${response.data.predicted_category}`);
      return response.data.predicted_category;
    } catch (error: any) {
      console.error("❌ ML Service Error:", {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        errorData: error.response?.data,
        requestUrl: error.config?.url,
        requestMethod: error.config?.method,
        requestData: error.config?.data,
      });

      // Log more details for connection errors
      if (error.code === "ECONNREFUSED") {
        console.error("❌ Cannot connect to ML service. Check if:");
        console.error("   - ML_SERVICE_URL is correct: " + process.env.ML_SERVICE_URL);
        console.error("   - ML service is running and accessible");
        console.error("   - No firewall/network blocking the connection");
      }

      if (error.code === "ENOTFOUND") {
        console.error("❌ ML service hostname not found. Check if:");
        console.error("   - ML_SERVICE_URL domain is correct: " + process.env.ML_SERVICE_URL);
        console.error("   - Railway service is deployed");
      }

      if (error.response?.status === 404) {
        console.error("❌ ML service endpoint not found. The service may have:");
        console.error("   - Different endpoint (not /predict)");
        console.error("   - Different request structure");
        console.error("   Response:", error.response?.data);
      }

      if (error.code === "ETIMEDOUT" || error.code === "ECONNABORTED") {
        console.error("❌ ML service request timed out. The service may be:");
        console.error("   - Slow to respond");
        console.error("   - Processing heavy requests");
      }

      // Return default category instead of throwing
      return "UNCATEGORIZED";
    }
  }

  // Health check method to verify ML service is accessible
  static async healthCheck(): Promise<boolean> {
    try {
      const mlServiceUrl = process.env.ML_SERVICE_URL || "http://localhost:8000";
      
      console.log("🔵 ML Service Health Check at:", mlServiceUrl);
      
      const response = await axios.get(`${mlServiceUrl}/health`, {
        timeout: 5000,
      });

      console.log("🟢 ML Service is healthy:", response.data);
      return true;
    } catch (error: any) {
      console.error("❌ ML Service health check failed:", error.message);
      return false;
    }
  }
}


