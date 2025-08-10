import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import boardRoutes from './routes/boardRoutes';

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/boards', boardRoutes);

// Global error handler (fallback)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[unhandled]', err);
  res.status(500).json({ message: 'Internal server error' });
});

export default app;
