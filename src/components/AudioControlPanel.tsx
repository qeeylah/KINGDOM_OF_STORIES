import React from 'react';
import { Music, Sparkles, Subtitles, Volume2, VolumeX, X } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import type { AudioSettings } from '../types/game';

interface AudioControlPanelProps {
  variant: 'compact' | 'full';
  audioSettings: AudioSettings;
  onUpdateAudio: (next: AudioSettings) => void;
  onClose?: () => void;
}

export const AudioControlPanel: React.FC<AudioControlPanelProps> = ({
  variant,
  audioSettings,
  onUpdateAudio,
  onClose,
}) => {
  const themeLabel = soundEngine.getCurrentMusicThemeLabel();
  const isAllMuted =
    audioSettings.musicMuted && audioSettings.sfxMuted && audioSettings.narrationMuted;

  const commitAudio = (next: AudioSettings, shouldEnsureMusic = false) => {
    onUpdateAudio(next);
    soundEngine.updateSettings(next);
    if (shouldEnsureMusic && !next.musicMuted) {
      soundEngine.init();
      soundEngine.startMusic();
    }
  };

  const handleToggleMuteAll = () => {
    if (isAllMuted) {
      commitAudio(
        {
          ...audioSettings,
          musicMuted: false,
          sfxMuted: false,
          narrationMuted: false,
        },
        true,
      );
      soundEngine.playVolumeFeedbackPing();
    } else {
      commitAudio({
        ...audioSettings,
        musicMuted: true,
        sfxMuted: true,
        narrationMuted: true,
      });
    }
  };

  const handleMusicSlider = (value: number) => {
    const autoUnmute = value > 0 && audioSettings.musicMuted;
    commitAudio(
      {
        ...audioSettings,
        musicVolume: value,
        musicMuted: autoUnmute ? false : audioSettings.musicMuted,
      },
      autoUnmute || !audioSettings.musicMuted,
    );
  };

  const handleSfxSlider = (value: number) => {
    const autoUnmute = value > 0 && audioSettings.sfxMuted;
    commitAudio({
      ...audioSettings,
      sfxVolume: value,
      sfxMuted: autoUnmute ? false : audioSettings.sfxMuted,
    });
  };

  const handleNarrationSlider = (value: number) => {
    const autoUnmute = value > 0 && audioSettings.narrationMuted;
    commitAudio({
      ...audioSettings,
      narrationVolume: value,
      narrationMuted: autoUnmute ? false : audioSettings.narrationMuted,
    });
  };

  const isCompact = variant === 'compact';

  return (
    <div
      className={
        isCompact
          ? 'w-80 sm:w-96 rounded-xl border border-[#E5C97B]/55 bg-[#101933]/96 p-4 text-[#FAF6EE] shadow-2xl space-y-3.5'
          : 'rounded-xl border border-[#FAF6EE]/15 bg-[#1B2948] p-4 sm:p-5 text-[#FAF6EE] space-y-4'
      }
      role="region"
      aria-label="Panel Kawalan Audio"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 min-w-0">
          <h3 className="text-sm font-semibold text-[#E5C97B] flex items-center gap-2">
            <Volume2 className="w-4 h-4 shrink-0" />
            <span>Kawalan Audio Kerajaan</span>
          </h3>
          <p className="text-[11px] text-[#C8B6E2] truncate flex items-center gap-1.5" title={themeLabel}>
            <Music className="w-3 h-3 shrink-0 text-[#8DE0E6]" />
            <span className="truncate">{themeLabel}</span>
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleToggleMuteAll}
            className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors ${
              isAllMuted
                ? 'border-emerald-400/50 bg-emerald-950/50 text-emerald-200 hover:bg-emerald-900/60'
                : 'border-[#FAF6EE]/20 bg-[#162038] text-[#FAF6EE] hover:bg-[#233256]'
            }`}
          >
            {isAllMuted ? 'Bunyikan Semua' : 'Senyapkan Semua'}
          </button>
          {isCompact && onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup Panel Audio"
              className="p-1.5 rounded-lg border border-[#FAF6EE]/20 bg-[#162038] text-[#FAF6EE]/85 hover:bg-[#233256]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Sliders + Individual Mute/Unmute */}
      <div className={isCompact ? 'space-y-3 text-xs' : 'grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs'}>
        {/* Muzik Latar */}
        <div className="rounded-lg border border-[#FAF6EE]/12 bg-[#162038]/85 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={`audio-music-${variant}`} className="font-semibold text-[#FAF6EE] flex items-center gap-1.5">
              <span>Muzik Latar</span>
              <span className="font-mono-tabular text-[#E5C97B]">
                {audioSettings.musicMuted ? '0%' : `${Math.round(audioSettings.musicVolume * 100)}%`}
              </span>
            </label>
            <button
              type="button"
              onClick={() =>
                commitAudio(
                  { ...audioSettings, musicMuted: !audioSettings.musicMuted },
                  audioSettings.musicMuted,
                )
              }
              aria-label={audioSettings.musicMuted ? 'Nyahsenyap Muzik Latar' : 'Senyapkan Muzik Latar'}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-semibold ${
                audioSettings.musicMuted
                  ? 'border-red-400/45 bg-red-950/40 text-red-200'
                  : 'border-[#D4AF37]/40 bg-[#101933] text-[#E5C97B]'
              }`}
            >
              {audioSettings.musicMuted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>Bisu</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Aktif</span>
                </>
              )}
            </button>
          </div>
          <input
            id={`audio-music-${variant}`}
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={audioSettings.musicVolume}
            onChange={(e) => handleMusicSlider(Number(e.target.value))}
            className="w-full accent-[#D4AF37] cursor-pointer"
          />
        </div>

        {/* Kesan Bunyi */}
        <div className="rounded-lg border border-[#FAF6EE]/12 bg-[#162038]/85 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={`audio-sfx-${variant}`} className="font-semibold text-[#FAF6EE] flex items-center gap-1.5">
              <span>Kesan Bunyi</span>
              <span className="font-mono-tabular text-[#7BE0E6]">
                {audioSettings.sfxMuted ? '0%' : `${Math.round(audioSettings.sfxVolume * 100)}%`}
              </span>
            </label>
            <button
              type="button"
              onClick={() => {
                const nextMuted = !audioSettings.sfxMuted;
                commitAudio({ ...audioSettings, sfxMuted: nextMuted });
                if (!nextMuted) soundEngine.playVolumeFeedbackPing();
              }}
              aria-label={audioSettings.sfxMuted ? 'Nyahsenyap Kesan Bunyi' : 'Senyapkan Kesan Bunyi'}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-semibold ${
                audioSettings.sfxMuted
                  ? 'border-red-400/45 bg-red-950/40 text-red-200'
                  : 'border-[#7BE0E6]/40 bg-[#101933] text-[#7BE0E6]'
              }`}
            >
              {audioSettings.sfxMuted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>Bisu</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Aktif</span>
                </>
              )}
            </button>
          </div>
          <input
            id={`audio-sfx-${variant}`}
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={audioSettings.sfxVolume}
            onChange={(e) => handleSfxSlider(Number(e.target.value))}
            onPointerUp={() => soundEngine.playVolumeFeedbackPing()}
            onKeyUp={() => soundEngine.playVolumeFeedbackPing()}
            className="w-full accent-[#7BE0E6] cursor-pointer"
          />
        </div>

        {/* Suara Watak & Arahan */}
        <div className="rounded-lg border border-[#FAF6EE]/12 bg-[#162038]/85 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={`audio-voice-${variant}`} className="font-semibold text-[#FAF6EE] flex items-center gap-1.5">
              <span>Suara Watak</span>
              <span className="font-mono-tabular text-[#D5C4EE]">
                {audioSettings.narrationMuted
                  ? '0%'
                  : `${Math.round(audioSettings.narrationVolume * 100)}%`}
              </span>
            </label>
            <button
              type="button"
              onClick={() =>
                commitAudio({
                  ...audioSettings,
                  narrationMuted: !audioSettings.narrationMuted,
                })
              }
              aria-label={audioSettings.narrationMuted ? 'Bunyikan Suara Watak' : 'Senyapkan Suara Watak'}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-semibold ${
                audioSettings.narrationMuted
                  ? 'border-red-400/45 bg-red-950/40 text-red-200'
                  : 'border-[#C8B6E2]/40 bg-[#101933] text-[#D5C4EE]'
              }`}
            >
              {audioSettings.narrationMuted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>Bisu</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Aktif</span>
                </>
              )}
            </button>
          </div>
          <input
            id={`audio-voice-${variant}`}
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={audioSettings.narrationVolume}
            onChange={(e) => handleNarrationSlider(Number(e.target.value))}
            className="w-full accent-[#C8B6E2] cursor-pointer"
          />
        </div>

        {/* Kelantangan Utama */}
        <div className="rounded-lg border border-[#FAF6EE]/12 bg-[#162038]/85 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={`audio-master-${variant}`} className="font-semibold text-[#FAF6EE] flex items-center gap-1.5">
              <span>Kelantangan Utama</span>
              <span className="font-mono-tabular text-[#FAF3E3]">
                {Math.round(audioSettings.masterVolume * 100)}%
              </span>
            </label>
            <span className="text-[11px] text-[#C8B6E2]/80">Induk</span>
          </div>
          <input
            id={`audio-master-${variant}`}
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={audioSettings.masterVolume}
            onChange={(e) =>
              commitAudio({
                ...audioSettings,
                masterVolume: Number(e.target.value),
              })
            }
            className="w-full accent-[#FAF3E3] cursor-pointer"
          />
        </div>
      </div>

      {/* Subtitles toggle in full Settings view */}
      {!isCompact && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#FAF6EE]/10">
          <div className="text-xs text-[#EFE6D5]/85">
            Muzik latar akan diperlahankan secara automatik apabila penjaga berbicara atau semasa rakaman suara Misi 4 &amp; main semula media.
          </div>
          <button
            type="button"
            onClick={() =>
              commitAudio({
                ...audioSettings,
                showSubtitles: !audioSettings.showSubtitles,
              })
            }
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#FAF6EE]/20 bg-[#162038] text-xs font-semibold text-[#FAF6EE] hover:bg-[#233256]"
          >
            <Subtitles className="w-4 h-4 text-[#E5C97B]" />
            <span>
              Sarikata Dialog: {audioSettings.showSubtitles ? 'Dipaparkan' : 'Disembunyikan'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
