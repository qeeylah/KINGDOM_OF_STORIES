export type UserRole = 'student' | 'teacher' | 'admin';

export type HeroId = 'ayden' | 'elena' | 'ryan' | 'eva';

export type LocationId = 'citadel' | 'gate_hall' | 'library' | 'woods' | 'atelier' | 'theatre';

export type MissionId =
  | 'silent_chronicle'
  | 'shattered_timeline'
  | 'story_architect'
  | 'royal_voice_trial'
  | 'final_chronicle';

export type LearningMode = 'individual' | 'collaborative';

export interface HeroDefinition {
  id: HeroId;
  name: string;
  title: string;
  roleLabel: string;
  personality: string[];
  abilityName: string;
  abilityDescription: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  voicePitch: number;
}

export interface LocationDefinition {
  id: LocationId;
  name: string;
  subtitle: string;
  missionId?: MissionId;
  missionTitle?: string;
  description: string;
  portalColor: string;
  spawnPosition: [number, number, number];
}

export interface StoryFragment {
  id: string;
  orderIndex: number;
  stage: 'Permulaan' | 'Pertengahan' | 'Pengakhiran';
  title: string;
  text: string;
  hint: string;
  worldPosition: [number, number, number];
}

export interface ComprehensionQuestion {
  id: string;
  category: 'Watak' | 'Latar' | 'Peristiwa Penting' | 'Masalah Utama' | 'Penyelesaian' | 'Nilai Murni';
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  adaptiveHint: string;
}

export interface StoryboardScene {
  id: string;
  stage: 'Permulaan' | 'Perkembangan' | 'Konflik' | 'Pertengahan' | 'Pengakhiran';
  title: string;
  eventDescription?: string;
  characterDialogue?: string;
  visualDescription: string;
  narrationCue: string;
  mood: string;
}

export interface ScriptPlan {
  theme: string;
  characters: string;
  supportingCharacters?: string;
  setting: string;
  beginning: string;
  development?: string;
  middle: string;
  conflict?: string;
  ending: string;
  fullScript: string;
  storyboard: StoryboardScene[];
}

export interface LanguageFeedbackIssue {
  category:
    | 'Ejaan'
    | 'Tatabahasa'
    | 'Tanda Baca'
    | 'Struktur Ayat'
    | 'Kosa Kata'
    | 'Kejelasan'
    | 'Susunan Cerita';
  excerpt: string;
  explanation: string;
  suggestion: string;
}

export interface LanguageFeedback {
  summary: string;
  strengths: string[];
  issues: LanguageFeedbackIssue[];
  improvedScript?: string;
  adaptiveAdvice: string;
  analyzedAt: string;
}

export interface VoiceAttempt {
  attemptNumber: 1 | 2;
  mediaId: string;
  durationSeconds: number;
  recordedAt: string;
  submissionStatus?: 'Berjaya Dihantar';
  transcript: string;
  analysis?: SpeechFeedback;
}

export interface TeacherVoiceRecord {
  mediaId: string;
  studentUserId: string;
  studentName: string;
  studentUsername: string;
  className: string;
  missionNumber: 4;
  missionName: string;
  attemptNumber: 1 | 2;
  durationSeconds: number;
  recordedAt: string;
  submissionStatus: 'Berjaya Dihantar';
  mimeType: string;
  filename: string;
  sizeBytes: number;
  transcript?: string;
  clarityLevel?: string;
  estimatedWpm?: number;
}

export interface SpeechFeedback {
  transcript: string;
  analysisNotice: string;
  pronunciation: string;
  intonation: string;
  pacing: string;
  fluency: string;
  expression: string;
  clarity: string;
  strengths: string[];
  nextSteps: string[];
  estimatedWpm: number;
  clarityLevel: 'Perlu Latihan' | 'Memuaskan' | 'Baik' | 'Cemerlang';
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  category: 'Usaha' | 'Peningkatan' | 'Penerokaan' | 'Kreativiti' | 'Kolaborasi' | 'Pencapaian';
  unlockedAt?: string;
}

export interface TeacherFeedback {
  comment: string;
  ratingLabel: 'Sedang Dibimbing' | 'Memuaskan' | 'Baik' | 'Cemerlang';
  reviewedBy: string;
  reviewedAt: string;
}

export interface PlayerProgress {
  userId: string;
  studentName: string;
  className: string;
  selectedHero: HeroId;
  learningMode: LearningMode;
  collabRoomCode?: string;
  currentLocation: LocationId;
  unlockedLocations: LocationId[];
  completedMissions: MissionId[];
  collectedFragmentIds: string[];
  discoveredClues: string[];
  libraryScore: number;
  libraryAttempts: number;
  libraryCompleted: boolean;
  woodsOrderedIds: string[];
  woodsAttempts: number;
  woodsCompleted: boolean;
  scriptPlan: ScriptPlan;
  languageFeedback?: LanguageFeedback;
  atelierCompleted: boolean;
  voiceAttempts: VoiceAttempt[];
  voiceCompleted: boolean;
  finalVideoMediaId?: string;
  finalVideoTitle?: string;
  finalVideoType?: 'uploaded' | 'sample_presentation';
  finalSubmittedAt?: string;
  theatreCompleted: boolean;
  achievements: AchievementBadge[];
  adaptiveLevel: 'Sokongan Tambahan' | 'Standard' | 'Cabaran Lanjutan';
  teacherFeedback?: TeacherFeedback;
  festivalUnlocked: boolean;
  lastPlayedAt?: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  className?: string;
  isActive?: boolean;
  createdAt?: string;
  lastLoginAt?: string;
  loginCount?: number;
}

export interface PublicStudentAccount {
  id: string;
  username: string;
  fullName: string;
  className: string;
  heroId: HeroId;
}

export interface LoginLogEntry {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  role: UserRole;
  className?: string;
  action: 'login' | 'register';
  loginAt: string;
}

export type SyncStatusType = 'idle' | 'success' | 'partial' | 'failed' | 'unconfigured';

export interface GoogleSheetsSyncLog {
  id: string;
  mode: 'full' | 'incremental';
  status: SyncStatusType;
  triggeredBy: string;
  attemptedCount: number;
  successCount: number;
  failedCount: number;
  message: string;
  syncedAt: string;
}

export interface GoogleSheetsSyncStatusResponse {
  configured: boolean;
  lastSyncAt?: string;
  lastStatus: SyncStatusType;
  lastMode?: 'full' | 'incremental';
  lastMessage?: string;
  lastAttemptedCount: number;
  lastSuccessCount: number;
  lastFailedCount: number;
  pendingChangesCount: number;
  logs: GoogleSheetsSyncLog[];
}

export interface CollabMessage {
  id: string;
  authorName: string;
  heroId: HeroId;
  text: string;
  createdAt: string;
}

export interface CollabRoom {
  code: string;
  title: string;
  members: string[];
  sharedClues: string[];
  sharedFragmentNotes: Record<string, string>;
  sharedScriptDraft: string;
  messages: CollabMessage[];
  updatedAt: string;
}

export interface AdminContentConfig {
  projectTitle: string;
  storyTitle: string;
  openingNarration: string;
  enableCollaborativeMode: boolean;
  enableAdaptiveHints: boolean;
  announcement: string;
  updatedAt: string;
}

export interface AudioSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  narrationVolume: number;
  musicMuted: boolean;
  sfxMuted?: boolean;
  narrationMuted?: boolean;
  showSubtitles: boolean;
}
