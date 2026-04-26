import React, { useState } from 'react';
import { doc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { X, Upload, FileJson } from 'lucide-react';

export default function ImportModal({ onClose }: { onClose: () => void }) {
    const [jsonText, setJsonText] = useState('');
    const [previewData, setPreviewData] = useState<any>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const [titulo, setTitulo] = useState('');
    const [etiquetas, setEtiquetas] = useState('');

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            setJsonText(result);
            tryParse(result);
        };
        reader.readAsText(file);
    };

    const tryParse = (text: string) => {
        setError('');
        setPreviewData(null);
        try {
            const data = JSON.parse(text);
            if (!data.id_examen && !data.preguntas) {
                 // Try to fallback
            }
            if (!Array.isArray(data.preguntas)) {
                setError('El JSON debe contener un array en la propiedad "preguntas"');
                return;
            }
            
            setTitulo(data.titulo || '');
            setEtiquetas(Array.isArray(data.etiquetas) ? data.etiquetas.join(', ') : (data.etiquetas || ''));
            
            setPreviewData(data);
        } catch (err: any) {
            setError('JSON inválido: ' + err.message);
        }
    };

    const handleLoad = () => {
        tryParse(jsonText);
    };

    const handleSave = async () => {
        if (!previewData) return;
        setLoading(true);
        try {
            const finalData = {
                ...previewData,
                id_examen: previewData.id_examen || ('EXAM-' + Math.random().toString(36).substring(2, 9).toUpperCase()),
                titulo: titulo.trim(),
                etiquetas: etiquetas.split(',').map((e: string) => e.trim()).filter((e: string) => e),
                createdAt: serverTimestamp(),
                active: true
            };
            await addDoc(collection(db, 'exams'), finalData);
            onClose();
        } catch (e: any) {
            alert('Error al importar: ' + e.message);
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-8 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1a1a1a] w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl flex flex-col hide-scrollbar">
                <div className="sticky top-0 bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md z-10 p-6 sm:p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center rounded-t-2xl">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 m-0">Importar Examen</h3>
                    <button className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 dark:hover:text-gray-300 rounded-xl transition-colors" onClick={onClose}><X size={20} /></button>
                </div>
                
                {!previewData ? (
                    <div className="p-6 sm:p-8 flex flex-col gap-6">
                        <div className="flex flex-col gap-3">
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Seleccionar Archivo JSON</label>
                            <div className="relative w-full border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-2xl p-8 transition-colors flex flex-col items-center justify-center gap-4 bg-gray-50/50 dark:bg-[#111]/50 cursor-pointer group">
                                <input type="file" accept=".json" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileUpload} />
                                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full group-hover:scale-110 transition-transform">
                                    <FileJson size={32} />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Haz clic o arrastra un archivo JSON aquí</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Solo permitidos archivos .json</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4 py-2">
                            <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1"></div>
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">o pega el contenido</span>
                            <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1"></div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Contenido JSON bruto</label>
                            <textarea 
                                className="w-full px-4 py-4 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono text-gray-800 dark:text-gray-200 placeholder-gray-400 resize-none h-48"
                                value={jsonText} 
                                onChange={e => setJsonText(e.target.value)}
                                placeholder='{"id_examen": "...", "preguntas": [...]}'
                            />
                        </div>
                        
                        {error && <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 p-4 rounded-xl text-sm font-medium">{error}</div>}
                        
                        <button className="w-full py-4 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:hover:bg-indigo-600" onClick={handleLoad} disabled={!jsonText.trim()}>
                            Previsualizar Contenido
                        </button>
                    </div>
                ) : (
                    <div className="p-6 sm:p-8 flex flex-col gap-6">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-800 p-5 rounded-2xl">
                            <div>
                                <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">{previewData.id_examen || 'Generado automáticamente'}</h4>
                                <p className="text-sm font-medium text-gray-500 m-0">Parte: {previewData.numero_parte || '-'} <span className="mx-2">•</span> {previewData.preguntas.length} preguntas</p>
                            </div>
                            <button className="px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl transition-colors shrink-0" onClick={() => setPreviewData(null)}>Volver al JSON</button>
                        </div>
                        
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Título del Examen</label>
                            <input className="w-full px-4 py-3 bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 placeholder-gray-400" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ej. Simulacro General" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Etiquetas (separadas por coma)</label>
                            <input className="w-full px-4 py-3 bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 placeholder-gray-400" value={etiquetas} onChange={e => setEtiquetas(e.target.value)} placeholder="OPE, 2026, Sanidad..." />
                        </div>

                        <div className="flex flex-col gap-6 mt-4">
                            <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Vista Previa de Preguntas <span className="text-sm px-2.5 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-full">{previewData.preguntas.length}</span></h4>
                            {previewData.preguntas.map((q: any, i: number) => (
                                <div key={i} className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 p-5 rounded-2xl">
                                    <h5 className="font-bold text-gray-900 dark:text-gray-100 text-base mb-4 leading-snug">{i + 1}. {q.enunciado}</h5>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                        {['a', 'b', 'c', 'd', 'e'].map(opt => (
                                            q.opciones?.[opt] && (
                                                <div key={opt} className={`p-3 rounded-xl border flex items-start gap-3 transition-colors ${q.respuesta_correcta === opt ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/40 text-green-900 dark:text-green-100' : 'bg-gray-50 dark:bg-[#111] border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-300'}`}>
                                                    <strong className="uppercase mt-0.5">{opt})</strong> 
                                                    <span className="flex-1">{q.opciones[opt]}</span>
                                                    {q.respuesta_correcta === opt && <span className="shrink-0 text-green-500">✅</span>}
                                                </div>
                                            )
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="sticky bottom-0 bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md pt-4 pb-0 mt-4 border-t border-gray-100 dark:border-gray-800">
                            <button className="w-full py-4 text-white font-bold text-lg bg-green-500 hover:bg-green-600 rounded-xl shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:hover:bg-green-500 transition-all flex items-center justify-center gap-2" onClick={handleSave} disabled={loading}>
                                <Upload size={20} /> {loading ? 'Importando...' : 'Confirmar e Importar'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
