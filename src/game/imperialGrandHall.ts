import * as THREE from 'three';
import type { LocationId, PlayerProgress } from '../types/game';
import { createNpcCharacter } from './characters';
import type { MaterialPalette } from './materials';
import type {
  BoxCollider,
  BuiltWorld,
  CircleCollider,
  InteractablePoint,
  PortalTargetPoint,
} from './worlds';

export type PortalTheme = 'citadel' | 'library' | 'woods' | 'atelier' | 'voice' | 'theatre';

export interface GrandHallSharedHelpers {
  buildOrganicTree: (
    x: number,
    y: number,
    z: number,
    scale: number,
    hueOffset: number,
    tg: <T extends THREE.BufferGeometry>(g: T) => T,
    tm: <T extends THREE.Material>(m: T) => T,
    mats: MaterialPalette,
    withBlossoms?: boolean,
  ) => THREE.Group;
  createArchitecturalPortal: (
    theme: PortalTheme,
    colorHex: number,
    unlocked: boolean,
    tg: <T extends THREE.BufferGeometry>(g: T) => T,
    tm: <T extends THREE.Material>(m: T) => T,
    mats: MaterialPalette,
  ) => { group: THREE.Group; ring: THREE.Mesh; vortex: THREE.Mesh; previewObj: THREE.Group };
}

