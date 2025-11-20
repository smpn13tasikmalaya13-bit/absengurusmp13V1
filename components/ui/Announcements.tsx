import React, { useEffect, useState } from 'react';
import { Card } from './Card';
import { getAnnouncements } from '../../services/dataService';
import { Announcement } from '../../types';

const Announcements: React.FC = () => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);

    useEffect(() => {
        const unsubscribe = getAnnouncements((items) => {
            setAnnouncements(items);
        });

        return () => unsubscribe();
    }, []);

    if (!announcements || announcements.length === 0) {
        return null; // don't render anything if no announcements
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Pengumuman</h3>
            <div className="space-y-3">
                {announcements.map(a => (
                    <div key={a.id} className="bg-slate-800/50 border border-slate-700 p-4 rounded-lg">
                        <p className="text-sm text-slate-200">{a.content}</p>
                        <div className="mt-2 text-xs text-slate-400 flex justify-between">
                            <span>{a.sentBy}</span>
                            <span>{new Date(a.timestamp).toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Announcements;
