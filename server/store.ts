import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  AchievementBadge,
  AdminContentConfig,
  AuthUser,
  CollabRoom,
  GoogleSheetsSyncLog,
  HeroId,
  LocationId,
  LoginLogEntry,
  MissionId,
  PlayerProgress,
  PublicStudentAccount,
  SyncStatusType,
  TeacherFeedback,
  TeacherVoiceRecord,
  UserRole,
} from '../src/types/game.ts';

export interface StoredUser extends AuthUser {
  passwordHash: string;
  passwordSalt: string;
  isActive?: boolean;
  createdAt: string;
  lastLoginAt?: string;
  loginCount?: number;
}

export interface StoredMedia {
  id: string;
  ownerUserId: string;
  kind: 'audio' | 'video';
  mimeType: string;
  filename: string;
  filePath: string;
  sizeBytes: number;
  missionNumber?: number;
  attemptNumber?: number;
  createdAt: string;
}

export interface PersistedGoogleSheetsSyncState {
  lastSyncAt?: string;
  lastStatus: SyncStatusType;
  lastMode?: 'full' | 'incremental';
  lastMessage?: string;
  lastAttemptedCount: number;
  lastSuccessCount: number;
  lastFailedCount: number;
  syncedRecordHashes: Record<string, string>;
  logs: GoogleSheetsSyncLog[];
}

