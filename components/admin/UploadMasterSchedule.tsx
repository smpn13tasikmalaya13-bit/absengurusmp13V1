import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { MasterSchedule } from '../../types';
import { uploadMasterSchedule } from '../../services/dataService';

type ParsedSchedule = Omit<MasterSchedule, 'id'>;

const UploadMasterSchedule: React.FC = () => {
    const [parsedData, setParsedData] = useState<ParsedSchedule[]>([]);
    const [fileName, setFileName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setError('');
        setSuccess('');
        setParsedData([]);
        setFileName(file.name);
        setIsLoading(true);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet) as any[];

                const requiredHeaders = ['Kode', 'Nama Guru', 'Mata Pelajaran', 'total Jam'];
                const headers = Object.keys(json[0] || {});
                const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

                if (missingHeaders.length > 0) {
                    throw new Error(`Header kolom tidak sesuai. Pastikan file Excel memiliki kolom: ${missingHeaders.join(', ')}`);
                }

                const schedules: ParsedSchedule[] = json.map((row, index) => {
                    const totalHours = Number(row['total Jam']);
                    if (isNaN(totalHours) || !row['Kode'] || !row['Nama Guru'] || !row['Mata Pelajaran']) {
                        throw new Error(`Data tidak valid pada baris ${index + 2}. Pastikan semua kolom terisi dan 'total Jam' adalah angka.`);
                    }
                    return {
                        kode: String(row['Kode']),
                        namaGuru: String(row['Nama Guru']),
                        subject: String(row['Mata Pelajaran']),
                        totalHours,
                    };
                });
                setParsedData(schedules);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Gagal memproses file.');
            } finally {
                setIsLoading(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleUpload = async () => {
        if (parsedData.length === 0) {
            setError('Tidak ada data untuk diunggah.');
            return;
        }

        if (!window.confirm(`Anda akan mengganti seluruh jadwal induk dengan ${parsedData.length} data baru dari file ${fileName}. Apakah Anda yakin?`)) {
            return;
        }

        setError('');
        setSuccess('');
        setIsUploading(true);

        try {
            await uploadMasterSchedule(parsedData);
            setSuccess('Jadwal induk berhasil diperbarui.');
            setParsedData([]);
            setFileName('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat mengunggah.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-xl font-bold text-white">Unggah Jadwal Induk</h1>
            <Card>
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-slate-100">Instruksi</h2>
                    <p className="text-sm text-slate-400">
                        Unggah file Excel (.xlsx) untuk mengisi database jadwal induk. Data ini akan menjadi acuan untuk validasi total jam mengajar per guru untuk setiap mata pelajaran.
                    </p>
                    <div className="p-4 bg-slate-900/50 border border-slate-700 rounded-lg text-sm">
                        <p className="font-semibold text-slate-300">Format file Excel harus memiliki kolom berikut (case-sensitive):</p>
                        <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400 font-mono">
                            <li>Kode</li>
                            <li>Nama Guru</li>
                            <li>Mata Pelajaran</li>
                            <li>total Jam</li>
                        </ul>
                    </div>

                    <div className="pt-4 space-y-2">
                        <label htmlFor="file-upload" className="w-full max-w-sm mx-auto flex items-center justify-center px-4 py-3 bg-slate-700 text-slate-300 rounded-lg shadow-sm tracking-wide uppercase border border-slate-600 cursor-pointer hover:bg-slate-600 hover:text-white transition-colors">
                            <svg className="w-6 h-6 mr-2" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4 4-4-4h3v-3h2v3z" /></svg>
                            <span className="text-sm font-semibold">{fileName || 'Pilih file Excel'}</span>
                        </label>
                        <input id="file-upload" type="file" className="hidden" accept=".xlsx" onChange={handleFileChange} />
                    </div>

                    {error && <p className="text-center text-sm text-red-400 bg-red-500/10 py-2 px-3 rounded-md border border-red-500/30">{error}</p>}
                    {success && <p className="text-center text-sm text-green-400 bg-green-500/10 py-2 px-3 rounded-md border border-green-500/30">{success}</p>}
                </div>
            </Card>

            {isLoading && <Spinner />}

            {parsedData.length > 0 && (
                <Card title="Pratinjau Data">
                    <div className="overflow-x-auto max-h-96">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-800 sticky top-0">
                                <tr>
                                    <th className="p-3">Kode</th>
                                    <th className="p-3">Nama Guru</th>
                                    <th className="p-3">Mata Pelajaran</th>
                                    <th className="p-3">Total Jam</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {parsedData.map((row, index) => (
                                    <tr key={index}>
                                        <td className="p-3">{row.kode}</td>
                                        <td className="p-3">{row.namaGuru}</td>
                                        <td className="p-3">{row.subject}</td>
                                        <td className="p-3">{row.totalHours}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-6">
                        <Button onClick={handleUpload} isLoading={isUploading} className="w-full">
                            Unggah dan Ganti Jadwal Induk
                        </Button>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default UploadMasterSchedule;