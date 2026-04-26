import React, { useState, memo } from 'react';
import { Home, CheckCircle, XCircle, HelpCircle, AlertTriangle, X, ArrowLeft, Clock, Share2, MessageCircle } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Exam, Question } from '../types/exam';
import { motion, AnimatePresence } from 'motion/react';

interface ResultsProps {
    results: {
        scorePercent: number;
        correctCount: number;
        incorrectCount: number;
        blankCount: number;
        exam: Exam;
        answers: Record<string, string>;
        timeElapsed: number;
    };
    onBackHome: () => void;
}

const ReviewItem = memo(({ 
    q, 
    index, 
    userAnswer, 
    isReported, 
    onReport 
}: { 
    q: Question, 
    index: number, 
    userAnswer: string, 
    isReported: boolean, 
    onReport: () => void 
}) => {
    const isCorrect = userAnswer === q.respuesta_correcta;
    const isBlank = !userAnswer;
    
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`group bg-white dark:bg-[#111] rounded-3xl p-5 sm:p-6 border transition-all duration-300
                ${isCorrect ? 'border-green-100 dark:border-green-900/20' : isBlank ? 'border-gray-100 dark:border-gray-800' : 'border-red-100 dark:border-red-900/20'}
            `}
        >
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm
                        ${isCorrect ? 'bg-green-100 text-green-600 dark:bg-green-900/20' : isBlank ? 'bg-gray-100 text-gray-400 dark:bg-gray-800' : 'bg-red-100 text-red-600 dark:bg-red-900/20'}
                    `}>
                        {index + 1}
                    </div>
                    <div>
                        <span className={`text-xs font-black uppercase tracking-[0.2em] 
                            ${isCorrect ? 'text-green-500' : isBlank ? 'text-gray-400' : 'text-red-500'}
                        `}>
                            {isCorrect ? 'Correcta' : isBlank ? 'Sin responder' : 'Incorrecta'}
                        </span>
                    </div>
                </div>
                
                {!isReported ? (
                    <button 
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-500 rounded-full transition-all" 
                        onClick={onReport}
                        title="Reportar error"
                    >
                        <AlertTriangle size={16} />
                    </button>
                ) : (
                    <div className="text-green-500 p-2" title="Reportado">
                        <CheckCircle size={16} />
                    </div>
                )}
            </div>

            <p className="text-base sm:text-lg font-bold leading-relaxed mb-6 sm:mb-8 text-gray-800 dark:text-gray-200">
                {q.enunciado}
            </p>

            <div className="grid grid-cols-1 gap-2 sm:gap-3">
                {['a', 'b', 'c', 'd', 'e'].map(optKey => {
                    if (!q.opciones[optKey]) return null;
                    const isUserChoice = optKey === userAnswer;
                    const isTheCorrectOne = optKey === q.respuesta_correcta;
                    
                    return (
                        <div 
                            key={optKey} 
                            className={`flex items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border-2 transition-all
                                ${isTheCorrectOne ? 'border-green-500 bg-green-500/5 dark:bg-green-500/10' : 'border-transparent bg-gray-50 dark:bg-gray-900/50'}
                                ${isUserChoice && !isTheCorrectOne ? 'border-red-500 bg-red-500/5 dark:bg-red-500/10' : ''}
                            `}
                        >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 mt-0.5 sm:mt-0
                                ${isTheCorrectOne ? 'bg-green-500 text-white' : isUserChoice ? 'bg-red-500 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}
                            `}>
                                {optKey.toUpperCase()}
                            </div>
                            <span className={`text-sm font-bold flex-1
                                ${isTheCorrectOne ? 'text-green-600 dark:text-green-400' : isUserChoice ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}
                            `}>
                                {q.opciones[optKey]}
                            </span>
                            
                            {isTheCorrectOne && <CheckCircle size={16} className="text-green-500 shrink-0" />}
                            {isUserChoice && !isTheCorrectOne && <XCircle size={16} className="text-red-500 shrink-0" />}
                        </div>
                    );
                })}
            </div>

            {q.explicacion && (
                <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-start gap-4 p-6 bg-indigo-50 dark:bg-indigo-900/10 rounded-[2rem]">
                        <div className="w-10 h-10 bg-white dark:bg-black rounded-xl flex items-center justify-center shrink-0 shadow-sm text-indigo-600">
                            <MessageCircle size={18} />
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 mb-1 block">Explicación</span>
                            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400 italic font-medium">
                                {q.explicacion}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
});

