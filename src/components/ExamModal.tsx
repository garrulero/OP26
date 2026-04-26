import React, { useState, useRef } from 'react';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { X, Trash2, Upload } from 'lucide-react';

const generateId = () => 'EXAM-' + Math.random().toString(36).substring(2, 9).toUpperCase();

export default function ExamModal({ exam, onClose }: { exam: any, onClose: () => void }) {
    const [idExamen, setIdExamen] = useState(exam?.id_examen || generateId());
    const [titulo, setTitulo] = useState(exam?.titulo || '');
    const [etiquetas, setEtiquetas] = useState(exam?.etiquetas?.join(', ') || '');
    const [numeroParte, setNumeroParte] = useState(exam?.numero_parte || '');
    const [preguntas, setPreguntas] = useState<any[]>(exam?.preguntas || []);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const answersFileInputRef = useRef<HTMLInputElement>(null);
    const [importAnswersStatus, setImportAnswersStatus] = useState<{
        type: 'success' | 'error';
        message: string;
        details?: string[];
        validAnswers?: string[];
    } | null>(null);

    // Sync state if `exam` changes while opened
    React.useEffect(() => {
        setIdExamen(exam?.id_examen || generateId());
        setTitulo(exam?.titulo || '');
        setEtiquetas(exam?.etiquetas?.join(', ') || '');
        setNumeroParte(exam?.numero_parte || '');
        setPreguntas(exam?.preguntas || []);
    }, [exam]);

    const handleSave = async () => {
        if (!idExamen) return alert('El ID es obligatorio');
        if (!titulo.trim()) return alert('El título es obligatorio');
        
        const payload = {
            id_examen: idExamen,
            titulo: titulo.trim(),
            etiquetas: etiquetas.split(',').map((e: string) => e.trim()).filter((e: string) => e),
            numero_parte: numeroParte,
            preguntas
        };

        try {
            if (exam?.id) {
                await updateDoc(doc(db, 'exams', exam.id), payload);
            } else {
                await addDoc(collection(db, 'exams'), { ...payload, createdAt: serverTimestamp(), active: true });
            }
            onClose();
        } catch (e: any) {
            alert('Error al guardar: ' + e.message);
        }
    };

    const addQuestion = () => setPreguntas([...preguntas, { enunciado: '', opciones: { a:'', b:'', c:'', d:'', e:'' }, respuesta_correcta: 'a' }]);
    
    const updateQuestion = (i: number, key: string, val: string, isOpt = false) => {
        const newQs = [...preguntas];
        if (isOpt) {
            newQs[i].opciones[key] = val;
        } else {
            newQs[i][key] = val;
        }
        setPreguntas(newQs);
    };

    const delQuestion = (i: number) => setPreguntas(preguntas.filter((_, idx) => idx !== i));


    const handleAnswersFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            try {
                const data = JSON.parse(result);
                if (data.respuestas && Array.isArray(data.respuestas)) {
                    const rawAnswers = data.respuestas;
                    const errors: string[] = [];
                    const validAnswers: string[] = [];

                    rawAnswers.forEach((ans: any, index: number) => {
                        const s = String(ans).trim().toLowerCase();
                        if (['a', 'b', 'c', 'd', 'e'].includes(s)) {
                            validAnswers.push(s);
                        } else {
                            errors.push(`Respuesta ${index + 1}: Valor "${ans}" no válido. Se esperaba A, B, C, D o E.`);
                        }
                    });

                    if (validAnswers.length === 0) {
                         setImportAnswersStatus({
                             type: 'error',
                             message: 'No se encontraron respuestas válidas en el JSON.',
                             details: errors
                         });
                         return;
                    }

                    if (errors.length > 0) {
                         setImportAnswersStatus({
                             type: 'error',
                             message: `Se encontraron ${errors.length} errores en las respuestas importadas. No se ha aplicado ninguna.`,
                             details: errors
                         });
                    } else {
                         let msg = `Se encontraron ${validAnswers.length} respuestas válidas con formato correcto.`;
                         if (validAnswers.length > preguntas.length) {
                             msg += ` Se crearán ${validAnswers.length - preguntas.length} preguntas adicionales vacías para las respuestas sobrantes.`;
                         } else if (validAnswers.length < preguntas.length) {
                             msg += ` (Nota: Faltan ${preguntas.length - validAnswers.length} respuestas para completar las preguntas actuales).`;
                         }
                         setImportAnswersStatus({
                             type: 'success',
                             message: msg,
                             validAnswers
                         });
                    }
                } else {
                    setImportAnswersStatus({
                        type: 'error',
                        message: 'Estructura de JSON incorrecta.',
                        details: ['El JSON debe contener un array en la propiedad "respuestas".']
                    });
                }
            } catch (err: any) {
                setImportAnswersStatus({
                    type: 'error',
                    message: 'JSON inválido.',
                    details: [err.message, 'Verifica que el archivo sea un JSON con comillas dobles en las claves.']
                });
            }
        };
        reader.readAsText(file);
        
        if (answersFileInputRef.current) {
            answersFileInputRef.current.value = '';
        }
    };

    const applyImportedAnswers = (validAnswers: string[]) => {
        const newQs = [...preguntas];
        const lengthToUpdate = Math.min(newQs.length, validAnswers.length);
        for (let i = 0; i < lengthToUpdate; i++) {
            newQs[i].respuesta_correcta = validAnswers[i];
            if (!newQs[i].opciones) newQs[i].opciones = { a:'', b:'', c:'', d:'', e:'' };
            if (validAnswers[i] === 'e' && !newQs[i].opciones.e) {
                newQs[i].opciones.e = 'Duda / Anulada';
            }
        }
        
        if (validAnswers.length > newQs.length) {
            for (let i = newQs.length; i < validAnswers.length; i++) {
                newQs.push({
                    enunciado: '',
                    opciones: { a: '', b: '', c: '', d: '', e: validAnswers[i] === 'e' ? 'Duda / Anulada' : '' },
                    respuesta_correcta: validAnswers[i]
                });
            }
        }
        setPreguntas(newQs);
        setImportAnswersStatus(null);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            try {
                const data = JSON.parse(result);
                if (data.preguntas && Array.isArray(data.preguntas)) {
                    setPreguntas(prev => [...prev, ...data.preguntas]);
                    
                    // Solo actualiza los campos de cabecera si están vacíos
                    if (data.titulo && !titulo.trim()) setTitulo(data.titulo);
                    if (data.etiquetas && !etiquetas.trim()) {
                        setEtiquetas(Array.isArray(data.etiquetas) ? data.etiquetas.join(', ') : data.etiquetas);
                    }
                    if (data.numero_parte && !numeroParte.trim()) setNumeroParte(data.numero_parte);
                } else {
                    alert('El JSON no contiene un array de "preguntas" válido.');
                }
            } catch (err: any) {
                alert('JSON inválido: ' + err.message);
            }
        };
        reader.readAsText(file);
        
        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-8 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1a1a1a] w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl flex flex-col hide-scrollbar">
                <div className="sticky top-0 bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md z-10 p-6 sm:p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center rounded-t-2xl">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 m-0">{exam ? 'Editar Examen' : 'Nuevo Examen'}</h3>
                    <button className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 dark:hover:text-gray-300 rounded-xl transition-colors" onClick={onClose}><X size={20} /></button>
                </div>
                
                <div className="p-6 sm:p-8 flex flex-col gap-6">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">ID Examen</label>
                        <input className="w-full px-4 py-3 bg-gray-100 dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-xl text-gray-500 font-medium" value={idExamen} disabled />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Título del Examen *</label>
                        <input className="w-full px-4 py-3 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ej. Simulacro Osakidetza Auxiliar" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Etiquetas (separadas por coma)</label>
                            <input className="w-full px-4 py-3 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600" value={etiquetas} onChange={e => setEtiquetas(e.target.value)} placeholder="Ej. OPE, Auxiliar, 2026" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Parte / Sección</label>
                            <input className="w-full px-4 py-3 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600" value={numeroParte} onChange={e => setNumeroParte(e.target.value)} placeholder="Ej. 1" />
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mt-8 mb-2">
                        <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">Preguntas <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2.5 py-0.5 rounded-full text-sm font-medium ml-2">{preguntas.length}</span></h4>
                        <div className="flex flex-wrap gap-2">
                            <input 
                                type="file" 
                                accept=".json" 
                                className="hidden" 
                                ref={fileInputRef} 
                                onChange={handleFileUpload} 
                            />
                            <input 
                                type="file" 
                                accept=".json" 
                                className="hidden" 
                                ref={answersFileInputRef} 
                                onChange={handleAnswersFileUpload} 
                            />
                            <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors" onClick={() => answersFileInputRef.current?.click()}>
                                Importar Respuestas
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors" onClick={() => fileInputRef.current?.click()}>
                                <Upload size={16} /> {exam ? 'Añadir partes' : 'Importar JSON'}
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-xl transition-colors" onClick={addQuestion}>+ Añadir</button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-6">
                        {preguntas.map((q, i) => (
                            <div key={i} className="bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 sm:p-8">
                                <div className="flex justify-between items-center mb-6">
                                    <h5 className="font-bold text-gray-900 dark:text-gray-100 text-lg">Pregunta {i+1}</h5>
                                    <button className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors" onClick={() => delQuestion(i)}><Trash2 size={18}/></button>
                                </div>
                                <div className="flex flex-col gap-6">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Enunciado</label>
                                        <textarea className="w-full px-4 py-3 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 resize-none placeholder-gray-400" rows={2} value={q.enunciado} onChange={e => updateQuestion(i, 'enunciado', e.target.value)} />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {['a','b','c','d','e'].map(opt => (
                                            <div key={opt} className="flex flex-col gap-1.5">
                                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase">{opt} {opt === 'e' && <span className="text-xs text-gray-400 lowercase">(Duda/Anulada)</span>}</label>
                                                <input className="w-full px-4 py-3 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100" value={q.opciones?.[opt] || ''} onChange={e => updateQuestion(i, opt, e.target.value, true)} />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex flex-col gap-1.5 border-t border-gray-200 dark:border-gray-800 pt-6">
                                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Respuesta Correcta</label>
                                        <select className="w-full sm:w-1/3 px-4 py-3 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 font-bold uppercase" value={q.respuesta_correcta} onChange={e => updateQuestion(i, 'respuesta_correcta', e.target.value)}>
                                            <option value="a">A</option><option value="b">B</option><option value="c">C</option><option value="d">D</option><option value="e">E</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="sticky bottom-0 bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md pt-4 pb-0 mt-4 border-t border-gray-100 dark:border-gray-800">
                        <button className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/30" onClick={handleSave}>Guardar Examen</button>
                    </div>
                </div>
            </div>

            {importAnswersStatus && (
                <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-6 sm:p-8 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className={`text-xl font-bold m-0 ${importAnswersStatus.type === 'error' ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'}`}>
                                {importAnswersStatus.type === 'error' ? 'Error al importar' : 'Confirmar Importación'}
                            </h3>
                            <button className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl transition-colors" onClick={() => setImportAnswersStatus(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="mb-6">
                            <p className="text-gray-700 dark:text-gray-300 font-medium m-0">{importAnswersStatus.message}</p>
                            
                            {importAnswersStatus.details && importAnswersStatus.details.length > 0 && (
                                <div className="mt-4 p-4 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-xl max-h-[200px] overflow-y-auto">
                                    <ul className="m-0 pl-4 text-sm text-gray-500 list-disc space-y-1">
                                        {importAnswersStatus.details.map((detail, idx) => (
                                            <li key={idx}>{detail}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                            <button className="px-5 py-2.5 font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors" onClick={() => setImportAnswersStatus(null)}>
                                {importAnswersStatus.type === 'error' ? 'Cerrar' : 'Cancelar'}
                            </button>
                            {importAnswersStatus.type === 'success' && (
                                <button className="px-6 py-2.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-md shadow-indigo-600/20" onClick={() => applyImportedAnswers(importAnswersStatus.validAnswers!)}>
                                    Aplicar Respuestas
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
