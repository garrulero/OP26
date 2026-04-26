import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Moon, Sun, User, LogIn, Clock, MessageSquare } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import AuthModal from './AuthModal';
import FeedbackModal from './FeedbackModal';

export default function Layout({ children, onNavigate }: { children: React.ReactNode, onNavigate: (view: string) => void }) {
    const { profile, user } = useAuth();
    const [theme, setTheme] = useState(
        typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    );
    const [isAuthOpen, setAuthOpen] = useState(false);
    const [isFeedbackOpen, setFeedbackOpen] = useState(false);
    const [studyTime, setStudyTime] = useState(0);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', newTheme);
    };

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    useEffect(() => {
        if (!user) {
            setStudyTime(0);
            return;
        }

        const q = query(collection(db, 'results'), where('userId', '==', user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            let total = 0;
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.timeElapsed) {
                    total += data.timeElapsed;
                }
            });
            setStudyTime(total);
        }, (err) => {
            console.error('Error fetching study time:', err);
        });

        return () => unsubscribe();
    }, [user]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-[#050505] text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300">
            <header className="sticky top-0 z-30 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-b border-gray-100 dark:border-gray-900">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onNavigate('home')}>
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
                            O26
                        </div>
                        <h1 className="text-xl font-bold tracking-tight hidden sm:block">OPE26 Platform</h1>
                    </div>
                    
                    <div className="flex items-center gap-2 sm:gap-4">
                        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#111] rounded-full border border-gray-100 dark:border-gray-800 shadow-sm">
                            <Clock size={16} className="text-gray-400" />
                            <span className="text-sm font-medium">
                                {user ? formatTime(studyTime) : '--'}
                            </span>
                        </div>
                        
                        {user ? (
                            <button 
                                className="flex items-center gap-2 px-3 py-2 sm:px-4 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-xl transition-colors font-medium text-sm"
                                onClick={() => onNavigate('profile')}
                            >
                                {profile?.photoURL ? 
                                    <img src={profile.photoURL} alt="Avatar" className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover" /> : 
                                    <User size={18} />
                                }
                                <span className="hidden sm:inline">{profile?.displayName?.split(' ')[0] || 'Perfil'}</span>
                            </button>
                        ) : (
                            <button 
                                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-xl transition-colors font-medium text-sm"
                                onClick={() => setAuthOpen(true)}
                            >
                                <LogIn size={18} /> <span className="hidden sm:inline">Entrar</span>
                            </button>
                        )}
                        
                        <button 
                            className="p-2 sm:p-2.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-xl transition-colors"
                            onClick={() => setFeedbackOpen(true)} 
                            title="Avisar de un error o sugerencia"
                        >
                            <MessageSquare size={20} />
                        </button>
                        
                        <button 
                            className="p-2 sm:p-2.5 text-gray-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-xl transition-colors"
                            onClick={toggleTheme}
                        >
                            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col">
                {children}
            </main>

            <footer className="w-full text-center py-12 text-sm font-medium text-gray-400 dark:text-gray-600 mt-auto">
                <p>Simulador OPE • Diseñado para la preparación de la Oposición</p>
            </footer>

            {isAuthOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
            {isFeedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
        </div>
    );
}
