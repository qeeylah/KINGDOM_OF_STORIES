import crypto from 'node:crypto';
import {
  buildStudentSummary,
  isScriptCustomizedByStudent,
} from '../src/components/teacherDashboardUtils.ts';
import type {
  AuthUser,
  GoogleSheetsSyncLog,
  GoogleSheetsSyncStatusResponse,
  LoginLogEntry,
  PlayerProgress,
  SyncStatusType,
} from '../src/types/game.ts';
import { db, type PersistedGoogleSheetsSyncState } from './store.ts';

interface AppsScriptSheetCounts {
  processed?: number;
  inserted?: number;
  updated?: number;
  failed?: number;
}

interface AppsScriptSyncResponse {
  ok?: boolean;
  mode?: string;
  syncedAt?: string;
  error?: string;
  summary?: {
    totalProcessed?: number;
    inserted?: number;
    updated?: number;
    failed?: number;
    sheetCounts?: Record<string, AppsScriptSheetCounts>;
  };
  failedRecords?: Array<Record<string, unknown>>;
}

interface PreparedSyncRows {
  hashes: Record<string, string>;
  dataMurid: Array<Record<string, unknown>>;
  kemajuanMurid: Array<Record<string, unknown>>;
  markahMisi: Array<Record<string, unknown>>;
  laporanKeseluruhan: Array<Record<string, unknown>>;
  rekodLogMasuk: Array<Record<string, unknown>>;
  rakamanMisi4: Array<Record<string, unknown>>;
}

function getSyncConfig(): {
  webAppUrl: string;
  secretToken: string;
  timeoutMs: number;
  maxRetries: number;
  configured: boolean;
} {
  const webAppUrl = (process.env.GOOGLE_APPS_SCRIPT_WEBAPP_URL || '').trim();
  const secretToken = (process.env.GOOGLE_APPS_SCRIPT_SECRET_TOKEN || '').trim();
  const timeoutMs = Math.max(3000, Number(process.env.GOOGLE_SHEETS_SYNC_TIMEOUT_MS || 15000));
  const maxRetries = Math.min(4, Math.max(0, Number(process.env.GOOGLE_SHEETS_SYNC_MAX_RETRIES || 2)));
  return {
    webAppUrl,
    secretToken,
    timeoutMs,
    maxRetries,
    configured: Boolean(webAppUrl && secretToken),
  };
}

function sha256(obj: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');
}

function getEngagementCategory(
  user: AuthUser,
  progress: PlayerProgress,
  summary: ReturnType<typeof buildStudentSummary>,
): string {
  if (summary.completedAllFive) return 'Tamat Kesemua 5 Misi';
  if (summary.hasStartedLearning) return 'Sedang Melaksanakan Misi';
  if (progress.lastPlayedAt || (user.loginCount ?? 0) > 0 || user.lastLoginAt) {
    return 'Mula Bermain';
  }
  return 'Belum Bermula';
}

