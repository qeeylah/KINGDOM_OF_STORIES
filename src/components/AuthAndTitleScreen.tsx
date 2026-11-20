import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Crown,
  KeyRound,
  Music,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  Volume2,
  VolumeX,
  Wind,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { soundEngine } from '../audio/soundEngine';
import { PUBLIC_VOICE_GUIDES } from '../audio/voiceProfiles';
import { HEROES } from '../data/gameContent';
import type {
  AuthUser,
  HeroId,
  PlayerProgress,
  PublicStudentAccount,
  UserRole,
} from '../types/game';
import { LandingWorld3D } from './LandingWorld3D';

interface AuthAndTitleScreenProps {
  announcement?: string;
  onAuthenticated: (user: AuthUser, token: string, progress: PlayerProgress | null) => void;
}

const PORTAL_META: Array<{
  role: UserRole;
  portalName: string;
  title: string;
  subtitle: string;
  demoUser: string;
  demoPass: string;
  accentText: string;
  accentBorder: string;
  accentGlow: string;
}> = [
  {
    role: 'student',
    portalName: 'MURID',
    title: 'Portal Pelajar',
    subtitle: 'Pilih akaun murid anda dan log masuk untuk meneroka kerajaan 3D serta 5 misi hikayat.',
    demoUser: '',
    demoPass: '',
    accentText: 'text-[#7BE0E6]',
    accentBorder: 'border-[#7BE0E6]/60',
    accentGlow: 'shadow-[0_0_24px_rgba(59,130,246,0.35)]',
  },
  {
    role: 'teacher',
    portalName: 'GURU',
    title: 'Portal Guru',
    subtitle:
      'Pantau kemajuan kelas, semak rakaman murid serta masuk pratonton dunia 3D (kesemua 5 misi).',
    demoUser: 'guru1',
    demoPass: 'guru123',
    accentText: 'text-[#6EE7B7]',
    accentBorder: 'border-[#6EE7B7]/60',
    accentGlow: 'shadow-[0_0_24px_rgba(16,185,129,0.35)]',
  },
  {
    role: 'admin',
    portalName: 'PENTADBIR',
    title: 'Portal Pentadbir',
    subtitle:
      'Urus akaun pengguna, kawalan peranan, kandungan tugasan serta pratonton dunia 3D kerajaan.',
    demoUser: 'admin1',
    demoPass: 'admin123',
    accentText: 'text-[#D8B4FE]',
    accentBorder: 'border-[#D8B4FE]/60',
    accentGlow: 'shadow-[0_0_24px_rgba(168,85,247,0.35)]',
  },
];

