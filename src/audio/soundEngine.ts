import type { AudioSettings, LocationId } from '../types/game';
import {
  normalizeMalayForSpeech,
  type PublicVoiceGuideId,
  VOICE_PROFILES,
  type VoiceRole,
  type VoiceStyleHint,
} from './voiceProfiles';

export type MusicSceneKey =
  | 'landing'
  | 'citadel'
  | 'library'
  | 'woods'
  | 'atelier_workshop'
  | 'atelier_studio'
  | 'festival';

interface ThemeChord {
  bass: number;
  pad: number[];
  arp: number[];
  melody: number[];
}

interface ThemeProfile {
  label: string;
  barDurationMs: number;
  volumeScale: number;
  useHorn: boolean;
  useTimpani: boolean;
  isBrightBell: boolean;
  melodyWave: OscillatorType;
  chords: ThemeChord[];
}

const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  masterVolume: 0.75,
  musicVolume: 0.6,
  sfxVolume: 0.75,
  narrationVolume: 0.9,
  musicMuted: false,
  sfxMuted: false,
  narrationMuted: false,
  showSubtitles: true,
};

const AUDIO_STORAGE_KEY = 'kos_audio_settings';

const THEME_PROFILES: Record<MusicSceneKey, ThemeProfile> = {
  landing: {
    label: 'Gerbang Kota Diraja · Fantasi Ajaib',
    barDurationMs: 2800,
    volumeScale: 0.95,
    useHorn: false,
    useTimpani: false,
    isBrightBell: true,
    melodyWave: 'triangle',
    chords: [
      { bass: 87.31, pad: [174.61, 220.0, 261.63, 392.0], arp: [349.23, 440.0, 523.25, 659.25], melody: [659.25, 698.46, 880.0, 783.99] },
      { bass: 98.0, pad: [196.0, 246.94, 293.66, 392.0], arp: [392.0, 493.88, 587.33, 659.25], melody: [783.99, 880.0, 987.77, 783.99] },
      { bass: 164.81, pad: [164.81, 246.94, 293.66, 392.0], arp: [392.0, 493.88, 587.33, 739.99], melody: [659.25, 587.33, 493.88, 587.33] },
      { bass: 110.0, pad: [220.0, 261.63, 329.63, 493.88], arp: [440.0, 523.25, 659.25, 783.99], melody: [523.25, 659.25, 783.99, 659.25] },
    ],
  },
  citadel: {
    label: 'Balai Agung Diraja · Orkestra Diraja',
    barDurationMs: 2700,
    volumeScale: 1.0,
    useHorn: true,
    useTimpani: true,
    isBrightBell: false,
    melodyWave: 'triangle',
    chords: [
      { bass: 130.81, pad: [261.63, 329.63, 392.0, 587.33], arp: [523.25, 659.25, 783.99, 1046.5], melody: [783.99, 880.0, 1046.5, 987.77] },
      { bass: 123.47, pad: [246.94, 293.66, 392.0, 493.88], arp: [493.88, 587.33, 783.99, 987.77], melody: [783.99, 659.25, 587.33, 783.99] },
      { bass: 110.0, pad: [220.0, 261.63, 329.63, 392.0], arp: [440.0, 523.25, 659.25, 783.99], melody: [659.25, 783.99, 880.0, 783.99] },
      { bass: 87.31, pad: [174.61, 220.0, 261.63, 329.63], arp: [349.23, 440.0, 523.25, 659.25], melody: [587.33, 659.25, 783.99, 659.25] },
    ],
  },
  library: {
    label: 'Kawasan Pengembaraan · Misteri Pustaka',
    barDurationMs: 2600,
    volumeScale: 0.92,
    useHorn: false,
    useTimpani: false,
    isBrightBell: true,
    melodyWave: 'sine',
    chords: [
      { bass: 146.83, pad: [293.66, 369.99, 440.0, 554.37], arp: [587.33, 739.99, 880.0, 1108.73], melody: [880.0, 987.77, 1108.73, 880.0] },
      { bass: 146.83, pad: [329.63, 415.3, 493.88, 659.25], arp: [659.25, 830.61, 987.77, 1174.66], melody: [830.61, 880.0, 987.77, 1174.66] },
      { bass: 123.47, pad: [246.94, 293.66, 369.99, 440.0], arp: [493.88, 587.33, 739.99, 880.0], melody: [739.99, 880.0, 739.99, 659.25] },
      { bass: 110.0, pad: [220.0, 277.18, 329.63, 415.3], arp: [440.0, 554.37, 659.25, 830.61], melody: [659.25, 739.99, 880.0, 739.99] },
    ],
  },
  woods: {
    label: 'Kawasan Pengembaraan · Rimba Fantasi',
    barDurationMs: 2450,
    volumeScale: 0.96,
    useHorn: false,
    useTimpani: false,
    isBrightBell: true,
    melodyWave: 'triangle',
    chords: [
      { bass: 164.81, pad: [246.94, 293.66, 369.99, 493.88], arp: [493.88, 587.33, 739.99, 987.77], melody: [739.99, 783.99, 987.77, 880.0] },
      { bass: 130.81, pad: [261.63, 329.63, 392.0, 493.88], arp: [523.25, 659.25, 783.99, 987.77], melody: [783.99, 880.0, 783.99, 659.25] },
      { bass: 98.0, pad: [196.0, 246.94, 293.66, 369.99], arp: [392.0, 493.88, 587.33, 739.99], melody: [587.33, 659.25, 783.99, 739.99] },
      { bass: 146.83, pad: [220.0, 293.66, 392.0, 440.0], arp: [440.0, 587.33, 783.99, 880.0], melody: [659.25, 739.99, 880.0, 987.77] },
    ],
  },
  atelier_workshop: {
    label: 'Balai Cipta Mahkota · Muzik Kreatif',
    barDurationMs: 2550,
    volumeScale: 0.9,
    useHorn: false,
    useTimpani: false,
    isBrightBell: true,
    melodyWave: 'triangle',
    chords: [
      { bass: 155.56, pad: [311.13, 392.0, 466.16, 587.33], arp: [622.25, 783.99, 932.33, 1174.66], melody: [783.99, 932.33, 1046.5, 932.33] },
      { bass: 130.81, pad: [261.63, 311.13, 392.0, 587.33], arp: [523.25, 622.25, 783.99, 1046.5], melody: [698.46, 783.99, 932.33, 783.99] },
      { bass: 103.83, pad: [207.65, 261.63, 311.13, 392.0], arp: [415.3, 523.25, 622.25, 783.99], melody: [622.25, 698.46, 783.99, 698.46] },
      { bass: 116.54, pad: [233.08, 293.66, 349.23, 392.0], arp: [466.16, 587.33, 698.46, 783.99], melody: [587.33, 698.46, 783.99, 932.33] },
    ],
  },
  atelier_studio: {
    label: 'Balai Gema Diraja · Studio Tenang',
    barDurationMs: 3200,
    volumeScale: 0.45,
    useHorn: false,
    useTimpani: false,
    isBrightBell: false,
    melodyWave: 'sine',
    chords: [
      { bass: 130.81, pad: [261.63, 329.63, 392.0], arp: [523.25, 659.25], melody: [659.25, 587.33] },
      { bass: 110.0, pad: [220.0, 261.63, 329.63], arp: [440.0, 523.25], melody: [523.25, 659.25] },
      { bass: 87.31, pad: [174.61, 220.0, 261.63], arp: [349.23, 440.0], melody: [440.0, 523.25] },
      { bass: 98.0, pad: [196.0, 246.94, 293.66], arp: [392.0, 493.88], melody: [493.88, 587.33] },
    ],
  },
  festival: {
    label: 'Kawasan Festival · Perayaan Diraja',
    barDurationMs: 2400,
    volumeScale: 1.08,
    useHorn: true,
    useTimpani: true,
    isBrightBell: true,
    melodyWave: 'triangle',
    chords: [
      { bass: 146.83, pad: [293.66, 369.99, 440.0, 659.25], arp: [587.33, 739.99, 880.0, 1174.66, 1479.98], melody: [880.0, 987.77, 1174.66, 1479.98] },
      { bass: 138.59, pad: [277.18, 329.63, 440.0, 554.37], arp: [554.37, 659.25, 880.0, 1108.73, 1318.51], melody: [1108.73, 987.77, 880.0, 1108.73] },
      { bass: 98.0, pad: [196.0, 246.94, 293.66, 440.0], arp: [392.0, 493.88, 587.33, 739.99, 1174.66], melody: [783.99, 880.0, 987.77, 1174.66] },
      { bass: 110.0, pad: [220.0, 293.66, 329.63, 440.0], arp: [440.0, 587.33, 659.25, 880.0, 1318.51], melody: [880.0, 1108.73, 1174.66, 1318.51] },
    ],
  },
};

