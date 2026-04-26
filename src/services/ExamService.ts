import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ExamResult } from '../types/exam';

const PENDING_RESULTS_KEY = 'pending_exam_results';
let isSyncing = false;

export const ExamService = {
    async submitResult(resultObj: ExamResult, user: any) {
        if (!user || user.uid === 'anonymous') return resultObj;
        
        try {
            // Include client-side timestamp as fallback if needed
            const payload = {
                ...resultObj,
                serverTimestamp: serverTimestamp(),
                clientTimestamp: new Date().toISOString()
            };
            
            await addDoc(collection(db, 'results'), payload);
            await this.syncOfflineResults();
        } catch (error) {
            console.error('Error saving stats:', error);
            this.saveOffline(resultObj);
            throw new Error('Hubo un problema de conexión. El progreso se ha guardado localmente e intentará enviarse más tarde.');
        }
        return resultObj;
    },
    
    saveOffline(resultObj: ExamResult) {
        try {
            const pending = JSON.parse(localStorage.getItem(PENDING_RESULTS_KEY) || '[]');
            pending.push({ ...resultObj, timestamp: new Date().toISOString(), offline: true });
            localStorage.setItem(PENDING_RESULTS_KEY, JSON.stringify(pending));
        } catch(e) {
            console.error('Local storage failed', e);
        }
    },
    
    async syncOfflineResults() {
        if (isSyncing) return;
        isSyncing = true;
        
        try {
            const pendingData = localStorage.getItem(PENDING_RESULTS_KEY);
            if (!pendingData) {
                isSyncing = false;
                return;
            }
            
            const pending: ExamResult[] = JSON.parse(pendingData);
            if (pending.length === 0) {
                isSyncing = false;
                return;
            }
            
            // Preventive cleaning: clear the storage first to avoid partial sync duplicates
            localStorage.removeItem(PENDING_RESULTS_KEY);
            
            const remaining: ExamResult[] = [];
            
            for (const res of pending) {
                try {
                    // Try to send to Firestore
                    await addDoc(collection(db, 'results'), { 
                        ...res, 
                        serverTimestamp: serverTimestamp(),
                        syncedAt: new Date().toISOString()
                    });
                } catch (err) {
                    console.error('Failed to sync one result, returning to queue', err);
                    remaining.push(res);
                }
            }
            
            // If some failed, put them back
            if (remaining.length > 0) {
                const currentPending = JSON.parse(localStorage.getItem(PENDING_RESULTS_KEY) || '[]');
                localStorage.setItem(PENDING_RESULTS_KEY, JSON.stringify([...remaining, ...currentPending]));
            }
        } catch (e) {
            console.error('Error in syncOfflineResults:', e);
        } finally {
            isSyncing = false;
        }
    }
};
