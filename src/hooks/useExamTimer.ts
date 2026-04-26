import { useState, useEffect, useRef } from 'react';

export function useExamTimer(timeLimitSeconds: number, onForceSubmit: () => void) {
    const [timeElapsed, setTimeElapsed] = useState(0);
    const startTimeRef = useRef<number>(Date.now());
    const onForceSubmitRef = useRef(onForceSubmit);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    
    useEffect(() => {
        onForceSubmitRef.current = onForceSubmit;
    }, [onForceSubmit]);

    useEffect(() => {
        startTimeRef.current = Date.now();
        
        const tick = () => {
            const now = Date.now();
            const elapsed = Math.floor((now - startTimeRef.current) / 1000);
            
            setTimeElapsed(elapsed);
            
            if (timeLimitSeconds > 0 && elapsed >= timeLimitSeconds) {
                onForceSubmitRef.current();
                if (timerRef.current) clearInterval(timerRef.current);
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // Re-sync timer when coming back to the tab
                tick();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        timerRef.current = setInterval(tick, 1000);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [timeLimitSeconds]);

    return { timeElapsed };
}
