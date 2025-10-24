import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { addAnnouncement } from '../../services/dataService';
import { useToast } from '../../context/ToastContext';

const ManageAnnouncements: React.FC = () => {
    const { user } = useAuth();
    const addToast = useToast();
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || !user) {
            addToast('Isi pengumuman tidak boleh kosong.', 'error');
            return;
        }
        setIsSubmitting(true);
        try {
            await addAnnouncement(content.trim(), user.name);
            addToast('Pengumuman berhasil dikirim.', 'success');
            setContent('');
        } catch (error) {
            addToast(error instanceof Error ? error.message : 'Gagal mengirim pengumuman.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-xl font-bold text-white">Buat Pengumuman</h1>
            <Card>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="announcement-content" className="block text-sm font-medium text-slate-300">
                            Isi Pengumuman
                        </label>
                        <textarea
                            id="announcement-content"
                            rows={6}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Tulis pengumuman Anda di sini. Semua pengguna (Guru, Tendik, Pembina) akan melihat pesan ini di beranda mereka."
                        />
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit" isLoading={isSubmitting}>
                            Kirim Pengumuman
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default ManageAnnouncements;
