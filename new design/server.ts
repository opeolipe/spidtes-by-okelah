import express, { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3001;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface Session {
  createdAt: number;
  grade: string;
  isp: string;
}

// In-memory session store — swap for Redis on multi-instance deployments
const sessions = new Map<string, Session>();

function pruneExpired(): void {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL_MS) sessions.delete(token);
  }
}

// ---------------------------------------------------------------------------
// CORS — must run before all routes so OPTIONS preflight gets proper headers
// ---------------------------------------------------------------------------
const allowedOrigins = new Set(
  process.env.NODE_ENV === 'production'
    ? [APP_URL]
    : [APP_URL, 'http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000']
);

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin ?? '';
  if (allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  // Respond to preflight immediately — no 403, no body
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

app.use(express.json());

// ---------------------------------------------------------------------------
// POST /api/create-session
// Called by the frontend after a test completes. Returns a short-lived token.
// Body: { grade: string; isp: string }
// ---------------------------------------------------------------------------
app.post('/api/create-session', (req: Request, res: Response) => {
  pruneExpired();
  const { grade, isp } = req.body ?? {};
  if (!grade || typeof grade !== 'string') {
    res.status(400).json({ error: 'Missing required field: grade' });
    return;
  }
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { createdAt: Date.now(), grade, isp: String(isp ?? '') });
  res.status(201).json({ token });
});

// ---------------------------------------------------------------------------
// GET /api/check-session
// Validates a download session token.
// Header: Authorization: Bearer <token>
// Returns 200 { valid: true } or 403 { error: string }
// ---------------------------------------------------------------------------
app.get('/api/check-session', (req: Request, res: Response) => {
  pruneExpired();
  const auth = req.headers.authorization ?? '';
  if (!auth.startsWith('Bearer ')) {
    res.status(403).json({ error: 'Missing or malformed Authorization header. Expected: Bearer <token>' });
    return;
  }
  const token = auth.slice(7).trim();
  if (!token) {
    res.status(403).json({ error: 'Empty token' });
    return;
  }
  const session = sessions.get(token);
  if (!session || Date.now() - session.createdAt > SESSION_TTL_MS) {
    sessions.delete(token);
    res.status(403).json({ error: 'Session invalid or expired. Please run a new speed test.' });
    return;
  }
  res.json({ valid: true, grade: session.grade, isp: session.isp });
});

// ---------------------------------------------------------------------------
// Serve Vite build output in production
// ---------------------------------------------------------------------------
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req: Request, res: Response) => res.sendFile(path.join(distPath, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`);
  console.log(`[server] CORS allowed origins: ${[...allowedOrigins].join(', ')}`);
});
