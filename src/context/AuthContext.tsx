import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    role: string;
    photoURL?: string;
}

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    logout: () => Promise<void>;
    loginWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                const userRef = doc(db, 'users', firebaseUser.uid);
                try {
                    const snap = await getDoc(userRef);
                    if (snap.exists()) {
                        let data = snap.data() as UserProfile;
                        if (firebaseUser.email === 'raulrojovalle@gmail.com' && data.role !== 'admin') {
                            await setDoc(userRef, { role: 'admin' }, { merge: true });
                            data.role = 'admin';
                        }
                        setProfile(data);
                    } else {
                        const newProfile: UserProfile = {
                            uid: firebaseUser.uid,
                            email: firebaseUser.email || '',
                            displayName: firebaseUser.displayName || 'Usuario',
                            role: firebaseUser.email === 'raulrojovalle@gmail.com' ? 'admin' : 'user',
                            photoURL: firebaseUser.photoURL || ''
                        };
                        await setDoc(userRef, { ...newProfile, createdAt: serverTimestamp() });
                        setProfile(newProfile);
                    }
                } catch(e) {
                    console.error("Error fetching profile", e);
                }
            } else {
                setProfile(null);
            }
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const logout = () => signOut(auth);
    const loginWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (e: any) {
            console.error(e);
            if (e.code !== 'auth/popup-closed-by-user') {
                alert('Error con Google Auth: ' + e.message);
            }
        }
    }

    return (
        <AuthContext.Provider value={{ user, profile, loading, logout, loginWithGoogle }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
