import type {
  AuthUser,
  HeroId,
  PlayerProgress,
  ScriptPlan,
  TeacherVoiceRecord,
} from '../types/game';

export type MissionProgressStatus = 'Belum Bermula' | 'Sedang Berlangsung' | 'Selesai';

export type StudentEngagementStatus =
  | 'Belum Bermula'
  | 'Mula Bermain'
  | 'Sedang Melaksanakan Misi'
  | 'Tamat Kesemua 5 Misi';

export type StudentStatusFilter =
  | 'all'
  | 'not_started'
  | 'started_playing'
  | 'in_progress'
  | 'completed_all'
  | 'has_feedback'
  | 'needs_review';

export type StudentSortOption =
  | 'name_asc'
  | 'name_desc'
  | 'achievement_desc'
  | 'achievement_asc';

export interface MissionMetricSummary {
  missionNumber: 1 | 2 | 3 | 4 | 5;
  title: string;
  locationName: string;
  status: MissionProgressStatus;
  primaryMetric: string;
  secondaryDetail: string;
  hasRecord: boolean;
}

export interface StudentDashboardSummary {
  studentId: string;
  fullName: string;
  username: string;
  className: string;
  heroLabel: string;
  learningModeLabel: string;
  missions: [
    MissionMetricSummary,
    MissionMetricSummary,
    MissionMetricSummary,
    MissionMetricSummary,
    MissionMetricSummary,
  ];
  completedCount: number;
  completionPercent: number;
  hasStartedLearning: boolean;
  hasEnteredGame: boolean;
  engagementStatus: StudentEngagementStatus;
  completedAllFive: boolean;
  unlockedBadgeCount: number;
  totalBadgeCount: number;
  totalParticipations: number;
  hasTeacherFeedback: boolean;
  teacherRatingLabel: string;
  achievementScoreRank: number;
}

export interface DashboardSummaryMetrics {
  totalStudents: number;
  startedStudentsCount: number;
  startedStudentsPercent: number;
  completedAllCount: number;
  completedAllPercent: number;
  averageCompletionPercent: number;
  averageMissionsCompleted: number;
  misi1AttemptedCount: number;
  averageMisi1Score: number | null;
  totalParticipations: number;
  totalVoiceRecords: number;
}

export interface StudentFilterCriteria {
  searchQuery: string;
  classFilter: string;
  statusFilter: StudentStatusFilter;
  sortBy: StudentSortOption;
}

const HERO_LABELS: Record<HeroId, string> = {
  ayden: 'Ayden (Wira Keberanian)',
  elena: 'Elena (Srikandi Cahaya)',
  ryan: 'Ryan (Cendekiawan Rimba)',
  eva: 'Eva (Pengawal Harmoni)',
};

const DEFAULT_SCRIPT_SIGNATURES = {
  theme:
    'Pengembaraan, misteri, persahabatan, kebersihan, tanggungjawab dan kerjasama menjaga alam sekitar',
  setting:
    'Taman sekolah pada waktu pagi yang cerah selepas waktu rehat serta di sekitar bangku lama dan kolam',
  beginning:
    'Aiman, Sofia dan Danish terkejut melihat taman sekolah layu, bersampah dan berkolam keruh, lalu menemui buku misteri "Rahsia Taman Warisan" di bawah bangku lama.',
  middleLegacy:
    'Mereka mengenal pasti tiga punca kerosakan dan dengan bimbingan Cikgu Hana melaksanakan gotong-royong mengasingkan sampah, menyusun jadual siraman, dan membersihkan saliran.',
  middleCurrent:
    'Mereka membaca petunjuk di dalam buku misteri dan bersama Cikgu Hana menyenaraikan punca kerosakan taman serta merancang misi gotong-royong.',
  ending:
    'Taman sekolah kembali indah dan buku itu memancarkan cahaya keemasan dengan pesanan bahawa keindahan terpelihara melalui tanggungjawab dan kerjasama.',
  fullScript:
    'Pada suatu pagi yang cerah selepas waktu rehat, Aiman, Sofia dan Danish terkejut melihat taman sekolah mereka menjadi suram. Bunga-bunga layu, sampah bertaburan dan air kolam kelihatan keruh. Di bawah sebuah bangku lama, mereka menemui buku usang bersampul keemasan bertajuk "Rahsia Taman Warisan" yang memberi petunjuk tentang tiga punca kerosakan taman. Dengan bimbingan Cikgu Hana, mereka merancang misi gotong-royong bersama rakan-rakan. Aiman mengetuai pengasingan sampah, Sofia menyediakan jadual siraman tumbuhan, manakala Danish mengurus pembersihan saliran air bersama guru dan pekerja sekolah. Beberapa minggu kemudian, taman kembali berseri dan buku itu bercahaya dengan pesanan: keindahan terpelihara melalui tanggungjawab dan kerjasama.',
};

