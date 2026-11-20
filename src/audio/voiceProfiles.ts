export type VoiceRole =
  | 'narrator'
  | 'guardian'
  | 'librarian'
  | 'forestKeeper'
  | 'atelierMaster'
  | 'theatreDirector'
  | 'guide'
  | 'hero_ayden'
  | 'hero_elena'
  | 'hero_ryan'
  | 'hero_eva';

export type VoiceStyleHint =
  | 'story'
  | 'dialogue'
  | 'instruction'
  | 'praise'
  | 'encourage'
  | 'tutorial';

export type GeminiPrebuiltVoice = 'Charon' | 'Fenrir' | 'Kore' | 'Zephyr' | 'Puck';

export interface VoiceProfileConfig {
  role: VoiceRole;
  displayName: string;
  gender: 'male' | 'female';
  geminiVoice: GeminiPrebuiltVoice;
  fallbackPitch: number;
  fallbackRate: number;
  baseStyle: string;
}

const STANDARD_MY_DIRECTIVE =
  'Speak ONLY in standard Malaysian Malay (Bahasa Melayu Malaysia baku, clear Kuala Lumpur and RTM broadcast pronunciation). Strictly avoid Indonesian accent, Indonesian words, English slang, or robotic monotone. Use natural human warmth, expressive emphasis, and gentle pauses at punctuation.';

export const VOICE_PROFILES: Record<VoiceRole, VoiceProfileConfig> = {
  narrator: {
    role: 'narrator',
    displayName: 'Pencerita Diraja',
    gender: 'male',
    geminiVoice: 'Charon',
    fallbackPitch: 0.96,
    fallbackRate: 0.92,
    baseStyle: `${STANDARD_MY_DIRECTIVE} Persona: An engaging, calm, authoritative, warm royal Malaysian storyteller captivating primary school children with vivid yet soothing pacing.`,
  },
  guardian: {
    role: 'guardian',
    displayName: 'Penjaga Diraja Ariff',
    gender: 'male',
    geminiVoice: 'Fenrir',
    fallbackPitch: 0.9,
    fallbackRate: 0.94,
    baseStyle: `${STANDARD_MY_DIRECTIVE} Persona: A noble, firm, courageous yet welcoming male royal palace guardian encouraging young heroes.`,
  },
  librarian: {
    role: 'librarian',
    displayName: 'Pustakawan Seri',
    gender: 'female',
    geminiVoice: 'Kore',
    fallbackPitch: 1.05,
    fallbackRate: 0.94,
    baseStyle: `${STANDARD_MY_DIRECTIVE} Persona: A gentle, scholarly, articulate, warm female royal librarian speaking clearly and patiently to pupils.`,
  },
  forestKeeper: {
    role: 'forestKeeper',
    displayName: 'Penunggu Rimba Laila',
    gender: 'female',
    geminiVoice: 'Zephyr',
    fallbackPitch: 1.07,
    fallbackRate: 0.92,
    baseStyle: `${STANDARD_MY_DIRECTIVE} Persona: A serene, lyrical, caring female guardian of the enchanted forest speaking with gentle wonder and poise.`,
  },
  atelierMaster: {
    role: 'atelierMaster',
    displayName: 'Tukang Kata Arif',
    gender: 'male',
    geminiVoice: 'Puck',
    fallbackPitch: 0.98,
    fallbackRate: 0.96,
    baseStyle: `${STANDARD_MY_DIRECTIVE} Persona: An enthusiastic, creative, encouraging male master storyteller and voice coach inspiring children to write and speak boldly.`,
  },
  theatreDirector: {
    role: 'theatreDirector',
    displayName: 'Pengarah Pentas Puan Salma',
    gender: 'female',
    geminiVoice: 'Kore',
    fallbackPitch: 1.03,
    fallbackRate: 0.95,
    baseStyle: `${STANDARD_MY_DIRECTIVE} Persona: A poised, proud, warm female royal theatre director welcoming young performers onto the grand stage.`,
  },
  guide: {
    role: 'guide',
    displayName: 'Pembimbing Diraja',
    gender: 'female',
    geminiVoice: 'Zephyr',
    fallbackPitch: 1.04,
    fallbackRate: 0.94,
    baseStyle: `${STANDARD_MY_DIRECTIVE} Persona: A friendly, reassuring, expressive Malaysian primary school educator guiding pupils clearly step by step.`,
  },
  hero_ayden: {
    role: 'hero_ayden',
    displayName: 'Ayden',
    gender: 'male',
    geminiVoice: 'Fenrir',
    fallbackPitch: 0.96,
    fallbackRate: 0.96,
    baseStyle: `${STANDARD_MY_DIRECTIVE} Persona: A brave, curious, upbeat young male royal explorer ready for adventure.`,
  },
  hero_elena: {
    role: 'hero_elena',
    displayName: 'Elena',
    gender: 'female',
    geminiVoice: 'Kore',
    fallbackPitch: 1.08,
    fallbackRate: 0.95,
    baseStyle: `${STANDARD_MY_DIRECTIVE} Persona: A thoughtful, wise, articulate young female royal scholar.`,
  },
  hero_ryan: {
    role: 'hero_ryan',
    displayName: 'Ryan',
    gender: 'male',
    geminiVoice: 'Puck',
    fallbackPitch: 1.0,
    fallbackRate: 0.97,
    baseStyle: `${STANDARD_MY_DIRECTIVE} Persona: A clever, creative, inventive young male royal builder and problem solver.`,
  },
  hero_eva: {
    role: 'hero_eva',
    displayName: 'Eva',
    gender: 'female',
    geminiVoice: 'Zephyr',
    fallbackPitch: 1.12,
    fallbackRate: 0.96,
    baseStyle: `${STANDARD_MY_DIRECTIVE} Persona: A confident, expressive, cheerful young female royal storyteller.`,
  },
};