interface DatabaseSchema {
  users: StoredUser[];
  progressByUserId: Record<string, PlayerProgress>;
  mediaById: Record<string, StoredMedia>;
  collabRooms: Record<string, CollabRoom>;
  adminConfig: AdminContentConfig;
  loginLogs?: LoginLogEntry[];
  googleSheetsSync?: PersistedGoogleSheetsSyncState;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_PATH = path.join(DATA_DIR, 'kingdom-db.json');

function ensureStorageDirs(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

export function hashPassword(password: string, existingSalt?: string): { hash: string; salt: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  const hashBuf = Buffer.from(hash, 'hex');
  const derivedBuf = Buffer.from(derived, 'hex');
  if (hashBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(hashBuf, derivedBuf);
}

function createDefaultAchievements(): AchievementBadge[] {
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
      description: 'Menyelesaikan misi kefahaman "Misi Menyelamatkan Taman Sekolah" di Perpustakaan Terselubung.',
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
      description: 'Menghasilkan rancangan penceritaan, papan cerita dan menyemak skrip bersama Mentor Bahasa AI.',
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

export function createInitialProgress(user: AuthUser): PlayerProgress {
  const now = new Date().toISOString();
  const achievements = createDefaultAchievements();
  achievements[0].unlockedAt = now;

  return {
    userId: user.id,
    studentName: user.fullName,
    className: user.className || '5 Bestari',
    selectedHero: 'ayden',
    learningMode: 'individual',
    currentLocation: 'citadel',
    unlockedLocations: ['citadel', 'library', 'woods', 'atelier', 'theatre'],
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
      theme: 'Pengembaraan, misteri, persahabatan, kebersihan, tanggungjawab dan kerjasama menjaga alam sekitar',
      characters: 'Pencerita, Aiman (berani) dan Sofia (bijak & teliti)',
      supportingCharacters: 'Danish (kreatif), Cikgu Hana (guru prihatin) dan pekerja sekolah',
      setting: 'Taman sekolah pada waktu pagi yang cerah selepas waktu rehat serta di sekitar bangku lama dan kolam',
      beginning:
        'Aiman, Sofia dan Danish terkejut melihat taman sekolah layu, bersampah dan berkolam keruh, lalu menemui buku misteri "Rahsia Taman Warisan" di bawah bangku lama.',
      development:
        'Mereka membaca petunjuk di dalam buku misteri dan bersama Cikgu Hana menyenaraikan punca kerosakan taman serta merancang misi gotong-royong.',
      middle:
        'Mereka membaca petunjuk di dalam buku misteri dan bersama Cikgu Hana menyenaraikan punca kerosakan taman serta merancang misi gotong-royong.',
      conflict:
        'Saliran air kolam tersumbat teruk, tanaman kekurangan air, dan mereka perlu menyiapkan pemulihan taman sebelum minggu penilaian sekolah.',
      ending:
        'Taman sekolah kembali indah dan buku itu memancarkan cahaya keemasan dengan pesanan bahawa keindahan terpelihara melalui tanggungjawab dan kerjasama.',
      fullScript:
        'Pada suatu pagi yang cerah selepas waktu rehat, Aiman, Sofia dan Danish terkejut melihat taman sekolah mereka menjadi suram. Bunga-bunga layu, sampah bertaburan dan air kolam kelihatan keruh. Di bawah sebuah bangku lama, mereka menemui buku usang bersampul keemasan bertajuk "Rahsia Taman Warisan" yang memberi petunjuk tentang tiga punca kerosakan taman. Dengan bimbingan Cikgu Hana, mereka merancang misi gotong-royong bersama rakan-rakan. Aiman mengetuai pengasingan sampah, Sofia menyediakan jadual siraman tumbuhan, manakala Danish mengurus pembersihan saliran air bersama guru dan pekerja sekolah. Beberapa minggu kemudian, taman kembali berseri dan buku itu bercahaya dengan pesanan: keindahan terpelihara melalui tanggungjawab dan kerjasama.',
      storyboard: [
        {
          id: 'sb-1',
          stage: 'Permulaan',
          title: 'Babak 1 · Misteri Di Sebalik Taman',
          eventDescription:
            'Aiman, Sofia dan Danish tiba di taman sekolah yang suram lalu menemui buku misteri "Rahsia Taman Warisan" di bawah bangku lama.',
          characterDialogue: '"Mengapa taman sekolah kita menjadi layu dan bersepah begini?" tanya Aiman dengan hairan.',
          visualDescription:
            'Aiman, Sofia dan Danish di taman sekolah yang layu dan bersampah, lalu menemui buku "Rahsia Taman Warisan" di bawah bangku lama.',
          narrationCue: 'Mulakan dengan suasana pagi yang tenang, diikuti nada hairan apabila melihat keadaan taman.',
          mood: 'Misteri dan ingin tahu',
        },
        {
          id: 'sb-2',
          stage: 'Perkembangan',
          title: 'Babak 2 · Petunjuk Yang Tersembunyi',
          eventDescription:
            'Sofia membaca tulisan bercahaya di dalam buku sementara Cikgu Hana membimbing mereka mengenal pasti tiga punca kerosakan.',
          characterDialogue: '"Lihat! Buku ini menunjukkan tiga punca utama kerosakan taman kita," kata Sofia.',
          visualDescription:
            'Sofia membaca tulisan bercahaya di dalam buku sementara Cikgu Hana membimbing mereka mengenal pasti tiga punca kerosakan.',
          narrationCue: 'Tekankan dialog penemuan tiga masalah dengan jelas dan teratur.',
          mood: 'Penuh kesungguhan',
        },
        {
          id: 'sb-3',
          stage: 'Konflik',
          title: 'Babak 3 · Misi Menyelamatkan Taman',
          eventDescription:
            'Mereka berdepan cabaran saliran air tersumbat sebelum bergotong-royong mengasingkan sampah, menyusun jadual siraman dan membersihkan saliran.',
          characterDialogue: '"Mari kita berganding bahu membersihkan saliran dan taman ini bersama-sama!" seru Danish.',
          visualDescription:
            'Aktiviti gotong-royong mengasingkan sampah, jadual siraman Sofia, dan pembersihan saliran oleh Danish bersama pekerja sekolah.',
          narrationCue: 'Gunakan nada bersemangat dan ceria mengiringi rentak kerja berpasukan.',
          mood: 'Bersemangat dan sepakat',
        },
        {
          id: 'sb-4',
          stage: 'Pengakhiran',
          title: 'Babak 4 · Keajaiban Sebuah Kerjasama',
          eventDescription:
            'Taman kembali mekar dengan kolam yang jernih manakala buku keemasan memancarkan pesanan tentang tanggungjawab.',
          characterDialogue: '"Syabas semua! Kerjasama kita telah mengembalikan seri taman sekolah," ujar Cikgu Hana.',
          visualDescription:
            'Taman kembali mekar dengan kolam jernih manakala buku keemasan memancarkan pesanan tentang tanggungjawab dan kerjasama.',
          narrationCue: 'Akhiri dengan intonasi hangat, bangga dan jelas pada mesej penutup.',
          mood: 'Ceria, bangga dan menginspirasikan',
        },
      ],
    },
    atelierCompleted: false,
    voiceAttempts: [],
    voiceCompleted: false,
    theatreCompleted: false,
    achievements,
    adaptiveLevel: 'Standard',
    festivalUnlocked: false,
    updatedAt: now,
  };
}

function createSeedDatabase(): DatabaseSchema {
  const now = new Date().toISOString();
  const s1Pwd = hashPassword('pelajar123');
  const s2Pwd = hashPassword('pelajar123');
  const tPwd = hashPassword('guru123');
  const aPwd = hashPassword('admin123');

  const student1: StoredUser = {
    id: 'usr_student_1',
    username: 'pelajar1',
    fullName: 'Nurul Aisyah binti Razak',
    role: 'student',
    className: '5 Bestari',
    passwordHash: s1Pwd.hash,
    passwordSalt: s1Pwd.salt,
    createdAt: now,
  };

  const student2: StoredUser = {
    id: 'usr_student_2',
    username: 'pelajar2',
    fullName: 'Muhammad Danish bin Hakim',
    role: 'student',
    className: '5 Bestari',
    passwordHash: s2Pwd.hash,
    passwordSalt: s2Pwd.salt,
    createdAt: now,
  };

  const teacher1: StoredUser = {
    id: 'usr_teacher_1',
    username: 'guru1',
    fullName: 'Cikgu Farah Wahida binti Ismail',
    role: 'teacher',
    className: '5 Bestari',
    passwordHash: tPwd.hash,
    passwordSalt: tPwd.salt,
    createdAt: now,
  };

  const admin1: StoredUser = {
    id: 'usr_admin_1',
    username: 'admin1',
    fullName: 'Pentadbir Sistem Diraja',
    role: 'admin',
    passwordHash: aPwd.hash,
    passwordSalt: aPwd.salt,
    createdAt: now,
  };

  const p1 = createInitialProgress(student1);
  const p2 = createInitialProgress(student2);
  p2.selectedHero = 'elena';
  p2.completedMissions = ['silent_chronicle'];
  p2.libraryCompleted = true;
  p2.libraryScore = 5;
  p2.unlockedLocations = ['citadel', 'library', 'woods', 'atelier', 'theatre'];
  p2.achievements = p2.achievements.map((a) =>
    a.id === 'ach_silent_chronicle' ? { ...a, unlockedAt: now } : a,
  );

  return {
    users: [student1, student2, teacher1, admin1],
    progressByUserId: {
      [student1.id]: p1,
      [student2.id]: p2,
    },
    mediaById: {},
    collabRooms: {
      'TAMAN-01': {
        code: 'TAMAN-01',
        title: 'Pasukan Harmoni 5 Bestari',
        members: [student1.fullName, student2.fullName],
        sharedClues: [
          'Watak utama kisah ialah Aiman, Sofia, Danish dan Cikgu Hana, serta buku misteri "Rahsia Taman Warisan".',
        ],
        sharedFragmentNotes: {
          'frag-1': 'Berlaku selepas waktu rehat; bunga layu, sampah bertaburan dan air kolam keruh.',
        },
        sharedScriptDraft:
          'Pada suatu pagi yang cerah, Aiman, Sofia dan Danish menuju ke taman sekolah dan menemui buku misteri "Rahsia Taman Warisan" yang mendedahkan tiga punca kerosakan taman.',
        messages: [
          {
            id: 'msg-seed-1',
            authorName: student2.fullName,
            heroId: 'elena',
            text: 'Saya telah meneliti manuskrip di Perpustakaan Terselubung. Tiga punca kerosakan ialah sampah merata-rata, pokok tidak disiram dan saliran air tersumbat!',
            createdAt: now,
          },
        ],
        updatedAt: now,
      },
    },
    adminConfig: {
      projectTitle: 'Kingdom of Stories: The Veil of Forgotten Chronicles',
      storyTitle: 'Misi Menyelamatkan Taman Sekolah',
      openingNarration:
        'Di sebuah kerajaan yang dibina atas ribuan kisah, sejarah bukan sekadar catatan. Setiap helaian menyimpan kenangan, perjuangan dan warisan yang diwariskan dari satu generasi ke generasi seterusnya.',
      enableCollaborativeMode: true,
      enableAdaptiveHints: true,
      announcement:
        'Selamat datang ke tugasan penceritaan digital: Misi Menyelamatkan Taman Sekolah. Lengkapkan kelima-lima misi untuk menyalakan semula Festival Cahaya Diraja.',
      updatedAt: now,
    },
  };
}

class KingdomDatabase {
  private data: DatabaseSchema;

  constructor() {
    ensureStorageDirs();
    if (fs.existsSync(DB_PATH)) {
      try {
        const raw = fs.readFileSync(DB_PATH, 'utf-8');
        this.data = JSON.parse(raw) as DatabaseSchema;
        let migrated = false;
        const allLocs: LocationId[] = ['citadel', 'library', 'woods', 'atelier', 'theatre'];
        Object.values(this.data.progressByUserId || {}).forEach((prog) => {
          const currentLocs = prog.unlockedLocations || [];
          if (allLocs.some((loc) => !currentLocs.includes(loc))) {
            prog.unlockedLocations = Array.from(new Set([...currentLocs, ...allLocs]));
            migrated = true;
          }
          if (prog.currentLocation === 'gate_hall') {
            prog.currentLocation = 'citadel';
            migrated = true;
          }
          prog.achievements?.forEach((ach) => {
            if (ach.id === 'ach_voice_effort' && /Kamar Suara/i.test(ach.description)) {
              ach.description = 'Merakam cubaan pertama penceritaan lisan di Balai Gema Diraja.';
              migrated = true;
            }
            if (ach.id === 'ach_final_festival' && /Teater Agung/i.test(ach.description)) {
              ach.description = 'Mempersembahkan video penceritaan akhir di Balairung Gemilang Diraja dan memulihkan kerajaan.';
              migrated = true;
            }
          });
        });
        if (migrated) this.save();
      } catch {
        this.data = createSeedDatabase();
        this.save();
      }
    } else {
      this.data = createSeedDatabase();
      this.save();
    }
  }

  private save(): void {
    ensureStorageDirs();
    fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  findUserByUsername(username: string): StoredUser | undefined {
    const clean = username.trim().toLowerCase();
    return this.data.users.find((u) => u.username.toLowerCase() === clean);
  }

  findUserById(id: string): StoredUser | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  private normalizeRole(role: unknown): UserRole {
    const clean = String(role || '').trim().toLowerCase();
    if (clean === 'teacher' || clean === 'guru') return 'teacher';
    if (clean === 'admin' || clean === 'pentadbir') return 'admin';
    return 'student';
  }

  sanitizeUser(user: StoredUser): AuthUser {
    const existingProg = this.data.progressByUserId?.[user.id];
    const resolvedFullName =
      (user.fullName || '').trim() ||
      (existingProg?.studentName || '').trim() ||
      user.username;
    return {
      id: user.id,
      username: user.username,
      fullName: resolvedFullName,
      role: this.normalizeRole(user.role),
      className: (user.className || existingProg?.className || '').trim() || undefined,
      isActive: user.isActive !== false,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      loginCount: user.loginCount ?? 0,
    };
  }

  createUser(params: {
    username: string;
    fullName: string;
    password: string;
    role: UserRole;
    className?: string;
  }): AuthUser {
    const existing = this.findUserByUsername(params.username);
    if (existing) {
      throw new Error('Nama pengguna sudah didaftarkan.');
    }
    const { hash, salt } = hashPassword(params.password);
    const normalizedRole = this.normalizeRole(params.role);
    const user: StoredUser = {
      id: `usr_${crypto.randomBytes(6).toString('hex')}`,
      username: params.username.trim(),
      fullName: params.fullName.trim(),
      role: normalizedRole,
      className: params.className?.trim() || (normalizedRole === 'student' ? '5 Bestari' : undefined),
      isActive: true,
      passwordHash: hash,
      passwordSalt: salt,
      createdAt: new Date().toISOString(),
    };
    this.data.users.push(user);
    if (user.role === 'student') {
      this.data.progressByUserId[user.id] = createInitialProgress(user);
    }
    this.save();
    return this.sanitizeUser(user);
  }

  listUsers(): AuthUser[] {
    return this.data.users.map((u) => this.sanitizeUser(u));
  }

  listPublicStudentAccounts(): PublicStudentAccount[] {
    return this.listUsers()
      .filter((u) => u.role === 'student' && u.isActive !== false)
      .map((u) => {
        const prog = this.data.progressByUserId?.[u.id];
        return {
          id: u.id,
          username: u.username,
          fullName: u.fullName,
          className: u.className || prog?.className || '5 Bestari',
          heroId: prog?.selectedHero || 'ayden',
        };
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'ms'));
  }

  setUserActiveStatus(userId: string, isActive: boolean): AuthUser {
    const user = this.findUserById(userId);
    if (!user) {
      throw new Error('Pengguna tidak ditemui.');
    }
    user.isActive = Boolean(isActive);
    this.save();
    return this.sanitizeUser(user);
  }

  updateUserRole(userId: string, role: UserRole, className?: string): AuthUser {
    const user = this.findUserById(userId);
    if (!user) {
      throw new Error('Pengguna tidak ditemui.');
    }
    user.role = this.normalizeRole(role);
    if (className !== undefined) {
      user.className = className.trim() || undefined;
    }
    if (user.role === 'student') {
      this.getOrCreateProgress(user.id);
    }
    this.save();
    return this.sanitizeUser(user);
  }

  recordLogin(userId: string, action: 'login' | 'register'): LoginLogEntry | null {
    const user = this.findUserById(userId);
    if (!user) return null;
    const now = new Date().toISOString();
    user.lastLoginAt = now;
    user.loginCount = (user.loginCount ?? 0) + 1;

    const entry: LoginLogEntry = {
      id: `log_${crypto.randomBytes(6).toString('hex')}`,
      userId: user.id,
      username: user.username,
      fullName: (user.fullName || '').trim() || user.username,
      role: this.normalizeRole(user.role),
      className: user.className,
      action,
      loginAt: now,
    };
    if (!Array.isArray(this.data.loginLogs)) {
      this.data.loginLogs = [];
    }
    this.data.loginLogs.push(entry);
    if (this.data.loginLogs.length > 500) {
      this.data.loginLogs = this.data.loginLogs.slice(-500);
    }
    if (this.normalizeRole(user.role) === 'student' && !this.data.progressByUserId[user.id]) {
      this.data.progressByUserId[user.id] = createInitialProgress(this.sanitizeUser(user));
    }
    this.save();
    return entry;
  }

  listLoginLogs(limit = 300): LoginLogEntry[] {
    const logs = Array.isArray(this.data.loginLogs) ? this.data.loginLogs : [];
    return logs.slice(-limit);
  }

  getOrCreateProgress(userId: string): PlayerProgress {
    const user = this.findUserById(userId);
    if (!user) {
      throw new Error('Pengguna tidak ditemui.');
    }
    const sanitized = this.sanitizeUser(user);
    const existing = this.data.progressByUserId[userId];
    if (!existing) {
      this.data.progressByUserId[userId] = createInitialProgress(sanitized);
      this.save();
      return this.data.progressByUserId[userId];
    }

    // Repair and synchronize any missing fields or mismatched student identity metadata
    const defaults = createInitialProgress(sanitized);
    let needsSave = false;
    const syncedName = sanitized.fullName;
    const syncedClass =
      (existing.className || '').trim() || sanitized.className || '5 Bestari';

    if (
      existing.userId !== user.id ||
      existing.studentName !== syncedName ||
      !existing.className ||
      !existing.scriptPlan ||
      !Array.isArray(existing.achievements) ||
      !Array.isArray(existing.completedMissions) ||
      !Array.isArray(existing.collectedFragmentIds) ||
      !Array.isArray(existing.voiceAttempts)
    ) {
      needsSave = true;
    }

    const normalized: PlayerProgress = this.recomputeUnlocksAndBadges({
      ...defaults,
      ...existing,
      userId: user.id,
      studentName: syncedName,
      className: syncedClass,
      unlockedLocations: Array.isArray(existing.unlockedLocations)
        ? existing.unlockedLocations
        : defaults.unlockedLocations,
      completedMissions: Array.isArray(existing.completedMissions)
        ? existing.completedMissions
        : [],
      collectedFragmentIds: Array.isArray(existing.collectedFragmentIds)
        ? existing.collectedFragmentIds
        : [],
      discoveredClues: Array.isArray(existing.discoveredClues)
        ? existing.discoveredClues
        : [],
      woodsOrderedIds: Array.isArray(existing.woodsOrderedIds)
        ? existing.woodsOrderedIds
        : defaults.woodsOrderedIds,
      scriptPlan: existing.scriptPlan || defaults.scriptPlan,
      voiceAttempts: Array.isArray(existing.voiceAttempts) ? existing.voiceAttempts : [],
      achievements:
        Array.isArray(existing.achievements) && existing.achievements.length > 0
          ? existing.achievements
          : defaults.achievements,
    });

    if (needsSave) {
      this.data.progressByUserId[userId] = normalized;
      this.save();
    } else {
      this.data.progressByUserId[userId] = normalized;
    }
    return this.data.progressByUserId[userId];
  }

  updateProgress(userId: string, patch: Partial<PlayerProgress>): PlayerProgress {
    const user = this.findUserById(userId);
    if (!user) {
      throw new Error('Pengguna tidak ditemui.');
    }
    const current = this.getOrCreateProgress(userId);
    const now = new Date().toISOString();
    const resolvedClassName =
      (typeof patch.className === 'string' && patch.className.trim()) ||
      current.className ||
      user.className ||
      '5 Bestari';

    const merged: PlayerProgress = {
      ...current,
      ...patch,
      userId: user.id,
      studentName: (user.fullName || '').trim() || current.studentName || user.username,
      className: resolvedClassName,
      teacherFeedback: current.teacherFeedback, // Students cannot overwrite teacher feedback
      lastPlayedAt: now,
      updatedAt: now,
    };
    this.data.progressByUserId[userId] = this.recomputeUnlocksAndBadges(merged);
    this.save();
    return this.data.progressByUserId[userId];
  }

  private recomputeUnlocksAndBadges(p: PlayerProgress): PlayerProgress {
    const now = new Date().toISOString();
    const unlocked = new Set<LocationId>([
      'citadel',
      'library',
      'woods',
      'atelier',
      'theatre',
      ...(Array.isArray(p.unlockedLocations) ? p.unlockedLocations : []),
    ]);
    const completed = new Set<MissionId>(
      Array.isArray(p.completedMissions) ? p.completedMissions : [],
    );

    const libraryCompleted = Boolean(p.libraryCompleted || completed.has('silent_chronicle'));
    const woodsCompleted = Boolean(p.woodsCompleted || completed.has('shattered_timeline'));
    const atelierCompleted = Boolean(p.atelierCompleted || completed.has('story_architect'));
    const voiceCompleted = Boolean(p.voiceCompleted);
    const theatreCompleted = Boolean(p.theatreCompleted);

    if (libraryCompleted) completed.add('silent_chronicle');
    if (woodsCompleted) completed.add('shattered_timeline');
    if (atelierCompleted) completed.add('story_architect');
    if (voiceCompleted) {
      completed.add('royal_voice_trial');
    } else {
      completed.delete('royal_voice_trial');
    }
    if (theatreCompleted) {
      completed.add('final_chronicle');
    } else {
      completed.delete('final_chronicle');
    }

    const festivalUnlocked =
      completed.has('silent_chronicle') &&
      completed.has('shattered_timeline') &&
      completed.has('story_architect') &&
      completed.has('royal_voice_trial') &&
      completed.has('final_chronicle');

    const collectedCount = Array.isArray(p.collectedFragmentIds)
      ? p.collectedFragmentIds.length
      : 0;
    const voiceCount = Array.isArray(p.voiceAttempts) ? p.voiceAttempts.length : 0;

    const unlockMap: Record<string, boolean> = {
      ach_first_step: true,
      ach_silent_chronicle: libraryCompleted,
      ach_explorer_woods: collectedCount >= 5,
      ach_timeline_master: woodsCompleted,
      ach_story_architect: atelierCompleted,
      ach_voice_effort: voiceCount >= 1,
      ach_voice_improved: voiceCount >= 2,
      ach_collaborator: Boolean(p.collabRoomCode),
      ach_final_festival: festivalUnlocked,
    };

    const baseAchievements =
      Array.isArray(p.achievements) && p.achievements.length > 0
        ? p.achievements
        : createDefaultAchievements();

    const achievements = baseAchievements.map((badge) => {
      if (unlockMap[badge.id] && !badge.unlockedAt) {
        return { ...badge, unlockedAt: now };
      }
      return badge;
    });

    return {
      ...p,
      libraryCompleted,
      woodsCompleted,
      atelierCompleted,
      voiceCompleted,
      theatreCompleted,
      unlockedLocations: Array.from(unlocked),
      completedMissions: Array.from(completed),
      achievements,
      festivalUnlocked,
    };
  }

  listStudentProgressForTeacher(): Array<{ user: AuthUser; progress: PlayerProgress }> {
    return this.data.users
      .filter((u) => this.normalizeRole(u.role) === 'student')
      .map((u) => {
        const progress = this.getOrCreateProgress(u.id);
        const user = this.sanitizeUser(u);
        return {
          user,
          progress,
        };
      });
  }

  setTeacherFeedback(studentUserId: string, feedback: TeacherFeedback): PlayerProgress {
    const progress = this.getOrCreateProgress(studentUserId);
    progress.teacherFeedback = feedback;
    progress.updatedAt = new Date().toISOString();
    this.save();
    return progress;
  }

  listVoiceSubmissionsForTeacher(): TeacherVoiceRecord[] {
    const records: TeacherVoiceRecord[] = [];
    for (const user of this.data.users) {
      if (user.role !== 'student') continue;
      const progress = this.getOrCreateProgress(user.id);
      for (const attempt of progress.voiceAttempts) {
        const media = this.data.mediaById[attempt.mediaId];
        if (!media || !fs.existsSync(media.filePath)) continue;
        records.push({
          mediaId: attempt.mediaId,
          studentUserId: user.id,
          studentName: user.fullName,
          studentUsername: user.username,
          className: progress.className || user.className || '5 Bestari',
          missionNumber: 4,
          missionName: 'Misi 4: Balai Gema Diraja',
          attemptNumber: attempt.attemptNumber,
          durationSeconds: attempt.durationSeconds,
          recordedAt: attempt.recordedAt || media.createdAt,
          submissionStatus: attempt.submissionStatus || 'Berjaya Dihantar',
          mimeType: media.mimeType,
          filename: media.filename,
          sizeBytes: media.sizeBytes,
          transcript: attempt.transcript,
          clarityLevel: attempt.analysis?.clarityLevel,
          estimatedWpm: attempt.analysis?.estimatedWpm,
        });
      }
    }
    return records.sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
    );
  }

  saveMediaFile(params: {
    ownerUserId: string;
    kind: 'audio' | 'video';
    mimeType: string;
    filename: string;
    buffer: Buffer;
    missionNumber?: number;
    attemptNumber?: number;
  }): StoredMedia {
    ensureStorageDirs();
    const id = `med_${crypto.randomBytes(8).toString('hex')}`;
    const ext = params.filename.includes('.')
      ? params.filename.slice(params.filename.lastIndexOf('.'))
      : params.kind === 'audio'
        ? '.webm'
        : '.mp4';
    const safeFileName = `${id}${ext.replace(/[^a-zA-Z0-9.]/g, '')}`;
    const filePath = path.join(UPLOADS_DIR, safeFileName);
    fs.writeFileSync(filePath, params.buffer);

    const record: StoredMedia = {
      id,
      ownerUserId: params.ownerUserId,
      kind: params.kind,
      mimeType: params.mimeType,
      filename: params.filename,
      filePath,
      sizeBytes: params.buffer.length,
      missionNumber: params.missionNumber,
      attemptNumber: params.attemptNumber,
      createdAt: new Date().toISOString(),
    };
    this.data.mediaById[id] = record;
    this.save();
    return record;
  }

  getMediaById(id: string): StoredMedia | undefined {
    return this.data.mediaById[id];
  }

  deleteMediaFile(id: string): { deleted: boolean; progress?: PlayerProgress } {
    const media = this.data.mediaById[id];
    if (!media) {
      return { deleted: false };
    }
    if (fs.existsSync(media.filePath)) {
      try {
        fs.unlinkSync(media.filePath);
      } catch {
        // Proceed removing metadata even if disk file is already missing
      }
    }
    delete this.data.mediaById[id];

    let updatedProgress: PlayerProgress | undefined;
    const ownerProgress = this.data.progressByUserId[media.ownerUserId];
    if (ownerProgress) {
      const nextAttempts = ownerProgress.voiceAttempts.filter((a) => a.mediaId !== id);
      const nextVoiceCompleted =
        nextAttempts.length === 0 ? false : ownerProgress.voiceCompleted;
      const nextVideoId =
        ownerProgress.finalVideoMediaId === id ? undefined : ownerProgress.finalVideoMediaId;
      const nextTheatreCompleted =
        ownerProgress.finalVideoMediaId === id ? false : ownerProgress.theatreCompleted;

      updatedProgress = this.recomputeUnlocksAndBadges({
        ...ownerProgress,
        voiceAttempts: nextAttempts,
        voiceCompleted: nextVoiceCompleted,
        finalVideoMediaId: nextVideoId,
        theatreCompleted: nextTheatreCompleted,
        updatedAt: new Date().toISOString(),
      });
      this.data.progressByUserId[media.ownerUserId] = updatedProgress;
    }

    this.save();
    return { deleted: true, progress: updatedProgress };
  }

  getOrCreateCollabRoom(code: string, memberName: string): CollabRoom {
    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '') || 'TAMAN-01';
    let room = this.data.collabRooms[cleanCode];
    if (!room) {
      room = {
        code: cleanCode,
        title: `Bilik Kolaborasi ${cleanCode}`,
        members: [memberName],
        sharedClues: [],
        sharedFragmentNotes: {},
        sharedScriptDraft:
          'Selamat sejahtera. Ini ialah draf skrip kolaboratif kami untuk Misi Menyelamatkan Taman Sekolah.',
        messages: [],
        updatedAt: new Date().toISOString(),
      };
      this.data.collabRooms[cleanCode] = room;
    } else if (!room.members.includes(memberName)) {
      room.members.push(memberName);
      room.updatedAt = new Date().toISOString();
    }
    this.save();
    return room;
  }

  updateCollabRoom(
    code: string,
    updater: (room: CollabRoom) => CollabRoom,
  ): CollabRoom {
    const cleanCode = code.trim().toUpperCase();
    const room = this.data.collabRooms[cleanCode];
    if (!room) {
      throw new Error('Bilik kolaborasi tidak ditemui.');
    }
    const next = updater(room);
    next.updatedAt = new Date().toISOString();
    this.data.collabRooms[cleanCode] = next;
    this.save();
    return next;
  }

  getAdminConfig(): AdminContentConfig {
    return this.data.adminConfig;
  }

  updateAdminConfig(patch: Partial<AdminContentConfig>): AdminContentConfig {
    this.data.adminConfig = {
      ...this.data.adminConfig,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.data.adminConfig;
  }

  getGoogleSheetsSyncState(): PersistedGoogleSheetsSyncState {
    if (!this.data.googleSheetsSync) {
      return {
        lastStatus: 'idle',
        lastAttemptedCount: 0,
        lastSuccessCount: 0,
        lastFailedCount: 0,
        syncedRecordHashes: {},
        logs: [],
      };
    }
    return {
      ...this.data.googleSheetsSync,
      syncedRecordHashes: { ...(this.data.googleSheetsSync.syncedRecordHashes || {}) },
      logs: Array.isArray(this.data.googleSheetsSync.logs)
        ? [...this.data.googleSheetsSync.logs]
        : [],
    };
  }

  saveGoogleSheetsSyncState(next: PersistedGoogleSheetsSyncState): PersistedGoogleSheetsSyncState {
    this.data.googleSheetsSync = {
      ...next,
      logs: next.logs.slice(-25),
    };
    this.save();
    return this.getGoogleSheetsSyncState();
  }
}

export const db = new KingdomDatabase();
