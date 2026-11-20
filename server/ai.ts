import 'dotenv/config';
import { GoogleGenAI, Type } from '@google/genai';
import {
  normalizeMalayForSpeech,
  STYLE_HINT_MODIFIERS,
  VOICE_PROFILES,
  type VoiceRole,
  type VoiceStyleHint,
} from '../src/audio/voiceProfiles.ts';
import type { LanguageFeedback, SpeechFeedback } from '../src/types/game.ts';

const TTS_CACHE_LIMIT = 160;
const ttsCache = new Map<string, string>();

export class GeminiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiConfigError';
  }
}

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new GeminiConfigError(
      'Kunci API Gemini (GEMINI_API_KEY) belum dikonfigurasikan pada pelayan. Sila tetapkan kunci API dalam panel Settings > Secrets untuk mengaktifkan Mentor Bahasa AI.',
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function extractJsonText(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }
  return trimmed;
}

function formatGeminiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof GeminiConfigError) {
    return err.message;
  }
  const msg = err instanceof Error ? err.message : String(err || '');
  if (/403|PERMISSION_DENIED|400|API_KEY_INVALID|API key not valid/i.test(msg)) {
    return 'Kunci API Gemini tidak sah atau tiada kebenaran akses. Sila semak GEMINI_API_KEY dalam Settings > Secrets.';
  }
  if (/429|RESOURCE_EXHAUSTED|quota/i.test(msg)) {
    return 'Had penggunaan API Gemini telah dicapai buat sementara waktu. Sila cuba sebentar lagi.';
  }
  if (/404|NOT_FOUND/i.test(msg)) {
    return 'Model AI yang diminta tidak tersedia pada konfigurasi semasa. Sila semak konfigurasi pelayan.';
  }
  return msg || fallback;
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err || '');
      const isNonRetryable =
        err instanceof GeminiConfigError ||
        /400|401|403|404|API_KEY_INVALID|PERMISSION_DENIED/i.test(msg);
      if (isNonRetryable || attempt === retries) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 600 * Math.pow(2, attempt)));
    }
  }
  throw lastErr;
}

export async function analyzeMalayScript(params: {
  scriptText: string;
  theme: string;
  characters: string;
  setting: string;
}): Promise<LanguageFeedback> {
  const ai = getAiClient();

  const prompt = `Anda ialah "Mentor Bahasa AI Diraja" yang membimbing murid sekolah rendah di Malaysia menghasilkan skrip penceritaan digital dalam Bahasa Melayu Malaysia baku sepenuhnya.

Peranan anda adalah sebagai PEMBIMBING PENULISAN yang teliti dan mesra murid. Berikan pembetulan dan penerangan ringkas supaya murid memahami kesalahan mereka dan dapat memurnikan skrip penceritaan mereka sendiri.

Gunakan tatabahasa, ejaan dan kosa kata standard Dewan Bahasa dan Pustaka (DBP). Elakkan penggunaan bahasa Indonesia, slanga bahasa Inggeris atau bahasa rojak.

Maklumat rancangan murid:
- Tema: ${params.theme}
- Watak: ${params.characters}
- Latar: ${params.setting}

Skrip murid:
"""
${params.scriptText}
"""

Analisis skrip tersebut dengan teliti merangkumi lima aspek berikut:
1. Kesalahan ejaan perkataan Bahasa Melayu Malaysia baku.
2. Kesalahan tatabahasa (imbuhan, kata sendi nama, kata ganti nama, kata hubung dan hukum D-M).
3. Kesalahan tanda baca (noktah, koma, tanda soal, tanda seru dan tanda petik dialog).
4. Struktur ayat supaya jelas, gramatis dan mudah difahami.
5. Kosa kata menarik serta kesinambungan jalan cerita dari permulaan hingga pengakhiran.

Sediakan juga satu cadangan versi skrip yang telah dimurnikan dalam medan "improvedScript" agar murid dapat membandingkan ayat yang lebih baik.`;

  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'Anda ialah guru pembimbing Bahasa Melayu Malaysia yang profesional, teliti, mesra murid sekolah rendah, dan sentiasa menggunakan Bahasa Melayu Malaysia baku mengikut piawaian Dewan Bahasa dan Pustaka (DBP).',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              strengths: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              issues: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: {
                      type: Type.STRING,
                      enum: [
                        'Ejaan',
                        'Tatabahasa',
                        'Tanda Baca',
                        'Struktur Ayat',
                        'Kosa Kata',
                        'Kejelasan',
                        'Susunan Cerita',
                      ],
                    },
                    excerpt: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                    suggestion: { type: Type.STRING },
                  },
                  required: ['category', 'excerpt', 'explanation', 'suggestion'],
                },
              },
              improvedScript: { type: Type.STRING },
              adaptiveAdvice: { type: Type.STRING },
            },
            required: ['summary', 'strengths', 'issues', 'improvedScript', 'adaptiveAdvice'],
          },
        },
      }),
    );

    const rawText = extractJsonText(response.text ?? '{}');
    const parsed = JSON.parse(rawText) as Omit<LanguageFeedback, 'analyzedAt'>;
    return {
      summary: parsed.summary || 'Skrip telah disemak oleh Mentor Bahasa AI.',
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      improvedScript: parsed.improvedScript?.trim() || undefined,
      adaptiveAdvice:
        parsed.adaptiveAdvice || 'Teruskan menyusun ayat agar aliran cerita lebih lancar.',
      analyzedAt: new Date().toISOString(),
    };
  } catch (err) {
    if (err instanceof GeminiConfigError) throw err;
    throw new Error(formatGeminiErrorMessage(err, 'Gagal menghubungi Mentor Bahasa AI.'));
  }
}

