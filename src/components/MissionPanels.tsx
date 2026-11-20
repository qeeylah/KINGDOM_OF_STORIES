import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Award,
  BookOpen,
  CheckCircle2,
  FileText,
  Film,
  HelpCircle,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Save,
  Sparkles,
  Square,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { soundEngine } from '../audio/soundEngine';
import { AuthenticatedAudioPlayer, AuthenticatedVideoPlayer } from './AuthenticatedMedia';
import {
  DEFAULT_SCRIPT_PLAN,
  LIBRARY_QUESTIONS,
  STORY_FRAGMENTS,
  TAMAN_SEKOLAH_STORY_AUDIO_SEGMENTS,
} from '../data/gameContent';
import type { VoiceTelemetry } from '../game/atelierChambers';
import type {
  AudioSettings,
  LanguageFeedback,
  PlayerProgress,
  ScriptPlan,
  SpeechFeedback,
  StoryboardScene,
  VoiceAttempt,
} from '../types/game';

export type ActiveMissionModal =
  | 'library_audio'
  | 'library_manuscript'
  | 'woods_altar'
  | 'atelier_writer'
  | 'atelier_voice'
  | 'theatre_stage';

interface MissionPanelsProps {
  modal: ActiveMissionModal;
  progress: PlayerProgress;
  token: string;
  audioSettings?: AudioSettings;
  onUpdateAudio?: (next: AudioSettings) => void;
  onUpdateProgress: (
    patch: Partial<PlayerProgress>,
    triggerVictory?: boolean,
  ) => Promise<boolean | void>;
  onMissionCompleteSuccess: (missionNumber: 1 | 2 | 3 | 4 | 5) => void;
  onClose: () => void;
  onShowFestivalFinale: () => void;
  onVoiceActivity?: (activity: VoiceTelemetry) => void;
}

const MISSION3_STEPS: Array<{ step: 1 | 2 | 3 | 4 | 5 | 6; shortLabel: string; title: string }> = [
  { step: 1, shortLabel: '1. Rancangan', title: 'Langkah 1: Rancangan Cerita' },
  { step: 2, shortLabel: '2. Jalan Cerita', title: 'Langkah 2: Bina Jalan Cerita' },
  { step: 3, shortLabel: '3. Papan Cerita', title: 'Langkah 3: Papan Cerita Empat Babak' },
  { step: 4, shortLabel: '4. Skrip Digital', title: 'Langkah 4: Skrip Penceritaan Digital' },
  { step: 5, shortLabel: '5. Mentor AI BM', title: 'Langkah 5: Semakan Mentor AI Bahasa Melayu' },
  { step: 6, shortLabel: '6. Semak & Simpan', title: 'Langkah 6: Semak dan Simpan Karya' },
];

const BABAK_GUIDES: Array<{
  label: string;
  stage: StoryboardScene['stage'];
  exampleTitle: string;
  exampleEvent: string;
  exampleDialogue: string;
  exampleVisual: string;
}> = [
  {
    label: 'Babak 1: Pengenalan cerita',
    stage: 'Permulaan',
    exampleTitle: 'Contoh: Misteri Di Taman Sekolah',
    exampleEvent: 'Watak utama tiba di lokasi cerita dan menyedari keadaan luar biasa yang mencetuskan rasa ingin tahu.',
    exampleDialogue: '"Eh, mengapa bunga-bunga di taman ini layu dan kolamnya keruh?" tanya Aiman dengan hairan.',
    exampleVisual: 'Paparan luas taman sekolah pada waktu pagi; watak utama berjalan menghampiri bangku lama.',
  },
  {
    label: 'Babak 2: Perkembangan peristiwa',
    stage: 'Perkembangan',
    exampleTitle: 'Contoh: Petunjuk Yang Tersembunyi',
    exampleEvent: 'Watak menemui petunjuk awal atau mula merancang tindakan bersama rakan dan watak pembimbing.',
    exampleDialogue: '"Lihat catatan ini! Kita perlu mengenal pasti punca masalah sebelum bertindak," kata Sofia.',
    exampleVisual: 'Syot dekat buku atau catatan petunjuk sambil watak-watak berbincang dengan bersungguh-sungguh.',
  },
  {
    label: 'Babak 3: Konflik atau kemuncak cerita',
    stage: 'Konflik',
    exampleTitle: 'Contoh: Cabaran Menguji Semangat',
    exampleEvent: 'Masalah sebenar atau halangan utama muncul dan menguji kecekalan serta kerjasama watak.',
    exampleDialogue: '"Saliran ini tersumbat teruk, tetapi kita tidak boleh berputus asa!" seru Danish.',
    exampleVisual: 'Suasana cemas atau kerja berpasukan yang giat ketika watak mengatasi cabaran utama.',
  },
  {
    label: 'Babak 4: Penyelesaian dan pengakhiran',
    stage: 'Pengakhiran',
    exampleTitle: 'Contoh: Kejayaan & Nilai Murni',
    exampleEvent: 'Halangan berjaya diatasi, keadaan pulih, dan pengajaran utama cerita disampaikan sebagai penutup.',
    exampleDialogue: '"Syabas semua! Kerjasama dan tanggungjawab kita membuahkan hasil," ucap Cikgu Hana.',
    exampleVisual: 'Latar kembali ceria dan bermandikan cahaya keemasan dengan watak tersenyum bangga.',
  },
];

function normalizeScriptPlan(raw?: ScriptPlan): ScriptPlan {
  const base = raw ?? DEFAULT_SCRIPT_PLAN;
  const fallbackScenes = DEFAULT_SCRIPT_PLAN.storyboard;
  const normalizedScenes: StoryboardScene[] = [0, 1, 2, 3].map((idx) => {
    const existing = base.storyboard?.[idx];
    const fb = fallbackScenes[idx];
    const guide = BABAK_GUIDES[idx];
    return {
      id: existing?.id || `sb-${idx + 1}`,
      stage: existing?.stage || guide.stage,
      title: existing?.title ?? fb?.title ?? '',
      eventDescription: existing?.eventDescription ?? existing?.visualDescription ?? fb?.eventDescription ?? '',
      characterDialogue: existing?.characterDialogue ?? fb?.characterDialogue ?? '',
      visualDescription: existing?.visualDescription ?? fb?.visualDescription ?? '',
      narrationCue: existing?.narrationCue ?? fb?.narrationCue ?? '',
      mood: existing?.mood ?? fb?.mood ?? 'Teratur dan jelas',
    };
  });

  const devText = (base.development ?? base.middle ?? '').trim();
  return {
    theme: base.theme ?? '',
    characters: base.characters ?? '',
    supportingCharacters:
      base.supportingCharacters ?? DEFAULT_SCRIPT_PLAN.supportingCharacters ?? '',
    setting: base.setting ?? '',
    beginning: base.beginning ?? '',
    development: devText,
    middle: devText,
    conflict: base.conflict ?? DEFAULT_SCRIPT_PLAN.conflict ?? '',
    ending: base.ending ?? '',
    fullScript: base.fullScript ?? '',
    storyboard: normalizedScenes,
  };
}

function createBlankScriptPlan(): ScriptPlan {
  return {
    theme: '',
    characters: '',
    supportingCharacters: '',
    setting: '',
    beginning: '',
    development: '',
    middle: '',
    conflict: '',
    ending: '',
    fullScript: '',
    storyboard: BABAK_GUIDES.map((g, idx) => ({
      id: `sb-${idx + 1}`,
      stage: g.stage,
      title: '',
      eventDescription: '',
      characterDialogue: '',
      visualDescription: '',
      narrationCue: '',
      mood: '',
    })),
  };
}

function generateInitialScriptDraft(p: ScriptPlan): string {
  const settingText = p.setting.trim() || 'sebuah latar tempat yang indah';
  const mainChars = p.characters.trim() || 'watak utama';
  const supChars = (p.supportingCharacters ?? '').trim();
  const introLine = `Cerita ini mengisahkan tentang ${p.theme.trim() || 'nilai murni dan pengembaraan'}. Di ${settingText}, bermulalah kisah ${mainChars}${supChars ? ` bersama ${supChars}` : ''}.`;

  const sceneParts = p.storyboard.map((sb, idx) => {
    const fallbackBody =
      idx === 0
        ? p.beginning
        : idx === 1
          ? p.development || p.middle
          : idx === 2
            ? p.conflict || p.middle
            : p.ending;
    const eventLine = (sb.eventDescription || '').trim() || fallbackBody.trim();
    const dialogueLine = (sb.characterDialogue || '').trim();
    const heading = sb.title.trim() ? `[${sb.title.trim()}] ` : '';
    return `${heading}${eventLine}${dialogueLine ? ` ${dialogueLine}` : ''}`.trim();
  });

  const closingLine = p.ending.trim()
    ? `Akhirnya, ${p.ending.trim().charAt(0).toLowerCase()}${p.ending.trim().slice(1)}`
    : '';

  return [introLine, ...sceneParts.filter(Boolean), closingLine].filter(Boolean).join('\n\n');
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Gagal membaca fail media.'));
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca fail media.'));
    reader.readAsDataURL(blob);
  });
}

