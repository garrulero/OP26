import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ArrowLeft, Trash2, Edit, Edit2, UploadCloud, BarChart3, Plus, X, Download } from 'lucide-react';
import ExamModal from '../components/ExamModal';
import ImportModal from '../components/ImportModal';

export default function Admin({ onBack }: { onBack: () => void }) {
    const [tab, setTab] = useState<'exams' | 'users' | 'reports'>('exams');
    const [exams, setExams] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isExamModalOpen, setExamModalOpen] = useState(false);
    const [isImportModalOpen, setImportModalOpen] = useState(false);
    const [editingExam, setEditingExam] = useState<any>(null);
    const [confirmDeleteExam, setConfirmDeleteExam] = useState<string | null>(null);
    const [confirmChangeRole, setConfirmChangeRole] = useState<any>(null);
    const [confirmDeleteReport, setConfirmDeleteReport] = useState<string | null>(null);

    const loadExams = async () => {
        setLoading(true);
        try {
            const snap = await getDocs(collection(db, 'exams'));
            setExams(snap.docs.map(d => ({id: d.id, ...d.data()})));
        } catch (e: any) {
            console.error('Error loading exams:', e);
        }
        setLoading(false);
    };

    const loadUsers = async () => {
        setLoading(true);
        try {
            const snap = await getDocs(collection(db, 'users'));
            setUsers(snap.docs.map(d => ({id: d.id, ...d.data()})));
        } catch (e: any) {
            console.error('Error loading users:', e);
        }
        setLoading(false);
    };

    const loadReports = async () => {
        setLoading(true);
        try {
            const [reportsSnap, feedbackSnap] = await Promise.all([
                getDocs(collection(db, 'reports')),
                getDocs(collection(db, 'feedback'))
            ]);

            const reportsData = reportsSnap.docs.map(d => {
                const data = d.data();
                return { 
                    id: d.id, 
                    ...data, 
                    source: 'reports',
                    // Asegurar que reason existe
                    reason: data.reason || 'Sin descripción',
                    createdAt: data.createdAt || new Date(0).toISOString()
                };
            });
            
            const feedbackData = feedbackSnap.docs.map(d => {
                const data = d.data();
                let dateStr = new Date(0).toISOString();
                
                if (data.timestamp) {
                    if (typeof data.timestamp.toDate === 'function') {
                        dateStr = data.timestamp.toDate().toISOString();
                    } else if (typeof data.timestamp === 'string') {
                        dateStr = data.timestamp;
                    } else if (data.timestamp.seconds) {
                        dateStr = new Date(data.timestamp.seconds * 1000).toISOString();
                    }
                } else if (data.createdAt) {
                    dateStr = data.createdAt;
                }

                return {
                    id: d.id,
                    ...data,
                    source: 'feedback',
                    reason: data.message || data.reason || 'Sin contenido',
                    createdAt: dateStr,
                    type: data.type || 'feedback'
                };
            });

            const merged = [...reportsData, ...feedbackData].sort((a: any, b: any) => {
                try {
                    const dateA = new Date(a.createdAt).getTime();
                    const dateB = new Date(b.createdAt).getTime();
                    return dateB - dateA;
                } catch (e) {
                    return 0;
                }
            });

            console.log('Admin: merged reports and feedback', merged.length);
            setReports(merged);
        } catch (e: any) {
            console.error('Error loading reports:', e);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (tab === 'exams') loadExams();
        else if (tab === 'users') loadUsers();
        else loadReports();
    }, [tab]);

    const handleDeleteExam = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'exams', id));
            loadExams();
        } catch (e: any) {
            console.error(e);
        }
        setConfirmDeleteExam(null);
    };

    const handleToggleRole = async (user: any) => {
        const newRole = user.role === 'admin' ? 'user' : 'admin';
        try {
            await updateDoc(doc(db, 'users', user.id), { role: newRole });
            loadUsers();
        } catch (e: any) {
            console.error(e);
        }
        setConfirmChangeRole(null);
    };

    const handleResolveReport = async (id: string, currentStatus: string, source: string = 'reports') => {
        const newStatus = currentStatus === 'pending' ? 'resolved' : 'pending';
        try {
            await updateDoc(doc(db, source, id), { status: newStatus });
            loadReports();
        } catch (e: any) {
            console.error(e);
        }
    };

    const handleDeleteReport = async (id: string, source: string = 'reports') => {
        try {
            await deleteDoc(doc(db, source, id));
            loadReports();
        } catch (e: any) {
            console.error(e);
        }
        setConfirmDeleteReport(null);
    };

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-500 w-full max-w-7xl mx-auto">
            <div className="bg-white dark:bg-[#111] p-8 sm:p-12 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-xl shadow-gray-200/40 dark:shadow-none relative overflow-hidden text-left">
                <div className="absolute top-[-50px] right-[-50px] w-[200px] h-[200px] bg-indigo-500 opacity-[0.03] dark:opacity-10 rounded-full" />
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-gray-900 dark:text-gray-100">Panel de Administración</h2>
                <p className="text-gray-500 dark:text-gray-400 text-lg sm:text-xl m-0 max-w-2xl">Gestiona los exámenes de la plataforma y el banco de preguntas.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 bg-white dark:bg-[#111] p-6 lg:p-8 border border-gray-100 dark:border-gray-800 rounded-[2rem] shadow-sm">
                    <div className="flex overflow-x-auto pb-4 mb-6 border-b border-gray-100 dark:border-gray-800 gap-2 sm:gap-4 snap-x no-scrollbar">
                        <button 
                            className={`snap-start whitespace-nowrap px-6 py-3 rounded-xl font-semibold transition-all ${tab === 'exams' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:text-gray-100 dark:hover:bg-[#1a1a1a]'}`} 
                            onClick={() => setTab('exams')}
                        >Exámenes</button>
                        <button 
                            className={`snap-start whitespace-nowrap px-6 py-3 rounded-xl font-semibold transition-all ${tab === 'users' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:text-gray-100 dark:hover:bg-[#1a1a1a]'}`} 
                            onClick={() => setTab('users')}
                        >Usuarios</button>
                        <button 
                            className={`snap-start whitespace-nowrap px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${tab === 'reports' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:text-gray-100 dark:hover:bg-[#1a1a1a]'}`} 
                            onClick={() => setTab('reports')}
                        >
                            Avisos {reports.filter(r => r.status === 'pending').length > 0 && <span className={`px-2 py-0.5 rounded-full text-xs ${tab === 'reports' ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'}`}>{reports.filter(r => r.status === 'pending').length}</span>}
                        </button>
                    </div>

                    {tab === 'exams' && (
                        <div>
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Exámenes</h3>
                                <div className="flex gap-2">
                                    <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl font-semibold transition-colors" onClick={() => setImportModalOpen(true)}>
                                        <Download size={18}/> Importar
                                    </button>
                                    <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all" onClick={() => { setEditingExam(null); setExamModalOpen(true); }}>
                                        <Plus size={18}/> Nuevo
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-col gap-4">
                                {loading ? <div className="py-8 text-center text-gray-500">Cargando...</div> : exams.map(ex => (
                                    <div key={ex.id} className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 p-5 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800 rounded-2xl">
                                        <div>
                                            <strong className="text-gray-900 dark:text-gray-100 text-lg">{ex.titulo || ex.id_examen}</strong>
                                            <div className="text-gray-500 text-sm mt-1">
                                                ID: {ex.id_examen} <span className="mx-1">•</span> Parte: {ex.numero_parte || '-'} <span className="mx-1">•</span> {ex.preguntas?.length || 0} preguntas
                                            </div>
                                            {ex.etiquetas && ex.etiquetas.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mt-3">
                                                    {ex.etiquetas.map((t: string) => (
                                                        <span key={t} className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-lg">{t}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-800 sm:border-0 pt-3 sm:pt-0">
                                            <button className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-xl transition-colors" onClick={() => { setEditingExam(ex); setExamModalOpen(true); }}><Edit2 size={18}/></button>
                                            {confirmDeleteExam === ex.id ? (
                                                <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/10 px-3 rounded-xl border border-red-100 dark:border-red-900/20">
                                                    <span className="text-xs text-red-600 font-medium">¿Seguro?</span>
                                                    <button className="px-2 py-1 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg" onClick={() => handleDeleteExam(ex.id)}>Sí</button>
                                                    <button className="px-2 py-1 text-xs font-bold text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg" onClick={() => setConfirmDeleteExam(null)}>No</button>
                                                </div>
                                            ) : (
                                                <button className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors" onClick={() => setConfirmDeleteExam(ex.id)}><Trash2 size={18}/></button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {tab === 'users' && (
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Usuarios</h3>
                            <div className="flex flex-col gap-4">
                                {loading ? <div className="py-8 text-center text-gray-500">Cargando...</div> : users.map(u => (
                                    <div key={u.id} className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 p-5 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800 rounded-2xl">
                                        <div>
                                            <strong className="text-gray-900 dark:text-gray-100 text-lg">{u.displayName || 'Sin nombre'}</strong>
                                            <div className="text-gray-500 text-sm mt-1">{u.email}</div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 dark:border-gray-800 sm:border-0 pt-3 sm:pt-0">
                                            <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${u.role === 'admin' ? 'bg-red-100 text-red-700 dark:bg-red-900/30' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30'}`}>{u.role?.toUpperCase() || 'USER'}</span>
                                            {confirmChangeRole === u.id ? (
                                                <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/10 px-3 rounded-xl border border-indigo-100 dark:border-indigo-900/20 py-1">
                                                    <span className="text-xs font-medium text-indigo-600">¿Seguro?</span>
                                                    <button className="px-2 py-1 text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg" onClick={() => handleToggleRole(u)}>Sí</button>
                                                    <button className="px-2 py-1 text-xs font-bold text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg" onClick={() => setConfirmChangeRole(null)}>No</button>
                                                </div>
                                            ) : (
                                                <button className="px-3 py-1.5 text-xs font-bold border border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors" onClick={() => setConfirmChangeRole(u.id)}>Toggle Rol</button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {tab === 'reports' && (
                        <div>
                            <div className="mb-6">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Avisos de Errores</h3>
                            </div>
                            <div className="flex flex-col gap-4">
                                {loading ? <div className="py-8 text-center text-gray-500">Cargando...</div> : reports.length === 0 ? <p className="text-gray-500 text-center py-8">No hay avisos registrados.</p> : reports.map(r => (
                                    <div key={r.id} className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 p-5 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800 rounded-2xl">
                                        <div className="flex-1">
                                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                                <strong className={r.status === 'resolved' ? 'text-green-600' : 'text-gray-900 dark:text-gray-100'}>
                                                    {r.source === 'reports' ? `Pregunta ${r.questionIndex + 1}` : 'General / Feedback'}
                                                </strong>
                                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${r.status === 'resolved' ? 'bg-indigo-100 text-indigo-700' : 'bg-red-100 text-red-700'}`}>
                                                    {r.status === 'resolved' ? 'RESUELTO' : 'PENDIENTE'}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {r.source === 'reports' ? `Examen ID: ${r.examId} • ` : `Tipo: ${r.type} • `}
                                                    Usuario: {r.userId}
                                                </span>
                                            </div>
                                            {r.source === 'reports' && r.questionText && (
                                                <div className="italic mb-3 text-gray-500 text-sm border-l-2 border-gray-300 dark:border-gray-700 pl-3">
                                                    "{r.questionText}"
                                                </div>
                                            )}
                                            <div className="bg-white dark:bg-[#222] p-3 rounded-xl text-sm border border-gray-200 dark:border-gray-800 break-words mb-3">
                                                <span className="font-semibold text-gray-900 dark:text-gray-100">Mensaje:</span> <span className="text-gray-600 dark:text-gray-400">{r.reason}</span>
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                Fecha: {new Date(r.createdAt).toLocaleString()}
                                            </div>
                                        </div>
                                        <div className="flex sm:flex-col items-center gap-2 border-t border-gray-200 dark:border-gray-800 sm:border-0 pt-4 sm:pt-0 w-full sm:w-auto mt-2 sm:mt-0">
                                            <button 
                                                className={`flex-1 sm:w-full px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${r.status === 'resolved' ? 'bg-gray-200 dark:bg-gray-800 text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-700' : 'bg-indigo-50 outline outline-1 outline-indigo-200 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:outline-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-900/40'}`} 
                                                onClick={() => handleResolveReport(r.id, r.status, r.source)}
                                            >
                                                {r.status === 'resolved' ? 'Marcar Pendiente' : 'Marcar Resuelto'}
                                            </button>
                                            {confirmDeleteReport === r.id ? (
                                                <div className="flex-1 sm:w-full flex items-center justify-center gap-1 bg-red-50 dark:bg-red-900/10 px-2 py-1.5 rounded-xl border border-red-100 dark:border-red-900/20">
                                                    <span className="text-[10px] text-red-600 font-bold uppercase">¿Seguro?</span>
                                                    <button className="px-2 text-xs font-bold text-red-600 hover:bg-red-200 dark:hover:bg-red-900/40 rounded" onClick={() => handleDeleteReport(r.id, r.source)}>Sí</button>
                                                    <button className="px-2 text-xs font-bold text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 rounded" onClick={() => setConfirmDeleteReport(null)}>No</button>
                                                </div>
                                            ) : (
                                                <button className="p-2 sm:w-full flex justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors" onClick={() => setConfirmDeleteReport(r.id)}><Trash2 size={18}/></button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-white dark:bg-[#111] p-6 lg:p-8 border border-gray-100 dark:border-gray-800 rounded-[2rem] shadow-sm h-fit">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Acciones</h3>
                    <div className="flex flex-col gap-3">
                        <button className="flex items-center gap-3 px-4 py-3 w-full text-left bg-gray-50 hover:bg-gray-100 dark:bg-[#1a1a1a] dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"><UploadCloud size={18} /> Migrar db</button>
                        <button className="flex items-center gap-3 px-4 py-3 w-full text-left bg-gray-50 hover:bg-gray-100 dark:bg-[#1a1a1a] dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"><BarChart3 size={18} /> Estadísticas</button>
                        <div className="h-px bg-gray-100 dark:bg-gray-800 my-2" />
                        <button className="flex items-center justify-center gap-2 px-4 py-3 w-full border border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl font-semibold transition-colors" onClick={onBack}><ArrowLeft size={18} /> Volver</button>
                    </div>
                </div>
            </div>

            {isExamModalOpen && <ExamModal exam={editingExam} onClose={() => { setExamModalOpen(false); loadExams(); }} />}
            {isImportModalOpen && <ImportModal onClose={() => { setImportModalOpen(false); loadExams(); }} />}
        </div>
    );
}
