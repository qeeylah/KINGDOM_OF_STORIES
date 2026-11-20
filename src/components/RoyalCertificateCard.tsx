import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Check, Download, Sparkles } from 'lucide-react';
import { HEROES } from '../data/gameContent';
import type { PlayerProgress } from '../types/game';
import {
  downloadRoyalCertificatePdf,
  formatRoyalCertificateDate,
} from '../utils/certificatePdf';

interface RoyalCertificateCardProps {
  progress: PlayerProgress;
  isEvaluatorAccount?: boolean;
  onAfterDownload?: (filename: string) => void;
  extraAction?: React.ReactNode;
}

const CornerFiligreeSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 96 96"
    fill="none"
    aria-hidden="true"
    className={className}
  >
    <path d="M0 0H74C42 10 10 42 0 74V0Z" fill="#101933" />
    <path d="M10 10H54C34 18 18 34 10 54V10Z" fill="#6B1D2F" />
    <path
      d="M8 86C8 40 40 8 86 8"
      stroke="#DFBE5B"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    <path
      d="M18 76C18 40 40 18 76 18"
      stroke="#F5DD8D"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <circle cx="24" cy="24" r="5" fill="#E5C35A" />
    <circle cx="24" cy="24" r="2" fill="#FAF3E3" />
  </svg>
);

const RoyalCrownSvg: React.FC = () => (
  <svg viewBox="0 0 140 86" fill="none" aria-hidden="true" className="w-20 h-12 mx-auto">
    <defs>
      <linearGradient id="royalGoldCrown" x1="12" y1="8" x2="128" y2="76" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#9E781E" />
        <stop offset="35%" stopColor="#ECCE6E" />
        <stop offset="55%" stopColor="#FFF0B5" />
        <stop offset="85%" stopColor="#D4AF37" />
        <stop offset="100%" stopColor="#8F6A16" />
      </linearGradient>
    </defs>
    <path
      d="M20 58L10 22L44 40L70 10L96 40L130 22L120 58H20Z"
      fill="url(#royalGoldCrown)"
      stroke="#755310"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <rect x="18" y="57" width="104" height="14" rx="4" fill="#6B1D2F" stroke="#D4AF37" strokeWidth="2.4" />
    <circle cx="10" cy="18" r="5" fill="#F2D479" stroke="#755310" strokeWidth="1.5" />
    <circle cx="70" cy="8" r="6.5" fill="#9F1D35" stroke="#D4AF37" strokeWidth="1.8" />
    <circle cx="130" cy="18" r="5" fill="#F2D479" stroke="#755310" strokeWidth="1.5" />
    <circle cx="70" cy="64" r="3.5" fill="#F8E39A" />
    <circle cx="42" cy="64" r="2.8" fill="#1E3A6E" stroke="#E5C35A" strokeWidth="1" />
    <circle cx="98" cy="64" r="2.8" fill="#1E3A6E" stroke="#E5C35A" strokeWidth="1" />
  </svg>
);

const RoyalWaxSealSvg: React.FC = () => (
  <svg viewBox="0 0 120 138" fill="none" aria-hidden="true" className="w-24 h-28 mx-auto drop-shadow-md">
    <defs>
      <radialGradient id="waxDepth" cx="40%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#A6324E" />
        <stop offset="62%" stopColor="#6B1D2F" />
        <stop offset="100%" stopColor="#3E0A16" />
      </radialGradient>
    </defs>
    {/* Swallowtail Ribbons */}
    <path d="M36 74L22 126L38 114L50 128L56 76Z" fill="#531222" stroke="#D4AF37" strokeWidth="1.6" />
    <path d="M84 74L98 126L82 114L70 128L64 76Z" fill="#6B1D2F" stroke="#D4AF37" strokeWidth="1.6" />
    {/* Wax Seal Outer Scalloped Silhouette */}
    <circle cx="60" cy="54" r="42" fill="#5C1627" />
    <circle cx="60" cy="54" r="39" fill="#6B1D2F" stroke="#470E1C" strokeWidth="2" />
    <circle cx="60" cy="54" r="34" fill="url(#waxDepth)" />
    <circle cx="60" cy="54" r="30" stroke="#E5C35A" strokeWidth="2" />
    <circle cx="60" cy="54" r="25" stroke="#F3D97E" strokeOpacity="0.55" strokeWidth="1" strokeDasharray="3 3" />
    <path d="M44 59L41 44L52 51L60 39L68 51L79 44L76 59H44Z" fill="#F2D479" />
    <text
      x="60"
      y="72"
      textAnchor="middle"
      fill="#F2D479"
      fontSize="7.2"
      fontWeight="700"
      letterSpacing="0.8"
    >
      MOHOR DIRAJA
    </text>
  </svg>
);

