import { jsPDF } from 'jspdf';
import { HEROES, MISSION_ORDER } from '../data/gameContent';
import type { HeroId, PlayerProgress } from '../types/game';

export interface RoyalCertificatePayload {
  studentName: string;
  className: string;
  selectedHero: HeroId;
  completedCount: number;
  issuedAt?: string;
  guardianTitle?: string;
}

export function isAllFiveMissionsVerified(progress: PlayerProgress): boolean {
  if (!progress || !Array.isArray(progress.completedMissions)) return false;
  const allFiveDone = MISSION_ORDER.every((m) => progress.completedMissions.includes(m.id));
  return allFiveDone && Boolean(progress.festivalUnlocked);
}

const MALAY_MONTHS = [
  'Januari',
  'Februari',
  'Mac',
  'April',
  'Mei',
  'Jun',
  'Julai',
  'Ogos',
  'September',
  'Oktober',
  'November',
  'Disember',
];

export function formatRoyalCertificateDate(isoDate?: string): string {
  const d = isoDate ? new Date(isoDate) : new Date();
  const valid = Number.isNaN(d.getTime()) ? new Date() : d;
  return `${valid.getDate()} ${MALAY_MONTHS[valid.getMonth()]} ${valid.getFullYear()}`;
}

function drawCrownCanvas(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // Subtle royal halo behind crown
  const halo = ctx.createRadialGradient(0, -10, 6, 0, -10, 92);
  halo.addColorStop(0, 'rgba(212, 175, 55, 0.34)');
  halo.addColorStop(0.6, 'rgba(212, 175, 55, 0.08)');
  halo.addColorStop(1, 'rgba(212, 175, 55, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, -10, 92, 0, Math.PI * 2);
  ctx.fill();

  const goldGrad = ctx.createLinearGradient(-64, -48, 64, 34);
  goldGrad.addColorStop(0, '#9E781E');
  goldGrad.addColorStop(0.32, '#E7C868');
  goldGrad.addColorStop(0.55, '#FFF0B3');
  goldGrad.addColorStop(0.8, '#D4AF37');
  goldGrad.addColorStop(1, '#8F6A16');

  ctx.fillStyle = goldGrad;
  ctx.strokeStyle = '#6E4E0D';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-58, 22);
  ctx.lineTo(-68, -24);
  ctx.lineTo(-32, 0);
  ctx.lineTo(0, -44);
  ctx.lineTo(32, 0);
  ctx.lineTo(68, -24);
  ctx.lineTo(58, 22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Crown base band
  ctx.fillStyle = '#6B1D2F';
  ctx.strokeStyle = '#C9A234';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(-60, 20, 120, 16, 4);
  ctx.fill();
  ctx.stroke();

  // Jewels at crown tips and band center
  const jewels: Array<[number, number, string, number]> = [
    [-68, -28, '#D4AF37', 6],
    [0, -49, '#9F1D35', 8],
    [68, -28, '#D4AF37', 6],
    [0, 28, '#F7E08E', 5],
    [-34, 28, '#1E3A6E', 4],
    [34, 28, '#1E3A6E', 4],
  ];
  jewels.forEach(([jx, jy, col, r]) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(jx, jy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#755310';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  });

  ctx.restore();
}

function drawCornerFiligree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  flipX: number,
  flipY: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flipX, flipY);

  // Dark Navy & Burgundy corner shield accent
  ctx.fillStyle = '#101933';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(158, 0);
  ctx.quadraticCurveTo(90, 20, 20, 90);
  ctx.lineTo(0, 158);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#6B1D2F';
  ctx.beginPath();
  ctx.moveTo(18, 18);
  ctx.lineTo(110, 18);
  ctx.quadraticCurveTo(64, 34, 34, 64);
  ctx.lineTo(18, 110);
  ctx.closePath();
  ctx.fill();

  // Ornate gold flourishes
  ctx.strokeStyle = '#DFBE5B';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(14, 148);
  ctx.quadraticCurveTo(14, 14, 148, 14);
  ctx.stroke();

  ctx.strokeStyle = '#F6DE8D';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(28, 132);
  ctx.bezierCurveTo(28, 56, 56, 28, 132, 28);
  ctx.stroke();

  // Corner gold rosette
  ctx.fillStyle = '#E5C35A';
  ctx.beginPath();
  ctx.arc(42, 42, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FAF3E3';
  ctx.beginPath();
  ctx.arc(42, 42, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawRoyalWaxSeal(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.save();
  ctx.translate(cx, cy);

  // Gold & burgundy swallowtail ribbons beneath seal
  const drawRibbon = (angle: number, fill: string) => {
    ctx.save();
    ctx.rotate(angle);
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(-22, 20);
    ctx.lineTo(22, 20);
    ctx.lineTo(22, 112);
    ctx.lineTo(0, 92);
    ctx.lineTo(-22, 112);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  };
  drawRibbon(-0.28, '#531222');
  drawRibbon(0.28, '#6B1D2F');

  // Outer scalloped wax edge
  ctx.fillStyle = '#6B1D2F';
  ctx.beginPath();
  const lobes = 18;
  for (let i = 0; i <= lobes * 4; i++) {
    const t = (i / (lobes * 4)) * Math.PI * 2;
    const r = 68 + Math.sin(t * lobes) * 4.5;
    const px = Math.cos(t) * r;
    const py = Math.sin(t) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // Inner embossed wax depression
  const waxGrad = ctx.createRadialGradient(-16, -18, 6, 0, 0, 56);
  waxGrad.addColorStop(0, '#9B2B45');
  waxGrad.addColorStop(0.65, '#6B1D2F');
  waxGrad.addColorStop(1, '#3D0B17');
  ctx.fillStyle = waxGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 54, 0, Math.PI * 2);
  ctx.fill();

  // Gold stamped ring & emblem inside seal
  ctx.strokeStyle = '#E5C35A';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 48, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(243, 217, 126, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(0, 0, 40, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Mini crown stamp inside seal
  ctx.fillStyle = '#F2D479';
  ctx.beginPath();
  ctx.moveTo(-22, 10);
  ctx.lineTo(-26, -12);
  ctx.lineTo(-10, -1);
  ctx.lineTo(0, -21);
  ctx.lineTo(10, -1);
  ctx.lineTo(26, -12);
  ctx.lineTo(22, 10);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#F2D479';
  ctx.font = '700 12px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MOHOR DIRAJA', 0, 29);

  ctx.restore();
}

function renderCertificateCanvas(payload: RoyalCertificatePayload): HTMLCanvasElement {
  const W = 2970;
  const H = 2100;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // 1. Deep navy outer royal frame backing
  ctx.fillStyle = '#101933';
  ctx.fillRect(0, 0, W, H);

  // 2. Parchment body background with warm center glow
  const margin = 76;
  const pW = W - margin * 2;
  const pH = H - margin * 2;

  const parchGrad = ctx.createRadialGradient(W * 0.5, H * 0.46, 120, W * 0.5, H * 0.5, 1650);
  parchGrad.addColorStop(0, '#FFFDF7');
  parchGrad.addColorStop(0.55, '#FAF3E3');
  parchGrad.addColorStop(0.88, '#F2E5C7');
  parchGrad.addColorStop(1, '#E5D1A4');
  ctx.fillStyle = parchGrad;
  ctx.fillRect(margin, margin, pW, pH);

  // Subtle parchment grain speckles (deterministic pattern, crisp & warm)
  ctx.fillStyle = 'rgba(138, 102, 42, 0.035)';
  for (let i = 0; i < 1600; i++) {
    const gx = margin + ((i * 1973) % pW);
    const gy = margin + ((i * 2909) % pH);
    const gr = (i % 3) + 1;
    ctx.fillRect(gx, gy, gr, gr);
  }

  // Subtle watermark crest in center
  ctx.save();
  ctx.globalAlpha = 0.045;
  ctx.strokeStyle = '#9A741B';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(W / 2, H / 2 + 20, 410, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(W / 2, H / 2 + 20, 370, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 3. Ornate Double/Triple Metallic Gold Borders
  const goldStrokeGrad = ctx.createLinearGradient(0, 0, W, H);
  goldStrokeGrad.addColorStop(0, '#B08724');
  goldStrokeGrad.addColorStop(0.3, '#F4DB83');
  goldStrokeGrad.addColorStop(0.55, '#D4AF37');
  goldStrokeGrad.addColorStop(0.8, '#F8E6A4');
  goldStrokeGrad.addColorStop(1, '#9A741B');

  ctx.strokeStyle = goldStrokeGrad;
  ctx.lineWidth = 14;
  ctx.strokeRect(margin, margin, pW, pH);

  ctx.strokeStyle = '#6B1D2F';
  ctx.lineWidth = 5;
  ctx.strokeRect(margin + 24, margin + 24, pW - 48, pH - 48);

  ctx.strokeStyle = goldStrokeGrad;
  ctx.lineWidth = 6;
  ctx.strokeRect(margin + 42, margin + 42, pW - 84, pH - 84);

  ctx.strokeStyle = 'rgba(184, 142, 40, 0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(margin + 60, margin + 60, pW - 120, pH - 120);

  // 4. Ornate 4-Corner Filigree Medallions
  drawCornerFiligree(ctx, margin + 42, margin + 42, 1, 1);
  drawCornerFiligree(ctx, W - margin - 42, margin + 42, -1, 1);
  drawCornerFiligree(ctx, margin + 42, H - margin - 42, 1, -1);
  drawCornerFiligree(ctx, W - margin - 42, H - margin - 42, -1, -1);

  // 5. Crown Emblem & Top Banner
  drawCrownCanvas(ctx, W / 2, 278, 1.25);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#6B1D2F';
  ctx.font = '700 32px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('KERAJAAN RIBUAN KISAH  ·  KINGDOM OF STORIES', W / 2, 398);

  // 6. Main Required Titles
  ctx.fillStyle = '#101933';
  ctx.font = '700 94px "Cinzel", Georgia, serif';
  ctx.fillText('SIJIL PENGHARGAAN DIRAJA', W / 2, 514);

  // Decorative divider under main title
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 480, 548);
  ctx.lineTo(W / 2 - 42, 548);
  ctx.moveTo(W / 2 + 42, 548);
  ctx.lineTo(W / 2 + 480, 548);
  ctx.stroke();

  ctx.fillStyle = '#D4AF37';
  ctx.beginPath();
  ctx.moveTo(W / 2, 536);
  ctx.lineTo(W / 2 + 14, 548);
  ctx.lineTo(W / 2, 560);
  ctx.lineTo(W / 2 - 14, 548);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#8F6A16';
  ctx.font = '700 46px "Cinzel", Georgia, serif';
  ctx.fillText('Anugerah Wira Penyelamat Kerajaan', W / 2, 626);

  // 7. Recipient Lead-in & Dynamic Auto-Scaled Real Student Name
  ctx.fillStyle = '#2B395C';
  ctx.font = '500 34px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Dengan penuh kemuliaan dan sukacita diperakui bahawa', W / 2, 738);

  const safeName = (payload.studentName || 'Wira Kerajaan').trim();
  let nameFontSize = 98;
  ctx.font = `700 ${nameFontSize}px "Cinzel", Georgia, serif`;
  while (ctx.measureText(safeName).width > 2150 && nameFontSize > 48) {
    nameFontSize -= 4;
    ctx.font = `700 ${nameFontSize}px "Cinzel", Georgia, serif`;
  }
  ctx.fillStyle = '#101933';
  ctx.fillText(safeName, W / 2, 872);

  // Gold underline beneath student name
  const nameLineWidth = Math.min(1850, Math.max(760, ctx.measureText(safeName).width + 140));
  ctx.strokeStyle = '#C9A234';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(W / 2 - nameLineWidth / 2, 902);
  ctx.lineTo(W / 2 + nameLineWidth / 2, 902);
  ctx.stroke();

  const heroName = HEROES.find((h) => h.id === payload.selectedHero)?.name || 'Ayden';
  ctx.fillStyle = '#6B1D2F';
  ctx.font = '700 34px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    `Kelas ${payload.className || 'Kota Diraja'}  ·  Wira Pilihan: ${heroName}`,
    W / 2,
    964,
  );

  // 8. Recognition Paragraph (completing all 5 missions in Kingdom of Stories)
  const recognitionLines = [
    `telah menyempurnakan kelima-lima misi pembelajaran (${payload.completedCount} / 5 misi lengkap) dengan cemerlang`,
    'dalam pengembaraan interaktif Kingdom of Stories, memulihkan jam menara kota,',
    'menghidupkan semula cahaya Festival Cahaya Diraja serta memelihara warisan hikayat kerajaan.',
  ];
  ctx.fillStyle = '#1B2948';
  ctx.font = '500 35px "Plus Jakarta Sans", sans-serif';
  recognitionLines.forEach((line, idx) => {
    ctx.fillText(line, W / 2, 1086 + idx * 54);
  });

  // 9. Mission Completion Crest Ribbon
  ctx.fillStyle = '#EFE2C2';
  ctx.strokeStyle = '#C9A234';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(W / 2 - 580, 1286, 1160, 74, 37);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#101933';
  ctx.font = '700 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    '5 / 5 MISI DISELAMATKAN  ·  PENGIKTIRAFAN RASMI PENYELAMAT KOTA DIRAJA',
    W / 2,
    1333,
  );

  // 10. Bottom Row: Date (Left) · Royal Wax Seal (Center) · Penjaga Diraja (Right)
  const bottomY = 1675;
  const leftX = 630;
  const rightX = W - 630;
  const formattedDate = formatRoyalCertificateDate(payload.issuedAt);
  const guardianName = payload.guardianTitle || 'Penjaga Diraja';

  // Left: Date
  ctx.fillStyle = '#101933';
  ctx.font = '700 34px "Cinzel", Georgia, serif';
  ctx.fillText(formattedDate, leftX, bottomY - 22);
  ctx.strokeStyle = '#8F6A16';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(leftX - 240, bottomY);
  ctx.lineTo(leftX + 240, bottomY);
  ctx.stroke();
  ctx.fillStyle = '#475577';
  ctx.font = '600 26px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Tarikh Penyampaian Sijil', leftX, bottomY + 46);

  // Center: Burgundy Royal Wax Seal
  drawRoyalWaxSeal(ctx, W / 2, bottomY - 12);

  // Right: Penjaga Diraja
  ctx.fillStyle = '#101933';
  ctx.font = '700 36px "Cinzel", Georgia, serif';
  ctx.fillText(guardianName, rightX, bottomY - 22);
  ctx.strokeStyle = '#8F6A16';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(rightX - 260, bottomY);
  ctx.lineTo(rightX + 260, bottomY);
  ctx.stroke();
  ctx.fillStyle = '#475577';
  ctx.font = '600 26px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Penjaga Agung Kota Diraja · Kingdom of Stories', rightX, bottomY + 46);

  return canvas;
}

export function buildRoyalCertificatePdfDocument(payload: RoyalCertificatePayload): jsPDF {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  doc.setProperties({
    title: `SIJIL PENGHARGAAN DIRAJA - ${payload.studentName}`,
    subject: 'Anugerah Wira Penyelamat Kerajaan · Kingdom of Stories',
    creator: 'Kingdom of Stories',
    author: payload.guardianTitle || 'Penjaga Diraja',
  });

  if (typeof document !== 'undefined') {
    const canvas = renderCertificateCanvas(payload);
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    doc.addImage(imgData, 'JPEG', 0, 0, 297, 210);
  } else {
    // Pure vector fallback for headless/non-DOM verification
    doc.setFillColor(16, 25, 51);
    doc.rect(0, 0, 297, 210, 'F');
    doc.setFillColor(250, 243, 227);
    doc.rect(10, 10, 277, 190, 'F');
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(1.5);
    doc.rect(10, 10, 277, 190, 'S');
    doc.setDrawColor(107, 29, 47);
    doc.setLineWidth(0.6);
    doc.rect(13, 13, 271, 184, 'S');

    doc.setTextColor(16, 25, 51);
    doc.setFont('times', 'bold');
    doc.setFontSize(26);
    doc.text('SIJIL PENGHARGAAN DIRAJA', 148.5, 45, { align: 'center' });

    doc.setTextColor(143, 106, 22);
    doc.setFontSize(15);
    doc.text('Anugerah Wira Penyelamat Kerajaan', 148.5, 57, { align: 'center' });

    doc.setTextColor(16, 25, 51);
    doc.setFontSize(24);
    doc.text(payload.studentName, 148.5, 92, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Kelas ${payload.className}`, 148.5, 103, { align: 'center' });
    doc.text(
      `Berjaya menyelesaikan ${payload.completedCount} / 5 misi dalam Kingdom of Stories.`,
      148.5,
      120,
      { align: 'center' },
    );

    const formattedDate = formatRoyalCertificateDate(payload.issuedAt);
    doc.text(formattedDate, 65, 168, { align: 'center' });
    doc.text('Tarikh Penyampaian Sijil', 65, 176, { align: 'center' });

    doc.setFillColor(107, 29, 47);
    doc.circle(148.5, 166, 12, 'F');

    doc.text(payload.guardianTitle || 'Penjaga Diraja', 232, 168, { align: 'center' });
    doc.text('Kingdom of Stories', 232, 176, { align: 'center' });
  }

  return doc;
}

export function createCertificateFilename(studentName: string): string {
  const slug = (studentName || 'wira')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `sijil-penghargaan-diraja-${slug || 'wira'}.pdf`;
}

export function downloadRoyalCertificatePdf(payload: RoyalCertificatePayload): {
  ok: boolean;
  filename: string;
} {
  const doc = buildRoyalCertificatePdfDocument(payload);
  const filename = createCertificateFilename(payload.studentName);
  doc.save(filename);
  return { ok: true, filename };
}
