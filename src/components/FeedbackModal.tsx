import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { X, MessageSquare, Send } from 'lucide-react';

export default function FeedbackModal({ onClose }: { onClose: () => void }) {
    const { user } = useAuth();
    const [message, setMessage] = useState('');
    const [type, setType] = useState('suggestion');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;
        
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'feedback'), {
                userId: user?.uid || 'anonymous',
                message: message.trim(),
                type,
                status: 'pending',
                timestamp: serverTimestamp()
            });
            alert('¡Gracias por tu mensaje! Lo revisaremos lo antes posible.');
            onClose();
        } catch (error: any) {
            console.error('Error sending feedback:', error);
            alert('Error al enviar el mensaje: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1a1a1a] w-full max-w-lg rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-6 sm:p-8 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                            <MessageSquare size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 m-0">Sugerencias o Errores</h3>
                    </div>
                    <button className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 dark:hover:text-gray-300 rounded-xl transition-colors" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tipo de mensaje</label>
                        <select 
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100" 
                            value={type} 
                            onChange={(e) => setType(e.target.value)}
                        >
                            <option value="suggestion">Sugerencia de mejora</option>
                            <option value="error">Avisar de un error</option>
                            <option value="other">Otro</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Mensaje</label>
                        <textarea
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 resize-none"
                            rows={4}
                            placeholder="Describe detalladamente tu sugerencia o el error que has encontrado..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            required
                        ></textarea>
                    </div>

                    <div className="flex justify-end gap-3 mt-4">
                        <button type="button" className="px-5 py-2.5 font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors" onClick={onClose} disabled={isSubmitting}>
                            Cancelar
                        </button>
                        <button type="submit" className="flex items-center gap-2 px-6 py-2.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 rounded-xl transition-colors shadow-md shadow-indigo-600/20" disabled={isSubmitting || !message.trim()}>
                            <Send size={18} /> {isSubmitting ? 'Enviando...' : 'Enviar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
