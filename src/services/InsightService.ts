// import OpenAI from "openai";
// import NodeCache from "node-cache";

// const CACHE_TTL_SECONDS = Number(process.env.INSIGHT_CACHE_TTL || "300"); // default 5 minutes
// const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-3.5-turbo";

// const cache = new NodeCache({ stdTTL: CACHE_TTL_SECONDS });

// const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// export type ForecastPoint = { date: string; predicted_cashflow: number };

// export type InsightResult = {
//   trend: string;
//   risks: Array<{ date: string; reason: string; value: number }>;
//   opportunities: Array<{ date: string; reason: string; value: number }>;
//   recommendations: string[];
//   narrative: string;
// };

// function buildPrompt(forecast: ForecastPoint[]): string {
//   return `Analyze this cashflow forecast data and provide insights. Return ONLY valid JSON with no markdown.

// Forecast data (date and predicted_cashflow):
// ${JSON.stringify(forecast.slice(0, 10), null, 2)}

// Return this exact JSON structure:
// {
//   "trend": "one sentence describing the overall trend",
//   "risks": [{"date": "YYYY-MM-DD", "reason": "why", "value": number}],
//   "opportunities": [{"date": "YYYY-MM-DD", "reason": "why", "value": number}],
//   "recommendations": ["action 1", "action 2", "action 3"],
//   "narrative": "2-3 sentence plain language summary"
// }`;
// }

// export async function generateInsights(forecast: ForecastPoint[], context?: any): Promise<InsightResult> {
//   try {
//     if (!forecast || forecast.length === 0) {
//       console.warn("[InsightService] Empty forecast provided");
//       return {
//         trend: "No trend data available",
//         risks: [],
//         opportunities: [],
//         recommendations: [],
//         narrative: "Insufficient data for analysis.",
//       };
//     }

//     console.log(`[InsightService] Starting with ${forecast.length} forecast points`);
//     console.log(`[InsightService] First forecast point:`, forecast[0]);
//     console.log(`[InsightService] API Key configured:`, !!process.env.OPENAI_API_KEY);
//     console.log(`[InsightService] Model:`, OPENAI_MODEL);

//     // Check cache first
//     const cacheKey = `insight:${forecast[0]?.date}:${forecast[forecast.length - 1]?.date}`;
//     const cached = cache.get<InsightResult>(cacheKey);
//     if (cached) {
//       console.log("[InsightService] ✓ Returning cached insights");
//       return cached;
//     }

//     if (!process.env.OPENAI_API_KEY) {
//       console.warn("[InsightService] ⚠ OPENAI_API_KEY not set");
//       return {
//         trend: "API not configured",
//         risks: [],
//         opportunities: [],
//         recommendations: [],
//         narrative: "OpenAI API key is not configured.",
//       };
//     }

//     const prompt = buildPrompt(forecast);
//     console.log("[InsightService] Calling OpenAI...");

//     const response = await client.chat.completions.create({
//       model: OPENAI_MODEL,
//       messages: [
//         {
//           role: "user",
//           content: prompt,
//         },
//       ],
//       temperature: 0.3,
//       max_tokens: 500,
//     });

//     console.log("[InsightService] ✓ OpenAI response received");

//     const content = response.choices[0]?.message?.content;
//     if (!content) {
//       console.error("[InsightService] ✗ Empty content from OpenAI");
//       throw new Error("Empty response from OpenAI");
//     }

//     console.log("[InsightService] Raw response preview:", content.substring(0, 100));

//     // Clean response - remove markdown code blocks if present
//     let cleanedContent = content.trim();
//     if (cleanedContent.startsWith("```json")) {
//       cleanedContent = cleanedContent.replace(/```json\n?/, "").replace(/```\n?$/, "");
//     } else if (cleanedContent.startsWith("```")) {
//       cleanedContent = cleanedContent.replace(/```\n?/, "").replace(/```\n?$/, "");
//     }

//     console.log("[InsightService] Cleaned response:", cleanedContent.substring(0, 100));

//     let parsed;
//     try {
//       parsed = JSON.parse(cleanedContent);
//       console.log("[InsightService] ✓ JSON parsed successfully");
//     } catch (parseError) {
//       console.error("[InsightService] ✗ JSON parse failed:", parseError);
//       // Try extracting JSON from the text
//       const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
//       if (jsonMatch) {
//         console.log("[InsightService] Attempting to extract JSON from text...");
//         parsed = JSON.parse(jsonMatch[0]);
//       } else {
//         throw new Error("Could not parse response as JSON: " + cleanedContent);
//       }
//     }

