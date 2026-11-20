import React, { useEffect, useState } from 'react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  Compass,
  Lock,
  LogOut,
  MapPin,
  RotateCcw,
  Send,
  Sparkles,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { HEROES, LOCATIONS, MISSION_ORDER, STORY_FRAGMENTS } from '../data/gameContent';
import type {
  AudioSettings,
  CollabRoom,
  HeroId,
  LocationId,
  PlayerProgress,
} from '../types/game';
import { isAllFiveMissionsVerified } from '../utils/certificatePdf';
import { CharacterSelectionHall3D } from './CharacterSelectionHall3D';
import type { CameraMode } from './GameViewport3D';
import { AudioControlPanel } from './AudioControlPanel';
import { RoyalCertificateCard } from './RoyalCertificateCard';

export type HubModalType =
  | 'hero_select'
  | 'world_map'
  | 'journal'
  | 'collab'
  | 'portfolio'
  | 'settings'
  | 'festival_finale';

interface WorldHubModalsProps {
  modal: HubModalType;
  progress: PlayerProgress;
  token: string;
  isEvaluatorAccount?: boolean;
  audioSettings: AudioSettings;
  cameraMode: CameraMode;
  mobileControlsEnabled: boolean;
  onUpdateAudio: (next: AudioSettings) => void;
  onChangeCameraMode: (mode: CameraMode) => void;
  onToggleMobileControls: () => void;
  onUpdateProgress: (patch: Partial<PlayerProgress>) => Promise<void>;
  onTeleport: (target: LocationId, missionHintNumber?: 1 | 2 | 3 | 4 | 5) => void;
  onSwitchToPortfolio?: () => void;
  onOpenFestivalFinale?: () => void;
  onBackToEducatorPortal?: () => void;
  onReplayCinematic: () => void;
  onReplayPalaceIntro?: () => void;
  onLogout: () => void;
  onClose: () => void;
}