function buildPreparedRows(): PreparedSyncRows {
  const students = db.listStudentProgressForTeacher();
  const loginLogs = db.listLoginLogs(500);
  const hashes: Record<string, string> = {};

  const dataMurid: Array<Record<string, unknown>> = [];
  const kemajuanMurid: Array<Record<string, unknown>> = [];
  const markahMisi: Array<Record<string, unknown>> = [];
  const laporanKeseluruhan: Array<Record<string, unknown>> = [];
  const rakamanMisi4: Array<Record<string, unknown>> = [];

  for (const { user, progress } of students) {
    const summary = buildStudentSummary(user, progress);
    const engagementCategory = getEngagementCategory(user, progress, summary);
    const [m1, m2, m3, m4, m5] = summary.missions;

    const studentCoreRow = {
      ID_Murid: user.id,
      Nama_Pengguna: user.username,
      Nama_Penuh: summary.fullName,
      Kelas: summary.className,
      Peranan: user.role,
      Wira_Pilihan: summary.heroLabel,
      Mod_Pembelajaran: summary.learningModeLabel,
      Tahap_Adaptif: progress.adaptiveLevel,
      Tarikh_Daftar: user.createdAt || '',
      Log_Masuk_Terakhir: user.lastLoginAt || '',
      Bilangan_Log_Masuk: user.loginCount ?? 0,
    };

    const progressRow = {
      ID_Murid: user.id,
      Nama_Penuh: summary.fullName,
      Kelas: summary.className,
      Status_Pembelajaran_Keseluruhan: engagementCategory,
      Lokasi_Semasa: progress.currentLocation,
      Misi_1_Status: m1.status,
      Misi_2_Status: m2.status,
      Misi_3_Status: m3.status,
      Misi_4_Status: m4.status,
      Misi_5_Status: m5.status,
      Bilangan_Misi_Selesai: summary.completedCount,
      Peratus_Kemajuan: `${summary.completionPercent}%`,
      Festival_Cahaya_Dibuka: Boolean(progress.festivalUnlocked),
      Main_Terakhir: progress.lastPlayedAt || '',
      Kemas_Kini_Terakhir: progress.updatedAt || '',
    };

    const scoresRow = {
      ID_Murid: user.id,
      Nama_Penuh: summary.fullName,
      Kelas: summary.className,
      Misi_1_Markah: m1.hasRecord ? progress.libraryScore : 'Belum Ada Rekod',
      Misi_1_Markah_Penuh: 6,
      Misi_1_Percubaan: progress.libraryAttempts,
      Misi_2_Serpihan_Ditemui: `${(progress.collectedFragmentIds || []).length}/5`,
      Misi_2_Cubaan_Susunan: progress.woodsAttempts,
      Misi_3_Skrip_Disunting: isScriptCustomizedByStudent(progress.scriptPlan),
      Misi_3_Status_AI_Mentor: progress.languageFeedback
        ? 'Semakan AI Tersedia'
        : 'Belum Ada Maklum Balas AI',
      Misi_3_Bilangan_Isu_AI: progress.languageFeedback
        ? progress.languageFeedback.issues.length
        : 0,
      Misi_4_Bilangan_Rakaman: (progress.voiceAttempts || []).length,
      Misi_5_Jenis_Penyerahan: m5.primaryMetric,
      Lencana_Dibuka: summary.unlockedBadgeCount,
      Jumlah_Lencana: summary.totalBadgeCount,
      Tahap_Penguasaan_Guru: progress.teacherFeedback?.ratingLabel || 'Belum Dinilai',
      Ulasan_Guru: progress.teacherFeedback?.comment || '',
      Disemak_Oleh: progress.teacherFeedback?.reviewedBy || '',
      Tarikh_Semakan_Guru: progress.teacherFeedback?.reviewedAt || '',
    };

    const reportRow = {
      ID_Murid: user.id,
      Nama_Pengguna: user.username,
      Nama_Penuh: summary.fullName,
      Kelas: summary.className,
      Kategori_Penglibatan: engagementCategory,
      Misi_Selesai: `${summary.completedCount}/5`,
      Peratus_Pencapaian: `${summary.completionPercent}%`,
      Markah_Misi_1: m1.hasRecord ? `${progress.libraryScore}/6` : 'Belum Ada Rekod',
      Status_Misi_1: m1.status,
      Status_Misi_2: m2.status,
      Status_Misi_3: m3.status,
      Status_Misi_4: m4.status,
      Status_Misi_5: m5.status,
      Bilangan_Rakaman_Misi4: (progress.voiceAttempts || []).length,
      Lencana_Dibuka: `${summary.unlockedBadgeCount}/${summary.totalBadgeCount}`,
      Penilaian_Guru: summary.teacherRatingLabel,
      Log_Masuk_Terakhir: user.lastLoginAt || 'Belum Log Masuk',
    };

    hashes[`student:${user.id}`] = sha256({
      studentCoreRow,
      progressRow,
      scoresRow,
      reportRow,
    });

    dataMurid.push(studentCoreRow);
    kemajuanMurid.push(progressRow);
    markahMisi.push(scoresRow);
    laporanKeseluruhan.push(reportRow);

    // Misi 4 audio metadata & server file reference ONLY (never Base64 audio)
    for (const attempt of progress.voiceAttempts || []) {
      const media = db.getMediaById(attempt.mediaId);
      const recordKey = `${user.id}__${attempt.mediaId}`;
      const voiceRow = {
        ID_Rujukan_Rekod: recordKey,
        ID_Murid: user.id,
        Nama_Pengguna: user.username,
        Nama_Penuh: summary.fullName,
        Kelas: summary.className,
        ID_Media: attempt.mediaId,
        Rujukan_Fail_Pelayan: `/api/media/${attempt.mediaId}`,
        Nama_Fail_Asal: media?.filename || `misi4-cubaan${attempt.attemptNumber}.webm`,
        Jenis_MIME: media?.mimeType || 'audio/webm',
        Saiz_Bait: media?.sizeBytes ?? 0,
        Cubaan_Ke: attempt.attemptNumber,
        Tempoh_Saat: attempt.durationSeconds,
        Status_Penghantaran: attempt.submissionStatus || 'Berjaya Dihantar',
        Tahap_Kejelasan: attempt.analysis?.clarityLevel || 'Belum Dianalisis',
        Anggaran_PSM: attempt.analysis?.estimatedWpm ?? '',
        Ringkasan_Transkripsi: (attempt.transcript || '').slice(0, 300),
        Tarikh_Rakaman: attempt.recordedAt || media?.createdAt || '',
      };
      hashes[`voice:${recordKey}`] = sha256(voiceRow);
      rakamanMisi4.push(voiceRow);
    }
  }

  // Login logs (filter out any sensitive secrets by building explicit safe fields)
  const rekodLogMasuk: Array<Record<string, unknown>> = [];
  for (const log of loginLogs) {
    const logRow = {
      ID_Log: log.id,
      ID_Murid: log.userId,
      Nama_Pengguna: log.username,
      Nama_Penuh: log.fullName,
      Kelas: log.className || '',
      Peranan: log.role,
      Jenis_Tindakan: log.action === 'register' ? 'Pendaftaran' : 'Log Masuk',
      Masa_Log_Masuk: log.loginAt,
    };
    hashes[`login:${log.id}`] = sha256(logRow);
    rekodLogMasuk.push(logRow);
  }

  // Also ensure existing users who logged in before loginLogs array existed have a baseline login record if lastLoginAt exists
  const usersById = new Map(db.listUsers().map((u) => [u.id, u]));
  for (const log of loginLogs) {
    usersById.delete(log.userId);
  }
  for (const u of usersById.values()) {
    if (u.role === 'student' && (u.lastLoginAt || u.createdAt)) {
      const baselineId = `baseline_${u.id}`;
      const logRow = {
        ID_Log: baselineId,
        ID_Murid: u.id,
        Nama_Pengguna: u.username,
        Nama_Penuh: u.fullName,
        Kelas: u.className || '',
        Peranan: u.role,
        Jenis_Tindakan: u.lastLoginAt ? 'Log Masuk' : 'Pendaftaran Sedia Ada',
        Masa_Log_Masuk: u.lastLoginAt || u.createdAt || '',
      };
      hashes[`login:${baselineId}`] = sha256(logRow);
      rekodLogMasuk.push(logRow);
    }
  }

  return {
    hashes,
    dataMurid,
    kemajuanMurid,
    markahMisi,
    laporanKeseluruhan,
    rekodLogMasuk,
    rakamanMisi4,
  };
}

