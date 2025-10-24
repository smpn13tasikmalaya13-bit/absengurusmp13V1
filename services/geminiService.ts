import { GoogleGenAI } from "@google/genai";
import { AttendanceRecord } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });


export const generateAttendanceSummary = async (records: AttendanceRecord[]): Promise<string> => {
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

/**
 * Generates a message draft for a teacher who was marked 'Alpa' (absent without notice).
 * @param context - The context of the absence.
 * @returns A promise that resolves to a string containing the drafted message.
 */
export const generateMessageDraft = async (context: {
    teacherName: string;
    subject: string;
    class: string;
    date: string;
    period: number;
}): Promise<string> => {
    const { teacherName, subject, class: className, date, period } = context;
    const model = "gemini-2.5-flash";
    const prompt = `
      Anda adalah seorang asisten kepala sekolah. Buatkan draf pesan singkat yang sopan namun tegas dalam Bahasa Indonesia untuk dikirimkan kepada seorang guru yang tercatat "Alpa" (tidak hadir tanpa keterangan).

      Konteks:
      - Nama Guru: ${teacherName}
      - Mata Pelajaran: ${subject}
      - Kelas: ${className}
      - Tanggal: ${date}
      - Jam Ke: ${period}

      Tujuan pesan adalah untuk mengingatkan dan meminta konfirmasi atau alasan ketidakhadiran guru tersebut. Mulailah pesan dengan sapaan formal seperti "Yth. Bapak/Ibu [Nama Guru],".
    `;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error calling Gemini API for message draft:", error);
        return "Gagal membuat draf pesan. Silakan tulis manual.";
    }
};
