import dotenv from "dotenv";
dotenv.config();

import { ForecastController } from "./src/controllers/ForecastController";
import { InsightService } from "./src/services/InsightService";

console.log("=== DIAGNOSTICS ===\n");

// Test 1: Check InsightService directly
console.log("TEST 1: InsightService.generateInsights()");
try {
  const mockData = [
    { date: "2025-11-27", value: 5000 },
    { date: "2025-11-28", value: 4500 },
    { date: "2025-11-29", value: 3000 },
  ];
  const result = InsightService.generateInsights(mockData);
  console.log("✓ InsightService works");
  console.log("Result:", JSON.stringify(result, null, 2));
} catch (e: any) {
  console.error("✗ InsightService error:", e.message);
}

// Test 2: Check ForecastController imports
console.log("\nTEST 2: ForecastController imports");
try {
  console.log("✓ ForecastController imported successfully");
  console.log("✓ ForecastController.getForecast is:", typeof ForecastController.getForecast);
} catch (e: any) {
  console.error("✗ Import error:", e.message);
}

console.log("\n=== END DIAGNOSTICS ===");
