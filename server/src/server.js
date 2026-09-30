const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { router: authRouter, assertConfig } = require('./auth');
const articlesRouter = require('./articles');

const PORT = Number(process.env.PORT) || 4000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost';

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(cors({
    origin: CLIENT_URL,
    credentials: true,
  }));
  app.use(express.json({ limit: '32kb' }));
  app.use(cookieParser());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/articles', articlesRouter);

  app.use((err, req, res, next) => {
    console.error(err.message);
    if (res.headersSent) return next(err);
    return res.status(500).json({ error: 'Erreur interne.' });
  });

  return app;
}

function main() {
  assertConfig();
  const app = createApp();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SecureBlog v2 écoute sur http://localhost:${PORT}`);
  });
}

main();
