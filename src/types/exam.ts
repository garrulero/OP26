export interface Question {
    id_pregunta?: string;
    enunciado: string;
    opciones: {
        [key: string]: string;
    };
    respuesta_correcta: string;
    explicacion?: string;
}

export interface ExamConfig {
    randomize?: boolean;
    showCorrections?: boolean;
    timeLimit?: number;
}

export interface Exam {
    id: string;
    titulo: string;
    descripcion?: string;
    preguntas: Question[];
    config?: ExamConfig;
}

export interface ExamResult {
    userId: string;
    examId: string;
    examTitle: string;
    scorePercent: number;
    correctCount: number;
    incorrectCount: number;
    blankCount: number;
    timeElapsed: number;
    timestamp?: any;
    offlineFallback?: boolean;
}
