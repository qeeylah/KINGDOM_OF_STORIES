import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Award,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Compass,
  Map as MapIcon,
  RotateCcw,
  Settings,
  Sparkles,
  UserCheck,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { soundEngine } from './audio/soundEngine';
import type { VoiceRole } from './audio/voiceProfiles';
import { AuthAndTitleScreen } from './components/AuthAndTitleScreen';
import { AudioControlPanel } from './components/AudioControlPanel';
import { AdminPortal, TeacherPortal } from './components/EducatorPortals';
import { type AtelierWarpRequest, type AtelierZone, type AutoPortalRequest, type CameraMode, GameViewport3D } from './components/GameViewport3D';
import { MissionIntroPopup, MissionSuccessPopup } from './components/MissionFlowModals';
import { type ActiveMissionModal, MissionPanels } from './components/MissionPanels';
import { OpeningCinematic } from './components/OpeningCinematic';
import { GATE_HALL_MISSIONS, RoyalGateHallOverlay } from './components/RoyalGateHallOverlay';
import { RoyalFinaleExperience } from './components/RoyalFinaleExperience';
import { type HubModalType, WorldHubModals } from './components/WorldHubModals';
import { HEROES, LOCATIONS, MISSION_ORDER, NPC_DIALOGUES } from './data/gameContent';
import { applyEducatorPreviewPatch, createEducatorPreviewProgress } from './data/modeState';
import type { VoiceTelemetry } from './game/atelierChambers';
import type { InteractAction, InteractablePoint } from './game/worlds';
import type {
  AdminContentConfig,
  AudioSettings,
  AuthUser,
  LocationId,
  PlayerProgress,
} from './types/game';
import { isAllFiveMissionsVerified } from './utils/certificatePdf';

interface ActiveDialogue {
  voiceRole: VoiceRole;
  name: string;
  role: string;
  lines: string[];
  index: number;
}

interface PendingMissionIntro {
  missionNumber?: 1 | 2 | 3 | 4 | 5;
  missionBadge: string;
  locationTitle: string;
}

function getMissionIntroMeta(
  target: LocationId,
  missionHintNumber?: 1 | 2 | 3 | 4 | 5,
): PendingMissionIntro | null {
  if (target === 'library') {
    return {
      missionNumber: 1,
      missionBadge: 'Misi 1 · Hikayat Yang Membisu',
      locationTitle: 'Pustaka Agung Hikayat Diraja',
    };
  }
  if (target === 'woods') {
    return {
      missionNumber: 2,
      missionBadge: 'Misi 2 · Garis Masa Yang Terpecah',
      locationTitle: 'Rimba Cahaya Mahkota',
    };
  }
  if (target === 'atelier') {
    if (missionHintNumber === 4) {
      return {
        missionNumber: 4,
        missionBadge: 'Misi 4 · Ujian Suara Diraja',
        locationTitle: 'Balai Gema Diraja',
      };
    }
    if (missionHintNumber === 3) {
      return {
        missionNumber: 3,
        missionBadge: 'Misi 3 · Arkitek Kisah',
        locationTitle: 'Balai Cipta Mahkota',
      };
    }
    return {
      missionNumber: 3,
      missionBadge: 'Misi 3 & 4 · Arkitek Kisah & Ujian Suara Diraja',
      locationTitle: 'Balai Cipta Mahkota & Balai Gema Diraja',
    };
  }
  if (target === 'theatre') {
    return {
      missionNumber: 5,
      missionBadge: 'Misi 5 · Hikayat Terakhir',
      locationTitle: 'Balairung Gemilang Diraja',
    };
  }
  return null;
}