export async function transcribeAndAnalyzeSpeech(params: {
  audioBase64: string;
  mimeType: string;
  durationSeconds: number;
  referenceScript: string;
  attemptNumber: 1 | 2;
}): Promise<SpeechFeedback> {
  const ai = getAiClient();

  try {
    // Step 1: Real audio transcription using gemini-3.5-transcribe
    const audioPart = {
      inlineData: {
        mimeType: params.mimeType || 'audio/webm',
        data: params.audioBase64,
      },
    };

    const transcribeRes = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            audioPart,
            {
              text: 'Transkripsikan rakaman suara Bahasa Melayu Malaysia ini dengan tepat termasuk tanda baca asas.',
            },
          ],
        },
      }),
    );

    const transcript = (transcribeRes.text ?? '').trim() || '(Tiada pertuturan jelas dikesan)';
    const wordCount = transcript.split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(params.durationSeconds / 60, 0.08);
    const estimatedWpm = Math.round(wordCount / minutes);

    // Step 2: Evaluate alignment, pacing, fluency, and provide honest intonation/expression guidance
    const evalPrompt = `Anda ialah "Penganalisis Pertuturan AI Diraja" untuk murid sekolah rendah di Malaysia.
Cubaan ke-${params.attemptNumber}.
Tempoh rakaman: ${params.durationSeconds.toFixed(1)} saat.
Kadar pertuturan anggaran (perkataan per minit): ${estimatedWpm} PPM.

Skrip rujukan murid:
"""
${params.referenceScript}
"""

Transkripsi sebenar daripada audio rakaman:
"""
${transcript}
"""

Berikan maklum balas yang jujur, mesra murid dan membina menggunakan Bahasa Melayu Malaysia baku sepenuhnya (elakkan bahasa Indonesia, bahasa pasar atau bahasa rojak).
PENTING: Transkripsi teks dan kadar kelajuan (PPM) diukur daripada audio sebenar, manakala penilaian intonasi dan ekspresi vokal daripada transkripsi adalah bimbingan anggaran untuk latihan murid (nyatakan perkara ini secara telus dalam analysisNotice).`;

    const evalRes = await withRetry(() =>
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: evalPrompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              pronunciation: { type: Type.STRING },
              intonation: { type: Type.STRING },
              pacing: { type: Type.STRING },
              fluency: { type: Type.STRING },
              expression: { type: Type.STRING },
              clarity: { type: Type.STRING },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              nextSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
              clarityLevel: {
                type: Type.STRING,
                enum: ['Perlu Latihan', 'Memuaskan', 'Baik', 'Cemerlang'],
              },
            },
            required: [
              'pronunciation',
              'intonation',
              'pacing',
              'fluency',
              'expression',
              'clarity',
              'strengths',
              'nextSteps',
              'clarityLevel',
            ],
          },
        },
      }),
    );

    const parsed = JSON.parse(extractJsonText(evalRes.text ?? '{}')) as Omit<
      SpeechFeedback,
      'transcript' | 'analysisNotice' | 'estimatedWpm'
    >;

    return {
      transcript,
      analysisNotice:
        'Transkripsi perkataan dan kadar kelajuan (PPM) dijana daripada audio sebenar menggunakan sistem transkripsi; cadangan intonasi dan ekspresi vokal pula ialah panduan anggaran berasaskan teks dan tempoh rakaman untuk disahkan oleh guru.',
      estimatedWpm,
      pronunciation: parsed.pronunciation,
      intonation: parsed.intonation,
      pacing: parsed.pacing,
      fluency: parsed.fluency,
      expression: parsed.expression,
      clarity: parsed.clarity,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [],
      clarityLevel: parsed.clarityLevel || 'Baik',
    };
  } catch (err) {
    if (err instanceof GeminiConfigError) throw err;
    throw new Error(formatGeminiErrorMessage(err, 'Gagal menganalisis rakaman suara.'));
  }
}

export async function generateMalayNarrationAudio(
  text: string,
  options?: { voiceRole?: VoiceRole; styleHint?: VoiceStyleHint },
): Promise<string> {
  const ai = getAiClient();

  const role: VoiceRole =
    options?.voiceRole && options.voiceRole in VOICE_PROFILES ? options.voiceRole : 'narrator';
  const styleHint: VoiceStyleHint =
    options?.styleHint && options.styleHint in STYLE_HINT_MODIFIERS ? options.styleHint : 'story';

  const normalizedText = normalizeMalayForSpeech(text);
  if (!normalizedText) {
    throw new Error('Teks suara tidak boleh kosong.');
  }

  const cacheKey = `${role}:${styleHint}:${normalizedText}`;
  const cached = ttsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const profile = VOICE_PROFILES[role];
  const combinedStyle = `${profile.baseStyle} ${STYLE_HINT_MODIFIERS[styleHint]}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: normalizedText,
              speechMetadata: {
                style: combinedStyle,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: profile.geminiVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error('Tiada data audio diterima daripada perkhidmatan suara AI.');
    }

    if (ttsCache.size >= TTS_CACHE_LIMIT) {
      const oldestKey = ttsCache.keys().next().value;
      if (oldestKey) ttsCache.delete(oldestKey);
    }
    ttsCache.set(cacheKey, base64Audio);

    return base64Audio;
  } catch (err) {
    if (err instanceof GeminiConfigError) throw err;
    throw new Error(formatGeminiErrorMessage(err, 'Penjanaan suara AI tidak tersedia.'));
  }
}