export const WorldHubModals: React.FC<WorldHubModalsProps> = ({
  modal,
  progress,
  token,
  isEvaluatorAccount = false,
  audioSettings,
  cameraMode,
  mobileControlsEnabled,
  onUpdateAudio,
  onChangeCameraMode,
  onToggleMobileControls,
  onUpdateProgress,
  onTeleport,
  onOpenFestivalFinale,
  onBackToEducatorPortal,
  onReplayCinematic,
  onReplayPalaceIntro,
  onLogout,
  onClose,
}) => {
  // ---- COLLABORATION ROOM STATE ----
  const [roomCodeInput, setRoomCodeInput] = useState(progress.collabRoomCode || 'TAMAN-01');
  const [collabRoom, setCollabRoom] = useState<CollabRoom | null>(null);
  const [chatMsg, setChatMsg] = useState('');
  const [clueInput, setClueInput] = useState('');
  const [sharedScript, setSharedScript] = useState('');
  const [collabErr, setCollabErr] = useState('');
  const [collabStatus, setCollabStatus] = useState('');

  const loadRoom = async (code: string) => {
    setCollabErr('');
    try {
      const res = await fetch('/api/collab/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ roomCode: code }),
      });
      const data = (await res.json()) as { room?: CollabRoom; error?: string };
      if (!res.ok || !data.room) throw new Error(data.error || 'Gagal menyertai bilik.');
      setCollabRoom(data.room);
      setSharedScript(data.room.sharedScriptDraft);
      await onUpdateProgress({
        learningMode: 'collaborative',
        collabRoomCode: data.room.code,
      });
    } catch (err) {
      setCollabErr(err instanceof Error ? err.message : 'Ralat bilik kolaborasi.');
    }
  };

  useEffect(() => {
    if (modal !== 'collab') return;
    if (progress.collabRoomCode) {
      void loadRoom(progress.collabRoomCode);
    }
    const iv = window.setInterval(() => {
      if (collabRoom?.code) {
        void fetch(`/api/collab/${collabRoom.code}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((d: { room?: CollabRoom } | null) => {
            if (d?.room) setCollabRoom(d.room);
          })
          .catch(() => null);
      }
    }, 4000);
    return () => window.clearInterval(iv);
  }, [modal, collabRoom?.code]);

  const sendCollabMessage = async () => {
    if (!collabRoom || !chatMsg.trim()) return;
    try {
      const res = await fetch(`/api/collab/${collabRoom.code}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: chatMsg, heroId: progress.selectedHero }),
      });
      if (res.ok) {
        const d = (await res.json()) as { room: CollabRoom };
        setCollabRoom(d.room);
        setChatMsg('');
      }
    } catch {
      setCollabErr('Gagal menghantar mesej. Sila cuba lagi.');
    }
  };

  const shareCollabClue = async () => {
    if (!collabRoom || !clueInput.trim()) return;
    try {
      const res = await fetch(`/api/collab/${collabRoom.code}/clue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ clue: clueInput }),
      });
      if (res.ok) {
        const d = (await res.json()) as { room: CollabRoom };
        setCollabRoom(d.room);
        setClueInput('');
      }
    } catch {
      setCollabErr('Gagal berkongsi petunjuk. Sila cuba lagi.');
    }
  };

  const saveSharedScript = async () => {
    if (!collabRoom) return;
    try {
      const res = await fetch(`/api/collab/${collabRoom.code}/script`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sharedScriptDraft: sharedScript }),
      });
      if (res.ok) {
        const d = (await res.json()) as { room: CollabRoom };
        setCollabRoom(d.room);
        setCollabStatus('Draf skrip bersama telah disegerakkan ke bilik pasukan!');
      }
    } catch {
      setCollabErr('Gagal menyimpan draf bersama. Sila cuba lagi.');
    }
  };

  const allFiveVerified = isAllFiveMissionsVerified(progress);

  const titles: Record<HubModalType, string> = {
    hero_select: 'Pemilihan Wira & Mod Pembelajaran',
    world_map: 'Peta Dunia Kerajaan Kisah',
    journal: 'Jurnal Misi, Serpihan & Lencana',
    collab: 'Bilik Kolaborasi Pasukan',
    portfolio: 'Portfolio Digital & Sijil Pencapaian',
    settings: 'Menu Jeda & Tetapan Permainan',
    festival_finale: 'Festival Cahaya Diraja — Hikayat Dipulihkan',
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#0D1324]/85 p-4 sm:p-6">
      <div
        className={`w-full ${
          modal === 'hero_select' ? 'max-w-5xl' : 'max-w-4xl'
        } max-h-[92vh] flex flex-col rounded-2xl border border-[#D4AF37]/50 bg-[#141E36] text-[#FAF6EE] shadow-2xl overflow-hidden`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D4AF37]/25 bg-[#1B2948]">
          <div>
            <div className="text-[11px] font-medium text-[#C8B6E2]">
              {isEvaluatorAccount
                ? 'Pratonton Dunia 3D Penilai · Semua 5 Misi Terbuka'
                : `Pengembaraan Wira Diraja · ${progress.completedMissions.length}/5 Misi Selesai`}
            </div>
            <h2 className="font-display text-lg sm:text-xl font-semibold text-[#D4AF37]">
              {titles[modal]}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg border border-[#FAF6EE]/15 hover:bg-[#FAF6EE]/10 text-[#FAF6EE]"
            aria-label="Tutup tetingkap"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ---------------- 3D CHARACTER SELECTION HALL ---------------- */}
          {modal === 'hero_select' && (
            <CharacterSelectionHall3D
              selectedHero={progress.selectedHero}
              learningMode={progress.learningMode}
              onSelectHero={(heroId) => {
                void onUpdateProgress({ selectedHero: heroId as HeroId });
              }}
              onChangeLearningMode={(mode) => {
                void onUpdateProgress({ learningMode: mode });
              }}
              onConfirmAndClose={onClose}
            />
          )}

          {/* ---------------- WORLD MAP ---------------- */}
          {modal === 'world_map' && (
            <>
              <div className="rounded-xl border border-[#D4AF37]/35 bg-[#1B2948] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs sm:text-sm font-semibold text-[#E5C97B]">
                    Semua 5 Misi Hikayat Terbuka — Terokai &amp; Lengkapkan Mengikut Keperluan Anda
                  </div>
                  <span className="font-mono-tabular text-xs text-[#C8B6E2]">
                    Status: {progress.completedMissions.length} / 5 Selesai
                  </span>
                </div>
                <p className="text-xs text-[#EFE6D5]/85">
                  Anda boleh memasuki mana-mana misi pada bila-bila masa melalui gerbang portal di Balai Agung Diraja atau perjalanan pantas di bawah. Anda digalakkan melengkapkan Misi 1 hingga Misi 5 secara berperingkat.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
                  {MISSION_ORDER.map((m) => {
                    const done = progress.completedMissions.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          onTeleport(m.locationId, m.number as 1 | 2 | 3 | 4 | 5);
                          onClose();
                        }}
                        className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                          done
                            ? 'border-[#7FA88C]/60 bg-[#182E42] hover:bg-[#1E3B52]'
                            : 'border-[#D4AF37]/40 bg-[#162242] hover:bg-[#223462]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-semibold text-[#E5C97B]">
                            Misi {m.number}
                          </span>
                          {done && <CheckCircle2 className="w-3.5 h-3.5 text-[#6EE7B7] shrink-0" />}
                        </div>
                        <div className="text-xs font-semibold text-[#FAF6EE] truncate">{m.title}</div>
                        <div className="text-[10px] text-[#C8B6E2] truncate">{m.locationName}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {LOCATIONS.map((loc) => {
                  const isCurrent = progress.currentLocation === loc.id;
                  const isDone =
                    loc.id === 'atelier'
                      ? progress.completedMissions.includes('story_architect') &&
                        progress.completedMissions.includes('royal_voice_trial')
                      : loc.missionId
                        ? progress.completedMissions.includes(loc.missionId)
                        : false;

                  return (
                    <div
                      key={loc.id}
                      className={`rounded-xl border p-4 flex flex-col justify-between ${
                        isCurrent
                          ? 'border-[#D4AF37] bg-[#233256]'
                          : 'border-[#FAF6EE]/20 bg-[#1B2948]'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-display text-base font-semibold text-[#FAF6EE]">
                            {loc.name}
                          </h3>
                          <span className="text-xs font-medium flex items-center gap-1">
                            {isDone ? (
                              <span className="text-[#6EE7B7] flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Selesai
                              </span>
                            ) : (
                              <span className="text-[#8FBCE0] flex items-center gap-1">
                                <Compass className="w-3.5 h-3.5" /> Terbuka
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="text-xs text-[#D4AF37]">{loc.subtitle}</div>
                        <p className="text-xs text-[#EFE6D5]/80 leading-relaxed">{loc.description}</p>
                      </div>

                      <button
                        type="button"
                        disabled={isCurrent}
                        onClick={() => {
                          onTeleport(loc.id);
                          onClose();
                        }}
                        className="mt-4 w-full py-2 rounded-lg text-xs font-semibold bg-[#D4AF37] text-[#162038] hover:bg-[#E2C258] disabled:bg-[#162038] disabled:text-[#FAF6EE]/45 disabled:border disabled:border-[#FAF6EE]/10"
                      >
                        {isCurrent ? 'Lokasi Semasa Anda' : `Masuk ke ${loc.name}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ---------------- MISSION JOURNAL, FRAGMENTS & ACHIEVEMENTS ---------------- */}
          {modal === 'journal' && (
            <>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[#D4AF37]">
                  Kemajuan Lima Misi Hikayat ({progress.completedMissions.length} / 5)
                </h3>
                <div className="space-y-2">
                  {MISSION_ORDER.map((m) => {
                    const done = progress.completedMissions.includes(m.id);
                    return (
                      <div
                        key={m.id}
                        className="rounded-xl border border-[#FAF6EE]/15 bg-[#1B2948] p-3.5 flex flex-wrap items-center justify-between gap-4"
                      >
                        <div className="flex-1 min-w-[220px]">
                          <div className="text-xs text-[#8FBCE0]">
                            Misi {m.number} · {m.locationName}
                          </div>
                          <div className="text-sm font-semibold text-[#FAF6EE]">{m.title}</div>
                          <div className="text-xs text-[#EFE6D5]/80 mt-0.5">{m.objective}</div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className={`text-xs font-semibold flex items-center gap-1 ${
                              done ? 'text-[#6EE7B7]' : 'text-[#D4AF37]'
                            }`}
                          >
                            {done && <CheckCircle2 className="w-3.5 h-3.5" />}
                            <span>{done ? 'Selesai' : 'Belum Selesai'}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              onTeleport(m.locationId, m.number as 1 | 2 | 3 | 4 | 5);
                              onClose();
                            }}
                            className="px-3 py-1.5 rounded-lg border border-[#D4AF37]/50 bg-[#142347] text-xs font-semibold text-[#E5C97B] hover:bg-[#1E3366]"
                          >
                            {done ? `Ulang Misi ${m.number}` : `Masuk Misi ${m.number}`}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[#7FA88C]">
                  Koleksi Fragmen Kisah Diraja ({progress.collectedFragmentIds.length} / 5)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {STORY_FRAGMENTS.map((frag) => {
                    const collected = progress.collectedFragmentIds.includes(frag.id);
                    return (
                      <div
                        key={frag.id}
                        className={`rounded-xl border p-3 text-xs ${
                          collected
                            ? 'border-[#7FA88C]/45 bg-[#1B2948]'
                            : 'border-[#FAF6EE]/10 bg-[#121A30] opacity-60'
                        }`}
                      >
                        <div className="font-semibold text-[#D4AF37]">{frag.title}</div>
                        <p className="text-[#EFE6D5]/85 mt-1">
                          {collected
                            ? frag.text
                            : 'Belum ditemui — jelajahi Rimba Cahaya Mahkota untuk mengutip serpihan ini.'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[#C8B6E2]">
                  Lencana Pencapaian & Usaha ({progress.achievements.filter((a) => a.unlockedAt).length} /{' '}
                  {progress.achievements.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {progress.achievements.map((badge) => {
                    const unlocked = Boolean(badge.unlockedAt);
                    return (
                      <div
                        key={badge.id}
                        className={`rounded-xl border p-3 text-xs ${
                          unlocked
                            ? 'border-[#D4AF37]/50 bg-[#233256]'
                            : 'border-[#FAF6EE]/10 bg-[#121A30] opacity-55'
                        }`}
                      >
                        <div className="text-[11px] text-[#8FBCE0]">{badge.category}</div>
                        <div className="font-semibold text-[#FAF6EE] mt-0.5">{badge.title}</div>
                        <p className="text-[#EFE6D5]/75 mt-1">{badge.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ---------------- COLLABORATIVE LEARNING ROOM ---------------- */}
          {modal === 'collab' && (
            <>
              <div className="rounded-xl border border-[#7FA88C]/40 bg-[#1B2948] p-4 space-y-3">
                <div className="text-xs text-[#EFE6D5]">
                  Sertai Bilik Kolaborasi bersama rakan sepasukan menggunakan kod bilik (contoh: <strong className="text-[#D4AF37]">TAMAN-01</strong>). Kemajuan bilik disegerakkan melalui pelayan dalam masa nyata berkala.
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                    placeholder="Kod Bilik (cth: TAMAN-01)"
                    className="rounded-lg border border-[#FAF6EE]/20 bg-[#121A30] px-3 py-2 text-sm text-[#FAF6EE]"
                  />
                  <button
                    type="button"
                    onClick={() => void loadRoom(roomCodeInput)}
                    className="px-4 py-2 rounded-lg bg-[#D4AF37] text-[#162038] text-xs font-semibold hover:bg-[#E2C258]"
                  >
                    Sertai / Cipta Bilik
                  </button>
                </div>
                {collabErr && <p className="text-xs text-red-300">{collabErr}</p>}
              </div>

              {collabRoom && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left: Members & Clues + Shared Script */}
                  <div className="space-y-4">
                    <div className="rounded-xl border border-[#FAF6EE]/15 bg-[#1B2948] p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-[#D4AF37]">{collabRoom.title}</span>
                        <span className="text-xs text-[#8FBCE0]">{collabRoom.members.length} ahli</span>
                      </div>
                      <div className="text-xs text-[#EFE6D5]/80">
                        Ahli: {collabRoom.members.join(' · ')}
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#FAF6EE]/15 bg-[#1B2948] p-4 space-y-2.5">
                      <div className="text-xs font-semibold text-[#7FA88C]">Kongsi Petunjuk Kisah</div>
                      <ul className="space-y-1 text-xs text-[#FAF6EE]/90 list-disc pl-4">
                        {collabRoom.sharedClues.map((c, idx) => (
                          <li key={idx}>{c}</li>
                        ))}
                      </ul>
                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          value={clueInput}
                          onChange={(e) => setClueInput(e.target.value)}
                          placeholder="Tulis petunjuk baharu..."
                          className="flex-1 rounded border border-[#FAF6EE]/20 bg-[#121A30] px-2.5 py-1.5 text-xs text-[#FAF6EE]"
                        />
                        <button
                          type="button"
                          onClick={shareCollabClue}
                          className="px-3 py-1.5 rounded bg-[#7FA88C] text-[#162038] text-xs font-semibold"
                        >
                          Kongsi
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#FAF6EE]/15 bg-[#1B2948] p-4 space-y-2">
                      <div className="text-xs font-semibold text-[#C8B6E2]">Draf Skrip Sepasukan</div>
                      <textarea
                        rows={4}
                        value={sharedScript}
                        onChange={(e) => setSharedScript(e.target.value)}
                        className="w-full rounded border border-[#FAF6EE]/20 bg-[#121A30] p-2.5 text-xs text-[#FAF6EE]"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-[#7FA88C]">{collabStatus}</span>
                        <button
                          type="button"
                          onClick={saveSharedScript}
                          className="px-3 py-1.5 rounded bg-[#233256] border border-[#D4AF37]/40 text-xs font-semibold text-[#D4AF37]"
                        >
                          Simpan Draf Bersama
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right: Team Discussion */}
                  <div className="rounded-xl border border-[#FAF6EE]/15 bg-[#1B2948] p-4 flex flex-col justify-between min-h-[340px]">
                    <div className="text-xs font-semibold text-[#D4AF37] mb-2">
                      Perbincangan Pasukan
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2 max-h-64 pr-1">
                      {collabRoom.messages.length === 0 ? (
                        <p className="text-xs text-[#FAF6EE]/55">
                          Belum ada mesej. Mulakan perbincangan bersama ahli pasukan anda!
                        </p>
                      ) : (
                        collabRoom.messages.map((m) => (
                          <div key={m.id} className="rounded-lg bg-[#162038] p-2.5 text-xs">
                            <div className="font-semibold text-[#8FBCE0]">{m.authorName}</div>
                            <p className="text-[#FAF6EE] mt-0.5">{m.text}</p>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="flex gap-2 pt-3 border-t border-[#FAF6EE]/10 mt-3">
                      <input
                        type="text"
                        value={chatMsg}
                        onChange={(e) => setChatMsg(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void sendCollabMessage();
                        }}
                        placeholder="Taip mesej perbincangan..."
                        className="flex-1 rounded-lg border border-[#FAF6EE]/20 bg-[#121A30] px-3 py-2 text-xs text-[#FAF6EE]"
                      />
                      <button
                        type="button"
                        onClick={sendCollabMessage}
                        className="px-3 py-2 rounded-lg bg-[#D4AF37] text-[#162038] text-xs font-semibold"
                        aria-label="Hantar mesej"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ---------------- DIGITAL PORTFOLIO & COMPLETION CERTIFICATE ---------------- */}
          {modal === 'portfolio' && (
            <>
              {allFiveVerified ? (
                <RoyalCertificateCard
                  progress={progress}
                  isEvaluatorAccount={isEvaluatorAccount}
                  extraAction={
                    onOpenFestivalFinale ? (
                      <button
                        type="button"
                        onClick={onOpenFestivalFinale}
                        className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#6B1D2F] border border-[#E5C35A] text-[#FAF3E3] text-xs sm:text-sm font-bold shadow-lg hover:bg-[#82243A] whitespace-nowrap shrink-0"
                      >
                        <Sparkles className="w-4 h-4 text-[#F2D479] shrink-0" />
                        <span>Saksikan Festival Cahaya Diraja</span>
                      </button>
                    ) : undefined
                  }
                />
              ) : (
                <div className="rounded-2xl border-2 border-[#D4AF37]/45 bg-[#1B2948] text-[#FAF6EE] p-6 sm:p-7 space-y-4">
                  <div className="flex items-start justify-between gap-4 border-b border-[#D4AF37]/25 pb-4">
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#E5C35A]">
                        Sijil Penghargaan Diraja · Anugerah Wira Penyelamat Kerajaan
                      </p>
                      <h3 className="font-display text-xl sm:text-2xl font-bold text-[#FAF3E3]">
                        Sijil Rasmi Terkunci ({progress.completedMissions.length} / 5 Misi Selesai)
                      </h3>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-[#101933] border border-[#D4AF37]/45 flex items-center justify-center text-[#E5C35A] shrink-0">
                      <Lock className="w-5 h-5" />
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-[#FAF6EE]/85 leading-relaxed">
                    <strong>SIJIL PENGHARGAAN DIRAJA</strong> dan muat turun fail PDF rasmi hanya akan
                    dianugerahkan kepada <strong>{progress.studentName}</strong> selepas kelima-lima
                    misi di Kingdom of Stories diselesaikan sepenuhnya.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="rounded-lg bg-[#101933] border border-[#FAF6EE]/10 p-3">
                      <div className="text-[#C8B6E2]">Misi Selesai</div>
                      <div className="font-mono-tabular text-base font-bold text-[#E5C35A]">
                        {progress.completedMissions.length} / 5
                      </div>
                    </div>
                    <div className="rounded-lg bg-[#101933] border border-[#FAF6EE]/10 p-3">
                      <div className="text-[#C8B6E2]">Serpihan Kisah</div>
                      <div className="font-mono-tabular text-base font-bold text-[#FAF3E3]">
                        {progress.collectedFragmentIds.length} / 5
                      </div>
                    </div>
                    <div className="rounded-lg bg-[#101933] border border-[#FAF6EE]/10 p-3">
                      <div className="text-[#C8B6E2]">Rakaman Suara</div>
                      <div className="font-mono-tabular text-base font-bold text-[#FAF3E3]">
                        {progress.voiceAttempts.length} Cubaan
                      </div>
                    </div>
                    <div className="rounded-lg bg-[#101933] border border-[#FAF6EE]/10 p-3">
                      <div className="text-[#C8B6E2]">Festival Cahaya</div>
                      <div className="font-semibold text-sm text-[#FAF3E3]">
                        Belum Dibuka
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Portfolio Artifacts */}
              <div className="rounded-xl border border-[#FAF6EE]/15 bg-[#1B2948] p-4 space-y-3">
                <h4 className="text-sm font-semibold text-[#D4AF37]">Rekod Portfolio Digital Murid</h4>
                <div className="text-xs text-[#EFE6D5] space-y-1">
                  <div><strong>Tema Pilihan:</strong> {progress.scriptPlan.theme}</div>
                  <div><strong>Skrip Terkini:</strong> {progress.scriptPlan.fullScript}</div>
                </div>
                {progress.teacherFeedback && (
                  <div className="rounded-lg bg-[#162038] border border-[#7FA88C]/40 p-3 text-xs">
                    <div className="font-semibold text-[#7FA88C]">
                      Ulasan Guru ({progress.teacherFeedback.reviewedBy} · {progress.teacherFeedback.ratingLabel})
                    </div>
                    <p className="text-[#FAF6EE] mt-1">{progress.teacherFeedback.comment}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ---------------- SETTINGS & PAUSE MENU ---------------- */}
          {modal === 'settings' && (
            <div className="space-y-5">
              <AudioControlPanel
                variant="full"
                audioSettings={audioSettings}
                onUpdateAudio={onUpdateAudio}
              />

              <div className="rounded-xl border border-[#FAF6EE]/15 bg-[#1B2948] p-4 space-y-3">
                <h3 className="text-sm font-semibold text-[#8FBCE0]">Kawalan Kamera & Peranti</h3>
                <div className="flex flex-wrap items-center gap-2">
                  {(['classic', 'shoulder', 'scenic'] as CameraMode[]).map((cm) => (
                    <button
                      key={cm}
                      type="button"
                      onClick={() => onChangeCameraMode(cm)}
                      className={`px-3.5 py-2 rounded-lg text-xs font-semibold border ${
                        cameraMode === cm
                          ? 'bg-[#D4AF37] text-[#162038] border-[#D4AF37]'
                          : 'bg-[#162038] border-[#FAF6EE]/20 text-[#FAF6EE]'
                      }`}
                    >
                      {cm === 'classic'
                        ? 'Kamera Orang Ketiga Klasik'
                        : cm === 'shoulder'
                          ? 'Kamera Dekat Bahu'
                          : 'Kamera Panorama Luas'}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={onToggleMobileControls}
                    className="px-3.5 py-2 rounded-lg text-xs font-semibold border border-[#C8B6E2]/35 bg-[#162038]"
                  >
                    Kawalan Sentuh Mudah Alih: {mobileControlsEnabled ? 'Aktif' : 'Dimatikan'}
                  </button>
                </div>
              </div>

              {onBackToEducatorPortal && (
                <div className="rounded-xl border border-[#7BE0E6]/35 bg-[#1B2948] p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-[#EFE6D5]/85">
                    Anda sedang berada dalam pratonton dunia 3D bagi akaun Guru / Pentadbir.
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onBackToEducatorPortal();
                    }}
                    className="px-3.5 py-2 rounded-lg border border-[#7BE0E6]/50 bg-[#162038] text-xs font-semibold text-[#7BE0E6] hover:bg-[#233256]"
                  >
                    Kembali ke Portal Penilai
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onReplayCinematic();
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#D4AF37]/40 bg-[#1B2948] text-xs font-semibold hover:bg-[#233256]"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Mainkan Semula Sinematik Pembukaan</span>
                  </button>
                  {onReplayPalaceIntro && progress.currentLocation === 'citadel' && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onReplayPalaceIntro();
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#7BE0E6]/40 bg-[#1B2948] text-xs font-semibold hover:bg-[#233256]"
                    >
                      <Compass className="w-3.5 h-3.5 text-[#7BE0E6]" />
                      <span>Tonton Sinematik Istana 3D</span>
                    </button>
                  )}
                  {progress.currentLocation !== 'citadel' && (
                    <button
                      type="button"
                      onClick={() => {
                        onTeleport('citadel');
                        onClose();
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#8FBCE0]/40 bg-[#1B2948] text-xs font-semibold hover:bg-[#233256]"
                    >
                      <MapPin className="w-3.5 h-3.5 text-[#8FBCE0]" />
                      <span>Kembali ke Balai Agung Diraja</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onLogout}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-900/60 border border-red-400/40 text-xs font-semibold text-red-100 hover:bg-red-800/70"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Keluar</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