export const MissionPanels: React.FC<MissionPanelsProps> = ({
  modal,
  progress,
  token,
  audioSettings,
  onUpdateAudio,
  onUpdateProgress,
  onMissionCompleteSuccess,
  onClose,
  onShowFestivalFinale,
  onVoiceActivity,
}) => {
  const [finishingMission, setFinishingMission] = useState(false);
  const [finishErrorMsg, setFinishErrorMsg] = useState('');
  const [isNarrating, setIsNarrating] = useState(false);
  const [localAudioSettings, setLocalAudioSettings] = useState<AudioSettings>(
    () => audioSettings ?? soundEngine.getSettings(),
  );

  useEffect(() => {
    setFinishErrorMsg('');
  }, [modal]);

  useEffect(() => {
    if (audioSettings) {
      setLocalAudioSettings(audioSettings);
    }
  }, [audioSettings]);

  const effectiveAudio = audioSettings ?? localAudioSettings;
  const updateNarrationVolume = (vol: number) => {
    const next = { ...effectiveAudio, narrationVolume: vol };
    setLocalAudioSettings(next);
    if (onUpdateAudio) {
      onUpdateAudio(next);
    } else {
      soundEngine.updateSettings(next);
    }
  };

  const finalizeMission = async (
    missionNumber: 1 | 2 | 3 | 4 | 5,
    patch: Partial<PlayerProgress>,
  ) => {
    if (finishingMission) return;
    setFinishErrorMsg('');
    setFinishingMission(true);
    try {
      const ok = await onUpdateProgress(patch, true);
      if (ok === false) {
        setFinishErrorMsg(
          'Gagal menyimpan status penyelesaian misi ke pelayan. Sila cuba lagi.',
        );
        return;
      }
      soundEngine.playMissionComplete();
      onClose();
      onMissionCompleteSuccess(missionNumber);
    } finally {
      setFinishingMission(false);
    }
  };
  // ---- MISSION 1A: LIBRARY AUDIO LISTENING STATION ----
  const prefersReducedMotion = useReducedMotion();
  const [playingSegmentIdx, setPlayingSegmentIdx] = useState<number | null>(null);
  const [listenedSegments, setListenedSegments] = useState<number[]>([]);

  useEffect(() => {
    const unsub = soundEngine.subscribeNarration((speaking) => {
      setIsNarrating(speaking);
      if (!speaking) {
        setPlayingSegmentIdx(null);
      }
    });
    return () => {
      unsub();
      soundEngine.stopNarration();
    };
  }, [modal]);

  const playStorySegment = (idx: number) => {
    const seg = TAMAN_SEKOLAH_STORY_AUDIO_SEGMENTS[idx];
    if (!seg) return;
    setPlayingSegmentIdx(idx);
    setListenedSegments((prev) => (prev.includes(idx) ? prev : [...prev, idx]));
    void soundEngine.speakMalay(`${seg.heading}. ${seg.text}`, {
      voiceRole: 'narrator',
      styleHint: 'story',
      onEnd: () => setPlayingSegmentIdx(null),
    });
  };

  // ---- MISSION 1B: LIBRARY MANUSCRIPT COMPREHENSION (ADAPTIVE) ----
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>({});
  const [libraryResultMsg, setLibraryResultMsg] = useState<string>('');
  const [bonusChallengeAnswer, setBonusChallengeAnswer] = useState('');
  const [libraryTasksReady, setLibraryTasksReady] = useState<boolean>(
    progress.libraryScore >= 4 || progress.libraryCompleted,
  );

  const handleSubmitLibrary = async () => {
    let correct = 0;
    const newHints = { ...revealedHints };
    LIBRARY_QUESTIONS.forEach((q) => {
      if (answers[q.id] === q.correctIndex) {
        correct++;
      } else {
        newHints[q.id] = true; // Adaptive learning automatically reveals hint on missed items
      }
    });
    setRevealedHints(newHints);
    const nextAttempts = progress.libraryAttempts + 1;
    const adaptiveLevel =
      correct <= 3
        ? 'Sokongan Tambahan'
        : correct === LIBRARY_QUESTIONS.length
          ? 'Cabaran Lanjutan'
          : 'Standard';

    if (correct >= 4) {
      soundEngine.playCollectSound();
      setLibraryTasksReady(true);
      await onUpdateProgress({
        libraryScore: correct,
        libraryAttempts: nextAttempts,
        adaptiveLevel,
      });
      const passMsg = `Syabas! Anda menjawab ${correct}/${LIBRARY_QUESTIONS.length} dengan tepat. Semua tugasan wajib Misi 1 telah selesai — tekan butang "Selesaikan Misi" di bawah untuk melengkapkan misi ini.`;
      setLibraryResultMsg(passMsg);
    } else {
      await onUpdateProgress({
        libraryScore: correct,
        libraryAttempts: nextAttempts,
        adaptiveLevel,
      });
      const retryMsg = `Anda memperoleh ${correct}/${LIBRARY_QUESTIONS.length}. Petunjuk adaptif telah dibuka pada soalan yang memerlukan semakan. Cuba lagi dengan penuh keyakinan!`;
      setLibraryResultMsg(retryMsg);
    }
  };

  // ---- MISSION 2: WHISPERING WOODS TIMELINE PUZZLE ----
  const isTimelineSorted = (ids?: string[]) =>
    Array.isArray(ids) && ids.length === 5 && ids.every((id, idx) => id === `frag-${idx + 1}`);

  const [orderedIds, setOrderedIds] = useState<string[]>(
    progress.woodsOrderedIds?.length === 5
      ? progress.woodsOrderedIds
      : ['frag-3', 'frag-1', 'frag-5', 'frag-2', 'frag-4'],
  );
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [woodsFeedback, setWoodsFeedback] = useState<string>('');
  const [showWoodsGuide, setShowWoodsGuide] = useState<boolean>(false);
  const [woodsTasksReady, setWoodsTasksReady] = useState<boolean>(
    progress.woodsCompleted ||
      (progress.collectedFragmentIds.length >= 5 &&
        isTimelineSorted(progress.woodsOrderedIds) &&
        progress.woodsAttempts > 0),
  );

  const moveOrderItem = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= orderedIds.length) return;
    const copy = [...orderedIds];
    const [removed] = copy.splice(idx, 1);
    copy.splice(target, 0, removed);
    setOrderedIds(copy);
  };

  const handleVerifyTimeline = async () => {
    const expected = ['frag-1', 'frag-2', 'frag-3', 'frag-4', 'frag-5'];
    let matches = 0;
    orderedIds.forEach((id, i) => {
      if (id === expected[i]) matches++;
    });
    const attempts = progress.woodsAttempts + 1;
    const allCollected = progress.collectedFragmentIds.length >= 5;

    if (!allCollected) {
      setWoodsFeedback(
        `Anda baru menemui ${progress.collectedFragmentIds.length}/5 serpihan di Rimba Cahaya Mahkota. Terokai kawasan rimba untuk mengutip kesemua 5 serpihan cerita terlebih dahulu sebelum mengesahkan garis masa.`,
      );
      return;
    }

    if (matches === 5) {
      soundEngine.playCollectSound();
      setWoodsTasksReady(true);
      await onUpdateProgress({
        woodsOrderedIds: orderedIds,
        woodsAttempts: attempts,
      });
      setWoodsFeedback(
        'Syabas! Susunan kronologi semua 5 serpihan cerita dari Permulaan hingga Pengakhiran adalah tepat.',
      );
      onClose();
      onMissionCompleteSuccess(2);
    } else {
      await onUpdateProgress({
        woodsOrderedIds: orderedIds,
        woodsAttempts: attempts,
        adaptiveLevel: attempts >= 2 ? 'Sokongan Tambahan' : progress.adaptiveLevel,
      });
      setWoodsFeedback(
        `Susunan garis masa belum tepat (${matches}/5 kedudukan betul). ${
          attempts >= 2
            ? 'Panduan: Semak semula urutan peristiwa mengikut tahap Permulaan, Pertengahan dan Pengakhiran, kemudian cuba lagi.'
            : 'Sila semak semula kedudukan setiap serpihan dari permulaan hingga pengakhiran kisah menggunakan butang anak panah, kemudian tekan Sahkan Garis Masa Cerita sekali lagi.'
        }`,
      );
    }
  };

  // ---- MISSION 3: ARCANE ATELIER SCRIPT PLANNER, STORYBOARD & AI LANGUAGE MENTOR (6 STEPS) ----
  const [plan, setPlan] = useState<ScriptPlan>(() => normalizeScriptPlan(progress.scriptPlan));
  const [mission3Step, setMission3Step] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [aiLangLoading, setAiLangLoading] = useState(false);
  const [aiLangError, setAiLangError] = useState('');
  const [langFeedback, setLangFeedback] = useState<LanguageFeedback | undefined>(
    progress.languageFeedback,
  );
  const [selfReviewConfirmed, setSelfReviewConfirmed] = useState<boolean>(
    Boolean(progress.languageFeedback || progress.atelierCompleted),
  );
  const [reviewReportMsg, setReviewReportMsg] = useState('');
  const [atelierSavedMsg, setAtelierSavedMsg] = useState('');
  const [atelierSavedError, setAtelierSavedError] = useState('');
  const [showM4StoryboardRef, setShowM4StoryboardRef] = useState(false);

  useEffect(() => {
    setPlan(normalizeScriptPlan(progress.scriptPlan));
  }, [progress.scriptPlan]);

  useEffect(() => {
    if (progress.languageFeedback) {
      setLangFeedback(progress.languageFeedback);
      setSelfReviewConfirmed(true);
    }
  }, [progress.languageFeedback]);

  const syncedPlan: ScriptPlan = {
    ...plan,
    middle: (plan.development ?? plan.middle ?? '').trim()
      ? plan.development ?? plan.middle
      : plan.middle,
  };

  const m3Checklist = {
    planReady:
      syncedPlan.theme.trim().length >= 3 &&
      syncedPlan.characters.trim().length >= 3 &&
      (syncedPlan.supportingCharacters ?? '').trim().length >= 2 &&
      syncedPlan.setting.trim().length >= 3,
    plotReady:
      syncedPlan.beginning.trim().length >= 5 &&
      (syncedPlan.development ?? syncedPlan.middle).trim().length >= 5 &&
      (syncedPlan.conflict ?? '').trim().length >= 5 &&
      syncedPlan.ending.trim().length >= 5,
    storyboardReady:
      syncedPlan.storyboard.length === 4 &&
      syncedPlan.storyboard.every(
        (sb) =>
          sb.title.trim().length >= 2 &&
          (sb.eventDescription ?? '').trim().length >= 5 &&
          sb.visualDescription.trim().length >= 5,
      ),
    scriptReady: syncedPlan.fullScript.trim().length >= 20,
    reviewReady: Boolean(langFeedback) || selfReviewConfirmed,
  };

  const isAtelierAllReady =
    m3Checklist.planReady &&
    m3Checklist.plotReady &&
    m3Checklist.storyboardReady &&
    m3Checklist.scriptReady &&
    m3Checklist.reviewReady;

  const scriptWordCount = syncedPlan.fullScript.trim()
    ? syncedPlan.fullScript.trim().split(/\s+/).length
    : 0;

  const handleAnalyzeLanguage = async () => {
    setAiLangError('');
    if (syncedPlan.fullScript.trim().length < 20) {
      setAiLangError(
        'Sila tulis skrip sekurang-kurangnya 20 aksara pada Langkah 4 terlebih dahulu sebelum memohon semakan Mentor AI.',
      );
      return;
    }
    setAiLangLoading(true);
    try {
      const res = await fetch('/api/mentor/language', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          scriptText: syncedPlan.fullScript,
          theme: syncedPlan.theme,
          characters: `${syncedPlan.characters}${syncedPlan.supportingCharacters ? `, ${syncedPlan.supportingCharacters}` : ''}`,
          setting: syncedPlan.setting,
        }),
      });
      const rawText = await res.text();
      let data: { feedback?: LanguageFeedback; error?: string } = {};
      try {
        data = rawText ? (JSON.parse(rawText) as { feedback?: LanguageFeedback; error?: string }) : {};
      } catch {
        data = {};
      }
      if (!res.ok || !data.feedback) {
        throw new Error(
          data.error ||
            'Mentor Bahasa AI tidak dapat dihubungi buat masa ini. Sila semak konfigurasi atau cuba sebentar lagi.',
        );
      }
      setLangFeedback(data.feedback);
      setSelfReviewConfirmed(true);
      const savedOk = await onUpdateProgress({
        scriptPlan: syncedPlan,
        languageFeedback: data.feedback,
      });
      if (savedOk === false) {
        setAiLangError(
          'Ulasan Mentor Bahasa AI berjaya dijana, tetapi rekod gagal disimpan ke pelayan. Sila tekan "SIMPAN KARYA" pada Langkah 6.',
        );
      }
    } catch (err) {
      setAiLangError(
        err instanceof Error
          ? err.message
          : 'Ralat sambungan ke Mentor Bahasa AI. Sila cuba lagi sebentar.',
      );
    } finally {
      setAiLangLoading(false);
    }
  };

  const handleCheckAtelierWork = () => {
    setAtelierSavedMsg('');
    setAtelierSavedError('');
    const missing: string[] = [];
    if (!m3Checklist.planReady) missing.push('Langkah 1 (Rancangan Cerita)');
    if (!m3Checklist.plotReady) missing.push('Langkah 2 (Empat Bahagian Jalan Cerita)');
    if (!m3Checklist.storyboardReady) missing.push('Langkah 3 (Papan Cerita Empat Babak)');
    if (!m3Checklist.scriptReady) missing.push('Langkah 4 (Skrip Penceritaan Digital)');
    if (!m3Checklist.reviewReady) missing.push('Langkah 5 (Semakan Penulisan / Mentor AI)');

    if (missing.length === 0) {
      soundEngine.playCollectSound();
      setReviewReportMsg(
        'Semakan lengkap! Semua lima komponen karya telah dipenuhi. Klik "SIMPAN KARYA" untuk menyimpan ke rekod atau "SELESAIKAN MISI" untuk menamatkan Misi 3.',
      );
    } else {
      setReviewReportMsg(
        `Masih ada bahagian yang perlu dilengkapkan: ${missing.join(', ')}. Sila kemas kini langkah berkaitan sebelum menamatkan misi.`,
      );
    }
  };

  const handleSaveAtelierPlan = async () => {
    setReviewReportMsg('');
    setAtelierSavedMsg('');
    setAtelierSavedError('');
    const ok = await onUpdateProgress({
      scriptPlan: syncedPlan,
    });
    if (ok === false) {
      setAtelierSavedError(
        'Gagal menyimpan hasil karya ke pelayan. Sila pastikan sambungan aktif dan cuba lagi.',
      );
      return;
    }
    soundEngine.playCollectSound();
    if (isAtelierAllReady) {
      setAtelierSavedMsg(
        'Karya anda (rancangan cerita, jalan cerita, papan cerita 4 babak dan skrip penuh) telah berjaya disimpan ke dalam rekod sistem dan sedia digunakan dalam Misi 4! Tekan "SELESAIKAN MISI" untuk pengakhiran Misi 3.',
      );
    } else {
      setAtelierSavedMsg(
        'Draf karya anda telah berjaya disimpan ke dalam sistem. Lengkapkan semua 5 item dalam senarai semak di atas sebelum menekan "SELESAIKAN MISI".',
      );
    }
  };

  const handleCompleteMission3 = async () => {
    if (!isAtelierAllReady) {
      handleCheckAtelierWork();
      return;
    }
    await finalizeMission(3, {
      scriptPlan: syncedPlan,
      atelierCompleted: true,
    });
  };

  // ---- MISSION 4: ROYAL VOICE CHAMBER (RECORDING + PERSISTENT SAVE + DELETE/REPLACE + AI OPTIONAL) ----
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [activeAttemptNum, setActiveAttemptNum] = useState<1 | 2>(
    progress.voiceAttempts.length === 1 && progress.voiceAttempts[0]?.attemptNumber === 1 ? 2 : 1,
  );
  const [recordingStatus, setRecordingStatus] = useState<
    'idle' | 'recording' | 'recorded' | 'saving' | 'saved'
  >('idle');
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string>('');
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [voiceStatusMsg, setVoiceStatusMsg] = useState<string>('');
  const [voiceErrorMsg, setVoiceErrorMsg] = useState<string>('');
  const [savingVoice, setSavingVoice] = useState(false);
  const [analyzingAttemptNum, setAnalyzingAttemptNum] = useState<number | null>(null);
  const [deletingMediaId, setDeletingMediaId] = useState<string | null>(null);
  const [replacingMediaId, setReplacingMediaId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const recordSecondsRef = useRef<number>(0);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const micAudioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animRafRef = useRef<number | null>(null);
  const onVoiceActivityRef = useRef(onVoiceActivity);
  onVoiceActivityRef.current = onVoiceActivity;

  const drawRestingStudioTrace = () => {
    const canvas = waveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Subtle studio grid backdrop
    ctx.fillStyle = '#0D132B';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(200, 182, 226, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // Calm resting spectrum bars (zero simulated recording motion)
    const barCount = 28;
    const gap = w / barCount;
    for (let i = 0; i < barCount; i++) {
      ctx.fillStyle = 'rgba(212, 175, 55, 0.25)';
      ctx.fillRect(i * gap + 3, h / 2 - 2, Math.max(4, gap - 6), 4);
    }
  };

  const cleanupAudioAnalyser = () => {
    if (animRafRef.current !== null) {
      window.cancelAnimationFrame(animRafRef.current);
      animRafRef.current = null;
    }
    if (micAudioCtxRef.current) {
      void micAudioCtxRef.current.close().catch(() => {});
      micAudioCtxRef.current = null;
    }
    analyserRef.current = null;
    onVoiceActivityRef.current?.({ isRecording: false, level: 0 });
    drawRestingStudioTrace();
  };

  useEffect(() => {
    if (modal === 'atelier_voice' && !isRecording) {
      drawRestingStudioTrace();
    }
  }, [modal, isRecording]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // ignore cleanup stop errors
        }
      }
      cleanupAudioAnalyser();
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    };
  }, [localPreviewUrl]);

  const pickSupportedAudioMimeType = (): string | undefined => {
    if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
      return undefined;
    }
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/ogg',
    ];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type));
  };

  const extensionFromMimeType = (mimeType: string): string => {
    if (mimeType.includes('mp4')) return 'm4a';
    if (mimeType.includes('ogg')) return 'ogg';
    if (mimeType.includes('wav')) return 'wav';
    return 'webm';
  };

  const startRecording = async () => {
    soundEngine.stopNarration();
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      setIsPreviewPlaying(false);
    }
    setVoiceErrorMsg('');
    setVoiceStatusMsg('');

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function' ||
      typeof MediaRecorder === 'undefined'
    ) {
      setVoiceErrorMsg(
        'Pelayar atau peranti anda tidak menyokong rakaman mikrofon terus. Sila gunakan pelayar moden seperti Chrome atau Edge.',
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chosenMimeType = pickSupportedAudioMimeType();
      const recorder = chosenMimeType
        ? new MediaRecorder(stream, { mimeType: chosenMimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const finalMime = recorder.mimeType || chosenMimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: finalMime });
        stream.getTracks().forEach((t) => t.stop());
        cleanupAudioAnalyser();

        if (blob.size < 400) {
          setRecordedBlob(null);
          if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
          setLocalPreviewUrl('');
          setRecordingStatus('idle');
          setVoiceErrorMsg(
            'Rakaman terlalu pendek atau tiada suara dikesan oleh mikrofon. Sila tekan "Mula Rakaman" dan bercakap dengan jelas sekurang-kurangnya beberapa saat.',
          );
          return;
        }

        setRecordedBlob(blob);
        if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
        setLocalPreviewUrl(URL.createObjectURL(blob));
        setRecordingStatus('recorded');
      };

      // Real-time Web Audio AnalyserNode from live microphone stream
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.78;
      source.connect(analyser);
      micAudioCtxRef.current = audioCtx;
      analyserRef.current = analyser;

      const timeData = new Uint8Array(analyser.fftSize);
      const freqData = new Uint8Array(analyser.frequencyBinCount);
      let smoothedLevel = 0;

      const renderLiveSpectrum = () => {
        const activeAnalyser = analyserRef.current;
        if (!activeAnalyser) return;

        activeAnalyser.getByteTimeDomainData(timeData);
        activeAnalyser.getByteFrequencyData(freqData);

        let sumSq = 0;
        for (let i = 0; i < timeData.length; i++) {
          const norm = (timeData[i] - 128) / 128;
          sumSq += norm * norm;
        }
        const rms = Math.sqrt(sumSq / timeData.length);
        const instantLevel = Math.min(1, rms * 3.4);
        smoothedLevel = smoothedLevel * 0.72 + instantLevel * 0.28;
        onVoiceActivityRef.current?.({ isRecording: true, level: smoothedLevel });

        const canvas = waveCanvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const w = canvas.width;
            const h = canvas.height;
            ctx.fillStyle = '#0D132B';
            ctx.fillRect(0, 0, w, h);

            const barCount = 28;
            const gap = w / barCount;
            const binsPerBar = Math.max(1, Math.floor(freqData.length / barCount));
            for (let b = 0; b < barCount; b++) {
              let binSum = 0;
              for (let k = 0; k < binsPerBar; k++) {
                binSum += freqData[b * binsPerBar + k] || 0;
              }
              const mag = binSum / (binsPerBar * 255);
              const barH = Math.max(4, mag * (h * 0.78));
              const grad = ctx.createLinearGradient(0, h - barH, 0, h);
              grad.addColorStop(0, '#E5C35A');
              grad.addColorStop(0.55, '#9F6BEA');
              grad.addColorStop(1, '#5CD2E6');
              ctx.fillStyle = grad;
              ctx.fillRect(b * gap + 3, h - barH - 4, Math.max(4, gap - 6), barH);
            }

            ctx.strokeStyle = '#FAF6EE';
            ctx.lineWidth = 2;
            ctx.beginPath();
            const sliceW = w / timeData.length;
            for (let i = 0; i < timeData.length; i++) {
              const v = timeData[i] / 128.0;
              const y = (v * h) / 2;
              if (i === 0) ctx.moveTo(0, y);
              else ctx.lineTo(i * sliceW, y);
            }
            ctx.stroke();
          }
        }

        animRafRef.current = window.requestAnimationFrame(renderLiveSpectrum);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);
      setRecordingStatus('recording');
      setRecordSeconds(0);
      recordSecondsRef.current = 0;
      animRafRef.current = window.requestAnimationFrame(renderLiveSpectrum);
      timerRef.current = window.setInterval(() => {
        recordSecondsRef.current += 1;
        setRecordSeconds(recordSecondsRef.current);
      }, 1000);
    } catch {
      cleanupAudioAnalyser();
      setRecordingStatus('idle');
      setVoiceErrorMsg(
        'Akses mikrofon tidak dibenarkan atau tiada peranti mikrofon dikesan. Sila benarkan kebenaran mikrofon pada pelayar anda dan cuba lagi.',
      );
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      cleanupAudioAnalyser();
    }
    setIsRecording(false);
  };

  const handleTogglePreviewPlayback = () => {
    const audioEl = previewAudioRef.current;
    if (!audioEl || !localPreviewUrl) return;
    if (audioEl.paused) {
      audioEl.play().catch(() => {
        setVoiceErrorMsg('Tidak dapat memainkan pratonton audio pada pelayar ini.');
      });
    } else {
      audioEl.pause();
    }
  };

  const handleSaveVoiceRecording = async () => {
    if (!recordedBlob || recordedBlob.size < 400) {
      setVoiceErrorMsg('Tiada rakaman audio yang sah untuk disimpan. Sila rakam semula.');
      return;
    }
    setVoiceErrorMsg('');
    setVoiceStatusMsg('');
    setSavingVoice(true);
    setRecordingStatus('saving');
    try {
      const base64Data = await blobToBase64(recordedBlob);
      const mimeType = recordedBlob.type || 'audio/webm';
      const ext = extensionFromMimeType(mimeType);
      const duration = Math.max(1, recordSecondsRef.current || recordSeconds);

      // 1. Upload real audio file to persistent server storage
      const upRes = await fetch('/api/media/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          kind: 'audio',
          mimeType,
          filename: `misi4-cubaan-${activeAttemptNum}.${ext}`,
          base64Data,
          missionNumber: 4,
          attemptNumber: activeAttemptNum,
        }),
      });
      const upData = (await upRes.json()) as { mediaId?: string; error?: string };
      if (!upRes.ok || !upData.mediaId) {
        throw new Error(
          upData.error || 'Gagal menyimpan fail rakaman suara ke storan kekal sistem.',
        );
      }

      const previousForAttempt = progress.voiceAttempts.find(
        (a) => a.attemptNumber === activeAttemptNum,
      );
      const oldMediaToReplace = replacingMediaId || previousForAttempt?.mediaId;

      const filtered = progress.voiceAttempts.filter((a) => a.attemptNumber !== activeAttemptNum);
      const nextAttempt: VoiceAttempt = {
        attemptNumber: activeAttemptNum,
        mediaId: upData.mediaId,
        durationSeconds: duration,
        recordedAt: new Date().toISOString(),
        submissionStatus: 'Berjaya Dihantar',
        transcript: '(Rakaman suara disimpan — sedia untuk semakan pensyarah di Portal Guru)',
      };
      const nextList = [...filtered, nextAttempt].sort((a, b) => a.attemptNumber - b.attemptNumber);

      // 2. Link recording to student identity & Misi 4 in persistent database
      const savedOk = await onUpdateProgress({
        voiceAttempts: nextList,
      });
      if (savedOk === false) {
        throw new Error(
          'Fail audio berjaya dimuat naik, tetapi rekod Misi 4 gagal dikemas kini. Sila cuba simpan semula.',
        );
      }

      // 3. Clean up superseded audio file if replacing an old recording
      if (oldMediaToReplace && oldMediaToReplace !== upData.mediaId) {
        void fetch(`/api/media/${encodeURIComponent(oldMediaToReplace)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }

      soundEngine.playCollectSound();
      setReplacingMediaId(null);
      setRecordingStatus('saved');
      setVoiceStatusMsg(
        `Rakaman Berjaya Disimpan & Rakaman Berjaya Dihantar (Cubaan ke-${activeAttemptNum})! Pensyarah kini boleh memainkan dan menilai rakaman anda melalui Portal Guru.`,
      );
    } catch (err) {
      setRecordingStatus('recorded');
      setVoiceErrorMsg(
        err instanceof Error
          ? err.message
          : 'Gagal menyimpan rakaman suara. Sila semak sambungan dan cuba lagi.',
      );
    } finally {
      setSavingVoice(false);
    }
  };

  const handleAnalyzeSavedAttempt = async (attempt: VoiceAttempt) => {
    setVoiceErrorMsg('');
    setAnalyzingAttemptNum(attempt.attemptNumber);
    try {
      const mediaRes = await fetch(`/api/media/${encodeURIComponent(attempt.mediaId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!mediaRes.ok) {
        throw new Error('Gagal membaca fail audio tersimpan untuk analisis AI.');
      }
      const audioBlob = await mediaRes.blob();
      const base64Data = await blobToBase64(audioBlob);

      const spRes = await fetch('/api/mentor/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          audioBase64: base64Data,
          mimeType: audioBlob.type || 'audio/webm',
          durationSeconds: attempt.durationSeconds,
          referenceScript: progress.scriptPlan.fullScript || syncedPlan.fullScript,
          attemptNumber: attempt.attemptNumber,
          mediaId: attempt.mediaId,
        }),
      });
      const spData = (await spRes.json()) as { analysis?: SpeechFeedback; error?: string };
      if (!spRes.ok || !spData.analysis) {
        throw new Error(
          spData.error ||
            'Penganalisis Pertuturan AI tidak tersedia buat masa ini. Rakaman suara anda kekal tersimpan dengan selamat.',
        );
      }

      const updatedAttempts = progress.voiceAttempts.map((a) =>
        a.mediaId === attempt.mediaId
          ? {
              ...a,
              transcript: spData.analysis!.transcript,
              analysis: spData.analysis,
            }
          : a,
      );
      await onUpdateProgress({ voiceAttempts: updatedAttempts });
      soundEngine.playCollectSound();
    } catch (err) {
      setVoiceErrorMsg(
        err instanceof Error ? err.message : 'Analisis pertuturan AI tidak tersedia.',
      );
    } finally {
      setAnalyzingAttemptNum(null);
    }
  };

  const handleDeleteSavedRecording = async (attempt: VoiceAttempt) => {
    setVoiceErrorMsg('');
    setVoiceStatusMsg('');
    setDeletingMediaId(attempt.mediaId);
    try {
      const res = await fetch(`/api/media/${encodeURIComponent(attempt.mediaId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { ok?: boolean; progress?: PlayerProgress; error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memadam rakaman suara.');
      }
      const remaining = progress.voiceAttempts.filter((a) => a.mediaId !== attempt.mediaId);
      await onUpdateProgress({
        voiceAttempts: remaining,
        voiceCompleted: remaining.length === 0 ? false : progress.voiceCompleted,
      });
      setVoiceStatusMsg(`Rakaman Cubaan ke-${attempt.attemptNumber} telah dipadam daripada sistem.`);
    } catch (err) {
      setVoiceErrorMsg(
        err instanceof Error ? err.message : 'Gagal memadam rakaman suara.',
      );
    } finally {
      setDeletingMediaId(null);
    }
  };

  const handleStartReplaceRecording = (attempt: VoiceAttempt) => {
    setVoiceErrorMsg('');
    setVoiceStatusMsg(
      `Mod Gantikan Rakaman aktif untuk Cubaan ke-${attempt.attemptNumber}. Tekan "Mula Rakaman" untuk merakam versi baharu dan kemudian tekan "Simpan Rakaman".`,
    );
    setActiveAttemptNum(attempt.attemptNumber);
    setReplacingMediaId(attempt.mediaId);
    setRecordedBlob(null);
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    setLocalPreviewUrl('');
    setRecordingStatus('idle');
  };

  // ---- MISSION 5: GRAND ROYAL THEATRE STAGE ----
  const [videoTitle, setVideoTitle] = useState(
    progress.finalVideoTitle || 'Misi Menyelamatkan Taman Sekolah — Persembahan Digital',
  );
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  const [theatreMsg, setTheatreMsg] = useState('');
  const [theatreErr, setTheatreErr] = useState('');
  const [sampleSlideIdx, setSampleSlideIdx] = useState(0);

  const handleUploadVideoFile = async (file: File) => {
    setTheatreErr('');
    setTheatreMsg('');
    if (file.size > 32 * 1024 * 1024) {
      setTheatreErr('Saiz video melebihi 32MB. Sila mampatkan video kepada 2–3 minit beresolusi 720p.');
      return;
    }
    setUploadingVideo(true);
    try {
      const base64Data = await blobToBase64(file);
      const upRes = await fetch('/api/media/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          kind: 'video',
          mimeType: file.type || 'video/mp4',
          filename: file.name,
          base64Data,
        }),
      });
      const data = (await upRes.json()) as { mediaId?: string; error?: string };
      if (!upRes.ok || !data.mediaId) {
        throw new Error(data.error || 'Muat naik video gagal.');
      }
      soundEngine.playCollectSound();
      await onUpdateProgress({
        finalVideoMediaId: data.mediaId,
        finalVideoTitle: videoTitle || file.name,
        finalVideoType: 'uploaded',
        finalSubmittedAt: new Date().toISOString(),
      });
      setTheatreMsg(
        'Video penceritaan digital anda berjaya dimuat naik di Balairung Gemilang Diraja! Tekan butang "Selesaikan Misi" di bawah untuk melengkapkan Misi 5.',
      );
    } catch (err) {
      setTheatreErr(err instanceof Error ? err.message : 'Gagal memuat naik video.');
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleUseStoryboardPresentation = async () => {
    setTheatreErr('');
    soundEngine.playCollectSound();
    await onUpdateProgress({
      finalVideoTitle: videoTitle,
      finalVideoType: 'sample_presentation',
      finalSubmittedAt: new Date().toISOString(),
    });
    setPresentationMode(true);
    setTheatreMsg(
      'Persembahan Papan Cerita & Audio Penceritaan telah ditayangkan! Tekan butang "Selesaikan Misi" di bawah untuk melengkapkan Misi 5.',
    );
  };

  // ============================================================================
  // RENDER MODAL SHELL
  // ============================================================================
  const isLibraryPopup = modal === 'library_audio' || modal === 'library_manuscript';

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#0B1022]/85 p-4 sm:p-6"
      style={{ perspective: 1400 }}
    >
      {/* Magical Rotating Circular Arcane Aura behind Archive Pop-up */}
      {modal === 'library_manuscript' && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 flex items-center justify-center overflow-hidden"
        >
          <div
            className={`w-[620px] h-[620px] rounded-full border-2 border-dashed border-[#E5C35A]/30 ${
              prefersReducedMotion ? '' : 'animate-royal-orbit'
            }`}
          />
          <div className="absolute w-[500px] h-[500px] rounded-full border border-[#7BE0E6]/25" />
        </div>
      )}

      <motion.div
        initial={
          prefersReducedMotion
            ? false
            : isLibraryPopup
              ? { opacity: 0, rotateX: -12, scale: 0.94, y: 16 }
              : { opacity: 0, scale: 0.97 }
        }
        animate={{ opacity: 1, rotateX: 0, scale: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
        className={`relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl text-[#FAF6EE] shadow-2xl overflow-hidden ${
          isLibraryPopup
            ? 'border-2 border-[#E5C35A]/75 bg-[#121B38] shadow-[0_0_55px_rgba(123,224,230,0.22)]'
            : 'border border-[#D4AF37]/45 bg-[#162038]'
        }`}
      >
        {/* Royal Ornamental Corners for Library 3D Book & Archive Pop-ups */}
        {isLibraryPopup && (
          <>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-[#E5C35A] rounded-tl-md z-10"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-[#E5C35A] rounded-tr-md z-10"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-[#E5C35A] rounded-bl-md z-10"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-[#E5C35A] rounded-br-md z-10"
            />
          </>
        )}

        {/* Modal Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isLibraryPopup
              ? 'border-[#E5C35A]/35 bg-gradient-to-r from-[#1A254E] via-[#222B5C] to-[#1A254E]'
              : 'border-[#D4AF37]/25 bg-[#1B2948]'
          }`}
        >
          <div>
            <p className="text-xs text-[#E5C35A] font-medium">
              {modal === 'library_audio' &&
                'Pustaka Agung Hikayat Diraja · Stesen Pendengaran Ajaib'}
              {modal === 'library_manuscript' &&
                'Pustaka Agung Hikayat Diraja · Misi 1: Hikayat Yang Membisu'}
              {modal === 'woods_altar' && 'Rimba Cahaya Mahkota · Misi 2: Garis Masa Yang Terpecah'}
              {modal === 'atelier_writer' && 'Balai Cipta Mahkota · Misi 3: Arkitek Kisah'}
              {modal === 'atelier_voice' && 'Balai Gema Diraja · Misi 4: Ujian Suara Diraja'}
              {modal === 'theatre_stage' && 'Balairung Gemilang Diraja · Misi 5: Hikayat Terakhir'}
            </p>
            <h2 className="font-display text-lg sm:text-xl font-semibold text-[#FAF6EE] mt-0.5">
              {modal === 'library_audio' && 'Kitab Purba: Misi Menyelamatkan Taman Sekolah'}
              {modal === 'library_manuscript' && 'Panel Arkib Ajaib: Analisis Unsur Cerita'}
              {modal === 'woods_altar' && 'Altar Kronologi Batu Purba'}
              {modal === 'atelier_writer' && 'Meja Penulisan Skrip, Papan Cerita & Mentor AI'}
              {modal === 'atelier_voice' && 'Studio Rakaman & Penganalisis Pertuturan AI'}
              {modal === 'theatre_stage' && 'Pentas Persembahan Video Penceritaan Digital'}
            </h2>
            {isLibraryPopup && (
              <p className="text-[11px] text-[#C8B6E2] tracking-wide">
                The Grand Enchanted Royal Library
              </p>
            )}
            {modal === 'woods_altar' && (
              <p className="text-[11px] text-[#7BE0E6] tracking-wide">
                The Crown of Enchanted Light
              </p>
            )}
            {modal === 'atelier_writer' && (
              <p className="text-[11px] text-[#E5C35A]/85 tracking-wide">
                The Royal Enchanted Workshop
              </p>
            )}
            {modal === 'atelier_voice' && (
              <p className="text-[11px] text-[#C8B6E2]/90 tracking-wide">
                The Royal Voice Recording Chamber
              </p>
            )}
            {modal === 'theatre_stage' && (
              <p className="text-[11px] text-[#E5C35A]/90 tracking-wide">
                The Grand Radiant Royal Hall
              </p>
            )}
          </div>
          <button
            onClick={() => {
              soundEngine.playUiClickSound();
              onClose();
            }}
            className="p-2 rounded-lg border border-[#E5C35A]/35 bg-[#111936] hover:bg-[#1E2B58] text-[#FAF6EE]"
            aria-label="Tutup panel misi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ---------------- LIBRARY AUDIO (ANCIENT BOOK POP-UP) ---------------- */}
          {modal === 'library_audio' && (
            <>
              <div className="rounded-xl border border-[#7BE0E6]/40 bg-[#18244A] p-4 text-sm text-[#EFE6D5] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-5 h-5 text-[#E5C35A] shrink-0" />
                  <span>
                    Helaian kitab purba kini terbuka. Dengarkan keempat-empat babak kisah{' '}
                    <strong>&quot;Misi Menyelamatkan Taman Sekolah&quot;</strong> sebelum menjawab soalan manuskrip.
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-[#C8B6E2]">
                    <Volume2 className="w-3.5 h-3.5 text-[#7BE0E6]" />
                    <span>Kelantangan</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={effectiveAudio.narrationVolume}
                      onChange={(e) => updateNarrationVolume(Number(e.target.value))}
                      className="w-20 accent-[#E5C35A]"
                      aria-label="Kelantangan audio cerita"
                    />
                  </label>
                  {playingSegmentIdx !== null && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.stopNarration();
                        setPlayingSegmentIdx(null);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#E5C35A] text-[#121B38] text-xs font-semibold"
                    >
                      <VolumeX className="w-3.5 h-3.5" />
                      <span>Hentikan Semua</span>
                    </button>
                  )}
                  <span className="font-mono-tabular text-xs text-[#E5C35A]">
                    Didengar: {listenedSegments.length}/{TAMAN_SEKOLAH_STORY_AUDIO_SEGMENTS.length} bahagian
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TAMAN_SEKOLAH_STORY_AUDIO_SEGMENTS.map((seg, idx) => {
                  const isPlaying = playingSegmentIdx === idx;
                  return (
                    <motion.div
                      key={seg.id}
                      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.06 }}
                      className={`rounded-xl border p-4 space-y-2.5 transition-colors ${
                        isPlaying
                          ? 'border-[#E5C35A] bg-[#1D2B59] shadow-[0_0_24px_rgba(229,195,90,0.22)]'
                          : 'border-[#E5C35A]/25 bg-[#172144]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-display font-semibold text-sm text-[#E5C35A]">
                          {seg.heading}
                        </h3>
                        <div className="flex items-center gap-2 shrink-0">
                          {isPlaying ? (
                            <button
                              onClick={() => {
                                soundEngine.stopNarration();
                                setPlayingSegmentIdx(null);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E5C35A] text-[#121B38] text-xs font-semibold"
                            >
                              <Pause className="w-3.5 h-3.5" />
                              <span>Hentikan</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => playStorySegment(idx)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5C35A]/50 bg-[#121A36] hover:bg-[#233256] text-xs font-semibold text-[#FAF6EE]"
                            >
                              <Volume2 className="w-3.5 h-3.5 text-[#7BE0E6]" />
                              <span>Dengar Audio</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-[11px] italic text-[#C8B6E2]">
                        Kesan bunyi: {seg.sfxCue}
                      </div>
                      <p className="text-sm leading-relaxed text-[#FAF6EE]/92">{seg.text}</p>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}

          {/* ---------------- LIBRARY MANUSCRIPT (MAGICAL ARCHIVE POP-UP) ---------------- */}
          {modal === 'library_manuscript' && (
            <>
              <div className="rounded-xl border border-[#C8B6E2]/40 bg-[#18244A] p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-sm text-[#EFE6D5]">
                  <Sparkles className="w-4 h-4 text-[#7BE0E6] shrink-0" />
                  <span>
                    Kenal pasti watak, latar, masalah utama, peristiwa penting, penyelesaian dan nilai murni daripada kisah tadi.
                  </span>
                </div>
                <div className="text-xs text-[#C8B6E2] font-mono-tabular">
                  Tahap Adaptif: <strong className="text-[#E5C35A]">{progress.adaptiveLevel}</strong>
                </div>
              </div>

              <div className="space-y-4">
                {LIBRARY_QUESTIONS.map((q, qIdx) => (
                  <motion.div
                    key={q.id}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: qIdx * 0.05 }}
                    className="rounded-xl border border-[#E5C35A]/25 bg-[#172144] p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#7BE0E6]">
                        Soalan {qIdx + 1} · Unsur: {q.category}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setRevealedHints((h) => ({ ...h, [q.id]: !h[q.id] }));
                        }}
                        className="flex items-center gap-1 text-xs text-[#E5C35A] hover:underline"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Petunjuk</span>
                      </button>
                    </div>
                    <p className="text-sm font-medium text-[#FAF6EE]">{q.prompt}</p>

                    {revealedHints[q.id] && (
                      <div className="rounded-lg bg-[#111936] border border-[#E5C35A]/35 px-3 py-2 text-xs text-[#EFE6D5]">
                        <span>{q.adaptiveHint}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, oIdx) => {
                        const chosen = answers[q.id] === oIdx;
                        return (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() => {
                              setAnswers((a) => ({ ...a, [q.id]: oIdx }));
                            }}
                            className={`text-left px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm transition-colors ${
                              chosen
                                ? 'border-[#E5C35A] bg-[#E5C35A]/20 text-[#FAF6EE] font-medium'
                                : 'border-[#FAF6EE]/15 bg-[#111936] text-[#FAF6EE]/80 hover:border-[#C8B6E2]/55'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}
              </div>

              {progress.adaptiveLevel === 'Cabaran Lanjutan' && (
                <div className="rounded-xl border border-[#C8B6E2]/40 bg-[#18244A] p-4 space-y-2">
                  <div className="text-xs font-semibold text-[#C8B6E2]">
                    Cabaran Tafsiran Lanjutan (Adaptif)
                  </div>
                  <p className="text-xs text-[#EFE6D5]">
                    Nyatakan satu cadangan tambahan anda sendiri untuk mengekalkan kebersihan taman sekolah selepas program gotong-royong tamat:
                  </p>
                  <input
                    type="text"
                    value={bonusChallengeAnswer}
                    onChange={(e) => setBonusChallengeAnswer(e.target.value)}
                    placeholder="Contoh: Melantik jadual giliran kelas menyiram pokok setiap minggu."
                    className="w-full rounded-lg border border-[#FAF6EE]/20 bg-[#111936] px-3 py-2 text-sm text-[#FAF6EE]"
                  />
                </div>
              )}

              {libraryResultMsg && (
                <div className="rounded-xl border border-[#E5C35A]/55 bg-[#202F60] p-4 text-sm text-[#FAF6EE]">
                  {libraryResultMsg}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  onClick={handleSubmitLibrary}
                  className="px-5 py-2.5 rounded-lg bg-[#E5C35A] text-[#121B38] font-semibold text-sm hover:bg-[#F0D378]"
                >
                  Semak Jawapan Manuskrip
                </button>
              </div>

              {(libraryTasksReady || progress.libraryCompleted) && (
                <div className="rounded-xl border border-[#7FA88C]/55 bg-[#162745] p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs sm:text-sm text-[#FAF6EE]">
                    <strong className="text-[#6EE7B7]">Tugasan Wajib Misi 1 Selesai:</strong>{' '}
                    Sahkan penyempurnaan misi ini sekarang.
                  </div>
                  <button
                    type="button"
                    disabled={finishingMission}
                    onClick={() => void finalizeMission(1, { libraryCompleted: true })}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#ECCD6C] to-[#D4AF37] text-[#101832] font-bold text-sm hover:brightness-105 transition-all disabled:opacity-50 whitespace-nowrap shrink-0"
                  >
                    Selesaikan Misi
                  </button>
                </div>
              )}
            </>
          )}

          {/* ---------------- WOODS TIMELINE PUZZLE ---------------- */}
          {modal === 'woods_altar' && (
            <>
              <div className="rounded-xl border border-[#7FA88C]/40 bg-[#1B2948] p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-[#EFE6D5]">
                  Baca setiap serpihan dan gunakan butang anak panah ke atas atau ke bawah untuk menyusun 5 peristiwa <strong>"Misi Menyelamatkan Taman Sekolah"</strong> mengikut urutan yang betul.
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowWoodsGuide((v) => !v)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#7FA88C]/50 bg-[#121A36] text-xs font-semibold text-[#7BE0E6] hover:bg-[#233256]"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{showWoodsGuide ? 'Tutup Panduan' : 'Panduan Misi 2'}</span>
                  </button>
                  <span className="font-mono-tabular text-xs text-[#7FA88C] font-semibold">
                    Serpihan Ditemui: {progress.collectedFragmentIds.length} / 5
                  </span>
                </div>
              </div>

              {showWoodsGuide && (
                <div className="rounded-xl border border-[#E5C35A]/45 bg-[#121B38] p-4 space-y-2 text-xs sm:text-sm text-[#EFE6D5] leading-relaxed">
                  <div className="font-display font-semibold text-[#E5C35A]">
                    Panduan Misi 2: Altar Kronologi Batu Purba
                  </div>
                  <p>
                    Wira, anda perlu menyusun semula serpihan hikayat yang telah bercampur-aduk mengikut urutan peristiwa yang betul.
                  </p>
                  <p>
                    Baca setiap serpihan cerita dengan teliti. Gunakan butang anak panah ke atas dan ke bawah untuk mengubah kedudukan setiap serpihan sehingga membentuk jalan cerita yang tersusun dari permulaan hingga pengakhiran, kemudian tekan butang &apos;Sahkan Garis Masa Cerita&apos;.
                  </p>
                </div>
              )}

              {progress.collectedFragmentIds.length < 5 && (
                <div className="rounded-xl border border-[#D4AF37]/35 bg-[#233256] p-4 text-xs text-[#EFE6D5] space-y-1">
                  <p className="font-semibold text-[#D4AF37]">
                    Masih ada serpihan yang perlu dikutip di dalam Rimba Cahaya Mahkota:
                  </p>
                  <p>
                    Berjalan di sekitar sungai, pepohon barat/timur dan utara hutan untuk mengutip orb serpihan yang bercahaya sebelum mengunci altar.
                  </p>
                </div>
              )}

              <div className="space-y-2.5">
                {orderedIds.map((fragId, idx) => {
                  const frag = STORY_FRAGMENTS.find((f) => f.id === fragId)!;
                  const collected = progress.collectedFragmentIds.includes(fragId);
                  return (
                    <div
                      key={fragId}
                      draggable
                      onDragStart={() => setDraggedIdx(idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (draggedIdx === null || draggedIdx === idx) return;
                        const copy = [...orderedIds];
                        const [moved] = copy.splice(draggedIdx, 1);
                        copy.splice(idx, 0, moved);
                        setOrderedIds(copy);
                        setDraggedIdx(null);
                      }}
                      className={`flex items-center justify-between gap-4 rounded-xl border p-4 cursor-move transition-colors ${
                        collected
                          ? 'border-[#7FA88C]/40 bg-[#1B2948]'
                          : 'border-[#FAF6EE]/10 bg-[#121A30]/70 opacity-65'
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-8 h-8 rounded-lg bg-[#233256] border border-[#D4AF37]/40 flex items-center justify-center font-mono-tabular text-sm font-bold text-[#D4AF37] shrink-0">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 text-xs text-[#8FBCE0]">
                            <span>{frag.title}</span>
                            {progress.woodsAttempts >= 1 && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-[#D4AF37]">{frag.stage}</span>
                              </>
                            )}
                            {!collected && <span className="text-amber-300">(Belum dikutip di hutan)</span>}
                          </div>
                          <p className="text-sm text-[#FAF6EE] mt-1">{frag.text}</p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveOrderItem(idx, -1)}
                          disabled={idx === 0}
                          className="p-1.5 rounded border border-[#FAF6EE]/20 hover:bg-[#FAF6EE]/10 disabled:opacity-30"
                          aria-label="Naikkan urutan"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveOrderItem(idx, 1)}
                          disabled={idx === orderedIds.length - 1}
                          className="p-1.5 rounded border border-[#FAF6EE]/20 hover:bg-[#FAF6EE]/10 disabled:opacity-30"
                          aria-label="Turunkan urutan"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {woodsFeedback && (
                <div className="rounded-xl border border-[#D4AF37]/45 bg-[#233256] p-4 text-sm text-[#FAF6EE]">
                  {woodsFeedback}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleVerifyTimeline}
                  className="px-5 py-2.5 rounded-lg bg-[#D4AF37] text-[#162038] font-semibold text-sm hover:bg-[#E2C258]"
                >
                  Sahkan Garis Masa Cerita
                </button>
              </div>

              {(woodsTasksReady || progress.woodsCompleted) &&
                progress.collectedFragmentIds.length >= 5 && (
                  <div className="rounded-xl border border-[#7FA88C]/55 bg-[#162745] p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs sm:text-sm text-[#FAF6EE]">
                      <strong className="text-[#6EE7B7]">Susunan Garis Masa Tepat:</strong>{' '}
                      {progress.woodsCompleted
                        ? 'Misi 2 telah direkodkan sebagai selesai.'
                        : 'Buka tetingkap kejayaan untuk mengesahkan penyelesaian Misi 2 atau teruskan ke Misi 3.'}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onMissionCompleteSuccess(2);
                      }}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#ECCD6C] to-[#D4AF37] text-[#101832] font-bold text-sm hover:brightness-105 transition-all whitespace-nowrap shrink-0"
                    >
                      Papar Kejayaan Misi 2
                    </button>
                  </div>
                )}
            </>
          )}

          {/* ---------------- ARCANE ATELIER: 6-STEP STORY ARCHITECT & AI LANGUAGE MENTOR ---------------- */}
          {modal === 'atelier_writer' && (
            <>
              {/* 6-Step Progress Bar */}
              <div className="rounded-xl border border-[#D4AF37]/35 bg-[#121B36] p-3 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-[#E5C35A]">
                    Penanda Kemajuan · {MISSION3_STEPS[mission3Step - 1].title}
                  </span>
                  <span className="font-mono-tabular text-[#8FBCE0]">
                    Langkah {mission3Step} / 6 ·{' '}
                    {
                      [
                        m3Checklist.planReady,
                        m3Checklist.plotReady,
                        m3Checklist.storyboardReady,
                        m3Checklist.scriptReady,
                        m3Checklist.reviewReady,
                      ].filter(Boolean).length
                    }
                    /5 Tugasan Lengkap
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
                  {MISSION3_STEPS.map((st) => {
                    const isActive = mission3Step === st.step;
                    const stepDone =
                      st.step === 1
                        ? m3Checklist.planReady
                        : st.step === 2
                          ? m3Checklist.plotReady
                          : st.step === 3
                            ? m3Checklist.storyboardReady
                            : st.step === 4
                              ? m3Checklist.scriptReady
                              : st.step === 5
                                ? m3Checklist.reviewReady
                                : isAtelierAllReady && progress.atelierCompleted;
                    return (
                      <button
                        key={st.step}
                        type="button"
                        onClick={() => setMission3Step(st.step)}
                        className={`flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-lg border text-[11px] font-semibold transition-all text-left ${
                          isActive
                            ? 'border-[#E5C35A] bg-[#243462] text-[#FAF6EE] shadow-md'
                            : stepDone
                              ? 'border-[#7FA88C]/55 bg-[#162C3D] text-[#A7F3D0] hover:bg-[#1C384E]'
                              : 'border-[#FAF6EE]/15 bg-[#172242] text-[#EFE6D5]/75 hover:border-[#C8B6E2]/45'
                        }`}
                      >
                        <span className="truncate">{st.shortLabel}</span>
                        {stepDone && <CheckCircle2 className="w-3.5 h-3.5 text-[#6EE7B7] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* LANGKAH 1: RANCANGAN CERITA */}
              {mission3Step === 1 && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-[#D4AF37]/30 bg-[#1B2948] p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="font-display text-base font-semibold text-[#E5C35A]">
                        Langkah 1: Rancangan Cerita
                      </h3>
                      <p className="text-xs text-[#EFE6D5]/90">
                        Tentukan asas karya agung kamu merangkumi tema, watak utama, watak sampingan serta latar tempat dan masa.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPlan(createBlankScriptPlan());
                          setAtelierSavedMsg('');
                          setReviewReportMsg('');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#FAF6EE]/20 bg-[#121A34] text-[11px] font-semibold text-[#EFE6D5] hover:bg-[#233256]"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Kosongkan &amp; Tulis Karya Baharu</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPlan(normalizeScriptPlan(DEFAULT_SCRIPT_PLAN));
                          setAtelierSavedMsg('');
                          setReviewReportMsg('');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D4AF37]/40 bg-[#162038] text-[11px] font-semibold text-[#E5C35A] hover:bg-[#233256]"
                      >
                        <BookOpen className="w-3 h-3" />
                        <span>Muat Contoh Taman Sekolah</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-[#FAF6EE]/15 bg-[#1B2948] p-4 space-y-2">
                      <label className="block text-xs font-semibold text-[#E5C35A]">
                        1. Tema Cerita
                      </label>
                      <p className="text-[11px] text-[#C8B6E2]">
                        Idea utama, persoalan pokok atau nilai murni yang ingin disampaikan dalam cerita kamu.
                      </p>
                      <div className="rounded bg-[#121A34] px-2.5 py-1.5 text-[11px] text-[#8FBCE0]">
                        <strong>Contoh:</strong> Kerjasama menjaga alam sekitar, keberanian, atau persahabatan sejati.
                      </div>
                      <input
                        type="text"
                        value={plan.theme}
                        onChange={(e) => setPlan({ ...plan, theme: e.target.value })}
                        placeholder="Nyatakan tema cerita kamu..."
                        className="w-full rounded-lg border border-[#FAF6EE]/20 bg-[#121A30] px-3 py-2 text-sm text-[#FAF6EE] focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>

                    <div className="rounded-xl border border-[#FAF6EE]/15 bg-[#1B2948] p-4 space-y-2">
                      <label className="block text-xs font-semibold text-[#E5C35A]">
                        2. Watak Utama
                      </label>
                      <p className="text-[11px] text-[#C8B6E2]">
                        Watak terpenting yang mengetuai pengembaraan dan menyelesaikan cabaran cerita.
                      </p>
                      <div className="rounded bg-[#121A34] px-2.5 py-1.5 text-[11px] text-[#8FBCE0]">
                        <strong>Contoh:</strong> Aiman (murid yang berani) dan Sofia (bijak serta teliti).
                      </div>
                      <input
                        type="text"
                        value={plan.characters}
                        onChange={(e) => setPlan({ ...plan, characters: e.target.value })}
                        placeholder="Senaraikan watak utama dan sifat ringkasnya..."
                        className="w-full rounded-lg border border-[#FAF6EE]/20 bg-[#121A30] px-3 py-2 text-sm text-[#FAF6EE] focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>

                    <div className="rounded-xl border border-[#FAF6EE]/15 bg-[#1B2948] p-4 space-y-2">
                      <label className="block text-xs font-semibold text-[#E5C35A]">
                        3. Watak Sampingan
                      </label>
                      <p className="text-[11px] text-[#C8B6E2]">
                        Watak pembimbing atau pembantu yang menyokong watak utama sepanjang cerita.
                      </p>
                      <div className="rounded bg-[#121A34] px-2.5 py-1.5 text-[11px] text-[#8FBCE0]">
                        <strong>Contoh:</strong> Cikgu Hana (guru pembimbing) dan Pak Mat (penjaga taman sekolah).
                      </div>
                      <input
                        type="text"
                        value={plan.supportingCharacters ?? ''}
                        onChange={(e) => setPlan({ ...plan, supportingCharacters: e.target.value })}
                        placeholder="Senaraikan watak sampingan..."
                        className="w-full rounded-lg border border-[#FAF6EE]/20 bg-[#121A30] px-3 py-2 text-sm text-[#FAF6EE] focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>

                    <div className="rounded-xl border border-[#FAF6EE]/15 bg-[#1B2948] p-4 space-y-2">
                      <label className="block text-xs font-semibold text-[#E5C35A]">
                        4. Latar Tempat dan Masa
                      </label>
                      <p className="text-[11px] text-[#C8B6E2]">
                        Lokasi berlakunya cerita serta waktu atau suasana ketika peristiwa terjadi.
                      </p>
                      <div className="rounded bg-[#121A34] px-2.5 py-1.5 text-[11px] text-[#8FBCE0]">
                        <strong>Contoh:</strong> Di taman sekolah pada waktu pagi yang cerah selepas waktu rehat.
                      </div>
                      <input
                        type="text"
                        value={plan.setting}
                        onChange={(e) => setPlan({ ...plan, setting: e.target.value })}
                        placeholder="Nyatakan tempat dan masa cerita..."
                        className="w-full rounded-lg border border-[#FAF6EE]/20 bg-[#121A30] px-3 py-2 text-sm text-[#FAF6EE] focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* LANGKAH 2: BINA JALAN CERITA (4 BAHAGIAN) */}
              {mission3Step === 2 && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-[#D4AF37]/30 bg-[#1B2948] p-4 space-y-1">
                    <h3 className="font-display text-base font-semibold text-[#E5C35A]">
                      Langkah 2: Bina Jalan Cerita (Empat Bahagian Utama)
                    </h3>
                    <p className="text-xs text-[#EFE6D5]/90">
                      Susun perjalanan cerita kamu mengikut empat bahagian yang teratur: Permulaan, Perkembangan, Konflik dan Pengakhiran.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-[#8FBCE0]/35 bg-[#1B2948] p-4 space-y-2">
                      <label className="block text-xs font-semibold text-[#8FBCE0]">
                        1. Permulaan
                      </label>
                      <p className="text-[11px] text-[#EFE6D5]/85">
                        Perkenalkan watak, tempat dan situasi awal cerita.
                      </p>
                      <div className="rounded bg-[#121A34] px-2.5 py-1.5 text-[11px] text-[#C8B6E2]">
                        <strong>Contoh:</strong> Pada suatu pagi, Aiman dan Sofia berjalan ke taman sekolah lalu terkejut melihat bunga layu serta menemui buku misteri di bawah bangku.
                      </div>
                      <textarea
                        rows={3}
                        value={plan.beginning}
                        onChange={(e) => setPlan({ ...plan, beginning: e.target.value })}
                        placeholder="Tulis situasi permulaan cerita kamu..."
                        className="w-full rounded-lg border border-[#FAF6EE]/20 bg-[#121A30] px-3 py-2 text-xs sm:text-sm text-[#FAF6EE] focus:outline-none focus:border-[#8FBCE0]"
                      />
                    </div>

                    <div className="rounded-xl border border-[#7FA88C]/40 bg-[#1B2948] p-4 space-y-2">
                      <label className="block text-xs font-semibold text-[#7FA88C]">
                        2. Perkembangan
                      </label>
                      <p className="text-[11px] text-[#EFE6D5]/85">
                        Ceritakan peristiwa yang mula berlaku dan tindakan awal watak.
                      </p>
                      <div className="rounded bg-[#121A34] px-2.5 py-1.5 text-[11px] text-[#C8B6E2]">
                        <strong>Contoh:</strong> Mereka membaca petunjuk di dalam buku misteri dan berbincang dengan Cikgu Hana untuk menyusun pelan gotong-royong.
                      </div>
                      <textarea
                        rows={3}
                        value={plan.development ?? plan.middle}
                        onChange={(e) =>
                          setPlan({ ...plan, development: e.target.value, middle: e.target.value })
                        }
                        placeholder="Tulis perkembangan peristiwa awal cerita..."
                        className="w-full rounded-lg border border-[#FAF6EE]/20 bg-[#121A30] px-3 py-2 text-xs sm:text-sm text-[#FAF6EE] focus:outline-none focus:border-[#7FA88C]"
                      />
                    </div>

                    <div className="rounded-xl border border-[#F59E0B]/40 bg-[#1B2948] p-4 space-y-2">
                      <label className="block text-xs font-semibold text-[#FBBF24]">
                        3. Konflik
                      </label>
                      <p className="text-[11px] text-[#EFE6D5]/85">
                        Terangkan masalah atau cabaran yang perlu dihadapi oleh watak.
                      </p>
                      <div className="rounded bg-[#121A34] px-2.5 py-1.5 text-[11px] text-[#C8B6E2]">
                        <strong>Contoh:</strong> Saliran air kolam tersumbat teruk manakala masa semakin suntuk sebelum hari penilaian kebersihan sekolah.
                      </div>
                      <textarea
                        rows={3}
                        value={plan.conflict ?? ''}
                        onChange={(e) => setPlan({ ...plan, conflict: e.target.value })}
                        placeholder="Tulis masalah atau cabaran utama yang dihadapi watak..."
                        className="w-full rounded-lg border border-[#FAF6EE]/20 bg-[#121A30] px-3 py-2 text-xs sm:text-sm text-[#FAF6EE] focus:outline-none focus:border-[#FBBF24]"
                      />
                    </div>

                    <div className="rounded-xl border border-[#D4AF37]/45 bg-[#1B2948] p-4 space-y-2">
                      <label className="block text-xs font-semibold text-[#D4AF37]">
                        4. Pengakhiran
                      </label>
                      <p className="text-[11px] text-[#EFE6D5]/85">
                        Ceritakan cara masalah diselesaikan dan kesudahan cerita.
                      </p>
                      <div className="rounded bg-[#121A34] px-2.5 py-1.5 text-[11px] text-[#C8B6E2]">
                        <strong>Contoh:</strong> Dengan kerjasama seluruh warga sekolah, saliran berjaya dibersihkan, taman kembali indah dan semua berasa bangga.
                      </div>
                      <textarea
                        rows={3}
                        value={plan.ending}
                        onChange={(e) => setPlan({ ...plan, ending: e.target.value })}
                        placeholder="Tulis cara masalah diselesaikan dan kesudahan cerita..."
                        className="w-full rounded-lg border border-[#FAF6EE]/20 bg-[#121A30] px-3 py-2 text-xs sm:text-sm text-[#FAF6EE] focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* LANGKAH 3: PAPAN CERITA EMPAT BABAK */}
              {mission3Step === 3 && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-[#7BE0E6]/35 bg-[#1B2948] p-4 space-y-1.5">
                    <h3 className="font-display text-base font-semibold text-[#E5C35A]">
                      Langkah 3: Papan Cerita Empat Babak
                    </h3>
                    <p className="text-xs text-[#EFE6D5]/95">
                      Papan cerita ialah <strong>gambaran perjalanan visual dan babak cerita mengikut urutan</strong> — bukannya sekadar menyalin semula teks jalan cerita yang sama. Susun setiap babak dengan tajuk, peristiwa, dialog watak dan gambaran visualnya.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {plan.storyboard.map((sb, idx) => {
                      const guide = BABAK_GUIDES[idx];
                      return (
                        <div
                          key={sb.id}
                          className="rounded-xl border border-[#D4AF37]/30 bg-[#1B2948] p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-[#FAF6EE]/10 pb-2">
                            <span className="text-xs font-bold text-[#E5C35A]">{guide.label}</span>
                            <span className="text-[11px] font-semibold text-[#7BE0E6]">
                              {guide.stage}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[11px] font-semibold text-[#C8B6E2]">
                              Tajuk Babak
                            </label>
                            <input
                              type="text"
                              value={sb.title}
                              onChange={(e) => {
                                const next = [...plan.storyboard];
                                next[idx] = { ...sb, title: e.target.value };
                                setPlan({ ...plan, storyboard: next });
                              }}
                              placeholder={guide.exampleTitle}
                              className="w-full rounded-lg border border-[#FAF6EE]/15 bg-[#121A30] px-2.5 py-1.5 text-xs font-semibold text-[#FAF6EE]"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[11px] font-semibold text-[#8FBCE0]">
                              Penerangan Peristiwa Babak
                            </label>
                            <textarea
                              rows={2}
                              value={sb.eventDescription ?? ''}
                              onChange={(e) => {
                                const next = [...plan.storyboard];
                                next[idx] = { ...sb, eventDescription: e.target.value };
                                setPlan({ ...plan, storyboard: next });
                              }}
                              placeholder={guide.exampleEvent}
                              className="w-full rounded-lg border border-[#FAF6EE]/15 bg-[#121A30] px-2.5 py-1.5 text-xs text-[#EFE6D5]"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[11px] font-semibold text-[#7FA88C]">
                              Dialog Watak (Jika Bersesuaian)
                            </label>
                            <input
                              type="text"
                              value={sb.characterDialogue ?? ''}
                              onChange={(e) => {
                                const next = [...plan.storyboard];
                                next[idx] = { ...sb, characterDialogue: e.target.value };
                                setPlan({ ...plan, storyboard: next });
                              }}
                              placeholder={guide.exampleDialogue}
                              className="w-full rounded-lg border border-[#FAF6EE]/15 bg-[#121A30] px-2.5 py-1.5 text-xs text-[#FAF6EE]"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[11px] font-semibold text-[#D4AF37]">
                              Gambaran Visual / Cadangan Ilustrasi
                            </label>
                            <textarea
                              rows={2}
                              value={sb.visualDescription}
                              onChange={(e) => {
                                const next = [...plan.storyboard];
                                next[idx] = { ...sb, visualDescription: e.target.value };
                                setPlan({ ...plan, storyboard: next });
                              }}
                              placeholder={guide.exampleVisual}
                              className="w-full rounded-lg border border-[#FAF6EE]/15 bg-[#121A30] px-2.5 py-1.5 text-xs text-[#EFE6D5]"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[11px] font-semibold text-[#C8B6E2]/85">
                              Panduan Intonasi (Untuk Misi 4 &amp; 5)
                            </label>
                            <input
                              type="text"
                              value={sb.narrationCue}
                              onChange={(e) => {
                                const next = [...plan.storyboard];
                                next[idx] = { ...sb, narrationCue: e.target.value };
                                setPlan({ ...plan, storyboard: next });
                              }}
                              placeholder="Contoh: Nada ingin tahu pada permulaan, kemudian bersemangat."
                              className="w-full rounded-lg border border-[#FAF6EE]/15 bg-[#121A30] px-2.5 py-1 text-[11px] text-[#8FBCE0]"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* LANGKAH 4: SKRIP PENCERITAAN DIGITAL */}
              {mission3Step === 4 && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-[#D4AF37]/30 bg-[#1B2948] p-4 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-display text-base font-semibold text-[#E5C35A]">
                          Langkah 4: Skrip Penceritaan Digital
                        </h3>
                        <p className="text-xs text-[#EFE6D5]/90 mt-0.5">
                          Tulis skrip penceritaan penuh berdasarkan empat babak papan cerita kamu. Skrip ini akan menjadi teks bacaan dalam Misi 4.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const draft = generateInitialScriptDraft(syncedPlan);
                          setPlan({ ...plan, fullScript: draft });
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#7BE0E6]/50 bg-[#121E3A] text-xs font-semibold text-[#7BE0E6] hover:bg-[#1C2E56]"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Jana Draf Awal daripada Langkah 1–3</span>
                      </button>
                    </div>

                    <div className="rounded-lg border border-[#FAF6EE]/10 bg-[#121A34] p-3 text-xs text-[#EFE6D5]/90 space-y-1">
                      <div className="font-semibold text-[#E5C35A]">Ciri-ciri Skrip Yang Baik:</div>
                      <ul className="list-disc pl-5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5">
                        <li>Penceritaan tersusun dengan pembukaan dan penutup menarik.</li>
                        <li>Mengandungi dialog watak yang sesuai dan hidup.</li>
                        <li>Menggunakan Bahasa Melayu Malaysia yang gramatis.</li>
                        <li>Mempunyai kesinambungan jelas antara Babak 1 hingga Babak 4.</li>
                      </ul>
                    </div>
                  </div>

                  {/* Quick 4-Scene Reference */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {plan.storyboard.map((sb, idx) => (
                      <div
                        key={sb.id}
                        className="rounded-lg border border-[#FAF6EE]/10 bg-[#141E38] p-2.5 text-[11px] space-y-1"
                      >
                        <div className="font-semibold text-[#7BE0E6]">
                          Babak {idx + 1}: {sb.title || '(Belum bertajuk)'}
                        </div>
                        <p className="text-[#EFE6D5]/80 line-clamp-2">
                          {sb.eventDescription || sb.visualDescription || 'Tiada penerangan peristiwa lagi.'}
                        </p>
                        {sb.characterDialogue && (
                          <p className="text-[#7FA88C] italic line-clamp-2">{sb.characterDialogue}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-semibold text-[#FAF6EE]">
                        Ruangan Penulisan &amp; Suntingan Skrip Penuh (Boleh Diedit Bebas)
                      </label>
                      <span className="font-mono-tabular text-[#8FBCE0]">
                        {scriptWordCount} perkataan · {plan.fullScript.trim().length} aksara
                      </span>
                    </div>
                    <textarea
                      rows={8}
                      value={plan.fullScript}
                      onChange={(e) => setPlan({ ...plan, fullScript: e.target.value })}
                      placeholder="Tulis skrip penceritaan digital anda di sini atau tekan 'Jana Draf Awal daripada Langkah 1–3' untuk memulakan draf yang boleh anda ubah suai..."
                      className="w-full rounded-xl border border-[#FAF6EE]/20 bg-[#121A30] p-4 text-sm leading-relaxed text-[#FAF6EE] focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>
              )}

              {/* LANGKAH 5: SEMAKAN MENTOR AI BAHASA MELAYU */}
              {mission3Step === 5 && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-[#C8B6E2]/35 bg-[#1B2948] p-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-display text-base font-semibold text-[#E5C35A]">
                          Langkah 5: Semakan Mentor AI Bahasa Melayu
                        </h3>
                        <p className="text-xs text-[#EFE6D5]/90 mt-0.5">
                          Mentor AI berperanan sebagai pembimbing penulisan untuk membantu kamu sendiri memurnikan karya — bukan mengambil alih tugasan kamu.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAnalyzeLanguage}
                        disabled={aiLangLoading}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4AF37] text-[#162038] text-xs font-bold hover:bg-[#E2C258] disabled:opacity-50"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>
                          {aiLangLoading ? 'Menyemak Skrip...' : 'Semak Bersama Mentor Bahasa AI'}
                        </span>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px] text-[#C8B6E2]">
                      <div className="rounded bg-[#121A34] px-2.5 py-1.5">
                        ✓ Menyemak ejaan &amp; tanda baca baku
                      </div>
                      <div className="rounded bg-[#121A34] px-2.5 py-1.5">
                        ✓ Memperbaiki tatabahasa &amp; struktur ayat
                      </div>
                      <div className="rounded bg-[#121A34] px-2.5 py-1.5">
                        ✓ Cadangan skrip murni &amp; kosa kata
                      </div>
                    </div>
                  </div>

                  {/* Live Script Refinement Box right alongside Mentor Feedback */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#FAF6EE]">
                      Kemas Kini Skrip Anda Berdasarkan Cadangan Mentor:
                    </label>
                    <textarea
                      rows={5}
                      value={plan.fullScript}
                      onChange={(e) => setPlan({ ...plan, fullScript: e.target.value })}
                      className="w-full rounded-xl border border-[#FAF6EE]/20 bg-[#121A30] p-3.5 text-sm leading-relaxed text-[#FAF6EE] focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  {aiLangError && (
                    <div className="rounded-xl border border-amber-400/40 bg-amber-950/40 p-3.5 text-xs text-amber-200 space-y-2">
                      <p className="font-semibold text-amber-100">Makluman Mentor Bahasa AI</p>
                      <p>{aiLangError}</p>
                    </div>
                  )}

                  {langFeedback && (
                    <div className="rounded-xl border border-[#C8B6E2]/35 bg-[#1B2948] p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold text-[#D4AF37]">
                          Laporan Mentor Bahasa AI Diraja
                        </h4>
                        <span className="text-xs text-[#6EE7B7] font-semibold">
                          Semakan Konstruktif Selesai
                        </span>
                      </div>
                      <p className="text-sm text-[#FAF6EE]">{langFeedback.summary}</p>
                      {langFeedback.strengths.length > 0 && (
                        <div className="text-xs text-[#7FA88C] space-y-1">
                          <p className="font-semibold">Kekuatan Penulisan Anda:</p>
                          <ul className="list-disc pl-5 space-y-0.5">
                            {langFeedback.strengths.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {langFeedback.issues.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-[#8FBCE0]">
                            Cadangan Pembaikan (Ejaan, Tatabahasa, Tanda Baca &amp; Struktur Ayat):
                          </p>
                          {langFeedback.issues.map((iss, i) => (
                            <div
                              key={i}
                              className="rounded-lg bg-[#162038] border border-[#FAF6EE]/10 p-3 text-xs space-y-1"
                            >
                              <div className="font-semibold text-[#D4AF37]">{iss.category}</div>
                              <div className="text-[#EFE6D5]/80">Petikan: &quot;{iss.excerpt}&quot;</div>
                              <div className="text-[#FAF6EE]">{iss.explanation}</div>
                              <div className="text-[#7FA88C]">Cadangan: {iss.suggestion}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {langFeedback.improvedScript && (
                        <div className="rounded-lg border border-[#7BE0E6]/35 bg-[#121D3A] p-3.5 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-[#7BE0E6]">
                              Cadangan Versi Skrip Dimurnikan (Bahasa Melayu Malaysia Baku)
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setPlan({ ...plan, fullScript: langFeedback.improvedScript || plan.fullScript });
                              }}
                              className="px-3 py-1 rounded-lg bg-[#7BE0E6] text-[#101832] text-[11px] font-bold hover:brightness-105"
                            >
                              Guna Cadangan Skrip Ini
                            </button>
                          </div>
                          <p className="text-xs text-[#FAF6EE]/90 whitespace-pre-line leading-relaxed">
                            {langFeedback.improvedScript}
                          </p>
                        </div>
                      )}
                      <div className="text-xs text-[#C8B6E2] pt-2 border-t border-[#FAF6EE]/10">
                        <strong>Bimbingan Adaptif:</strong> {langFeedback.adaptiveAdvice}
                      </div>
                    </div>
                  )}

                  {/* Self-review confirmation checkbox (auto-ticked when AI feedback runs, or manual when offline) */}
                  <label className="flex items-start gap-2.5 rounded-xl border border-[#FAF6EE]/15 bg-[#15203E] p-3.5 text-xs text-[#EFE6D5] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={m3Checklist.reviewReady}
                      onChange={(e) => setSelfReviewConfirmed(e.target.checked)}
                      className="mt-0.5 accent-[#D4AF37]"
                    />
                    <span>
                      Saya mengesahkan semakan penulisan (ejaan, tatabahasa, dialog dan kesinambungan cerita) telah dilakukan sebelum ke langkah akhir.
                    </span>
                  </label>
                </div>
              )}

              {/* LANGKAH 6: SEMAK DAN SIMPAN KARYA */}
              {mission3Step === 6 && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-[#D4AF37]/35 bg-[#1B2948] p-4 space-y-1">
                    <h3 className="font-display text-base font-semibold text-[#E5C35A]">
                      Langkah 6: Semak dan Simpan Karya
                    </h3>
                    <p className="text-xs text-[#EFE6D5]/90">
                      Pastikan kelima-lima perkara dalam senarai semak di bawah telah dipenuhi sebelum menyimpan karya dan menamatkan Misi 3.
                    </p>
                  </div>

                  {/* 5-Item Required Checklist */}
                  <div className="rounded-xl border border-[#FAF6EE]/15 bg-[#15203E] p-4 space-y-2.5">
                    <div className="text-xs font-semibold text-[#E5C35A]">
                      Senarai Semak Hasil Karya Misi 3
                    </div>
                    {[
                      {
                        ok: m3Checklist.planReady,
                        label: 'Rancangan cerita telah lengkap (tema, watak utama, watak sampingan, latar).',
                        targetStep: 1 as const,
                      },
                      {
                        ok: m3Checklist.plotReady,
                        label: 'Jalan cerita mempunyai empat bahagian (permulaan, perkembangan, konflik, pengakhiran).',
                        targetStep: 2 as const,
                      },
                      {
                        ok: m3Checklist.storyboardReady,
                        label: 'Papan cerita mempunyai empat babak yang lengkap.',
                        targetStep: 3 as const,
                      },
                      {
                        ok: m3Checklist.scriptReady,
                        label: 'Skrip penceritaan digital telah lengkap dan tersusun.',
                        targetStep: 4 as const,
                      },
                      {
                        ok: m3Checklist.reviewReady,
                        label: 'Semakan penulisan (Mentor AI / semakan kendiri) telah dilakukan.',
                        targetStep: 5 as const,
                      },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs ${
                          item.ok
                            ? 'border-[#6EE7B7]/40 bg-[#142F3B] text-[#D1FAE5]'
                            : 'border-amber-400/35 bg-[#2A223B] text-amber-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2
                            className={`w-4 h-4 shrink-0 ${item.ok ? 'text-[#6EE7B7]' : 'text-amber-300/60'}`}
                          />
                          <span>{item.label}</span>
                        </div>
                        {!item.ok && (
                          <button
                            type="button"
                            onClick={() => setMission3Step(item.targetStep)}
                            className="px-2.5 py-1 rounded bg-[#D4AF37] text-[#162038] text-[11px] font-bold hover:bg-[#E2C258]"
                          >
                            Lengkapkan Langkah {item.targetStep}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Summary Card of Student Work */}
                  <div className="rounded-xl border border-[#FAF6EE]/15 bg-[#1B2948] p-4 space-y-2 text-xs">
                    <div className="flex items-center gap-2 font-semibold text-[#7BE0E6]">
                      <FileText className="w-4 h-4" />
                      <span>Pratonton Ringkasan Karya Untuk Misi 4</span>
                    </div>
                    <div>
                      <strong className="text-[#C8B6E2]">Tema:</strong> {syncedPlan.theme || '—'}
                    </div>
                    <div>
                      <strong className="text-[#C8B6E2]">Watak Utama &amp; Sampingan:</strong>{' '}
                      {syncedPlan.characters || '—'}
                      {syncedPlan.supportingCharacters ? ` · ${syncedPlan.supportingCharacters}` : ''}
                    </div>
                    <div>
                      <strong className="text-[#C8B6E2]">Skrip Penceritaan ({scriptWordCount} perkataan):</strong>
                      <p className="mt-1 rounded bg-[#121A30] p-2.5 text-[#FAF6EE]/90 leading-relaxed max-h-28 overflow-y-auto">
                        {syncedPlan.fullScript || '(Belum ditulis)'}
                      </p>
                    </div>
                  </div>

                  {reviewReportMsg && (
                    <div
                      className={`rounded-xl border p-3.5 text-xs sm:text-sm ${
                        isAtelierAllReady
                          ? 'border-[#6EE7B7]/55 bg-[#142F3B] text-[#D1FAE5]'
                          : 'border-amber-400/45 bg-amber-950/40 text-amber-200'
                      }`}
                    >
                      {reviewReportMsg}
                    </div>
                  )}

                  {atelierSavedError && (
                    <div className="rounded-xl border border-red-400/45 bg-red-950/40 p-3.5 text-xs sm:text-sm text-red-200">
                      {atelierSavedError}
                    </div>
                  )}

                  {atelierSavedMsg && (
                    <div className="rounded-xl border border-[#7FA88C]/55 bg-[#1B2948] p-3.5 text-xs sm:text-sm text-[#FAF6EE]">
                      {atelierSavedMsg}
                    </div>
                  )}

                  {finishErrorMsg && (
                    <div className="rounded-xl border border-red-400/45 bg-red-950/40 p-3.5 text-xs sm:text-sm text-red-200">
                      {finishErrorMsg}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleCheckAtelierWork}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#7BE0E6]/50 bg-[#142244] text-[#7BE0E6] font-semibold text-xs sm:text-sm hover:bg-[#1E3262]"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>SEMAK HASIL KARYA</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveAtelierPlan}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#E5C35A]/60 bg-[#233256] text-[#E5C35A] font-semibold text-xs sm:text-sm hover:bg-[#2F4372]"
                    >
                      <Save className="w-4 h-4" />
                      <span>SIMPAN KARYA</span>
                    </button>
                    <button
                      type="button"
                      disabled={finishingMission || !isAtelierAllReady}
                      onClick={() => void handleCompleteMission3()}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#ECCD6C] to-[#D4AF37] text-[#101832] font-bold text-xs sm:text-sm hover:brightness-105 transition-all disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
                    >
                      {finishingMission ? 'Menyimpan...' : 'Selesai Misi'}
                    </button>
                  </div>
                </div>
              )}

              {/* Step Navigation Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-[#FAF6EE]/10">
                <button
                  type="button"
                  disabled={mission3Step === 1}
                  onClick={() => setMission3Step((s) => Math.max(1, s - 1) as 1 | 2 | 3 | 4 | 5 | 6)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#FAF6EE]/20 bg-[#141E38] text-xs font-semibold text-[#FAF6EE] hover:bg-[#1E2D52] disabled:opacity-35"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Langkah Sebelumnya</span>
                </button>
                {mission3Step < 6 && (
                  <button
                    type="button"
                    onClick={() => setMission3Step((s) => Math.min(6, s + 1) as 1 | 2 | 3 | 4 | 5 | 6)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#D4AF37] text-[#162038] text-xs font-bold hover:bg-[#E2C258]"
                  >
                    <span>Langkah Seterusnya</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </>
          )}

          {/* ---------------- ROYAL VOICE CHAMBER (MISSION 4) ---------------- */}
          {modal === 'atelier_voice' && (
            <>
              <div className="rounded-xl border border-[#D4AF37]/30 bg-[#1B2948] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-[#D4AF37]">
                      Skrip Bacaan Anda (Hasil Karya Misi 3 di Balai Cipta Mahkota)
                    </span>
                    <p className="text-[11px] text-[#C8B6E2]">
                      Gunakan skrip dan papan cerita yang telah anda bina untuk rakaman suara anda di sini.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowM4StoryboardRef((v) => !v)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#7BE0E6]/45 bg-[#121A30] text-xs font-semibold text-[#7BE0E6] hover:bg-[#1E2E52]"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>
                        {showM4StoryboardRef
                          ? 'Tutup Rancangan & Papan Cerita'
                          : 'Lihat Papan Cerita Misi 3'}
                      </span>
                    </button>
                    <div className="flex items-center gap-1 p-1 rounded-lg bg-[#121A30]">
                      <button
                        type="button"
                        onClick={() => setActiveAttemptNum(1)}
                        className={`px-3 py-1 rounded text-xs font-semibold ${
                          activeAttemptNum === 1 ? 'bg-[#D4AF37] text-[#162038]' : 'text-[#FAF6EE]/75'
                        }`}
                      >
                        Cubaan 1
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveAttemptNum(2)}
                        className={`px-3 py-1 rounded text-xs font-semibold ${
                          activeAttemptNum === 2 ? 'bg-[#D4AF37] text-[#162038]' : 'text-[#FAF6EE]/75'
                        }`}
                      >
                        Cubaan 2 (Penambahbaikan)
                      </button>
                    </div>
                  </div>
                </div>

                {showM4StoryboardRef && (
                  <div className="rounded-lg border border-[#7BE0E6]/30 bg-[#121A30] p-3.5 space-y-2.5 text-xs">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[#EFE6D5]">
                      <span>
                        <strong className="text-[#E5C35A]">Tema:</strong> {progress.scriptPlan.theme}
                      </span>
                      <span>
                        <strong className="text-[#E5C35A]">Watak:</strong> {progress.scriptPlan.characters}
                        {progress.scriptPlan.supportingCharacters
                          ? `, ${progress.scriptPlan.supportingCharacters}`
                          : ''}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {progress.scriptPlan.storyboard.map((sb, idx) => (
                        <div
                          key={sb.id}
                          className="rounded border border-[#FAF6EE]/10 bg-[#182444] p-2.5 space-y-1"
                        >
                          <div className="font-semibold text-[#7BE0E6]">
                            Babak {idx + 1}: {sb.title}
                          </div>
                          {sb.eventDescription && (
                            <p className="text-[#EFE6D5]/90">{sb.eventDescription}</p>
                          )}
                          {sb.characterDialogue && (
                            <p className="text-[#7FA88C] italic">{sb.characterDialogue}</p>
                          )}
                          {sb.narrationCue && (
                            <p className="text-[11px] text-[#C8B6E2]">
                              Panduan intonasi: {sb.narrationCue}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-sm leading-relaxed whitespace-pre-line text-[#EFE6D5] bg-[#162038] rounded-lg p-3.5 border border-[#FAF6EE]/10 max-h-56 overflow-y-auto">
                  {progress.scriptPlan.fullScript || syncedPlan.fullScript}
                </p>
              </div>

              {/* Microphone Recording Controls + Live Audio Visualisation */}
              <div className="rounded-xl border border-[#C8B6E2]/35 bg-[#1B2948] p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-sm font-semibold text-[#FAF6EE]">
                        Kawalan Rakaman Suara — Cubaan ke-{activeAttemptNum}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-[11px] font-semibold ${
                          recordingStatus === 'recording'
                            ? 'border-[#E5C35A] bg-[#2C1B4E] text-[#E5C35A]'
                            : recordingStatus === 'saved'
                              ? 'border-[#6EE7B7]/60 bg-[#12333E] text-[#6EE7B7]'
                              : recordingStatus === 'recorded'
                                ? 'border-[#7BE0E6]/50 bg-[#132544] text-[#7BE0E6]'
                                : 'border-[#C8B6E2]/30 bg-[#131A34] text-[#C8B6E2]'
                        }`}
                      >
                        <Mic className="w-3 h-3" />
                        <span>
                          {recordingStatus === 'recording'
                            ? 'Sedang Merakam'
                            : recordingStatus === 'saving'
                              ? 'Menyimpan Rakaman...'
                              : recordingStatus === 'saved'
                                ? 'Rakaman Berjaya Disimpan · Berjaya Dihantar'
                                : recordingStatus === 'recorded'
                                  ? 'Rakaman Selesai'
                                  : 'Sedia Merakam'}
                        </span>
                      </span>
                    </div>
                    <p className="text-xs text-[#C8B6E2] mt-1">
                      Rakaman anda disimpan secara kekal di pelayan dan hanya boleh diakses oleh anda serta pensyarah anda di Portal Guru.
                    </p>
                  </div>
                  <div className="font-mono-tabular text-lg font-semibold text-[#D4AF37]">
                    {String(Math.floor(recordSeconds / 60)).padStart(2, '0')}:
                    {String(recordSeconds % 60).padStart(2, '0')}
                  </div>
                </div>

                {/* Live Studio Acoustic Spectrum & Waveform Display */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-[#C8B6E2]">
                    <span>Spektrum &amp; Gelombang Suara Langsung Balai Gema Diraja</span>
                    <span className="font-mono-tabular text-[#8FBCE0]">
                      {isRecording ? 'Input Mikrofon Aktif' : 'Mod Siap Sedia'}
                    </span>
                  </div>
                  <canvas
                    ref={waveCanvasRef}
                    width={720}
                    height={96}
                    className="w-full h-24 rounded-lg border border-[#C8B6E2]/25 bg-[#0D132B]"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={() => void startRecording()}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#D4AF37] text-[#162038] text-xs font-bold hover:bg-[#E2C258]"
                    >
                      <Mic className="w-4 h-4" />
                      <span>{recordedBlob ? 'Rakam Semula' : 'Mula Rakaman'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-500"
                    >
                      <Square className="w-4 h-4" />
                      <span>Hentikan Rakaman</span>
                    </button>
                  )}

                  {localPreviewUrl && !isRecording && (
                    <>
                      <button
                        type="button"
                        onClick={handleTogglePreviewPlayback}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#7BE0E6]/50 bg-[#121E3D] text-[#7BE0E6] text-xs font-semibold hover:bg-[#1B2C58]"
                      >
                        {isPreviewPlaying ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                        <span>{isPreviewPlaying ? 'Hentikan Pratonton' : 'Dengar Semula'}</span>
                      </button>

                      <audio
                        ref={previewAudioRef}
                        controls
                        src={localPreviewUrl}
                        onPlay={() => setIsPreviewPlaying(true)}
                        onPause={() => setIsPreviewPlaying(false)}
                        onEnded={() => setIsPreviewPlaying(false)}
                        className="h-9 max-w-xs"
                      />

                      <button
                        type="button"
                        onClick={() => void handleSaveVoiceRecording()}
                        disabled={savingVoice}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#7FA88C] text-[#101832] text-xs font-bold hover:bg-[#94BD9F] disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        <span>
                          {savingVoice
                            ? 'Menyimpan Rakaman...'
                            : replacingMediaId
                              ? 'Simpan & Gantikan Rakaman'
                              : 'Simpan Rakaman'}
                        </span>
                      </button>
                    </>
                  )}
                </div>

                {voiceErrorMsg && (
                  <div className="rounded-lg border border-amber-400/40 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
                    {voiceErrorMsg}
                  </div>
                )}
                {voiceStatusMsg && (
                  <div className="rounded-lg border border-[#6EE7B7]/50 bg-[#12333E] px-3 py-2.5 text-xs text-[#D1FAE5]">
                    {voiceStatusMsg}
                  </div>
                )}
              </div>

              {/* Saved Persistent Recordings Section */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[#D4AF37]">
                    Rakaman Suara Tersimpan Anda ({progress.voiceAttempts.length})
                  </h3>
                  <span className="text-[11px] text-[#C8B6E2]">
                    Kekal tersimpan walaupun keluar permainan atau bertukar peranti
                  </span>
                </div>

                {progress.voiceAttempts.length === 0 ? (
                  <div className="rounded-xl border border-[#FAF6EE]/10 bg-[#15203E] p-4 text-xs text-[#EFE6D5]/75">
                    Belum ada rakaman suara yang disimpan. Tekan <strong>Mula Rakaman</strong>, dengar semula hasil rakaman anda, dan tekan <strong>Simpan Rakaman</strong> untuk menyimpannya ke dalam sistem.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {progress.voiceAttempts.map((attempt) => (
                      <div
                        key={attempt.mediaId}
                        className="rounded-xl border border-[#FAF6EE]/15 bg-[#1B2948] p-4 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div>
                            <span className="font-semibold text-[#D4AF37]">
                              Misi 4 · Cubaan ke-{attempt.attemptNumber}
                            </span>
                            <div className="text-[11px] text-[#C8B6E2]">
                              {new Date(attempt.recordedAt).toLocaleString('ms-MY', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="rounded border border-[#6EE7B7]/45 bg-[#12333E] px-2 py-0.5 text-[11px] font-semibold text-[#6EE7B7]">
                              {attempt.submissionStatus || 'Berjaya Dihantar'}
                            </span>
                            <span className="font-mono-tabular text-[#8FBCE0]">
                              {attempt.durationSeconds}s
                            </span>
                          </div>
                        </div>

                        <AuthenticatedAudioPlayer
                          mediaId={attempt.mediaId}
                          token={token}
                          downloadFilename={`misi4-cubaan-${attempt.attemptNumber}.webm`}
                          showDownloadButton
                        />

                        <div className="text-xs text-[#EFE6D5]/90 bg-[#162038] rounded p-2.5 border border-[#FAF6EE]/10">
                          <span className="font-semibold text-[#C8B6E2]">Status &amp; Catatan: </span>
                          {attempt.transcript}
                        </div>

                        {attempt.analysis && (
                          <div className="text-xs space-y-1.5 text-[#FAF6EE]/90 border-t border-[#FAF6EE]/10 pt-2">
                            <div>
                              <strong>Tahap Kejelasan:</strong> {attempt.analysis.clarityLevel} ({attempt.analysis.estimatedWpm} PPM)
                            </div>
                            <div><strong>Sebutan:</strong> {attempt.analysis.pronunciation}</div>
                            <div><strong>Intonasi &amp; Ekspresi:</strong> {attempt.analysis.intonation}</div>
                            <div><strong>Kelancaran &amp; Kadar:</strong> {attempt.analysis.pacing}</div>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#FAF6EE]/10">
                          <button
                            type="button"
                            onClick={() => void handleAnalyzeSavedAttempt(attempt)}
                            disabled={analyzingAttemptNum === attempt.attemptNumber}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#7BE0E6]/45 bg-[#121E3D] text-[11px] font-semibold text-[#7BE0E6] hover:bg-[#1B2C58] disabled:opacity-50"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>
                              {analyzingAttemptNum === attempt.attemptNumber
                                ? 'Menganalisis AI...'
                                : 'Semak Sebutan AI (Pilihan)'}
                            </span>
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleStartReplaceRecording(attempt)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E5C35A]/45 bg-[#162038] text-[11px] font-semibold text-[#E5C35A] hover:bg-[#233256]"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Gantikan Rakaman</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteSavedRecording(attempt)}
                              disabled={deletingMediaId === attempt.mediaId}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-400/40 bg-red-950/35 text-[11px] font-semibold text-red-200 hover:bg-red-900/45 disabled:opacity-50"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>
                                {deletingMediaId === attempt.mediaId
                                  ? 'Memadam...'
                                  : 'Padam Rakaman'}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {finishErrorMsg && (
                <div className="rounded-xl border border-red-400/45 bg-red-950/40 p-3.5 text-xs sm:text-sm text-red-200">
                  {finishErrorMsg}
                </div>
              )}

              <div
                className={`rounded-xl border p-4 flex flex-wrap items-center justify-between gap-3 ${
                  progress.voiceAttempts.length >= 1 || progress.voiceCompleted
                    ? 'border-[#7FA88C]/55 bg-[#162745]'
                    : 'border-amber-400/35 bg-[#23203E]'
                }`}
              >
                <div className="text-xs sm:text-sm text-[#FAF6EE]">
                  {progress.voiceAttempts.length >= 1 || progress.voiceCompleted ? (
                    <>
                      <strong className="text-[#6EE7B7]">Tugasan Misi 4 Sedia:</strong>{' '}
                      Rakaman suara anda ({progress.voiceAttempts.length} rakaman) telah berjaya disimpan dan dihantar. Tekan &quot;Selesai Misi&quot; untuk melengkapkan Misi 4.
                    </>
                  ) : (
                    <>
                      <strong className="text-amber-200">Tindakan Diperlukan:</strong>{' '}
                      Sila rakam suara penceritaan anda dan tekan &quot;Simpan Rakaman&quot; sebelum menamatkan Misi 4.
                    </>
                  )}
                </div>
                <button
                  type="button"
                  disabled={
                    finishingMission ||
                    (progress.voiceAttempts.length === 0 && !progress.voiceCompleted)
                  }
                  onClick={() => void finalizeMission(4, { voiceCompleted: true })}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#ECCD6C] to-[#D4AF37] text-[#101832] font-bold text-sm hover:brightness-105 transition-all disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
                >
                  {finishingMission ? 'Menyimpan...' : 'Selesai Misi'}
                </button>
              </div>
            </>
          )}

          {/* ---------------- GRAND ROYAL THEATRE (MISSION 5) ---------------- */}
          {modal === 'theatre_stage' && (
            <>
              <div className="rounded-xl border border-[#D4AF37]/35 bg-[#1B2948] p-4 text-sm text-[#EFE6D5]">
                Muat naik video penceritaan digital akhir (2–3 minit) bagi projek{' '}
                <strong className="text-[#D4AF37]">&quot;Misi Menyelamatkan Taman Sekolah&quot;</strong> atau tayangkan mod persembahan papan cerita bersepadu di atas pentas Balairung Gemilang Diraja.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-[#FAF6EE]/15 bg-[#1B2948] p-4 space-y-3">
                  <label className="block text-xs font-semibold text-[#C8B6E2]">
                    Tajuk Persembahan Akhir
                  </label>
                  <input
                    type="text"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    className="w-full rounded-lg border border-[#FAF6EE]/20 bg-[#162038] px-3 py-2 text-sm text-[#FAF6EE]"
                  />

                  <label className="block text-xs font-semibold text-[#D4AF37] pt-2">
                    Muat Naik Video (MP4 / WebM, maks 32MB)
                  </label>
                  <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-[#D4AF37]/55 bg-[#162038] hover:bg-[#233256] cursor-pointer text-xs font-semibold">
                    <Upload className="w-4 h-4 text-[#D4AF37]" />
                    <span>{uploadingVideo ? 'Sedang Memuat Naik...' : 'Pilih Fail Video Penceritaan'}</span>
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      className="hidden"
                      disabled={uploadingVideo}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handleUploadVideoFile(f);
                      }}
                    />
                  </label>
                </div>

                <div className="rounded-xl border border-[#FAF6EE]/15 bg-[#1B2948] p-4 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#8FBCE0] mb-1">
                      <Film className="w-4 h-4" />
                      <span>Mod Persembahan Pentas Berpandu</span>
                    </div>
                    <p className="text-xs text-[#EFE6D5]/80 leading-relaxed">
                      Jika anda belum mengeksport fail video akhir, anda boleh menayangkan persembahan papan cerita berserta skrip dan rakaman suara anda terus di pentas teater.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleUseStoryboardPresentation}
                    className="w-full py-2.5 px-4 rounded-lg bg-[#233256] border border-[#D4AF37]/50 text-xs font-semibold text-[#D4AF37] hover:bg-[#2E416E]"
                  >
                    Lancarkan Mod Persembahan Teater
                  </button>
                </div>
              </div>

              {/* Theatre Stage Presentation Screen */}
              {(progress.finalVideoMediaId || presentationMode) && (
                <div className="rounded-2xl border-2 border-[#D4AF37]/60 bg-[#0F1629] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-base text-[#D4AF37]">
                      Tayangan Pentas Diraja · {progress.finalVideoTitle || videoTitle}
                    </span>
                    <span className="text-xs text-[#7FA88C] flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Status: Diserahkan</span>
                    </span>
                  </div>

                  {progress.finalVideoMediaId ? (
                    <AuthenticatedVideoPlayer
                      mediaId={progress.finalVideoMediaId}
                      token={token}
                      className="w-full max-h-80 rounded-xl bg-black"
                    />
                  ) : (
                    <div className="rounded-xl border border-[#C8B6E2]/25 bg-[#1B2948] p-6 space-y-4">
                      <div className="text-xs font-semibold text-[#C8B6E2]">
                        {progress.scriptPlan.storyboard[sampleSlideIdx]?.stage} · Babak {sampleSlideIdx + 1} /{' '}
                        {progress.scriptPlan.storyboard.length}
                      </div>
                      <h4 className="font-display text-xl text-[#D4AF37]">
                        {progress.scriptPlan.storyboard[sampleSlideIdx]?.title}
                      </h4>
                      <p className="text-sm text-[#FAF6EE]">
                        {progress.scriptPlan.storyboard[sampleSlideIdx]?.visualDescription}
                      </p>
                      <p className="text-xs text-[#8FBCE0]">
                        Panduan Penyampaian: {progress.scriptPlan.storyboard[sampleSlideIdx]?.narrationCue}
                      </p>
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setSampleSlideIdx((i) => Math.max(0, i - 1))
                            }
                            className="px-3 py-1.5 rounded bg-[#162038] text-xs border border-[#FAF6EE]/20"
                          >
                            Babak Sebelumnya
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setSampleSlideIdx((i) =>
                                Math.min(progress.scriptPlan.storyboard.length - 1, i + 1),
                              )
                            }
                            className="px-3 py-1.5 rounded bg-[#162038] text-xs border border-[#FAF6EE]/20"
                          >
                            Babak Seterusnya
                          </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="flex items-center gap-2 text-xs text-[#C8B6E2]">
                            <Volume2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.05}
                              value={effectiveAudio.narrationVolume}
                              onChange={(e) => updateNarrationVolume(Number(e.target.value))}
                              className="w-20 accent-[#D4AF37]"
                              aria-label="Kelantangan audio persembahan"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              if (isNarrating) {
                                soundEngine.stopNarration();
                              } else {
                                void soundEngine.speakMalay(progress.scriptPlan.fullScript, {
                                  voiceRole: 'narrator',
                                  styleHint: 'story',
                                });
                              }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#D4AF37] text-[#162038] text-xs font-semibold hover:bg-[#E2C258]"
                          >
                            {isNarrating ? (
                              <>
                                <VolumeX className="w-3.5 h-3.5" />
                                <span>Hentikan Audio</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5" />
                                <span>Dengar Audio</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {progress.teacherFeedback && (
                <div className="rounded-xl border border-[#7FA88C]/50 bg-[#1B2948] p-4 space-y-1">
                  <div className="text-xs font-semibold text-[#7FA88C]">
                    Maklum Balas Guru ({progress.teacherFeedback.reviewedBy} · {progress.teacherFeedback.ratingLabel})
                  </div>
                  <p className="text-sm text-[#FAF6EE]">{progress.teacherFeedback.comment}</p>
                </div>
              )}

              {theatreErr && (
                <div className="rounded-lg border border-red-400/40 bg-red-950/40 px-3 py-2 text-xs text-red-200">
                  {theatreErr}
                </div>
              )}
              {theatreMsg && (
                <div className="rounded-lg border border-[#D4AF37]/45 bg-[#233256] px-4 py-3 text-sm text-[#FAF6EE] flex flex-wrap items-center justify-between gap-3">
                  <span>{theatreMsg}</span>
                  {progress.festivalUnlocked && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onShowFestivalFinale();
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4AF37] text-[#162038] text-xs font-bold"
                    >
                      <Award className="w-4 h-4" />
                      <span>Saksikan Festival Cahaya Diraja</span>
                    </button>
                  )}
                </div>
              )}

              {(Boolean(progress.finalVideoMediaId || progress.finalVideoType || presentationMode) ||
                progress.theatreCompleted) && (
                <div className="rounded-xl border border-[#7FA88C]/55 bg-[#162745] p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs sm:text-sm text-[#FAF6EE]">
                    <strong className="text-[#6EE7B7]">Tugasan Wajib Misi 5 Selesai:</strong>{' '}
                    Persembahan penceritaan digital akhir telah disediakan di Balairung Gemilang Diraja.
                  </div>
                  <button
                    type="button"
                    disabled={finishingMission}
                    onClick={() => void finalizeMission(5, { theatreCompleted: true })}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#ECCD6C] to-[#D4AF37] text-[#101832] font-bold text-sm hover:brightness-105 transition-all disabled:opacity-50 whitespace-nowrap shrink-0"
                  >
                    Selesaikan Misi
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
