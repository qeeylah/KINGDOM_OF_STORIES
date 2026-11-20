import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Award,
  BookOpen,
  CheckCircle2,
  Compass,
  Eye,
  FileSpreadsheet,
  Filter,
  GraduationCap,
  LogOut,
  MessageSquare,
  Mic,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react';
import { AuthenticatedAudioPlayer, AuthenticatedVideoPlayer } from './AuthenticatedMedia';
import {
  buildStudentSummary,
  computeDashboardMetrics,
  extractDistinctClasses,
  filterAndSortStudents,
  formatMalayDateTime,
  isScriptCustomizedByStudent,
  type MissionProgressStatus,
  type StudentSortOption,
  type StudentStatusFilter,
} from './teacherDashboardUtils';
import type {
  AdminContentConfig,
  AuthUser,
  GoogleSheetsSyncStatusResponse,
  PlayerProgress,
  SyncStatusType,
  TeacherVoiceRecord,
  UserRole,
} from '../types/game';

interface TeacherPortalProps {
  user: AuthUser;
  token: string;
  onEnterWorld3D: () => void;
  onLogout: () => void;
}

function getMissionStatusClass(status: MissionProgressStatus): string {
  switch (status) {
    case 'Selesai':
      return 'text-[#6EE7B7]';
    case 'Sedang Berlangsung':
      return 'text-[#E5C97B]';
    case 'Belum Bermula':
    default:
      return 'text-[#FAF6EE]/50';
  }
}

function getSyncStatusMeta(status: SyncStatusType, syncing: boolean): {
  label: string;
  colorClass: string;
} {
  if (syncing) {
    return { label: 'Sedang Menyegerakkan...', colorClass: 'text-[#7BE0E6]' };
  }
  switch (status) {
    case 'success':
      return { label: 'Berjaya Disegerakkan', colorClass: 'text-[#6EE7B7]' };
    case 'partial':
      return { label: 'Separa Berjaya', colorClass: 'text-[#E5C97B]' };
    case 'failed':
      return { label: 'Gagal Disegerakkan', colorClass: 'text-red-300' };
    case 'unconfigured':
      return { label: 'Belum Dikonfigurasi', colorClass: 'text-[#E5C97B]' };
    case 'idle':
    default:
      return { label: 'Sedia untuk Segerak', colorClass: 'text-[#8FBCE0]' };
  }
}

