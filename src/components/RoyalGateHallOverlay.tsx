import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  ListChecks,
  Sparkles,
  X,
} from 'lucide-react';
import type { MissionId, PlayerProgress } from '../types/game';

export interface GateMissionCardItem {
  number: 1 | 2 | 3 | 4 | 5;
  id: MissionId;
  missionTitle: string;
  locationName: string;
  subtitle: string;
  accentColor: string;
}

export interface MissionHubInstruction {
  number: 1 | 2 | 3 | 4 | 5;
  sectionTitle: string;
  missionLabel: string;
  locationName: string;
  accentColor: string;
  summary: string;
  steps: string[];
  deliverables: string[];
  ctaLabel: string;
}

export const GATE_HALL_MISSIONS: GateMissionCardItem[] = [
  {
    number: 1,
    id: 'silent_chronicle',
    missionTitle: 'Hikayat Yang Membisu',
    locationName: 'Pustaka Agung Hikayat Diraja',
    subtitle: 'Kemahiran Mendengar',
    accentColor: '#38BDF8',
  },
  {
    number: 2,
    id: 'shattered_timeline',
    missionTitle: 'Garis Masa Yang Terpecah',
    locationName: 'Rimba Cahaya Mahkota',
    subtitle: 'Kronologi Hikayat',
    accentColor: '#34D399',
  },
  {
    number: 3,
    id: 'story_architect',
    missionTitle: 'Arkitek Kisah',
    locationName: 'Balai Cipta Mahkota',
    subtitle: 'Arkitek Kisah & Skrip',
    accentColor: '#A78BFA',
  },
  {
    number: 4,
    id: 'royal_voice_trial',
    missionTitle: 'Ujian Suara Diraja',
    locationName: 'Balai Gema Diraja',
    subtitle: 'Ujian Suara Diraja',
    accentColor: '#F472B6',
  },
  {
    number: 5,
    id: 'final_chronicle',
    missionTitle: 'Hikayat Terakhir',
    locationName: 'Balairung Gemilang Diraja',
    subtitle: 'Pentas Persembahan',
    accentColor: '#FBBF24',
  },
];

