import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import ExamPage from './pages/ExamPage';
import Results from './pages/Results';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import AuthModal from './components/AuthModal';

function AppContent() {
    const { user, loading } = useAuth();
    const [view, setView] = useState('home');
    const [activeExam, setActiveExam] = useState<any>(null);
    const [examResults, setExamResults] = useState<any>(null);

    const handleNavigate = (v: string) => setView(v);

    const handleStartExam = (exam: any) => {
        setActiveExam(exam);
        setView('exam');
    };

    const handleFinishExam = (results: any) => {
        setExamResults(results);
        setActiveExam(null);
        setView('results');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#050505]">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user) {
        // Simple landing/auth page when not logged in
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#050505] p-4 relative overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-3xl opacity-50 shadow-inner"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-3xl opacity-50 shadow-inner"></div>
                
                <div className="w-full max-w-md z-10">
                    <div className="flex flex-col items-center mb-8 text-center">
                        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-indigo-600/30 mb-6 transform hover:rotate-6 transition-transform">
                            O26
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100 mb-2">Osakidetza 2026</h1>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">Plataforma de simulacros para oposiciones de Sanidad</p>
                    </div>

                    <AuthModal onClose={() => {}} hideClose={true} />
                    
                    <div className="mt-8 text-center text-sm text-gray-400">
                        © {new Date().getFullYear()} Osakidetza Opps Preparación
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            {view === 'exam' ? (
                <ExamPage exam={activeExam} onFinish={handleFinishExam} onCancel={() => setView('home')} />
            ) : view === 'results' ? (
                <Results results={examResults} onBackHome={() => setView('home')} />
            ) : (
                <Layout onNavigate={handleNavigate}>
                    {view === 'home' && <Home onStartExam={handleStartExam} onNavigate={handleNavigate} />}
                    {view === 'profile' && <Profile onNavigate={handleNavigate} />}
                    {view === 'admin' && <Admin onBack={() => setView('profile')} />}
                </Layout>
            )}
        </>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}
