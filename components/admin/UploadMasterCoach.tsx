import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { MasterCoach } from '../../types';
import { uploadMasterCoaches } from '../../services/dataService';

type ParsedCoach = Omit<MasterCoach, 'id'>;

const UploadMasterCoach: React.FC = () => {
    const [parsedData, setParsedData] = useState<ParsedCoach[]>([]);
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

                const requiredHeaders = ['Kode', 'Nama Lengkap', 'Bidang Eskul', 'Jabatan'];
                const headers = Object.keys(json[0] || {});
                const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

                if (missingHeaders.length > 0) {
                    throw new Error(`Header kolom tidak sesuai. Pastikan file Excel memiliki kolom: ${missingHeaders.join(', ')}`);
                }

                const coachList: ParsedCoach[] = json.map((row, index) => {
                    if (!row['Kode'] || !row['Nama Lengkap'] || !row['Bidang Eskul'] || !row['Jabatan']) {
                        throw new Error(`Data tidak valid pada baris ${index + 2}. Pastikan semua kolom terisi.`);
                    }
                    return {
                        kode: String(row['Kode']),
                        namaLengkap: String(row['Nama Lengkap']),
                        bidangEskul: String(row['Bidang Eskul']),
                        jabatan: String(row['Jabatan']),
                    };
                });
                setParsedData(coachList);
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

        if (!window.confirm(`Anda akan mengganti seluruh data induk pembina dengan ${parsedData.length} data baru dari file ${fileName}. Apakah Anda yakin?`)) {
            return;
        }

        setError('');
        setSuccess('');
        setIsUploading(true);

        try {
            await uploadMasterCoaches(parsedData);
            setSuccess('Data induk pembina berhasil diperbarui.');
            setParsedData([]);
            setFileName('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat mengunggah.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDownloadTemplate = () => {
        const headers = ['Kode', 'Nama Lengkap', 'Bidang Eskul', 'Jabatan'];
        const exampleData = [
            {
                'Kode': 'E-01',
                'Nama Lengkap': 'Rudi Hartono',
                'Bidang Eskul': 'Pramuka',
                'Jabatan': 'Pembina Utama',
            },
            {
                'Kode': 'E-02',
                'Nama Lengkap': 'Siti Aminah',
                'Bidang Eskul': 'PMR',
                'Jabatan': 'Pembina Pendamping',
            }
        ];

        const worksheet = XLSX.utils.json_to_sheet(exampleData, { header: headers });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data Pembina");
        XLSX.writeFile(workbook, "Template_Data_Pembina.xlsx");
    };

    return (
        <div className="space-y-6">
            <h1 className="text-xl font-bold text-white">Unggah Data Induk Pembina Eskul</h1>
            <Card>
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-slate-100">Instruksi</h2>
                    <p className="text-sm text-slate-400">
                        Unggah file Excel (.xlsx) untuk mengisi data induk Pembina Ekstrakurikuler. Data ini akan menjadi sumber untuk sinkronisasi profil pembina.
                    </p>
                    <div className="p-4 bg-slate-900/50 border border-slate-700 rounded-lg text-sm">
                        <p className="font-semibold text-slate-300">Format file Excel harus memiliki kolom berikut (case-sensitive):</p>
                        <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400 font-mono">
                            <li>Kode</li>
                            <li>Nama Lengkap</li>
                            <li>Bidang Eskul</li>
                            <li>Jabatan</li>
                        </ul>
                    </div>

                    <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Button type="button" onClick={handleDownloadTemplate} variant="secondary" className="w-full sm:w-auto">
                            Unduh Template
                        </Button>
                        <label htmlFor="file-upload" className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-slate-700 text-slate-300 rounded-lg shadow-sm tracking-wide uppercase border border-slate-600 cursor-pointer hover:bg-slate-600 hover:text-white transition-colors">
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
                                    <th className="p-3">Nama Lengkap</th>
                                    <th className="p-3">Bidang Eskul</th>
                                    <th className="p-3">Jabatan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {parsedData.map((row, index) => (
                                    <tr key={index}>
                                        <td className="p-3">{row.kode}</td>
                                        <td className="p-3">{row.namaLengkap}</td>
                                        <td className="p-3">{row.bidangEskul}</td>
                                        <td className="p-3">{row.jabatan}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-6">
                        <Button onClick={handleUpload} isLoading={isUploading} className="w-full">
                            Unggah dan Ganti Data Pembina
                        </Button>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default UploadMasterCoach;
