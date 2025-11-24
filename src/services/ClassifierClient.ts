import axios from "axios";

export class ClassifierClient {
  static async predictCategory(tx: {
    reference: string;
    remarks: string;
    debit: number;
    credit: number;
  }): Promise<string> {
    try {
      const mlServiceUrl = "web-production-e8681.up.railway.app";
      
      console.log(`Calling ML service at ${mlServiceUrl}/predict with:`, tx);
      
      const response = await axios.post(`${mlServiceUrl}/predict`, tx, {
        timeout: 10000, // 10 second timeout
      });

      if (!response.data || !response.data.predicted_category) {
        console.warn("ML service returned unexpected response:", response.data);
        return "UNCATEGORIZED";
      }

      console.log(`Prediction successful:`, response.data.predicted_category);
      return response.data.predicted_category;
    } catch (error: any) {
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

