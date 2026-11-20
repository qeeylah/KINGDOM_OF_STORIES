import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Award,
  Compass,
  Crown,
  Lock,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { MISSION_ORDER } from '../data/gameContent';
import type { AudioSettings, PlayerProgress } from '../types/game';
import { isAllFiveMissionsVerified } from '../utils/certificatePdf';
import { FestivalLightScene3D, type FestivalScenePhase } from './FestivalLightScene3D';
import { RoyalCertificateCard } from './RoyalCertificateCard';

export type FinaleStep = 'certificate' | 'rescue_clip' | 'festival' | 'complete';

interface RoyalFinaleExperienceProps {
  progress: PlayerProgress;
  isEvaluatorAccount?: boolean;
  audioSettings: AudioSettings;
  onUpdateAudio: (next: AudioSettings) => void;
  onReturnToBalaiAgung: () => void;
  onCloseLocked?: () => void;
  initialStep?: FinaleStep;
}

const RESCUE_CLIP_DURATION_MS = 8400;
const FESTIVAL_CELEBRATION_DURATION_MS = 8200;

export const RoyalFinaleExperience: React.FC<RoyalFinaleExperienceProps> = ({
  progress,
  isEvaluatorAccount = false,
  audioSettings,
  onUpdateAudio,
  onReturnToBalaiAgung,
  onCloseLocked,
  initialStep = 'certificate',
}) => {
  const prefersReducedMotion = useReducedMotion();
  const verifiedComplete = isAllFiveMissionsVerified(progress);
  const [step, setStep] = useState<FinaleStep>(initialStep);
  const [showCertModalInComplete, setShowCertModalInComplete] = useState(false);

  // Subtle reveal chime on certificate entry if audio already unlocked
  useEffect(() => {
    if (!verifiedComplete) return;
    if (step === 'certificate') {
      soundEngine.playRoyalCertificateChime();
    }
  }, [step, verifiedComplete]);

  // Automatic progression from Rescue Clip -> Festival Cahaya -> Complete (unlocking Return CTA)
  useEffect(() => {
    if (!verifiedComplete) return;
    if (step === 'rescue_clip') {
      soundEngine.setFestivalAmbience(true);
      const t = window.setTimeout(() => {
        setStep('festival');
      }, RESCUE_CLIP_DURATION_MS);
      return () => window.clearTimeout(t);
    }
    if (step === 'festival') {
      soundEngine.setFestivalAmbience(true);
      const t = window.setTimeout(() => {
        setStep('complete');
      }, FESTIVAL_CELEBRATION_DURATION_MS);
      return () => window.clearTimeout(t);
    }
  }, [step, verifiedComplete]);

  // Ensure festival ambience resets cleanly if component unmounts
  useEffect(() => {
    return () => {
      soundEngine.setLocationAmbience(progress.currentLocation);
    };
  }, [progress.currentLocation]);

  const handleStartCelebration = () => {
    soundEngine.init();
    soundEngine.playUiClickSound();
    soundEngine.setFestivalAmbience(true);
    setStep('rescue_clip');
  };

  const handleToggleSound = () => {
    soundEngine.init();
    const currentlyMuted = audioSettings.musicMuted && Boolean(audioSettings.sfxMuted);
    const nextMuted = !currentlyMuted;
    const next: AudioSettings = {
      ...audioSettings,
      musicMuted: nextMuted,
      sfxMuted: nextMuted,
    };
    onUpdateAudio(next);
    soundEngine.updateSettings(next);
    if (!nextMuted && step !== 'certificate') {
      soundEngine.setFestivalAmbience(true);
    }
  };

  const handleReturnClick = () => {
    soundEngine.playUiClickSound();
    soundEngine.setLocationAmbience('citadel');
    onReturnToBalaiAgung();
  };

  // Real Guard: Reject premature access unless all 5 missions are verified in real progress
  if (!verifiedComplete) {
    const remainingMissions = MISSION_ORDER.filter(
      (m) => !progress.completedMissions.includes(m.id),
    );
    return (
      <div className="fixed inset-0 z-50 bg-[#0B1124]/92 flex items-center justify-center p-4">
        <div className="w-full max-w-xl rounded-2xl border-2 border-[#D4AF37]/50 bg-[#141E3B] text-[#FAF6EE] p-6 sm:p-8 shadow-2xl space-y-5 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/60 flex items-center justify-center text-[#E5C35A]">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-2xl font-bold text-[#E5C35A]">
              Sijil &amp; Festival Cahaya Belum Dibuka
            </h2>
            <p className="text-sm text-[#FAF6EE]/85 leading-relaxed">
              Sijil Penghargaan Diraja dan Festival Cahaya Diraja hanya akan dibuka selepas anda
              menyelesaikan kelima-lima misi dalam Kingdom of Stories ({progress.completedMissions.length} / 5 selesai).
            </p>
          </div>
          {remainingMissions.length > 0 && (
            <div className="rounded-xl border border-[#FAF6EE]/15 bg-[#0F1730] p-4 text-left space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-[#E5C35A]">
                Misi Yang Perlu Diselesaikan:
              </p>
              <ul className="space-y-1.5 text-xs text-[#FAF6EE]/85">
                {remainingMissions.map((m) => (
                  <li key={m.id}>
                    Misi {m.number}: <strong>{m.title}</strong> ({m.locationName})
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button
            type="button"
            onClick={onCloseLocked || onReturnToBalaiAgung}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#D4AF37] text-[#101933] text-xs font-bold hover:bg-[#E5C35A] whitespace-nowrap shrink-0"
          >
            <Compass className="w-4 h-4" />
            <span>Kembali ke Balai Agung Diraja</span>
          </button>
        </div>
      </div>
    );
  }

  const allAudioMuted = audioSettings.musicMuted && Boolean(audioSettings.sfxMuted);
  const scenePhase: FestivalScenePhase =
    step === 'rescue_clip' ? 'rescue_clip' : step === 'festival' ? 'festival' : 'complete';

  return (
    <div
      className="fixed inset-0 z-50 bg-[#080E22] text-[#FAF6EE] flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Sijil Penghargaan Diraja dan Festival Cahaya Diraja"
    >
      {/* Top Floating Audio Control Only (No early return controls) */}
      <div className="pointer-events-none absolute top-4 right-4 z-30 flex items-center gap-2">
        <button
          type="button"
          onClick={handleToggleSound}
          className="pointer-events-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#D4AF37]/50 bg-[#101933]/92 text-xs font-semibold text-[#E5C35A] shadow-lg hover:bg-[#1B2948] whitespace-nowrap shrink-0"
        >
          {allAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          <span>{allAudioMuted ? 'Bunyikan Muzik Festival' : 'Audio Festival Aktif'}</span>
        </button>
      </div>

      {/* STAGE 1: ROYAL CERTIFICATE REVEAL (NO RETURN BUTTON YET) */}
      {step === 'certificate' && (
        <div
          className="relative flex-1 overflow-y-auto px-4 py-8 sm:py-10 flex items-center justify-center"
          style={{
            background:
              'radial-gradient(circle at 50% 24%, rgba(212,175,55,0.22) 0%, rgba(22,32,56,0.96) 54%, #080E22 100%)',
          }}
        >
          <div className="w-full max-w-4xl mx-auto space-y-5">
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center space-y-1.5"
            >
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-[#E5C35A]">
                <Crown className="w-4 h-4" />
                <span>Pengiktirafan Penyelamat Kerajaan · 5 / 5 Misi Lengkap</span>
              </div>
              <p className="text-xs sm:text-sm text-[#FAF6EE]/80">
                Tahniah, {progress.studentName}! Anda boleh memuat turun sijil rasmi anda sebelum
                menyaksikan perarakan kemenangan empat wira di Festival Cahaya Diraja.
              </p>
            </motion.div>

            <RoyalCertificateCard
              progress={progress}
              isEvaluatorAccount={isEvaluatorAccount}
              extraAction={
                <button
                  type="button"
                  onClick={handleStartCelebration}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#6B1D2F] border-2 border-[#E5C35A] text-[#FAF3E3] text-xs sm:text-sm font-bold shadow-lg hover:bg-[#82243A] whitespace-nowrap shrink-0"
                >
                  <Sparkles className="w-4 h-4 text-[#F2D479] shrink-0" />
                  <span>Mulakan Festival Cahaya Diraja</span>
                </button>
              }
            />
          </div>
        </div>
      )}

      {/* STAGES 2, 3, 4: CONTINUOUS 3D NIGHT PALACE + 4 HEROES + FIREWORKS */}
      {step !== 'certificate' && (
        <div className="relative flex-1 w-full h-full">
          <FestivalLightScene3D
            phase={scenePhase}
            onFireworkBurst={(intensity) => soundEngine.playFireworkBurstSound(intensity)}
          />

          {/* Stage 2 Caption: Babak Pembukaan & Penyelamatan Istana */}
          {step === 'rescue_clip' && (
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="pointer-events-none absolute bottom-6 inset-x-4 z-20 flex justify-center"
            >
              <div className="max-w-2xl w-full rounded-2xl border border-[#D4AF37]/65 bg-[#101933]/92 px-6 py-4 text-center shadow-2xl space-y-1.5">
                <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#E5C35A]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Babak Penyelamatan Istana</span>
                </div>
                <p className="text-sm sm:text-base font-medium text-[#FAF3E3] leading-relaxed">
                  Empat wira — Ayden, Elena, Ryan dan Eva — melangkah bersama ke perkarangan istana
                  untuk menyalakan semula cahaya Kota Diraja dan memulihkan jam menara kerajaan.
                </p>
              </div>
            </motion.div>
          )}

          {/* Stage 3 & Stage 4: Victory Proclamation Banner */}
          {(step === 'festival' || step === 'complete') && (
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-none absolute top-14 sm:top-6 inset-x-4 z-20 flex justify-center"
            >
              <div className="max-w-3xl w-full rounded-2xl border-2 border-[#D4AF37]/80 bg-[#101933]/88 px-5 py-4 sm:px-8 sm:py-5 text-center shadow-[0_18px_50px_rgba(6,10,24,0.75)] space-y-1.5">
                <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-wide text-[#F3D97E]">
                  KERAJAAN KEMBALI AMAN!
                </h2>
                <p className="text-xs sm:text-base text-[#FAF3E3] leading-relaxed max-w-2xl mx-auto">
                  Empat wira telah berjaya menyelamatkan istana. Kini, seluruh kerajaan meraikan
                  kejayaan mereka dalam Festival Cahaya Diraja!
                </p>
              </div>
            </motion.div>
          )}

          {/* Stage 4 ONLY: Return Button Revealed After Full Celebration */}
          {step === 'complete' && (
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="absolute bottom-6 inset-x-4 z-20 flex flex-wrap items-center justify-center gap-3"
            >
              <button
                type="button"
                onClick={handleReturnClick}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#ECCE6E] to-[#C9A234] text-[#101933] text-sm font-bold shadow-[0_12px_32px_rgba(0,0,0,0.55)] hover:brightness-105 whitespace-nowrap shrink-0"
              >
                <Compass className="w-4 h-4 shrink-0" />
                <span>Kembali ke Balai Agung Diraja</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClickSound();
                  setShowCertModalInComplete(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-[#D4AF37]/70 bg-[#101933]/92 text-[#F3D97E] text-sm font-bold shadow-xl hover:bg-[#1B2948] whitespace-nowrap shrink-0"
              >
                <Award className="w-4 h-4 shrink-0" />
                <span>Sijil Penghargaan Diraja (PDF)</span>
              </button>
            </motion.div>
          )}

          {/* Optional Certificate Modal Re-view During Stage 4 */}
          {step === 'complete' && showCertModalInComplete && (
            <div className="fixed inset-0 z-40 bg-[#080E22]/90 flex items-center justify-center p-4 overflow-y-auto">
              <div className="w-full max-w-4xl relative my-auto">
                <button
                  type="button"
                  onClick={() => setShowCertModalInComplete(false)}
                  aria-label="Tutup paparan sijil"
                  className="absolute -top-3 -right-3 z-30 w-9 h-9 rounded-full bg-[#101933] border border-[#D4AF37] text-[#F3D97E] flex items-center justify-center shadow-lg hover:bg-[#1B2948]"
                >
                  <X className="w-4 h-4" />
                </button>
                <RoyalCertificateCard
                  progress={progress}
                  isEvaluatorAccount={isEvaluatorAccount}
                  extraAction={
                    <button
                      type="button"
                      onClick={() => setShowCertModalInComplete(false)}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-[#D4AF37]/60 bg-[#101933] text-[#FAF3E3] text-xs sm:text-sm font-bold hover:bg-[#1B2948] whitespace-nowrap shrink-0"
                    >
                      <span>Tutup Sijil</span>
                    </button>
                  }
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
