import React, { useEffect, useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { addAnnouncement, getAnnouncements, updateAnnouncement, deleteAnnouncement } from '../../services/dataService';
import { useToast } from '../../context/ToastContext';
import { Announcement } from '../../types';

const ManageAnnouncements: React.FC = () => {
    const { user } = useAuth();
    const addToast = useToast();
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editAnnouncement, setEditAnnouncement] = useState<Announcement | null>(null);
    const [editContent, setEditContent] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

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

    useEffect(() => {
        const unsubscribe = getAnnouncements((items) => {
            setAnnouncements(items);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const openEditModal = (a: Announcement) => {
        setEditAnnouncement(a);
        setEditContent(a.content);
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editAnnouncement) return;
        if (!editContent.trim()) {
            addToast('Isi pengumuman tidak boleh kosong.', 'error');
            return;
        }
        setIsProcessing(true);
        try {
            await updateAnnouncement(editAnnouncement.id, editContent.trim());
            addToast('Pengumuman berhasil diperbarui.', 'success');
            setIsEditModalOpen(false);
            setEditAnnouncement(null);
            setEditContent('');
        } catch (error) {
            addToast(error instanceof Error ? error.message : 'Gagal memperbarui pengumuman.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Hapus pengumuman ini? Tindakan ini tidak dapat dikembalikan.')) return;
        setIsProcessing(true);
        try {
            await deleteAnnouncement(id);
            addToast('Pengumuman dihapus.', 'success');
        } catch (error) {
            addToast(error instanceof Error ? error.message : 'Gagal menghapus pengumuman.', 'error');
        } finally {
            setIsProcessing(false);
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

            <div>
                <h2 className="text-lg font-bold text-white">Riwayat Pengumuman</h2>
                <Card>
                    {isLoading ? (
                        <p className="text-slate-400">Memuat...</p>
                    ) : announcements.length === 0 ? (
                        <p className="text-slate-400">Belum ada pengumuman.</p>
                    ) : (
                        <ul className="space-y-3">
                            {announcements.map(a => (
                                <li key={a.id} className="bg-slate-800/50 border border-slate-700 p-4 rounded-lg">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm text-slate-200 whitespace-pre-line">{a.content}</p>
                                            <div className="mt-2 text-xs text-slate-400 flex gap-4">
                                                <span>{a.sentBy}</span>
                                                <span>{new Date(a.timestamp).toLocaleString('id-ID')}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2 ml-4">
                                            <Button variant="secondary" onClick={() => openEditModal(a)}>Edit</Button>
                                            <Button variant="danger" onClick={() => handleDelete(a.id)} isLoading={isProcessing}>Hapus</Button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>

            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Pengumuman">
                <form onSubmit={handleEditSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300">Isi Pengumuman</label>
                        <textarea rows={6} value={editContent} onChange={(e) => setEditContent(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white" />
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="secondary" onClick={() => setIsEditModalOpen(false)}>Batal</Button>
                        <Button type="submit" isLoading={isProcessing}>Simpan Perubahan</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default ManageAnnouncements;