function getInitials(fullName: string): string {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter((part) => !['bin', 'binti', 'bt', 'anak', 'a/l', 'a/p'].includes(part.toLowerCase()));
  if (parts.length === 0) return 'M';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function getHeroMeta(heroId: HeroId) {
  return HEROES.find((h) => h.id === heroId) || HEROES[0];
}

export const AuthAndTitleScreen: React.FC<AuthAndTitleScreenProps> = ({
  announcement,
  onAuthenticated,
}) => {
  const prefersReduced = useReducedMotion();
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [hoveredRole, setHoveredRole] = useState<UserRole | null>(null);
  const [enteringRole, setEnteringRole] = useState<UserRole | null>(null);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [className, setClassName] = useState('5 Bestari');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Student Account Picker ("Pemilihan Akaun Murid") state
  const [studentAccounts, setStudentAccounts] = useState<PublicStudentAccount[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsLoadError, setStudentsLoadError] = useState('');
  const [selectedStudentAccount, setSelectedStudentAccount] =
    useState<PublicStudentAccount | null>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentClassFilter, setStudentClassFilter] = useState<string>('ALL');

  // Audio controls: never autoplay before explicit user interaction
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [sfxEnabled, setSfxEnabled] = useState(() => !soundEngine.getSfxMuted());
  const [guideSpeaking, setGuideSpeaking] = useState(false);
  const [reducedMotionManual, setReducedMotionManual] = useState(false);

  const effectiveReducedMotion = Boolean(prefersReduced) || reducedMotionManual;

  const fetchStudentAccounts = useCallback(async () => {
    setStudentsLoading(true);
    setStudentsLoadError('');
    try {
      const res = await fetch('/api/auth/students', { cache: 'no-store' });
      const data = (await res.json()) as {
        students?: PublicStudentAccount[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memuatkan senarai akaun murid.');
      }
      const list = Array.isArray(data.students) ? data.students : [];
      setStudentAccounts(list);
    } catch (err) {
      setStudentsLoadError(
        err instanceof Error ? err.message : 'Gagal menghubungi pelayan untuk senarai murid.',
      );
    } finally {
      setStudentsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStudentAccounts();
  }, [fetchStudentAccounts]);

  useEffect(() => {
    soundEngine.setLandingAmbience(true);
    const unsub = soundEngine.subscribeNarration(setGuideSpeaking);
    return () => {
      unsub();
      soundEngine.stopNarration();
      soundEngine.setLandingAmbience(false);
    };
  }, []);

  const availableClasses = useMemo(() => {
    const classes = new Set<string>();
    studentAccounts.forEach((stu) => {
      const c = stu.className?.trim();
      if (c) classes.add(c);
    });
    return Array.from(classes).sort((a, b) => a.localeCompare(b, 'ms'));
  }, [studentAccounts]);

  const filteredStudentAccounts = useMemo(() => {
    const q = studentSearchQuery.trim().toLowerCase();
    return studentAccounts.filter((stu) => {
      if (studentClassFilter !== 'ALL' && stu.className !== studentClassFilter) {
        return false;
      }
      if (!q) return true;
      return (
        stu.fullName.toLowerCase().includes(q) ||
        stu.className.toLowerCase().includes(q) ||
        stu.username.toLowerCase().includes(q)
      );
    });
  }, [studentAccounts, studentSearchQuery, studentClassFilter]);

  const toggleMusic = () => {
    soundEngine.init();
    soundEngine.setLandingAmbience(true);
    if (musicPlaying) {
      soundEngine.setMusicMuted(true);
      setMusicPlaying(false);
    } else {
      soundEngine.setMusicMuted(false);
      soundEngine.startMusic();
      setMusicPlaying(true);
    }
    soundEngine.playUiClickSound();
  };

  const toggleSfx = () => {
    soundEngine.init();
    const nextEnabled = !sfxEnabled;
    soundEngine.setSfxMuted(!nextEnabled);
    setSfxEnabled(nextEnabled);
    if (nextEnabled) {
      soundEngine.playUiClickSound();
    }
  };

  const toggleVoiceGuide = () => {
    soundEngine.init();
    if (guideSpeaking) {
      soundEngine.stopNarration();
    } else {
      void soundEngine.speakMalay(PUBLIC_VOICE_GUIDES.landing_welcome, {
        voiceRole: 'guide',
        styleHint: 'tutorial',
        publicGuideId: 'landing_welcome',
      });
    }
  };

  const selectPortal = (role: UserRole) => {
    soundEngine.playUiClickSound();
    setSelectedRole(role);
    setMode('login');
    setErrorMsg('');
    if (role === 'student') {
      setSelectedStudentAccount(null);
      setUsername('');
      setPassword('');
      void fetchStudentAccounts();
      return;
    }
    setSelectedStudentAccount(null);
    const meta = PORTAL_META.find((p) => p.role === role)!;
    setUsername(meta.demoUser);
    setPassword(meta.demoPass);
  };

  const handleChooseStudentAccount = (student: PublicStudentAccount) => {
    soundEngine.init();
    soundEngine.playUiClickSound();
    setSelectedStudentAccount(student);
    setUsername(student.username);
    setPassword('');
    setErrorMsg('');
  };

  const handleBackToStudentPicker = () => {
    soundEngine.playUiClickSound();
    setSelectedStudentAccount(null);
    setUsername('');
    setPassword('');
    setErrorMsg('');
    void fetchStudentAccounts();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    soundEngine.init();
    soundEngine.playUiClickSound();
    setErrorMsg('');

    const effectiveUsername =
      selectedRole === 'student' && mode === 'login' && selectedStudentAccount
        ? selectedStudentAccount.username
        : username;

    if (!effectiveUsername.trim() || !password) {
      setErrorMsg('Sila masukkan kata laluan atau PIN yang sah.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const body =
        mode === 'register'
          ? { username: effectiveUsername, password, fullName, className }
          : { username: effectiveUsername, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        user?: AuthUser;
        token?: string;
        progress?: PlayerProgress | null;
        error?: string;
      };
      if (!res.ok || !data.user || !data.token) {
        throw new Error(data.error || 'Pengesahan gagal.');
      }
      if (mode === 'login' && data.user.role !== selectedRole) {
        const roleLabel =
          data.user.role === 'student'
            ? 'Pelajar'
            : data.user.role === 'teacher'
              ? 'Guru'
              : 'Pentadbir';
        throw new Error(
          `Akaun ini berdaftar sebagai ${roleLabel}. Sila pilih portal yang sepadan untuk log masuk.`,
        );
      }
      if (
        mode === 'login' &&
        selectedRole === 'student' &&
        selectedStudentAccount &&
        data.user.id !== selectedStudentAccount.id
      ) {
        throw new Error('Identiti akaun murid tidak sepadan. Sila pilih semula akaun anda.');
      }

      localStorage.setItem('kos_token', data.token);
      setEnteringRole(data.user.role);
      soundEngine.playPortalSound();

      const zoomDelay = effectiveReducedMotion ? 180 : 720;
      window.setTimeout(() => {
        onAuthenticated(data.user!, data.token!, data.progress ?? null);
      }, zoomDelay);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Berlaku ralat semasa log masuk.');
      setLoading(false);
    }
  };

  const activeMeta = PORTAL_META.find((p) => p.role === selectedRole)!;
  const isStudentAccountSelectionView =
    selectedRole === 'student' && mode === 'login' && !selectedStudentAccount;
  const selectedStudentHero = selectedStudentAccount
    ? getHeroMeta(selectedStudentAccount.heroId)
    : null;

  return (
    <div className="relative h-screen w-full overflow-y-auto overflow-x-hidden bg-[#121A36] text-[#FAF6EE] flex flex-col">
      {/* Continuous Living 3D Fantasy World */}
      <div className="fixed inset-0 z-0">
        <LandingWorld3D
          selectedRole={selectedRole}
          hoveredRole={hoveredRole}
          enteringRole={enteringRole}
          reducedMotion={effectiveReducedMotion}
          lowPowerMode={reducedMotionManual}
          onHoverPortal={setHoveredRole}
          onSelectPortal={selectPortal}
        />
      </div>

      {/* Subtle Vignette for Text Legibility without obscuring central 3D Castle & Heroes */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-10 bg-gradient-to-b from-[#0E1630]/65 via-transparent to-[#0E1630]/80"
      />

      {/* Portal Zoom Transition Overlay */}
      {enteringRole && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45 }}
          className="pointer-events-none fixed inset-0 z-40 flex flex-col items-center justify-center bg-[#0D152E]/55"
        >
          <div className="rounded-2xl border border-[#E5C35A]/80 bg-[#111A36]/95 px-7 py-4 text-center shadow-2xl">
            <div className="text-[11px] uppercase tracking-[0.2em] text-[#E5C35A] font-semibold">
              Portal Ajaib Dibuka
            </div>
            <div className="font-display text-2xl font-bold text-[#FAF6EE] mt-1">
              Memasuki {PORTAL_META.find((m) => m.role === enteringRole)?.title}
            </div>
          </div>
        </motion.div>
      )}

      {/* Top Royal Header & Interactive Audio Controls */}
      <header className="relative z-20 pointer-events-none w-full px-5 lg:px-10 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-[#D4AF37]/40 bg-[#0F1730]/85 px-4 py-2 shadow-lg">
          <div className="relative w-7 h-7 flex items-center justify-center">
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full border border-dashed border-[#E5C35A]/70 animate-royal-orbit"
            />
            <Crown className="w-3.5 h-3.5 text-[#E5C35A]" />
          </div>
          <div>
            <div className="font-display text-sm sm:text-base font-bold tracking-wide text-[#FAF6EE] leading-none">
              Kingdom of Stories
            </div>
            <div className="text-[10px] text-[#C8B6E2] tracking-wider uppercase mt-0.5">
              Bahasa Melayu Malaysia · Dunia RPG 3D
            </div>
          </div>
        </div>

        {/* Independent Music, SFX & Motion Controls (User-Triggered Only) */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <motion.button
            type="button"
            whileHover={effectiveReducedMotion ? undefined : { scale: 1.03 }}
            whileTap={effectiveReducedMotion ? undefined : { scale: 0.97 }}
            onClick={toggleMusic}
            className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors shadow-lg ${
              musicPlaying
                ? 'border-[#E5C35A] bg-[#1C2A52]/92 text-[#FFE89E]'
                : 'border-[#D4AF37]/40 bg-[#0F1730]/88 text-[#EFE6D5] hover:border-[#E5C35A]/80'
            }`}
          >
            <Music className="w-3.5 h-3.5 text-[#E5C35A]" />
            <span>{musicPlaying ? 'Muzik: Aktif' : 'Mainkan Muzik'}</span>
            {musicPlaying && !effectiveReducedMotion && (
              <span className="flex items-end gap-0.5 h-3" aria-hidden="true">
                <span className="w-0.5 h-2 bg-[#E5C35A] animate-pulse" />
                <span className="w-0.5 h-3 bg-[#7BE0E6] animate-pulse" />
                <span className="w-0.5 h-1.5 bg-[#E5C35A] animate-pulse" />
              </span>
            )}
          </motion.button>

          <motion.button
            type="button"
            whileHover={effectiveReducedMotion ? undefined : { scale: 1.03 }}
            whileTap={effectiveReducedMotion ? undefined : { scale: 0.97 }}
            onClick={toggleVoiceGuide}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors shadow-lg ${
              guideSpeaking
                ? 'border-[#E5C35A] bg-[#1C2A52]/92 text-[#FFE89E]'
                : 'border-[#E5C35A]/45 bg-[#0F1730]/88 text-[#EFE6D5] hover:border-[#E5C35A]'
            }`}
            title="Dengar panduan suara Bahasa Melayu Malaysia"
          >
            {guideSpeaking ? (
              <VolumeX className="w-3.5 h-3.5 text-[#E5C35A]" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-[#E5C35A]" />
            )}
            <span>{guideSpeaking ? 'Hentikan Suara' : 'Panduan Suara'}</span>
          </motion.button>

          <motion.button
            type="button"
            whileHover={effectiveReducedMotion ? undefined : { scale: 1.03 }}
            whileTap={effectiveReducedMotion ? undefined : { scale: 0.97 }}
            onClick={toggleSfx}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors shadow-lg ${
              sfxEnabled
                ? 'border-[#7BE0E6]/60 bg-[#0F1730]/88 text-[#7BE0E6]'
                : 'border-[#FAF6EE]/20 bg-[#0F1730]/88 text-[#FAF6EE]/65'
            }`}
            title="Kawal kesan bunyi butang dan portal"
          >
            {sfxEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{sfxEnabled ? 'Bunyi: Aktif' : 'Bunyi: Senyap'}</span>
          </motion.button>

          <button
            type="button"
            onClick={() => setReducedMotionManual((v) => !v)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors shadow-lg ${
              effectiveReducedMotion
                ? 'border-[#6EE7B7]/60 bg-[#13263A]/92 text-[#6EE7B7]'
                : 'border-[#FAF6EE]/20 bg-[#0F1730]/85 text-[#C8B6E2] hover:text-[#FAF6EE]'
            }`}
            title="Kurangkan animasi kamera dan zarah untuk prestasi optimum"
          >
            <Wind className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {effectiveReducedMotion ? 'Gerakan Minimum' : 'Mod Sinematik'}
            </span>
          </button>
        </div>
      </header>

      {/* Main Split Content: Showcase Left + Portal Login Right */}
      <main className="relative z-20 pointer-events-none flex-1 max-w-7xl w-full mx-auto px-5 lg:px-10 py-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left World Showcase & Interactive 3D Portal Guide */}
        <section className="lg:col-span-6 xl:col-span-7 flex flex-col justify-between min-h-[280px] sm:min-h-[340px] lg:min-h-0 py-2">
          {/* Top-Left Shimmering Title */}
          <motion.div
            initial={effectiveReducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65 }}
            className="pointer-events-auto max-w-xl rounded-2xl border border-[#E5C35A]/30 bg-[#0E1630]/78 px-5 py-4 shadow-2xl"
          >
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] uppercase text-[#E5C35A] mb-1.5 animate-royal-float">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Pengembaraan Fantasi Pendidikan 3D</span>
            </div>

            <h1 className="font-display text-3xl sm:text-5xl font-bold leading-tight title-gold-shimmer">
              Kingdom of Stories
            </h1>
            <div className="font-display text-base sm:text-xl font-medium text-[#D8C6F0] mt-1">
              The Veil of Forgotten Chronicles
            </div>

            <p className="text-xs sm:text-sm leading-relaxed text-[#EFE6D5]/90 mt-2.5">
              Selami dunia kerajaan diraja yang hidup bersama Ayden, Elena, Ryan dan Eva. Terokai 5
              lokasi beranimasi dan sempurnakan{' '}
              <strong className="text-[#E5C35A]">Misi Menyelamatkan Taman Sekolah</strong>.
            </p>

            {announcement && (
              <div className="mt-3 rounded-lg border border-[#D4AF37]/40 bg-[#18254A]/90 px-3.5 py-2 text-xs text-[#FAF6EE]">
                <span className="font-semibold text-[#E5C35A]">Makluman Kerajaan: </span>
                {announcement}
              </div>
            )}
          </motion.div>

          {/* Bottom-Left Interactive 3D Portal Selector Strip */}
          <motion.div
            initial={effectiveReducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.12 }}
            className="pointer-events-auto mt-auto pt-4 max-w-xl"
          >
            <div className="rounded-2xl border border-[#D4AF37]/35 bg-[#0E1630]/84 p-3.5 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#E5C35A]">
                  Tiga Portal Kerajaan Interaktif
                </span>
                <span className="text-[11px] text-[#C8B6E2]">
                  Klik portal 3D atau gerakkan tetikus untuk meneroka
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {PORTAL_META.map((p) => {
                  const isActive = selectedRole === p.role;
                  const isHovered = hoveredRole === p.role;
                  return (
                    <motion.button
                      key={p.role}
                      type="button"
                      whileHover={effectiveReducedMotion ? undefined : { y: -3, scale: 1.02 }}
                      whileTap={effectiveReducedMotion ? undefined : { scale: 0.98 }}
                      onMouseEnter={() => {
                        setHoveredRole(p.role);
                        soundEngine.playPortalHoverSound(p.role);
                      }}
                      onMouseLeave={() => setHoveredRole(null)}
                      onClick={() => selectPortal(p.role)}
                      className={`rounded-xl border px-3 py-2 text-left transition-all ${
                        isActive
                          ? `${p.accentBorder} bg-[#18274F]/95 ${p.accentGlow}`
                          : isHovered
                            ? `${p.accentBorder} bg-[#142042]/92`
                            : 'border-[#FAF6EE]/15 bg-[#111A36]/85 hover:border-[#D4AF37]/50'
                      }`}
                    >
                      <div className={`text-xs font-display font-bold tracking-wider ${p.accentText}`}>
                        {p.portalName}
                      </div>
                      <div className="text-[11px] text-[#EFE6D5]/80 truncate">{p.title}</div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </section>

        {/* Right Three-Portal Card: Pemilihan Akaun Murid + Gerbang Log Masuk */}
        <section className="lg:col-span-6 xl:col-span-5 flex items-center justify-end py-2">
          <motion.div
            initial={effectiveReducedMotion ? false : { opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="pointer-events-auto relative w-full max-w-lg rounded-2xl border border-[#E5C35A]/50 bg-[#0F1730]/92 p-5 sm:p-6 shadow-[0_20px_60px_rgba(6,10,24,0.75)]"
          >
            {/* Floating Royal Corner Filigree Ornaments */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-1.5 -left-1.5 w-5 h-5 border-t-2 border-l-2 border-[#E5C35A] rounded-tl-lg"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-1.5 -right-1.5 w-5 h-5 border-t-2 border-r-2 border-[#E5C35A] rounded-tr-lg"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-1.5 -left-1.5 w-5 h-5 border-b-2 border-l-2 border-[#E5C35A] rounded-bl-lg"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-1.5 -right-1.5 w-5 h-5 border-b-2 border-r-2 border-[#E5C35A] rounded-br-lg"
            />

            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-semibold text-[#FAF6EE]">
                  {isStudentAccountSelectionView
                    ? 'Pemilihan Akaun Murid'
                    : 'Gerbang Log Masuk Diraja'}
                </h2>
                <p className="text-xs text-[#C8B6E2] mt-0.5">
                  {isStudentAccountSelectionView
                    ? 'Pilih kad profil murid anda daripada senarai istana sebelum log masuk.'
                    : 'Kawalan akses berasaskan peranan murid, guru & pentadbir.'}
                </p>
              </div>
              <div className="w-9 h-9 rounded-full border border-[#E5C35A]/50 bg-[#18254A] flex items-center justify-center shrink-0 animate-royal-float">
                {selectedRole === 'student' && <Crown className="w-4 h-4 text-[#7BE0E6]" />}
                {selectedRole === 'teacher' && <ShieldCheck className="w-4 h-4 text-[#6EE7B7]" />}
                {selectedRole === 'admin' && <KeyRound className="w-4 h-4 text-[#D8B4FE]" />}
              </div>
            </div>

            {/* Role Selector Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#0A1024] border border-[#FAF6EE]/12 mb-4">
              {PORTAL_META.map((p) => (
                <motion.button
                  key={p.role}
                  type="button"
                  whileHover={effectiveReducedMotion ? undefined : { scale: 1.02 }}
                  whileTap={effectiveReducedMotion ? undefined : { scale: 0.97 }}
                  onMouseEnter={() => {
                    setHoveredRole(p.role);
                    soundEngine.playPortalHoverSound(p.role);
                  }}
                  onMouseLeave={() => setHoveredRole(null)}
                  onClick={() => selectPortal(p.role)}
                  className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    selectedRole === p.role
                      ? 'bg-[#E5C35A] text-[#101832] shadow-md'
                      : 'text-[#FAF6EE]/75 hover:text-[#FAF6EE] hover:bg-[#19264B]/60'
                  }`}
                >
                  {p.role === 'student' ? 'Murid' : p.role === 'teacher' ? 'Guru' : 'Pentadbir'}
                </motion.button>
              ))}
            </div>

            {/* Active Portal Briefing */}
            <div
              className={`mb-4 rounded-xl bg-[#142040] border p-3 transition-shadow ${activeMeta.accentBorder} ${activeMeta.accentGlow}`}
            >
              <div className={`flex items-center gap-2 text-sm font-semibold ${activeMeta.accentText}`}>
                {selectedRole === 'student' && <Crown className="w-4 h-4" />}
                {selectedRole === 'teacher' && <ShieldCheck className="w-4 h-4" />}
                {selectedRole === 'admin' && <KeyRound className="w-4 h-4" />}
                <span>{activeMeta.title}</span>
              </div>
              <p className="text-xs text-[#EFE6D5]/85 mt-1 leading-relaxed">{activeMeta.subtitle}</p>
              {selectedRole !== 'student' && activeMeta.demoUser && (
                <div className="mt-2 pt-2 border-t border-[#FAF6EE]/10 text-[11px] font-mono-tabular text-[#8FBCE0]">
                  Akaun ujian: <span className="text-[#FAF6EE]">{activeMeta.demoUser}</span> / kata
                  laluan: <span className="text-[#FAF6EE]">{activeMeta.demoPass}</span>
                </div>
              )}
            </div>

            {/* STUDENT STEP 1: PEMILIHAN AKAUN MURID */}
            {isStudentAccountSelectionView ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#E5C35A]">
                    <Users className="w-3.5 h-3.5" />
                    <span>
                      Senarai Murid Berdaftar ({filteredStudentAccounts.length}
                      {filteredStudentAccounts.length !== studentAccounts.length
                        ? ` / ${studentAccounts.length}`
                        : ''}
                      )
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void fetchStudentAccounts()}
                    disabled={studentsLoading}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#FAF6EE]/15 bg-[#142040] px-2.5 py-1 text-[11px] font-medium text-[#EFE6D5] hover:border-[#E5C35A]/60 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${studentsLoading ? 'animate-spin' : ''}`} />
                    <span>Muat Semula</span>
                  </button>
                </div>

                {/* Search & Class Filter */}
                {studentAccounts.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="relative sm:col-span-7">
                      <Search className="w-3.5 h-3.5 text-[#C8B6E2] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                        placeholder="Cari nama murid..."
                        aria-label="Cari nama murid"
                        className="w-full rounded-lg border border-[#FAF6EE]/20 bg-[#0A1024] pl-8 pr-3 py-1.5 text-xs text-[#FAF6EE] placeholder:text-[#C8B6E2]/55 focus:outline-none focus:border-[#E5C35A]"
                      />
                    </div>
                    <div className="sm:col-span-5">
                      <select
                        value={studentClassFilter}
                        onChange={(e) => setStudentClassFilter(e.target.value)}
                        aria-label="Tapis mengikut kelas"
                        className="w-full rounded-lg border border-[#FAF6EE]/20 bg-[#0A1024] px-2.5 py-1.5 text-xs text-[#FAF6EE] focus:outline-none focus:border-[#E5C35A]"
                      >
                        <option value="ALL">Semua Kelas</option>
                        {availableClasses.map((cls) => (
                          <option key={cls} value={cls}>
                            Kelas {cls}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Student Cards Grid / States */}
                {studentsLoading ? (
                  <div className="rounded-xl border border-[#FAF6EE]/12 bg-[#0A1024]/80 p-6 text-center text-xs text-[#C8B6E2]">
                    Memuatkan senarai akaun murid dari istana...
                  </div>
                ) : studentsLoadError ? (
                  <div className="rounded-xl border border-red-400/45 bg-red-950/50 p-4 text-xs text-red-200 space-y-2">
                    <div>{studentsLoadError}</div>
                    <button
                      type="button"
                      onClick={() => void fetchStudentAccounts()}
                      className="rounded-lg border border-red-300/40 bg-red-900/50 px-3 py-1 font-semibold hover:bg-red-900"
                    >
                      Cuba Lagi
                    </button>
                  </div>
                ) : studentAccounts.length === 0 ? (
                  <div className="rounded-xl border border-[#E5C35A]/30 bg-[#0A1024]/85 p-5 text-center space-y-2">
                    <div className="text-xs font-semibold text-[#E5C35A]">
                      Tiada Akaun Murid Aktif Ditemui
                    </div>
                    <p className="text-[11px] text-[#EFE6D5]/80 leading-relaxed">
                      Tiada akaun murid aktif dalam sistem buat masa ini. Sila hubungi Pentadbir
                      atau Guru untuk mendaftarkan atau mengaktifkan akaun anda.
                    </p>
                  </div>
                ) : filteredStudentAccounts.length === 0 ? (
                  <div className="rounded-xl border border-[#FAF6EE]/15 bg-[#0A1024]/85 p-5 text-center space-y-2">
                    <div className="text-xs font-semibold text-[#FAF6EE]">
                      Tiada murid sepadan dengan carian anda.
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setStudentSearchQuery('');
                        setStudentClassFilter('ALL');
                      }}
                      className="rounded-lg border border-[#E5C35A]/50 bg-[#142040] px-3 py-1 text-[11px] font-semibold text-[#E5C35A] hover:bg-[#1C2D56]"
                    >
                      Set Semula Carian
                    </button>
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {filteredStudentAccounts.map((stu) => {
                      const hero = getHeroMeta(stu.heroId);
                      return (
                        <motion.button
                          key={stu.id}
                          type="button"
                          whileHover={effectiveReducedMotion ? undefined : { y: -2, scale: 1.015 }}
                          whileTap={effectiveReducedMotion ? undefined : { scale: 0.985 }}
                          onMouseEnter={() => soundEngine.playUiHoverSound()}
                          onClick={() => handleChooseStudentAccount(stu)}
                          className="group text-left rounded-xl border border-[#E5C35A]/30 bg-gradient-to-br from-[#131F42]/95 to-[#0B1228]/95 p-3 hover:border-[#E5C35A] hover:shadow-[0_0_20px_rgba(229,195,90,0.25)] transition-all flex items-center gap-3"
                        >
                          {/* Royal Character Emblem Avatar */}
                          <div
                            className="relative w-11 h-11 rounded-xl shrink-0 flex flex-col items-center justify-center border-2 shadow-inner"
                            style={{
                              backgroundColor: '#101936',
                              borderColor: hero.primaryColor,
                              boxShadow: `inset 0 0 12px ${hero.primaryColor}33`,
                            }}
                          >
                            <span
                              className="font-display text-xs font-bold leading-none"
                              style={{ color: hero.accentColor }}
                            >
                              {getInitials(stu.fullName)}
                            </span>
                            <span
                              className="text-[9px] font-semibold tracking-tight mt-0.5 leading-none"
                              style={{ color: hero.primaryColor }}
                            >
                              {hero.name}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-[#FAF6EE] leading-snug line-clamp-2 group-hover:text-[#FFE89E]">
                              {stu.fullName}
                            </div>
                            <div className="text-[11px] text-[#7BE0E6] mt-0.5">
                              Kelas {stu.className}
                            </div>
                            <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[#E5C35A]">
                              <span>Pilih Akaun</span>
                              <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* STEP 2 (SELECTED STUDENT) OR TEACHER/ADMIN LOGIN OR REGISTER */
              <form onSubmit={handleSubmit} className="space-y-3">
                {selectedRole === 'student' && mode === 'login' && selectedStudentAccount && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={handleBackToStudentPicker}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#FAF6EE]/20 bg-[#142040] px-3 py-1.5 text-xs font-semibold text-[#EFE6D5] hover:border-[#E5C35A]/70 hover:text-[#FFE89E]"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Kembali Pilih Akaun Lain</span>
                      </button>
                      <span className="text-[11px] text-[#7BE0E6] inline-flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Akaun Dipilih</span>
                      </span>
                    </div>

                    {/* Selected Student Identity Card */}
                    <div className="rounded-xl border border-[#7BE0E6]/45 bg-[#121D3D] p-3 flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-xl shrink-0 flex flex-col items-center justify-center border-2"
                        style={{
                          backgroundColor: '#0C142B',
                          borderColor: selectedStudentHero?.primaryColor || '#7BE0E6',
                        }}
                      >
                        <span
                          className="font-display text-xs font-bold leading-none"
                          style={{ color: selectedStudentHero?.accentColor || '#FAF6EE' }}
                        >
                          {getInitials(selectedStudentAccount.fullName)}
                        </span>
                        <span
                          className="text-[9px] font-semibold mt-0.5 leading-none"
                          style={{ color: selectedStudentHero?.primaryColor || '#7BE0E6' }}
                        >
                          {selectedStudentHero?.name || 'Wira'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#FAF6EE] truncate">
                          {selectedStudentAccount.fullName}
                        </div>
                        <div className="text-xs text-[#C8B6E2]">
                          Kelas {selectedStudentAccount.className} · Wira{' '}
                          {selectedStudentHero?.name} ({selectedStudentHero?.title})
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {mode === 'register' && selectedRole === 'student' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-[#EFE6D5] mb-1">
                        Nama Penuh Murid
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Contoh: Siti Hajar binti Ahmad"
                        className="w-full rounded-lg border border-[#FAF6EE]/20 bg-[#0A1024] px-3.5 py-2 text-sm text-[#FAF6EE] focus:outline-none focus:border-[#E5C35A]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#EFE6D5] mb-1">Kelas</label>
                      <input
                        type="text"
                        required
                        value={className}
                        onChange={(e) => setClassName(e.target.value)}
                        placeholder="5 Bestari"
                        className="w-full rounded-lg border border-[#FAF6EE]/20 bg-[#0A1024] px-3.5 py-2 text-sm text-[#FAF6EE] focus:outline-none focus:border-[#E5C35A]"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-medium text-[#EFE6D5] mb-1">
                    {selectedRole === 'student' && mode === 'login' && selectedStudentAccount
                      ? 'Nama Pengguna (Diisi Automatik)'
                      : 'Nama Pengguna'}
                  </label>
                  <input
                    type="text"
                    required
                    readOnly={selectedRole === 'student' && mode === 'login' && Boolean(selectedStudentAccount)}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={`w-full rounded-lg border px-3.5 py-2 text-sm focus:outline-none ${
                      selectedRole === 'student' && mode === 'login' && selectedStudentAccount
                        ? 'border-[#7BE0E6]/35 bg-[#121D3D] text-[#7BE0E6] font-mono-tabular cursor-not-allowed'
                        : 'border-[#FAF6EE]/20 bg-[#0A1024] text-[#FAF6EE] focus:border-[#E5C35A]'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#EFE6D5] mb-1">
                    {selectedRole === 'student' && mode === 'login'
                      ? 'Kata Laluan / PIN Murid'
                      : 'Kata Laluan'}
                  </label>
                  <input
                    type="password"
                    required
                    autoFocus={selectedRole === 'student' && mode === 'login' && Boolean(selectedStudentAccount)}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      selectedRole === 'student' && mode === 'login'
                        ? 'Masukkan kata laluan atau PIN anda'
                        : ''
                    }
                    className="w-full rounded-lg border border-[#FAF6EE]/20 bg-[#0A1024] px-3.5 py-2 text-sm text-[#FAF6EE] placeholder:text-[#C8B6E2]/50 focus:outline-none focus:border-[#E5C35A]"
                  />
                </div>

                {errorMsg && (
                  <div className="rounded-lg border border-red-400/50 bg-red-950/60 px-3 py-2 text-xs text-red-200">
                    {errorMsg}
                  </div>
                )}

                <motion.button
                  type="submit"
                  disabled={loading || Boolean(enteringRole)}
                  whileHover={effectiveReducedMotion ? undefined : { scale: 1.015, y: -1 }}
                  whileTap={effectiveReducedMotion ? undefined : { scale: 0.985 }}
                  onMouseEnter={() => soundEngine.playUiHoverSound()}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F2D57E] to-[#D4AF37] text-[#101832] font-bold text-sm shadow-[0_0_24px_rgba(212,175,55,0.35)] hover:shadow-[0_0_32px_rgba(229,195,90,0.6)] transition-shadow disabled:opacity-50"
                >
                  {enteringRole
                    ? 'Membuka Portal Ajaib...'
                    : loading
                      ? 'Mengesahkan...'
                      : mode === 'register'
                        ? 'Daftar Akaun Pelajar & Mulakan'
                        : `Masuk ke ${activeMeta.title}`}
                </motion.button>
              </form>
            )}

            {selectedRole === 'student' && (
              <div className="mt-4 pt-3.5 border-t border-[#FAF6EE]/12 flex items-center justify-between text-xs text-[#C8B6E2]">
                <span>
                  {mode === 'login'
                    ? 'Nama tiada dalam senarai?'
                    : 'Sudah mempunyai akaun dalam senarai?'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClickSound();
                    setErrorMsg('');
                    if (mode === 'login') {
                      setMode('register');
                      setSelectedStudentAccount(null);
                      setUsername('');
                      setPassword('');
                    } else {
                      setMode('login');
                      setSelectedStudentAccount(null);
                      setUsername('');
                      setPassword('');
                      void fetchStudentAccounts();
                    }
                  }}
                  className="flex items-center gap-1.5 text-[#E5C35A] font-semibold hover:underline"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>
                    {mode === 'login' ? 'Daftar Akaun Baharu' : 'Kembali ke Pemilihan Akaun'}
                  </span>
                </button>
              </div>
            )}
          </motion.div>
        </section>
      </main>
    </div>
  );
};
