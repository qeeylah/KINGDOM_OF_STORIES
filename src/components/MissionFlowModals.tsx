import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Compass,
  Crown,
  Map as MapIcon,
  RotateCcw,
  Sparkles,
  Star,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { soundEngine } from '../audio/soundEngine';
import type { ScriptPlan } from '../types/game';

interface MissionIntroPopupProps {
  missionNumber?: 1 | 2 | 3 | 4 | 5;
  missionBadge: string;
  locationTitle: string;
  onStartMission: () => void;
  onBack: () => void;
}

export const MissionIntroPopup: React.FC<MissionIntroPopupProps> = ({
  missionNumber,
  missionBadge,
  locationTitle,
  onStartMission,
  onBack,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const isMission1 = missionNumber === 1;
  const isMission2 = missionNumber === 2;
  const isMission3 = missionNumber === 3;
  const isMission4 = missionNumber === 4;
  const isMission5 = missionNumber === 5;

  useEffect(() => {
    soundEngine.stopNarration();
    return () => {
      soundEngine.stopNarration();
    };
  }, [missionNumber, missionBadge, locationTitle]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090E20]/88 p-4 sm:p-6 overflow-y-auto">
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-2xl rounded-2xl border-2 border-[#E5C35A]/70 bg-[#101933] text-[#FAF6EE] shadow-[0_24px_70px_rgba(6,10,28,0.85)] overflow-hidden my-auto"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-2.5 left-2.5 w-5 h-5 border-t-2 border-l-2 border-[#E5C35A] rounded-tl-md"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-2.5 right-2.5 w-5 h-5 border-t-2 border-r-2 border-[#E5C35A] rounded-tr-md"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-2.5 left-2.5 w-5 h-5 border-b-2 border-l-2 border-[#E5C35A] rounded-bl-md"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-2.5 right-2.5 w-5 h-5 border-b-2 border-r-2 border-[#E5C35A] rounded-br-md"
        />

        <div className="border-b border-[#E5C35A]/30 bg-gradient-to-r from-[#142044] via-[#1D2A58] to-[#142044] px-6 py-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#E5C35A]">
            <Compass className="w-4 h-4 shrink-0" />
            <span>{missionBadge}</span>
          </div>
          <h2 className="font-display text-lg sm:text-xl font-bold text-[#FAF6EE] mt-1">
            {isMission1
              ? 'MISI 1 – DENGAR DAN FAHAMI HIKAYAT'
              : isMission2
                ? 'Panduan Misi 2: Altar Kronologi Batu Purba'
                : isMission3
                  ? 'MISI 3 – ARKITEK KISAH: MEJA PENULISAN DIRAJA'
                  : isMission4
                    ? 'MISI 4 – BALAI GEMA DIRAJA: UJIAN SUARA DIRAJA'
                    : isMission5
                      ? 'MISI 5 – BALAIRUNG GEMILANG DIRAJA: HIKAYAT TERAKHIR'
                      : locationTitle}
          </h2>
        </div>

        {isMission1 ? (
          <div className="p-6 space-y-4 text-sm sm:text-base leading-relaxed text-[#EFE6D5]">
            <p className="font-display text-base sm:text-lg font-semibold text-[#E5C35A]">
              Selamat datang ke Pustaka Agung Hikayat Diraja!
            </p>
            <p>
              Dalam misi ini, kamu perlu mendengar bahan audio yang mengandungi sebuah cerita tentang usaha menyelamatkan taman sekolah.
            </p>
            <p>
              Dengarkan setiap babak dengan teliti dan fahami peristiwa yang berlaku dalam cerita tersebut.
            </p>
            <p>
              Seterusnya, jawab semua soalan kefahaman berdasarkan maklumat yang kamu dengar.
            </p>
            <div className="rounded-xl border border-[#E5C35A]/30 bg-[#152143] p-4 space-y-2 text-xs sm:text-sm">
              <div className="font-semibold text-[#E5C35A]">Pastikan kamu:</div>
              <ol className="list-decimal pl-5 space-y-1.5 text-[#FAF6EE]/95">
                <li>Mendengar keempat-empat babak audio dengan teliti.</li>
                <li>Memahami isi dan peristiwa penting dalam cerita.</li>
                <li>Menyatakan sekurang-kurangnya tiga isi atau peristiwa penting daripada bahan audio.</li>
                <li>Menjawab soalan berdasarkan kandungan audio.</li>
                <li>Menyemak jawapan sebelum menyelesaikan misi.</li>
              </ol>
            </div>
            <div className="rounded-xl border border-[#7BE0E6]/35 bg-[#121D3B] px-4 py-3 text-xs sm:text-sm text-[#CBEAF0]">
              Ingat! Kamu boleh memainkan semula bahan audio sekiranya perlu.
            </div>
            <p className="font-semibold text-[#FAF6EE]">
              Bersedia untuk menguji kemahiran mendengar dan memahami? Mulakan pengembaraanmu sekarang!
            </p>
          </div>
        ) : isMission2 ? (
          <div className="p-6 space-y-4 text-sm sm:text-base leading-relaxed text-[#EFE6D5]">
            <p className="font-display text-lg font-semibold text-[#E5C35A]">
              Selamat datang ke Altar Kronologi Batu Purba!
            </p>
            <p>
              Wira, anda perlu menyusun semula serpihan hikayat yang telah bercampur-aduk mengikut urutan peristiwa yang betul.
            </p>
            <p>
              Baca setiap serpihan cerita dengan teliti. Gunakan butang anak panah ke atas dan ke bawah untuk mengubah kedudukan setiap serpihan sehingga membentuk jalan cerita yang tersusun dari permulaan hingga pengakhiran.
            </p>
            <p>
              Setelah yakin dengan susunan anda, tekan butang &apos;Sahkan Garis Masa Cerita&apos; untuk menghantar jawapan.
            </p>
            <p className="font-semibold text-[#FAF6EE]">
              Ingat, setiap peristiwa mempunyai susunan tersendiri. Buktikan kebijaksanaan anda untuk memulihkan hikayat diraja!
            </p>
          </div>
        ) : isMission3 ? (
          <div className="p-6 space-y-4 text-sm sm:text-base leading-relaxed text-[#EFE6D5]">
            <p className="font-display text-base sm:text-lg font-semibold text-[#E5C35A]">
              Selamat datang ke Meja Penulisan Diraja!
            </p>
            <p>
              Dalam misi ini, kamu perlu membina jalan cerita digital, merancang papan cerita empat babak, dan menulis skrip penceritaan yang lengkap.
            </p>
            <div className="rounded-xl border border-[#E5C35A]/30 bg-[#152143] p-4 space-y-2 text-xs sm:text-sm">
              <div className="font-semibold text-[#E5C35A]">Ikuti langkah berikut:</div>
              <ol className="list-decimal pl-5 space-y-1.5 text-[#FAF6EE]/95">
                <li>Lengkapkan rancangan cerita seperti tema, watak dan latar.</li>
                <li>Bina jalan cerita yang mengandungi permulaan, perkembangan, konflik dan pengakhiran.</li>
                <li>Susun papan cerita bagi empat babak utama.</li>
                <li>Tulis skrip penceritaan penuh berdasarkan papan cerita kamu.</li>
                <li>Gunakan Mentor Bahasa AI untuk menyemak ejaan, tatabahasa dan struktur ayat.</li>
                <li>Baiki skrip berdasarkan cadangan yang diberikan.</li>
                <li>Simpan hasil karya sebelum melengkapkan Misi 3.</li>
              </ol>
            </div>
            <div className="rounded-xl border border-[#7BE0E6]/35 bg-[#121D3B] px-4 py-3 text-xs sm:text-sm text-[#CBEAF0]">
              Pastikan cerita kamu mempunyai jalan cerita yang tersusun, penggunaan bahasa yang betul dan pengakhiran yang bermakna.
            </div>
          </div>
        ) : isMission4 ? (
          <div className="p-6 space-y-4 text-sm sm:text-base leading-relaxed text-[#EFE6D5]">
            <p className="font-display text-base sm:text-lg font-semibold text-[#E5C35A]">
              Selamat datang ke Balai Gema Diraja!
            </p>
            <p>
              Dalam misi ini, kamu perlu merakam suara penceritaan berdasarkan skrip yang telah kamu hasilkan dalam Misi 3.
            </p>
            <div className="rounded-xl border border-[#E5C35A]/30 bg-[#152143] p-4 space-y-2 text-xs sm:text-sm">
              <div className="font-semibold text-[#E5C35A]">Sebelum memulakan rakaman:</div>
              <ol className="list-decimal pl-5 space-y-1.5 text-[#FAF6EE]/95">
                <li>Baca skrip kamu dengan teliti dan berlatih terlebih dahulu.</li>
                <li>Pastikan mikrofon peranti kamu berfungsi dan berada di tempat yang senyap.</li>
                <li>Gunakan intonasi, sebutan yang jelas, kelancaran dan emosi yang sesuai dengan cerita.</li>
                <li>Setelah merakam, dengar semula rakaman kamu untuk memastikan kualitinya baik.</li>
                <li>Simpan rakaman tersebut sebagai bukti tugasan sebelum menamatkan Misi 4.</li>
              </ol>
            </div>
            <div className="rounded-xl border border-[#7BE0E6]/35 bg-[#121D3B] px-4 py-3 text-xs sm:text-sm text-[#CBEAF0]">
              Setelah bersedia, tekan butang mula rakaman dan sampaikan cerita kamu dengan sebaik-baiknya.
            </div>
          </div>
        ) : isMission5 ? (
          <div className="p-6 space-y-4 text-sm sm:text-base leading-relaxed text-[#EFE6D5]">
            <p className="font-display text-base sm:text-lg font-semibold text-[#E5C35A]">
              Selamat datang ke Balairung Gemilang Diraja!
            </p>
            <p>
              Dalam misi kemuncak ini, kamu akan mempersembahkan karya penceritaan digital akhir bagi kisah &quot;Misi Menyelamatkan Taman Sekolah&quot; di atas pentas diraja.
            </p>
            <div className="rounded-xl border border-[#E5C35A]/30 bg-[#152143] p-4 space-y-2 text-xs sm:text-sm">
              <div className="font-semibold text-[#E5C35A]">Langkah persembahan di pentas:</div>
              <ol className="list-decimal pl-5 space-y-1.5 text-[#FAF6EE]/95">
                <li>Naik ke podium pentas dan masukkan tajuk persembahan akhir kamu.</li>
                <li>Muat naik fail video penceritaan digital (MP4 atau WebM, maksimum 32MB) atau pilih Mod Persembahan Teater berpandu untuk menayangkan papan cerita empat babak.</li>
                <li>Semak tayangan pentas diraja dan tekan butang Selesaikan Misi setelah persembahan disediakan.</li>
              </ol>
            </div>
            <div className="rounded-xl border border-[#7BE0E6]/35 bg-[#121D3B] px-4 py-3 text-xs sm:text-sm text-[#CBEAF0]">
              Sempurnakan persembahan akhirmu untuk menyalakan semula Festival Cahaya Diraja!
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4 text-sm sm:text-base leading-relaxed text-[#EFE6D5]">
            <p className="font-display text-lg font-semibold text-[#E5C35A]">
              Selamat datang ke {locationTitle}!
            </p>
            <p>
              Baca arahan bertugas di lokasi ini dengan teliti dan lengkapkan tugasan yang disediakan.
            </p>
          </div>
        )}

        <div className="border-t border-[#FAF6EE]/10 bg-[#0C1329] px-6 py-4 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              soundEngine.stopNarration();
              if (!isMission2) soundEngine.playUiClickSound();
              onBack();
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#FAF6EE]/25 bg-[#162144] text-xs sm:text-sm font-semibold text-[#FAF6EE] hover:bg-[#1F2F5E] transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-4 h-4 text-[#C8B6E2]" />
            <span>{isMission3 || isMission4 ? 'KEMBALI' : 'Kembali'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.stopNarration();
              if (!isMission2) soundEngine.playCrystalChimeSound();
              onStartMission();
            }}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#ECCD6C] to-[#D4AF37] text-[#101832] text-xs sm:text-sm font-bold hover:brightness-105 transition-all whitespace-nowrap shrink-0"
          >
            <span>
              {isMission1
                ? 'MULA MISI'
                : isMission3
                  ? 'MULA MISI 3'
                  : isMission4
                    ? 'MULA MISI 4'
                    : isMission5
                      ? 'MULA MISI 5'
                      : 'Mula Misi'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

interface MissionSuccessPopupProps {
  missionNumber: 1 | 2 | 3 | 4 | 5;
  mission2Confirmed?: boolean;
  mission3Summary?: ScriptPlan;
  onConfirmMission2Complete?: () => Promise<void>;
  onBackToMap: () => void;
  onBackToGateHall?: () => void;
  onContinueNext: () => void;
}

const MISSION2_SPARKLE_STARS = [
  { top: '10%', left: '10%', delay: 0, size: 14 },
  { top: '16%', left: '84%', delay: 0.4, size: 16 },
  { top: '34%', left: '6%', delay: 0.9, size: 12 },
  { top: '38%', left: '91%', delay: 0.2, size: 13 },
  { top: '68%', left: '11%', delay: 0.7, size: 15 },
  { top: '74%', left: '88%', delay: 1.1, size: 14 },
];

const MISSION_TITLES: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'Misi 1: Hikayat Yang Membisu',
  2: 'Misi 2: Altar Kronologi Batu Purba',
  3: 'Misi 3: Arkitek Kisah',
  4: 'Misi 4: Balai Gema Diraja',
  5: 'Misi 5: Balairung Gemilang Diraja',
};

export const MissionSuccessPopup: React.FC<MissionSuccessPopupProps> = ({
  missionNumber,
  mission2Confirmed = false,
  mission3Summary,
  onConfirmMission2Complete,
  onBackToMap,
  onBackToGateHall,
  onContinueNext,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const isFinalMission = missionNumber === 5;
  const isMission2 = missionNumber === 2;
  const isMission3 = missionNumber === 3;
  const isMission4 = missionNumber === 4;
  const [savingM2, setSavingM2] = useState(false);
  const [localM2Confirmed, setLocalM2Confirmed] = useState(mission2Confirmed);

  useEffect(() => {
    setLocalM2Confirmed(mission2Confirmed);
  }, [mission2Confirmed]);

  useEffect(() => {
    soundEngine.stopNarration();
    return () => {
      soundEngine.stopNarration();
    };
  }, [missionNumber]);

  if (isMission2) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#070B1A]/90 p-4 sm:p-6 overflow-y-auto"
        style={{ perspective: 1300 }}
      >
        {/* Glowing Royal Orbit Backdrop */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 flex items-center justify-center overflow-hidden"
        >
          <div className="w-[540px] h-[540px] rounded-full bg-[radial-gradient(circle,rgba(229,195,90,0.22)_0%,rgba(123,224,230,0.08)_45%,transparent_72%)] blur-2xl" />
          <div
            className={`absolute w-[480px] h-[480px] rounded-full border border-dashed border-[#E5C35A]/35 ${
              prefersReducedMotion ? '' : 'animate-royal-orbit'
            }`}
          />
        </div>

        <motion.div
          initial={
            prefersReducedMotion ? false : { opacity: 0, scale: 0.9, y: 20, rotateX: -14 }
          }
          animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-xl rounded-2xl border-2 border-[#E5C35A] bg-gradient-to-b from-[#162247] via-[#101933] to-[#0D142B] text-[#FAF6EE] shadow-[0_24px_90px_rgba(212,175,55,0.3)] overflow-hidden my-auto text-center"
        >
          {/* Animated Twinkling Golden Stars */}
          {MISSION2_SPARKLE_STARS.map((st, idx) => (
            <motion.span
              key={idx}
              aria-hidden="true"
              style={{ top: st.top, left: st.left }}
              animate={
                prefersReducedMotion
                  ? undefined
                  : {
                      opacity: [0.35, 1, 0.35],
                      scale: [0.85, 1.25, 0.85],
                      rotate: [0, 18, 0],
                    }
              }
              transition={{
                duration: 2.6,
                delay: st.delay,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="pointer-events-none absolute text-[#ECCD6C]/85 z-10"
            >
              <Star style={{ width: st.size, height: st.size }} className="fill-[#ECCD6C]/70" />
            </motion.span>
          ))}

          {/* Royal Ornamental Corner Accents */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-2.5 left-2.5 w-6 h-6 border-t-2 border-l-2 border-[#E5C35A] rounded-tl-md z-10"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-2.5 right-2.5 w-6 h-6 border-t-2 border-r-2 border-[#E5C35A] rounded-tr-md z-10"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-2.5 left-2.5 w-6 h-6 border-b-2 border-l-2 border-[#E5C35A] rounded-bl-md z-10"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-2.5 right-2.5 w-6 h-6 border-b-2 border-r-2 border-[#E5C35A] rounded-br-md z-10"
          />

          {/* Crown Emblem Header */}
          <div className="relative border-b border-[#E5C35A]/35 bg-gradient-to-b from-[#23346B]/90 via-[#18254D]/90 to-[#121C3C] px-6 pt-8 pb-6 space-y-3">
            <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
              <motion.div
                aria-hidden="true"
                animate={
                  prefersReducedMotion
                    ? undefined
                    : { scale: [1, 1.12, 1], opacity: [0.45, 0.85, 0.45] }
                }
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-full bg-[#E5C35A]/25 blur-md"
              />
              <div className="relative w-16 h-16 rounded-full border-2 border-[#ECCD6C] bg-gradient-to-br from-[#2C3F7D] via-[#1C2A58] to-[#121B3A] flex items-center justify-center shadow-[0_0_28px_rgba(236,205,108,0.45)] animate-royal-float">
                <Crown className="w-8 h-8 text-[#ECCD6C]" />
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#7BE0E6]">
              <Sparkles className="w-3.5 h-3.5 text-[#ECCD6C]" />
              <span>Misi 2 · Altar Kronologi Batu Purba</span>
            </div>

            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-wide title-gold-shimmer">
              TAHNIAH, WIRA DIRAJA!
            </h2>
          </div>

          {/* Success Body & Confirmation Status */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.14 }}
            className="p-6 space-y-4 text-sm sm:text-base leading-relaxed text-[#EFE6D5]"
          >
            <p className="font-semibold text-[#FAF6EE]">
              Syabas! Anda telah berjaya menyelesaikan Misi 2: Altar Kronologi Batu Purba dengan cemerlang!
            </p>
            <p className="text-[#D5C4EE]">
              Anda berjaya menyusun semula serpihan hikayat mengikut urutan peristiwa yang tepat. Kini, satu lagi rahsia kerajaan telah berjaya dipulihkan!
            </p>

            {localM2Confirmed && (
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25 }}
                className="rounded-xl border border-[#6EE7B7]/60 bg-[#12333E]/85 px-4 py-3 text-xs sm:text-sm text-[#A7F3D0] flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-[#6EE7B7] shrink-0" />
                <span>
                  Status Misi 2 disahkan <strong>Selesai</strong> dan kemajuan anda telah berjaya disimpan!
                </span>
              </motion.div>
            )}
          </motion.div>

          {/* Action Buttons */}
          <div className="border-t border-[#E5C35A]/20 bg-[#0B1126] px-6 py-4 space-y-3">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                disabled={savingM2}
                onClick={async () => {
                  if (savingM2) return;
                  setSavingM2(true);
                  try {
                    if (onConfirmMission2Complete) {
                      await onConfirmMission2Complete();
                    }
                    setLocalM2Confirmed(true);
                    soundEngine.playCollectSound();
                  } finally {
                    setSavingM2(false);
                  }
                }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-xs sm:text-sm font-bold transition-all whitespace-nowrap shrink-0 ${
                  localM2Confirmed
                    ? 'border-[#6EE7B7]/70 bg-[#153A3B] text-[#6EE7B7]'
                    : 'border-[#7BE0E6]/60 bg-[#182852] text-[#FAF6EE] hover:bg-[#22376E]'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-[#6EE7B7]" />
                <span>
                  {savingM2
                    ? 'Menyimpan...'
                    : localM2Confirmed
                      ? 'Selesai Misi 2 ✓'
                      : 'Selesai Misi 2'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playPortalSound();
                  onContinueNext();
                }}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#ECCD6C] to-[#D4AF37] text-[#101832] text-xs sm:text-sm font-bold shadow-[0_0_20px_rgba(229,195,90,0.3)] hover:brightness-105 transition-all whitespace-nowrap shrink-0"
              >
                <span>Teruskan ke Misi 3</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {localM2Confirmed && (
              <div className="flex flex-wrap items-center justify-center gap-4">
                {onBackToGateHall && (
                  <button
                    type="button"
                    onClick={onBackToGateHall}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E5C97B] hover:text-[#FAF6EE] transition-colors"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Kembali ke Balai Agung Diraja</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onBackToMap}
                  className="inline-flex items-center gap-1.5 text-xs text-[#8FBCE0] hover:text-[#FAF6EE] transition-colors"
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  <span>Kembali ke Peta Misi</span>
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  const missionTitle = MISSION_TITLES[missionNumber];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090E20]/88 p-4 sm:p-6 overflow-y-auto">
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-xl rounded-2xl border-2 border-[#E5C35A] bg-[#101933] text-[#FAF6EE] shadow-[0_24px_80px_rgba(212,175,55,0.22)] overflow-hidden my-auto text-center"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-2.5 left-2.5 w-5 h-5 border-t-2 border-l-2 border-[#E5C35A] rounded-tl-md"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-2.5 right-2.5 w-5 h-5 border-t-2 border-r-2 border-[#E5C35A] rounded-tr-md"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-2.5 left-2.5 w-5 h-5 border-b-2 border-l-2 border-[#E5C35A] rounded-bl-md"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-2.5 right-2.5 w-5 h-5 border-b-2 border-r-2 border-[#E5C35A] rounded-br-md"
        />

        <div className="border-b border-[#E5C35A]/30 bg-gradient-to-b from-[#1E2C5A] to-[#131E3E] px-6 pt-7 pb-5 space-y-3">
          <div className="mx-auto w-14 h-14 rounded-full border-2 border-[#E5C35A] bg-[#243468] flex items-center justify-center shadow-[0_0_24px_rgba(229,195,90,0.35)]">
            {isFinalMission ? (
              <Award className="w-7 h-7 text-[#E5C35A]" />
            ) : (
              <CheckCircle2 className="w-7 h-7 text-[#6EE7B7]" />
            )}
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#E5C35A]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{missionTitle} · Selesai</span>
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-[#FAF6EE]">
            {`TAHNIAH! KAMU TELAH BERJAYA MENYELESAIKAN ${missionTitle.toUpperCase()}!`}
          </h2>
        </div>

        <div className="p-6 space-y-3 text-sm sm:text-base leading-relaxed text-[#EFE6D5]">
          {isMission3 && mission3Summary ? (
            <div className="space-y-3 text-left">
              <p className="text-center font-semibold text-[#FAF6EE]">
                Hasil karya penceritaan digital kamu bagi <strong>Misi 3: Arkitek Kisah</strong> telah disimpan ke dalam sistem dan sedia digunakan dalam Misi 4 di Balai Gema Diraja.
              </p>
              <div className="rounded-xl border border-[#E5C35A]/35 bg-[#152143] p-4 space-y-2 text-xs sm:text-sm">
                <div className="font-semibold text-[#E5C35A]">Ringkasan Hasil Karya Disimpan:</div>
                <div>
                  <strong className="text-[#C8B6E2]">Tema:</strong> {mission3Summary.theme}
                </div>
                <div>
                  <strong className="text-[#C8B6E2]">Watak Utama:</strong> {mission3Summary.characters}
                </div>
                {mission3Summary.supportingCharacters && (
                  <div>
                    <strong className="text-[#C8B6E2]">Watak Sampingan:</strong>{' '}
                    {mission3Summary.supportingCharacters}
                  </div>
                )}
                <div>
                  <strong className="text-[#C8B6E2]">Latar:</strong> {mission3Summary.setting}
                </div>
                <div className="pt-1 border-t border-[#FAF6EE]/10">
                  <strong className="text-[#7BE0E6]">Papan Cerita (4 Babak):</strong>
                  <ul className="list-disc pl-5 mt-1 space-y-0.5 text-xs text-[#EFE6D5]">
                    {mission3Summary.storyboard.map((sb) => (
                      <li key={sb.id}>{sb.title}</li>
                    ))}
                  </ul>
                </div>
                <div className="pt-1 border-t border-[#FAF6EE]/10">
                  <strong className="text-[#7FA88C]">Skrip Penceritaan (Sedia untuk Misi 4):</strong>
                  <p className="text-xs text-[#FAF6EE]/90 mt-1 line-clamp-3">
                    {mission3Summary.fullScript}
                  </p>
                </div>
              </div>
            </div>
          ) : isMission4 ? (
            <>
              <p className="font-semibold text-[#FAF6EE]">
                Syabas! Rakaman suara penceritaan kamu bagi <strong>Misi 4: Balai Gema Diraja</strong> telah berjaya disimpan dan dihantar kepada pensyarah untuk penilaian.
              </p>
              <p className="text-[#D5C4EE]">
                Kini kamu bersedia untuk melangkah ke pentas akhir di Balairung Gemilang Diraja (Misi 5).
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-[#FAF6EE]">
                Anda telah berjaya menyelesaikan <strong>{missionTitle}</strong> dengan baik!
              </p>
              <p className="text-[#D5C4EE]">
                Teruskan pengembaraan anda untuk memulihkan kegemilangan Kerajaan Hikayat Diraja.
              </p>
            </>
          )}
        </div>

        <div className="border-t border-[#FAF6EE]/10 bg-[#0C1329] px-6 py-4 space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                soundEngine.stopNarration();
                soundEngine.playUiClickSound();
                onBackToMap();
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#8FBCE0]/45 bg-[#162144] text-xs sm:text-sm font-semibold text-[#FAF6EE] hover:bg-[#1F2F5E] transition-colors whitespace-nowrap shrink-0"
            >
              <MapIcon className="w-4 h-4 text-[#8FBCE0]" />
              <span>Kembali ke Peta Misi</span>
            </button>
            {onBackToGateHall && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.stopNarration();
                  soundEngine.playUiClickSound();
                  onBackToGateHall();
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E5C97B]/45 bg-[#162144] text-xs sm:text-sm font-semibold text-[#E5C97B] hover:bg-[#1F2F5E] transition-colors whitespace-nowrap shrink-0"
              >
                <Compass className="w-4 h-4 text-[#E5C97B]" />
                <span>Kembali ke Balai Agung Diraja</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                soundEngine.stopNarration();
                soundEngine.playPortalSound();
                onContinueNext();
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#ECCD6C] to-[#D4AF37] text-[#101832] text-xs sm:text-sm font-bold hover:brightness-105 transition-all whitespace-nowrap shrink-0"
            >
              <span>
                {isFinalMission
                  ? 'Lihat Kejayaan Pengembaraan'
                  : isMission3
                    ? 'Teruskan ke Misi 4'
                    : isMission4
                      ? 'Teruskan ke Misi 5'
                      : 'Teruskan ke Misi Seterusnya'}
              </span>
              {isFinalMission ? (
                <Award className="w-4 h-4" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