export function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string>('');
  const [progress, setProgress] = useState<PlayerProgress | null>(null);
  const [systemConfig, setSystemConfig] = useState<AdminContentConfig | null>(null);

  // Educator 3D preview state (in-memory only, does not touch student DB)
  const [educatorIn3D, setEducatorIn3D] = useState(false);
  const [educatorPreviewProgress, setEducatorPreviewProgress] = useState<PlayerProgress | null>(null);

  // Flow states for Student 3D adventure
  const [showCinematic, setShowCinematic] = useState(false);
  const [showInitialHeroPick, setShowInitialHeroPick] = useState(false);
  const [pendingMissionIntro, setPendingMissionIntro] = useState<PendingMissionIntro | null>(null);
  const [completedSuccessMission, setCompletedSuccessMission] = useState<1 | 2 | 3 | 4 | 5 | null>(null);

  // HUD & Modal states
  const [nearItem, setNearItem] = useState<InteractablePoint | null>(null);
  const [activeMissionModal, setActiveMissionModal] = useState<ActiveMissionModal | null>(null);
  const [activeHubModal, setActiveHubModal] = useState<HubModalType | null>(null);
  const [activeDialogue, setActiveDialogue] = useState<ActiveDialogue | null>(null);
  const [isDialogueSpeaking, setIsDialogueSpeaking] = useState(false);
  const [toastMsg, setToastMsg] = useState<string>('');
  const [teleportingLabel, setTeleportingLabel] = useState<string>('');
  const [dockCollapsed, setDockCollapsed] = useState(false);

  // Camera & Controls states
  const [cameraMode, setCameraMode] = useState<CameraMode>('classic');
  const [mobileControlsEnabled, setMobileControlsEnabled] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(pointer: coarse)').matches : false,
  );
  const [mobileMoveInput, setMobileMoveInput] = useState({ x: 0, y: 0 });
  const [mobileRun, setMobileRun] = useState(false);
  const [jumpTrigger, setJumpTrigger] = useState(0);
  const [interactTrigger, setInteractTrigger] = useState(0);
  const [victoryTrigger, setVictoryTrigger] = useState(0);
  const [palaceIntroTrigger, setPalaceIntroTrigger] = useState(0);
  const [isPalaceIntroActive, setIsPalaceIntroActive] = useState(false);
  const [atelierZone, setAtelierZone] = useState<AtelierZone>('lobby');
  const [atelierWarp, setAtelierWarp] = useState<AtelierWarpRequest | null>(null);
  const [autoPortalRequest, setAutoPortalRequest] = useState<AutoPortalRequest | null>(null);
  const [autoEnteringMission, setAutoEnteringMission] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const voiceTelemetryRef = useRef<VoiceTelemetry>({ isRecording: false, level: 0 });

  const [showAudioPopover, setShowAudioPopover] = useState(false);

  const [audioSettings, setAudioSettings] = useState<AudioSettings>(() =>
    soundEngine.getSettings(),
  );
  const narrationMutedRef = useRef(Boolean(audioSettings.narrationMuted));
  narrationMutedRef.current = Boolean(audioSettings.narrationMuted);

  // Restore existing session on load
  useEffect(() => {
    let cancelled = false;
    const fetchWithRetry = async (
      input: RequestInfo | URL,
      init?: RequestInit,
      retries = 2,
    ): Promise<Response | null> => {
      for (let attempt = 0; attempt <= retries; attempt++) {
        if (cancelled) return null;
        try {
          return await fetch(input, init);
        } catch {
          if (attempt < retries) {
            await new Promise((r) => window.setTimeout(r, 450 * (attempt + 1)));
          }
        }
      }
      return null;
    };

    const boot = async () => {
      try {
        const statusRes = await fetchWithRetry('/api/system/status');
        if (!cancelled && statusRes?.ok) {
          const s = (await statusRes.json()) as { config?: AdminContentConfig };
          if (s.config) setSystemConfig(s.config);
        }

        const savedToken = localStorage.getItem('kos_token') || '';
        const meRes = await fetchWithRetry('/api/auth/me', {
          headers: savedToken ? { Authorization: `Bearer ${savedToken}` } : {},
        });
        if (!cancelled && meRes?.ok) {
          const d = (await meRes.json()) as {
            user: AuthUser;
            progress: PlayerProgress | null;
          };
          setUser(d.user);
          setToken(savedToken);
          soundEngine.setAuthToken(savedToken);
          setAudioSettings(soundEngine.loadSettingsForUser(d.user.id));
          const normalizedProgress =
            d.progress && d.progress.currentLocation === 'gate_hall'
              ? { ...d.progress, currentLocation: 'citadel' as LocationId }
              : d.progress;
          setProgress(normalizedProgress);
        }
      } catch {
        // Fallback to clean sign-in screen when offline or server unavailable
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    };
    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((curr) => (curr === msg ? '' : curr));
    }, 3800);
  }, []);

  const isEvaluatorAccount = user?.role === 'teacher' || user?.role === 'admin';
  const activeProgress: PlayerProgress | null = !user
    ? null
    : user.role === 'student'
      ? progress
      : educatorPreviewProgress;

  const enterEducatorWorld3D = useCallback(() => {
    if (!user || !isEvaluatorAccount) return;
    const preview = educatorPreviewProgress ?? createEducatorPreviewProgress(user);
    setEducatorPreviewProgress(preview);
    soundEngine.setLocationAmbience(preview.currentLocation);
    setEducatorIn3D(true);
    setActiveMissionModal(null);
    setActiveHubModal(null);
    setActiveDialogue(null);
    setPendingMissionIntro(getMissionIntroMeta(preview.currentLocation));
    setCompletedSuccessMission(null);
    if (!soundEngine.getMusicMuted()) {
      soundEngine.init();
      soundEngine.startMusic();
    }
  }, [user, isEvaluatorAccount, educatorPreviewProgress]);

  const updateProgress = useCallback(
    async (patch: Partial<PlayerProgress>, triggerVictory = false): Promise<boolean> => {
      if (!user || !activeProgress) return false;

      // Educator 3D preview state (in-memory only, never writes to student DB)
      if (isEvaluatorAccount) {
        if (triggerVictory) {
          setVictoryTrigger((v) => v + 1);
        }
        setEducatorPreviewProgress((prev) =>
          prev ? applyEducatorPreviewPatch(prev, patch) : prev,
        );
        return true;
      }

      // Authentic Student Persistence
      if (!progress) return false;
      try {
        const res = await fetch('/api/progress', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(patch),
        });
        if (res.ok) {
          const data = (await res.json()) as { progress: PlayerProgress };
          setProgress(data.progress);
          if (triggerVictory) {
            setVictoryTrigger((v) => v + 1);
          }
          return true;
        }
        showToast('Gagal menyimpan data ke pelayan. Sila cuba lagi.');
        return false;
      } catch {
        showToast('Sambungan pelayan terganggu semasa menyimpan rekod.');
        return false;
      }
    },
    [user, activeProgress, isEvaluatorAccount, progress, token, showToast],
  );

  const handleTeleport = useCallback(
    (target: LocationId, missionHintNumber?: 1 | 2 | 3 | 4 | 5) => {
      if (!activeProgress) return;
      const locMeta = LOCATIONS.find((l) => l.id === target);
      const alreadyAtAtelier = activeProgress.currentLocation === 'atelier' && target === 'atelier';

      soundEngine.stopNarration();
      voiceTelemetryRef.current = { isRecording: false, level: 0 };
      setActiveMissionModal(null);
      setActiveHubModal(null);
      setActiveDialogue(null);
      setPendingMissionIntro(null);
      setCompletedSuccessMission(null);
      setAutoEnteringMission(null);

      soundEngine.playPortalSound();
      setTeleportingLabel(
        missionHintNumber === 4
          ? 'Balai Gema Diraja'
          : missionHintNumber === 3
            ? 'Balai Cipta Mahkota'
            : locMeta?.name || 'Lokasi Baharu',
      );
      window.setTimeout(() => {
        soundEngine.setLocationAmbience(target);
        if (!alreadyAtAtelier) {
          void updateProgress({ currentLocation: target });
        }
        if (target === 'atelier' && missionHintNumber === 4) {
          setAtelierWarp((prev) => ({
            seq: (prev?.seq ?? 0) + 1,
            x: 8.8,
            z: 2.2,
            yaw: -Math.PI * 0.35,
          }));
        } else if (target === 'atelier' && missionHintNumber === 3) {
          setAtelierWarp((prev) => ({
            seq: (prev?.seq ?? 0) + 1,
            x: -8.8,
            z: 2.2,
            yaw: Math.PI * 0.35,
          }));
        }
        setPendingMissionIntro(getMissionIntroMeta(target, missionHintNumber));
        window.setTimeout(() => {
          setTeleportingLabel('');
        }, 420);
      }, 480);
    },
    [activeProgress, updateProgress],
  );

  const handleSelectGateMission = useCallback(
    (missionNumber: 1 | 2 | 3 | 4 | 5) => {
      if (!activeProgress || autoEnteringMission || teleportingLabel) return;
      soundEngine.playCrystalChimeSound();
      setActiveDialogue(null);
      setActiveHubModal(null);
      setActiveMissionModal(null);
      setAutoEnteringMission(missionNumber);
      setAutoPortalRequest((prev) => ({
        seq: (prev?.seq ?? 0) + 1,
        missionNumber,
      }));
    },
    [activeProgress, autoEnteringMission, teleportingLabel],
  );

  const handleAutoPortalArrived = useCallback(
    (targetLocation: LocationId, missionNumber: 1 | 2 | 3 | 4 | 5) => {
      setAutoEnteringMission(null);
      handleTeleport(targetLocation, missionNumber);
    },
    [handleTeleport],
  );

  const handleReturnToCitadel = useCallback(() => {
    handleTeleport('citadel');
  }, [handleTeleport]);

  useEffect(() => {
    return soundEngine.subscribeNarration(setIsDialogueSpeaking);
  }, []);

  // Auto-play guardian NPC dialogue instruction line when dialogue opens or advances
  useEffect(() => {
    if (!activeDialogue) {
      soundEngine.stopNarration();
      return;
    }
    const line = activeDialogue.lines[activeDialogue.index] || '';
    soundEngine.stopNarration();
    if (!narrationMutedRef.current && line) {
      void soundEngine.speakMalay(line, {
        voiceRole: activeDialogue.voiceRole,
        styleHint: 'instruction',
      });
    }
    return () => {
      soundEngine.stopNarration();
    };
  }, [activeDialogue?.voiceRole, activeDialogue?.index]);

  // Sync Atelier sub-chamber BGM (Balai Cipta Mahkota vs Balai Gema Diraja)
  useEffect(() => {
    soundEngine.setAtelierZone(atelierZone);
  }, [atelierZone]);

  // Softly duck BGM inside focused audio/recording/performance modals
  useEffect(() => {
    const shouldDuck =
      activeMissionModal === 'atelier_voice' ||
      activeMissionModal === 'theatre_stage' ||
      activeMissionModal === 'library_audio';
    soundEngine.setMissionActivityDuck(shouldDuck);
    return () => {
      soundEngine.setMissionActivityDuck(false);
    };
  }, [activeMissionModal]);

  // Close compact audio popover automatically when any modal or dialogue opens
  useEffect(() => {
    if (activeMissionModal || activeHubModal || activeDialogue || pendingMissionIntro) {
      setShowAudioPopover(false);
    }
  }, [activeMissionModal, activeHubModal, activeDialogue, pendingMissionIntro]);

  // Global keyboard shortcuts: Esc for pause/settings, H for HUD dock toggle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.code === 'Escape') {
        if (showAudioPopover) {
          setShowAudioPopover(false);
        } else if (activeMissionModal) {
          voiceTelemetryRef.current = { isRecording: false, level: 0 };
          soundEngine.setVoiceCapturePaused(false);
          setActiveMissionModal(null);
        } else if (activeDialogue) {
          setActiveDialogue(null);
        } else if (activeHubModal) {
          setActiveHubModal(null);
        } else if (user && (user.role === 'student' || educatorIn3D) && !showCinematic) {
          setActiveHubModal('settings');
        }
      }
      if (e.code === 'KeyH' && !activeMissionModal && !activeHubModal && !activeDialogue) {
        setDockCollapsed((c) => !c);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeMissionModal, activeDialogue, activeHubModal, user, educatorIn3D, showCinematic, showAudioPopover]);

  const handleInteract = useCallback(
    (action: InteractAction, _item: InteractablePoint) => {
      if (!activeProgress) return;

      switch (action.type) {
        case 'portal':
          handleTeleport(action.targetLocation, action.missionHintNumber);
          break;
        case 'npc': {
          const npc = NPC_DIALOGUES[action.npcKey];
          setActiveDialogue({
            voiceRole: action.npcKey,
            name: npc.name,
            role: npc.role,
            lines: npc.lines,
            index: 0,
          });
          break;
        }
        case 'mission_board':
          setActiveHubModal('journal');
          break;
        case 'hero_pedestal':
          setActiveHubModal('hero_select');
          break;
        case 'library_audio':
          setActiveMissionModal('library_audio');
          break;
        case 'library_manuscript':
          setActiveMissionModal('library_manuscript');
          break;
        case 'collect_fragment': {
          if (!activeProgress.collectedFragmentIds.includes(action.fragmentId)) {
            soundEngine.playCollectSound();
            const nextIds = [...activeProgress.collectedFragmentIds, action.fragmentId];
            void updateProgress({ collectedFragmentIds: nextIds }, nextIds.length === 5);
            showToast(
              nextIds.length === 5
                ? 'Kesemua 5 serpihan kisah ditemui! Menuju ke Altar Kronologi Batu Purba.'
                : `Serpihan kisah ditemui (${nextIds.length}/5)! Teruskan mencari atau ke Altar Kronologi.`,
            );
          }
          break;
        }
        case 'woods_altar':
          setActiveMissionModal('woods_altar');
          break;
        case 'atelier_writer':
          setActiveMissionModal('atelier_writer');
          break;
        case 'atelier_voice':
          setActiveMissionModal('atelier_voice');
          break;
        case 'atelier_teleport':
          soundEngine.playPortalSound();
          setTeleportingLabel(action.targetZoneName);
          window.setTimeout(() => {
            setAtelierWarp((prev) => ({
              seq: (prev?.seq ?? 0) + 1,
              x: action.targetX,
              z: action.targetZ,
              yaw: action.targetYaw,
            }));
            window.setTimeout(() => {
              setTeleportingLabel('');
            }, 340);
          }, 320);
          break;
        case 'theatre_stage':
          setActiveMissionModal('theatre_stage');
          break;
      }
    },
    [activeProgress, handleTeleport, showToast, updateProgress],
  );

  const handleLogout = async () => {
    soundEngine.stopNarration();
    soundEngine.stopMusic();
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Proceed with local logout even if server request fails
    }
    localStorage.removeItem('kos_token');
    soundEngine.setAuthToken('');
    setUser(null);
    setToken('');
    setProgress(null);
    setEducatorIn3D(false);
    setEducatorPreviewProgress(null);
    setActiveHubModal(null);
    setActiveMissionModal(null);
    setPendingMissionIntro(null);
    setCompletedSuccessMission(null);
    setAutoPortalRequest(null);
    setAutoEnteringMission(null);
    voiceTelemetryRef.current = { isRecording: false, level: 0 };
    soundEngine.setVoiceCapturePaused(false);
    setShowAudioPopover(false);
    setActiveDialogue(null);
    setShowCinematic(false);
  };

  // Virtual Joystick touch tracking
  const joyOriginRef = useRef<{ x: number; y: number } | null>(null);
  const handleJoyPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    joyOriginRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  };
  const handleJoyPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!joyOriginRef.current) return;
    const dx = e.clientX - joyOriginRef.current.x;
    const dy = e.clientY - joyOriginRef.current.y;
    const maxR = 40;
    const dist = Math.hypot(dx, dy);
    const clamped = dist > maxR ? maxR / dist : 1;
    setMobileMoveInput({
      x: (dx * clamped) / maxR,
      y: -(dy * clamped) / maxR,
    });
  };
  const handleJoyPointerUp = () => {
    joyOriginRef.current = null;
    setMobileMoveInput({ x: 0, y: 0 });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#162038] text-[#FAF6EE]">
        <div className="text-center space-y-2">
          <div className="font-display text-2xl text-[#D4AF37]">Kingdom of Stories</div>
          <p className="text-xs text-[#C8B6E2]">Memuatkan gerbang kerajaan...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthAndTitleScreen
        announcement={systemConfig?.announcement}
        onAuthenticated={(authedUser, newToken, prog) => {
          soundEngine.setAuthToken(newToken);
          setUser(authedUser);
          setToken(newToken);
          const normalizedProg =
            prog && prog.currentLocation === 'gate_hall'
              ? { ...prog, currentLocation: 'citadel' as LocationId }
              : prog;
          setProgress(normalizedProg);
          soundEngine.setLandingAmbience(false);
          const loadedAudio = soundEngine.loadSettingsForUser(authedUser.id);
          setAudioSettings(loadedAudio);
          if (authedUser.role === 'student') {
            soundEngine.setLocationAmbience(normalizedProg?.currentLocation || 'citadel');
            if (!loadedAudio.musicMuted) {
              soundEngine.init();
              soundEngine.startMusic();
            }
            setShowCinematic(true);
            if (normalizedProg && normalizedProg.completedMissions.length === 0) {
              setShowInitialHeroPick(true);
            }
          } else {
            soundEngine.stopMusic();
          }
        }}
      />
    );
  }

  if (user.role === 'teacher' && !educatorIn3D) {
    return (
      <TeacherPortal
        user={user}
        token={token}
        onEnterWorld3D={enterEducatorWorld3D}
        onLogout={handleLogout}
      />
    );
  }

  if (user.role === 'admin' && !educatorIn3D) {
    return (
      <AdminPortal
        user={user}
        token={token}
        onEnterWorld3D={enterEducatorWorld3D}
        onLogout={handleLogout}
      />
    );
  }

  if (!activeProgress) return null;

  if (showCinematic) {
    return (
      <OpeningCinematic
        onComplete={() => {
          setShowCinematic(false);
          if (showInitialHeroPick) {
            setActiveHubModal('hero_select');
            setShowInitialHeroPick(false);
          } else if (
            activeProgress.currentLocation === 'citadel' ||
            activeProgress.currentLocation === 'gate_hall'
          ) {
            setPalaceIntroTrigger((n) => n + 1);
          } else {
            setPendingMissionIntro(getMissionIntroMeta(activeProgress.currentLocation));
          }
        }}
      />
    );
  }

  const currentLocMeta = LOCATIONS.find((l) => l.id === activeProgress.currentLocation) || LOCATIONS[0];
  const currentHeroMeta = HEROES.find((h) => h.id === activeProgress.selectedHero) || HEROES[0];
  const nextMission =
    MISSION_ORDER.find((m) => !activeProgress.completedMissions.includes(m.id)) || MISSION_ORDER[4];
  const isModalOpen = Boolean(
    activeMissionModal ||
      activeHubModal ||
      activeDialogue ||
      pendingMissionIntro ||
      completedSuccessMission,
  );

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#162038] text-[#FAF6EE]">
      {/* Real-Time Playable 3D World */}
      <GameViewport3D
        progress={activeProgress}
        paused={isModalOpen || Boolean(teleportingLabel)}
        isTalking={Boolean(activeDialogue)}
        cameraMode={cameraMode}
        mobileMoveInput={mobileMoveInput}
        mobileRun={mobileRun}
        jumpTrigger={jumpTrigger}
        interactTrigger={interactTrigger}
        victoryTrigger={victoryTrigger}
        palaceIntroTrigger={palaceIntroTrigger}
        atelierWarp={atelierWarp}
        autoPortalRequest={autoPortalRequest}
        voiceTelemetryRef={voiceTelemetryRef}
        onAtelierZoneChange={setAtelierZone}
        onNearInteractable={setNearItem}
        onInteract={handleInteract}
        onAutoPortalArrived={handleAutoPortalArrived}
        onRequestPortalAutoEntry={handleSelectGateMission}
        onPalaceIntroActiveChange={setIsPalaceIntroActive}
      />

      {/* Minimal Unobtrusive Top-Left Royal RPG HUD */}
      {!isPalaceIntroActive && (
        <div className="pointer-events-none absolute top-4 left-4 z-20 max-w-sm">
          <div className="pointer-events-auto rounded-xl border border-[#E5C97B]/55 bg-[#101930]/92 px-4 py-3 shadow-xl space-y-1">
            <div className="flex items-center gap-2 text-xs text-[#E5C97B] font-semibold">
              <Compass className="w-3.5 h-3.5 shrink-0" />
              <span>
                {activeProgress.currentLocation === 'atelier'
                  ? atelierZone === 'workshop'
                    ? 'Balai Cipta Mahkota'
                    : atelierZone === 'studio'
                      ? 'Balai Gema Diraja'
                      : currentLocMeta.name
                  : currentLocMeta.name}
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-[#D5C4EE]">
                {currentHeroMeta.name} ({currentHeroMeta.title})
              </span>
            </div>
            {(activeProgress.currentLocation === 'citadel' ||
              activeProgress.currentLocation === 'gate_hall') && (
              <div className="text-[10px] text-[#E5C97B]/90 tracking-wide">
                Pusat Utama Pemilihan 5 Misi · Klik Misi atau Portal
              </div>
            )}
            {activeProgress.currentLocation === 'library' && (
              <div className="text-[10px] text-[#C8B6E2]/85 tracking-wide">
                The Grand Enchanted Royal Library
              </div>
            )}
            {activeProgress.currentLocation === 'woods' && (
              <div className="text-[10px] text-[#7BE0E6]/85 tracking-wide">
                The Crown of Enchanted Light
              </div>
            )}
            {activeProgress.currentLocation === 'atelier' && (
              <div className="text-[10px] text-[#E5C97B]/85 tracking-wide">
                {atelierZone === 'workshop'
                  ? 'The Royal Enchanted Workshop'
                  : atelierZone === 'studio'
                    ? 'The Royal Voice Recording Chamber'
                    : 'Balai Cipta Mahkota · Balai Gema Diraja'}
              </div>
            )}
            {activeProgress.currentLocation === 'theatre' && (
              <div className="text-[10px] text-[#E5C97B]/85 tracking-wide">
                The Grand Radiant Royal Hall
              </div>
            )}
            <div className="text-xs text-[#FAF6EE]/92">
              {activeProgress.festivalUnlocked
                ? 'Semua 5 Misi Selesai · Festival Cahaya Diraja Aktif!'
                : `Misi Semasa: ${nextMission.title} (${activeProgress.completedMissions.length}/5)`}
            </div>
            <div className="text-[11px] text-[#8DE0E6]">
              WASD Gerak · Shift Lari · Space Lompat · Seret Tetikus Pusing Kamera · E Interaksi
            </div>
          </div>
        </div>
      )}

      {/* Top-Right Compact Quick Actions */}
      {!isPalaceIntroActive && (
        <div className="pointer-events-none absolute top-4 right-4 z-30 flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {isEvaluatorAccount && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.stopMusic();
                  setEducatorIn3D(false);
                }}
                className="pointer-events-auto px-3.5 py-2 rounded-xl border border-[#FAF6EE]/25 bg-[#101930]/92 text-xs font-semibold text-[#FAF6EE] shadow-lg hover:bg-[#1E315E]"
              >
                {user.role === 'teacher' ? 'Portal Guru' : 'Portal Pentadbir'}
              </button>
            )}
            {isAllFiveMissionsVerified(activeProgress) && (
              <button
                type="button"
                onClick={() => setActiveHubModal('festival_finale')}
                className="pointer-events-auto flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E5C97B] bg-[#1E315E]/95 text-xs font-semibold text-[#E5C97B] shadow-lg hover:bg-[#2A427A]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Festival Cahaya</span>
              </button>
            )}
            {activeProgress.currentLocation !== 'citadel' &&
              activeProgress.currentLocation !== 'gate_hall' && (
                <button
                  type="button"
                  onClick={handleReturnToCitadel}
                  className="pointer-events-auto flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-[#E5C97B] bg-[#142044]/95 text-xs font-bold text-[#E5C97B] shadow-xl hover:bg-[#1E315E]"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>KEMBALI KE BALAI AGUNG DIRAJA</span>
                </button>
              )}
            <button
              type="button"
              onClick={() => setShowAudioPopover((prev) => !prev)}
              aria-expanded={showAudioPopover}
              aria-label="Kawalan Audio"
              className={`pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold shadow-lg transition-colors ${
                showAudioPopover
                  ? 'border-[#E5C97B] bg-[#1E315E] text-[#E5C97B]'
                  : 'border-[#FAF6EE]/25 bg-[#101930]/92 text-[#FAF6EE] hover:bg-[#1E315E]'
              }`}
            >
              {audioSettings.musicMuted && audioSettings.sfxMuted && audioSettings.narrationMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-red-300" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-[#E5C97B]" />
              )}
              <span>Audio</span>
            </button>
          </div>

          {showAudioPopover && (
            <div className="pointer-events-auto">
              <AudioControlPanel
                variant="compact"
                audioSettings={audioSettings}
                onUpdateAudio={(next) => {
                  setAudioSettings(next);
                  soundEngine.updateSettings(next);
                }}
                onClose={() => setShowAudioPopover(false)}
              />
            </div>
          )}
        </div>
      )}

      {/* Auto-Entering Portal Banner */}
      {autoEnteringMission !== null && !teleportingLabel && (
        <div className="pointer-events-none absolute top-24 left-1/2 -translate-x-1/2 z-30">
          <div className="rounded-xl border border-[#E5C97B] bg-[#101933]/94 px-5 py-2.5 text-xs sm:text-sm font-semibold text-[#FAF6EE] shadow-2xl flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#E5C97B]" />
            <span>
              Menuju ke Portal Misi {autoEnteringMission} –{' '}
              {GATE_HALL_MISSIONS.find((m) => m.number === autoEnteringMission)?.locationName}...
            </span>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="pointer-events-none absolute top-24 left-1/2 -translate-x-1/2 z-30">
          <div className="rounded-xl border border-[#D4AF37]/60 bg-[#1B2948]/95 px-5 py-2.5 text-xs sm:text-sm font-medium text-[#FAF6EE] shadow-xl">
            {toastMsg}
          </div>
        </div>
      )}

      {/* Balai Agung Diraja Compact 5-Mission One-Click Panel */}
      {(activeProgress.currentLocation === 'citadel' ||
        activeProgress.currentLocation === 'gate_hall') &&
        !isModalOpen &&
        !isPalaceIntroActive &&
        !teleportingLabel && (
          <RoyalGateHallOverlay
            progress={activeProgress}
            dockCollapsed={dockCollapsed}
            disabled={autoEnteringMission !== null}
            activeMissionNumber={autoEnteringMission}
            onSelectMission={handleSelectGateMission}
          />
        )}

      {/* Contextual Interaction Prompt (E) */}
      {nearItem &&
        !isModalOpen &&
        !isPalaceIntroActive &&
        autoEnteringMission === null && (
          <div className="pointer-events-none absolute bottom-28 left-1/2 -translate-x-1/2 z-20">
            <button
              type="button"
              onClick={() => setInteractTrigger((c) => c + 1)}
              className={`pointer-events-auto flex items-center gap-3 rounded-xl px-5 py-3 shadow-2xl transition-transform active:scale-95 ${
                nearItem.id === 'lib-audio' || nearItem.id === 'lib-manuscript'
                  ? 'border-2 border-[#7BE0E6]/80 bg-[#121B38]/95 shadow-[0_0_26px_rgba(123,224,230,0.3)] hover:bg-[#1B2A54]'
                  : 'border border-[#E5C97B] bg-[#101930]/94 hover:bg-[#1E315E]'
              }`}
            >
              <span
                className={`w-7 h-7 rounded-md font-mono-tabular font-bold text-xs flex items-center justify-center shrink-0 ${
                  nearItem.id === 'lib-audio' || nearItem.id === 'lib-manuscript'
                    ? 'bg-[#7BE0E6] text-[#0E152B]'
                    : 'bg-[#E5C97B] text-[#101930]'
                }`}
              >
                E
              </span>
              <div className="text-left">
                <div className="text-xs sm:text-sm font-semibold text-[#FAF6EE]">{nearItem.label}</div>
                <div className="text-[11px] text-[#D5C4EE]">{nearItem.sublabel}</div>
              </div>
            </button>
          </div>
        )}

      {/* Collapsible Unified Bottom Control Dock */}
      {!isPalaceIntroActive && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
        <button
          type="button"
          onClick={() => setDockCollapsed((c) => !c)}
          className="pointer-events-auto mb-1.5 flex items-center gap-1.5 px-3 py-1 rounded-t-lg border border-b-0 border-[#D4AF37]/35 bg-[#162038]/92 text-[11px] text-[#C8B6E2] hover:text-[#FAF6EE]"
        >
          {dockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{dockCollapsed ? 'Buka Menu (H)' : 'Sembunyi (H)'}</span>
        </button>

        {!dockCollapsed && (
          <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 rounded-2xl border border-[#D4AF37]/40 bg-[#162038]/95 px-3 py-2 shadow-2xl max-w-[94vw] overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveHubModal('hero_select')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-[#233256] whitespace-nowrap shrink-0"
            >
              <UserCheck className="w-4 h-4 text-[#7FA88C]" />
              <span>Wira</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveHubModal('world_map')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-[#233256] whitespace-nowrap shrink-0"
            >
              <MapIcon className="w-4 h-4 text-[#8FBCE0]" />
              <span>Peta Dunia</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveHubModal('journal')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-[#233256] whitespace-nowrap shrink-0"
            >
              <BookOpen className="w-4 h-4 text-[#D4AF37]" />
              <span>Jurnal Misi</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveHubModal('collab')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-[#233256] whitespace-nowrap shrink-0"
            >
              <Users className="w-4 h-4 text-[#C8B6E2]" />
              <span>Kolaborasi</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveHubModal('portfolio')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-[#233256] whitespace-nowrap shrink-0"
            >
              <Award className="w-4 h-4 text-[#D4AF37]" />
              <span>Portfolio & Sijil</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveHubModal('settings')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium hover:bg-[#233256] whitespace-nowrap shrink-0"
            >
              <Settings className="w-4 h-4 text-[#EFE6D5]" />
              <span>Tetapan (Esc)</span>
            </button>
          </div>
        )}
      </div>
      )}

      {/* Mobile Touch Controls (Joystick + Run/Jump/Interact) */}
      {mobileControlsEnabled && !isModalOpen && autoEnteringMission === null && (
        <>
          <div
            onPointerDown={handleJoyPointerDown}
            onPointerMove={handleJoyPointerMove}
            onPointerUp={handleJoyPointerUp}
            onPointerCancel={handleJoyPointerUp}
            className="fixed bottom-24 left-6 z-20 w-28 h-28 rounded-full border-2 border-[#D4AF37]/50 bg-[#162038]/80 flex items-center justify-center touch-none"
          >
            <div
              className="w-11 h-11 rounded-full bg-[#D4AF37]/90 border border-[#FAF6EE]"
              style={{
                transform: `translate(${mobileMoveInput.x * 28}px, ${-mobileMoveInput.y * 28}px)`,
              }}
            />
          </div>

          <div className="fixed bottom-24 right-6 z-20 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setInteractTrigger((c) => c + 1)}
              className="px-4 py-3 rounded-xl bg-[#D4AF37] text-[#162038] font-bold text-xs shadow-lg"
            >
              Interaksi (E)
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMobileRun((r) => !r)}
                className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold ${
                  mobileRun
                    ? 'bg-[#7FA88C] text-[#162038] border-[#7FA88C]'
                    : 'bg-[#162038]/90 text-[#FAF6EE] border-[#FAF6EE]/25'
                }`}
              >
                {mobileRun ? 'Lari: ON' : 'Lari'}
              </button>
              <button
                type="button"
                onClick={() => setJumpTrigger((j) => j + 1)}
                className="px-3.5 py-2.5 rounded-xl border border-[#FAF6EE]/25 bg-[#162038]/90 text-xs font-semibold text-[#FAF6EE]"
              >
                Lompat
              </button>
            </div>
          </div>
        </>
      )}

      {/* NPC Dialogue Overlay with Subtitles & Voice Controls */}
      {activeDialogue && (
        <div className="fixed inset-x-0 bottom-6 z-30 flex justify-center px-4">
          <div className="w-full max-w-3xl rounded-2xl border border-[#D4AF37]/55 bg-[#162038]/95 p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-display text-base font-semibold text-[#D4AF37]">
                  {activeDialogue.name}
                </div>
                <div className="text-xs text-[#C8B6E2]">{activeDialogue.role}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (audioSettings.narrationMuted) {
                      const next = { ...audioSettings, narrationMuted: false };
                      setAudioSettings(next);
                      soundEngine.updateSettings(next);
                    }
                    void soundEngine.speakMalay(activeDialogue.lines[activeDialogue.index], {
                      voiceRole: activeDialogue.voiceRole,
                      styleHint: 'instruction',
                      ignoreMute: true,
                    });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D4AF37]/45 bg-[#1B2948] text-xs font-medium text-[#E5C97B] hover:bg-[#233256]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Main Semula</span>
                </button>
                <button
                  type="button"
                  disabled={!isDialogueSpeaking}
                  onClick={() => soundEngine.stopNarration()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#FAF6EE]/20 bg-[#1B2948] text-xs font-medium text-[#FAF6EE] hover:bg-[#233256] disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  <VolumeX className="w-3.5 h-3.5 text-[#E5C97B]" />
                  <span>Hentikan Audio</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextMuted = !audioSettings.narrationMuted;
                    const next = { ...audioSettings, narrationMuted: nextMuted };
                    setAudioSettings(next);
                    soundEngine.updateSettings(next);
                    if (!nextMuted && activeDialogue.lines[activeDialogue.index]) {
                      void soundEngine.speakMalay(activeDialogue.lines[activeDialogue.index], {
                        voiceRole: activeDialogue.voiceRole,
                        styleHint: 'instruction',
                        ignoreMute: true,
                      });
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    audioSettings.narrationMuted
                      ? 'border-red-400/45 bg-red-950/50 text-red-200 hover:bg-red-900/60'
                      : 'border-[#7BE0E6]/40 bg-[#1B2948] text-[#7BE0E6] hover:bg-[#233256]'
                  }`}
                >
                  {audioSettings.narrationMuted ? (
                    <VolumeX className="w-3.5 h-3.5" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {audioSettings.narrationMuted ? 'Bunyikan Suara' : 'Senyapkan Suara'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDialogue(null)}
                  className="p-1.5 rounded-lg border border-[#FAF6EE]/15 hover:bg-[#FAF6EE]/10"
                  aria-label="Tutup dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {audioSettings.showSubtitles && (
              <p className="text-sm sm:text-base leading-relaxed text-[#FAF6EE]">
                {activeDialogue.lines[activeDialogue.index]}
              </p>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-[#FAF6EE]/10">
              <span className="font-mono-tabular text-xs text-[#8FBCE0]">
                {activeDialogue.index + 1} / {activeDialogue.lines.length}
              </span>
              <div className="flex gap-2">
                {activeDialogue.index < activeDialogue.lines.length - 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveDialogue((d) => (d ? { ...d, index: d.index + 1 } : null))
                    }
                    className="px-4 py-1.5 rounded-lg bg-[#D4AF37] text-[#162038] text-xs font-semibold"
                  >
                    Seterusnya
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveDialogue(null)}
                    className="px-4 py-1.5 rounded-lg bg-[#D4AF37] text-[#162038] text-xs font-semibold"
                  >
                    Tamat Perbualan
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Portal Teleportation Magical Transition */}
      {teleportingLabel && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#162038] text-[#FAF6EE]">
          <div className="w-20 h-20 rounded-full border-4 border-[#D4AF37] border-t-transparent animate-spin mb-5" />
          <p className="text-xs tracking-widest uppercase text-[#C8B6E2]">
            Portal Ajaib Diaktifkan
          </p>
          <h2 className="font-display text-2xl sm:text-3xl text-[#D4AF37] mt-1">
            Memasuki {teleportingLabel}
          </h2>
        </div>
      )}

      {/* Active Learning Mission Modal */}
      {activeMissionModal && (
        <MissionPanels
          modal={activeMissionModal}
          progress={activeProgress}
          token={token}
          audioSettings={audioSettings}
          onUpdateAudio={(next) => {
            setAudioSettings(next);
            soundEngine.updateSettings(next);
          }}
          onUpdateProgress={updateProgress}
          onMissionCompleteSuccess={(num) => setCompletedSuccessMission(num)}
          onVoiceActivity={(activity) => {
            voiceTelemetryRef.current = activity;
            soundEngine.setVoiceCapturePaused(activity.isRecording);
          }}
          onClose={() => {
            voiceTelemetryRef.current = { isRecording: false, level: 0 };
            soundEngine.setVoiceCapturePaused(false);
            setActiveMissionModal(null);
          }}
          onShowFestivalFinale={() => setActiveHubModal('festival_finale')}
        />
      )}

      {/* Royal Finale: Sijil Penghargaan Diraja + Festival Cahaya 3D Celebration */}
      {activeHubModal === 'festival_finale' && (
        <RoyalFinaleExperience
          progress={activeProgress}
          isEvaluatorAccount={isEvaluatorAccount}
          audioSettings={audioSettings}
          onUpdateAudio={(next) => {
            setAudioSettings(next);
            soundEngine.updateSettings(next);
          }}
          onReturnToBalaiAgung={() => {
            setActiveHubModal(null);
            handleTeleport('citadel');
          }}
          onCloseLocked={() => setActiveHubModal(null)}
        />
      )}

      {/* World Hub Modals (Hero Select, World Map, Journal, Collab, Portfolio, Settings) */}
      {activeHubModal && activeHubModal !== 'festival_finale' && (
        <WorldHubModals
          modal={activeHubModal}
          progress={activeProgress}
          token={token}
          isEvaluatorAccount={isEvaluatorAccount}
          audioSettings={audioSettings}
          cameraMode={cameraMode}
          mobileControlsEnabled={mobileControlsEnabled}
          onUpdateAudio={(next) => {
            setAudioSettings(next);
            soundEngine.updateSettings(next);
          }}
          onChangeCameraMode={setCameraMode}
          onToggleMobileControls={() => setMobileControlsEnabled((v) => !v)}
          onUpdateProgress={async (patch) => {
            await updateProgress(patch);
          }}
          onTeleport={handleTeleport}
          onSwitchToPortfolio={() => setActiveHubModal('portfolio')}
          onOpenFestivalFinale={
            isAllFiveMissionsVerified(activeProgress)
              ? () => setActiveHubModal('festival_finale')
              : undefined
          }
          onBackToEducatorPortal={
            isEvaluatorAccount
              ? () => {
                  soundEngine.stopMusic();
                  setEducatorIn3D(false);
                }
              : undefined
          }
          onReplayCinematic={() => setShowCinematic(true)}
          onReplayPalaceIntro={() => setPalaceIntroTrigger((n) => n + 1)}
          onLogout={handleLogout}
          onClose={() => {
            const wasHero = activeHubModal === 'hero_select';
            setActiveHubModal(null);
            if (wasHero) {
              if (activeProgress.currentLocation === 'citadel' && activeProgress.completedMissions.length === 0) {
                setPalaceIntroTrigger((n) => n + 1);
              } else if (
                activeProgress.currentLocation !== 'gate_hall' &&
                activeProgress.currentLocation !== 'citadel'
              ) {
                setPendingMissionIntro(getMissionIntroMeta(activeProgress.currentLocation));
              }
            }
          }}
        />
      )}

      {/* Pre-Mission General Instruction Popup */}
      {pendingMissionIntro && !teleportingLabel && !showCinematic && !activeHubModal && (
        <MissionIntroPopup
          missionNumber={pendingMissionIntro.missionNumber}
          missionBadge={pendingMissionIntro.missionBadge}
          locationTitle={pendingMissionIntro.locationTitle}
          onStartMission={() => setPendingMissionIntro(null)}
          onBack={() => {
            setPendingMissionIntro(null);
            handleTeleport('citadel');
          }}
        />
      )}

      {/* End-of-Mission Success Popup */}
      {completedSuccessMission && (
        <MissionSuccessPopup
          missionNumber={completedSuccessMission}
          mission2Confirmed={activeProgress.woodsCompleted}
          mission3Summary={activeProgress.scriptPlan}
          onConfirmMission2Complete={async () => {
            await updateProgress({ woodsCompleted: true }, true);
          }}
          onBackToMap={() => {
            setCompletedSuccessMission(null);
            setActiveHubModal('world_map');
          }}
          onBackToGateHall={() => {
            setCompletedSuccessMission(null);
            handleTeleport('citadel');
          }}
          onContinueNext={() => {
            const doneNum = completedSuccessMission;
            setCompletedSuccessMission(null);
            if (doneNum === 1) {
              handleTeleport('woods', 2);
            } else if (doneNum === 2) {
              if (!activeProgress.woodsCompleted) {
                void updateProgress({ woodsCompleted: true });
              }
              handleTeleport('atelier', 3);
            } else if (doneNum === 3) {
              handleTeleport('atelier', 4);
            } else if (doneNum === 4) {
              handleTeleport('theatre', 5);
            } else {
              setActiveHubModal('festival_finale');
            }
          }}
        />
      )}
    </div>
  );
}

export default App;