export const RoyalCertificateCard: React.FC<RoyalCertificateCardProps> = ({
  progress,
  isEvaluatorAccount = false,
  onAfterDownload,
  extraAction,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [downloadedFile, setDownloadedFile] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const heroDef = HEROES.find((h) => h.id === progress.selectedHero) || HEROES[0];
  const issuedDate = formatRoyalCertificateDate(progress.updatedAt);

  const handleDownloadPdf = () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const result = downloadRoyalCertificatePdf({
        studentName: progress.studentName,
        className: progress.className,
        selectedHero: progress.selectedHero,
        completedCount: Math.max(5, progress.completedMissions.length),
        issuedAt: progress.updatedAt,
        guardianTitle: 'Penjaga Diraja',
      });
      if (result.ok) {
        setDownloadedFile(result.filename);
        onAfterDownload?.(result.filename);
        window.setTimeout(() => setDownloadedFile(null), 4500);
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="relative rounded-2xl bg-[#101933] p-2.5 sm:p-4 shadow-[0_24px_70px_rgba(6,10,24,0.72)] border-2 border-[#D4AF37]/80 overflow-hidden"
      >
        {/* Subtle Golden Shimmer Sweep on Reveal */}
        {!prefersReducedMotion && (
          <motion.div
            aria-hidden="true"
            initial={{ x: '-115%', opacity: 0.55 }}
            animate={{ x: '130%', opacity: 0 }}
            transition={{ duration: 1.5, ease: 'easeOut', delay: 0.25 }}
            className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-[#F6DE8D]/35 to-transparent z-20"
          />
        )}

        {/* Parchment Certificate Surface */}
        <div
          className="relative rounded-xl border-[3px] border-[#D4AF37] px-5 py-7 sm:px-10 sm:py-9 text-[#101933] overflow-hidden"
          style={{
            background:
              'radial-gradient(circle at 50% 42%, #FFFDF8 0%, #FAF3E3 56%, #F2E4C4 90%, #E7D2A6 100%)',
          }}
        >
          {/* Inner Burgundy & Gold Ornamental Frames */}
          <div className="pointer-events-none absolute inset-2 rounded-lg border border-[#6B1D2F]/80" />
          <div className="pointer-events-none absolute inset-3.5 rounded-md border border-[#C9A234]/70" />

          {/* Four Ornate Corner Filigrees */}
          <CornerFiligreeSvg className="pointer-events-none absolute top-2 left-2 w-14 h-14 sm:w-20 sm:h-20" />
          <CornerFiligreeSvg className="pointer-events-none absolute top-2 right-2 w-14 h-14 sm:w-20 sm:h-20 -scale-x-100" />
          <CornerFiligreeSvg className="pointer-events-none absolute bottom-2 left-2 w-14 h-14 sm:w-20 sm:h-20 -scale-y-100" />
          <CornerFiligreeSvg className="pointer-events-none absolute bottom-2 right-2 w-14 h-14 sm:w-20 sm:h-20 -scale-x-100 -scale-y-100" />

          <div className="relative z-10 max-w-3xl mx-auto text-center space-y-4 sm:space-y-5">
            {/* Crown & Kingdom Header */}
            <div className="space-y-1.5">
              <RoyalCrownSvg />
              <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.26em] text-[#6B1D2F]">
                Kerajaan Ribuan Kisah · Kingdom of Stories
                {isEvaluatorAccount ? ' · Pratonton Penilai' : ''}
              </p>
            </div>

            {/* Required Titles */}
            <div className="space-y-1.5">
              <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-wide text-[#101933]">
                SIJIL PENGHARGAAN DIRAJA
              </h2>
              <div className="flex items-center justify-center gap-3">
                <span className="h-[2px] w-16 sm:w-28 bg-gradient-to-r from-transparent to-[#C9A234]" />
                <Sparkles className="w-4 h-4 text-[#B88E28]" />
                <span className="h-[2px] w-16 sm:w-28 bg-gradient-to-l from-transparent to-[#C9A234]" />
              </div>
              <p className="font-display text-base sm:text-xl font-bold text-[#8F6A16]">
                Anugerah Wira Penyelamat Kerajaan
              </p>
            </div>

            {/* Student Name & Recognition */}
            <div className="space-y-2 pt-1">
              <p className="text-xs sm:text-sm font-medium text-[#2B395C]">
                Dengan penuh kemuliaan dan sukacita diperakui bahawa
              </p>
              <div className="inline-block border-b-2 border-[#C9A234] px-6 pb-1.5">
                <p className="font-display text-2xl sm:text-3xl font-bold text-[#101933] break-words">
                  {progress.studentName}
                </p>
              </div>
              <p className="text-xs sm:text-sm font-bold text-[#6B1D2F]">
                Kelas {progress.className} · Wira Pilihan: {heroDef.name} ({heroDef.title})
              </p>
            </div>

            <p className="text-xs sm:text-sm text-[#1B2948] leading-relaxed max-w-2xl mx-auto">
              telah berjaya menyempurnakan <strong>kelima-lima misi pembelajaran (5 / 5)</strong> dengan
              cemerlang dalam dunia interaktif <strong>Kingdom of Stories</strong>, sekali gus
              memulihkan jam menara istana serta menyalakan semula cahaya{' '}
              <strong>Festival Cahaya Diraja</strong>.
            </p>

            {/* Footer Signatures & Royal Burgundy Wax Seal */}
            <div className="grid grid-cols-1 sm:grid-cols-3 items-end gap-5 pt-4 border-t border-[#C9A234]/45">
              <div className="space-y-1 text-center">
                <p className="font-display text-sm sm:text-base font-bold text-[#101933]">
                  {issuedDate}
                </p>
                <div className="mx-auto w-40 border-b border-[#8F6A16]/70" />
                <p className="text-[11px] font-semibold text-[#475577]">
                  Tarikh Penyampaian Sijil
                </p>
              </div>

              <div className="flex flex-col items-center justify-center">
                <RoyalWaxSealSvg />
              </div>

              <div className="space-y-1 text-center">
                <p className="font-display text-sm sm:text-base font-bold text-[#101933]">
                  Penjaga Diraja
                </p>
                <div className="mx-auto w-44 border-b border-[#8F6A16]/70" />
                <p className="text-[11px] font-semibold text-[#475577]">
                  Penjaga Agung Kota Diraja · Kingdom of Stories
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* PDF Download & Optional Next CTA Row */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={downloading}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#ECCE6E] to-[#C9A234] text-[#101933] text-xs sm:text-sm font-bold shadow-lg hover:brightness-105 disabled:opacity-60 whitespace-nowrap shrink-0"
        >
          <Download className="w-4 h-4 shrink-0" />
          <span>Muat Turun Sijil (PDF)</span>
        </button>

        {extraAction}
      </div>

      {downloadedFile && (
        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#9EE3B3]">
          <Check className="w-4 h-4" />
          <span>Sijil PDF rasmi berjaya dijana dan dimuat turun ({downloadedFile}).</span>
        </div>
      )}
    </div>
  );
};