function makeRoyalPaintingTexture(
  kind: 'crown' | 'library' | 'woods' | 'starlight' | 'portraitA' | 'portraitB',
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  if (kind === 'crown') {
    const bg = ctx.createLinearGradient(0, 0, 0, 512);
    bg.addColorStop(0, '#D8E7F5');
    bg.addColorStop(0.55, '#F4E5CA');
    bg.addColorStop(1, '#7D6AA6');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 512);

    // Sun rays & royal citadel silhouette
    ctx.fillStyle = 'rgba(255, 240, 190, 0.55)';
    ctx.beginPath();
    ctx.arc(256, 175, 95, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#33487D';
    ctx.fillRect(140, 260, 232, 180);
    ctx.beginPath();
    ctx.moveTo(130, 260);
    ctx.lineTo(185, 165);
    ctx.lineTo(240, 260);
    ctx.lineTo(256, 130);
    ctx.lineTo(272, 260);
    ctx.lineTo(327, 165);
    ctx.lineTo(382, 260);
    ctx.closePath();
    ctx.fill();

    // Floating golden crown motif
    ctx.fillStyle = '#E6C25A';
    ctx.beginPath();
    ctx.moveTo(206, 118);
    ctx.lineTo(196, 72);
    ctx.lineTo(232, 96);
    ctx.lineTo(256, 56);
    ctx.lineTo(280, 96);
    ctx.lineTo(316, 72);
    ctx.lineTo(306, 118);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'library') {
    const bg = ctx.createLinearGradient(0, 0, 0, 512);
    bg.addColorStop(0, '#9ADCE6');
    bg.addColorStop(0.5, '#E7D8F2');
    bg.addColorStop(1, '#2D4173');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 512);

    // Tall arched stained window & open glowing manuscript
    ctx.fillStyle = '#FAF2DF';
    ctx.beginPath();
    ctx.arc(256, 180, 95, Math.PI, 0);
    ctx.lineTo(351, 340);
    ctx.lineTo(161, 340);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#73DCE4';
    ctx.beginPath();
    ctx.arc(256, 185, 72, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#E5C35A';
    ctx.fillRect(156, 365, 200, 68);
  } else if (kind === 'woods') {
    const bg = ctx.createLinearGradient(0, 0, 0, 512);
    bg.addColorStop(0, '#D7F2E8');
    bg.addColorStop(0.55, '#9BD1AC');
    bg.addColorStop(1, '#44785A');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 512);

    // Enchanted canopy silhouettes & turquoise waterfall
    [130, 256, 382].forEach((tx, idx) => {
      ctx.fillStyle = idx === 1 ? '#5CA378' : '#3C7554';
      ctx.beginPath();
      ctx.arc(tx, 210 + (idx % 2) * 28, 92, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = '#7CE0E6';
    ctx.fillRect(216, 260, 80, 210);
  } else if (kind === 'starlight') {
    const bg = ctx.createLinearGradient(0, 0, 0, 512);
    bg.addColorStop(0, '#2B3E70');
    bg.addColorStop(0.5, '#8A71B8');
    bg.addColorStop(1, '#E6B7C6');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 512);

    // Golden astrolabe rings & stars
    ctx.strokeStyle = '#E8C86E';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(256, 236, 118, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(256, 236, 76, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#FFE89D';
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(256 + Math.cos(a) * 165, 236 + Math.sin(a) * 165, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Historical Kingdom Royal Portrait (portraitA = Sovereign / Scholar, portraitB = Guardian / Envoy)
    const isA = kind === 'portraitA';
    const bg = ctx.createRadialGradient(256, 210, 35, 256, 256, 280);
    bg.addColorStop(0, isA ? '#F2E0C4' : '#DCEBF2');
    bg.addColorStop(0.6, isA ? '#6C5596' : '#2C4278');
    bg.addColorStop(1, '#1A2444');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 512);

    // Royal cloak & shoulders
    ctx.fillStyle = isA ? '#9C516C' : '#2A5949';
    ctx.beginPath();
    ctx.moveTo(116, 480);
    ctx.quadraticCurveTo(156, 285, 256, 285);
    ctx.quadraticCurveTo(356, 285, 396, 480);
    ctx.closePath();
    ctx.fill();

    // Golden royal collar & medallion
    ctx.fillStyle = '#E5C35A';
    ctx.beginPath();
    ctx.ellipse(256, 300, 68, 28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stylized royal silhouette head & crown
    ctx.fillStyle = '#F2CBAE';
    ctx.beginPath();
    ctx.ellipse(256, 210, 52, 66, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#E5C35A';
    ctx.beginPath();
    ctx.moveTo(206, 158);
    ctx.lineTo(198, 108);
    ctx.lineTo(232, 134);
    ctx.lineTo(256, 94);
    ctx.lineTo(280, 134);
    ctx.lineTo(314, 108);
    ctx.lineTo(306, 158);
    ctx.closePath();
    ctx.fill();
  }

  // Painted gilded inner border
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 14;
  ctx.strokeRect(14, 14, 484, 484);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeRoyalClockDialTexture(unlocked: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const cx = 256;
  const cy = 256;

  const grad = ctx.createRadialGradient(cx, cy, 20, cx, cy, 256);
  grad.addColorStop(0, unlocked ? '#FFF9E8' : '#E7ECF4');
  grad.addColorStop(0.75, unlocked ? '#F5E4B8' : '#C8D2E2');
  grad.addColorStop(1, '#B39344');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Outer chapter ring & celestial filigree
  ctx.strokeStyle = '#9D7B2B';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(cx, cy, 232, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#1E315E';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, 184, 0, Math.PI * 2);
  ctx.stroke();

  // 12 Hour Markers & Gem Diamonds
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const mx = cx + Math.cos(a) * 208;
    const my = cy + Math.sin(a) * 208;
    ctx.fillStyle = i % 3 === 0 ? '#7DE3E8' : '#1E315E';
    ctx.beginPath();
    ctx.arc(mx, my, i % 3 === 0 ? 12 : 7, 0, Math.PI * 2);
    ctx.fill();
  }

  // Sunburst compass in center
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < 12; i++) {
    ctx.rotate((Math.PI * 2) / 12);
    ctx.fillStyle = i % 2 === 0 ? 'rgba(212, 175, 55, 0.42)' : 'rgba(30, 49, 94, 0.14)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-14, -145);
    ctx.lineTo(14, -145);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface RoyalHubPortalConfig {
  missionNumber: 1 | 2 | 3 | 4 | 5;
  target: LocationId;
  theme: PortalTheme;
  title: string;
  subtitle: string;
  colorHex: number;
  cssHex: string;
  pos: [number, number, number];
}

const CITADEL_PORTAL_CONFIGS: RoyalHubPortalConfig[] = [
  {
    missionNumber: 1,
    target: 'library',
    theme: 'library',
    title: 'Pustaka Agung Hikayat Diraja',
    subtitle: 'Kemahiran Mendengar & Kefahaman',
    colorHex: 0x38bdf8,
    cssHex: '#38BDF8',
    pos: [-10.6, 0, -2.2],
  },
  {
    missionNumber: 2,
    target: 'woods',
    theme: 'woods',
    title: 'Rimba Cahaya Mahkota',
    subtitle: 'Kronologi & Susunan Peristiwa',
    colorHex: 0x34d399,
    cssHex: '#34D399',
    pos: [-8.8, 0, -10.4],
  },
  {
    missionNumber: 3,
    target: 'atelier',
    theme: 'atelier',
    title: 'Balai Cipta Mahkota',
    subtitle: 'Arkitek Kisah & Skrip Digital',
    colorHex: 0xa78bfa,
    cssHex: '#A78BFA',
    pos: [0, 0, -13.6],
  },
  {
    missionNumber: 4,
    target: 'atelier',
    theme: 'voice',
    title: 'Balai Gema Diraja',
    subtitle: 'Rakaman Suara & Penceritaan',
    colorHex: 0xf472b6,
    cssHex: '#F472B6',
    pos: [8.8, 0, -10.4],
  },
  {
    missionNumber: 5,
    target: 'theatre',
    theme: 'theatre',
    title: 'Balairung Gemilang Diraja',
    subtitle: 'Pentas Persembahan Diraja',
    colorHex: 0xfbbf24,
    cssHex: '#FBBF24',
    pos: [10.6, 0, -2.2],
  },
];

function makeCitadelPortalSignTexture(
  missionNumber: number,
  title: string,
  accentHex: string,
  completed: boolean,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 224;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 768, 224);
  grad.addColorStop(0, '#0E1734');
  grad.addColorStop(0.5, '#1B2C5D');
  grad.addColorStop(1, '#0E1734');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 768, 224);

  ctx.strokeStyle = '#E6C66A';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 748, 204);

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 3;
  ctx.strokeRect(22, 22, 724, 180);

  ctx.fillStyle = accentHex;
  ctx.font = 'bold 34px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const statusTag = completed ? ' · SELESAI' : '';
  ctx.fillText(`MISI ${missionNumber}${statusTag}`, 384, 70);

  ctx.fillStyle = 'rgba(230, 198, 106, 0.58)';
  ctx.fillRect(140, 104, 488, 2);

  ctx.fillStyle = '#FAF6EE';
  ctx.font = title.length > 26 ? 'bold 33px Georgia, serif' : 'bold 38px Georgia, serif';
  ctx.fillText(title, 384, 154);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makeCitadelSwirlTexture(colorHex: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const c = new THREE.Color(colorHex);
  const r = Math.round(c.r * 255);
  const g = Math.round(c.g * 255);
  const b = Math.round(c.b * 255);

  ctx.clearRect(0, 0, 512, 512);
  const radial = ctx.createRadialGradient(256, 256, 16, 256, 256, 250);
  radial.addColorStop(0, 'rgba(255, 255, 255, 0.96)');
  radial.addColorStop(0.28, `rgba(${r}, ${g}, ${b}, 0.88)`);
  radial.addColorStop(0.72, `rgba(${r}, ${g}, ${b}, 0.44)`);
  radial.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.0)`);
  ctx.fillStyle = radial;
  ctx.beginPath();
  ctx.arc(256, 256, 250, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(256, 256);
  for (let arm = 0; arm < 5; arm++) {
    ctx.rotate((Math.PI * 2) / 5);
    ctx.strokeStyle = 'rgba(255, 252, 240, 0.6)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    for (let t = 0; t <= 1; t += 0.04) {
      const ang = t * Math.PI * 1.45;
      const rad = 20 + t * 205;
      const sx = Math.cos(ang) * rad;
      const sy = Math.sin(ang) * rad;
      if (t === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function buildImperialGrandHall(
  mats: MaterialPalette,
  progress: PlayerProgress,
  isSoftwareGl: boolean,
  helpers: GrandHallSharedHelpers,
): BuiltWorld {
  const group = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const localMats: THREE.Material[] = [];
  const localTextures: THREE.Texture[] = [];
  const disposables: Array<() => void> = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    localMats.push(m);
    return m;
  };
  const trackTex = <T extends THREE.Texture>(t: T): T => {
    localTextures.push(t);
    return t;
  };

  const circleColliders: CircleCollider[] = [];
  const boxColliders: BoxCollider[] = [];
  const interactables: InteractablePoint[] = [];
  const portalTargets: PortalTargetPoint[] = [];
  const animatedUpdates: Array<(elapsed: number, dt: number, playerPos?: THREE.Vector3) => void> = [];

  const addBeaconMarker = (x: number, y: number, z: number, colorHex: number): THREE.Mesh => {
    const marker = new THREE.Mesh(
      trackGeo(new THREE.OctahedronGeometry(0.22, 0)),
      trackMat(
        new THREE.MeshStandardMaterial({
          color: colorHex,
          emissive: colorHex,
          emissiveIntensity: 0.85,
          roughness: 0.18,
          metalness: 0.45,
        }),
      ),
    );
    marker.position.set(x, y, z);
    group.add(marker);
    animatedUpdates.push((elapsed) => {
      marker.rotation.y = elapsed * 1.8;
      marker.position.y = y + Math.sin(elapsed * 2.4 + x) * 0.14;
    });
    return marker;
  };

  // ============================================================================
  // HELPER ARCHITECTURAL & DECORATIVE BUILDERS (ALL COMPOSITE 3D GROUPS)
  // ============================================================================

  // A. Tiered Crystal Chandelier (Central Imperial 3-Tier or Complementary 2-Tier)
  const buildRoyalChandelier = (isGrandCentral: boolean): THREE.Group => {
    const chand = new THREE.Group();
    const chainLen = isGrandCentral ? 5.2 : 4.2;

    // Ceiling gold medallion rosette + suspension rod
    const rosette = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(isGrandCentral ? 1.1 : 0.72, isGrandCentral ? 0.55 : 0.35, 0.32, 18)),
      mats.antiqueGold,
    );
    rosette.position.y = chainLen;
    const rod = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.06, 0.08, chainLen, 10)), mats.antiqueGold);
    rod.position.y = chainLen * 0.5;
    const coreCrystal = new THREE.Mesh(
      trackGeo(new THREE.OctahedronGeometry(isGrandCentral ? 0.52 : 0.34, 0)),
      mats.chandelierCrystal,
    );
    coreCrystal.scale.set(0.85, 1.5, 0.85);
    coreCrystal.position.y = -0.35;
    chand.add(rosette, rod, coreCrystal);

    const tiers = isGrandCentral
      ? [
          { r: 2.35, y: 0.35, count: 12 },
          { r: 1.55, y: -0.55, count: 8 },
          { r: 0.85, y: -1.35, count: 6 },
        ]
      : [
          { r: 1.5, y: 0.15, count: 8 },
          { r: 0.88, y: -0.68, count: 6 },
        ];

    tiers.forEach((tier, tIdx) => {
      const ring = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(tier.r, isGrandCentral ? 0.075 : 0.055, 10, 32)),
        mats.champagneGold,
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = tier.y;
      chand.add(ring);

      for (let i = 0; i < tier.count; i++) {
        const a = (i / tier.count) * Math.PI * 2;
        const cx = Math.cos(a) * tier.r;
        const cz = Math.sin(a) * tier.r;

        // Curved golden arm connecting core to tier ring (on upper & mid tiers)
        if (tIdx < 2 && i % (isGrandCentral ? 2 : 2) === 0) {
          const armCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(Math.cos(a) * 0.12, tier.y + 0.55, Math.sin(a) * 0.12),
            new THREE.Vector3(cx * 0.58, tier.y + 0.15, cz * 0.58),
            new THREE.Vector3(cx, tier.y, cz),
          ]);
          const arm = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(armCurve, 10, 0.032, 6, false)), mats.antiqueGold);
          chand.add(arm);
        }

        const cup = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.085, 0.04, 0.07, 10)), mats.chandelierCrystal);
        cup.position.set(cx, tier.y + 0.05, cz);
        const candle = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.036, 0.042, 0.25, 8)), mats.pearlIvory);
        candle.position.set(cx, tier.y + 0.19, cz);
        const flame = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.068, 0)), mats.candleFlame);
        flame.scale.set(0.75, 1.45, 0.75);
        flame.position.set(cx, tier.y + 0.36, cz);

        const prism = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.115, 0)), mats.chandelierCrystal);
        prism.scale.set(0.65, 1.85, 0.65);
        prism.position.set(cx, tier.y - 0.28, cz);
        chand.add(cup, candle, flame, prism);
      }
    });

    const bottomFinial = new THREE.Mesh(
      trackGeo(new THREE.OctahedronGeometry(isGrandCentral ? 0.36 : 0.24, 0)),
      mats.crystalTurquoise,
    );
    bottomFinial.scale.set(0.78, 1.9, 0.78);
    bottomFinial.position.y = isGrandCentral ? -2.25 : -1.35;
    chand.add(bottomFinial);

    return chand;
  };

  // B. Crystal Wall Sconce
  const buildWallSconce = (): THREE.Group => {
    const sconce = new THREE.Group();
    const backplate = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.24, 0.18, 0.08, 12)), mats.antiqueGold);
    backplate.rotation.x = Math.PI / 2;
    sconce.add(backplate);

    [-0.18, 0.18].forEach((ox) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, -0.04, 0.04),
        new THREE.Vector3(ox * 0.7, -0.08, 0.22),
        new THREE.Vector3(ox, 0.08, 0.32),
      ]);
      const arm = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(curve, 8, 0.022, 6, false)), mats.champagneGold);
      const cup = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.075, 0.03, 0.08, 10)), mats.chandelierCrystal);
      cup.position.set(ox, 0.12, 0.32);
      const flame = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.065, 0)), mats.candleFlame);
      flame.scale.set(0.75, 1.45, 0.75);
      flame.position.set(ox, 0.25, 0.32);
      sconce.add(arm, cup, flame);
    });
    return sconce;
  };

  // C. Framed Royal Painting / Historical Portrait
  const buildFramedPainting = (
    tex: THREE.Texture,
    width: number,
    height: number,
    colorRatio: number,
  ): THREE.Group => {
    const pGroup = new THREE.Group();
    const frameOuter = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(width + 0.56, height + 0.56, 0.18)),
      mats.antiqueGold,
    );
    const frameInner = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(width + 0.24, height + 0.24, 0.22)),
      mats.champagneGold,
    );

    const tint = new THREE.Color(0x9ca2b0).lerp(new THREE.Color(0xffffff), Math.max(0.45, colorRatio));
    const canvasMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: tex,
        color: tint,
        emissiveMap: tex,
        emissive: new THREE.Color(0xfff4dd),
        emissiveIntensity: 0.08 + colorRatio * 0.16,
        roughness: 0.42,
      }),
    );
    const paintingPlane = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(width, height)), canvasMat);
    paintingPlane.position.z = 0.12;

    // Top golden crest medallion & picture lamp bar
    const topCrest = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.22, 0)), mats.champagneGold);
    topCrest.scale.set(1.3, 0.85, 0.4);
    topCrest.position.set(0, height * 0.5 + 0.36, 0.08);

    const lampBar = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.035, 0.035, width * 0.55, 8)), mats.antiqueGold);
    lampBar.rotation.z = Math.PI / 2;
    lampBar.position.set(0, height * 0.5 + 0.18, 0.28);

    pGroup.add(frameOuter, frameInner, paintingPlane, topCrest, lampBar);
    return pGroup;
  };

  // D. Draped Royal Banner
  const buildRoyalBanner = (fabricMat: THREE.Material, width = 1.65, height = 5.0): THREE.Group => {
    const bGroup = new THREE.Group();
    const rod = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.045, 0.045, width + 0.55, 10)), mats.antiqueGold);
    rod.rotation.z = Math.PI / 2;
    rod.position.y = height * 0.5 + 0.06;

    [-1, 1].forEach((side) => {
      const finial = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.09, 0.24, 8)), mats.champagneGold);
      finial.rotation.z = -side * Math.PI / 2;
      finial.position.set(side * (width * 0.5 + 0.34), height * 0.5 + 0.06, 0);
      bGroup.add(finial);
    });

    const cloth = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(width, height, 4, 8)), fabricMat);
    const goldEdgeL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.09, height, 0.04)), mats.antiqueGold);
    goldEdgeL.position.x = -width * 0.48;
    const goldEdgeR = goldEdgeL.clone();
    goldEdgeR.position.x = width * 0.48;

    const tipTriangle = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(width * 0.5, 0.72, 4)), fabricMat);
    tipTriangle.rotation.x = Math.PI;
    tipTriangle.rotation.y = Math.PI / 4;
    tipTriangle.scale.set(1.2, 1, 0.08);
    tipTriangle.position.y = -height * 0.5 - 0.34;

    const emblem = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(width * 0.28, 24)), mats.royalCrestMat);
    emblem.position.set(0, height * 0.1, 0.03);
    const emblemRim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(width * 0.29, 0.035, 8, 24)), mats.champagneGold);
    emblemRim.position.set(0, height * 0.1, 0.035);

    bGroup.add(rod, cloth, goldEdgeL, goldEdgeR, tipTriangle, emblem, emblemRim);
    return bGroup;
  };

  // E. Sculpted Large Golden Royal Statue on Fluted Marble Pedestal
  const buildRoyalStatue = (x: number, z: number, facingYaw: number) => {
    const sGroup = new THREE.Group();
    sGroup.position.set(x, 0, z);
    sGroup.rotation.y = facingYaw;

    const plinth = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.5, 0.45, 1.5)), mats.warmIvoryMarble);
    plinth.position.y = 0.225;
    plinth.castShadow = true;
    plinth.receiveShadow = true;

    const pedShaft = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.54, 0.66, 1.15, 16)), mats.creamStone);
    pedShaft.position.y = 1.02;
    pedShaft.castShadow = true;

    const pedCap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.32, 0.22, 1.32)), mats.antiqueGold);
    pedCap.position.y = 1.68;

    // Draped golden royal figure (Lathe gown + sculpted torso + head + halo crown + wings + torch)
    const gownPts = [
      new THREE.Vector2(0.46, 0),
      new THREE.Vector2(0.38, 0.5),
      new THREE.Vector2(0.24, 1.1),
      new THREE.Vector2(0.26, 1.48),
      new THREE.Vector2(0.14, 1.65),
    ];
    const figureGown = new THREE.Mesh(trackGeo(new THREE.LatheGeometry(gownPts, 16)), mats.champagneGold);
    figureGown.position.y = 1.79;
    figureGown.castShadow = true;

    const head = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.17, 14, 14)), mats.champagneGold);
    head.position.y = 3.62;
    const crownHalo = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.25, 0.028, 8, 20)), mats.antiqueGold);
    crownHalo.position.set(0, 3.68, -0.06);

    [-1, 1].forEach((w) => {
      const wing = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.28, 1.15, 5)), mats.antiqueGold);
      wing.position.set(w * 0.36, 3.15, -0.18);
      wing.rotation.z = -w * 0.48;
      wing.rotation.x = -0.18;
      wing.scale.set(0.85, 1, 0.22);
      sGroup.add(wing);
    });

    const arm = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.055, 0.065, 0.72, 8)), mats.champagneGold);
    arm.position.set(0.24, 3.35, 0.22);
    arm.rotation.x = -0.45;
    const torchCrystal = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.15, 0)), mats.crystalTurquoise);
    torchCrystal.position.set(0.26, 3.76, 0.38);

    sGroup.add(plinth, pedShaft, pedCap, figureGown, head, crownHalo, arm, torchCrystal);
    group.add(sGroup);
    circleColliders.push({ x, z, radius: 0.92 });
  };

  // F. Royal Vase with Multi-Layered Flower Arrangement
  const buildRoyalFlowerUrn = (x: number, z: number, withCollider = true) => {
    const vGroup = new THREE.Group();
    vGroup.position.set(x, 0, z);

    const ped = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.55, 0.66, 0.82, 16)), mats.warmIvoryMarble);
    ped.position.y = 0.41;
    ped.castShadow = true;
    const pedGold = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.56, 0.04, 8, 24)), mats.antiqueGold);
    pedGold.rotation.x = Math.PI / 2;
    pedGold.position.y = 0.82;

    const urnPts = [
      new THREE.Vector2(0.24, 0),
      new THREE.Vector2(0.15, 0.14),
      new THREE.Vector2(0.42, 0.46),
      new THREE.Vector2(0.36, 0.76),
      new THREE.Vector2(0.46, 0.92),
    ];
    const urn = new THREE.Mesh(trackGeo(new THREE.LatheGeometry(urnPts, 18)), mats.pearlIvory);
    urn.position.y = 0.82;
    urn.castShadow = true;

    const urnRim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.45, 0.04, 8, 20)), mats.antiqueGold);
    urnRim.rotation.x = Math.PI / 2;
    urnRim.position.y = 1.74;

    // Botanical greenery clusters + dusty rose, lavender & ivory blossoms
    const leafDome = new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(0.52, 1)), mats.emeraldCanopy);
    leafDome.scale.set(1.15, 0.72, 1.15);
    leafDome.position.y = 1.92;
    vGroup.add(ped, pedGold, urn, urnRim, leafDome);

    const blossomMats = [mats.dustyRoseVelvet, mats.lavenderWall, mats.pearlIvory];
    for (let b = 0; b < 9; b++) {
      const a = (b / 9) * Math.PI * 2;
      const rad = b === 0 ? 0 : 0.34;
      const flower = new THREE.Mesh(
        trackGeo(new THREE.DodecahedronGeometry(b === 0 ? 0.16 : 0.125, 0)),
        blossomMats[b % blossomMats.length],
      );
      flower.position.set(Math.cos(a) * rad, b === 0 ? 2.28 : 2.02 + (b % 2) * 0.14, Math.sin(a) * rad);
      vGroup.add(flower);
    }

    group.add(vGroup);
    if (withCollider) circleColliders.push({ x, z, radius: 0.75 });
  };

  // G. Ornate 5-Arm Standing Golden Candelabra
  const buildStandingCandelabra = (x: number, z: number) => {
    const cGroup = new THREE.Group();
    cGroup.position.set(x, 0, z);

    const standPts = [
      new THREE.Vector2(0.42, 0),
      new THREE.Vector2(0.32, 0.2),
      new THREE.Vector2(0.11, 0.55),
      new THREE.Vector2(0.08, 1.65),
      new THREE.Vector2(0.16, 1.85),
    ];
    const stem = new THREE.Mesh(trackGeo(new THREE.LatheGeometry(standPts, 14)), mats.antiqueGold);
    stem.castShadow = true;
    cGroup.add(stem);

    const arms: Array<[number, number, number]> = [
      [0, 2.15, 0],
      [-0.42, 1.98, 0],
      [0.42, 1.98, 0],
      [0, 1.98, -0.42],
      [0, 1.98, 0.42],
    ];
    arms.forEach(([ax, ay, az], idx) => {
      if (idx > 0) {
        const armCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 1.72, 0),
          new THREE.Vector3(ax * 0.65, 1.76, az * 0.65),
          new THREE.Vector3(ax, ay - 0.05, az),
        ]);
        const armMesh = new THREE.Mesh(
          trackGeo(new THREE.TubeGeometry(armCurve, 10, 0.025, 6, false)),
          mats.champagneGold,
        );
        cGroup.add(armMesh);
      }
      const candle = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.04, 0.045, 0.26, 8)), mats.pearlIvory);
      candle.position.set(ax, ay + 0.1, az);
      const flame = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.068, 0)), mats.candleFlame);
      flame.scale.set(0.75, 1.45, 0.75);
      flame.position.set(ax, ay + 0.29, az);
      cGroup.add(candle, flame);
    });

    group.add(cGroup);
    circleColliders.push({ x, z, radius: 0.55 });
  };

  // H. Crystal Sculpture Pedestal & Decorative Golden Floor Lamp
  const buildCrystalSculpture = (x: number, z: number) => {
    const csGroup = new THREE.Group();
    csGroup.position.set(x, 0, z);
    const ped = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.5, 0.62, 1.2, 14)), mats.warmIvoryMarble);
    ped.position.y = 0.6;
    const goldBowl = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.58, 0.35, 0.24, 14)), mats.antiqueGold);
    goldBowl.position.y = 1.32;

    const mainCrystal = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.38, 0)), mats.chandelierCrystal);
    mainCrystal.scale.set(0.72, 1.85, 0.72);
    mainCrystal.position.y = 1.98;
    csGroup.add(ped, goldBowl, mainCrystal);

    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      const shard = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.22, 0)), mats.crystalTurquoise);
      shard.scale.set(0.6, 1.7, 0.6);
      shard.position.set(Math.cos(a) * 0.24, 1.72, Math.sin(a) * 0.24);
      shard.rotation.z = -Math.cos(a) * 0.35;
      shard.rotation.x = Math.sin(a) * 0.35;
      csGroup.add(shard);
    }

    group.add(csGroup);
    circleColliders.push({ x, z, radius: 0.7 });
  };

  const buildGoldenFloorLamp = (x: number, z: number) => {
    const lGroup = new THREE.Group();
    lGroup.position.set(x, 0, z);
    const base = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.32, 0.45, 0.4, 12)), mats.warmIvoryMarble);
    base.position.y = 0.2;
    const pole = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.065, 0.09, 3.0, 10)), mats.antiqueGold);
    pole.position.y = 1.9;
    const lanternCap = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.34, 0.3, 8)), mats.antiqueGold);
    lanternCap.position.y = 3.85;
    const lanternOrb = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.24, 1)), mats.candleFlame);
    lanternOrb.position.y = 3.56;
    const lanternCage = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.26, 0.025, 6, 16)), mats.champagneGold);
    lanternCage.position.y = 3.56;
    lGroup.add(base, pole, lanternOrb, lanternCage, lanternCap);
    group.add(lGroup);
    circleColliders.push({ x, z, radius: 0.5 });
  };

  // ============================================================================
  // 1. ROYAL MARBLE FLOOR, INLAID BORDERS & CENTRAL MOSAIC (EYES TOWARD THRONE)
  // ============================================================================
  const outerLawn = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(120, 64)), mats.sageGrass);
  outerLawn.rotation.x = -Math.PI / 2;
  outerLawn.position.y = -0.04;
  outerLawn.receiveShadow = true;
  group.add(outerLawn);

  const hallFloor = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(48, 0.24, 54)), mats.marbleFloor);
  hallFloor.position.set(0, -0.12, -1);
  hallFloor.receiveShadow = true;
  group.add(hallFloor);

  // Geometric champagne-gold border inlay frames guiding down the main nave
  [-9.6, 9.6].forEach((bx) => {
    const borderStrip = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 0.018, 40)), mats.champagneGold);
    borderStrip.position.set(bx, 0.008, 1.5);
    group.add(borderStrip);
  });

  // Ceremonial Royal Blue & Gold Carpet Runner leading straight from South Arch to Throne Steps
  const naveCarpet = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(5.8, 0.024, 38.5)), mats.royalBlueBrocade);
  naveCarpet.position.set(0, 0.012, 2.0);
  naveCarpet.receiveShadow = true;
  const carpetGoldEdgeL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.22, 0.028, 38.7)), mats.antiqueGold);
  carpetGoldEdgeL.position.set(-2.95, 0.014, 2.0);
  const carpetGoldEdgeR = carpetGoldEdgeL.clone();
  carpetGoldEdgeR.position.x = 2.95;
  group.add(naveCarpet, carpetGoldEdgeL, carpetGoldEdgeR);

  // Elaborate Central Royal Mosaic Medallion with Kingdom of Stories Emblem at (0, 0.026, -1.0)
  const mosaicDisc = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(5.6, 64)), mats.royalMosaicFloor);
  mosaicDisc.rotation.x = -Math.PI / 2;
  mosaicDisc.position.set(0, 0.026, -1.0);
  mosaicDisc.receiveShadow = true;

  const mosaicOuterGold = new THREE.Mesh(trackGeo(new THREE.RingGeometry(5.52, 5.88, 64)), mats.antiqueGold);
  mosaicOuterGold.rotation.x = -Math.PI / 2;
  mosaicOuterGold.position.set(0, 0.029, -1.0);
  const mosaicInnerGold = new THREE.Mesh(trackGeo(new THREE.RingGeometry(2.1, 2.28, 48)), mats.champagneGold);
  mosaicInnerGold.rotation.x = -Math.PI / 2;
  mosaicInnerGold.position.set(0, 0.03, -1.0);
  group.add(mosaicDisc, mosaicOuterGold, mosaicInnerGold);

  // ============================================================================
  // 2. MAGNIFICENT COFFERED & FRESCOED CEILING + CRYSTAL CHANDELIERS
  // ============================================================================
  const ceilingHeight = 16.5;
  const ceiling = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(46, 0.6, 50)), mats.cofferedCeiling);
  ceiling.position.set(0, ceilingHeight, -1);
  group.add(ceiling);

  // Recessed 3D Coffered Ceiling Beams & Gold Mouldings
  [-20, -14.2, -5.5, 5.5, 14.2, 20].forEach((bx) => {
    const longBeam = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.55, 0.55, 49)), mats.warmIvoryMarble);
    longBeam.position.set(bx, ceilingHeight - 0.55, -1);
    const goldTrim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.68, 0.14, 49)), mats.antiqueGold);
    goldTrim.position.set(bx, ceilingHeight - 0.85, -1);
    group.add(longBeam, goldTrim);
  });

  // 3 Grand Fantasy Fresco Ceiling Medallions Framed in Gilded Torus Mouldings
  [-13.0, -1.5, 10.0].forEach((fz, idx) => {
    const rad = idx === 1 ? 4.8 : 3.6;
    const frescoDisc = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(rad, 48)), mats.ceilingFresco);
    frescoDisc.rotation.x = Math.PI / 2;
    frescoDisc.position.set(0, ceilingHeight - 0.32, fz);

    const frescoFrame = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(rad + 0.12, 0.22, 12, 48)), mats.antiqueGold);
    frescoFrame.rotation.x = Math.PI / 2;
    frescoFrame.position.set(0, ceilingHeight - 0.42, fz);

    const innerRim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(rad * 0.65, 0.1, 8, 36)), mats.champagneGold);
    innerRim.rotation.x = Math.PI / 2;
    innerRim.position.set(0, ceilingHeight - 0.38, fz);

    group.add(frescoDisc, frescoFrame, innerRim);
  });

  // Grand Transverse Gilded Arch Ribs with Sculpted Keystone Medallions
  [-18.5, -11.5, -4.5, 2.5, 9.5, 16.5].forEach((rz) => {
    const rib = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(19.6, 0.46, 12, 40, Math.PI)), mats.antiqueGold);
    rib.position.set(0, 11.2, rz);
    rib.scale.set(1.02, 0.27, 1);
    const keystone = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.1, 0.85, 0.95)), mats.champagneGold);
    keystone.position.set(0, 16.15, rz);
    group.add(rib, keystone);
  });

  // 1 Magnificent Central Crystal Chandelier + 4 Complementary Chandeliers
  const centralChandelier = buildRoyalChandelier(true);
  centralChandelier.position.set(0, 11.0, -1.5);
  group.add(centralChandelier);
  animatedUpdates.push((elapsed) => {
    centralChandelier.rotation.y = Math.sin(elapsed * 0.28) * 0.05;
  });

  const sideChandelierCoords: Array<[number, number, number]> = [
    [0, 12.1, -13.0],
    [0, 12.1, 10.0],
    [-16.2, 11.4, -1.5],
    [16.2, 11.4, -1.5],
  ];
  sideChandelierCoords.forEach(([cx, cy, cz], idx) => {
    const c = buildRoyalChandelier(false);
    c.position.set(cx, cy, cz);
    group.add(c);
    animatedUpdates.push((elapsed) => {
      c.rotation.y = Math.sin(elapsed * 0.35 + idx) * 0.08;
    });
  });

  // ============================================================================
  // 3. CARVED MARBLE PILLARS, MEZZANINE ARCHES & LUXURIOUS BALUSTRADES
  // ============================================================================
  const pillarZCoords = [-18.0, -9.5, -1.0, 7.5, 16.0];
  [-14.2, 14.2].forEach((sideX) => {
    const isLeft = sideX < 0;
    // Upper Mezzanine Balcony Deck + Moulded Gold Cornice
    const galleryDeck = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(7.2, 0.56, 44)), mats.warmIvoryMarble);
    galleryDeck.position.set(sideX + (isLeft ? -3.4 : 3.4), 5.6, -1);
    galleryDeck.receiveShadow = true;

    const galleryTrim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.42, 0.24, 44)), mats.antiqueGold);
    galleryTrim.position.set(sideX + (isLeft ? 0.15 : -0.15), 5.82, -1);
    const galleryTopRail = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.32, 0.16, 44)), mats.antiqueGold);
    galleryTopRail.position.set(sideX + (isLeft ? 0.15 : -0.15), 6.82, -1);
    group.add(galleryDeck, galleryTrim, galleryTopRail);

    // Ornate Mezzanine Balusters along the Upper Gallery Edge
    const balusterPts = [
      new THREE.Vector2(0.08, 0),
      new THREE.Vector2(0.11, 0.24),
      new THREE.Vector2(0.055, 0.58),
      new THREE.Vector2(0.095, 0.86),
    ];
    const balusterGeo = trackGeo(new THREE.LatheGeometry(balusterPts, 10));
    const balusterCount = 26;
    const balusterInst = new THREE.InstancedMesh(balusterGeo, mats.champagneGold, balusterCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < balusterCount; i++) {
      dummy.position.set(sideX + (isLeft ? 0.15 : -0.15), 5.9, -20.5 + i * 1.56);
      dummy.updateMatrix();
      balusterInst.setMatrixAt(i, dummy.matrix);
    }
    balusterInst.instanceMatrix.needsUpdate = true;
    balusterInst.computeBoundingSphere();
    group.add(balusterInst);

    // Massive Carved Marble Pillars & Mezzanine Arcade Arches
    pillarZCoords.forEach((pz, pIdx) => {
      const pillarGroup = new THREE.Group();
      pillarGroup.position.set(sideX, 0, pz);

      const plinth = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.96, 0.92, 1.96)), mats.warmIvoryMarble);
      plinth.position.y = 0.46;
      const plinthTrim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.08, 0.14, 2.08)), mats.antiqueGold);
      plinthTrim.position.y = 0.95;

      const latheBase = new THREE.Mesh(
        trackGeo(
          new THREE.LatheGeometry(
            [new THREE.Vector2(0.92, 0.95), new THREE.Vector2(0.76, 1.28), new THREE.Vector2(0.66, 1.5)],
            16,
          ),
        ),
        mats.antiqueGold,
      );
      const shaft = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.58, 0.67, 13.7, 16)), mats.creamStone);
      shaft.position.y = 8.35;
      shaft.castShadow = true;
      const midBand = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.68, 0.08, 8, 24)), mats.champagneGold);
      midBand.rotation.x = Math.PI / 2;
      midBand.position.y = 6.0;
      const capital = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.1, 0.62, 1.0, 16)), mats.antiqueGold);
      capital.position.y = 15.6;

      pillarGroup.add(plinth, plinthTrim, latheBase, shaft, midBand, capital);
      group.add(pillarGroup);
      circleColliders.push({ x: sideX, z: pz, radius: 1.0 });

      // Architectural Arcade Arch bridging between consecutive pillars
      if (pIdx < pillarZCoords.length - 1) {
        const nextPz = pillarZCoords[pIdx + 1];
        const midZ = (pz + nextPz) * 0.5;
        const arch = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(4.15, 0.24, 10, 28, Math.PI)), mats.antiqueGold);
        arch.rotation.y = Math.PI / 2;
        arch.position.set(sideX, 11.4, midZ);
        group.add(arch);
      }
    });
  });

  // ============================================================================
  // 4. LUXURIOUS WALL ARCHITECTURE (ZERO EMPTY WHITE SURFACES)
  // ============================================================================
  const portraitTexA = trackTex(makeRoyalPaintingTexture('portraitA'));
  const portraitTexB = trackTex(makeRoyalPaintingTexture('portraitB'));
  const colorRatio = Math.min(1, progress.completedMissions.length / 5);

  const rayMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffeec0,
      transparent: true,
      opacity: isSoftwareGl ? 0.07 : 0.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );

  [-22.5, 22.5].forEach((wallX) => {
    const isWest = wallX < 0;
    const faceSign = isWest ? 1 : -1;

    // Main Warm Lavender & Marble Wall
    const lowerWall = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.9, 16.5, 52)), mats.lavenderWall);
    lowerWall.position.set(wallX, 8.25, -1);
    lowerWall.receiveShadow = true;

    // Continuous Marble Wainscot Dado & Gold Cornices
    const wainscot = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.4, 3.1, 51)), mats.warmIvoryMarble);
    wainscot.position.set(wallX + faceSign * 0.45, 1.55, -1);
    const chairRail = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.55, 0.24, 51.2)), mats.antiqueGold);
    chairRail.position.set(wallX + faceSign * 0.5, 3.15, -1);
    const topCornice = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.95, 0.65, 51.2)), mats.antiqueGold);
    topCornice.position.set(wallX + faceSign * 0.65, 15.85, -1);
    group.add(lowerWall, wainscot, chairRail, topCornice);

    // Wall Pilasters & Crystal Wall Sconces between Window Bays
    pillarZCoords.forEach((pz, pIdx) => {
      const pilaster = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.55, 15.4, 1.15)), mats.warmIvoryMarble);
      pilaster.position.set(wallX + faceSign * 0.52, 7.8, pz);
      const pilCap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.72, 0.55, 1.38)), mats.antiqueGold);
      pilCap.position.set(wallX + faceSign * 0.55, 15.3, pz);
      group.add(pilaster, pilCap);

      // Lower & Upper Crystal Wall Sconces
      [3.9, 8.4].forEach((sy) => {
        const sconce = buildWallSconce();
        sconce.position.set(wallX + faceSign * 0.8, sy, pz);
        sconce.rotation.y = isWest ? Math.PI / 2 : -Math.PI / 2;
        group.add(sconce);
      });

      // Decorative Wall Marble Panels + Royal Portraits in Upper Bays
      if (pIdx < pillarZCoords.length - 1) {
        const midZ = (pz + pillarZCoords[pIdx + 1]) * 0.5;
        const dadoPanel = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.14, 1.9, 5.2)), mats.antiqueGold);
        dadoPanel.position.set(wallX + faceSign * 0.66, 1.6, midZ);
        const dadoInset = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.18, 1.55, 4.8)), mats.creamStone);
        dadoInset.position.set(wallX + faceSign * 0.67, 1.6, midZ);
        group.add(dadoPanel, dadoInset);
      }
    });

    // Tall Arched Stained-Glass Cathedral Windows, Volumetric God-Rays, Banners & Portraits
    [-13.75, -5.25, 3.25, 11.75].forEach((wz, idx) => {
      const winFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.4, 9.6, 4.35)), mats.antiqueGold);
      winFrame.position.set(wallX + faceSign * 0.5, 9.5, wz);
      const winArch = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(2.05, 0.22, 10, 24, Math.PI)), mats.antiqueGold);
      winArch.rotation.y = Math.PI / 2;
      winArch.position.set(wallX + faceSign * 0.55, 14.2, wz);

      const glassPane = new THREE.Mesh(
        trackGeo(new THREE.PlaneGeometry(3.65, 8.85)),
        idx % 2 === 0 ? mats.stainedGlass : mats.stainedGlassWarm,
      );
      glassPane.position.set(wallX + faceSign * 0.72, 9.5, wz);
      glassPane.rotation.y = isWest ? Math.PI / 2 : -Math.PI / 2;
      group.add(winFrame, winArch, glassPane);

      // Angled Volumetric Sunlight Shaft
      const beam = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(2.5, 17, 12, 1, true)), rayMat);
      beam.position.set(isWest ? -13.5 : 13.5, 5.2, wz);
      beam.rotation.z = isWest ? -0.78 : 0.78;
      group.add(beam);

      // Framed Royal Portrait flanking the Mezzanine Wall
      const portrait = buildFramedPainting(idx % 2 === 0 ? portraitTexA : portraitTexB, 1.9, 2.55, colorRatio);
      portrait.position.set(wallX + faceSign * 0.75, 4.6, wz);
      portrait.rotation.y = isWest ? Math.PI / 2 : -Math.PI / 2;
      group.add(portrait);

      // Draped Royal Banners along the Colonnade Nave
      const bannerMat = idx % 2 === 0 ? mats.dustyRoseVelvet : mats.royalBlueBrocade;
      const banner = buildRoyalBanner(bannerMat, 1.55, 4.8);
      banner.position.set(isWest ? -13.4 : 13.4, 10.6, wz + 4.25);
      banner.rotation.y = isWest ? Math.PI / 2 : -Math.PI / 2;
      group.add(banner);
    });
  });

  // ============================================================================
  // 5. GRAND ROYAL CURVED STAIRCASES WITH ORNATE BALUSTERS & NEWEL LANTERNS
  // ============================================================================
  [-1, 1].forEach((side) => {
    const stairGroup = new THREE.Group();
    const steps = 16;
    const innerRailPts: THREE.Vector3[] = [];
    const outerRailPts: THREE.Vector3[] = [];

    for (let s = 0; s < steps; s++) {
      const t = s / (steps - 1);
      const ang = t * (Math.PI * 0.52);
      const radius = 4.2;
      const sx = side * (11.1 + Math.sin(ang) * radius);
      const sz = 5.4 - Math.cos(ang) * radius;
      const sy = t * 5.3 + 0.18;

      // Carved Marble Tread + Gold Nosing Strip
      const stepMesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.7, 0.36, 1.05)), mats.warmIvoryMarble);
      stepMesh.position.set(sx, sy, sz);
      stepMesh.rotation.y = -side * ang;
      stepMesh.receiveShadow = true;
      stepMesh.castShadow = true;

      const stepGoldEdge = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.76, 0.08, 0.16)), mats.antiqueGold);
      stepGoldEdge.position.set(
        sx - Math.sin(side * ang) * 0.45,
        sy + 0.16,
        sz - Math.cos(side * ang) * 0.45,
      );
      stepGoldEdge.rotation.y = -side * ang;
      stairGroup.add(stepMesh, stepGoldEdge);

      // Inner & Outer Balusters on each step
      const innerX = sx - side * Math.cos(ang) * 1.22;
      const innerZ = sz - Math.sin(ang) * 1.22;
      const outerX = sx + side * Math.cos(ang) * 1.22;
      const outerZ = sz + Math.sin(ang) * 1.22;

      const innerBal = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.055, 0.08, 0.95, 8)), mats.antiqueGold);
      innerBal.position.set(innerX, sy + 0.62, innerZ);
      const outerBal = innerBal.clone();
      outerBal.position.set(outerX, sy + 0.62, outerZ);
      stairGroup.add(innerBal, outerBal);

      innerRailPts.push(new THREE.Vector3(innerX, sy + 1.12, innerZ));
      outerRailPts.push(new THREE.Vector3(outerX, sy + 1.12, outerZ));

      // Sculpted Marble & Gold Newel Posts with Glowing Crystal Lantern Finials at Foot & Top
      if (s === 0 || s === steps - 1) {
        [
          [innerX, innerZ],
          [outerX, outerZ],
        ].forEach(([nx, nz]) => {
          const newel = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.38, 1.22, 0.38)), mats.warmIvoryMarble);
          newel.position.set(nx, sy + 0.68, nz);
          const newelCap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.44, 0.14, 0.44)), mats.antiqueGold);
          newelCap.position.set(nx, sy + 1.32, nz);
          const lanternOrb = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.15, 1)), mats.candleFlame);
          lanternOrb.position.set(nx, sy + 1.56, nz);
          stairGroup.add(newel, newelCap, lanternOrb);
        });
      }
    }

    // Continuous Smooth Sweeping Golden Handrails
    const innerRail = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(innerRailPts), 32, 0.068, 8, false)),
      mats.champagneGold,
    );
    const outerRail = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(outerRailPts), 32, 0.068, 8, false)),
      mats.champagneGold,
    );
    stairGroup.add(innerRail, outerRail);
    group.add(stairGroup);
  });

  // ============================================================================
  // 6. IMPERIAL ROYAL THRONE, ELEVATED DAIS & STORY CLOCK FOCAL WALL (NORTH z=-24)
  // ============================================================================
  const northWall = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(45, 16.5, 1.2)), mats.warmIvoryMarble);
  northWall.position.set(0, 8.25, -24.5);
  northWall.receiveShadow = true;

  // Architectural Panelling & Gold Pilasters across North Wall (zero bare white slabs)
  const northDado = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(44.5, 2.8, 0.35)), mats.creamStone);
  northDado.position.set(0, 1.4, -23.85);
  const northChairRail = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(44.6, 0.24, 0.45)), mats.antiqueGold);
  northChairRail.position.set(0, 2.85, -23.85);
  const northCornice = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(44.6, 0.72, 0.78)), mats.antiqueGold);
  northCornice.position.set(0, 15.85, -23.75);
  group.add(northWall, northDado, northChairRail, northCornice);

  // Grand Imperial Apse Arch behind Throne & Circular Clock
  const apseBackPanel = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(9.8, 12.2, 0.35)), mats.lavenderWall);
  apseBackPanel.position.set(0, 7.6, -23.82);
  const apseArchRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(4.9, 0.34, 12, 36, Math.PI)), mats.antiqueGold);
  apseArchRing.position.set(0, 9.8, -23.62);
  group.add(apseBackPanel, apseArchRing);

  [-4.9, 4.9].forEach((ax) => {
    const pilaster = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.42, 0.48, 11.2, 16)), mats.creamStone);
    pilaster.position.set(ax, 5.6, -23.65);
    const pilCap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.1, 0.42, 0.95)), mats.antiqueGold);
    pilCap.position.set(ax, 11.2, -23.65);
    group.add(pilaster, pilCap);
  });

  // Official Large Kingdom of Stories Royal Crest Mounted Between Throne & Story Clock
  const wallCrestFrame = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.18, 0.14, 10, 32)), mats.antiqueGold);
  wallCrestFrame.position.set(0, 5.65, -23.58);
  const wallCrestFace = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(1.12, 32)), mats.royalCrestMat);
  wallCrestFace.position.set(0, 5.65, -23.6);
  group.add(wallCrestFrame, wallCrestFace);

  // Preserved Circular Royal Story Clock directly above the Throne (z = -23.6, y = 8.6)
  const clockDialTex = trackTex(makeRoyalClockDialTexture(progress.festivalUnlocked));
  const crestFrame = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(2.42, 0.24, 12, 40)), mats.antiqueGold);
  crestFrame.position.set(0, 8.6, -23.56);
  const innerClockRim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(2.15, 0.08, 8, 36)), mats.champagneGold);
  innerClockRim.position.set(0, 8.6, -23.52);

  const clockFace = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(2.15, 40)),
    trackMat(
      new THREE.MeshStandardMaterial({
        map: clockDialTex,
        emissiveMap: clockDialTex,
        emissive: progress.festivalUnlocked ? 0xf6de97 : 0x627396,
        emissiveIntensity: progress.festivalUnlocked ? 0.45 : 0.14,
        roughness: 0.35,
      }),
    ),
  );
  clockFace.position.set(0, 8.6, -23.52);

  const minuteHand = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.11, 1.55, 0.08)), mats.midnightNavy);
  minuteHand.position.set(0, 8.6, -23.42);
  minuteHand.geometry.translate(0, 0.62, 0);
  const hourHand = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.16, 1.05, 0.08)), mats.antiqueGold);
  hourHand.position.set(0, 8.6, -23.4);
  hourHand.geometry.translate(0, 0.4, 0);
  const clockCenterGem = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.22, 0)), mats.crystalTurquoise);
  clockCenterGem.position.set(0, 8.6, -23.36);

  [-1, 1].forEach((wSide) => {
    const wing = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(1.12, 3.8, 5)), mats.champagneGold);
    wing.position.set(wSide * 3.85, 8.85, -23.48);
    wing.rotation.z = wSide * -1.16;
    group.add(wing);
  });
  group.add(crestFrame, innerClockRim, clockFace, minuteHand, hourHand, clockCenterGem);

  animatedUpdates.push((elapsed) => {
    if (progress.festivalUnlocked) {
      minuteHand.rotation.z = -elapsed * 0.65;
      hourHand.rotation.z = -elapsed * 0.09;
    } else {
      minuteHand.rotation.z = 0;
      hourHand.rotation.z = 0;
    }
  });

  // Elevated Multi-Level Marble Throne Platform + Steps + Illuminated Trim + Baldachin
  const dais1 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(11.4, 0.38, 6.4)), mats.warmIvoryMarble);
  dais1.position.set(0, 0.19, -20.5);
  dais1.receiveShadow = true;
  const dais1Trim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(11.55, 0.1, 6.55)), mats.antiqueGold);
  dais1Trim.position.set(0, 0.36, -20.5);

  const dais2 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(8.6, 0.38, 4.6)), mats.creamStone);
  dais2.position.set(0, 0.57, -21.0);
  dais2.receiveShadow = true;
  const dais2Glow = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(8.72, 0.06, 4.72)), mats.crystalTurquoise);
  dais2Glow.position.set(0, 0.42, -21.0);
  const dais2Trim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(8.75, 0.1, 4.75)), mats.champagneGold);
  dais2Trim.position.set(0, 0.74, -21.0);

  const dais3 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(5.8, 0.38, 3.0)), mats.pearlIvory);
  dais3.position.set(0, 0.95, -21.4);
  dais3.receiveShadow = true;
  const dais3Trim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(5.96, 0.12, 3.16)), mats.antiqueGold);
  dais3Trim.position.set(0, 1.12, -21.4);

  // Carved Front Marble Steps + Royal Stair Carpet leading up to the Throne
  [
    { y: 0.13, z: -17.15, w: 4.4 },
    { y: 0.36, z: -17.7, w: 4.2 },
    { y: 0.62, z: -18.55, w: 3.9 },
    { y: 0.88, z: -19.55, w: 3.6 },
  ].forEach((st) => {
    const step = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(st.w, 0.24, 0.72)), mats.warmIvoryMarble);
    step.position.set(0, st.y, st.z);
    step.receiveShadow = true;
    const stepRunner = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.6, 0.26, 0.74)), mats.lavenderVelvet);
    stepRunner.position.set(0, st.y + 0.01, st.z);
    const stepGold = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(st.w + 0.06, 0.05, 0.08)), mats.antiqueGold);
    stepGold.position.set(0, st.y + 0.11, st.z + 0.35);
    group.add(step, stepRunner, stepGold);
  });

  group.add(dais1, dais1Trim, dais2, dais2Glow, dais2Trim, dais3, dais3Trim);
  boxColliders.push({ minX: -5.9, maxX: 5.9, minZ: -24.0, maxZ: -17.0 });

  // Symmetrical Ornamental Structures on the Throne Platform (Canopy Columns, Crystal Obelisks, Crest Pedestals)
  [-3.55, 3.55].forEach((cx) => {
    const colBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.85, 0.35, 0.85)), mats.antiqueGold);
    colBase.position.set(cx, 0.94, -22.2);
    const colShaft = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.24, 0.28, 5.1, 14)), mats.warmIvoryMarble);
    colShaft.position.set(cx, 3.6, -22.2);
    const colCap = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.42, 0.26, 0.42, 14)), mats.champagneGold);
    colCap.position.set(cx, 6.25, -22.2);
    const colFinial = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.25, 0)), mats.crystalTurquoise);
    colFinial.position.set(cx, 6.68, -22.2);
    group.add(colBase, colShaft, colCap, colFinial);
  });

  // Arched Lavender & Gold Canopy Framing Throne (sits cleanly below the Clock at y = 6.2)
  const canopyArch = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(3.55, 0.16, 10, 32, Math.PI)),
    mats.antiqueGold,
  );
  canopyArch.position.set(0, 6.15, -22.2);
  canopyArch.scale.set(1, 0.36, 1);
  group.add(canopyArch);

  [-4.55, 4.55].forEach((ox) => {
    const obPed = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.88, 0.9, 0.88)), mats.warmIvoryMarble);
    obPed.position.set(ox, 0.82, -19.0);
    const obGold = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.96, 0.14, 0.96)), mats.antiqueGold);
    obGold.position.set(ox, 1.32, -19.0);
    const obCrystal = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.32, 0)), mats.crystalTurquoise);
    obCrystal.scale.set(0.75, 1.9, 0.75);
    obCrystal.position.set(ox, 2.02, -19.0);
    group.add(obPed, obGold, obCrystal);
  });

  // Magnificent Imperial Royal Throne Chair at (0, 1.16, -21.45)
  const throneGroup = new THREE.Group();
  throneGroup.position.set(0, 1.16, -21.45);

  const thronePlinth = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.45, 0.24, 1.95)), mats.antiqueGold);
  thronePlinth.position.y = 0.12;
  const throneSeatFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.1, 0.56, 1.65)), mats.warmIvoryMarble);
  throneSeatFrame.position.y = 0.48;
  const throneSeatCushion = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.86, 0.34, 1.46)), mats.lavenderVelvet);
  throneSeatCushion.position.set(0, 0.86, 0.04);

  // Carved Pearl-Ivory & Gold Backrest Frame
  const throneBackFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.25, 3.85, 0.42)), mats.antiqueGold);
  throneBackFrame.position.set(0, 2.38, -0.66);
  const throneBackArch = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.12, 1.12, 0.42, 24, 1, false, 0, Math.PI)),
    mats.champagneGold,
  );
  throneBackArch.rotation.z = Math.PI / 2;
  throneBackArch.rotation.y = Math.PI / 2;
  throneBackArch.position.set(0, 4.28, -0.66);

  // Tufted Lavender Velvet Backrest Upholstery
  const throneBackVelvet = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.78, 3.45, 0.24)), mats.lavenderVelvet);
  throneBackVelvet.position.set(0, 2.38, -0.44);

  // Architectural Side Pilasters & Floral Finial Spires
  [-1.08, 1.08].forEach((px) => {
    const stile = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.13, 0.16, 4.15, 12)), mats.warmIvoryMarble);
    stile.position.set(px, 2.42, -0.58);
    const spire = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.18, 0.62, 8)), mats.champagneGold);
    spire.position.set(px, 4.78, -0.58);
    const pearlTip = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.09, 10, 10)), mats.crystalTurquoise);
    pearlTip.position.set(px, 5.14, -0.58);
    throneGroup.add(stile, spire, pearlTip);
  });

  // Crown-Shaped Backrest Finial + Royal Crest + Gemstones
  const crownBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.76, 0.56, 0.52, 12)), mats.antiqueGold);
  crownBase.position.set(0, 5.12, -0.56);
  for (let c = 0; c < 5; c++) {
    const a = -0.6 + c * 0.3;
    const prong = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.14, 0.55, 6)), mats.champagneGold);
    prong.position.set(Math.sin(a) * 0.52, 5.56, -0.56 + Math.cos(a) * 0.12);
    const gem = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.09, 0)), mats.crystalTurquoise);
    gem.position.set(Math.sin(a) * 0.52, 5.88, -0.56 + Math.cos(a) * 0.12);
    throneGroup.add(prong, gem);
  }
  const throneCrestBadge = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.38, 24)), mats.royalCrestMat);
  throneCrestBadge.position.set(0, 4.45, -0.32);

  // Detailed Golden Scroll Armrests with Velvet Pads & Crystal Cabochons
  [-1.02, 1.02].forEach((ax) => {
    const armCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(ax, 1.38, -0.52),
      new THREE.Vector3(ax, 1.34, 0.25),
      new THREE.Vector3(ax, 1.18, 0.72),
    ]);
    const armRail = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(armCurve, 14, 0.11, 10, false)), mats.antiqueGold);
    const armPad = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.22, 0.12, 0.85)), mats.lavenderVelvet);
    armPad.position.set(ax, 1.4, -0.05);
    const armPost = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.09, 0.12, 0.7, 10)), mats.champagneGold);
    armPost.position.set(ax, 0.86, 0.58);
    const armGem = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.11, 0)), mats.crystalTurquoise);
    armGem.position.set(ax, 1.24, 0.76);
    throneGroup.add(armRail, armPad, armPost, armGem);
  });

  throneGroup.add(
    thronePlinth,
    throneSeatFrame,
    throneSeatCushion,
    throneBackFrame,
    throneBackArch,
    throneBackVelvet,
    crownBase,
    throneCrestBadge,
  );
  group.add(throneGroup);

  // 4 Grand Historical Kingdom Gallery Paintings Flanking the Throne Wall
  const paintingKinds: Array<'crown' | 'library' | 'woods' | 'starlight'> = [
    'crown',
    'library',
    'woods',
    'starlight',
  ];
  [-11.8, -7.8, 7.8, 11.8].forEach((px, idx) => {
    const pTex = trackTex(makeRoyalPaintingTexture(paintingKinds[idx]));
    const painting = buildFramedPainting(pTex, 2.35, 3.25, colorRatio);
    painting.position.set(px, 4.75, -23.68);
    group.add(painting);
  });

  // North Wall Corner Banners
  [-17.5, 17.5].forEach((bx, idx) => {
    const nBanner = buildRoyalBanner(idx === 0 ? mats.royalBlueBrocade : mats.dustyRoseVelvet, 1.85, 5.4);
    nBanner.position.set(bx, 6.8, -23.5);
    group.add(nBanner);
  });

  // ============================================================================
  // 7. PREMIUM ROYAL DECORATIONS (SYMMETRICAL, CLEAR WALKING PATHS)
  // ============================================================================
  // 4 Large Golden Statues on Carved Marble Pedestals along Nave Bays
  buildRoyalStatue(-12.2, -16.8, Math.PI / 2);
  buildRoyalStatue(12.2, -16.8, -Math.PI / 2);
  buildRoyalStatue(-12.2, 11.8, Math.PI / 2);
  buildRoyalStatue(12.2, 11.8, -Math.PI / 2);

  // 6 Royal Vases & Flower Arrangements (Flanking Throne Steps, South Entrance & Side Bays)
  buildRoyalFlowerUrn(-6.8, -17.3);
  buildRoyalFlowerUrn(6.8, -17.3);
  buildRoyalFlowerUrn(-5.6, 21.8);
  buildRoyalFlowerUrn(5.6, 21.8);
  buildRoyalFlowerUrn(-17.8, -9.5);
  buildRoyalFlowerUrn(17.8, -9.5);

  // 4 Ornate Standing 5-Arm Golden Candelabras Flanking Throne Dais
  buildStandingCandelabra(-6.8, -20.6);
  buildStandingCandelabra(6.8, -20.6);
  buildStandingCandelabra(-4.4, -16.5);
  buildStandingCandelabra(4.4, -16.5);

  // 4 Decorative Crystal Sculptures & 6 Golden Floor Lamps in Side Colonnades
  [-18.2, 18.2].forEach((cx) => {
    [-1.0, 7.5].forEach((cz) => buildCrystalSculpture(cx, cz));
  });
  [-17.2, 17.2].forEach((lx) => {
    [-14.0, 3.25, 15.5].forEach((lz) => buildGoldenFloorLamp(lx, lz));
  });

  // ============================================================================
  // 8. GRAND SOUTH ARCHWAY & SUNLIT ROYAL TERRACE GARDENS (PRESERVED + ENHANCED)
  // ============================================================================
  const southArchL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(14, 16.5, 1.4)), mats.warmIvoryMarble);
  southArchL.position.set(-15.5, 8.25, 24.5);
  const southArchR = southArchL.clone();
  southArchR.position.x = 15.5;
  const southHeader = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(17, 6.2, 1.4)), mats.antiqueGold);
  southHeader.position.set(0, 13.4, 24.5);
  const southArchRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(6.8, 0.42, 12, 32, Math.PI)), mats.champagneGold);
  southArchRing.position.set(0, 9.8, 23.8);
  group.add(southArchL, southArchR, southHeader, southArchRing);

  [-11.5, 11.5].forEach((sx, idx) => {
    const sBanner = buildRoyalBanner(idx === 0 ? mats.dustyRoseVelvet : mats.royalBlueBrocade, 1.75, 5.2);
    sBanner.position.set(sx, 6.8, 23.6);
    sBanner.rotation.y = Math.PI;
    group.add(sBanner);
  });

  // Outdoor Terrace Marble Walkway, Fountain, Organic Trees & Distant Spires
  const terraceWalk = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(9.5, 0.2, 26)), mats.marbleFloor);
  terraceWalk.position.set(0, -0.05, 36);
  terraceWalk.receiveShadow = true;
  group.add(terraceWalk);

  const fBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(3.2, 3.6, 0.65, 24)), mats.warmIvoryMarble);
  fBase.position.set(0, 0.32, 33);
  const fWater = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(2.9, 2.9, 0.18, 24)), mats.waterStream);
  fWater.position.set(0, 0.62, 33);
  const fSpire = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.35, 0.6, 2.2, 14)), mats.champagneGold);
  fSpire.position.set(0, 1.4, 33);
  const fJet = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.45, 0)), mats.crystalTurquoise);
  fJet.position.set(0, 2.95, 33);
  group.add(fBase, fWater, fSpire, fJet);
  animatedUpdates.push((elapsed) => {
    fJet.rotation.y = elapsed * 1.4;
    fJet.position.y = 2.95 + Math.sin(elapsed * 3) * 0.18;
  });

  for (let i = 0; i < 18; i++) {
    const ang = (i / 18) * Math.PI * 2;
    const dist = 34 + (i % 3) * 6;
    const tx = Math.cos(ang) * dist;
    const tz = Math.sin(ang) * dist;
    if (Math.abs(tx) < 6 && tz > 24) continue;
    group.add(
      helpers.buildOrganicTree(
        tx,
        0,
        tz,
        1.15 + (i % 3) * 0.22,
        (i % 4) * 0.02,
        trackGeo,
        trackMat,
        mats,
        i % 2 === 0,
      ),
    );
  }

  [
    [-30, -32],
    [30, -32],
    [-32, 32],
    [32, 32],
  ].forEach(([tx, tz], idx) => {
    const tower = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(2.8, 3.3, 24, 16)), mats.warmIvoryMarble);
    tower.position.set(tx, 12, tz);
    const spire = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(3.5, 7.5, 16)), mats.royalBlueBrocade);
    spire.position.set(tx, 27.5, tz);
    const pole = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 6)), mats.antiqueGold);
    pole.position.set(tx, 32.2, tz);
    const flag = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(2.2, 1.1, 6, 2)), mats.dustyRoseVelvet);
    flag.position.set(tx + 1.1, 33.1, tz);
    group.add(tower, spire, pole, flag);
    animatedUpdates.push((elapsed) => {
      flag.rotation.y = Math.sin(elapsed * 3.2 + idx) * 0.25;
    });
  });

  // ============================================================================
  // 9. INTERIOR PALACE ATMOSPHERE & CHANDELIER / THRONE LIGHTING
  // ============================================================================
  const centralChandLight = new THREE.PointLight(0xffe0a3, 48, 30, 1.45);
  centralChandLight.position.set(0, 10.6, -1.5);
  const throneFocalLight = new THREE.PointLight(0xffe5b0, 42, 24, 1.45);
  throneFocalLight.position.set(0, 6.8, -18.2);
  const northChandLight = new THREE.PointLight(0xffdca0, 26, 22, 1.5);
  northChandLight.position.set(0, 11.4, -13.0);
  const southChandLight = new THREE.PointLight(0xffdca0, 24, 22, 1.5);
  southChandLight.position.set(0, 11.4, 10.0);
  const westLavenderGlow = new THREE.PointLight(0xd9c5f4, 18, 22, 1.55);
  westLavenderGlow.position.set(-14.5, 7.5, -1.0);
  const eastTurquoiseGlow = new THREE.PointLight(0xbbeaf2, 18, 22, 1.55);
  eastTurquoiseGlow.position.set(14.5, 7.5, -1.0);
  group.add(
    centralChandLight,
    throneFocalLight,
    northChandLight,
    southChandLight,
    westLavenderGlow,
    eastTurquoiseGlow,
  );

  // Subtle floating golden motes + sunlit terrace birds outside South Archway
  for (let b = 0; b < 6; b++) {
    const bird = new THREE.Group();
    const wingL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.45, 0.04, 0.18)), mats.pearlIvory);
    wingL.position.x = -0.22;
    const wingR = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.45, 0.04, 0.18)), mats.pearlIvory);
    wingR.position.x = 0.22;
    bird.add(wingL, wingR);
    group.add(bird);
    animatedUpdates.push((elapsed) => {
      const a = elapsed * 0.28 + (b / 6) * Math.PI * 2;
      bird.position.set(Math.cos(a) * 26, 15 + Math.sin(elapsed * 1.3 + b) * 1.1, 36 + Math.sin(a) * 17);
      bird.rotation.y = -a;
      const flap = Math.sin(elapsed * 8.5 + b * 2) * 0.45;
      wingL.rotation.z = flap;
      wingR.rotation.z = -flap;
    });
  }

  const moteCount = isSoftwareGl ? 45 : progress.festivalUnlocked ? 185 : 120;
  const motePos = new Float32Array(moteCount * 3);
  for (let i = 0; i < moteCount; i++) {
    const angle = (i / moteCount) * Math.PI * 2 * 3.7;
    const r = Math.sqrt((i + 1) / moteCount) * 19;
    motePos[i * 3] = Math.cos(angle) * r;
    motePos[i * 3 + 1] = 1.0 + ((i * 1.9) % 12.5);
    motePos[i * 3 + 2] = Math.sin(angle) * r;
  }
  const moteGeo = trackGeo(new THREE.BufferGeometry());
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  const moteMat = trackMat(
    new THREE.PointsMaterial({
      color: 0xf2d992,
      size: 0.16,
      transparent: true,
      opacity: 0.68,
      depthWrite: false,
    }),
  );
  const motes = new THREE.Points(moteGeo, moteMat);
  group.add(motes);
  animatedUpdates.push((elapsed) => {
    motes.rotation.y = elapsed * 0.03;
    motes.position.y = Math.sin(elapsed * 0.65) * 0.22;
  });

  // ============================================================================
  // 10. PRESERVED INTERACTIVE HUB STATIONS & FOUR ARCHITECTURAL PORTALS
  // ============================================================================
  const guardian = createNpcCharacter(0x1e315e, 0xdcb854, 0x2a1d17);
  guardian.group.position.set(2.3, 0, 8.2);
  group.add(guardian.group);
  disposables.push(guardian.dispose);
  circleColliders.push({ x: 2.3, z: 8.2, radius: 0.72 });
  animatedUpdates.push((elapsed) => guardian.updateIdle(elapsed));
  const guardBeacon = addBeaconMarker(2.3, 2.55, 8.2, 0xdcb854);
  interactables.push({
    id: 'npc-guardian',
    label: 'Berbicara dengan Penjaga Diraja Ariff',
    sublabel: 'Dengar taklimat misteri kerajaan & laluan misi',
    position: new THREE.Vector3(2.3, 1, 8.2),
    radius: 3.2,
    action: { type: 'npc', npcKey: 'guardian' },
    visualRef: guardBeacon,
  });

  // Papan Misi & Peta Dunia (West Nave)
  const boardGroup = new THREE.Group();
  boardGroup.position.set(-7.2, 0, 5.5);
  boardGroup.rotation.y = 0.55;
  const boardLegs = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.5, 1.1, 0.35)), mats.warmIvoryMarble);
  boardLegs.position.y = 0.55;
  const boardFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.1, 2.35, 0.24)), mats.antiqueGold);
  boardFrame.position.y = 1.65;
  const boardFace = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.75, 1.95, 0.28)), mats.royalBlueBrocade);
  boardFace.position.y = 1.65;
  boardGroup.add(boardLegs, boardFrame, boardFace);
  group.add(boardGroup);
  circleColliders.push({ x: -7.2, z: 5.5, radius: 1.5 });
  const boardBeacon = addBeaconMarker(-7.2, 3.25, 5.5, 0x7be0e6);
  interactables.push({
    id: 'mission-board',
    label: 'Periksa Papan Misi & Peta Dunia',
    sublabel: 'Lihat status lima misi hikayat',
    position: new THREE.Vector3(-7.2, 1, 5.5),
    radius: 3.2,
    action: { type: 'mission_board' },
    visualRef: boardBeacon,
  });

  // Hero Selection Pedestal (East Nave)
  const pedGroup = new THREE.Group();
  pedGroup.position.set(7.2, 0, 5.5);
  const pedBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.45, 1.75, 0.55, 24)), mats.warmIvoryMarble);
  pedBase.position.y = 0.27;
  const pedGold = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.42, 0.06, 8, 28)), mats.antiqueGold);
  pedGold.rotation.x = Math.PI / 2;
  pedGold.position.y = 0.55;
  const pedCrystal = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.48, 0)), mats.crystalTurquoise);
  pedCrystal.position.y = 1.55;
  pedGroup.add(pedBase, pedGold, pedCrystal);
  group.add(pedGroup);
  circleColliders.push({ x: 7.2, z: 5.5, radius: 1.45 });
  animatedUpdates.push((elapsed) => {
    pedCrystal.rotation.y = elapsed * 1.4;
    pedCrystal.position.y = 1.55 + Math.sin(elapsed * 2.2) * 0.14;
  });
  interactables.push({
    id: 'hero-pedestal',
    label: 'Masuki Balai Pemilihan Wira 3D',
    sublabel: 'Banding dan pilih Ayden, Elena, Ryan atau Eva',
    position: new THREE.Vector3(7.2, 1, 5.5),
    radius: 3.2,
    action: { type: 'hero_pedestal' },
    visualRef: pedCrystal,
  });

  // ============================================================================
  // 5 ROYAL MISSION PORTAL ARCHWAYS WITH ANIMATED OPENING DOORS & MAGIC FX
  // ============================================================================
  let activeMissionNumber: 1 | 2 | 3 | 4 | 5 | null = null;

  interface RoyalDoorRig {
    missionNumber: 1 | 2 | 3 | 4 | 5;
    portalPos: THREE.Vector3;
    ring: THREE.Mesh;
    outerRing: THREE.Mesh;
    vortex: THREE.Mesh;
    vortexMat: THREE.MeshBasicMaterial;
    previewObj: THREE.Group;
    doorLeftPivot: THREE.Group;
    doorRightPivot: THREE.Group;
    crystals: THREE.Mesh[];
    sparkles: THREE.Points;
    pointLight: THREE.PointLight;
    beamMesh: THREE.Mesh;
    beamMat: THREE.MeshBasicMaterial;
    thresholdGlowMat: THREE.MeshStandardMaterial;
    activationBoost: number;
    doorOpenAmount: number;
  }

  const royalPortalRigs: RoyalDoorRig[] = [];

  const invisibleHitMat = trackMat(
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );

  const doorPanelMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1b2b55,
      roughness: 0.42,
      metalness: 0.35,
    }),
  );

  CITADEL_PORTAL_CONFIGS.forEach((cfg) => {
    const portalPos = new THREE.Vector3(...cfg.pos);
    // Face cleanly toward the royal nave center / hero arrival area (0, 0, 5.5)
    const dirToNave = new THREE.Vector3(0 - portalPos.x, 0, 5.5 - portalPos.z).normalize();
    const approachPos = portalPos.clone().addScaledVector(dirToNave, 3.6);
    const entryPos = portalPos.clone().addScaledVector(dirToNave, 0.25);

    portalTargets.push({
      missionNumber: cfg.missionNumber,
      targetLocation: cfg.target,
      title: cfg.title,
      portalPosition: portalPos,
      approachPosition: approachPos,
      entryPosition: entryPos,
      colorHex: cfg.colorHex,
    });

    const isCompleted =
      (cfg.missionNumber === 1 && progress.completedMissions.includes('silent_chronicle')) ||
      (cfg.missionNumber === 2 && progress.completedMissions.includes('shattered_timeline')) ||
      (cfg.missionNumber === 3 && progress.completedMissions.includes('story_architect')) ||
      (cfg.missionNumber === 4 && progress.completedMissions.includes('royal_voice_trial')) ||
      (cfg.missionNumber === 5 && progress.completedMissions.includes('final_chronicle'));

    const portal = helpers.createArchitecturalPortal(
      cfg.theme,
      cfg.colorHex,
      true,
      trackGeo,
      trackMat,
      mats,
    );
    portal.group.position.copy(portalPos);
    portal.group.lookAt(0, 0, 5.5);

    // Grand Royal Gold Outer Archivolt & Crown Finials upgrading the palace gateway
    const outerArchivolt = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(1.94, 0.09, 10, 36, Math.PI)),
      mats.champagneGold,
    );
    outerArchivolt.position.y = 4.38;
    portal.group.add(outerArchivolt);

    [-1.92, 1.92].forEach((fx) => {
      const sidePilaster = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.14, 0.18, 4.1, 12)),
        mats.warmIvoryMarble,
      );
      sidePilaster.position.set(fx, 2.35, -0.08);
      const sideFinial = new THREE.Mesh(
        trackGeo(new THREE.OctahedronGeometry(0.2, 0)),
        mats.champagneGold,
      );
      sideFinial.scale.set(0.85, 1.4, 0.85);
      sideFinial.position.set(fx, 4.68, -0.08);
      portal.group.add(sidePilaster, sideFinial);
    });

    // Illuminated Threshold Strip & Carpet Pad in Front of Gateway
    const accentGlowMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: cfg.colorHex,
        emissive: cfg.colorHex,
        emissiveIntensity: 0.45,
        roughness: 0.3,
        metalness: 0.5,
      }),
    );
    const thresholdPad = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(2.3, 0.04, 1.8)),
      mats.royalBlueBrocade,
    );
    thresholdPad.position.set(0, 0.03, 1.9);
    const thresholdStrip = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.8, 0.055, 0.22)),
      accentGlowMat,
    );
    thresholdStrip.position.set(0, 0.035, 1.35);
    portal.group.add(thresholdPad, thresholdStrip);

    // Replace flat vortex with animated swirling arcane spiral
    const swirlTex = trackTex(makeCitadelSwirlTexture(cfg.colorHex));
    const swirlMat = trackMat(
      new THREE.MeshBasicMaterial({
        map: swirlTex,
        color: 0xffffff,
        transparent: true,
        opacity: 0.86,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    portal.vortex.material = swirlMat;
    portal.vortex.position.z = -0.18;
    portal.ring.position.z = -0.12;

    // Outer counter-rotating magic ring
    const outerRingMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: cfg.colorHex,
        emissive: cfg.colorHex,
        emissiveIntensity: 1.05,
        roughness: 0.2,
        metalness: 0.78,
      }),
    );
    const outerRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(1.52, 0.038, 8, 36)),
      outerRingMat,
    );
    outerRing.position.set(0, 2.7, -0.08);
    portal.group.add(outerRing);

    // Animated Carved Double Royal Doors (Hinged at inner jambs x = +-1.34)
    const buildDoorLeaf = (side: -1 | 1): THREE.Group => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 1.34, 0.36, 0.24);
      const leafWidth = 1.3;
      const leafHeight = 3.55;
      const offsetX = -side * (leafWidth * 0.5 + 0.02);

      const leafBody = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(leafWidth, leafHeight, 0.11)),
        doorPanelMat,
      );
      leafBody.position.set(offsetX, leafHeight * 0.5, 0);
      leafBody.castShadow = true;

      // Carved golden outer trim + upper & lower inset mouldings
      const goldFrameTop = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(leafWidth + 0.04, 0.12, 0.14)),
        mats.antiqueGold,
      );
      goldFrameTop.position.set(offsetX, leafHeight - 0.06, 0);
      const goldFrameBot = goldFrameTop.clone();
      goldFrameBot.position.y = 0.06;

      const goldStile = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.11, leafHeight, 0.14)),
        mats.antiqueGold,
      );
      goldStile.position.set(offsetX - side * (leafWidth * 0.5 - 0.055), leafHeight * 0.5, 0);

      const bossRing = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.28, 0.04, 8, 24)),
        mats.champagneGold,
      );
      bossRing.position.set(offsetX, leafHeight * 0.52, 0.075);

      const bossGem = new THREE.Mesh(
        trackGeo(new THREE.OctahedronGeometry(0.14, 0)),
        accentGlowMat,
      );
      bossGem.scale.set(0.85, 1.15, 0.55);
      bossGem.position.set(offsetX, leafHeight * 0.52, 0.09);

      // Decorative vertical window slit in upper door so vortex light glimmers cleanly behind
      const lowerCrest = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(leafWidth * 0.62, 0.72, 0.04)),
        mats.royalBlueBrocade,
      );
      lowerCrest.position.set(offsetX, 0.92, 0.065);

      pivot.add(leafBody, goldFrameTop, goldFrameBot, goldStile, bossRing, bossGem, lowerCrest);
      return pivot;
    };

    const doorLeftPivot = buildDoorLeaf(-1);
    const doorRightPivot = buildDoorLeaf(1);
    portal.group.add(doorLeftPivot, doorRightPivot);

    // Orbiting Magic Crystal Shards around Arch
    const crystalMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: cfg.colorHex,
        emissive: cfg.colorHex,
        emissiveIntensity: 1.2,
        roughness: 0.14,
        metalness: 0.42,
      }),
    );
    const crystals: THREE.Mesh[] = [];
    for (let c = 0; c < 3; c++) {
      const shard = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.16, 0)), crystalMat);
      shard.scale.set(0.75, 1.55, 0.75);
      portal.group.add(shard);
      crystals.push(shard);
    }

    // Floating Golden & Mission-Colored Magic Sparkles Around Portal
    const pSparkCount = isSoftwareGl ? 18 : 38;
    const pSparkPos = new Float32Array(pSparkCount * 3);
    for (let i = 0; i < pSparkCount; i++) {
      const a = (i / pSparkCount) * Math.PI * 2;
      const r = 1.45 + (i % 3) * 0.35;
      pSparkPos[i * 3] = Math.cos(a) * r;
      pSparkPos[i * 3 + 1] = 0.6 + ((i * 0.47) % 5.2);
      pSparkPos[i * 3 + 2] = Math.sin(a) * 0.6 + 0.35;
    }
    const pSparkGeo = trackGeo(new THREE.BufferGeometry());
    pSparkGeo.setAttribute('position', new THREE.BufferAttribute(pSparkPos, 3));
    const pSparkMat = trackMat(
      new THREE.PointsMaterial({
        color: cfg.colorHex,
        size: 0.14,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    const portalSparkles = new THREE.Points(pSparkGeo, pSparkMat);
    portal.group.add(portalSparkles);

    // Gold-Framed Overhead Royal Nameplate Plaque
    const signTex = trackTex(
      makeCitadelPortalSignTexture(cfg.missionNumber, cfg.title, cfg.cssHex, isCompleted),
    );
    const signBacking = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(3.85, 1.14, 0.14)),
      mats.antiqueGold,
    );
    signBacking.position.set(0, 7.12, 0.22);
    signBacking.rotation.x = 0.08;
    const signFaceMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: signTex,
        emissiveMap: signTex,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.36,
        roughness: 0.34,
      }),
    );
    const signFace = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(3.66, 1.02)), signFaceMat);
    signFace.position.set(0, 7.12, 0.3);
    signFace.rotation.x = 0.08;
    portal.group.add(signBacking, signFace);

    // Dedicated Portal Glow Light + Rising Activation Energy Pillar
    const pLight = new THREE.PointLight(cfg.colorHex, 3.2, 14, 1.45);
    pLight.position.set(0, 2.9, 1.65);
    portal.group.add(pLight);

    const beamMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: cfg.colorHex,
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    const beamMesh = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(1.12, 1.52, 14, 24, 1, true)),
      beamMat,
    );
    beamMesh.position.set(0, 7.2, 0);
    portal.group.add(beamMesh);

    // 3D Direct Click Raycast Target
    const hitMesh = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(4.0, 7.8, 1.6)),
      invisibleHitMat,
    );
    hitMesh.position.set(0, 3.9, 0.3);
    hitMesh.userData.portalMissionNumber = cfg.missionNumber;
    portal.group.add(hitMesh);

    group.add(portal.group);

    interactables.push({
      id: `portal-misi-${cfg.missionNumber}`,
      label: `Tekan E untuk memasuki Misi ${cfg.missionNumber}: ${cfg.title}`,
      sublabel: cfg.subtitle,
      position: new THREE.Vector3(portalPos.x, 1, portalPos.z),
      radius: 3.1,
      action: { type: 'portal', targetLocation: cfg.target, missionHintNumber: cfg.missionNumber },
      locked: false,
      lockReason: '',
      visualRef: portal.ring,
    });

    royalPortalRigs.push({
      missionNumber: cfg.missionNumber,
      portalPos,
      ring: portal.ring,
      outerRing,
      vortex: portal.vortex,
      vortexMat: swirlMat,
      previewObj: portal.previewObj,
      doorLeftPivot,
      doorRightPivot,
      crystals,
      sparkles: portalSparkles,
      pointLight: pLight,
      beamMesh,
      beamMat,
      thresholdGlowMat: accentGlowMat,
      activationBoost: 0,
      doorOpenAmount: 0,
    });
  });

  // Update loop for all 5 Royal Portal Gates (doors swing open on selection or close approach)
  animatedUpdates.push((elapsed, dt, playerPos) => {
    royalPortalRigs.forEach((rig, idx) => {
      const isSelected = activeMissionNumber === rig.missionNumber;
      const distToHero = playerPos
        ? Math.hypot(playerPos.x - rig.portalPos.x, playerPos.z - rig.portalPos.z)
        : 99;
      const shouldOpenDoors = isSelected || distToHero < 4.5;

      rig.activationBoost = THREE.MathUtils.damp(rig.activationBoost, isSelected ? 1 : 0, 6.2, dt);
      rig.doorOpenAmount = THREE.MathUtils.damp(
        rig.doorOpenAmount,
        shouldOpenDoors ? 1 : 0,
        isSelected ? 5.8 : 4.2,
        dt,
      );

      const b = rig.activationBoost;
      const dOpen = rig.doorOpenAmount;

      // Twin carved doors rest slightly ajar (~7 deg) showing magic light behind, then swing wide (~100 deg) inward when active
      const swingAngle = THREE.MathUtils.lerp(0.12, Math.PI * 0.56, dOpen);
      rig.doorLeftPivot.rotation.y = -swingAngle;
      rig.doorRightPivot.rotation.y = swingAngle;

      rig.ring.rotation.z += dt * (0.85 + b * 4.5);
      rig.outerRing.rotation.z -= dt * (0.55 + b * 3.4);
      rig.vortex.rotation.z -= dt * (1.2 + b * 5.2);
      const vortexScale = 1.0 + Math.sin(elapsed * 3.1 + idx) * 0.03 + b * 0.16;
      rig.vortex.scale.setScalar(vortexScale);
      rig.vortexMat.opacity = 0.78 + b * 0.22;

      rig.previewObj.rotation.y = elapsed * (1.0 + b * 2.8);
      rig.previewObj.position.y = 2.65 + Math.sin(elapsed * 2.1 + idx) * 0.12;

      rig.sparkles.rotation.y = elapsed * (0.35 + b * 1.4);
      rig.sparkles.position.y = Math.sin(elapsed * 1.4 + idx) * 0.18;

      rig.pointLight.intensity = 3.0 + Math.sin(elapsed * 2.4 + idx) * 0.4 + dOpen * 2.4 + b * 6.5;
      rig.beamMat.opacity = b * (0.34 + Math.sin(elapsed * 7.5) * 0.08);
      rig.beamMesh.rotation.y += dt * (1.2 + b * 3.5);
      rig.thresholdGlowMat.emissiveIntensity = 0.45 + dOpen * 0.35 + b * 0.75;

      rig.crystals.forEach((shard, cIdx) => {
        const orbitA = elapsed * (1.1 + b * 3.2) + (cIdx / 3) * Math.PI * 2;
        const orbitR = 1.85 + b * 0.2;
        shard.position.set(
          Math.cos(orbitA) * orbitR,
          2.7 + Math.sin(orbitA) * orbitR * 0.92,
          0.25 + Math.sin(elapsed * 2.5 + cIdx) * 0.16,
        );
        shard.rotation.y = elapsed * 2.2 + cIdx;
        shard.rotation.z = -orbitA;
      });
    });
  });

  return {
    group,
    skyColor: 0xd9e8f2,
    fogColor: 0xe3dcf0,
    fogDensity: 0.0068,
    boundsRadius: 21.5,
    roomRect: { minX: -20.8, maxX: 20.8, minZ: -22.8, maxZ: 22.8, maxY: 15.6 },
    circleColliders,
    boxColliders,
    interactables,
    portalTargets,
    setActivePortal: (missionNumber) => {
      activeMissionNumber = missionNumber;
    },
    groundHeightAt: () => 0,
    update: (elapsed, dt, playerPos) => animatedUpdates.forEach((fn) => fn(elapsed, dt, playerPos)),
    dispose: () => {
      geos.forEach((g) => g.dispose());
      localMats.forEach((m) => m.dispose());
      localTextures.forEach((t) => t.dispose());
      disposables.forEach((d) => d());
    },
  };
}