export const MISSION_HUB_INSTRUCTIONS: Record<1 | 2 | 3 | 4 | 5, MissionHubInstruction> = {
  1: {
    number: 1,
    sectionTitle: 'Arahan Misi 1',
    missionLabel: 'Misi 1 · Hikayat Yang Membisu',
    locationName: 'Pustaka Agung Hikayat Diraja',
    accentColor: '#38BDF8',
    summary:
      'Dengarkan rakaman audio cerita "Misi Menyelamatkan Taman Sekolah" dan lengkapkan analisis unsur cerita melalui soalan kefahaman.',
    steps: [
      'Pergi ke Stesen Pendengaran Ajaib (Kitab Purba) di dalam perpustakaan dan dengar keempat-empat babak cerita.',
      'Kenal pasti watak, latar, masalah utama, peristiwa penting, penyelesaian dan nilai murni daripada bahan audio.',
      'Pergi ke Meja Manuskrip Purba, jawab semua 6 soalan kefahaman dan tekan "Semak Jawapan Manuskrip".',
    ],
    deliverables: [
      'Mendengar keempat-empat babak audio cerita dengan teliti.',
      'Memperoleh sekurang-kurangnya 4 daripada 6 jawapan tepat pada soalan kefahaman manuskrip.',
      'Menekan butang "Selesaikan Misi" setelah tugasan wajib dipenuhi.',
    ],
    ctaLabel: 'Teruskan ke Misi 1',
  },
  2: {
    number: 2,
    sectionTitle: 'Arahan Misi 2',
    missionLabel: 'Misi 2 · Garis Masa Yang Terpecah',
    locationName: 'Rimba Cahaya Mahkota',
    accentColor: '#34D399',
    summary:
      'Jejaki lima orb serpihan kisah yang tersebar di Rimba Cahaya Mahkota dan susun semula kronologi peristiwa cerita dengan tepat.',
    steps: [
      'Jelajahi kawasan Rimba Cahaya Mahkota untuk mengutip kesemua 5 orb serpihan kisah yang bercahaya (Serpihan I hingga V).',
      'Menuju ke Altar Kronologi Batu Purba dan baca setiap serpihan peristiwa dengan teliti.',
      'Gunakan butang anak panah ke atas dan ke bawah untuk menyusun peristiwa dari Permulaan hingga Pengakhiran, lalu tekan "Sahkan Garis Masa Cerita".',
    ],
    deliverables: [
      'Mengutip kesemua 5 serpihan kisah (5/5) di dalam rimba.',
      'Menyusun kesemua 5 peristiwa mengikut urutan kronologi yang betul dan mengesahkan status "Selesai Misi 2".',
    ],
    ctaLabel: 'Teruskan ke Misi 2',
  },
  3: {
    number: 3,
    sectionTitle: 'Arahan Misi 3',
    missionLabel: 'Misi 3 · Arkitek Kisah',
    locationName: 'Balai Cipta Mahkota',
    accentColor: '#A78BFA',
    summary:
      'Hasilkan karya penceritaan digital yang lengkap bermula daripada rancangan cerita, jalan cerita, papan cerita empat babak, penulisan skrip dan semakan Mentor Bahasa AI.',
    steps: [
      'Buka Meja Penulisan Diraja dan lengkapkan Langkah 1 hingga 4: Rancangan Cerita, Jalan Cerita (Permulaan, Perkembangan, Konflik, Pengakhiran), Papan Cerita 4 Babak dan Skrip Penuh.',
      'Pada Langkah 5, semak ejaan, tatabahasa serta struktur ayat menggunakan Mentor Bahasa AI dan baiki skrip mengikut cadangan.',
      'Pada Langkah 6, semak senarai tugasan dan tekan "SIMPAN KARYA" sebelum menamatkan misi.',
    ],
    deliverables: [
      'Rancangan cerita, jalan cerita 4 bahagian, papan cerita 4 babak, skrip penceritaan penuh (minimum 20 aksara) dan semakan penulisan lengkap.',
      'Karya disimpan ke dalam sistem dan butang "SELESAIKAN MISI" ditekan.',
    ],
    ctaLabel: 'Teruskan ke Misi 3',
  },
  4: {
    number: 4,
    sectionTitle: 'Arahan Misi 4',
    missionLabel: 'Misi 4 · Ujian Suara Diraja',
    locationName: 'Balai Gema Diraja',
    accentColor: '#F472B6',
    summary:
      'Latih dan rakam suara penceritaan lisan berdasarkan skrip Misi 3 menggunakan sebutan, intonasi, kelancaran dan ekspresi yang jelas.',
    steps: [
      'Masuk ke Studio Rakaman Suara di Balai Gema Diraja dan teliti skrip penceritaan anda daripada Misi 3.',
      'Tekan "Mula Rakaman", sampaikan penceritaan dengan jelas di tempat senyap, kemudian dengar semula pratonton rakaman.',
      'Tekan "Simpan Rakaman" untuk menghantar audio ke sistem (anda juga boleh merakam Cubaan ke-2 atau menggunakan semakan AI pilihan).',
    ],
    deliverables: [
      'Sekurang-kurangnya satu rakaman suara penceritaan berjaya disimpan dan dihantar ke rekod sistem & Portal Guru.',
      'Menekan butang "Selesai Misi" selepas rakaman disimpan.',
    ],
    ctaLabel: 'Teruskan ke Misi 4',
  },
  5: {
    number: 5,
    sectionTitle: 'Arahan Misi 5',
    missionLabel: 'Misi 5 · Hikayat Terakhir',
    locationName: 'Balairung Gemilang Diraja',
    accentColor: '#FBBF24',
    summary:
      'Persembahkan hasil penceritaan digital akhir "Misi Menyelamatkan Taman Sekolah" di atas pentas agung Balairung Gemilang Diraja.',
    steps: [
      'Naik ke Podium Pentas di Balairung Gemilang Diraja dan masukkan Tajuk Persembahan Akhir.',
      'Muat naik fail video penceritaan akhir (MP4 atau WebM, maksimum 32MB) atau pilih "Lancarkan Mod Persembahan Teater" untuk tayangan papan cerita berpandu.',
      'Semak paparan Tayangan Pentas Diraja pada skrin pentas sebelum pengesahan akhir.',
    ],
    deliverables: [
      'Video penceritaan akhir dimuat naik atau Mod Persembahan Teater dilancarkan sebagai serahan pentas.',
      'Menekan butang "Selesaikan Misi" untuk membuka Festival Cahaya Diraja.',
    ],
    ctaLabel: 'Teruskan ke Misi 5',
  },
};