function selectIncrementalPayload(
  prepared: PreparedSyncRows,
  prevHashes: Record<string, string>,
): {
  changedCount: number;
  sheets: Record<string, Array<Record<string, unknown>>>;
} {
  const changedStudentIds = new Set<string>();
  for (const row of prepared.dataMurid) {
    const id = String(row.ID_Murid);
    const key = `student:${id}`;
    if (prepared.hashes[key] !== prevHashes[key]) {
      changedStudentIds.add(id);
    }
  }

  const dataMurid = prepared.dataMurid.filter((r) => changedStudentIds.has(String(r.ID_Murid)));
  const kemajuanMurid = prepared.kemajuanMurid.filter((r) =>
    changedStudentIds.has(String(r.ID_Murid)),
  );
  const markahMisi = prepared.markahMisi.filter((r) => changedStudentIds.has(String(r.ID_Murid)));
  const laporanKeseluruhan = prepared.laporanKeseluruhan.filter((r) =>
    changedStudentIds.has(String(r.ID_Murid)),
  );

  const rekodLogMasuk = prepared.rekodLogMasuk.filter((r) => {
    const key = `login:${String(r.ID_Log)}`;
    return prepared.hashes[key] !== prevHashes[key];
  });

  const rakamanMisi4 = prepared.rakamanMisi4.filter((r) => {
    const key = `voice:${String(r.ID_Rujukan_Rekod)}`;
    return prepared.hashes[key] !== prevHashes[key];
  });

  const changedCount =
    changedStudentIds.size + rekodLogMasuk.length + rakamanMisi4.length;

  return {
    changedCount,
    sheets: {
      Data_Murid: dataMurid,
      Kemajuan_Murid: kemajuanMurid,
      Markah_Misi: markahMisi,
      Rekod_Log_Masuk: rekodLogMasuk,
      Rakaman_Misi4: rakamanMisi4,
      Laporan_Keseluruhan: laporanKeseluruhan,
    },
  };
}

function countPendingChanges(
  prepared: PreparedSyncRows,
  prevHashes: Record<string, string>,
): number {
  let pending = 0;
  for (const [key, hash] of Object.entries(prepared.hashes)) {
    if (prevHashes[key] !== hash) {
      pending++;
    }
  }
  return pending;
}

