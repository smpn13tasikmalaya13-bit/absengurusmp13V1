import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { User } from '../../types';
import { sendMessage } from '../../services/dataService';
import { generateMessageDraft } from '../../services/geminiService';
import { useToast } from '../../context/ToastContext';

interface SendMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    userToAction: User | null;
    loggedInUser: User | null;
    aiContext?: {
        teacherName: string;
        subject: string;
        class: string;
        date: string;
        period: number;
    };
}

const SendMessageModal: React.FC<SendMessageModalProps> = ({ isOpen, onClose, userToAction, loggedInUser, aiContext }) => {
    const [messageContent, setMessageContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
    const addToast = useToast();

    useEffect(() => {
        if (isOpen) {
            setMessageContent('');
            setIsSubmitting(false);
            setIsGeneratingDraft(false);
        }
    }, [isOpen]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userToAction || !loggedInUser || !messageContent.trim()) return;
        setIsSubmitting(true);
        try {
            await sendMessage(loggedInUser.id, loggedInUser.name, userToAction.id, messageContent.trim());
            addToast(`Pesan untuk ${userToAction.name} berhasil terkirim.`, 'success');
            setTimeout(() => {
                onClose();
            }, 1000);
        } catch (err) {
            addToast(err instanceof Error ? err.message : 'Gagal mengirim pesan.', 'error');
            setIsSubmitting(false);
        }
    };

    const handleGenerateDraft = async () => {
        if (!aiContext) return;
        setIsGeneratingDraft(true);
        try {
            const draft = await generateMessageDraft(aiContext);
            setMessageContent(draft);
        } catch (error) {
            addToast(error instanceof Error ? error.message : 'Gagal membuat draf.', 'error');
        } finally {
            setIsGeneratingDraft(false);
        }
    };

    if (!userToAction) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Kirim Pesan ke ${userToAction.name}`}>
            <form onSubmit={handleSendMessage} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300">Pesan</label>
                    <div className="relative">
                        <textarea
                            value={messageContent}
                            onChange={(e) => setMessageContent(e.target.value)}
                            required
                            rows={isGeneratingDraft ? 6 : 4}
                            className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white transition-all"
                            placeholder={isGeneratingDraft ? "AI sedang membuat draf..." : "Tulis pesan Anda di sini..."}
                            disabled={isGeneratingDraft}
                        />
                        {isGeneratingDraft && <div className="absolute inset-0 flex items-center justify-center"><Spinner /></div>}
                    </div>
                </div>
                
                <div className="flex justify-between items-center pt-2">
                    <div>
                        {aiContext && (
                            <Button type="button" onClick={handleGenerateDraft} variant="secondary" isLoading={isGeneratingDraft} className="w-auto text-xs">
                                Buatkan Draf oleh AI
                            </Button>
                        )}
                    </div>
                    <div className="flex space-x-3">
                        <Button type="button" onClick={onClose} variant="secondary" className="w-auto" disabled={isSubmitting}>
                            Batal
                        </Button>
                        <Button type="submit" isLoading={isSubmitting} className="w-auto">
                            Kirim
                        </Button>
                    </div>
                </div>
            </form>
        </Modal>
    );
};

export default SendMessageModal;