//     // Validate and normalize the result
//     const result: InsightResult = {
//       trend: String(parsed.trend || "No trend available").substring(0, 200),
//       risks: Array.isArray(parsed.risks)
//         ? parsed.risks.slice(0, 5).map((r: any) => ({
//             date: String(r.date || ""),
//             reason: String(r.reason || ""),
//             value: Number(r.value || 0),
//           }))
//         : [],
//       opportunities: Array.isArray(parsed.opportunities)
//         ? parsed.opportunities.slice(0, 5).map((o: any) => ({
//             date: String(o.date || ""),
//             reason: String(o.reason || ""),
//             value: Number(o.value || 0),
//           }))
//         : [],
//       recommendations: Array.isArray(parsed.recommendations)
//         ? parsed.recommendations.slice(0, 6).map((r: any) => String(r).substring(0, 200))
//         : [],
//       narrative: String(parsed.narrative || "No narrative available").substring(0, 500),
//     };

//     console.log("[InsightService] ✓ Insights result:", {
//       trend: result.trend.substring(0, 50) + "...",
//       risksCount: result.risks.length,
//       opportunitiesCount: result.opportunities.length,
//       recommendationsCount: result.recommendations.length,
//     });

//     cache.set(cacheKey, result);
//     return result;
//   } catch (error: any) {
//     console.error("[InsightService] ✗ Error:", error.message);
//     if (error.response) {
//       console.error("[InsightService] OpenAI API error:", error.response.status, error.response.data);
//     }

//     // Return graceful fallback
//     return {
//       trend: "Unable to generate trend analysis",
//       risks: [],
//       opportunities: [],
//       recommendations: [
//         "Monitor your cashflow regularly",
//         "Track spending patterns",
//         "Plan ahead for major expenses",
//       ],
//       narrative: `Analysis temporarily unavailable. Error: ${error.message}`,
//     };
//   }
// }

// services/InsightService.ts

export class InsightService {
  static generateInsights(predictions: Array<{ date: string; value: number }>) {
    if (!predictions || predictions.length === 0) {
      return {
        summary: "No forecast data available",
        insights: [],
        stats: {}
      };
    }

    const values = predictions.map(p => Number(p.value));
    const dates = predictions.map(p => p.date);

    const first = values[0];
    const last = values[values.length - 1];

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const trend = last - first;
    const volatility = maxVal - minVal;

    const insights: string[] = [];

    // TREND INSIGHTS
    if (trend > 0) {
      insights.push("Cashflow is expected to increase steadily over the forecast period.");
    } else if (trend < 0) {
      insights.push("Cashflow is projected to decline. You may need to review expenses or increase revenue streams.");
    } else {
      insights.push("Cashflow is stable with no significant upward or downward shift.");
    }

    // AVERAGE / LIQUIDITY INSIGHTS
    if (avg < 0) {
      insights.push("Average cashflow is negative, which may signal potential liquidity challenges.");
    } else if (avg < first) {
      insights.push("Average cashflow is below the starting value. This could indicate weakening financial momentum.");
    } else {
      insights.push("Average cashflow is positive, suggesting moderate financial strength across the forecast period.");
    }

    // NEGATIVE PERIOD INSIGHTS
    if (values.some(v => v < 0)) {
      insights.push("There are projected periods of negative cashflow. Consider preparing cash reserves.");
    } else {
      insights.push("No negative cashflow periods detected, indicating consistent operational health.");
    }

    // VOLATILITY INSIGHT
    if (volatility > avg * 0.5) {
      insights.push("Cashflow shows high volatility. This may require tighter financial planning and monitoring.");
    } else {
      insights.push("Cashflow exhibits low volatility, indicating predictable financial performance.");
    }

    // PEAK AND LOW MONTHS
    const peakIndex = values.indexOf(maxVal);
    const lowIndex = values.indexOf(minVal);

    insights.push(
      `Expected peak cashflow occurs around ${dates[peakIndex]} with approximately ₦${maxVal.toLocaleString()}.`
    );

    insights.push(
      `Lowest projected cashflow occurs around ${dates[lowIndex]} with approximately ₦${minVal.toLocaleString()}.`
    );

    // RUNWAY / BURN RATE ANALYSIS
    const negatives = values.filter(v => v < 0);

    if (negatives.length > 0) {
      const burnRate =
        Math.abs(negatives.reduce((a, b) => a + b, 0) / negatives.length);

      insights.push(
        `Estimated average monthly burn rate is ₦${burnRate.toLocaleString()}.`
      );
    }

    // SUMMARY
    const summary = `
Forecast from ${dates[0]} to ${dates[dates.length - 1]} shows a ${
      trend > 0
        ? "positive upward trend"
        : trend < 0
        ? "decline in projected cashflow"
        : "steady cashflow movement"
    } with an average forecast value of ₦${avg.toLocaleString()}.
    `.trim();

    return {
      summary,
      insights,
      stats: {
        trend,
        average: avg,
        min: minVal,
        max: maxVal
      }
    };
  }
}