interface RoyalGateHallOverlayProps {
  progress: PlayerProgress;
  dockCollapsed?: boolean;
  disabled?: boolean;
  activeMissionNumber?: 1 | 2 | 3 | 4 | 5 | null;
  onSelectMission: (missionNumber: 1 | 2 | 3 | 4 | 5) => void;
}

export const RoyalGateHallOverlay: React.FC<RoyalGateHallOverlayProps> = ({
  progress,
  disabled = false,
  activeMissionNumber = null,
  onSelectMission,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedInstructionNum, setSelectedInstructionNum] = useState<1 | 2 | 3 | 4 | 5 | null>(null);

  useEffect(() => {
    if (activeMissionNumber !== null) {
      setSelectedInstructionNum(null);
    }
  }, [activeMissionNumber]);

  const activeInstruction =
    selectedInstructionNum !== null ? MISSION_HUB_INSTRUCTIONS[selectedInstructionNum] : null;
  const activeCardMeta =
    selectedInstructionNum !== null
      ? GATE_HALL_MISSIONS.find((m) => m.number === selectedInstructionNum)
      : undefined;
  const isActiveMissionDone = activeCardMeta
    ? progress.completedMissions.includes(activeCardMeta.id)
    : false;

  return (
    <>
      {/* Peringkat 1: Panel Arahan Khusus Misi 1-5 di Balai Agung Diraja (Teks Sahaja, Tanpa Audio) */}
      {activeInstruction && !disabled && (
        <section
          aria-label={activeInstruction.sectionTitle}
          className="pointer-events-auto fixed z-30 top-[4.5rem] left-4 right-4 md:left-auto md:right-[18.75rem] md:w-[430px] max-h-[calc(100vh-10.5rem)] flex flex-col rounded-2xl border-2 border-[#E5C35A]/75 bg-[#0E162F]/96 text-[#FAF6EE] shadow-[0_20px_60px_rgba(5,9,24,0.86)] backdrop-blur-md overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-[#E5C35A]/30 bg-gradient-to-r from-[#162248] via-[#1D2D5E] to-[#162248]">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#0E162F]/80 border border-[#FAF6EE]/15"
                  style={{ color: activeInstruction.accentColor }}
                >
                  <BookOpen className="w-3 h-3 shrink-0" />
                  <span>{activeInstruction.sectionTitle}</span>
                </span>
                {isActiveMissionDone && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6EE7B7]">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Pernah Diselesaikan</span>
                  </span>
                )}
              </div>
              <h3 className="font-display text-sm sm:text-base font-bold text-[#FAF6EE] mt-1 leading-snug">
                {activeInstruction.missionLabel}
              </h3>
              <p className="text-[11px] text-[#E5C97B] font-medium">
                Lokasi: {activeInstruction.locationName}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedInstructionNum(null)}
              aria-label="Tutup panel arahan misi"
              className="p-1.5 rounded-lg border border-[#FAF6EE]/20 bg-[#101936] hover:bg-[#1E2F5E] text-[#FAF6EE] shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Text Instructions */}
          <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-3 text-xs sm:text-[13px] leading-relaxed">
            <div className="rounded-xl border border-[#FAF6EE]/12 bg-[#141F42]/90 p-3">
              <div className="text-[11px] font-bold uppercase tracking-wide text-[#E5C97B] mb-1">
                Penerangan Tugasan
              </div>
              <p className="text-[#EFE6D5]">{activeInstruction.summary}</p>
            </div>

            <div className="rounded-xl border border-[#FAF6EE]/12 bg-[#141F42]/90 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#7BE0E6]">
                <ListChecks className="w-3.5 h-3.5 shrink-0" />
                <span>Langkah-langkah Perlu Dilakukan</span>
              </div>
              <ol className="list-decimal pl-4 space-y-1 text-[#FAF6EE]/92">
                {activeInstruction.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>

            <div className="rounded-xl border border-[#7FA88C]/35 bg-[#12253A]/90 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#6EE7B7]">
                <ClipboardCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Perkara yang Perlu Disiapkan</span>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-[#E6F7EE]">
                {activeInstruction.deliverables.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Footer Action */}
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-[#FAF6EE]/12 bg-[#0B1125]">
            <button
              type="button"
              onClick={() => setSelectedInstructionNum(null)}
              className="px-3.5 py-2 rounded-xl border border-[#FAF6EE]/20 bg-[#152042] text-xs font-semibold text-[#FAF6EE] hover:bg-[#1E2E5C] transition-colors"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={() => {
                const targetNum = activeInstruction.number;
                setSelectedInstructionNum(null);
                onSelectMission(targetNum);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#ECCD6C] to-[#D4AF37] text-[#101832] text-xs sm:text-sm font-bold shadow-[0_0_20px_rgba(229,195,90,0.3)] hover:brightness-105 transition-all"
            >
              <span>{activeInstruction.ctaLabel}</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </section>
      )}

      {/* Panel Kompak Pilihan Misi 1-5 di Penjuru Kanan Atas */}
      <aside
        aria-label="Panel Pilihan Misi Balai Agung Diraja"
        className="pointer-events-auto fixed top-[4.5rem] right-4 z-20 w-[244px] sm:w-[272px] rounded-2xl border border-[#D4AF37]/50 bg-[#0F1832]/92 shadow-[0_14px_40px_rgba(6,10,26,0.72)] backdrop-blur-md overflow-hidden"
      >
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[#FAF6EE]/10 bg-[#142044]/90">
          <div className="flex items-center gap-1.5 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-[#E5C97B] shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-[#E5C97B] leading-tight truncate">
                Portal 5 Misi Diraja
              </div>
              <div className="text-[10px] text-[#C8B6E2]/90 leading-tight truncate">
                Pilih misi untuk baca arahan ({progress.completedMissions.length}/5)
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            aria-expanded={!collapsed}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[#D4AF37]/35 bg-[#0F1832]/85 text-[10px] font-semibold text-[#FAF6EE] hover:bg-[#1E2F5E] transition-colors shrink-0"
          >
            <span>{collapsed ? 'Buka' : 'Tutup'}</span>
            {collapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>
        </div>

        {!collapsed && (
          <div className="p-2 space-y-1.5 max-h-[58vh] overflow-y-auto">
            {GATE_HALL_MISSIONS.map((item) => {
              const isDone = progress.completedMissions.includes(item.id);
              const isSelected = selectedInstructionNum === item.number;
              const isEntering = activeMissionNumber === item.number;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    setSelectedInstructionNum((curr) =>
                      curr === item.number ? null : item.number,
                    )
                  }
                  className={`group relative w-full flex items-center justify-between gap-2 text-left rounded-xl border px-2.5 py-1.5 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#E5C97B] disabled:opacity-55 ${
                    isEntering || isSelected
                      ? 'border-[#E5C97B] bg-[#223569] shadow-[0_0_16px_rgba(229,201,123,0.28)]'
                      : 'border-[#FAF6EE]/14 bg-[#162246]/92 hover:bg-[#1E2F5E] hover:border-[#E5C97B]/75'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r"
                    style={{ backgroundColor: item.accentColor }}
                  />
                  <div className="pl-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="font-display text-[11px] font-bold tracking-wide"
                        style={{ color: item.accentColor }}
                      >
                        Misi {item.number}
                      </span>
                      <span className="text-[10px] text-[#C8B6E2]/80 truncate">
                        · {item.subtitle}
                      </span>
                    </div>
                    <div className="text-[11px] font-semibold text-[#FAF6EE] leading-snug truncate">
                      {item.locationName}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isDone ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#6EE7B7]">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#E5C97B] group-hover:translate-x-0.5 transition-transform">
                        <span>{isSelected ? 'Aktif' : 'Arahan'}</span>
                        <ArrowRight className="w-3 h-3 shrink-0" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </aside>
    </>
  );
};