function sanitizeAudioSettings(raw: Partial<AudioSettings> | null | undefined): AudioSettings {
  const clamp = (n: unknown, fallback: number): number => {
    const val = typeof n === 'number' && Number.isFinite(n) ? n : fallback;
    return Math.min(1, Math.max(0, Number(val.toFixed(2))));
  };
  return {
    masterVolume: clamp(raw?.masterVolume, DEFAULT_AUDIO_SETTINGS.masterVolume),
    musicVolume: clamp(raw?.musicVolume, DEFAULT_AUDIO_SETTINGS.musicVolume),
    sfxVolume: clamp(raw?.sfxVolume, DEFAULT_AUDIO_SETTINGS.sfxVolume),
    narrationVolume: clamp(raw?.narrationVolume, DEFAULT_AUDIO_SETTINGS.narrationVolume),
    musicMuted: Boolean(raw?.musicMuted ?? DEFAULT_AUDIO_SETTINGS.musicMuted),
    sfxMuted: Boolean(raw?.sfxMuted ?? DEFAULT_AUDIO_SETTINGS.sfxMuted),
    narrationMuted: Boolean(raw?.narrationMuted ?? DEFAULT_AUDIO_SETTINGS.narrationMuted),
    showSubtitles:
      typeof raw?.showSubtitles === 'boolean'
        ? raw.showSubtitles
        : DEFAULT_AUDIO_SETTINGS.showSubtitles,
  };
}

function readPersistedAudioSettings(userId?: string): AudioSettings {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
  try {
    const keys = userId
      ? [`${AUDIO_STORAGE_KEY}:${userId}`, AUDIO_STORAGE_KEY]
      : [AUDIO_STORAGE_KEY];
    for (const key of keys) {
      const saved = window.localStorage.getItem(key);
      if (saved) {
        return sanitizeAudioSettings(JSON.parse(saved) as Partial<AudioSettings>);
      }
    }
  } catch {
    // Ignore storage read errors cleanly
  }
  return { ...DEFAULT_AUDIO_SETTINGS };
}

