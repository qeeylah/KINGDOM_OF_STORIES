import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import {
  analyzeMalayScript,
  GeminiConfigError,
  generateMalayNarrationAudio,
  isGeminiConfigured,
  transcribeAndAnalyzeSpeech,
} from './server/ai.ts';
import {
  getGoogleSheetsSyncStatus,
  syncToGoogleSheets,
} from './server/googleSheetsSync.ts';
import { db, verifyPassword } from './server/store.ts';
import {
  PUBLIC_VOICE_GUIDES,
  type PublicVoiceGuideId,
  type VoiceRole,
  type VoiceStyleHint,
} from './src/audio/voiceProfiles.ts';
import type { AuthUser, UserRole } from './src/types/game.ts';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const SESSION_SECRET =
  process.env.SESSION_SECRET || 'kingdom-of-stories-dev-session-key-change-me';

interface SessionPayload {
  userId: string;
  role: UserRole;
  exp: number;
}

interface AuthedRequest extends Request {
  authUser?: AuthUser;
}

function signToken(payload: SessionPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken(token: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as SessionPayload;
    if (!parsed.userId || !parsed.exp || Date.now() > parsed.exp) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) {
      const k = part.slice(0, idx).trim();
      const v = decodeURIComponent(part.slice(idx + 1).trim());
      out[k] = v;
    }
  }
  return out;
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookies = parseCookies(req.headers.cookie);
  if (cookies.kos_session) {
    return cookies.kos_session;
  }
  return null;
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: 'Sila log masuk terlebih dahulu untuk mengakses kawasan ini.' });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Sesi anda telah tamat tempoh. Sila log masuk semula.' });
    return;
  }
  const storedUser = db.findUserById(payload.userId);
  if (!storedUser) {
    res.status(401).json({ error: 'Akaun pengguna tidak lagi wujud.' });
    return;
  }
  if (storedUser.isActive === false) {
    res.status(401).json({ error: 'Akaun anda telah dinyahaktifkan. Sila hubungi guru atau pentadbir.' });
    return;
  }
  req.authUser = db.sanitizeUser(storedUser);
  next();
}

function requireRole(roles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.authUser) {
      res.status(401).json({ error: 'Pengesahan diperlukan.' });
      return;
    }
    if (!roles.includes(req.authUser.role)) {
      res.status(403).json({
        error: 'Akses ditolak. Peranan akaun anda tidak mempunyai kebenaran untuk fungsi ini.',
      });
      return;
    }
    next();
  };
}

function setSessionCookie(res: Response, token: string): void {
  res.setHeader(
    'Set-Cookie',
    `kos_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`,
  );
}

