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

/**
 * Generates a formal warning letter for a teacher with excessive absences.
 * @param teacherName The name of the teacher.
 * @param alpaCount The number of times the teacher was absent without notice.
 * @param dateRange The date range of the report.
 * @returns A promise that resolves to a string containing the warning letter.
 */
export const generateWarningLetter = async (teacherName: string, alpaCount: number, dateRange: string): Promise<string> => {
    const model = "gemini-2.5-flash";
    const prompt = `
      Anda adalah asisten kepala sekolah yang bertugas membuat surat resmi.
      Buatkan draf "Surat Peringatan Pertama" dalam Bahasa Indonesia yang formal dan profesional.

      Konteks:
      - Ditujukan Kepada: Yth. Bapak/Ibu ${teacherName}
      - Pelanggaran: Tidak hadir mengajar tanpa keterangan (Alpa) sebanyak ${alpaCount} kali.
      - Periode Laporan: ${dateRange}
      - Pengirim: Kepala Sekolah SMP Negeri 13 Tasikmalaya

      Struktur Surat:
      1.  Kop surat sederhana (Nama Sekolah, Alamat).
      2.  Judul: "SURAT PERINGATAN PERTAMA"
      3.  Paragraf pembuka yang menyatakan tujuan surat.
      4.  Paragraf isi yang merinci temuan pelanggaran (jumlah alpa dan periode waktu) berdasarkan data dari sistem absensi HadirKu.
      5.  Paragraf yang menekankan pentingnya tanggung jawab dan dampaknya terhadap kegiatan belajar mengajar.
      6.  Paragraf penutup yang meminta guru tersebut untuk memberikan klarifikasi dan memperbaiki kinerjanya, serta menyebutkan konsekuensi jika pelanggaran berlanjut.
      7.  Salam penutup dan tempat untuk tanda tangan Kepala Sekolah.

      Gaya bahasa harus sopan, resmi, dan konstruktif.
    `;
    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error calling Gemini API for warning letter:", error);
        throw new Error("Gagal membuat surat peringatan karena ada masalah dengan layanan AI.");
    }
};