function norm(value?: string): string {
  return (value || '').trim();
}

export function isScriptCustomizedByStudent(scriptPlan?: ScriptPlan): boolean {
  if (!scriptPlan) return false;
  const theme = norm(scriptPlan.theme);
  const setting = norm(scriptPlan.setting);
  const beginning = norm(scriptPlan.beginning);
  const middle = norm(scriptPlan.middle);
  const ending = norm(scriptPlan.ending);
  const fullScript = norm(scriptPlan.fullScript);

  const isDefaultMiddle =
    middle === DEFAULT_SCRIPT_SIGNATURES.middleLegacy ||
    middle === DEFAULT_SCRIPT_SIGNATURES.middleCurrent;

  return (
    (theme.length > 0 && theme !== DEFAULT_SCRIPT_SIGNATURES.theme) ||
    (setting.length > 0 && setting !== DEFAULT_SCRIPT_SIGNATURES.setting) ||
    (beginning.length > 0 && beginning !== DEFAULT_SCRIPT_SIGNATURES.beginning) ||
    (middle.length > 0 && !isDefaultMiddle) ||
    (ending.length > 0 && ending !== DEFAULT_SCRIPT_SIGNATURES.ending) ||
    (fullScript.length > 0 && fullScript !== DEFAULT_SCRIPT_SIGNATURES.fullScript)
  );
}

