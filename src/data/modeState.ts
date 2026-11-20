import { DEFAULT_SCRIPT_PLAN, STORY_FRAGMENTS } from './gameContent';
import type {
  AchievementBadge,
  AuthUser,
  LocationId,
  MissionId,
  PlayerProgress,
} from '../types/game';

const ALL_LOCATIONS: LocationId[] = ['citadel', 'library', 'woods', 'atelier', 'theatre'];

function createTemporaryBadges(): AchievementBadge[] {
  return [
    {
      id: 'ach_first_step',
      title: 'Langkah Pertama Di Kota',
      description: 'Berjaya memilih wira dan memulakan pengembaraan di Kota Diraja.',
      category: 'Penerokaan',
    },
    {
      id: 'ach_silent_chronicle',
      title: 'Penyingkap Hikayat Membisu',
      description:
        'Menyelesaikan misi kefahaman "Misi Menyelamatkan Taman Sekolah" di Pustaka Agung Hikayat Diraja.',
      category: 'Pencapaian',
    },
    {
      id: 'ach_explorer_woods',
      title: 'Pencari Serpihan Rimba',
      description: 'Menemui semua 5 serpihan kisah yang tersembunyi di Rimba Cahaya Mahkota.',
      category: 'Penerokaan',
    },
    {
      id: 'ach_timeline_master',
      title: 'Penjaga Garis Masa',
      description: 'Menyusun kronologi peristiwa cerita dari permulaan hingga penutup.',
      category: 'Pencapaian',
    },
    {
      id: 'ach_story_architect',
      title: 'Arkitek Kisah Diraja',
      description:
        'Menghasilkan rancangan penceritaan, papan cerita dan menyemak skrip bersama Mentor Bahasa AI.',
      category: 'Kreativiti',
    },
    {
      id: 'ach_voice_effort',
      title: 'Suara Yang Berani',
      description: 'Merakam cubaan pertama penceritaan lisan di Balai Gema Diraja.',
      category: 'Usaha',
    },
    {
      id: 'ach_voice_improved',
      title: 'Bintang Peningkatan Lisan',
      description: 'Merakam cubaan kedua dan menunjukkan kesungguhan memperbaiki penyampaian suara.',
      category: 'Peningkatan',
    },
    {
      id: 'ach_collaborator',
      title: 'Sahabat Sepakat',
      description: 'Menyertai Bilik Kolaborasi untuk berkongsi petunjuk dan membina kisah bersama rakan.',
      category: 'Kolaborasi',
    },
    {
      id: 'ach_final_festival',
      title: 'Pewaris Cahaya Diraja',
      description: 'Mempersembahkan video penceritaan akhir di Balairung Gemilang Diraja dan memulihkan kerajaan.',
      category: 'Pencapaian',
    },
  ];
}

function createBaseTemporaryProgress(user: AuthUser, unlockedLocations: LocationId[]): PlayerProgress {
  const now = new Date().toISOString();
  return {
    userId: `preview_${user.id}`,
    studentName: user.fullName,
    className: user.role === 'teacher' ? 'Penilai / Guru' : user.role === 'admin' ? 'Pentadbir / Penilai' : (user.className || '5 Bestari'),
    selectedHero: 'ayden',
    learningMode: 'individual',
    currentLocation: 'citadel',
    unlockedLocations,
    completedMissions: [],
    collectedFragmentIds: [],
    discoveredClues: [],
    libraryScore: 0,
    libraryAttempts: 0,
    libraryCompleted: false,
    woodsOrderedIds: ['frag-3', 'frag-1', 'frag-5', 'frag-2', 'frag-4'],
    woodsAttempts: 0,
    woodsCompleted: false,
    scriptPlan: {
      ...DEFAULT_SCRIPT_PLAN,
      storyboard: DEFAULT_SCRIPT_PLAN.storyboard.map((s) => ({ ...s })),
    },
    atelierCompleted: false,
    voiceAttempts: [],
    voiceCompleted: false,
    theatreCompleted: false,
    achievements: createTemporaryBadges(),
    adaptiveLevel: 'Standard',
    festivalUnlocked: false,
    updatedAt: now,
  };
}

/**
 * Isolated in-memory 3D preview state for educators (Guru / Pentadbir)
 * with all 5 mission locations open and session-based completion tracking.
 */
export function createEducatorPreviewProgress(user: AuthUser): PlayerProgress {
  return createBaseTemporaryProgress(user, [...ALL_LOCATIONS]);
}

/**
 * Applies a progress patch strictly in-memory for educator 3D preview sessions.
 */
export function applyEducatorPreviewPatch(
  prev: PlayerProgress,
  patch: Partial<PlayerProgress>,
): PlayerProgress {
  const now = new Date().toISOString();
  const merged: PlayerProgress = {
    ...prev,
    ...patch,
    userId: prev.userId,
    updatedAt: now,
  };

  const completed = new Set<MissionId>(merged.completedMissions);
  if (merged.libraryCompleted) completed.add('silent_chronicle');
  if (merged.woodsCompleted) completed.add('shattered_timeline');
  if (merged.atelierCompleted) completed.add('story_architect');
  if (merged.voiceCompleted) completed.add('royal_voice_trial');
  if (merged.theatreCompleted) completed.add('final_chronicle');

  const festivalUnlocked =
    completed.has('silent_chronicle') &&
    completed.has('shattered_timeline') &&
    completed.has('story_architect') &&
    completed.has('royal_voice_trial') &&
    completed.has('final_chronicle');

  const unlockMap: Record<string, boolean> = {
    ach_first_step: true,
    ach_silent_chronicle: merged.libraryCompleted,
    ach_explorer_woods: merged.collectedFragmentIds.length >= 5,
    ach_timeline_master: merged.woodsCompleted,
    ach_story_architect: merged.atelierCompleted,
    ach_voice_effort: merged.voiceAttempts.length >= 1,
    ach_voice_improved: merged.voiceAttempts.length >= 2,
    ach_collaborator: Boolean(merged.collabRoomCode),
    ach_final_festival: festivalUnlocked,
  };

  const achievements = merged.achievements.map((badge) =>
    unlockMap[badge.id] && !badge.unlockedAt ? { ...badge, unlockedAt: now } : badge,
  );

  return {
    ...merged,
    unlockedLocations: [...ALL_LOCATIONS],
    completedMissions: Array.from(completed),
    achievements,
    festivalUnlocked,
  };
}

export const ASSESSMENT_FRAGMENT_COUNT = STORY_FRAGMENTS.length;