function writePersistedAudioSettings(settings: AudioSettings, userId?: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const serialized = JSON.stringify(settings);
    window.localStorage.setItem(AUDIO_STORAGE_KEY, serialized);
    if (userId) {
      window.localStorage.setItem(`${AUDIO_STORAGE_KEY}:${userId}`, serialized);
    }
  } catch {
    // Ignore storage quota errors cleanly
  }
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicFadeGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private crossfadeTimeout: number | null = null;
  private stopFadeTimeout: number | null = null;
  private isPlayingMusic = false;
  private isDucked = false;
  private isMissionActivityDucked = false;
  private isVoiceCapturePaused = false;
  private activeMediaPlaybackCount = 0;
  private isLandingAmbience = false;
  private isFestivalAmbience = false;
  private currentLocation: LocationId = 'citadel';
  private atelierZone: 'lobby' | 'workshop' | 'studio' = 'lobby';
  private activeThemeKey: MusicSceneKey = 'citadel';
  private themeTransitionSeq = 0;
  private barIndex = 0;
  private lastHoverSfxAt = 0;
  private activeAudioEl: HTMLAudioElement | null = null;
  private currentUserId: string | undefined = undefined;
  private authToken: string =
    typeof window !== 'undefined' ? window.localStorage?.getItem('kos_token') || '' : '';
  private narrationSeq = 0;
  private ttsAbortController: AbortController | null = null;
  private clientTtsCache = new Map<string, string>();
  private speaking = false;
  private narrationListeners = new Set<(speaking: boolean) => void>();
  private settings: AudioSettings = readPersistedAudioSettings();

  setAuthToken(token: string): void {
    this.authToken = token;
  }

  loadSettingsForUser(userId?: string): AudioSettings {
    this.currentUserId = userId;
    const loaded = readPersistedAudioSettings(userId);
    this.settings = loaded;
    this.applyVolumes();
    return { ...this.settings };
  }

  isNarrating(): boolean {
    return this.speaking;
  }

  subscribeNarration(listener: (speaking: boolean) => void): () => void {
    this.narrationListeners.add(listener);
    return () => {
      this.narrationListeners.delete(listener);
    };
  }

  private setSpeakingState(next: boolean): void {
    if (this.speaking === next) return;
    this.speaking = next;
    this.narrationListeners.forEach((cb) => cb(next));
  }

  init(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.musicFadeGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();

    this.musicFadeGain.gain.setValueAtTime(1, this.ctx.currentTime);
    this.musicFadeGain.connect(this.musicGain);
    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    this.applyVolumes();
  }

  hasUserActivatedAudio(): boolean {
    return Boolean(this.ctx && this.ctx.state === 'running');
  }

  updateSettings(next: AudioSettings): void {
    const cleaned = sanitizeAudioSettings({
      ...this.settings,
      ...next,
    });
    this.settings = cleaned;
    writePersistedAudioSettings(cleaned, this.currentUserId);
    this.applyVolumes();

    if (cleaned.narrationMuted) {
      this.stopNarration();
    } else if (this.activeAudioEl) {
      this.activeAudioEl.volume = cleaned.narrationVolume * cleaned.masterVolume;
    }

    if (cleaned.musicMuted) {
      this.stopMusic();
    } else if (!this.isPlayingMusic && this.hasUserActivatedAudio()) {
      this.startMusic();
    }
  }

  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  setMusicMuted(muted: boolean): void {
    this.updateSettings({ ...this.settings, musicMuted: muted });
    if (!muted) {
      this.startMusic();
    }
  }

  setSfxMuted(muted: boolean): void {
    this.updateSettings({ ...this.settings, sfxMuted: muted });
  }

  setNarrationMuted(muted: boolean): void {
    this.updateSettings({ ...this.settings, narrationMuted: muted });
  }

  getMusicMuted(): boolean {
    return this.settings.musicMuted;
  }

  getSfxMuted(): boolean {
    return Boolean(this.settings.sfxMuted);
  }

  getNarrationMuted(): boolean {
    return Boolean(this.settings.narrationMuted);
  }

  isMusicActive(): boolean {
    return this.isPlayingMusic && !this.settings.musicMuted && this.hasUserActivatedAudio();
  }

  private resolveThemeKey(): MusicSceneKey {
    if (this.isFestivalAmbience) return 'festival';
    if (this.isLandingAmbience) return 'landing';
    switch (this.currentLocation) {
      case 'library':
        return 'library';
      case 'woods':
        return 'woods';
      case 'atelier':
        return this.atelierZone === 'studio' ? 'atelier_studio' : 'atelier_workshop';
      case 'theatre':
        return 'festival';
      case 'citadel':
      case 'gate_hall':
      default:
        return 'citadel';
    }
  }

  getCurrentMusicThemeLabel(): string {
    return THEME_PROFILES[this.resolveThemeKey()].label;
  }

  private transitionMusicTheme(instant = false): void {
    const targetKey = this.resolveThemeKey();
    if (targetKey === this.activeThemeKey && !instant) {
      this.applyVolumes();
      return;
    }

    this.themeTransitionSeq++;
    const seq = this.themeTransitionSeq;

    if (this.crossfadeTimeout !== null) {
      window.clearTimeout(this.crossfadeTimeout);
      this.crossfadeTimeout = null;
    }

    if (!this.ctx || !this.musicFadeGain || !this.isPlayingMusic || instant) {
      this.activeThemeKey = targetKey;
      this.barIndex = 0;
      this.applyVolumes();
      return;
    }

    // Smooth fade-out before switching theme, then smooth fade-in
    const now = this.ctx.currentTime;
    this.musicFadeGain.gain.cancelScheduledValues(now);
    this.musicFadeGain.gain.setValueAtTime(this.musicFadeGain.gain.value, now);
    this.musicFadeGain.gain.linearRampToValueAtTime(0.0001, now + 0.36);

    this.crossfadeTimeout = window.setTimeout(() => {
      this.crossfadeTimeout = null;
      if (seq !== this.themeTransitionSeq || !this.isPlayingMusic) return;

      this.activeThemeKey = targetKey;
      this.barIndex = 0;
      this.applyVolumes();

      if (this.musicTimer !== null) {
        window.clearTimeout(this.musicTimer);
        this.musicTimer = null;
      }

      if (this.ctx && this.musicFadeGain) {
        const t = this.ctx.currentTime;
        this.musicFadeGain.gain.cancelScheduledValues(t);
        this.musicFadeGain.gain.setValueAtTime(0.0001, t);
        this.musicFadeGain.gain.linearRampToValueAtTime(1, t + 0.55);
      }

      this.scheduleNextMusicBar();
    }, 380);
  }

  setLandingAmbience(enabled: boolean): void {
    this.isLandingAmbience = enabled;
    if (enabled) this.isFestivalAmbience = false;
    this.transitionMusicTheme();
  }

  setFestivalAmbience(enabled: boolean): void {
    this.isFestivalAmbience = enabled;
    if (enabled) {
      this.isLandingAmbience = false;
      this.transitionMusicTheme();
      if (!this.settings.musicMuted) {
        this.startMusic();
      }
    } else {
      this.transitionMusicTheme();
    }
  }

  setLocationAmbience(location: LocationId): void {
    this.isLandingAmbience = false;
    this.isFestivalAmbience = false;
    this.currentLocation = location;
    if (location !== 'atelier') {
      this.atelierZone = 'lobby';
    }
    this.transitionMusicTheme();
  }

  setAtelierZone(zone: 'lobby' | 'workshop' | 'studio'): void {
    if (this.atelierZone === zone) return;
    this.atelierZone = zone;
    if (this.currentLocation === 'atelier') {
      this.transitionMusicTheme();
    }
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.masterGain || !this.musicGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.settings.masterVolume, now, 0.06);

    const suppressedByCapture =
      this.isVoiceCapturePaused || this.activeMediaPlaybackCount > 0;
    const duckFactor = suppressedByCapture
      ? 0
      : this.isDucked
        ? 0.2
        : this.isMissionActivityDucked
          ? 0.35
          : 1.0;

    const themeScale = THEME_PROFILES[this.activeThemeKey]?.volumeScale ?? 1.0;
    const targetMusic = this.settings.musicMuted
      ? 0
      : this.settings.musicVolume * duckFactor * themeScale * 0.44;
    this.musicGain.gain.setTargetAtTime(targetMusic, now, suppressedByCapture ? 0.08 : 0.16);

    const targetSfx = this.settings.sfxMuted ? 0 : this.settings.sfxVolume * 0.58;
    this.sfxGain.gain.setTargetAtTime(targetSfx, now, 0.05);
  }

  duckMusic(duck: boolean): void {
    this.isDucked = duck;
    this.applyVolumes();
  }

  setMissionActivityDuck(duck: boolean): void {
    if (this.isMissionActivityDucked === duck) return;
    this.isMissionActivityDucked = duck;
    this.applyVolumes();
  }

  setVoiceCapturePaused(paused: boolean): void {
    if (this.isVoiceCapturePaused === paused) return;
    this.isVoiceCapturePaused = paused;
    this.applyVolumes();
  }

  pushMediaPlaybackPause(): () => void {
    this.activeMediaPlaybackCount += 1;
    this.applyVolumes();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.activeMediaPlaybackCount = Math.max(0, this.activeMediaPlaybackCount - 1);
      this.applyVolumes();
    };
  }

  private getMusicOutputNode(): AudioNode | null {
    return this.musicFadeGain || this.musicGain;
  }

  private playWarmStringPad(freq: number, startTime: number, duration: number, peak: number): void {
    const out = this.getMusicOutputNode();
    if (!this.ctx || !out) return;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(980, startTime);
    filter.Q.value = 0.65;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peak, startTime + 0.55);
    gain.gain.setValueAtTime(peak * 0.88, startTime + Math.max(0.6, duration - 0.65));
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    [-3.5, 3.5].forEach((detune) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.detune.setValueAtTime(detune, startTime);
      osc.connect(filter);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
    });

    filter.connect(gain);
    gain.connect(out);
  }

  private playHarpOrBell(freq: number, startTime: number, isBell: boolean, peak: number): void {
    const out = this.getMusicOutputNode();
    if (!this.ctx || !out) return;
    const osc = this.ctx.createOscillator();
    const overtone = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isBell ? 'sine' : 'triangle';
    overtone.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    overtone.frequency.setValueAtTime(freq * (isBell ? 3.0 : 2.0), startTime);

    const overGain = this.ctx.createGain();
    overGain.gain.setValueAtTime(isBell ? 0.24 : 0.15, startTime);

    const decay = isBell ? 1.55 : 1.15;
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peak, startTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + decay);

    osc.connect(gain);
    overtone.connect(overGain);
    overGain.connect(gain);
    gain.connect(out);

    osc.start(startTime);
    overtone.start(startTime);
    osc.stop(startTime + decay + 0.05);
    overtone.stop(startTime + decay + 0.05);
  }

  private playMelodyVoice(
    freq: number,
    startTime: number,
    duration: number,
    wave: OscillatorType,
    peak: number,
  ): void {
    const out = this.getMusicOutputNode();
    if (!this.ctx || !out) return;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = wave;
    osc.frequency.setValueAtTime(freq, startTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peak, startTime + 0.06);
    gain.gain.setValueAtTime(peak * 0.78, startTime + Math.max(0.08, duration * 0.68));
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(out);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.04);
  }

  private playBrassOrTimpani(freq: number, startTime: number, isTimpani: boolean): void {
    const out = this.getMusicOutputNode();
    if (!this.ctx || !out) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    if (isTimpani) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * 1.12, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.78, startTime + 0.32);
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(0.085, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.6);
      osc.connect(gain);
      gain.connect(out);
      osc.start(startTime);
      osc.stop(startTime + 0.65);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(540, startTime);
      filter.frequency.linearRampToValueAtTime(1020, startTime + 0.55);
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(0.046, startTime + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 2.1);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(out);
      osc.start(startTime);
      osc.stop(startTime + 2.2);
    }
  }

  private scheduleNextMusicBar = (): void => {
    if (!this.isPlayingMusic) return;

    const profile = THEME_PROFILES[this.activeThemeKey] || THEME_PROFILES.citadel;
    const barSeconds = profile.barDurationMs / 1000;

    if (
      this.ctx &&
      this.musicGain &&
      this.ctx.state === 'running' &&
      !this.settings.musicMuted &&
      !this.isVoiceCapturePaused &&
      this.activeMediaPlaybackCount === 0
    ) {
      const chord = profile.chords[this.barIndex % profile.chords.length];
      const now = this.ctx.currentTime;

      // 1. Warm String Ensemble Pad
      chord.pad.slice(0, 3).forEach((freq) => {
        this.playWarmStringPad(
          freq,
          now,
          barSeconds + 0.25,
          this.activeThemeKey === 'atelier_studio' ? 0.026 : 0.036,
        );
      });

      // 2. Royal Brass & Ceremonial Timpani
      if (profile.useHorn) {
        this.playBrassOrTimpani(chord.bass * 2, now + 0.08, false);
        if (this.activeThemeKey === 'festival') {
          this.playBrassOrTimpani(chord.bass * 3, now + barSeconds * 0.42, false);
        }
      }
      if (profile.useTimpani && (this.barIndex % 2 === 0 || this.activeThemeKey === 'festival')) {
        this.playBrassOrTimpani(chord.bass, now, true);
      }

      // 3. Harp & Celesta Arpeggio
      const arpStep = (barSeconds * 0.82) / Math.max(1, chord.arp.length);
      chord.arp.forEach((freq, idx) => {
        this.playHarpOrBell(
          freq,
          now + idx * arpStep,
          profile.isBrightBell && idx % 2 === 1,
          this.activeThemeKey === 'atelier_studio' ? 0.038 : 0.062,
        );
      });

      // 4. Fantasy Adventure Lead Melody Phrase
      const melStep = (barSeconds * 0.88) / Math.max(1, chord.melody.length);
      chord.melody.forEach((freq, idx) => {
        this.playMelodyVoice(
          freq,
          now + 0.06 + idx * melStep,
          melStep * 0.92,
          profile.melodyWave,
          this.activeThemeKey === 'atelier_studio' ? 0.025 : 0.052,
        );
      });

      this.barIndex += 1;
    }

    this.musicTimer = window.setTimeout(this.scheduleNextMusicBar, profile.barDurationMs);
  };

  startMusic(): void {
    this.init();
    if (!this.ctx || this.settings.musicMuted) return;

    if (this.stopFadeTimeout !== null) {
      window.clearTimeout(this.stopFadeTimeout);
      this.stopFadeTimeout = null;
    }

    this.activeThemeKey = this.resolveThemeKey();

    if (this.isPlayingMusic) {
      if (this.musicFadeGain) {
        const now = this.ctx.currentTime;
        this.musicFadeGain.gain.cancelScheduledValues(now);
        this.musicFadeGain.gain.setValueAtTime(this.musicFadeGain.gain.value, now);
        this.musicFadeGain.gain.linearRampToValueAtTime(1, now + 0.45);
      }
      this.applyVolumes();
      return;
    }

    this.isPlayingMusic = true;
    this.barIndex = 0;

    if (this.musicFadeGain) {
      const now = this.ctx.currentTime;
      this.musicFadeGain.gain.cancelScheduledValues(now);
      this.musicFadeGain.gain.setValueAtTime(0.0001, now);
      this.musicFadeGain.gain.linearRampToValueAtTime(1, now + 0.65);
    }
    this.applyVolumes();
    this.scheduleNextMusicBar();
  }

  stopMusic(): void {
    if (!this.isPlayingMusic && this.musicTimer === null) return;

    if (this.crossfadeTimeout !== null) {
      window.clearTimeout(this.crossfadeTimeout);
      this.crossfadeTimeout = null;
    }
    if (this.musicTimer !== null) {
      window.clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }

    if (this.ctx && this.musicFadeGain && this.ctx.state === 'running') {
      const now = this.ctx.currentTime;
      this.musicFadeGain.gain.cancelScheduledValues(now);
      this.musicFadeGain.gain.setValueAtTime(this.musicFadeGain.gain.value, now);
      this.musicFadeGain.gain.linearRampToValueAtTime(0.0001, now + 0.28);
      if (this.stopFadeTimeout !== null) {
        window.clearTimeout(this.stopFadeTimeout);
      }
      this.stopFadeTimeout = window.setTimeout(() => {
        this.isPlayingMusic = false;
        this.stopFadeTimeout = null;
      }, 300);
    } else {
      this.isPlayingMusic = false;
    }
  }

  playVolumeFeedbackPing(): void {
    this.init();
    if (!this.ctx || !this.sfxGain || this.settings.sfxMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(783.99, now);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.11, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playPortalSound(): void {
    this.init();
    if (!this.ctx || !this.sfxGain || this.settings.sfxMuted) return;
    const now = this.ctx.currentTime;
    [329.63, 440, 523.25, 659.25, 783.99].forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.07);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.25, now + i * 0.07 + 0.45);
      g.gain.setValueAtTime(0.001, now + i * 0.07);
      g.gain.linearRampToValueAtTime(0.18, now + i * 0.07 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.07 + 0.6);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.65);
    });
  }

  playPortalHoverSound(role: 'student' | 'teacher' | 'admin' = 'student'): void {
    if (!this.ctx || this.ctx.state !== 'running' || !this.sfxGain || this.settings.sfxMuted) return;
    const perfNow = performance.now();
    if (perfNow - this.lastHoverSfxAt < 160) return;
    this.lastHoverSfxAt = perfNow;

    const now = this.ctx.currentTime;
    const notes =
      role === 'student'
        ? [523.25, 783.99]
        : role === 'teacher'
          ? [587.33, 880.0]
          : [493.88, 739.99];
    notes.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.055);
      g.gain.setValueAtTime(0.001, now + i * 0.055);
      g.gain.linearRampToValueAtTime(0.09, now + i * 0.055 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.055 + 0.36);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + i * 0.055);
      osc.stop(now + i * 0.055 + 0.4);
    });
  }

  playUiHoverSound(): void {
    if (!this.ctx || this.ctx.state !== 'running' || !this.sfxGain || this.settings.sfxMuted) return;
    const perfNow = performance.now();
    if (perfNow - this.lastHoverSfxAt < 120) return;
    this.lastHoverSfxAt = perfNow;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(698.46, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.055, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  playUiClickSound(): void {
    this.init();
    if (!this.ctx || !this.sfxGain || this.settings.sfxMuted) return;
    const now = this.ctx.currentTime;
    [659.25, 987.77].forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.04);
      g.gain.setValueAtTime(0.001, now + i * 0.04);
      g.gain.linearRampToValueAtTime(0.11, now + i * 0.04 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.04 + 0.19);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.22);
    });
  }

  playPageTurnSound(): void {
    this.init();
    if (!this.ctx || !this.sfxGain || this.settings.sfxMuted) return;
    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.24);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(2600, now + 0.18);
    filter.Q.value = 1.4;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.14, now + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

    noise.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 0.25);
  }

  playCrystalChimeSound(): void {
    this.init();
    if (!this.ctx || !this.sfxGain || this.settings.sfxMuted) return;
    const now = this.ctx.currentTime;
    [587.33, 880.0, 1174.66].forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.065);
      g.gain.setValueAtTime(0.001, now + i * 0.065);
      g.gain.linearRampToValueAtTime(0.11, now + i * 0.065 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.065 + 0.55);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + i * 0.065);
      osc.stop(now + i * 0.065 + 0.6);
    });
  }

  playCollectSound(): void {
    this.init();
    if (!this.ctx || !this.sfxGain || this.settings.sfxMuted) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      g.gain.setValueAtTime(0.001, now + i * 0.06);
      g.gain.linearRampToValueAtTime(0.22, now + i * 0.06 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.06 + 0.32);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.35);
    });
  }

  playMissionComplete(): void {
    this.init();
    if (!this.ctx || !this.sfxGain || this.settings.sfxMuted) return;
    const now = this.ctx.currentTime;
    const chord = [261.63, 329.63, 392.0, 523.25, 659.25];
    chord.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.09);
      g.gain.setValueAtTime(0.001, now + i * 0.09);
      g.gain.linearRampToValueAtTime(0.24, now + i * 0.09 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.09 + 0.9);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.95);
    });
  }

  playRoyalCertificateChime(): void {
    this.init();
    if (!this.ctx || this.ctx.state !== 'running' || !this.sfxGain || this.settings.sfxMuted) return;
    const now = this.ctx.currentTime;
    const notes = [392.0, 493.88, 587.33, 739.99, 880.0, 1174.66];
    notes.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const over = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      over.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.085);
      over.frequency.setValueAtTime(freq * 2, now + i * 0.085);
      g.gain.setValueAtTime(0.0001, now + i * 0.085);
      g.gain.linearRampToValueAtTime(0.16, now + i * 0.085 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.085 + 1.2);
      osc.connect(g);
      over.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + i * 0.085);
      over.start(now + i * 0.085);
      osc.stop(now + i * 0.085 + 1.25);
      over.stop(now + i * 0.085 + 1.25);
    });
  }

  playFireworkBurstSound(intensity = 1): void {
    if (!this.ctx || this.ctx.state !== 'running' || !this.sfxGain || this.settings.sfxMuted) return;
    const now = this.ctx.currentTime;
    const level = Math.max(0.35, Math.min(1.25, intensity));

    const boomOsc = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boomOsc.type = 'sine';
    boomOsc.frequency.setValueAtTime(145, now);
    boomOsc.frequency.exponentialRampToValueAtTime(42, now + 0.38);
    boomGain.gain.setValueAtTime(0.0001, now);
    boomGain.gain.linearRampToValueAtTime(0.24 * level, now + 0.015);
    boomGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    boomOsc.connect(boomGain);
    boomGain.connect(this.sfxGain);
    boomOsc.start(now);
    boomOsc.stop(now + 0.45);

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.55);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const env = Math.pow(1 - i / bufferSize, 1.8);
      const crackle = Math.random() > 0.88 ? 1.3 : 0.45;
      data[i] = (Math.random() * 2 - 1) * env * crackle;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, now);
    filter.frequency.exponentialRampToValueAtTime(950, now + 0.52);
    filter.Q.value = 0.8;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.18 * level, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 0.56);

    const sparkleFreq = [1046.5, 1174.66, 1318.51, 1567.98][Math.floor(Math.random() * 4)];
    const chime = this.ctx.createOscillator();
    const chimeGain = this.ctx.createGain();
    chime.type = 'sine';
    chime.frequency.setValueAtTime(sparkleFreq, now + 0.04);
    chimeGain.gain.setValueAtTime(0.0001, now + 0.04);
    chimeGain.gain.linearRampToValueAtTime(0.055 * level, now + 0.07);
    chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
    chime.connect(chimeGain);
    chimeGain.connect(this.sfxGain);
    chime.start(now + 0.04);
    chime.stop(now + 0.68);
  }

  playInteractBeep(): void {
    this.init();
    if (!this.ctx || !this.sfxGain || this.settings.sfxMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.linearRampToValueAtTime(587.33, now + 0.1);
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.15, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  private async loadSpeechVoices(): Promise<SpeechSynthesisVoice[]> {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
    const current = window.speechSynthesis.getVoices();
    if (current.length > 0) return current;
    return await new Promise<SpeechSynthesisVoice[]>((resolve) => {
      let resolved = false;
      const done = () => {
        if (resolved) return;
        resolved = true;
        resolve(window.speechSynthesis.getVoices());
      };
      window.speechSynthesis.addEventListener('voiceschanged', done, { once: true });
      window.setTimeout(done, 150);
    });
  }

  private pickMalaysianVoice(
    voices: SpeechSynthesisVoice[],
    gender: 'male' | 'female',
  ): SpeechSynthesisVoice | undefined {
    const isIndonesian = (v: SpeechSynthesisVoice) => {
      const lang = v.lang.toLowerCase().replace('_', '-');
      const name = v.name.toLowerCase();
      return lang.startsWith('id') || name.includes('indonesia') || name.includes('damayanti');
    };
    const msMyVoices = voices.filter((v) => {
      const lang = v.lang.toLowerCase().replace('_', '-');
      return !isIndonesian(v) && (lang === 'ms-my' || lang.startsWith('ms-') || lang === 'ms');
    });
    const malayNameVoices =
      msMyVoices.length > 0
        ? msMyVoices
        : voices.filter(
            (v) =>
              !isIndonesian(v) &&
              (v.name.toLowerCase().includes('malay') || v.name.toLowerCase().includes('melayu')),
          );

    if (malayNameVoices.length === 0) return undefined;

    const maleHints = ['osman', 'male', 'lelaki', 'ahmad', 'arif'];
    const femaleHints = ['yasmin', 'amira', 'female', 'perempuan', 'seri', 'siti'];
    const hints = gender === 'male' ? maleHints : femaleHints;

    return (
      malayNameVoices.find((v) => hints.some((h) => v.name.toLowerCase().includes(h))) ||
      malayNameVoices[0]
    );
  }

  stopNarration(): void {
    this.narrationSeq++;
    if (this.ttsAbortController) {
      this.ttsAbortController.abort();
      this.ttsAbortController = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.activeAudioEl) {
      this.activeAudioEl.onended = null;
      this.activeAudioEl.onerror = null;
      this.activeAudioEl.pause();
      this.activeAudioEl = null;
    }
    this.setSpeakingState(false);
    this.duckMusic(false);
  }

  private playWavBase64(
    base64Audio: string,
    seq: number,
    onEnd?: () => void,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      if (seq !== this.narrationSeq) {
        resolve(false);
        return;
      }
      const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
      audio.volume = Math.min(1, Math.max(0, this.settings.narrationVolume * this.settings.masterVolume));
      this.activeAudioEl = audio;
      this.setSpeakingState(true);

      audio.onended = () => {
        if (this.activeAudioEl === audio) {
          this.activeAudioEl = null;
        }
        if (seq === this.narrationSeq) {
          this.setSpeakingState(false);
          this.duckMusic(false);
          onEnd?.();
        }
        resolve(true);
      };
      audio.onerror = () => {
        if (this.activeAudioEl === audio) {
          this.activeAudioEl = null;
        }
        resolve(false);
      };

      void audio.play().catch(() => {
        if (this.activeAudioEl === audio) {
          this.activeAudioEl = null;
        }
        resolve(false);
      });
    });
  }

  async speakMalay(
    text: string,
    options?: {
      voiceRole?: VoiceRole;
      styleHint?: VoiceStyleHint;
      pitch?: number;
      rate?: number;
      onEnd?: () => void;
      tryServerTts?: boolean;
      publicGuideId?: PublicVoiceGuideId;
      ignoreMute?: boolean;
    },
  ): Promise<void> {
    this.init();
    this.stopNarration();
    if (this.settings.narrationMuted && !options?.ignoreMute) {
      options?.onEnd?.();
      return;
    }
    const seq = this.narrationSeq;

    const voiceRole: VoiceRole = options?.voiceRole ?? 'narrator';
    const styleHint: VoiceStyleHint = options?.styleHint ?? 'story';
    const profile = VOICE_PROFILES[voiceRole] || VOICE_PROFILES.narrator;
    const spokenText = normalizeMalayForSpeech(text);
    if (!spokenText) {
      options?.onEnd?.();
      return;
    }

    this.duckMusic(true);
    this.setSpeakingState(true);

    const cacheKey = options?.publicGuideId
      ? `guide:${options.publicGuideId}`
      : `${voiceRole}:${styleHint}:${spokenText}`;

    const cachedWav = this.clientTtsCache.get(cacheKey);
    if (cachedWav) {
      const played = await this.playWavBase64(cachedWav, seq, options?.onEnd);
      if (played || seq !== this.narrationSeq) return;
    }

    const shouldTryServer = options?.tryServerTts !== false;
    const canFetchGuide = Boolean(options?.publicGuideId);
    const activeToken =
      this.authToken ||
      (typeof window !== 'undefined' ? window.localStorage?.getItem('kos_token') || '' : '');

    if (shouldTryServer && (canFetchGuide || activeToken)) {
      const controller = new AbortController();
      this.ttsAbortController = controller;
      try {
        const res = await fetch(canFetchGuide ? '/api/tts/guide' : '/api/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(activeToken && !canFetchGuide ? { Authorization: `Bearer ${activeToken}` } : {}),
          },
          body: JSON.stringify(
            canFetchGuide
              ? { guideId: options!.publicGuideId }
              : { text: spokenText, voiceRole, styleHint },
          ),
          signal: controller.signal,
        });

        if (seq !== this.narrationSeq) return;

        if (res.ok) {
          const data = (await res.json()) as { audioBase64?: string };
          if (data.audioBase64 && seq === this.narrationSeq) {
            if (this.clientTtsCache.size >= 60) {
              const oldest = this.clientTtsCache.keys().next().value;
              if (oldest) this.clientTtsCache.delete(oldest);
            }
            this.clientTtsCache.set(cacheKey, data.audioBase64);

            const played = await this.playWavBase64(data.audioBase64, seq, options?.onEnd);
            if (played || seq !== this.narrationSeq) return;
          }
        }
      } catch {
        if (seq !== this.narrationSeq) return;
      } finally {
        if (this.ttsAbortController === controller) {
          this.ttsAbortController = null;
        }
      }
    }

    if (seq !== this.narrationSeq) return;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const voices = await this.loadSpeechVoices();
      if (seq !== this.narrationSeq) return;

      const selectedVoice = this.pickMalaysianVoice(voices, profile.gender);
      const sentences = spokenText
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const chunks = sentences.length > 0 ? sentences : [spokenText];

      const speakChunk = (idx: number) => {
        if (seq !== this.narrationSeq) return;
        if (idx >= chunks.length) {
          this.setSpeakingState(false);
          this.duckMusic(false);
          options?.onEnd?.();
          return;
        }

        const utter = new SpeechSynthesisUtterance(chunks[idx]);
        if (selectedVoice) {
          utter.voice = selectedVoice;
        }
        utter.lang = 'ms-MY';
        utter.pitch = options?.pitch ?? profile.fallbackPitch;
        utter.rate = options?.rate ?? profile.fallbackRate;
        utter.volume = Math.min(1, Math.max(0, this.settings.narrationVolume * this.settings.masterVolume));
        utter.onend = () => {
          if (seq !== this.narrationSeq) return;
          window.setTimeout(() => speakChunk(idx + 1), 135);
        };
        utter.onerror = () => {
          if (seq !== this.narrationSeq) return;
          this.setSpeakingState(false);
          this.duckMusic(false);
          options?.onEnd?.();
        };
        window.speechSynthesis.speak(utter);
      };

      speakChunk(0);
    } else {
      globalThis.setTimeout(() => {
        if (seq !== this.narrationSeq) return;
        this.setSpeakingState(false);
        this.duckMusic(false);
        options?.onEnd?.();
      }, 2200);
    }
  }
}

export const soundEngine = new SoundEngine();