export const STYLE_HINT_MODIFIERS: Record<VoiceStyleHint, string> = {
  story:
    'Emotional tone: rich storytelling cadence, vivid warmth, natural breathing pauses between sentences.',
  dialogue:
    'Emotional tone: conversational, genuine human character acting, warm eye-contact feel.',
  instruction:
    'Emotional tone: clear, calm, well-paced classroom guidance so every instruction is easy for primary pupils to follow.',
  praise:
    'Emotional tone: bright, joyful, genuinely proud and encouraging celebration.',
  encourage:
    'Emotional tone: gentle, supportive, reassuring and motivating without sounding harsh.',
  tutorial:
    'Emotional tone: welcoming, clear, slightly measured pace for step-by-step orientation.',
};

export const PUBLIC_VOICE_GUIDES = {
  landing_welcome:
    'Selamat datang ke Kingdom of Stories! Pilih portal Pelajar, Guru atau Pentadbir pada skrin ini, kemudian log masuk untuk memulakan pengembaraan penceritaan digital dalam Bahasa Melayu Malaysia.',
  game_tutorial:
    'Panduan ringkas permainan. Gunakan kekunci W, A, S, dan D untuk bergerak, tekan kekunci Shift untuk berlari, tekan Space untuk melompat, seret tetikus untuk memusingkan kamera, dan tekan kekunci E apabila menghampiri watak atau portal bagi memulakan interaksi. Kelima-lima misi kini terbuka dan boleh diterokai pada bila-bila masa.',
} as const;

export type PublicVoiceGuideId = keyof typeof PUBLIC_VOICE_GUIDES;

export const HERO_VOICE_GREETINGS: Record<'ayden' | 'elena' | 'ryan' | 'eva', string> = {
  ayden: 'Saya Ayden, Penjelajah Diraja! Mari kita jejak setiap petunjuk dan pulihkan kisah kerajaan bersama-sama.',
  elena: 'Saya Elena, Sarjana Diraja. Dengan penelitian yang cermat, pasti kita dapat merungkai setiap rahsia hikayat.',
  ryan: 'Saya Ryan, Pereka Diraja! Tiada teka-teki garis masa yang terlalu sukar apabila kita berfikir secara kreatif.',
  eva: 'Saya Eva, Pencerita Diraja! Mari sampaikan kisah kita dengan suara yang jelas, penuh perasaan dan keyakinan.',
};

/**
 * Normalizes written Malaysian UI / story strings into clean, natural spoken Bahasa Melayu Malaysia
 * so both Gemini TTS and browser SpeechSynthesis pronounce symbols, numbers, and abbreviations cleanly.
 */
export function normalizeMalayForSpeech(rawText: string): string {
  let text = rawText.trim();
  if (!text) return '';

  text = text
    // Decorative separators to natural pauses
    .replace(/\s*·\s*/g, ', ')
    .replace(/\s*—\s*/g, ', ')
    .replace(/\s*->\s*/g, ' ke ')
    .replace(/\s*&\s*/g, ' dan ')
    // Fractions like 4/6, 5/5 -> "4 daripada 6"
    .replace(/\b(\d+)\s*\/\s*(\d+)\b/g, '$1 daripada $2')
    // Number ranges like 2–3 or 1-5
    .replace(/\b(\d+)\s*[–-]\s*(\d+)\b/g, '$1 hingga $2')
    // Common abbreviations & game terms into natural Malaysian Malay speech
    .replace(/\bPPM\b/g, 'perkataan per minit')
    .replace(/\b3D\b/gi, 'tiga dimensi')
    .replace(/\bNPC\b/gi, 'watak pembantu')
    .replace(/\bSFX\b/gi, 'kesan bunyi')
    .replace(/\bWASD\b/g, 'W, A, S, dan D')
    .replace(/\bShift\b/g, 'kekunci Shift')
    .replace(/\bSpace\b/g, 'kekunci Space')
    .replace(/\bAI\b/g, 'A I')
    .replace(/\bMP4\b/gi, 'M P 4')
    .replace(/\bWebM\b/gi, 'Web M')
    // Tidy whitespace and quotes
    .replace(/[“”"]/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/,\s*,+/g, ',')
    .trim();

  return text;
}
