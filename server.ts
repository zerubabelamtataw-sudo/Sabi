import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/routes/apiRoutes.js';
import { bingoEngine } from './server/engines/bingoEngine.js';
import { numbersEngine } from './server/engines/numbersEngine.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser middlewares
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Mount API router FIRST
  app.use('/api', apiRouter);

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      time: new Date().toISOString(),
      engines: {
        bingo: bingoEngine.name,
        numbers: numbersEngine.name,
      },
    });
  });

  // Start the decoupled Game Engines
  bingoEngine.start();
  numbersEngine.start();
  console.log('🎮 Bingo and Numbers Game Engines started successfully.');

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Telegram Gaming Platform server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
