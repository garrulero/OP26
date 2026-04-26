import React, { useState, useCallback, memo } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Clock, AlertTriangle, Loader2, Check, ChevronRight, ChevronLeft, Flag, HelpCircle } from 'lucide-react';
import { useExamTimer } from '../hooks/useExamTimer';
import { ExamService } from '../services/ExamService';
import { Question, Exam, ExamResult } from '../types/exam';
import { motion, AnimatePresence } from 'motion/react';

interface ExamPageProps {
    exam: Exam;
    onFinish: (results: any) => void;
    onCancel: () => void;
}

// Micro-component for Timer to prevent full page re-renders
const TimerDisplay = memo(({ timeLimitSeconds, timeElapsed }: { timeLimitSeconds: number, timeElapsed: number }) => {
    if (!timeLimitSeconds) return null;
    
    const left = Math.max(0, timeLimitSeconds - timeElapsed);
    const m = Math.floor(left / 60);
    const s = left % 60;
    const formatted = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    const isDanger = left < 60;

    return (
        <div 
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-mono font-medium text-sm transition-colors duration-300
                ${isDanger ? 'bg-red-50 text-red-600 animate-pulse border border-red-100' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}
            `}
        >
            <Clock size={14} />
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatted}</span>
        </div>
    );
});

export default function ExamPage({ exam, onFinish, onCancel }: ExamPageProps) {
    const { user } = useAuth();
    const [qIndex, setQIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [showingCorrection, setShowingCorrection] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const totalQs = exam.preguntas?.length || 0;
    const timeLimitSeconds = exam.config?.timeLimit ? exam.config.timeLimit * 60 : 0;
    
    const handleForceSubmit = useCallback(() => {
        finishExam(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [answers]);

    const { timeElapsed } = useExamTimer(timeLimitSeconds, handleForceSubmit);

    if (totalQs === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 gap-6 min-h-[60vh] fade-in text-center">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-3xl flex items-center justify-center text-gray-400 mb-2">
                    <Flag size={40} />
                </div>
                <div className="max-w-xs">
                    <h2 className="text-xl font-bold mb-2">Sin preguntas</h2>
                    <p className="text-gray-500 dark:text-gray-400">Este examen todavía no tiene preguntas configuradas.</p>
                </div>
                <button className="rounded-2xl px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors" onClick={onCancel}>Volver al inicio</button>
            </div>
        );
    }
    
    const question = exam.preguntas[qIndex];
    const progressPercent = ((qIndex + 1) / totalQs) * 100;

    const handleSelectOption = (opt: string) => {
        if (showingCorrection || isSubmitting) return;
        const qId = question.id_pregunta || `q_${qIndex}`;
        setAnswers(prev => {
            if (prev[qId] === opt) {
                const { [qId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [qId]: opt };
        });
    };

    const finishExam = async (isForced = false) => {
        setIsSubmitting(true);
        setSubmitError(null);
        
        let correctCount = 0;
        let incorrectCount = 0;
        let blankCount = 0;

        exam.preguntas.forEach((q: Question, i: number) => {
            const qId = q.id_pregunta || `q_${i}`;
            const userAns = answers[qId];
            if (!userAns) blankCount++;
            else if (userAns === q.respuesta_correcta) correctCount++;
            else incorrectCount++;
        });

        const scorePercentValue = parseFloat(((correctCount / totalQs) * 100).toFixed(2));

        const resultObj: ExamResult = {
            examId: exam.id,
            examTitle: exam.titulo,
            userId: user?.uid || 'anonymous',
            scorePercent: scorePercentValue,
            correctCount,
            incorrectCount,
            blankCount,
            timeElapsed,
        };

        try {
            await ExamService.submitResult(resultObj, user);
            onFinish({ ...resultObj, exam, answers });
        } catch (err: any) {
            setSubmitError(err.message || 'Error de conexión');
            setTimeout(() => {
                 onFinish({ ...resultObj, exam, answers, offlineFallback: true });
            }, 3500);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#050505] text-gray-900 dark:text-gray-100 font-sans selection:bg-indigo-500/20">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-30 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-b border-gray-100 dark:border-gray-900">
                <div className="w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-4 flex items-center justify-between gap-4">
                    <button 
                        className="p-3 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-2xl transition-all active:scale-95 text-gray-400 hover:text-gray-900 dark:hover:text-white" 
                        onClick={onCancel} 
                        disabled={isSubmitting}
                    >
                        <ArrowLeft size={20} />
                    </button>

                    <div className="flex-1 flex flex-col items-center">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-500/10 px-2 py-0.5 rounded">
                                EXAMEN LIVE
                            </span>
                            <span className="text-xs font-bold text-gray-400 dark:text-gray-600 truncate max-w-[150px] sm:max-w-md">
                                {exam.titulo}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-sm font-bold">Pregunta {qIndex + 1}</span>
                            <span className="text-gray-300 dark:text-gray-800">/</span>
                            <span className="text-sm font-medium text-gray-400">{totalQs}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <TimerDisplay 
                            timeLimitSeconds={timeLimitSeconds} 
                            timeElapsed={timeElapsed} 
                        />
                        <button 
                            className="hidden sm:inline-flex items-center justify-center px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                            onClick={() => setShowConfirm(true)} 
                            disabled={isSubmitting}
                        >
                            Finalizar
                        </button>
                    </div>
                </div>
                
                {/* Progress Indicator */}
                <div className="absolute bottom-0 left-0 w-full h-[3px] bg-gray-50 dark:bg-[#0a0a0a]">
                    <motion.div 
                        className="h-full bg-indigo-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    />
                </div>
            </header>

            <main className="w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-16">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={qIndex}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -30 }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="flex flex-col gap-12"
                    >
                        {submitError && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 p-5 rounded-[2rem] flex items-center gap-4 border border-red-100 dark:border-red-900/20"
                            >
                                <div className="w-10 h-10 bg-white dark:bg-black rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                                    <AlertTriangle size={20} />
                                </div>
                                <p className="m-0 text-sm font-bold leading-tight">{submitError}</p>
                            </motion.div>
                        )}

                        <div className="flex flex-col gap-10">
                            <h3 className="text-2xl sm:text-3xl font-bold leading-[1.3] text-gray-900 dark:text-white tracking-tight">
                                {question.enunciado}
                            </h3>
                            
                            <div className="grid grid-cols-1 gap-4">
                                {['a', 'b', 'c', 'd', 'e'].map((opt, i) => {
                                    const qId = question.id_pregunta || `q_${qIndex}`;
                                    const isSelected = answers[qId] === opt;
                                    const isCorrect = showingCorrection && opt === question.respuesta_correcta;
                                    const isWrongSelected = showingCorrection && isSelected && opt !== question.respuesta_correcta;
                                    
                                    if (!question.opciones[opt]) return null;

                                    return (
                                        <motion.button 
                                            key={opt}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
                                            whileHover={{ scale: showingCorrection ? 1 : 1.01 }}
                                            whileTap={{ scale: showingCorrection ? 1 : 0.98 }}
                                            className={`relative group flex items-start w-full p-1 rounded-[1.5rem] transition-all duration-300
                                                ${isSelected && !showingCorrection 
                                                    ? 'bg-indigo-600 shadow-[0_10px_25px_-5px_rgba(79,70,229,0.3)]' 
                                                    : 'bg-gray-50 dark:bg-[#0f0f0f] border border-gray-100 dark:border-gray-900'}
                                                ${isCorrect ? '!bg-green-500 shadow-[0_10px_25px_-5px_rgba(34,197,94,0.3)]' : ''}
                                                ${isWrongSelected ? '!bg-red-500 shadow-[0_10px_25px_-5px_rgba(239,68,68,0.3)]' : ''}
                                            `}
                                            onClick={() => handleSelectOption(opt)}
                                            disabled={showingCorrection || isSubmitting}
                                        >
                                            <div className={`flex items-center w-full p-5 rounded-[1.4rem] transition-all duration-300 group-hover:bg-opacity-90
                                                ${isSelected && !showingCorrection ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'bg-white dark:bg-[#111]'}
                                                ${isCorrect ? 'bg-green-500/10 dark:bg-green-500/20' : ''}
                                                ${isWrongSelected ? 'bg-red-500/10 dark:bg-red-500/20' : ''}
                                            `}>
                                                <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base mr-5 transition-all duration-300
                                                    ${isSelected && !showingCorrection 
                                                        ? 'bg-indigo-500 text-white ring-4 ring-indigo-500/20' 
                                                        : 'bg-gray-100 dark:bg-gray-900 text-gray-500'}
                                                    ${isCorrect ? '!bg-green-500 !text-white !scale-110 ring-4 ring-green-500/20' : ''}
                                                    ${isWrongSelected ? '!bg-red-500 !text-white !scale-110 ring-4 ring-red-500/20' : ''}
                                                `}>
                                                    {opt.toUpperCase()}
                                                </div>
                                                
                                                <div className="flex-1 flex items-center justify-between">
                                                    <span className={`text-[17px] font-bold tracking-tight transition-colors
                                                        ${isSelected && !showingCorrection ? 'text-indigo-600' : 'text-gray-800 dark:text-gray-200'}
                                                        ${isCorrect ? '!text-green-600' : ''}
                                                        ${isWrongSelected ? '!text-red-600' : ''}
                                                    `}>
                                                        {question.opciones[opt]}
                                                    </span>
                                                    
                                                    {isCorrect && (
                                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-green-500 p-1.5 rounded-full text-white">
                                                            <Check size={16} strokeWidth={4} />
                                                        </motion.div>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.button>
                                    );
                                })}
                            </div>
                            
                            <AnimatePresence>
                                {showingCorrection && question.explicacion && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-6 p-8 bg-gray-50 dark:bg-[#0a0a0a] rounded-[2rem] border-2 border-dashed border-gray-200 dark:border-gray-800"
                                    >
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-8 h-8 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-500">
                                                <HelpCircle size={16} />
                                            </div>
                                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-600">
                                                Aprende por qué
                                            </span>
                                        </div>
                                        <p className="m-0 text-lg leading-relaxed text-gray-600 dark:text-gray-400 italic">
                                            "{question.explicacion}"
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Bottom Controls */}
            <footer className="fixed bottom-0 left-0 w-full bg-white/80 dark:bg-black/80 backdrop-blur-xl border-t border-gray-100 dark:border-gray-900 p-6 sm:p-8">
                <div className="w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto flex items-center justify-between gap-6">
                    <button 
                        className="flex items-center justify-center w-14 h-14 rounded-[1.2rem] bg-gray-50 dark:bg-gray-900 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all active:scale-90 border border-gray-100 dark:border-gray-800 disabled:opacity-20" 
                        disabled={qIndex === 0 || isSubmitting} 
                        onClick={() => {
                            setQIndex(qIndex - 1);
                            setShowingCorrection(false);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                    >
                        <ChevronLeft size={24} />
                    </button>
                    
                    <div className="flex-1 flex gap-4 h-14">
                        {qIndex < totalQs - 1 ? (
                            exam.config?.showCorrections && !showingCorrection ? (
                                <button 
                                    className="flex-1 h-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-indigo-500/20" 
                                    onClick={() => setShowingCorrection(true)} 
                                    disabled={isSubmitting}
                                >
                                    Corregir
                                </button>
                            ) : (
                                <button 
                                    className="flex-1 h-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2" 
                                    onClick={() => {
                                        setQIndex(qIndex + 1);
                                        setShowingCorrection(false);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    disabled={isSubmitting}
                                >
                                    Siguiente
                                    <ChevronRight size={18} strokeWidth={3} />
                                </button>
                            )
                        ) : (
                            <button 
                                className="flex-1 h-full rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all hover:scale-[1.02] active:scale-[0.98] bg-green-500 hover:bg-green-600 shadow-xl shadow-green-500/20 flex items-center justify-center" 
                                onClick={() => setShowConfirm(true)} 
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? <Loader2 size={24} className="animate-spin m-auto" /> : 'Finalizar Examen'}
                            </button>
                        )}
                    </div>

                    <button 
                        className="hidden sm:flex items-center justify-center w-14 h-14 rounded-[1.2rem] bg-red-50 dark:bg-red-900/10 text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-90 border border-transparent"
                        onClick={() => setShowConfirm(true)}
                        title="Abandonar"
                    >
                        <Flag size={20} />
                    </button>
                </div>
            </footer>
            <div className="h-40 sm:h-48" /> {/* Spacer for footer */}

            <AnimatePresence>
                {showConfirm && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-[#0a0a0a] rounded-[3rem] shadow-2xl max-w-sm w-full p-10 border border-gray-100 dark:border-gray-900 text-center"
                        >
                            <div className="w-20 h-20 bg-red-50 dark:bg-red-900/10 rounded-[2rem] flex items-center justify-center text-red-500 mx-auto mb-8 shadow-inner">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="text-2xl font-black mb-4 tracking-tight">¿Estás seguro?</h3>
                            <p className="text-gray-500 dark:text-gray-500 mb-10 leading-relaxed font-medium">
                                No podrás volver a modificar tus respuestas una vez finalizado el simulacro.
                            </p>
                            <div className="flex flex-col gap-4">
                                <button className="h-14 rounded-2xl font-black text-white tracking-widest bg-red-500 hover:bg-red-600 transition-colors shadow-xl shadow-red-500/20 flex items-center justify-center" onClick={() => finishExam(false)} disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'FINALIZAR AHORA'}
                                </button>
                                <button className="h-14 rounded-2xl font-bold text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors" onClick={() => setShowConfirm(false)} disabled={isSubmitting}>
                                    Continuar revisando
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