ReviewItem.displayName = 'ReviewItem';

export default function Results({ results, onBackHome }: ResultsProps) {
    const { scorePercent, correctCount, incorrectCount, blankCount, exam, answers, timeElapsed } = results;
    
    // Format time
    const minutes = Math.floor(timeElapsed / 60);
    const seconds = timeElapsed % 60;
    const timeFormatted = `${minutes}m ${seconds}s`;

    const [reportingQuestion, setReportingQuestion] = useState<{ index: number, text: string } | null>(null);
    const [reportReason, setReportReason] = useState('');
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);
    const [reportedQuestions, setReportedQuestions] = useState<Set<number>>(new Set());

    const handleReportSubmit = async () => {
        if (!reportingQuestion || !reportReason.trim()) return;
        setIsSubmittingReport(true);
        try {
            await addDoc(collection(db, 'reports'), {
                userId: auth.currentUser?.uid || 'anonymous',
                examId: exam.id || 'no_id',
                questionIndex: reportingQuestion.index,
                questionText: reportingQuestion.text,
                reason: reportReason.trim(),
                status: 'pending',
                createdAt: new Date().toISOString()
            });
            setReportedQuestions(prev => new Set(prev).add(reportingQuestion.index));
            setReportingQuestion(null);
            setReportReason('');
        } catch (error: any) {
            console.error('Error enviando el reporte:', error);
        } finally {
            setIsSubmittingReport(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#050505] pb-24">
            {/* Top Bar */}
            <header className="sticky top-0 z-30 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-b border-gray-100 dark:border-gray-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <button 
                        onClick={onBackHome}
                        className="p-3 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-2xl transition-all text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <span className="text-sm font-black tracking-widest uppercase text-gray-400">Resultados Finales</span>
                    <button className="p-3 bg-gray-100 dark:bg-gray-900 rounded-2xl transition-all text-gray-500">
                        <Share2 size={20} />
                    </button>
                </div>
            </header>

            <main className="w-full max-w-[1920px] mx-auto px-4 sm:px-8 xl:px-12 py-12 xl:py-16">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Score Card */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="lg:col-span-4 xl:col-span-3 bg-indigo-600 rounded-[3rem] p-8 sm:p-10 text-white shadow-2xl shadow-indigo-600/20 flex flex-col items-center text-center lg:sticky lg:top-28 relative top-0 z-10"
                    >
                        <div className="relative w-32 h-32 sm:w-48 sm:h-48 mb-6 sm:mb-8">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 192 192">
                                <circle
                                    cx="96"
                                    cy="96"
                                    r="88"
                                    stroke="currentColor"
                                    strokeWidth="12"
                                    fill="transparent"
                                    className="opacity-20"
                                />
                                <motion.circle
                                    cx="96"
                                    cy="96"
                                    r="88"
                                    stroke="currentColor"
                                    strokeWidth="12"
                                    fill="transparent"
                                    strokeDasharray={2 * Math.PI * 88}
                                    initial={{ strokeDashoffset: 2 * Math.PI * 88 }}
                                    animate={{ strokeDashoffset: 2 * Math.PI * 88 * (1 - scorePercent / 100) }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl sm:text-5xl font-black">{scorePercent}%</span>
                                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-60">Puntuación</span>
                            </div>
                        </div>

                        <h2 className="text-xl sm:text-2xl font-bold mb-2">¡Simulacro Finalizado!</h2>
                        <p className="text-white/60 text-xs sm:text-sm font-medium mb-6 sm:mb-8 px-4">Has completado el examen "{exam.titulo}"</p>
                        
                        <div className="grid grid-cols-2 gap-4 w-full">
                            <div className="bg-white/10 rounded-3xl p-4">
                                <Clock size={16} className="mx-auto mb-2 opacity-60" />
                                <span className="block text-xl font-bold leading-none mb-1">{timeFormatted}</span>
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Tiempo</span>
                            </div>
                            <div className="bg-white/10 rounded-3xl p-4">
                                <HelpCircle size={16} className="mx-auto mb-2 opacity-60" />
                                <span className="block text-xl font-bold leading-none mb-1">{blankCount}</span>
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Blancos</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Breakdown & List */}
                    <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-8">
                        <div className="grid grid-cols-2 gap-4">
                            <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                                className="bg-white dark:bg-[#111] rounded-[2rem] p-6 border border-gray-100 dark:border-gray-900"
                            >
                                <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500 mb-4">
                                    <CheckCircle size={24} />
                                </div>
                                <span className="block text-3xl font-black text-gray-900 dark:text-white leading-none mb-1">{correctCount}</span>
                                <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">Aciertos</span>
                            </motion.div>
                            
                            <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 }}
                                className="bg-white dark:bg-[#111] rounded-[2rem] p-6 border border-gray-100 dark:border-gray-900"
                            >
                                <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mb-4">
                                    <XCircle size={24} />
                                </div>
                                <span className="block text-3xl font-black text-gray-900 dark:text-white leading-none mb-1">{incorrectCount}</span>
                                <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">Fallos</span>
                            </motion.div>
                        </div>

                        <div className="flex flex-col gap-6">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-xl font-bold tracking-tight">Revisión Detallada</h3>
                                <span className="text-xs font-black uppercase tracking-widest text-gray-400">{exam.preguntas.length} Preguntas</span>
                            </div>
                            
                            <div className="flex flex-col gap-6">
                                {exam.preguntas.map((q, i) => {
                                    const qId = q.id_pregunta || `q_${i}`;
                                    return (
                                        <ReviewItem 
                                            key={i}
                                            q={q}
                                            index={i}
                                            userAnswer={answers[qId]}
                                            isReported={reportedQuestions.has(i)}
                                            onReport={() => setReportingQuestion({ index: i, text: q.enunciado })}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Bottom Actions */}
            <div className="fixed bottom-0 left-0 w-full p-4 sm:p-8 flex justify-center z-40 bg-gradient-to-t from-gray-50 dark:from-[#050505] via-gray-50/80 dark:via-[#050505]/80 to-transparent pb-safe">
                <button 
                    className="w-[90%] sm:w-auto rounded-2xl px-12 py-4 bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xl shadow-indigo-600/40 font-black tracking-widest uppercase text-sm flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95"
                    onClick={onBackHome}
                >
                    <Home size={18} strokeWidth={3} />
                    <span>Volver a Inicio</span>
                </button>
            </div>

            <AnimatePresence>
                {reportingQuestion && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-[#0a0a0a] rounded-[3rem] shadow-2xl max-w-sm w-full p-10 border border-gray-100 dark:border-gray-900"
                        >
                            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/10 rounded-[1.5rem] flex items-center justify-center text-red-500 mb-8 mx-auto">
                                <AlertTriangle size={32} />
                            </div>
                            
                            <h3 className="text-2xl font-black mb-4 text-center tracking-tight">Reportar Error</h3>
                            <p className="text-gray-500 dark:text-gray-500 mb-8 text-center leading-relaxed italic text-sm">
                                "{(reportingQuestion.text.slice(0, 80))}..."
                            </p>
                            
                            <div className="mb-10">
                                <textarea 
                                    className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-indigo-600 outline-none transition-all resize-none" 
                                    rows={4} 
                                    placeholder="Explícanos cuál es el error..."
                                    value={reportReason}
                                    onChange={e => setReportReason(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="flex flex-col gap-3">
                                <button 
                                    className="h-14 rounded-2xl font-black tracking-widest text-white bg-red-500 hover:bg-red-600 border-none shadow-xl shadow-red-500/20 transition-colors disabled:opacity-50" 
                                    onClick={handleReportSubmit} 
                                    disabled={isSubmittingReport || !reportReason.trim()}
                                >
                                    {isSubmittingReport ? 'Enviando...' : 'ENVIAR AVISO'}
                                </button>
                                <button className="h-14 rounded-2xl font-bold text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors" onClick={() => setReportingQuestion(null)} disabled={isSubmittingReport}>
                                    Cancelar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

