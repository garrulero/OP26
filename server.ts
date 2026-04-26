import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
    const app = express();
    const PORT = 3000;
    const EXAMS_DIR = path.join(process.cwd(), 'recursos', 'examenes');

    // API routes FIRST
    app.get('/api/examenes', async (req, res) => {
        try {
            const examFiles = [];
            try {
                await fs.access(EXAMS_DIR);
            } catch {
                return res.json([]);
            }

            const files = await fs.readdir(EXAMS_DIR);
            for (const filename of files) {
                if (filename.endsWith('.json')) {
                    const filepath = path.join(EXAMS_DIR, filename);
                    try {
                        const dataStr = await fs.readFile(filepath, 'utf-8');
                        const data = JSON.parse(dataStr);
                        examFiles.push({
                            filename,
                            path: `/recursos/examenes/${filename}`,
                            id_examen: data.id_examen || filename,
                            numero_parte: data.numero_parte || ''
                        });
                    } catch (err) {
                        console.error(`Error reading ${filename}:`, err);
                    }
                }
            }
            
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.json(examFiles);
        } catch (err) {
            console.error('Error in /api/examenes:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    // Serve the 'recursos' directory statically
    app.use('/recursos', express.static(path.join(process.cwd(), 'recursos')));

    // Vite middleware for development
    if (process.env.NODE_ENV !== 'production') {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'spa'
        });
        app.use(vite.middlewares);
    } else {
        const distPath = path.join(process.cwd(), 'dist');
        app.use(express.static(distPath));
        app.get('*', (req, res) => {
            res.sendFile(path.join(distPath, 'index.html'));
        });
    }

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

startServer();
