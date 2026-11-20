import React, { useEffect, useState } from 'react';
import { Pause, Play, RotateCcw, SkipForward, Volume2 } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { OPENING_NARRATION_PARAGRAPHS } from '../data/gameContent';

interface OpeningCinematicProps {
  onComplete: () => void;
}

const SCENE_TITLES = [
  'Kerajaan Ribuan Kisah',
  'Malam Festival Cahaya Diraja',
  'Jam Menara Terhenti & Buku Membisu',
  'Seruan Untuk Empat Wira Muda',
  'Membongkar Rahsia Sebelum Lenyap',
  'Kingdom of Stories',
];

export const OpeningCinematic: React.FC<OpeningCinematicProps> = ({ onComplete }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const currentText = OPENING_NARRATION_PARAGRAPHS[stepIndex];
  const currentSceneTitle = SCENE_TITLES[stepIndex] || SCENE_TITLES[0];

  useEffect(() => {
    soundEngine.startMusic();
    if (isPaused) {
      soundEngine.stopNarration();
      return;
    }

    let cancelled = false;
    void soundEngine.speakMalay(currentText, {
      voiceRole: 'narrator',
      styleHint: 'story',
      onEnd: () => {
        if (cancelled) return;
        window.setTimeout(() => {
          if (cancelled) return;
          if (stepIndex < OPENING_NARRATION_PARAGRAPHS.length - 1) {
            setStepIndex((s) => s + 1);
          } else {
            onComplete();
          }
        }, 700);
      },
    });

    return () => {
      cancelled = true;
      soundEngine.stopNarration();
    };
  }, [stepIndex, isPaused, currentText, onComplete]);

  const handleSkip = () => {
    soundEngine.stopNarration();
    onComplete();
  };

  const handleReplay = () => {
    soundEngine.stopNarration();
    setIsPaused(false);
    setStepIndex(0);
  };

  // Visual state based on story beat
  const isFading = stepIndex === 2 || stepIndex === 3;
  const isSummoning = stepIndex >= 3;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-[#11192E] text-[#FAF6EE] select-none overflow-hidden">
      {/* Animated Fantasy Sky & Royal Silhouette */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 transition-opacity duration-1000"
          style={{
            background: isFading
              ? 'radial-gradient(circle at 50% 35%, rgba(110, 108, 138, 0.25), rgba(17, 25, 46, 0.98) 72%)'
              : 'radial-gradient(circle at 50% 35%, rgba(212, 175, 55, 0.26), rgba(35, 50, 86, 0.92) 55%, rgba(17, 25, 46, 1) 100%)',
          }}
        />
        {/* Royal Castle & Clock Silhouette SVG */}
        <svg
          viewBox="0 0 1200 520"
          className="absolute bottom-0 left-0 w-full h-[65vh] opacity-85"
          preserveAspectRatio="xMidYMax slice"
        >
          {/* Floating Magical Particles */}
          {[140, 260, 410, 560, 720, 880, 1040].map((cx, i) => (
            <circle
              key={cx}
              cx={cx}
              cy={120 + ((i * 53) % 180)}
              r={isSummoning ? 4.5 : 3}
              fill={isFading ? '#C8B6E2' : '#D4AF37'}
              opacity={0.75}
            />
          ))}
          {/* Citadel Towers */}
          <path
            d="M0,520 L0,410 L180,410 L180,320 L230,250 L280,320 L280,380 L430,380 L430,270 L495,210 L560,270 L560,155 L600,85 L640,155 L640,270 L705,210 L770,270 L770,380 L920,380 L920,320 L970,250 L1020,320 L1020,410 L1200,410 L1200,520 Z"
            fill="#1B2948"
            stroke="#D4AF37"
            strokeOpacity="0.35"
            strokeWidth="2"
          />
          {/* Clock Dial */}
          <circle
            cx="600"
            cy="215"
            r="34"
            fill={isFading ? '#475069' : '#FAF6EE'}
            stroke="#D4AF37"
            strokeWidth="4"
          />
          <line x1="600" y1="215" x2="600" y2="190" stroke="#162038" strokeWidth="3.5" strokeLinecap="round" />
          <line
            x1="600"
            y1="215"
            x2={isFading ? '600' : '618'}
            y2={isFading ? '194' : '215'}
            stroke="#D4AF37"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Four Hero Silhouettes Summoned */}
          {isSummoning &&
            [490, 560, 640, 710].map((hx, idx) => (
              <g key={hx} transform={`translate(${hx}, 395)`}>
                <circle cx="0" cy="-22" r="10" fill={['#7FA88C', '#C8B6E2', '#8FBCE0', '#FAF6EE'][idx]} />
                <path d="M-12,18 L0,-10 L12,18 Z" fill={['#7FA88C', '#C8B6E2', '#8FBCE0', '#FAF6EE'][idx]} />
              </g>
            ))}
        </svg>
      </div>

      {/* Top Cinematic Header */}
      <div className="relative z-10 flex items-center justify-between px-6 py-5 border-b border-[#D4AF37]/20">
        <div>
          <p className="text-xs tracking-wider text-[#D4AF37]">Prolog Pengembaraan · {stepIndex + 1} / {OPENING_NARRATION_PARAGRAPHS.length}</p>
          <h2 className="font-display text-lg sm:text-xl text-[#FAF6EE] mt-0.5">{currentSceneTitle}</h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused((p) => !p)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-[#D4AF37]/35 bg-[#1B2948] hover:bg-[#233256] transition-colors whitespace-nowrap"
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-[#D4AF37]" /> : <Pause className="w-3.5 h-3.5 text-[#D4AF37]" />}
            <span>{isPaused ? 'Sambung' : 'Jeda'}</span>
          </button>
          <button
            onClick={handleReplay}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-[#D4AF37]/35 bg-[#1B2948] hover:bg-[#233256] transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Ulang</span>
          </button>
          <button
            onClick={handleSkip}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-[#D4AF37] text-[#162038] hover:bg-[#E2C258] transition-colors whitespace-nowrap"
          >
            <span>Langkau Sinematik</span>
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Subtitle & Narrative Box at Bottom */}
      <div className="relative z-10 max-w-4xl mx-auto w-full px-6 pb-10">
        <div className="rounded-xl border border-[#D4AF37]/40 bg-[#162038]/95 p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-3 text-xs text-[#C8B6E2]">
            <span className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-[#D4AF37]" />
              <span>Suara Pencerita Diraja (Bahasa Melayu Malaysia)</span>
            </span>
            <div className="flex items-center gap-1.5">
              {OPENING_NARRATION_PARAGRAPHS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setIsPaused(false);
                    setStepIndex(idx);
                  }}
                  aria-label={`Babak ${idx + 1}`}
                  className={`h-2 rounded-sm transition-all ${
                    idx === stepIndex ? 'w-7 bg-[#D4AF37]' : 'w-2.5 bg-[#FAF6EE]/25 hover:bg-[#FAF6EE]/45'
                  }`}
                />
              ))}
            </div>
          </div>

          <p className="text-base sm:text-xl leading-relaxed text-[#FAF6EE] font-medium">{currentText}</p>

          <div className="mt-5 flex items-center justify-between pt-4 border-t border-[#FAF6EE]/10">
            <button
              onClick={() => setStepIndex((s) => Math.max(0, s - 1))}
              disabled={stepIndex === 0}
              className="px-3.5 py-1.5 text-xs rounded-md border border-[#FAF6EE]/20 text-[#FAF6EE]/80 disabled:opacity-35 hover:bg-[#FAF6EE]/10"
            >
              Sebelumnya
            </button>
            <button
              onClick={() => {
                if (stepIndex < OPENING_NARRATION_PARAGRAPHS.length - 1) {
                  setStepIndex((s) => s + 1);
                } else {
                  handleSkip();
                }
              }}
              className="px-4 py-1.5 text-xs font-semibold rounded-md bg-[#233256] border border-[#D4AF37]/45 text-[#FAF6EE] hover:bg-[#2E416E]"
            >
              {stepIndex < OPENING_NARRATION_PARAGRAPHS.length - 1 ? 'Babak Seterusnya' : 'Masuk ke Kota Diraja'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