export function getGoogleSheetsSyncStatus(): GoogleSheetsSyncStatusResponse {
  const cfg = getSyncConfig();
  const state = db.getGoogleSheetsSyncState();
  const prepared = buildPreparedRows();
  const pendingChangesCount = countPendingChanges(prepared, state.syncedRecordHashes);

  return {
    configured: cfg.configured,
    lastSyncAt: state.lastSyncAt,
    lastStatus: !cfg.configured && state.lastStatus === 'idle' ? 'unconfigured' : state.lastStatus,
    lastMode: state.lastMode,
    lastMessage: !cfg.configured
      ? 'Konfigurasi Google Apps Script Web App URL dan Token Rahsia belum ditetapkan pada pelayan.'
      : state.lastMessage,
    lastAttemptedCount: state.lastAttemptedCount,
    lastSuccessCount: state.lastSuccessCount,
    lastFailedCount: state.lastFailedCount,
    pendingChangesCount,
    logs: [...state.logs].reverse(),
  };
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function postToAppsScriptWithRetry(
  webAppUrl: string,
  payload: Record<string, unknown>,
  timeoutMs: number,
  maxRetries: number,
): Promise<AppsScriptSyncResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(webAppUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        redirect: 'follow',
        signal: controller.signal,
      });

      const rawText = await response.text();
      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`Pelayan Apps Script memulangkan status HTTP ${response.status}.`);
      }

      let parsed: AppsScriptSyncResponse;
      try {
        parsed = JSON.parse(rawText) as AppsScriptSyncResponse;
      } catch {
        throw new Error(
          'Respons daripada Google Apps Script bukan format JSON yang sah. Pastikan Web App diterbitkan dengan akses "Anyone" dan mengembalikan JSON.',
        );
      }

      if (parsed.ok === false && parsed.error) {
        // Jangan ulang cuba jika ralat pengesahan token/konfigurasi daripada Apps Script
        const isConfigOrAuthError =
          /token|spreadsheet|format json|tidak sah/i.test(parsed.error);
        if (isConfigOrAuthError) {
          throw Object.assign(new Error(parsed.error), { nonRetryable: true });
        }
        throw new Error(parsed.error);
      }

      return parsed;
    } catch (err) {
      clearTimeout(timer);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      lastError = isAbort
        ? new Error(`Sambungan ke Google Apps Script melebihi had masa (${timeoutMs}ms).`)
        : err instanceof Error
          ? err
          : new Error('Ralat rangkaian semasa menghubungi Google Apps Script.');

      const nonRetryable = Boolean((err as { nonRetryable?: boolean })?.nonRetryable);
      if (nonRetryable || attempt >= maxRetries) {
        break;
      }
      await sleep(500 * (attempt + 1));
    }
  }

  throw lastError || new Error('Penyegerakan Google Sheets gagal.');
}

function appendSyncLog(
  prev: PersistedGoogleSheetsSyncState,
  entry: GoogleSheetsSyncLog,
  nextHashes?: Record<string, string>,
): PersistedGoogleSheetsSyncState {
  return db.saveGoogleSheetsSyncState({
    lastSyncAt: entry.syncedAt,
    lastStatus: entry.status,
    lastMode: entry.mode,
    lastMessage: entry.message,
    lastAttemptedCount: entry.attemptedCount,
    lastSuccessCount: entry.successCount,
    lastFailedCount: entry.failedCount,
    syncedRecordHashes: nextHashes ?? prev.syncedRecordHashes,
    logs: [...prev.logs, entry],
  });
}

