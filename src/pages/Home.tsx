import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FileText, Loader2, Settings, X, Play } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Home({ onStartExam, onNavigate }: { onStartExam: (exam: any) => void, onNavigate: (v: string) => void }) {
    const { profile } = useAuth();
    const [exams, setExams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedExamForConfig, setSelectedExamForConfig] = useState<any>(null);
    const [config, setConfig] = useState({
        randomize: false,
        timeLimit: 0, // 0 means unlimited, other values in minutes
        showCorrections: false,
    });

    useEffect(() => {
        const fetchExams = async () => {
            try {
                const q = query(collection(db, 'exams'), orderBy('createdAt', 'desc'));
                const snap = await getDocs(q);
                setExams(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchExams();
    }, []);

    const handleSelectExamForConfig = (exam: any) => {
        setSelectedExamForConfig(exam);
        setConfig({ randomize: false, timeLimit: 0, showCorrections: false }); // reset defaults
    };

    const handleStartWithConfig = () => {
        if (!selectedExamForConfig) return;
        
        const examCopy = structuredClone(selectedExamForConfig); // deeper clone for shuffling safely
        
        if (config.randomize && examCopy.preguntas) {
            // Fisher-Yates shuffle
            for (let i = examCopy.preguntas.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [examCopy.preguntas[i], examCopy.preguntas[j]] = [examCopy.preguntas[j], examCopy.preguntas[i]];
            }
        }
        
        examCopy.config = config; // Send configuration to exam page
        
        onStartExam(examCopy);
        setSelectedExamForConfig(null);
    };

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-500 w-full">
            <div className="relative overflow-hidden bg-white dark:bg-[#111] p-8 sm:p-12 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/40 dark:shadow-none text-left">
                <div className="absolute top-[-50px] right-[-50px] w-[200px] h-[200px] bg-indigo-500 opacity-[0.03] dark:opacity-10 rounded-full" />
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-gray-900 dark:text-gray-100">
                    Elige tu simulacro
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-lg sm:text-xl max-w-2xl m-0 leading-relaxed">
                    Selecciona uno de los exámenes disponibles para evaluar tus conocimientos antes de la prueba oficial.
                </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full flex items-center justify-center gap-3 py-16 text-gray-500">
                        <Loader2 className="animate-spin" /> 
                        <span className="font-medium">Carga de simulacros...</span>
                    </div>
                ) : exams.length === 0 ? (
                    <div className="col-span-full py-16 flex flex-col items-center justify-center text-center">
                        <p className="text-gray-500 text-lg mb-4">No hay exámenes disponibles en la base de datos.</p>
                        {profile?.role === 'admin' && (
                            <button className="px-6 py-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 font-medium rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors" onClick={() => onNavigate('admin')}>
                                Ir al Panel Admin para añadir exámenes
                            </button>
                        )}
                    </div>
                ) : (
                    exams.map(exam => (
                        <div 
                            key={exam.id} 
                            className="group cursor-pointer flex flex-col justify-between min-h-[220px] bg-white dark:bg-[#111] border border-gray-100 dark:border-gray-800 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-300 hover:-translate-y-1" 
                            onClick={() => handleSelectExamForConfig(exam)}
                        >
                            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mb-6 shadow-lg shadow-indigo-600/30 group-hover:scale-110 transition-transform">
                                <FileText size={24} />
                            </div>
                            <div>
                               <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                   {exam.titulo || exam.id_examen}
                               </h3>
                               {exam.titulo && <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 truncate">Ref: {exam.id_examen}</p>}
                               <div className="flex flex-wrap gap-2 mt-auto">
                                   {exam.numero_parte && (
                                       <span className="px-2.5 py-1 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300">
                                           Parte {exam.numero_parte}
                                       </span>
                                   )}
                                   <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                                       {exam.preguntas?.length || 0} preguntas
                                   </span>
                                   {exam.etiquetas?.map((tag: string) => (
                                       <span key={tag} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                           {tag}
                                       </span>
                                   ))}
                               </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {selectedExamForConfig && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-[#111] max-w-lg w-full rounded-[2rem] p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between gap-4 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 flex items-center justify-center">
                                    <Settings size={20} />
                                </div>
                                <h3 className="text-xl font-bold tracking-tight m-0">Configuración</h3>
                            </div>
                            <button 
                                className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors" 
                                onClick={() => setSelectedExamForConfig(null)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="mb-8">
                            <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-1">
                                {selectedExamForConfig.titulo || selectedExamForConfig.id_examen}
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                Configura cómo quieres realizar este examen.
                            </p>

                            <div className="mb-5 bg-gray-50 dark:bg-[#1a1a1a] p-4 rounded-2xl">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={config.randomize}
                                        onChange={(e) => setConfig({ ...config, randomize: e.target.checked })}
                                        className="w-5 h-5 mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 outline-none"
                                    />
                                    <div>
                                        <span className="block font-semibold text-gray-900 dark:text-gray-100">Preguntas aleatorias</span>
                                        <span className="block text-xs text-gray-500 mt-1">El orden de las preguntas se mezclará.</span>
                                    </div>
                                </label>
                            </div>

                            <div className="mb-5 bg-gray-50 dark:bg-[#1a1a1a] p-4 rounded-2xl">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={config.showCorrections}
                                        onChange={(e) => setConfig({ ...config, showCorrections: e.target.checked })}
                                        className="w-5 h-5 mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 outline-none"
                                    />
                                    <div>
                                        <span className="block font-semibold text-gray-900 dark:text-gray-100">Mostrar corrección al avanzar</span>
                                        <span className="block text-xs text-gray-500 mt-1">Al darle a siguiente verás cuál era la correcta y su explicación.</span>
                                    </div>
                                </label>
                            </div>

                            <div className="bg-gray-50 dark:bg-[#1a1a1a] p-4 rounded-2xl">
                                <label className="block font-semibold text-gray-900 dark:text-gray-100 mb-2">Límite de tiempo</label>
                                <select 
                                    className="w-full bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                                    value={config.timeLimit}
                                    onChange={(e) => setConfig({ ...config, timeLimit: Number(e.target.value) })}
                                >
                                    <option value={0}>Sin límite de tiempo</option>
                                    <option value={15}>15 minutos</option>
                                    <option value={30}>30 minutos</option>
                                    <option value={60}>1 hora</option>
                                    <option value={90}>1 hora y 30 minutos</option>
                                    <option value={120}>2 horas</option>
                                    <option value={180}>3 horas</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button 
                                className="px-5 py-3 font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors" 
                                onClick={() => setSelectedExamForConfig(null)}
                            >
                                Cancelar
                            </button>
                            <button 
                                className="px-6 py-3 font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95" 
                                onClick={handleStartWithConfig}
                            >
                                <Play size={18} fill="currentColor" /> Comenzar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
