import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { X, LogIn } from 'lucide-react';

export default function AuthModal({ onClose, hideClose = false }: { onClose: () => void, hideClose?: boolean }) {
    const { loginWithGoogle } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
                onClose();
            } else {
                const cred = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(cred.user, { displayName: name || 'Usuario' });
                await setDoc(doc(db, 'users', cred.user.uid), {
                    uid: cred.user.uid,
                    email: cred.user.email,
                    displayName: name || 'Usuario',
                    role: 'user',
                    createdAt: serverTimestamp()
                });
                onClose();
            }
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-6 sm:p-8 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 m-0">{isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}</h3>
                    {!hideClose && (
                        <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors" onClick={onClose}><X size={20}/></button>
                    )}
                </div>
                {error && <p className="text-sm font-medium text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg mb-4">{error}</p>}
                
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {!isLogin && (
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nombre</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                    )}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Contraseña</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <button type="submit" className="w-full py-3 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md shadow-indigo-600/20">
                        {isLogin ? 'Entrar' : 'Registrarse'}
                    </button>
                </form>

                <p className="text-center mt-6 text-sm text-gray-500">
                    {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
                    <button onClick={() => setIsLogin(!isLogin)} className="font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
                        {isLogin ? 'Regístrate' : 'Inicia sesión'}
                    </button>
                </p>

                <div className="flex items-center gap-4 my-6">
                    <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1"></div>
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">o</span>
                    <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1"></div>
                </div>
                <button 
                    onClick={async () => {
                        await loginWithGoogle();
                        onClose();
                    }} 
                    className="w-full py-3 flex items-center justify-center gap-2 bg-white dark:bg-[#1a1a1a] hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl font-semibold transition-all shadow-sm"
                >
                    <img src="https://www.google.com/favicon.ico" width="16" alt="Google" /> Acceder con Google
                </button>
            </div>
        </div>
    );
}
