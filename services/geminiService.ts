
import { GoogleGenAI } from "@google/genai";
import { AttendanceRecord } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY is not set in environment variables.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export const generateAttendanceSummary = async (records: AttendanceRecord[]): Promise<string> => {
  if (!API_KEY) {
    return "Error: Gemini API key is not configured.";
  }
  
  if (records.length === 0) {
    return "No attendance data available to summarize.";
  }
  
  const model = "gemini-2.5-flash";
  const prompt = `
    You are an assistant for a school administrator.
    Analyze the following teacher attendance data for a specific day and provide a brief, insightful summary in Bahasa Indonesia.
    Focus on key statistics like the number of teachers present, late, and absent (if calculable).
    Highlight any patterns or notable points.
    Do not just list the data, provide a summary.

    Data:
    ${JSON.stringify(records, null, 2)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "Failed to generate summary due to an API error.";
  }
};