export function formatMalayDateTime(iso?: string): string {
  if (!iso) return 'Belum Ada Rekod';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return 'Belum Ada Rekod';
  return parsed.toLocaleString('ms-MY', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function buildStudentSummary(
  user: AuthUser,
  progress: PlayerProgress,
): StudentDashboardSummary {
  const completedSet = new Set(progress.completedMissions || []);

  // Misi 1: Pustaka Agung Hikayat Diraja
  const m1Completed = Boolean(progress.libraryCompleted || completedSet.has('silent_chronicle'));
  const m1HasActivity =
    m1Completed || progress.libraryAttempts > 0 || progress.libraryScore > 0;
  const m1Status: MissionProgressStatus = m1Completed
    ? 'Selesai'
    : m1HasActivity
      ? 'Sedang Berlangsung'
      : 'Belum Bermula';
  const m1Primary = m1HasActivity ? `${progress.libraryScore}/6` : 'Belum Ada Rekod';
  const m1Secondary = m1HasActivity
    ? `${progress.libraryAttempts > 0 ? progress.libraryAttempts : m1Completed ? 1 : 0} percubaan`
    : 'Tiada percubaan direkodkan';

  // Misi 2: Rimba Cahaya Mahkota
  const fragmentsCount = (progress.collectedFragmentIds || []).length;
  const m2Completed = Boolean(progress.woodsCompleted || completedSet.has('shattered_timeline'));
  const m2HasActivity = m2Completed || fragmentsCount > 0 || progress.woodsAttempts > 0;
  const m2Status: MissionProgressStatus = m2Completed
    ? 'Selesai'
    : m2HasActivity
      ? 'Sedang Berlangsung'
      : 'Belum Bermula';
  const m2Primary = m2HasActivity ? `${fragmentsCount}/5 serpihan` : 'Belum Ada Rekod';
  const m2Secondary = m2HasActivity
    ? `${progress.woodsAttempts} cubaan susunan`
    : 'Tiada serpihan atau cubaan';

  // Misi 3: Balai Cipta Mahkota
  const m3Completed = Boolean(progress.atelierCompleted || completedSet.has('story_architect'));
  const m3HasAiFeedback = Boolean(progress.languageFeedback);
  const m3Customized = isScriptCustomizedByStudent(progress.scriptPlan);
  const m3HasActivity = m3Completed || m3HasAiFeedback || m3Customized;
  const m3Status: MissionProgressStatus = m3Completed
    ? 'Selesai'
    : m3HasActivity
      ? 'Sedang Berlangsung'
      : 'Belum Bermula';
  const m3Primary = m3HasAiFeedback
    ? `Semakan AI (${progress.languageFeedback!.issues.length} isu)`
    : m3HasActivity
      ? 'Skrip Disimpan'
      : 'Belum Ada Rekod';
  const m3Secondary = m3HasAiFeedback
    ? 'Maklum balas Mentor AI tersedia'
    : m3HasActivity
      ? 'Belum ada maklum balas AI'
      : 'Belum disunting oleh murid';

  // Misi 4: Balai Gema Diraja
  const voiceCount = (progress.voiceAttempts || []).length;
  const m4Completed = Boolean(progress.voiceCompleted || completedSet.has('royal_voice_trial'));
  const m4HasActivity = m4Completed || voiceCount > 0;
  const m4Status: MissionProgressStatus = m4Completed
    ? 'Selesai'
    : m4HasActivity
      ? 'Sedang Berlangsung'
      : 'Belum Bermula';
  const m4Primary = voiceCount > 0 ? `${voiceCount} rakaman` : 'Belum Ada Rekod';
  const m4Secondary =
    voiceCount > 0
      ? `Cubaan terkini: ${progress.voiceAttempts[voiceCount - 1].durationSeconds}s`
      : m4Completed
        ? 'Selesai tanpa lampiran audio'
        : 'Tiada rakaman suara dihantar';

  // Misi 5: Balairung Gemilang Diraja
  const m5Completed = Boolean(progress.theatreCompleted || completedSet.has('final_chronicle'));
  const m5HasSubmission = Boolean(
    progress.finalVideoMediaId || progress.finalVideoType || progress.finalSubmittedAt,
  );
  const m5HasActivity = m5Completed || m5HasSubmission;
  const m5Status: MissionProgressStatus = m5Completed
    ? 'Selesai'
    : m5HasActivity
      ? 'Sedang Berlangsung'
      : 'Belum Bermula';
  const m5Primary =
    progress.finalVideoType === 'uploaded'
      ? 'Video Dimuat Naik'
      : progress.finalVideoType === 'sample_presentation'
        ? 'Mod Papan Cerita'
        : m5Completed
          ? 'Persembahan Selesai'
          : 'Belum Ada Rekod';
  const m5Secondary = progress.finalSubmittedAt
    ? formatMalayDateTime(progress.finalSubmittedAt)
    : m5HasActivity
      ? progress.finalVideoTitle || 'Rekod penyerahan tersedia'
      : 'Tiada penyerahan akhir';

  const missions: StudentDashboardSummary['missions'] = [
    {
      missionNumber: 1,
      title: 'Misi 1 · Hikayat Membisu',
      locationName: 'Pustaka Agung Hikayat Diraja',
      status: m1Status,
      primaryMetric: m1Primary,
      secondaryDetail: m1Secondary,
      hasRecord: m1HasActivity,
    },
    {
      missionNumber: 2,
      title: 'Misi 2 · Garis Masa Terlerai',
      locationName: 'Rimba Cahaya Mahkota',
      status: m2Status,
      primaryMetric: m2Primary,
      secondaryDetail: m2Secondary,
      hasRecord: m2HasActivity,
    },
    {
      missionNumber: 3,
      title: 'Misi 3 · Arkitek Kisah',
      locationName: 'Balai Cipta Mahkota',
      status: m3Status,
      primaryMetric: m3Primary,
      secondaryDetail: m3Secondary,
      hasRecord: m3HasActivity,
    },
    {
      missionNumber: 4,
      title: 'Misi 4 · Ujian Suara Diraja',
      locationName: 'Balai Gema Diraja',
      status: m4Status,
      primaryMetric: m4Primary,
      secondaryDetail: m4Secondary,
      hasRecord: m4HasActivity,
    },
    {
      missionNumber: 5,
      title: 'Misi 5 · Persembahan Akhir',
      locationName: 'Balairung Gemilang Diraja',
      status: m5Status,
      primaryMetric: m5Primary,
      secondaryDetail: m5Secondary,
      hasRecord: m5HasActivity,
    },
  ];

  const completedCount = missions.filter((m) => m.status === 'Selesai').length;
  const completionPercent = Math.round((completedCount / 5) * 100);
  const hasStartedLearning = missions.some((m) => m.status !== 'Belum Bermula');
  const completedAllFive = completedCount === 5;
  const hasEnteredGame = Boolean(
    hasStartedLearning ||
      progress.lastPlayedAt ||
      user.lastLoginAt ||
      (user.loginCount ?? 0) > 0,
  );
  const engagementStatus: StudentEngagementStatus = completedAllFive
    ? 'Tamat Kesemua 5 Misi'
    : hasStartedLearning
      ? 'Sedang Melaksanakan Misi'
      : hasEnteredGame
        ? 'Mula Bermain'
        : 'Belum Bermula';
  const unlockedBadgeCount = (progress.achievements || []).filter((a) => Boolean(a.unlockedAt)).length;
  const totalBadgeCount = (progress.achievements || []).length;

  // Real mission participations/attempts recorded across all 5 missions
  const m1Participations = progress.libraryAttempts > 0 ? progress.libraryAttempts : m1HasActivity ? 1 : 0;
  const m2Participations =
    progress.woodsAttempts > 0 ? progress.woodsAttempts : fragmentsCount > 0 || m2Completed ? 1 : 0;
  const m3Participations = m3HasActivity ? 1 : 0;
  const m4Participations = voiceCount > 0 ? voiceCount : m4Completed ? 1 : 0;
  const m5Participations = m5HasActivity ? 1 : 0;
  const totalParticipations =
    m1Participations + m2Participations + m3Participations + m4Participations + m5Participations;

  const fullName = norm(user.fullName) || norm(progress.studentName) || user.username;
  const className = norm(progress.className || user.className) || 'Belum Ada Rekod';
  const hasTeacherFeedback = Boolean(progress.teacherFeedback?.comment);
  const teacherRatingLabel = progress.teacherFeedback?.ratingLabel || 'Belum Dinilai';

  // Deterministic ranking score based strictly on real persisted progress
  const achievementScoreRank =
    completedCount * 1000 +
    progress.libraryScore * 50 +
    fragmentsCount * 20 +
    voiceCount * 15 +
    unlockedBadgeCount * 5;

  return {
    studentId: user.id,
    fullName,
    username: user.username,
    className,
    heroLabel: HERO_LABELS[progress.selectedHero] || progress.selectedHero,
    learningModeLabel: progress.learningMode === 'collaborative' ? 'Kolaboratif' : 'Individu',
    missions,
    completedCount,
    completionPercent,
    hasStartedLearning,
    hasEnteredGame,
    engagementStatus,
    completedAllFive,
    unlockedBadgeCount,
    totalBadgeCount,
    totalParticipations,
    hasTeacherFeedback,
    teacherRatingLabel,
    achievementScoreRank,
  };
}

export function computeDashboardMetrics(
  summaries: StudentDashboardSummary[],
  rawStudents: Array<{ user: AuthUser; progress: PlayerProgress }>,
  voiceRecords: TeacherVoiceRecord[],
): DashboardSummaryMetrics {
  const totalStudents = summaries.length;
  if (totalStudents === 0) {
    return {
      totalStudents: 0,
      startedStudentsCount: 0,
      startedStudentsPercent: 0,
      completedAllCount: 0,
      completedAllPercent: 0,
      averageCompletionPercent: 0,
      averageMissionsCompleted: 0,
      misi1AttemptedCount: 0,
      averageMisi1Score: null,
      totalParticipations: 0,
      totalVoiceRecords: voiceRecords.length,
    };
  }

  const startedStudentsCount = summaries.filter((s) => s.hasStartedLearning).length;
  const completedAllCount = summaries.filter((s) => s.completedAllFive).length;
  const totalCompletionPercent = summaries.reduce((acc, s) => acc + s.completionPercent, 0);
  const totalCompletedMissions = summaries.reduce((acc, s) => acc + s.completedCount, 0);
  const totalParticipations = summaries.reduce((acc, s) => acc + s.totalParticipations, 0);

  const m1Attempted = rawStudents.filter(
    ({ progress }) =>
      progress.libraryCompleted ||
      (progress.completedMissions || []).includes('silent_chronicle') ||
      progress.libraryAttempts > 0 ||
      progress.libraryScore > 0,
  );
  const averageMisi1Score =
    m1Attempted.length > 0
      ? Number(
          (
            m1Attempted.reduce((acc, { progress }) => acc + progress.libraryScore, 0) /
            m1Attempted.length
          ).toFixed(1),
        )
      : null;

  return {
    totalStudents,
    startedStudentsCount,
    startedStudentsPercent: Math.round((startedStudentsCount / totalStudents) * 100),
    completedAllCount,
    completedAllPercent: Math.round((completedAllCount / totalStudents) * 100),
    averageCompletionPercent: Math.round(totalCompletionPercent / totalStudents),
    averageMissionsCompleted: Number((totalCompletedMissions / totalStudents).toFixed(1)),
    misi1AttemptedCount: m1Attempted.length,
    averageMisi1Score,
    totalParticipations,
    totalVoiceRecords: voiceRecords.length,
  };
}

export function extractDistinctClasses(summaries: StudentDashboardSummary[]): string[] {
  const unique = new Set<string>();
  for (const s of summaries) {
    if (s.className && s.className !== 'Belum Ada Rekod') {
      unique.add(s.className);
    }
  }
  return Array.from(unique).sort((a, b) => a.localeCompare(b, 'ms'));
}

export function filterAndSortStudents<
  T extends { user: AuthUser; progress: PlayerProgress; summary: StudentDashboardSummary },
>(items: T[], criteria: StudentFilterCriteria): T[] {
  const query = criteria.searchQuery.trim().toLowerCase();

  const filtered = items.filter(({ user, progress, summary }) => {
    if (query) {
      const haystack = `${user.fullName} ${user.username} ${progress.studentName}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    if (criteria.classFilter !== 'ALL' && summary.className !== criteria.classFilter) {
      return false;
    }

    switch (criteria.statusFilter) {
      case 'not_started':
        if (summary.engagementStatus !== 'Belum Bermula') return false;
        break;
      case 'started_playing':
        if (summary.engagementStatus !== 'Mula Bermain') return false;
        break;
      case 'in_progress':
        if (summary.engagementStatus !== 'Sedang Melaksanakan Misi') return false;
        break;
      case 'completed_all':
        if (!summary.completedAllFive) return false;
        break;
      case 'has_feedback':
        if (!summary.hasTeacherFeedback) return false;
        break;
      case 'needs_review':
        if (summary.hasTeacherFeedback) return false;
        break;
      case 'all':
      default:
        break;
    }

    return true;
  });

  const sorted = [...filtered];
  sorted.sort((a, b) => {
    switch (criteria.sortBy) {
      case 'name_desc':
        return b.summary.fullName.localeCompare(a.summary.fullName, 'ms');
      case 'achievement_desc':
        if (b.summary.achievementScoreRank !== a.summary.achievementScoreRank) {
          return b.summary.achievementScoreRank - a.summary.achievementScoreRank;
        }
        return a.summary.fullName.localeCompare(b.summary.fullName, 'ms');
      case 'achievement_asc':
        if (a.summary.achievementScoreRank !== b.summary.achievementScoreRank) {
          return a.summary.achievementScoreRank - b.summary.achievementScoreRank;
        }
        return a.summary.fullName.localeCompare(b.summary.fullName, 'ms');
      case 'name_asc':
      default:
        return a.summary.fullName.localeCompare(b.summary.fullName, 'ms');
    }
  });

  return sorted;
}