export async function syncToGoogleSheets(params: {
  triggeredBy: string;
  mode?: 'full' | 'incremental';
}): Promise<{
  ok: boolean;
  statusCode: number;
  syncStatus: GoogleSheetsSyncStatusResponse;
}> {
  const cfg = getSyncConfig();
  const prevState = db.getGoogleSheetsSyncState();
  const mode: 'full' | 'incremental' =
    params.mode === 'incremental' && prevState.lastSyncAt ? 'incremental' : 'full';
  const now = new Date().toISOString();

  const prepared = buildPreparedRows();
  const totalUniqueRecords = Object.keys(prepared.hashes).length;

  if (!cfg.configured) {
    const logEntry: GoogleSheetsSyncLog = {
      id: `sync_${crypto.randomBytes(5).toString('hex')}`,
      mode,
      status: 'unconfigured',
      triggeredBy: params.triggeredBy,
      attemptedCount: 0,
      successCount: 0,
      failedCount: 0,
      message:
        'Penyegerakan dibatalkan: GOOGLE_APPS_SCRIPT_WEBAPP_URL dan GOOGLE_APPS_SCRIPT_SECRET_TOKEN belum dikonfigurasi pada pelayan.',
      syncedAt: now,
    };
    appendSyncLog(prevState, logEntry);
    return {
      ok: false,
      statusCode: 503,
      syncStatus: getGoogleSheetsSyncStatus(),
    };
  }

  let sheetsPayload: Record<string, Array<Record<string, unknown>>>;
  let logicalAttemptCount = totalUniqueRecords;

  if (mode === 'incremental') {
    const incremental = selectIncrementalPayload(prepared, prevState.syncedRecordHashes);
    logicalAttemptCount = incremental.changedCount;
    sheetsPayload = incremental.sheets;

    if (incremental.changedCount === 0) {
      const logEntry: GoogleSheetsSyncLog = {
        id: `sync_${crypto.randomBytes(5).toString('hex')}`,
        mode: 'incremental',
        status: 'success',
        triggeredBy: params.triggeredBy,
        attemptedCount: 0,
        successCount: 0,
        failedCount: 0,
        message: 'Tiada perubahan rekod baharu dikesan sejak penyegerakan terakhir.',
        syncedAt: now,
      };
      appendSyncLog(prevState, logEntry);
      return {
        ok: true,
        statusCode: 200,
        syncStatus: getGoogleSheetsSyncStatus(),
      };
    }
  } else {
    sheetsPayload = {
      Data_Murid: prepared.dataMurid,
      Kemajuan_Murid: prepared.kemajuanMurid,
      Markah_Misi: prepared.markahMisi,
      Rekod_Log_Masuk: prepared.rekodLogMasuk,
      Rakaman_Misi4: prepared.rakamanMisi4,
      Laporan_Keseluruhan: prepared.laporanKeseluruhan,
    };
  }

  const totalRowsInPayload = Object.values(sheetsPayload).reduce((acc, arr) => acc + arr.length, 0);

  try {
    const result = await postToAppsScriptWithRetry(
      cfg.webAppUrl,
      {
        secretToken: cfg.secretToken,
        mode,
        requestedAt: now,
        sheets: sheetsPayload,
      },
      cfg.timeoutMs,
      cfg.maxRetries,
    );

    const inserted = Number(result.summary?.inserted ?? 0);
    const updated = Number(result.summary?.updated ?? 0);
    const failed = Number(result.summary?.failed ?? 0);
    const processed = Number(result.summary?.totalProcessed ?? totalRowsInPayload);
    const succeeded = Math.max(0, inserted + updated || processed - failed);

    const status: SyncStatusType =
      failed > 0 && succeeded > 0 ? 'partial' : failed > 0 ? 'failed' : 'success';

    const message =
      status === 'success'
        ? `Penyegerakan (${mode === 'full' ? 'Penuh' : 'Perubahan Baharu'}) berjaya: ${succeeded} baris dikemas kini/dimasukkan merangkumi ${prepared.dataMurid.length} murid.`
        : `Penyegerakan selesai dengan ${failed} rekod gagal daripada ${processed} baris.`;

    const logEntry: GoogleSheetsSyncLog = {
      id: `sync_${crypto.randomBytes(5).toString('hex')}`,
      mode,
      status,
      triggeredBy: params.triggeredBy,
      attemptedCount: processed,
      successCount: succeeded,
      failedCount: failed,
      message,
      syncedAt: result.syncedAt || now,
    };

    const nextHashes =
      failed === 0
        ? { ...prevState.syncedRecordHashes, ...prepared.hashes }
        : prevState.syncedRecordHashes;

    appendSyncLog(prevState, logEntry, nextHashes);
    return {
      ok: status === 'success',
      statusCode: status === 'failed' ? 502 : 200,
      syncStatus: getGoogleSheetsSyncStatus(),
    };
  } catch (err) {
    const errMessage =
      err instanceof Error ? err.message : 'Ralat tidak dijangka semasa penyegerakan Google Sheets.';
    const logEntry: GoogleSheetsSyncLog = {
      id: `sync_${crypto.randomBytes(5).toString('hex')}`,
      mode,
      status: 'failed',
      triggeredBy: params.triggeredBy,
      attemptedCount: totalRowsInPayload || logicalAttemptCount,
      successCount: 0,
      failedCount: totalRowsInPayload || logicalAttemptCount,
      message: errMessage,
      syncedAt: now,
    };
    appendSyncLog(prevState, logEntry);
    return {
      ok: false,
      statusCode: 502,
      syncStatus: getGoogleSheetsSyncStatus(),
    };
  }
}
