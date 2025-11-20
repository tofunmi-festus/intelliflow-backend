import axios from "axios";

export class ClassifierClient {
  static async predictCategory(tx: {
    reference: string;
    remarks: string;
    debit: number;
    credit: number;
  }): Promise<string> {
    try {
      const response = await axios.post("http://localhost:8000/predict", tx);
      return response.data.predicted_category;
    } catch (error) {
      console.error("Error calling classifier API", error);
      throw new Error("Failed to classify transaction");
    }
  }
}
