
import { GoogleGenAI } from "@google/genai";
import { AttendanceRecord } from "../types";

// FIX: Initialize GoogleGenAI with the API key from environment variables as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });


export const generateAttendanceSummary = async (records: AttendanceRecord[]): Promise<string> => {
  // FIX: Removed manual API key check. As per guidelines, assume the API key is configured correctly in the environment.
  if (records.length === 0) {
    return "No attendance data available to summarize.";
  }
  
  // FIX: Corrected typo in the model name.
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