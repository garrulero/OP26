import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, Settings, LogOut, ArrowLeft } from 'lucide-react';

export default function Profile({ onNavigate }: { onNavigate: (v: string) => void }) {
    const { profile, logout } = useAuth();
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!profile) return;
            const q = query(collection(db, 'results'), where('userId', '==', profile.uid), orderBy('timestamp', 'desc'));
            const snap = await getDocs(q);
            setHistory(snap.docs.map(d => ({id: d.id, ...d.data()})));
        };
        fetchHistory();
    }, [profile]);

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-500 w-full max-w-4xl mx-auto">
            <div className="bg-white dark:bg-[#111] border border-gray-100 dark:border-gray-800 rounded-[2rem] p-6 sm:p-8 shadow-xl shadow-gray-200/40 dark:shadow-none">
                <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[2rem] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center shrink-0">
                        {profile?.photoURL ? (
                            <img src={profile.photoURL} alt="" className="w-full h-full rounded-[2rem] object-cover" /> 
                        ) : (
                            <User size={48} />
                        )}
                    </div>
                    
                    <div className="flex-1">
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                            {profile?.displayName || 'Usuario'}
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 font-medium mb-3">
                            {profile?.email}
                        </p>
                        <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider
                            ${profile?.role === 'admin' 
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                                : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                            }`}
                        >
                            {profile?.role === 'admin' ? 'ADMINISTRADOR' : 'ESTUDIANTE'}
                        </span>
                    </div>
                    
                    <div className="flex flex-wrap sm:flex-col gap-3 mt-4 sm:mt-0 sm:min-w-[140px]">
                        {profile?.role === 'admin' && (
                            <button 
                                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-gray-100 dark:bg-[#1a1a1a] hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl font-semibold transition-colors" 
                                onClick={() => onNavigate('admin')}
                            >
                                <Settings size={18}/> Panel
                            </button>
                        )}
                        <button 
                            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-semibold transition-colors" 
                            onClick={logout}
                        >
                            <LogOut size={18} /> Salir
                        </button>
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
                    Tu Historial
                    <span className="text-sm font-medium px-2.5 py-0.5 bg-gray-100 dark:bg-[#1a1a1a] text-gray-500 rounded-full">{history.length}</span>
                </h3>
                
                <div className="flex flex-col gap-4">
                    {history.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 dark:bg-[#111] rounded-[2rem] border border-gray-100 dark:border-gray-800">
                            <p className="text-gray-500 font-medium text-lg">Aún no has completado ningún examen.</p>
                        </div>
                    ) : history.map(h => {
                        const isPass = h.scorePercent >= 50;
                        return (
                            <div key={h.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 bg-white dark:bg-[#111] border border-gray-100 dark:border-gray-800 rounded-2xl hover:shadow-lg hover:shadow-gray-200/40 dark:hover:shadow-none transition-shadow">
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-gray-100 text-lg mb-1">{h.examTitle || h.examId}</h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                        {(() => {
                                            if (!h.timestamp) return 'Fecha desconocida';
                                            try {
                                                if (typeof h.timestamp.toDate === 'function') {
                                                    return h.timestamp.toDate().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
                                                } else if (typeof h.timestamp === 'string') {
                                                    return new Date(h.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
                                                } else if (h.timestamp.seconds) {
                                                    return new Date(h.timestamp.seconds * 1000).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
                                                }
                                            } catch (e) {
                                                console.error(e);
                                            }
                                            return 'Fecha desconocida';
                                        })()}
                                    </p>
                                </div>
                                <div className="flex sm:flex-col items-center justify-between sm:items-end sm:justify-center border-t sm:border-t-0 border-gray-100 dark:border-gray-800 pt-4 sm:pt-0">
                                    <span className={`text-3xl font-black ${isPass ? 'text-green-500' : 'text-red-500'}`}>
                                        {h.scorePercent}%
                                    </span>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">
                                        {h.correctCount} aciertos <span className="mx-1">•</span> {h.incorrectCount} fallos
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="flex justify-center mt-4">
                <button 
                    className="flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95" 
                    onClick={() => onNavigate('home')}
                >
                    <ArrowLeft size={20}/> Volver al Inicio
                </button>
            </div>
        </div>
    );
}