function clearSessionCookie(res: Response): void {
  res.setHeader('Set-Cookie', 'kos_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '40mb' }));

  // System status & public config
  app.get('/api/system/status', (_req, res) => {
    res.json({
      geminiConfigured: isGeminiConfigured(),
      config: db.getAdminConfig(),
    });
  });

  // Public safe list of active student accounts for "Pemilihan Akaun Murid"
  app.get('/api/auth/students', (_req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    res.json({ students: db.listPublicStudentAccounts() });
  });

  // Authentication routes
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body as { username?: string; password?: string };
    if (!username || !password) {
      res.status(400).json({ error: 'Nama pengguna dan kata laluan diperlukan.' });
      return;
    }
    const user = db.findUserByUsername(username);
    if (!user || !verifyPassword(password, user.passwordHash, user.passwordSalt)) {
      res.status(401).json({ error: 'Nama pengguna atau kata laluan tidak sah.' });
      return;
    }
    if (user.isActive === false) {
      res.status(403).json({
        error: 'Akaun ini telah dinyahaktifkan dan tidak dibenarkan log masuk. Sila hubungi guru atau pentadbir.',
      });
      return;
    }
    db.recordLogin(user.id, 'login');
    const token = signToken({
      userId: user.id,
      role: user.role,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });
    setSessionCookie(res, token);
    const sanitized = db.sanitizeUser(user);
    const progress = sanitized.role === 'student' ? db.getOrCreateProgress(user.id) : null;
    res.json({ user: sanitized, token, progress });
  });

  app.post('/api/auth/register', (req, res) => {
    const { username, fullName, password, className } = req.body as {
      username?: string;
      fullName?: string;
      password?: string;
      className?: string;
    };
    if (!username || !fullName || !password || password.length < 6) {
      res.status(400).json({
        error: 'Sila lengkapkan nama penuh, nama pengguna, dan kata laluan sekurang-kurangnya 6 aksara.',
      });
      return;
    }
    try {
      const created = db.createUser({
        username,
        fullName,
        password,
        role: 'student', // Public registration always creates student role only
        className: className || '5 Bestari',
      });
      db.recordLogin(created.id, 'register');
      const stored = db.findUserById(created.id);
      const authedUser = stored ? db.sanitizeUser(stored) : created;
      const token = signToken({
        userId: created.id,
        role: created.role,
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });
      setSessionCookie(res, token);
      const progress = db.getOrCreateProgress(created.id);
      res.status(201).json({ user: authedUser, token, progress });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Pendaftaran gagal.',
      });
    }
  });

  app.post('/api/auth/logout', (_req, res) => {
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res) => {
    const user = req.authUser!;
    const progress = user.role === 'student' ? db.getOrCreateProgress(user.id) : null;
    res.json({ user, progress });
  });

  // Student Progress routes
  app.get('/api/progress', requireAuth, (req: AuthedRequest, res) => {
    const progress = db.getOrCreateProgress(req.authUser!.id);
    res.json({ progress });
  });

  app.put('/api/progress', requireAuth, (req: AuthedRequest, res) => {
    if (req.authUser!.role !== 'student') {
      res.status(403).json({
        error: 'Akaun penilai menggunakan keadaan sementara dan tidak menulis ke rekod murid.',
      });
      return;
    }
    const patch = req.body as Record<string, unknown>;
    const updated = db.updateProgress(req.authUser!.id, patch);
    res.json({ progress: updated });
  });

  // Private Media Vault (audio voice attempts & final storytelling video)
  app.post('/api/media/upload', requireAuth, (req: AuthedRequest, res) => {
    const { kind, mimeType, filename, base64Data, missionNumber, attemptNumber } = req.body as {
      kind?: 'audio' | 'video';
      mimeType?: string;
      filename?: string;
      base64Data?: string;
      missionNumber?: number;
      attemptNumber?: number;
    };
    if (!kind || !base64Data) {
      res.status(400).json({ error: 'Data media tidak lengkap.' });
      return;
    }
    const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const buffer = Buffer.from(cleanBase64, 'base64');
    if (buffer.length === 0) {
      res.status(400).json({ error: 'Fail rakaman kosong. Sila rakam semula sebelum menyimpan.' });
      return;
    }
    if (buffer.length > 35 * 1024 * 1024) {
      res.status(413).json({ error: 'Saiz fail melebihi had 35MB.' });
      return;
    }
    const saved = db.saveMediaFile({
      ownerUserId: req.authUser!.id,
      kind,
      mimeType: mimeType || (kind === 'audio' ? 'audio/webm' : 'video/mp4'),
      filename: filename || (kind === 'audio' ? 'rakaman.webm' : 'video-cerita.mp4'),
      buffer,
      missionNumber: typeof missionNumber === 'number' ? missionNumber : undefined,
      attemptNumber: typeof attemptNumber === 'number' ? attemptNumber : undefined,
    });
    res.status(201).json({
      mediaId: saved.id,
      mimeType: saved.mimeType,
      sizeBytes: saved.sizeBytes,
      createdAt: saved.createdAt,
    });
  });

  app.get('/api/media/:id', requireAuth, (req: AuthedRequest, res) => {
    const mediaId = String(req.params.id);
    const media = db.getMediaById(mediaId);
    if (!media || !fs.existsSync(media.filePath)) {
      res.status(404).json({ error: 'Fail media tidak ditemui.' });
      return;
    }
    const user = req.authUser!;
    const isOwner = media.ownerUserId === user.id;
    const isAuthorizedEducator = user.role === 'teacher' || user.role === 'admin';
    if (!isOwner && !isAuthorizedEducator) {
      res.status(403).json({
        error: 'Fail rakaman murid dilindungi dan tidak boleh diakses secara umum.',
      });
      return;
    }

    const stat = fs.statSync(media.filePath);
    const totalSize = stat.size;
    const isDownload = req.query.download === '1' || req.query.download === 'true';
    const safeDownloadName = (media.filename || `${media.id}.webm`).replace(/["\r\n]/g, '_');

    res.setHeader('Content-Type', media.mimeType);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Accept-Ranges', 'bytes');
    if (isDownload) {
      res.setHeader('Content-Disposition', `attachment; filename="${safeDownloadName}"`);
    }

    const range = req.headers.range;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (match) {
        const start = match[1] ? Number(match[1]) : 0;
        const end = match[2] ? Math.min(Number(match[2]), totalSize - 1) : totalSize - 1;
        if (start >= totalSize || start > end || start < 0) {
          res.status(416).setHeader('Content-Range', `bytes */${totalSize}`).end();
          return;
        }
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
        res.setHeader('Content-Length', String(end - start + 1));
        fs.createReadStream(media.filePath, { start, end }).pipe(res);
        return;
      }
    }

    res.setHeader('Content-Length', String(totalSize));
    fs.createReadStream(media.filePath).pipe(res);
  });

  app.delete('/api/media/:id', requireAuth, (req: AuthedRequest, res) => {
    const mediaId = String(req.params.id);
    const media = db.getMediaById(mediaId);
    if (!media) {
      res.status(404).json({ error: 'Fail media tidak ditemui.' });
      return;
    }
    const user = req.authUser!;
    if (media.ownerUserId !== user.id && user.role !== 'admin') {
      res.status(403).json({
        error: 'Akses ditolak. Anda hanya boleh memadam rakaman milik anda sendiri.',
      });
      return;
    }
    const result = db.deleteMediaFile(mediaId);
    res.json({ ok: result.deleted, progress: result.progress });
  });

  // Royal AI Mentor routes
  app.post('/api/mentor/language', requireAuth, async (req: AuthedRequest, res) => {
    const { scriptText, theme, characters, setting } = req.body as {
      scriptText?: string;
      theme?: string;
      characters?: string;
      setting?: string;
    };
    if (!scriptText || scriptText.trim().length < 20) {
      res.status(400).json({
        error: 'Sila tulis sekurang-kurangnya 20 aksara skrip sebelum memohon semakan Mentor Bahasa AI.',
      });
      return;
    }
    try {
      const feedback = await analyzeMalayScript({
        scriptText,
        theme: theme || 'Pemuliharaan Taman Sekolah',
        characters: characters || 'Adam, Aina dan Cikgu Nora',
        setting: setting || 'Taman Sekolah',
      });
      if (req.authUser!.role === 'student') {
        db.updateProgress(req.authUser!.id, { languageFeedback: feedback });
      }
      res.json({ feedback });
    } catch (err) {
      const status = err instanceof GeminiConfigError ? 503 : 502;
      res.status(status).json({
        error: err instanceof Error ? err.message : 'Gagal menghubungi Mentor Bahasa AI.',
      });
    }
  });

  app.post('/api/mentor/speech', requireAuth, async (req: AuthedRequest, res) => {
    const { audioBase64, mimeType, durationSeconds, referenceScript, attemptNumber, mediaId } =
      req.body as {
        audioBase64?: string;
        mimeType?: string;
        durationSeconds?: number;
        referenceScript?: string;
        attemptNumber?: 1 | 2;
        mediaId?: string;
      };
    if (!audioBase64) {
      res.status(400).json({ error: 'Audio rakaman diperlukan untuk analisis pertuturan.' });
      return;
    }
    try {
      const cleanBase64 = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;
      const analysis = await transcribeAndAnalyzeSpeech({
        audioBase64: cleanBase64,
        mimeType: mimeType || 'audio/webm',
        durationSeconds: Number(durationSeconds || 5),
        referenceScript: referenceScript || '',
        attemptNumber: attemptNumber === 2 ? 2 : 1,
      });

      if (req.authUser!.role === 'student' && mediaId) {
        const current = db.getOrCreateProgress(req.authUser!.id);
        const filtered = current.voiceAttempts.filter(
          (a) => a.attemptNumber !== (attemptNumber === 2 ? 2 : 1),
        );
        const nextAttempts = [
          ...filtered,
          {
            attemptNumber: (attemptNumber === 2 ? 2 : 1) as 1 | 2,
            mediaId,
            durationSeconds: Number(durationSeconds || 5),
            recordedAt: new Date().toISOString(),
            submissionStatus: 'Berjaya Dihantar' as const,
            transcript: analysis.transcript,
            analysis,
          },
        ].sort((a, b) => a.attemptNumber - b.attemptNumber);

        db.updateProgress(req.authUser!.id, {
          voiceAttempts: nextAttempts,
        });
      }

      res.json({ analysis });
    } catch (err) {
      const status = err instanceof GeminiConfigError ? 503 : 502;
      res.status(status).json({
        error: err instanceof Error ? err.message : 'Gagal menganalisis rakaman suara.',
      });
    }
  });

  app.post('/api/tts', requireAuth, async (req, res) => {
    const { text, voiceRole, styleHint } = req.body as {
      text?: string;
      voiceRole?: VoiceRole;
      styleHint?: VoiceStyleHint;
    };
    if (!text || !text.trim()) {
      res.status(400).json({ error: 'Teks penceritaan diperlukan.' });
      return;
    }
    try {
      const base64Wav = await generateMalayNarrationAudio(text, { voiceRole, styleHint });
      res.json({ audioBase64: base64Wav, mimeType: 'audio/wav' });
    } catch (err) {
      const status = err instanceof GeminiConfigError ? 503 : 502;
      res.status(status).json({
        error: err instanceof Error ? err.message : 'Penjanaan suara AI tidak tersedia.',
      });
    }
  });

  app.post('/api/tts/guide', async (req, res) => {
    const { guideId } = req.body as { guideId?: PublicVoiceGuideId };
    const text = guideId ? PUBLIC_VOICE_GUIDES[guideId] : undefined;
    if (!text) {
      res.status(400).json({ error: 'Kod panduan suara tidak sah.' });
      return;
    }
    try {
      const base64Wav = await generateMalayNarrationAudio(text, {
        voiceRole: 'guide',
        styleHint: 'tutorial',
      });
      res.json({ audioBase64: base64Wav, mimeType: 'audio/wav' });
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Penjanaan suara panduan tidak tersedia.',
      });
    }
  });

  // Collaborative Learning Room routes
  app.post('/api/collab/join', requireAuth, (req: AuthedRequest, res) => {
    const { roomCode } = req.body as { roomCode?: string };
    const code = (roomCode || 'TAMAN-01').trim().toUpperCase();
    const room = db.getOrCreateCollabRoom(code, req.authUser!.fullName);
    if (req.authUser!.role === 'student') {
      db.updateProgress(req.authUser!.id, {
        learningMode: 'collaborative',
        collabRoomCode: room.code,
      });
    }
    res.json({ room });
  });

  app.get('/api/collab/:code', requireAuth, (req: AuthedRequest, res) => {
    const room = db.getOrCreateCollabRoom(String(req.params.code), req.authUser!.fullName);
    res.json({ room });
  });

  app.post('/api/collab/:code/message', requireAuth, (req: AuthedRequest, res) => {
    const { text, heroId } = req.body as { text?: string; heroId?: string };
    if (!text || !text.trim()) {
      res.status(400).json({ error: 'Mesej tidak boleh kosong.' });
      return;
    }
    const room = db.updateCollabRoom(String(req.params.code), (r) => ({
      ...r,
      messages: [
        ...r.messages.slice(-49),
        {
          id: `msg_${crypto.randomBytes(4).toString('hex')}`,
          authorName: req.authUser!.fullName,
          heroId: (heroId as 'ayden' | 'elena' | 'ryan' | 'eva') || 'ayden',
          text: text.trim(),
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    res.json({ room });
  });

  app.post('/api/collab/:code/clue', requireAuth, (req: AuthedRequest, res) => {
    const { clue } = req.body as { clue?: string };
    if (!clue || !clue.trim()) {
      res.status(400).json({ error: 'Petunjuk tidak boleh kosong.' });
      return;
    }
    const room = db.updateCollabRoom(String(req.params.code), (r) => ({
      ...r,
      sharedClues: r.sharedClues.includes(clue.trim())
        ? r.sharedClues
        : [...r.sharedClues, clue.trim()],
    }));
    res.json({ room });
  });

  app.put('/api/collab/:code/script', requireAuth, (req: AuthedRequest, res) => {
    const { sharedScriptDraft } = req.body as { sharedScriptDraft?: string };
    const room = db.updateCollabRoom(String(req.params.code), (r) => ({
      ...r,
      sharedScriptDraft: sharedScriptDraft ?? r.sharedScriptDraft,
    }));
    res.json({ room });
  });

  // Teacher Portal routes (RBAC enforced)
  app.get(
    '/api/teacher/students',
    requireAuth,
    requireRole(['teacher', 'admin']),
    (_req, res) => {
      res.setHeader('Cache-Control', 'private, no-store');
      const students = db.listStudentProgressForTeacher();
      res.json({ students });
    },
  );

  app.get(
    '/api/teacher/voice-records',
    requireAuth,
    requireRole(['teacher', 'admin']),
    (_req, res) => {
      res.setHeader('Cache-Control', 'private, no-store');
      const records = db.listVoiceSubmissionsForTeacher();
      res.json({ records });
    },
  );

  app.post(
    '/api/teacher/feedback',
    requireAuth,
    requireRole(['teacher', 'admin']),
    (req: AuthedRequest, res) => {
      const { studentUserId, comment, ratingLabel } = req.body as {
        studentUserId?: string;
        comment?: string;
        ratingLabel?: 'Sedang Dibimbing' | 'Memuaskan' | 'Baik' | 'Cemerlang';
      };
      if (!studentUserId || !comment || !comment.trim()) {
        res.status(400).json({ error: 'ID murid dan ulasan guru diperlukan.' });
        return;
      }
      try {
        const progress = db.setTeacherFeedback(studentUserId, {
          comment: comment.trim(),
          ratingLabel: ratingLabel || 'Baik',
          reviewedBy: req.authUser!.fullName,
          reviewedAt: new Date().toISOString(),
        });
        res.json({ progress });
      } catch (err) {
        res.status(404).json({
          error: err instanceof Error ? err.message : 'Rekod murid tidak ditemui.',
        });
      }
    },
  );

  // Google Sheets server-to-server synchronization routes (RBAC: Teacher & Admin only)
  app.get(
    '/api/teacher/sheets-sync/status',
    requireAuth,
    requireRole(['teacher', 'admin']),
    (_req, res) => {
      res.setHeader('Cache-Control', 'private, no-store');
      res.json({ syncStatus: getGoogleSheetsSyncStatus() });
    },
  );

  app.post(
    '/api/teacher/sheets-sync',
    requireAuth,
    requireRole(['teacher', 'admin']),
    async (req: AuthedRequest, res) => {
      const { mode } = (req.body || {}) as { mode?: 'full' | 'incremental' };
      const result = await syncToGoogleSheets({
        triggeredBy: req.authUser!.fullName,
        mode: mode === 'incremental' ? 'incremental' : 'full',
      });
      res.status(result.statusCode).json({
        ok: result.ok,
        syncStatus: result.syncStatus,
      });
    },
  );

  // Admin Portal routes (RBAC enforced)
  app.get('/api/admin/users', requireAuth, requireRole(['admin']), (_req, res) => {
    res.json({ users: db.listUsers(), config: db.getAdminConfig() });
  });

  app.post('/api/admin/users', requireAuth, requireRole(['admin']), (req, res) => {
    const { username, fullName, password, role, className } = req.body as {
      username?: string;
      fullName?: string;
      password?: string;
      role?: UserRole;
      className?: string;
    };
    if (!username || !fullName || !password || !role) {
      res.status(400).json({ error: 'Maklumat akaun tidak lengkap.' });
      return;
    }
    try {
      const created = db.createUser({ username, fullName, password, role, className });
      res.status(201).json({ user: created });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Gagal mencipta akaun.' });
    }
  });

  app.put('/api/admin/users/:id/role', requireAuth, requireRole(['admin']), (req, res) => {
    const { role, className } = req.body as { role?: UserRole; className?: string };
    if (!role) {
      res.status(400).json({ error: 'Peranan baharu diperlukan.' });
      return;
    }
    try {
      const updated = db.updateUserRole(String(req.params.id), role, className);
      res.json({ user: updated });
    } catch (err) {
      res.status(404).json({ error: err instanceof Error ? err.message : 'Pengguna tidak ditemui.' });
    }
  });

  app.put('/api/admin/users/:id/status', requireAuth, requireRole(['admin']), (req: AuthedRequest, res) => {
    const targetId = String(req.params.id);
    const { isActive } = (req.body || {}) as { isActive?: unknown };
    if (typeof isActive !== 'boolean') {
      res.status(400).json({ error: 'Nilai status aktif (boolean) diperlukan.' });
      return;
    }
    if (targetId === req.authUser!.id && !isActive) {
      res.status(400).json({ error: 'Anda tidak boleh menyahaktifkan akaun pentadbir sendiri.' });
      return;
    }
    try {
      const updated = db.setUserActiveStatus(targetId, isActive);
      res.json({ user: updated });
    } catch (err) {
      res.status(404).json({ error: err instanceof Error ? err.message : 'Pengguna tidak ditemui.' });
    }
  });

  app.put('/api/admin/config', requireAuth, requireRole(['admin']), (req, res) => {
    const config = db.updateAdminConfig(req.body);
    res.json({ config });
  });

  // Frontend serving (Vite dev middleware or static dist)
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kingdom of Stories server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup failed:', err);
  process.exit(1);
});