export const TeacherPortal: React.FC<TeacherPortalProps> = ({
  user,
  token,
  onEnterWorld3D,
  onLogout,
}) => {
  const [students, setStudents] = useState<Array<{ user: AuthUser; progress: PlayerProgress }>>([]);
  const [voiceRecords, setVoiceRecords] = useState<TeacherVoiceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedId, setSelectedId] = useState<string>('');

  // Search, filter & sort states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<StudentStatusFilter>('all');
  const [sortBy, setSortBy] = useState<StudentSortOption>('name_asc');

  // Teacher feedback form state
  const [comment, setComment] = useState('');
  const [ratingLabel, setRatingLabel] = useState<
    'Sedang Dibimbing' | 'Memuaskan' | 'Baik' | 'Cemerlang'
  >('Baik');
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [feedbackErrMsg, setFeedbackErrMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Google Sheets sync states
  const [syncStatus, setSyncStatus] = useState<GoogleSheetsSyncStatusResponse | null>(null);
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [syncFeedbackMsg, setSyncFeedbackMsg] = useState('');

  const canManageSheetsSync = user.role === 'teacher' || user.role === 'admin';

  const loadTeacherData = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      const [stuRes, voiceRes, syncRes] = await Promise.all([
        fetch('/api/teacher/students', {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/teacher/voice-records', {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/teacher/sheets-sync/status', {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!stuRes.ok) {
        const d = (await stuRes.json().catch(() => ({}))) as { error?: string };
        setErrorMsg(d.error || 'Gagal memuatkan rekod murid.');
      } else {
        const data = (await stuRes.json()) as {
          students: Array<{ user: AuthUser; progress: PlayerProgress }>;
        };
        const loadedStudents = data.students || [];
        setStudents(loadedStudents);
        setSelectedId((prev) => {
          if (prev && loadedStudents.some((s) => s.user.id === prev)) return prev;
          return loadedStudents[0]?.user.id || '';
        });
      }

      if (voiceRes.ok) {
        const vData = (await voiceRes.json()) as { records: TeacherVoiceRecord[] };
        setVoiceRecords(vData.records || []);
      }

      if (syncRes.ok) {
        const sData = (await syncRes.json()) as { syncStatus: GoogleSheetsSyncStatusResponse };
        setSyncStatus(sData.syncStatus);
      }
    } catch {
      setErrorMsg('Sambungan pelayan terganggu semasa memuatkan rekod Portal Guru.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTeacherData();
  }, [token]);

  const handleSyncSheets = async (mode: 'full' | 'incremental') => {
    if (!canManageSheetsSync || isSyncingSheets) return;
    setIsSyncingSheets(true);
    setSyncFeedbackMsg('');
    try {
      const res = await fetch('/api/teacher/sheets-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mode }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        syncStatus?: GoogleSheetsSyncStatusResponse;
      };
      if (data.syncStatus) {
        setSyncStatus(data.syncStatus);
        setSyncFeedbackMsg(data.syncStatus.lastMessage || '');
      } else if (!res.ok) {
        setSyncFeedbackMsg(data.error || 'Penyegerakan ke Google Sheets gagal.');
      }
    } catch {
      setSyncFeedbackMsg('Sambungan pelayan terganggu semasa menyegerakkan ke Google Sheets.');
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const enrichedStudents = useMemo(
    () =>
      students.map((item) => ({
        ...item,
        summary: buildStudentSummary(item.user, item.progress),
      })),
    [students],
  );

  const dashboardMetrics = useMemo(
    () =>
      computeDashboardMetrics(
        enrichedStudents.map((e) => e.summary),
        students,
        voiceRecords,
      ),
    [enrichedStudents, students, voiceRecords],
  );

  const distinctClasses = useMemo(
    () => extractDistinctClasses(enrichedStudents.map((e) => e.summary)),
    [enrichedStudents],
  );

  const filteredStudents = useMemo(
    () =>
      filterAndSortStudents(enrichedStudents, {
        searchQuery,
        classFilter,
        statusFilter,
        sortBy,
      }),
    [enrichedStudents, searchQuery, classFilter, statusFilter, sortBy],
  );

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    classFilter !== 'ALL' ||
    statusFilter !== 'all' ||
    sortBy !== 'name_asc';

  const resetFilters = () => {
    setSearchQuery('');
    setClassFilter('ALL');
    setStatusFilter('all');
    setSortBy('name_asc');
  };

  const activeStudent = useMemo(
    () => enrichedStudents.find((s) => s.user.id === selectedId),
    [enrichedStudents, selectedId],
  );

  useEffect(() => {
    if (activeStudent?.progress.teacherFeedback) {
      setComment(activeStudent.progress.teacherFeedback.comment);
      setRatingLabel(activeStudent.progress.teacherFeedback.ratingLabel);
    } else {
      setComment('');
      setRatingLabel('Baik');
    }
    setSaveMsg('');
    setFeedbackErrMsg('');
  }, [selectedId, activeStudent?.progress.teacherFeedback?.reviewedAt]);

  const handleSelectStudentAndScroll = (studentId: string) => {
    setSelectedId(studentId);
    const el = document.getElementById('student-detail-panel');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent) return;
    const trimmedComment = comment.trim();
    if (!trimmedComment) {
      setFeedbackErrMsg('Sila masukkan ulasan guru yang membina sebelum menyimpan.');
      return;
    }

    setSaveMsg('');
    setFeedbackErrMsg('');
    setIsSavingFeedback(true);

    try {
      const res = await fetch('/api/teacher/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentUserId: activeStudent.user.id,
          comment: trimmedComment,
          ratingLabel,
        }),
      });
      if (res.ok) {
        setSaveMsg('Maklum balas guru berjaya disimpan dan dipaparkan kepada murid.');
        await loadTeacherData();
      } else {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setFeedbackErrMsg(d.error || 'Gagal menyimpan maklum balas guru.');
      }
    } catch {
      setFeedbackErrMsg('Ralat sambungan pelayan semasa menyimpan maklum balas guru.');
    } finally {
      setIsSavingFeedback(false);
    }
  };

  if (user.role !== 'teacher' && user.role !== 'admin') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#162038] text-[#FAF6EE] p-6">
        <div className="max-w-md w-full rounded-xl border border-red-400/40 bg-[#1B2948] p-6 text-center space-y-3">
          <h2 className="font-display text-lg font-bold text-[#FAF6EE]">
            Akses Terhad kepada Akaun Guru
          </h2>
          <p className="text-xs text-[#C8B6E2]">
            Hanya akaun berdaftar dengan peranan guru dibenarkan mengakses Dashboard Guru.
          </p>
          <button
            type="button"
            onClick={onLogout}
            className="px-4 py-2 rounded-lg bg-[#D4AF37] text-[#162038] text-xs font-semibold hover:bg-[#E5C35A]"
          >
            Kembali ke Skrin Log Masuk
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-y-auto bg-[#162038] text-[#FAF6EE]">
      <header className="border-b border-[#D4AF37]/25 bg-[#1B2948] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-6 h-6 text-[#D4AF37] shrink-0" />
          <div>
            <h1 className="font-display text-lg font-semibold text-[#FAF6EE]">
              Dashboard Guru · Portal Guru Kingdom of Stories
            </h1>
            <p className="text-xs text-[#C8B6E2]">
              {user.fullName} · Kelas {user.className || '5 Bestari'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => void loadTeacherData()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#FAF6EE]/20 bg-[#162038] text-xs font-semibold text-[#FAF6EE] hover:bg-[#233256] disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#D4AF37] ${loading ? 'animate-spin' : ''}`} />
            <span>Muat Semula Data</span>
          </button>
          <button
            type="button"
            onClick={onEnterWorld3D}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E5C35A] bg-[#233256] text-xs font-semibold text-[#E5C35A] hover:bg-[#2C3F6C] whitespace-nowrap shrink-0"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Masuk Dunia 3D</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#FAF6EE]/20 bg-[#162038] text-xs font-semibold hover:bg-[#233256] whitespace-nowrap shrink-0"
          >
            <LogOut className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Log Keluar</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Royal 3D Preview Entry Card */}
        <section className="rounded-xl border border-[#D4AF37]/35 bg-[#1B2948] p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#E5C35A]">
              <Sparkles className="w-4 h-4" />
              <span>Dunia 3D Kingdom of Stories · Kesemua 5 Misi Terbuka</span>
            </div>
            <h2 className="font-display text-lg font-bold text-[#FAF6EE]">
              Pratonton Persekitaran &amp; Aliran 5 Misi
            </h2>
            <p className="text-xs sm:text-sm text-[#EFE6D5]/80">
              Masuki kesemua lima lokasi misi pada bila-bila masa untuk meninjau persekitaran 3D, aktiviti dan aliran permainan dalam keadaan pratonton tanpa mengubah rekod murid.
            </p>
          </div>
          <button
            type="button"
            onClick={onEnterWorld3D}
            className="px-5 py-2.5 rounded-lg bg-[#D4AF37] text-[#162038] text-xs font-bold hover:bg-[#E5C35A] transition-colors whitespace-nowrap shrink-0"
          >
            Masuk Dunia 3D (5 Misi Terbuka)
          </button>
        </section>

        {errorMsg && (
          <div className="rounded-xl border border-red-400/40 bg-red-950/40 p-4 text-sm text-red-200">
            {errorMsg}
          </div>
        )}

        {/* Executive Summary KPI Strip (Strictly Real Persisted Data) */}
        <section aria-label="Ringkasan Eksekutif Pencapaian Murid" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-base font-bold text-[#E5C97B]">
              Ringkasan Eksekutif Perkembangan Murid
            </h2>
            <span className="text-xs text-[#C8B6E2]">
              Dikira secara langsung daripada rekod sebenar pangkalan data
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            <div className="rounded-xl border border-[#FAF6EE]/12 bg-[#1B2948] p-4 space-y-1.5">
              <div className="text-xs text-[#C8B6E2]">Jumlah Murid Berdaftar</div>
              <div className="font-mono-tabular text-2xl font-bold text-[#FAF6EE]">
                {loading ? '—' : dashboardMetrics.totalStudents}
              </div>
              <div className="text-[11px] text-[#8FBCE0]">
                Merangkumi {distinctClasses.length || 1} kelas berdaftar
              </div>
            </div>

            <div className="rounded-xl border border-[#FAF6EE]/12 bg-[#1B2948] p-4 space-y-1.5">
              <div className="text-xs text-[#C8B6E2]">Mula Pembelajaran</div>
              <div className="font-mono-tabular text-2xl font-bold text-[#7BE0E6]">
                {loading ? '—' : dashboardMetrics.startedStudentsCount}
              </div>
              <div className="font-mono-tabular text-[11px] text-[#FAF6EE]/70">
                {dashboardMetrics.startedStudentsPercent}% daripada murid aktif
              </div>
            </div>

            <div className="rounded-xl border border-[#FAF6EE]/12 bg-[#1B2948] p-4 space-y-1.5">
              <div className="text-xs text-[#C8B6E2]">Tamat Kesemua 5 Misi</div>
              <div className="font-mono-tabular text-2xl font-bold text-[#6EE7B7]">
                {loading ? '—' : dashboardMetrics.completedAllCount}
              </div>
              <div className="font-mono-tabular text-[11px] text-[#FAF6EE]/70">
                {dashboardMetrics.completedAllPercent}% telah membuka Festival Cahaya
              </div>
            </div>

            <div className="rounded-xl border border-[#FAF6EE]/12 bg-[#1B2948] p-4 space-y-1.5">
              <div className="text-xs text-[#C8B6E2]">Purata Pencapaian Murid</div>
              <div className="font-mono-tabular text-2xl font-bold text-[#E5C97B]">
                {loading ? '—' : `${dashboardMetrics.averageCompletionPercent}%`}
              </div>
              <div className="font-mono-tabular text-[11px] text-[#FAF6EE]/70">
                Purata {dashboardMetrics.averageMissionsCompleted}/5 misi · Misi 1:{' '}
                {dashboardMetrics.averageMisi1Score !== null
                  ? `${dashboardMetrics.averageMisi1Score}/6`
                  : 'Belum Ada Rekod'}
              </div>
            </div>

            <div className="rounded-xl border border-[#FAF6EE]/12 bg-[#1B2948] p-4 space-y-1.5">
              <div className="text-xs text-[#C8B6E2]">Penyertaan &amp; Percubaan Misi</div>
              <div className="font-mono-tabular text-2xl font-bold text-[#FAF6EE]">
                {loading ? '—' : dashboardMetrics.totalParticipations}
              </div>
              <div className="font-mono-tabular text-[11px] text-[#8FBCE0]">
                Termasuk {dashboardMetrics.totalVoiceRecords} rakaman Misi 4
              </div>
            </div>
          </div>
        </section>

        {/* Google Sheets Sync Status & Controls (RBAC: Teacher & Admin Only) */}
        {canManageSheetsSync && (
          <section
            aria-label="Penyegerakan Google Sheets"
            className="rounded-xl border border-[#7BE0E6]/30 bg-[#1B2948] p-5 space-y-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#FAF6EE]/10 pb-3.5">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <FileSpreadsheet className="w-5 h-5 text-[#6EE7B7]" />
                  <h2 className="font-display text-base font-bold text-[#FAF6EE]">
                    Integrasi &amp; Penyegerakan Google Sheets
                  </h2>
                  {(() => {
                    const meta = getSyncStatusMeta(
                      syncStatus?.lastStatus || 'idle',
                      isSyncingSheets,
                    );
                    return (
                      <span className={`text-xs font-semibold ${meta.colorClass}`}>
                        · {meta.label}
                      </span>
                    );
                  })()}
                </div>
                <p className="text-xs text-[#C8B6E2]">
                  Menyegerakkan data murid, kemajuan Misi 1–5, markah sebenar, log masuk dan metadata rakaman Misi 4 secara selamat ke pelayan Google Apps Script.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleSyncSheets('full')}
                  disabled={isSyncingSheets}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#D4AF37] text-[#162038] text-xs font-bold hover:bg-[#E5C35A] transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isSyncingSheets ? 'animate-spin' : ''}`}
                  />
                  <span>
                    {isSyncingSheets ? 'Menyegerakkan...' : 'Segerakkan ke Google Sheets'}
                  </span>
                </button>

                {syncStatus?.lastSyncAt && syncStatus.configured && (
                  <button
                    type="button"
                    onClick={() => void handleSyncSheets('incremental')}
                    disabled={isSyncingSheets}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#7BE0E6]/45 bg-[#162038] text-xs font-semibold text-[#7BE0E6] hover:bg-[#233256] disabled:opacity-50 whitespace-nowrap shrink-0"
                  >
                    <span>
                      Segerak Perubahan Baharu ({syncStatus.pendingChangesCount})
                    </span>
                  </button>
                )}

                {(syncStatus?.lastStatus === 'failed' ||
                  syncStatus?.lastStatus === 'partial') && (
                  <button
                    type="button"
                    onClick={() => void handleSyncSheets(syncStatus.lastMode || 'full')}
                    disabled={isSyncingSheets}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-red-400/50 bg-red-950/40 text-xs font-semibold text-red-200 hover:bg-red-900/40 disabled:opacity-50 whitespace-nowrap shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Cuba Semula Penyegerakan</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="rounded-lg border border-[#FAF6EE]/10 bg-[#162038] p-3 space-y-1">
                <div className="text-[11px] text-[#C8B6E2]">Status Sambungan</div>
                <div
                  className={`font-semibold ${
                    syncStatus?.configured ? 'text-[#6EE7B7]' : 'text-[#E5C97B]'
                  }`}
                >
                  {syncStatus?.configured
                    ? 'Dikonfigurasi (Pelayan ke Pelayan)'
                    : 'Menunggu URL Web App & Token'}
                </div>
              </div>

              <div className="rounded-lg border border-[#FAF6EE]/10 bg-[#162038] p-3 space-y-1">
                <div className="text-[11px] text-[#C8B6E2]">Masa Penyegerakan Terakhir</div>
                <div className="font-mono-tabular font-semibold text-[#FAF6EE]">
                  {syncStatus?.lastSyncAt
                    ? formatMalayDateTime(syncStatus.lastSyncAt)
                    : 'Belum Pernah Disegerakkan'}
                </div>
              </div>

              <div className="rounded-lg border border-[#FAF6EE]/10 bg-[#162038] p-3 space-y-1">
                <div className="text-[11px] text-[#C8B6E2]">Rekod Berjaya Disegerakkan</div>
                <div className="font-mono-tabular text-base font-bold text-[#6EE7B7]">
                  {syncStatus?.lastSuccessCount ?? 0}
                </div>
              </div>

              <div className="rounded-lg border border-[#FAF6EE]/10 bg-[#162038] p-3 space-y-1">
                <div className="text-[11px] text-[#C8B6E2]">Rekod Gagal Disegerakkan</div>
                <div
                  className={`font-mono-tabular text-base font-bold ${
                    (syncStatus?.lastFailedCount ?? 0) > 0 ? 'text-red-300' : 'text-[#FAF6EE]'
                  }`}
                >
                  {syncStatus?.lastFailedCount ?? 0}
                </div>
              </div>
            </div>

            {(syncFeedbackMsg || syncStatus?.lastMessage) && (
              <div
                className={`rounded-lg border px-3.5 py-2.5 text-xs flex items-start gap-2 ${
                  syncStatus?.lastStatus === 'failed' || syncStatus?.lastStatus === 'unconfigured'
                    ? 'border-[#E5C97B]/35 bg-[#101930] text-[#E5C97B]'
                    : 'border-[#6EE7B7]/30 bg-[#101930] text-[#EFE6D5]'
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{syncFeedbackMsg || syncStatus?.lastMessage}</span>
              </div>
            )}
          </section>
        )}

        {/* Search, Filter, Sort & Comprehensive 5-Mission Monitoring Table */}
        <section className="rounded-xl border border-[#FAF6EE]/12 bg-[#1B2948] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#FAF6EE]/10 pb-3">
            <div>
              <h2 className="font-display text-base font-bold text-[#FAF6EE] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#D4AF37]" />
                <span>Jadual Pemantauan Pencapaian Murid</span>
              </h2>
              <p className="text-xs text-[#C8B6E2] mt-0.5">
                Menunjukkan{' '}
                <span className="font-mono-tabular font-semibold text-[#FAF6EE]">
                  {filteredStudents.length}
                </span>{' '}
                daripada{' '}
                <span className="font-mono-tabular font-semibold text-[#FAF6EE]">
                  {students.length}
                </span>{' '}
                murid berdaftar
              </p>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#FAF6EE]/20 bg-[#162038] text-xs font-medium text-[#E5C97B] hover:bg-[#233256]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Set Semula Penapis</span>
              </button>
            )}
          </div>

          {/* Search, Filter & Sort Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-4 relative">
              <Search className="w-4 h-4 text-[#C8B6E2] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama atau ID pengguna murid..."
                aria-label="Carian nama murid"
                className="w-full rounded-lg border border-[#FAF6EE]/20 bg-[#162038] pl-9 pr-3 py-2 text-xs text-[#FAF6EE] placeholder:text-[#FAF6EE]/45 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="lg:col-span-2">
              <div className="relative">
                <Filter className="w-3.5 h-3.5 text-[#C8B6E2] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  aria-label="Penapis kelas"
                  className="w-full rounded-lg border border-[#FAF6EE]/20 bg-[#162038] pl-8 pr-3 py-2 text-xs text-[#FAF6EE] focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="ALL">Semua Kelas</option>
                  {distinctClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      Kelas {cls}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="lg:col-span-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StudentStatusFilter)}
                aria-label="Penapis status penyelesaian misi"
                className="w-full rounded-lg border border-[#FAF6EE]/20 bg-[#162038] px-3 py-2 text-xs text-[#FAF6EE] focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="all">Semua Status Murid</option>
                <option value="not_started">Berdaftar · Belum Bermain</option>
                <option value="started_playing">Sudah Mula Permainan</option>
                <option value="in_progress">Sedang Melaksanakan Misi</option>
                <option value="completed_all">Tamat Kesemua 5 Misi</option>
                <option value="has_feedback">Sudah Dinilai Guru</option>
                <option value="needs_review">Belum Dinilai Guru</option>
              </select>
            </div>

            <div className="lg:col-span-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as StudentSortOption)}
                aria-label="Susunan senarai murid"
                className="w-full rounded-lg border border-[#FAF6EE]/20 bg-[#162038] px-3 py-2 text-xs text-[#FAF6EE] focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="name_asc">Susunan: Nama (A–Z)</option>
                <option value="name_desc">Susunan: Nama (Z–A)</option>
                <option value="achievement_desc">Susunan: Pencapaian Tertinggi</option>
                <option value="achievement_asc">Susunan: Pencapaian Terendah</option>
              </select>
            </div>
          </div>

          {/* Data Table */}
          {loading ? (
            <div className="space-y-2 py-2">
              {[0, 1, 2].map((rowIdx) => (
                <div
                  key={rowIdx}
                  className="h-12 rounded-lg bg-[#162038] border border-[#FAF6EE]/10 animate-pulse"
                />
              ))}
            </div>
          ) : students.length === 0 ? (
            <div className="rounded-lg bg-[#162038] border border-[#FAF6EE]/10 p-6 text-center text-xs sm:text-sm text-[#FAF6EE]/70">
              Belum ada murid berdaftar di dalam sistem Kingdom of Stories.
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="rounded-lg bg-[#162038] border border-[#FAF6EE]/10 p-6 text-center space-y-3">
              <p className="text-xs sm:text-sm text-[#FAF6EE]/75">
                Tiada rekod murid yang sepadan dengan kriteria carian atau penapis semasa.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 rounded-lg bg-[#D4AF37] text-[#162038] text-xs font-semibold hover:bg-[#E5C35A]"
              >
                Set Semula Penapis
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[#FAF6EE]/10 bg-[#162038]">
              <table className="w-full min-w-[1040px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[#FAF6EE]/15 bg-[#101930] text-[11px] font-semibold uppercase tracking-wide text-[#C8B6E2]">
                    <th className="py-3 px-3.5">Nama Murid</th>
                    <th className="py-3 px-3">Kelas</th>
                    <th className="py-3 px-3">Misi 1 (Kefahaman)</th>
                    <th className="py-3 px-3">Misi 2 (Kronologi)</th>
                    <th className="py-3 px-3">Misi 3 (Skrip &amp; AI)</th>
                    <th className="py-3 px-3">Misi 4 (Suara)</th>
                    <th className="py-3 px-3">Misi 5 (Akhir)</th>
                    <th className="py-3 px-3">Pencapaian</th>
                    <th className="py-3 px-3.5 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FAF6EE]/10">
                  {filteredStudents.map(({ user: stu, summary }) => {
                    const isSelected = selectedId === stu.id;
                    const [m1, m2, m3, m4, m5] = summary.missions;
                    return (
                      <tr
                        key={stu.id}
                        className={`transition-colors ${
                          isSelected
                            ? 'bg-[#233256]/80'
                            : 'hover:bg-[#1E2C4D]/60'
                        }`}
                      >
                        <td className="py-3 px-3.5 align-top">
                          <div className="font-semibold text-[#FAF6EE]">{summary.fullName}</div>
                          <div className="text-[11px] text-[#8FBCE0] mt-0.5">
                            @{summary.username} · {summary.engagementStatus}
                          </div>
                        </td>
                        <td className="py-3 px-3 align-top text-[#EFE6D5] whitespace-nowrap">
                          {summary.className}
                        </td>
                        {[m1, m2, m3, m4, m5].map((m) => (
                          <td key={m.missionNumber} className="py-3 px-3 align-top">
                            <div className={`font-semibold ${getMissionStatusClass(m.status)}`}>
                              {m.status}
                            </div>
                            <div className="font-mono-tabular text-[11px] text-[#FAF6EE]/70 mt-0.5">
                              {m.primaryMetric}
                            </div>
                          </td>
                        ))}
                        <td className="py-3 px-3 align-top">
                          <div className="font-mono-tabular font-semibold text-[#FAF6EE]">
                            {summary.completedCount}/5 Misi · {summary.unlockedBadgeCount}/
                            {summary.totalBadgeCount} Lencana
                          </div>
                          <div className="text-[11px] text-[#C8B6E2] mt-0.5">
                            Ulasan: {summary.teacherRatingLabel}
                          </div>
                        </td>
                        <td className="py-3 px-3.5 align-top text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleSelectStudentAndScroll(stu.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                              isSelected
                                ? 'bg-[#D4AF37] text-[#162038]'
                                : 'border border-[#D4AF37]/45 bg-[#1B2948] text-[#E5C97B] hover:bg-[#233256]'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{isSelected ? 'Sedang Dipapar' : 'Lihat Rekod'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Detailed Selected Student Record View (Read-Only Student Data + Teacher Assessment Form) */}
        <section id="student-detail-panel" className="scroll-mt-4">
          {activeStudent ? (
            <div className="rounded-xl border border-[#D4AF37]/30 bg-[#1B2948] p-6 space-y-6">
              {/* Student Basic Profile Header (Safe Non-Sensitive Fields Only) */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#FAF6EE]/10 pb-4">
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#E5C97B]">
                    Paparan Terperinci Rekod Murid
                  </div>
                  <h2 className="font-display text-xl font-bold text-[#FAF6EE]">
                    {activeStudent.summary.fullName}
                  </h2>
                  <p className="text-xs text-[#C8B6E2]">
                    @{activeStudent.summary.username} · Kelas {activeStudent.summary.className} · ID{' '}
                    <span className="font-mono-tabular text-[#8FBCE0]">
                      {activeStudent.user.id}
                    </span>
                  </p>
                </div>

                <div className="text-left sm:text-right space-y-1 text-xs">
                  <div className="font-semibold text-[#6EE7B7] inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {activeStudent.summary.completedAllFive
                        ? 'Kesemua 5 Misi Selesai'
                        : `${activeStudent.summary.completedCount}/5 Misi Selesai`}
                    </span>
                  </div>
                  <div className="text-[#FAF6EE]/75">
                    Wira: {activeStudent.summary.heroLabel} · Mod:{' '}
                    {activeStudent.summary.learningModeLabel}
                  </div>
                  <div className="text-[11px] text-[#8FBCE0]">
                    Tahap Adaptif: {activeStudent.progress.adaptiveLevel} · Kemas Kini:{' '}
                    {formatMalayDateTime(activeStudent.progress.updatedAt)}
                  </div>
                </div>
              </div>

              {/* 5 Missions Read-Only Breakdown */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[#D4AF37] flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    <span>Perkembangan &amp; Rekod Kesemua 5 Misi (Baca Sahaja)</span>
                  </h3>
                  <span className="text-[11px] text-[#FAF6EE]/60">
                    Markah asal dan rekod misi murid dipaparkan terus daripada sistem tanpa pengubahsuaian
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {activeStudent.summary.missions.map((m) => (
                    <div
                      key={m.missionNumber}
                      className="rounded-lg border border-[#FAF6EE]/12 bg-[#162038] p-3.5 space-y-1.5"
                    >
                      <div className="text-[11px] font-semibold text-[#8FBCE0]">
                        {m.title}
                      </div>
                      <div className={`text-xs font-bold ${getMissionStatusClass(m.status)}`}>
                        {m.status}
                      </div>
                      <div className="font-mono-tabular text-sm font-semibold text-[#FAF6EE]">
                        {m.primaryMetric}
                      </div>
                      <div className="text-[11px] text-[#FAF6EE]/65 leading-snug">
                        {m.secondaryDetail}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Misi 3 Script & AI Language Mentor Feedback */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[#D4AF37]">
                    Skrip Penceritaan &amp; Maklum Balas Mentor Bahasa AI (Misi 3)
                  </h3>
                  <span className="text-[11px] text-[#C8B6E2]">
                    {isScriptCustomizedByStudent(activeStudent.progress.scriptPlan)
                      ? 'Skrip Disunting Murid'
                      : 'Templat Permulaan (Belum Disunting)'}
                  </span>
                </div>

                <div className="rounded-lg bg-[#162038] border border-[#FAF6EE]/10 p-4 text-xs sm:text-sm leading-relaxed text-[#EFE6D5]">
                  {activeStudent.progress.scriptPlan.fullScript || 'Belum Ada Rekod'}
                </div>

                {activeStudent.progress.languageFeedback ? (
                  <div className="rounded-lg bg-[#101930] border border-[#7BE0E6]/25 p-4 space-y-2.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-[#7BE0E6]">
                        Maklum Balas Mentor Bahasa AI
                      </span>
                      <span className="font-mono-tabular text-[11px] text-[#FAF6EE]/65">
                        Disemak pada{' '}
                        {formatMalayDateTime(activeStudent.progress.languageFeedback.analyzedAt)}
                      </span>
                    </div>
                    <p className="text-[#FAF6EE]/90 leading-relaxed">
                      {activeStudent.progress.languageFeedback.summary}
                    </p>
                    {activeStudent.progress.languageFeedback.strengths.length > 0 && (
                      <div className="text-[#6EE7B7]">
                        <strong>Kekuatan:</strong>{' '}
                        {activeStudent.progress.languageFeedback.strengths.join(' · ')}
                      </div>
                    )}
                    {activeStudent.progress.languageFeedback.issues.length > 0 && (
                      <div className="space-y-1 text-[#EFE6D5]/85">
                        <strong className="text-[#E5C97B]">
                          Catatan Penambahbaikan ({activeStudent.progress.languageFeedback.issues.length}):
                        </strong>
                        <ul className="list-disc pl-5 space-y-1">
                          {activeStudent.progress.languageFeedback.issues.slice(0, 4).map((iss, idx) => (
                            <li key={idx}>
                              <span className="text-[#E5C97B]">{iss.category}:</span> {iss.explanation}{' '}
                              {iss.suggestion ? `— Cadangan: ${iss.suggestion}` : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="text-[#8FBCE0]">
                      <strong>Nasihat Adaptif:</strong>{' '}
                      {activeStudent.progress.languageFeedback.adaptiveAdvice}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#FAF6EE]/60">
                    Belum ada maklum balas AI Mentor yang direkodkan bagi murid ini.
                  </p>
                )}
              </div>

              {/* Misi 4 Authorized Private Voice Recordings */}
              <div className="space-y-2.5">
                <h3 className="text-sm font-semibold text-[#8FBCE0]">
                  Rakaman Suara Murid — Misi 4: Balai Gema Diraja
                </h3>
                {activeStudent.progress.voiceAttempts.length === 0 ? (
                  <p className="text-xs text-[#FAF6EE]/60">
                    Belum Ada Rekod — Murid belum menghantar rakaman suara.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeStudent.progress.voiceAttempts.map((va) => (
                      <div
                        key={`${va.attemptNumber}-${va.mediaId}`}
                        className="rounded-lg bg-[#162038] border border-[#FAF6EE]/15 p-3.5 space-y-2.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono-tabular font-semibold text-[#D4AF37]">
                            Cubaan ke-{va.attemptNumber} ({va.durationSeconds}s)
                          </span>
                          <span className="text-[11px] text-[#6EE7B7]">
                            {va.submissionStatus || 'Berjaya Dihantar'}
                          </span>
                        </div>
                        <div className="font-mono-tabular text-[11px] text-[#FAF6EE]/60">
                          Tarikh: {formatMalayDateTime(va.recordedAt)}
                        </div>
                        <AuthenticatedAudioPlayer
                          mediaId={va.mediaId}
                          token={token}
                          downloadFilename={`${activeStudent.user.username}-misi4-cubaan${va.attemptNumber}.webm`}
                          showDownloadButton
                        />
                        {va.transcript && (
                          <p className="text-xs text-[#EFE6D5]/80">
                            <strong className="text-[#C8B6E2]">Transkripsi:</strong> {va.transcript}
                          </p>
                        )}
                        {va.analysis && (
                          <div className="text-[11px] text-[#8FBCE0] border-t border-[#FAF6EE]/10 pt-2">
                            Kejelasan: <strong>{va.analysis.clarityLevel}</strong> · Anggaran{' '}
                            <span className="font-mono-tabular">{va.analysis.estimatedWpm}</span> psm
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Misi 5 Final Submitted Video */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-[#C8B6E2]">
                  Penyerahan Video Akhir (Misi 5 · Balairung Gemilang Diraja)
                </h3>
                {activeStudent.progress.finalVideoMediaId ? (
                  <AuthenticatedVideoPlayer
                    mediaId={activeStudent.progress.finalVideoMediaId}
                    token={token}
                    className="w-full max-h-64 rounded-xl bg-black"
                  />
                ) : activeStudent.progress.theatreCompleted ? (
                  <div className="rounded-lg bg-[#162038] border border-[#FAF6EE]/10 p-3 text-xs text-[#EFE6D5]">
                    Murid mempersembahkan Mod Papan Cerita Berpandu:{' '}
                    <strong>{activeStudent.progress.finalVideoTitle || 'Persembahan Akhir'}</strong>
                  </div>
                ) : (
                  <p className="text-xs text-[#FAF6EE]/60">
                    Belum Ada Rekod — Penyerahan akhir belum dibuat oleh murid.
                  </p>
                )}
              </div>

              {/* Student Achievements */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[#E5C97B] flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    <span>Lencana Pencapaian Murid</span>
                  </h3>
                  <span className="font-mono-tabular text-xs text-[#C8B6E2]">
                    {activeStudent.summary.unlockedBadgeCount}/
                    {activeStudent.summary.totalBadgeCount} Lencana Dibuka
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {activeStudent.progress.achievements.map((ach) => (
                    <div
                      key={ach.id}
                      className={`rounded-lg border p-3 text-xs ${
                        ach.unlockedAt
                          ? 'border-[#D4AF37]/35 bg-[#162038]'
                          : 'border-[#FAF6EE]/10 bg-[#121A30] opacity-65'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[#FAF6EE]">{ach.title}</span>
                        <span
                          className={`text-[10px] font-semibold ${
                            ach.unlockedAt ? 'text-[#6EE7B7]' : 'text-[#FAF6EE]/45'
                          }`}
                        >
                          {ach.unlockedAt ? 'Dibuka' : 'Belum Dibuka'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#FAF6EE]/70 mt-1">{ach.description}</p>
                      {ach.unlockedAt && (
                        <div className="font-mono-tabular text-[10px] text-[#8FBCE0] mt-1">
                          {formatMalayDateTime(ach.unlockedAt)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Teacher Assessment Form */}
              <form
                onSubmit={handleSubmitFeedback}
                className="rounded-lg border border-[#D4AF37]/30 bg-[#162038] p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#D4AF37]">
                    <MessageSquare className="w-4 h-4" />
                    <span>Penilaian &amp; Maklum Balas Guru</span>
                  </div>
                  {activeStudent.progress.teacherFeedback && (
                    <span className="text-[11px] text-[#8FBCE0]">
                      Semakan terakhir oleh {activeStudent.progress.teacherFeedback.reviewedBy} ·{' '}
                      {formatMalayDateTime(activeStudent.progress.teacherFeedback.reviewedAt)}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-xs text-[#C8B6E2] mb-1">Tahap Penguasaan</label>
                    <select
                      value={ratingLabel}
                      onChange={(e) =>
                        setRatingLabel(
                          e.target.value as 'Sedang Dibimbing' | 'Memuaskan' | 'Baik' | 'Cemerlang',
                        )
                      }
                      className="w-full rounded-lg border border-[#FAF6EE]/20 bg-[#1B2948] px-3 py-2 text-xs text-[#FAF6EE]"
                    >
                      <option value="Sedang Dibimbing">Sedang Dibimbing</option>
                      <option value="Memuaskan">Memuaskan</option>
                      <option value="Baik">Baik</option>
                      <option value="Cemerlang">Cemerlang</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-[#C8B6E2] mb-1">Ulasan Membina</label>
                    <textarea
                      rows={3}
                      required
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Berikan pujian terhadap usaha serta cadangan penambahbaikan penceritaan murid..."
                      className="w-full rounded-lg border border-[#FAF6EE]/20 bg-[#1B2948] px-3 py-2 text-xs text-[#FAF6EE]"
                    />
                  </div>
                </div>
                {feedbackErrMsg && <p className="text-xs text-red-300">{feedbackErrMsg}</p>}
                {saveMsg && <p className="text-xs text-[#6EE7B7]">{saveMsg}</p>}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingFeedback}
                    className="px-4 py-2 rounded-lg bg-[#D4AF37] text-[#162038] text-xs font-semibold hover:bg-[#E2C258] disabled:opacity-50"
                  >
                    {isSavingFeedback ? 'Menyimpan...' : 'Simpan Maklum Balas Guru'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="rounded-xl border border-[#FAF6EE]/15 bg-[#1B2948] p-8 text-center text-sm text-[#FAF6EE]/60">
              Pilih seorang murid daripada jadual pemantauan di atas untuk menyemak rekod terperinci dan memberi maklum balas.
            </div>
          )}
        </section>

        {/* Dedicated Misi 4 Student Voice Recordings Repository */}
        <section className="rounded-xl border border-[#7BE0E6]/30 bg-[#1B2948] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#FAF6EE]/10 pb-3">
            <div>
              <div className="flex items-center gap-2.5">
                <Mic className="w-5 h-5 text-[#D4AF37]" />
                <h2 className="font-display text-base font-bold text-[#FAF6EE]">
                  Rekod Rakaman Suara Murid
                </h2>
                <span className="font-mono-tabular text-xs font-semibold text-[#7BE0E6]">
                  · {voiceRecords.length} Rakaman
                </span>
              </div>
              <p className="text-xs text-[#C8B6E2] mt-1">
                Semua rakaman suara sebenar murid daripada Misi 4: Balai Gema Diraja disimpan secara kekal untuk dimainkan terus atau dimuat turun oleh pensyarah.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadTeacherData()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#FAF6EE]/20 bg-[#162038] text-xs font-semibold text-[#FAF6EE] hover:bg-[#233256] disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#D4AF37] ${loading ? 'animate-spin' : ''}`} />
              <span>Muat Semula Senarai</span>
            </button>
          </div>

          {loading ? (
            <div className="rounded-lg bg-[#162038] border border-[#FAF6EE]/10 p-5 text-xs text-[#C8B6E2]">
              Memuatkan rekod rakaman suara murid...
            </div>
          ) : voiceRecords.length === 0 ? (
            <div className="rounded-lg bg-[#162038] border border-[#FAF6EE]/10 p-5 text-xs sm:text-sm text-[#EFE6D5]/75">
              Belum ada rakaman suara yang dihantar oleh murid bagi Misi 4: Balai Gema Diraja. Sebaik sahaja murid menekan &quot;Simpan Rakaman&quot;, fail audio akan dipaparkan di sini secara automatik.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {voiceRecords.map((rec) => (
                <div
                  key={`${rec.studentUserId}-${rec.mediaId}`}
                  className="rounded-lg border border-[#D4AF37]/30 bg-[#162038] p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-sm text-[#FAF6EE]">{rec.studentName}</div>
                      <div className="text-xs text-[#C8B6E2]">
                        Kelas {rec.className} · @{rec.studentUsername}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6EE7B7]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{rec.submissionStatus}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-[#101930] border border-[#FAF6EE]/10 p-2.5 text-[11px] text-[#EFE6D5]">
                    <div>
                      <span className="text-[#8FBCE0]">Misi:</span>{' '}
                      <strong className="text-[#FAF6EE]">{rec.missionName}</strong>
                    </div>
                    <div>
                      <span className="text-[#8FBCE0]">Cubaan &amp; Tempoh:</span>{' '}
                      <strong className="font-mono-tabular text-[#D4AF37]">
                        Cubaan ke-{rec.attemptNumber} ({rec.durationSeconds}s)
                      </strong>
                    </div>
                    <div className="col-span-2 font-mono-tabular">
                      <span className="font-sans text-[#8FBCE0]">Tarikh Rakaman:</span>{' '}
                      <span className="text-[#FAF6EE]">
                        {formatMalayDateTime(rec.recordedAt)}
                      </span>
                    </div>
                  </div>

                  <AuthenticatedAudioPlayer
                    mediaId={rec.mediaId}
                    token={token}
                    downloadFilename={`${rec.studentUsername}-misi4-cubaan${rec.attemptNumber}-${rec.filename}`}
                    showDownloadButton
                  />

                  {rec.transcript && (
                    <p className="text-xs text-[#EFE6D5]/80 bg-[#121B35] rounded-lg p-2.5 border border-[#FAF6EE]/10">
                      <strong className="text-[#C8B6E2]">Catatan / Transkripsi:</strong>{' '}
                      {rec.transcript}
                    </p>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleSelectStudentAndScroll(rec.studentUserId)}
                      className="text-[11px] font-semibold text-[#7BE0E6] hover:underline"
                    >
                      Lihat &amp; Nilai Rekod {rec.studentName} →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

interface AdminPortalProps {
  user: AuthUser;
  token: string;
  onEnterWorld3D: () => void;
  onLogout: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  user,
  token,
  onEnterWorld3D,
  onLogout,
}) => {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [config, setConfig] = useState<AdminContentConfig | null>(null);
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('student');
  const [newClass, setNewClass] = useState('5 Bestari');
  const [statusMsg, setStatusMsg] = useState('');

  const loadAdminData = async () => {
    const res = await fetch('/api/admin/users', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = (await res.json()) as { users: AuthUser[]; config: AdminContentConfig };
      setUsers(data.users);
      setConfig(data.config);
    }
  };

  useEffect(() => {
    void loadAdminData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg('');
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        username: newUsername,
        fullName: newFullName,
        password: newPassword,
        role: newRole,
        className: newClass,
      }),
    });
    const d = (await res.json()) as { error?: string };
    if (res.ok) {
      setNewUsername('');
      setNewFullName('');
      setNewPassword('');
      setStatusMsg('Akaun pengguna baharu berjaya dicipta.');
      await loadAdminData();
    } else {
      setStatusMsg(d.error || 'Gagal mencipta akaun.');
    }
  };

  const handleRoleChange = async (userId: string, role: UserRole) => {
    await fetch(`/api/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ role }),
    });
    await loadAdminData();
  };

  const handleToggleUserActive = async (targetUser: AuthUser) => {
    const nextActive = targetUser.isActive === false;
    const res = await fetch(`/api/admin/users/${targetUser.id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ isActive: nextActive }),
    });
    const d = (await res.json()) as { error?: string };
    if (!res.ok) {
      setStatusMsg(d.error || 'Gagal mengemas kini status akaun.');
      return;
    }
    setStatusMsg(
      nextActive
        ? `Akaun ${targetUser.fullName} telah diaktifkan semula.`
        : `Akaun ${targetUser.fullName} telah dinyahaktifkan dan tidak lagi muncul dalam pilihan murid.`,
    );
    await loadAdminData();
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    const res = await fetch('/api/admin/config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(config),
    });
    if (res.ok) {
      setStatusMsg('Tetapan kandungan pembelajaran berjaya dikemas kini.');
    }
  };

  return (
    <div className="min-h-screen w-full overflow-y-auto bg-[#162038] text-[#FAF6EE]">
      <header className="border-b border-[#D4AF37]/25 bg-[#1B2948] px-6 py-4 flex items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-[#D4AF37]" />
          <div>
            <h1 className="font-display text-lg font-semibold text-[#FAF6EE]">
              Portal Pentadbir · Kingdom of Stories
            </h1>
            <p className="text-xs text-[#C8B6E2]">Pengurusan Akaun, Peranan & Kandungan Pembelajaran</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onEnterWorld3D}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E5C35A] bg-[#233256] text-xs font-semibold text-[#E5C35A] hover:bg-[#2C3F6C]"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Masuk Dunia 3D</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#FAF6EE]/20 bg-[#162038] text-xs font-semibold hover:bg-[#233256]"
          >
            <LogOut className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Log Keluar</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <section className="rounded-2xl border border-[#D4AF37]/40 bg-gradient-to-r from-[#172347] via-[#1F2C58] to-[#172347] p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#E5C35A]">
              <Sparkles className="w-4 h-4" />
              <span>Dunia 3D Kingdom of Stories · Kesemua 5 Misi Terbuka</span>
            </div>
            <h2 className="font-display text-lg font-bold text-[#FAF6EE]">
              Pratonton Persekitaran &amp; Aliran 5 Misi
            </h2>
            <p className="text-xs sm:text-sm text-[#EFE6D5]/85">
              Uji dan nilai kesemua lima lokasi kerajaan secara bebas pada bila-bila masa tanpa menjejaskan rekod pembelajaran murid.
            </p>
          </div>
          <button
            type="button"
            onClick={onEnterWorld3D}
            className="px-5 py-2.5 rounded-xl bg-[#D4AF37] text-[#162038] text-xs font-bold hover:bg-[#E5C35A] transition-colors whitespace-nowrap shrink-0"
          >
            Masuk Dunia 3D (5 Misi Terbuka)
          </button>
        </section>

        {statusMsg && (
          <div className="rounded-xl border border-[#D4AF37]/45 bg-[#233256] p-3.5 text-xs text-[#FAF6EE]">
            {statusMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Users & RBAC Table */}
          <section className="lg:col-span-7 rounded-2xl border border-[#FAF6EE]/15 bg-[#1B2948] p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[#D4AF37] flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>Pengurusan Akaun & Peranan ({users.length})</span>
            </h2>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {users.map((u) => {
                const isAccountActive = u.isActive !== false;
                return (
                  <div
                    key={u.id}
                    className={`rounded-xl bg-[#162038] border px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs ${
                      isAccountActive ? 'border-[#FAF6EE]/10' : 'border-red-400/35 opacity-80'
                    }`}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-[#FAF6EE]">{u.fullName}</span>
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold border ${
                            isAccountActive
                              ? 'border-[#6EE7B7]/35 bg-[#102E2C] text-[#6EE7B7]'
                              : 'border-red-400/40 bg-red-950/60 text-red-200'
                          }`}
                        >
                          {isAccountActive ? 'Aktif' : 'Dinyahaktifkan'}
                        </span>
                      </div>
                      <div className="text-[#C8B6E2]">
                        @{u.username} {u.className ? `· ${u.className}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={u.role}
                        disabled={u.id === user.id}
                        onChange={(e) => void handleRoleChange(u.id, e.target.value as UserRole)}
                        className="rounded-lg border border-[#FAF6EE]/20 bg-[#1B2948] px-2.5 py-1.5 text-xs text-[#FAF6EE]"
                      >
                        <option value="student">Pelajar</option>
                        <option value="teacher">Guru</option>
                        <option value="admin">Pentadbir</option>
                      </select>
                      <button
                        type="button"
                        disabled={u.id === user.id}
                        onClick={() => void handleToggleUserActive(u)}
                        className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-40 ${
                          isAccountActive
                            ? 'border-red-400/40 bg-red-950/40 text-red-200 hover:bg-red-900/50'
                            : 'border-[#6EE7B7]/45 bg-[#102E2C] text-[#6EE7B7] hover:bg-[#153D3A]'
                        }`}
                      >
                        {isAccountActive ? 'Nyahaktifkan' : 'Aktifkan'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Create New Account */}
          <section className="lg:col-span-5 rounded-2xl border border-[#FAF6EE]/15 bg-[#1B2948] p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[#8FBCE0] flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              <span>Daftar Pengguna Baharu</span>
            </h2>
            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <input
                type="text"
                required
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder="Nama Penuh"
                className="w-full rounded-lg border border-[#FAF6EE]/20 bg-[#162038] px-3 py-2 text-[#FAF6EE]"
              />
              <input
                type="text"
                required
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Nama Pengguna"
                className="w-full rounded-lg border border-[#FAF6EE]/20 bg-[#162038] px-3 py-2 text-[#FAF6EE]"
              />
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Kata Laluan"
                className="w-full rounded-lg border border-[#FAF6EE]/20 bg-[#162038] px-3 py-2 text-[#FAF6EE]"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="rounded-lg border border-[#FAF6EE]/20 bg-[#162038] px-3 py-2 text-[#FAF6EE]"
                >
                  <option value="student">Pelajar</option>
                  <option value="teacher">Guru</option>
                  <option value="admin">Pentadbir</option>
                </select>
                <input
                  type="text"
                  value={newClass}
                  onChange={(e) => setNewClass(e.target.value)}
                  placeholder="Kelas"
                  className="rounded-lg border border-[#FAF6EE]/20 bg-[#162038] px-3 py-2 text-[#FAF6EE]"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-[#D4AF37] text-[#162038] font-semibold hover:bg-[#E2C258]"
              >
                Cipta Akaun
              </button>
            </form>
          </section>
        </div>

        {/* Learning Content & Game Settings */}
        {config && (
          <form
            onSubmit={handleSaveConfig}
            className="rounded-2xl border border-[#D4AF37]/30 bg-[#1B2948] p-6 space-y-4"
          >
            <h2 className="text-sm font-semibold text-[#D4AF37]">
              Tetapan Kandungan & Misi Tugasan
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[#C8B6E2] mb-1">Tajuk Projek Penceritaan</label>
                <input
                  type="text"
                  value={config.storyTitle}
                  onChange={(e) => setConfig({ ...config, storyTitle: e.target.value })}
                  className="w-full rounded-lg border border-[#FAF6EE]/20 bg-[#162038] px-3 py-2 text-[#FAF6EE]"
                />
              </div>
              <div>
                <label className="block text-[#C8B6E2] mb-1">Pengumuman Kerajaan</label>
                <input
                  type="text"
                  value={config.announcement}
                  onChange={(e) => setConfig({ ...config, announcement: e.target.value })}
                  className="w-full rounded-lg border border-[#FAF6EE]/20 bg-[#162038] px-3 py-2 text-[#FAF6EE]"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enableCollaborativeMode}
                  onChange={(e) =>
                    setConfig({ ...config, enableCollaborativeMode: e.target.checked })
                  }
                  className="accent-[#D4AF37]"
                />
                <span>Benarkan Mod Pembelajaran Kolaboratif</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enableAdaptiveHints}
                  onChange={(e) =>
                    setConfig({ ...config, enableAdaptiveHints: e.target.checked })
                  }
                  className="accent-[#D4AF37]"
                />
                <span>Aktifkan Petunjuk Pembelajaran Adaptif</span>
              </label>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-[#D4AF37] text-[#162038] text-xs font-semibold hover:bg-[#E2C258]"
              >
                Simpan Tetapan Sistem
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
};
