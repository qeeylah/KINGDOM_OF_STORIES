import * as THREE from 'three';
import type { LocationId, PlayerProgress } from '../types/game';
import type { PortalTheme } from './imperialGrandHall';
import type { MaterialPalette } from './materials';
import type {
  BoxCollider,
  BuiltWorld,
  CircleCollider,
  InteractablePoint,
  PortalTargetPoint,
} from './worlds';

type TrackGeoFn = <T extends THREE.BufferGeometry>(g: T) => T;
type TrackMatFn = <T extends THREE.Material>(m: T) => T;

export interface GateHallHelpers {
  createArchitecturalPortal: (
    theme: PortalTheme,
    colorHex: number,
    unlocked: boolean,
    tg: TrackGeoFn,
    tm: TrackMatFn,
    mats: MaterialPalette,
  ) => { group: THREE.Group; ring: THREE.Mesh; vortex: THREE.Mesh; previewObj: THREE.Group };
  buildCrystalChandelier: (
    tg: TrackGeoFn,
    tm: TrackMatFn,
    mats: MaterialPalette,
  ) => THREE.Group;
}

interface MissionPortalConfig {
  missionNumber: 1 | 2 | 3 | 4 | 5;
  targetLocation: LocationId;
  theme: PortalTheme;
  title: string;
  subtitle: string;
  colorHex: number;
  cssHex: string;
  angleRad: number;
}

const PORTAL_CONFIGS: MissionPortalConfig[] = [
  {
    missionNumber: 1,
    targetLocation: 'library',
    theme: 'library',
    title: 'Pustaka Agung Hikayat Diraja',
    subtitle: 'Kemahiran Mendengar & Kefahaman',
    colorHex: 0x38bdf8,
    cssHex: '#38BDF8',
    angleRad: -0.32 * Math.PI,
  },
  {
    missionNumber: 2,
    targetLocation: 'woods',
    theme: 'woods',
    title: 'Rimba Cahaya Mahkota',
    subtitle: 'Kronologi & Susunan Peristiwa',
    colorHex: 0x34d399,
    cssHex: '#34D399',
    angleRad: -0.16 * Math.PI,
  },
  {
    missionNumber: 3,
    targetLocation: 'atelier',
    theme: 'atelier',
    title: 'Balai Cipta Mahkota',
    subtitle: 'Arkitek Kisah & Skrip Digital',
    colorHex: 0xa78bfa,
    cssHex: '#A78BFA',
    angleRad: 0,
  },
  {
    missionNumber: 4,
    targetLocation: 'atelier',
    theme: 'voice',
    title: 'Balai Gema Diraja',
    subtitle: 'Rakaman Suara & Penceritaan',
    colorHex: 0xf472b6,
    cssHex: '#F472B6',
    angleRad: 0.16 * Math.PI,
  },
  {
    missionNumber: 5,
    targetLocation: 'theatre',
    theme: 'theatre',
    title: 'Balairung Gemilang Diraja',
    subtitle: 'Pentas Persembahan Diraja',
    colorHex: 0xfbbf24,
    cssHex: '#FBBF24',
    angleRad: 0.32 * Math.PI,
  },
];

function makePortalSignTexture(
  missionNumber: number,
  title: string,
  accentHex: string,
  completed: boolean,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 224;
  const ctx = canvas.getContext('2d')!;

  // Royal midnight sapphire backdrop
  const grad = ctx.createLinearGradient(0, 0, 768, 224);
  grad.addColorStop(0, '#0E1734');
  grad.addColorStop(0.5, '#192956');
  grad.addColorStop(1, '#0E1734');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 768, 224);

  // Ornamental gold border
  ctx.strokeStyle = '#E6C66A';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 748, 204);

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 3;
  ctx.strokeRect(22, 22, 724, 180);

  // Mission badge line
  ctx.fillStyle = accentHex;
  ctx.font = 'bold 34px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const statusTag = completed ? ' · SELESAI' : '';
  ctx.fillText(`MISI ${missionNumber}${statusTag}`, 384, 70);

  // Gold hairline divider
  ctx.fillStyle = 'rgba(230, 198, 106, 0.55)';
  ctx.fillRect(140, 104, 488, 2);

  // Location name
  ctx.fillStyle = '#FAF6EE';
  ctx.font = title.length > 26 ? 'bold 34px Georgia, serif' : 'bold 38px Georgia, serif';
  ctx.fillText(title, 384, 154);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makeSwirlVortexTexture(colorHex: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const c = new THREE.Color(colorHex);
  const r = Math.round(c.r * 255);
  const g = Math.round(c.g * 255);
  const b = Math.round(c.b * 255);

  ctx.clearRect(0, 0, 512, 512);
  const radial = ctx.createRadialGradient(256, 256, 18, 256, 256, 250);
  radial.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
  radial.addColorStop(0.28, `rgba(${r}, ${g}, ${b}, 0.85)`);
  radial.addColorStop(0.72, `rgba(${r}, ${g}, ${b}, 0.42)`);
  radial.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.0)`);
  ctx.fillStyle = radial;
  ctx.beginPath();
  ctx.arc(256, 256, 250, 0, Math.PI * 2);
  ctx.fill();

  // Spiral arcane arms
  ctx.save();
  ctx.translate(256, 256);
  for (let arm = 0; arm < 5; arm++) {
    ctx.rotate((Math.PI * 2) / 5);
    ctx.strokeStyle = 'rgba(255, 252, 240, 0.55)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    for (let t = 0; t <= 1; t += 0.04) {
      const ang = t * Math.PI * 1.45;
      const rad = 20 + t * 205;
      const x = Math.cos(ang) * rad;
      const y = Math.sin(ang) * rad;
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makeRoyalMedallionTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#18254A';
  ctx.fillRect(0, 0, 512, 512);

  // Concentric marble & gold rings
  const grad = ctx.createRadialGradient(256, 256, 24, 256, 256, 245);
  grad.addColorStop(0, '#2C4278');
  grad.addColorStop(0.6, '#1B2A54');
  grad.addColorStop(1, '#101936');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(256, 256, 246, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#E5C35A';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(256, 256, 232, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(230, 198, 106, 0.55)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(256, 256, 175, 0, Math.PI * 2);
  ctx.stroke();

  // 8-point Royal Compass Star
  ctx.save();
  ctx.translate(256, 256);
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = i % 2 === 0 ? '#E5C35A' : '#8CE0EB';
    ctx.beginPath();
    ctx.moveTo(0, -155);
    ctx.lineTo(20, -28);
    ctx.lineTo(-20, -28);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.fillStyle = '#FAF6EE';
  ctx.beginPath();
  ctx.arc(256, 256, 36, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 6;
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makeStainedGlassTexture(tintA: string, tintB: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, tintA);
  grad.addColorStop(0.55, tintB);
  grad.addColorStop(1, '#F6DF9A');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 512);

  // Lead filigree grid
  ctx.strokeStyle = 'rgba(26, 36, 68, 0.72)';
  ctx.lineWidth = 5;
  for (let y = 64; y < 512; y += 72) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(128, 0);
  ctx.lineTo(128, 512);
  ctx.stroke();

  // Rose emblem near top
  ctx.fillStyle = 'rgba(255, 246, 210, 0.68)';
  ctx.beginPath();
  ctx.arc(128, 128, 54, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makeCitadelReturnSignTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 144;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#121D3E';
  ctx.fillRect(0, 0, 512, 144);
  ctx.strokeStyle = '#E5C35A';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 496, 128);

  ctx.fillStyle = '#E5C35A';
  ctx.font = 'bold 26px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GERBANG ISTANA', 256, 48);

  ctx.fillStyle = '#FAF6EE';
  ctx.font = 'bold 30px Georgia, serif';
  ctx.fillText('Balai Agung Diraja', 256, 98);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function buildDewanGerbangDiraja(
  mats: MaterialPalette,
  progress: PlayerProgress,
  isSoftwareGl: boolean,
  helpers: GateHallHelpers,
): BuiltWorld {
  const group = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const localMats: THREE.Material[] = [];
  const localTextures: THREE.Texture[] = [];

  const trackGeo: TrackGeoFn = (g) => {
    geos.push(g);
    return g;
  };
  const trackMat: TrackMatFn = (m) => {
    localMats.push(m);
    return m;
  };
  const trackTex = <T extends THREE.Texture>(t: T): T => {
    t.anisotropy = isSoftwareGl ? 1 : 4;
    localTextures.push(t);
    return t;
  };

  const circleColliders: CircleCollider[] = [];
  const boxColliders: BoxCollider[] = [];
  const interactables: InteractablePoint[] = [];
  const portalTargets: PortalTargetPoint[] = [];
  const animatedUpdates: Array<(elapsed: number, dt: number) => void> = [];

  // 1. Exterior sky-lit royal courtyard garden (seen through stained glass / South portal)
  const outerLawn = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(110, 48)),
    mats.sageGrass,
  );
  outerLawn.rotation.x = -Math.PI / 2;
  outerLawn.position.y = -0.14;
  group.add(outerLawn);

  // 2. Grand Royal Marble Plaza Floor
  const plazaFloor = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(23.5, 24.2, 0.16, 48)),
    mats.marbleFloor,
  );
  plazaFloor.position.y = -0.08;
  plazaFloor.receiveShadow = true;
  group.add(plazaFloor);

  // Gold circular inlaid floor ring
  const floorGoldRing1 = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(10.6, 10.95, 64)),
    mats.antiqueGold,
  );
  floorGoldRing1.rotation.x = -Math.PI / 2;
  floorGoldRing1.position.set(0, 0.015, 3.0);
  const floorGoldRing2 = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(17.8, 18.2, 64)),
    mats.champagneGold,
  );
  floorGoldRing2.rotation.x = -Math.PI / 2;
  floorGoldRing2.position.set(0, 0.015, 0);
  group.add(floorGoldRing1, floorGoldRing2);

  // Central Royal Compass Medallion at (0, 0.024, 3.0)
  const medallionTex = trackTex(makeRoyalMedallionTexture());
  const medallionMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: medallionTex,
      roughness: 0.35,
      metalness: 0.25,
    }),
  );
  const medallionDisc = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(4.1, 4.25, 0.04, 48)),
    medallionMat,
  );
  medallionDisc.position.set(0, 0.02, 3.0);
  medallionDisc.receiveShadow = true;
  group.add(medallionDisc);

  // 3. Perimeter Carved Marble Colonnade, Golden Arches & Stained-Glass Windows
  const colonnadeR = 19.8;
  const colCount = 12;
  const stainedPalette: Array<[string, string]> = [
    ['#6FD8F8', '#3359B8'],
    ['#6AE8B4', '#276B58'],
    ['#BCA8FA', '#543A9E'],
    ['#F7A8CC', '#8A3465'],
    ['#FCE08B', '#A36B1E'],
    ['#7EE0EC', '#2D528E'],
  ];

  for (let i = 0; i < colCount; i++) {
    const a = (i / colCount) * Math.PI * 2;
    const cx = Math.sin(a) * colonnadeR;
    const cz = Math.cos(a) * colonnadeR;

    const colGroup = new THREE.Group();
    colGroup.position.set(cx, 0, cz);
    colGroup.lookAt(0, 0, 0);

    const plinth = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.5, 0.7, 1.5)), mats.creamStone);
    plinth.position.y = 0.35;
    const shaft = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.46, 0.56, 11.4, 16)),
      mats.pearlIvory,
    );
    shaft.position.y = 6.4;
    shaft.castShadow = true;
    const goldBand = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.52, 0.08, 8, 20)),
      mats.antiqueGold,
    );
    goldBand.rotation.x = Math.PI / 2;
    goldBand.position.y = 1.1;
    const cap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.55, 0.55, 1.55)), mats.antiqueGold);
    cap.position.y = 12.2;
    colGroup.add(plinth, shaft, goldBand, cap);
    group.add(colGroup);

    // Outer perimeter collider (zero obstruction inside hall)
    circleColliders.push({ x: cx, z: cz, radius: 1.05 });

    // Connecting archway & stained-glass bays between adjacent columns
    const nextA = ((i + 1) / colCount) * Math.PI * 2;
    const midA = (a + nextA) * 0.5;
    const mx = Math.sin(midA) * (colonnadeR + 0.35);
    const mz = Math.cos(midA) * (colonnadeR + 0.35);

    // Upper cornice beam bridging each bay
    const beam = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(10.6, 1.1, 1.05)), mats.creamStone);
    beam.position.set(mx, 12.6, mz);
    beam.lookAt(0, 12.6, 0);
    group.add(beam);

    // Leave South-center bay open for Citadel Gate Archway
    const isSouthExitBay = Math.abs(Math.sin(midA)) < 0.35 && Math.cos(midA) > 0.8;
    if (!isSouthExitBay) {
      // Lower balustrade wall
      const wall = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(9.2, 2.2, 0.6)), mats.pearlIvory);
      wall.position.set(mx, 1.1, mz);
      wall.lookAt(0, 1.1, 0);
      group.add(wall);

      // Tall luminous stained-glass window panel
      const [c1, c2] = stainedPalette[i % stainedPalette.length];
      const glassTex = trackTex(makeStainedGlassTexture(c1, c2));
      const glassMat = trackMat(
        new THREE.MeshStandardMaterial({
          map: glassTex,
          emissiveMap: glassTex,
          emissive: new THREE.Color(0xffffff),
          emissiveIntensity: 0.45,
          roughness: 0.25,
          side: THREE.DoubleSide,
        }),
      );
      const windowPanel = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(4.6, 8.2)), glassMat);
      windowPanel.position.set(mx, 6.8, mz);
      windowPanel.lookAt(0, 6.8, 0);
      group.add(windowPanel);

      // Royal silk banner hanging cleanly beside alternating columns
      if (i % 2 === 0) {
        const banner = new THREE.Mesh(
          trackGeo(new THREE.PlaneGeometry(1.15, 4.4)),
          i % 4 === 0 ? mats.royalBlueBrocade : mats.velvetCrimson,
        );
        const bx = Math.sin(a) * (colonnadeR - 0.85);
        const bz = Math.cos(a) * (colonnadeR - 0.85);
        banner.position.set(bx, 8.2, bz);
        banner.lookAt(0, 8.2, 0);
        group.add(banner);
      }
    }
  }

  // 4. Coffered Imperial Ceiling Dome & Golden Ribs + 3 Crystal Chandeliers
  const domeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1a274f,
      roughness: 0.65,
      metalness: 0.2,
      side: THREE.BackSide,
    }),
  );
  const ceilingDome = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(21.2, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.46)),
    domeMat,
  );
  ceilingDome.position.y = 12.2;
  ceilingDome.scale.y = 0.48;
  group.add(ceilingDome);

  const domeBaseRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(20.1, 0.28, 10, 48)),
    mats.antiqueGold,
  );
  domeBaseRing.rotation.x = Math.PI / 2;
  domeBaseRing.position.y = 12.75;
  group.add(domeBaseRing);

  const chandelierPositions: Array<[number, number, number]> = [
    [0, 15.2, 3.0],
    [-8.2, 14.2, -1.5],
    [8.2, 14.2, -1.5],
  ];
  chandelierPositions.forEach(([x, y, z]) => {
    const ch = helpers.buildCrystalChandelier(trackGeo, trackMat, mats);
    ch.position.set(x, y, z);
    group.add(ch);
  });

  // Warm central hall light
  const hallCenterLight = new THREE.PointLight(0xffe7b3, 2.6, 38, 1.4);
  hallCenterLight.position.set(0, 11.5, 2.0);
  group.add(hallCenterLight);

  // 5. Crescent Gallery of 5 Animated Mission Portals + Radiating Carpet Runners
  const crescentCenterX = 0;
  const crescentCenterZ = 4.0;
  const crescentRadius = 14.8;
  const runnerStartX = 0;
  const runnerStartZ = 3.0;

  let activeMissionNumber: 1 | 2 | 3 | 4 | 5 | null = null;

  interface AnimatedPortalRig {
    missionNumber: 1 | 2 | 3 | 4 | 5;
    baseColorHex: number;
    ring: THREE.Mesh;
    outerRing: THREE.Mesh;
    vortex: THREE.Mesh;
    vortexMat: THREE.MeshBasicMaterial;
    previewObj: THREE.Group;
    crystals: THREE.Mesh[];
    pointLight: THREE.PointLight;
    beamMesh: THREE.Mesh;
    beamMat: THREE.MeshBasicMaterial;
    carpetGlowMat: THREE.MeshStandardMaterial;
    activationBoost: number;
  }

  const portalRigs: AnimatedPortalRig[] = [];

  const invisibleHitMat = trackMat(
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );

  PORTAL_CONFIGS.forEach((cfg) => {
    const px = crescentCenterX + Math.sin(cfg.angleRad) * crescentRadius;
    const pz = crescentCenterZ - Math.cos(cfg.angleRad) * crescentRadius;

    // Direction facing toward player spawn gallery center (0, 0, 5.5)
    const dirToPlaza = new THREE.Vector3(0 - px, 0, 5.5 - pz).normalize();
    const portalPos = new THREE.Vector3(px, 0, pz);
    const approachPos = portalPos.clone().addScaledVector(dirToPlaza, 3.2);
    const entryPos = portalPos.clone().addScaledVector(dirToPlaza, 0.35);

    portalTargets.push({
      missionNumber: cfg.missionNumber,
      targetLocation: cfg.targetLocation,
      title: cfg.title,
      portalPosition: portalPos,
      approachPosition: approachPos,
      entryPosition: entryPos,
      colorHex: cfg.colorHex,
    });

    // Check mission completion status
    const isCompleted =
      (cfg.missionNumber === 1 && progress.completedMissions.includes('silent_chronicle')) ||
      (cfg.missionNumber === 2 && progress.completedMissions.includes('shattered_timeline')) ||
      (cfg.missionNumber === 3 && progress.completedMissions.includes('story_architect')) ||
      (cfg.missionNumber === 4 && progress.completedMissions.includes('royal_voice_trial')) ||
      (cfg.missionNumber === 5 && progress.completedMissions.includes('final_chronicle'));

    // Radiating Royal Carpet Runner from Central Medallion to Portal Dais
    const dx = px - runnerStartX;
    const dz = pz - runnerStartZ;
    const runnerDist = Math.hypot(dx, dz) - 2.2;
    const runnerAngle = Math.atan2(dx, dz);

    const runnerGroup = new THREE.Group();
    runnerGroup.position.set(runnerStartX, 0.02, runnerStartZ);
    runnerGroup.rotation.y = runnerAngle;

    const runnerMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: cfg.colorHex,
        emissive: cfg.colorHex,
        emissiveIntensity: 0.16,
        roughness: 0.72,
      }),
    );
    const carpetStrip = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.5, 0.02, runnerDist)),
      mats.velvetCrimson,
    );
    carpetStrip.position.set(0, 0.005, runnerDist * 0.5 + 1.0);
    carpetStrip.receiveShadow = true;

    const colorCenterStripe = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.42, 0.024, runnerDist)),
      runnerMat,
    );
    colorCenterStripe.position.set(0, 0.008, runnerDist * 0.5 + 1.0);

    const trimL = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.11, 0.026, runnerDist)),
      mats.champagneGold,
    );
    trimL.position.set(-0.78, 0.008, runnerDist * 0.5 + 1.0);
    const trimR = trimL.clone();
    trimR.position.x = 0.78;
    runnerGroup.add(carpetStrip, colorCenterStripe, trimL, trimR);
    group.add(runnerGroup);

    // Architectural Portal Structure
    const builtPortal = helpers.createArchitecturalPortal(
      cfg.theme,
      cfg.colorHex,
      true,
      trackGeo,
      trackMat,
      mats,
    );
    builtPortal.group.position.copy(portalPos);
    builtPortal.group.lookAt(0, 0, 5.5);

    // Replace flat vortex material with vivid animated swirling spiral texture
    const swirlTex = trackTex(makeSwirlVortexTexture(cfg.colorHex));
    const swirlMat = trackMat(
      new THREE.MeshBasicMaterial({
        map: swirlTex,
        color: 0xffffff,
        transparent: true,
        opacity: 0.82,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    builtPortal.vortex.material = swirlMat;

    // Outer counter-rotating arcane rune halo ring
    const outerRingMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: cfg.colorHex,
        emissive: cfg.colorHex,
        emissiveIntensity: 1.0,
        roughness: 0.2,
        metalness: 0.75,
      }),
    );
    const outerRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(1.52, 0.036, 8, 36)),
      outerRingMat,
    );
    outerRing.position.set(0, 2.7, 0.06);
    builtPortal.group.add(outerRing);

    // Orbiting Magic Crystal Shards around arch
    const crystalMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: cfg.colorHex,
        emissive: cfg.colorHex,
        emissiveIntensity: 1.15,
        roughness: 0.15,
        metalness: 0.4,
      }),
    );
    const crystals: THREE.Mesh[] = [];
    for (let c = 0; c < 3; c++) {
      const shard = new THREE.Mesh(
        trackGeo(new THREE.OctahedronGeometry(0.17, 0)),
        crystalMat,
      );
      shard.scale.set(0.75, 1.55, 0.75);
      builtPortal.group.add(shard);
      crystals.push(shard);
    }

    // Crisp Gold-Framed Overhead Royal Nameplate
    const signTex = trackTex(
      makePortalSignTexture(cfg.missionNumber, cfg.title, cfg.cssHex, isCompleted),
    );
    const signBacking = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(3.85, 1.16, 0.14)),
      mats.antiqueGold,
    );
    signBacking.position.set(0, 7.1, 0.18);
    signBacking.rotation.x = 0.08;
    const signFaceMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: signTex,
        emissiveMap: signTex,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.35,
        roughness: 0.35,
      }),
    );
    const signFace = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(3.66, 1.04)), signFaceMat);
    signFace.position.set(0, 7.1, 0.26);
    signFace.rotation.x = 0.08;
    builtPortal.group.add(signBacking, signFace);

    // Dedicated Portal PointLight
    const pLight = new THREE.PointLight(cfg.colorHex, 2.8, 13.5, 1.5);
    pLight.position.set(0, 2.9, 1.6);
    builtPortal.group.add(pLight);

    // Rising Activation Light Pillar (visible & radiant during portal surge)
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
      trackGeo(new THREE.CylinderGeometry(1.15, 1.55, 14, 24, 1, true)),
      beamMat,
    );
    beamMesh.position.set(0, 7.2, 0);
    builtPortal.group.add(beamMesh);

    // 3D Direct Click Raycast Target
    const hitMesh = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(3.9, 7.6, 1.5)),
      invisibleHitMat,
    );
    hitMesh.position.set(0, 3.8, 0.25);
    hitMesh.userData.portalMissionNumber = cfg.missionNumber;
    builtPortal.group.add(hitMesh);

    group.add(builtPortal.group);

    // Also support manual E interaction near portal dais
    interactables.push({
      id: `gate-portal-misi-${cfg.missionNumber}`,
      label: `Masuk Misi ${cfg.missionNumber}: ${cfg.title}`,
      sublabel: cfg.subtitle,
      position: new THREE.Vector3(px, 0, pz),
      radius: 3.1,
      action: { type: 'portal', targetLocation: cfg.targetLocation },
      visualRef: builtPortal.group,
    });

    portalRigs.push({
      missionNumber: cfg.missionNumber,
      baseColorHex: cfg.colorHex,
      ring: builtPortal.ring,
      outerRing,
      vortex: builtPortal.vortex,
      vortexMat: swirlMat,
      previewObj: builtPortal.previewObj,
      crystals,
      pointLight: pLight,
      beamMesh,
      beamMat,
      carpetGlowMat: runnerMat,
      activationBoost: 0,
    });
  });

  // 6. Floating Magic Crystals on Sculpted Pedestals Flanking Portals (Outer Arc)
  const crystalPedestalAngles = [
    -0.41 * Math.PI,
    -0.24 * Math.PI,
    -0.08 * Math.PI,
    0.08 * Math.PI,
    0.24 * Math.PI,
    0.41 * Math.PI,
  ];
  const pedColors = [0x38bdf8, 0x34d399, 0xa78bfa, 0xf472b6, 0xfbbf24, 0x7be0e6];

  crystalPedestalAngles.forEach((ang, idx) => {
    const r = 16.5;
    const x = crescentCenterX + Math.sin(ang) * r;
    const z = crescentCenterZ - Math.cos(ang) * r;
    const colHex = pedColors[idx % pedColors.length];

    const pedGroup = new THREE.Group();
    pedGroup.position.set(x, 0, z);

    const base = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.45, 0.6, 0.35, 16)), mats.pearlIvory);
    base.position.y = 0.18;
    const stem = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.24, 0.32, 1.35, 16)), mats.creamStone);
    stem.position.y = 1.0;
    const cap = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.5, 0.36, 0.22, 16)), mats.antiqueGold);
    cap.position.y = 1.78;
    pedGroup.add(base, stem, cap);

    const gemMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: colHex,
        emissive: colHex,
        emissiveIntensity: 1.0,
        roughness: 0.15,
        metalness: 0.35,
      }),
    );
    const gem = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.38, 0)), gemMat);
    gem.scale.set(0.85, 1.45, 0.85);
    gem.position.y = 2.65;
    pedGroup.add(gem);

    const halo = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.55, 0.025, 6, 24)),
      mats.champagneGold,
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 2.65;
    pedGroup.add(halo);

    group.add(pedGroup);
    circleColliders.push({ x, z, radius: 0.72 });

    animatedUpdates.push((elapsed) => {
      gem.rotation.y = elapsed * 1.1 + idx;
      gem.position.y = 2.65 + Math.sin(elapsed * 2.0 + idx) * 0.16;
      halo.rotation.z = elapsed * 0.8 + idx;
      halo.position.y = gem.position.y;
    });
  });

  // 7. South Royal Archway Returning to Balai Agung Diraja (Optional Manual Gate)
  const citadelPortal = helpers.createArchitecturalPortal(
    'citadel',
    0xd4af37,
    true,
    trackGeo,
    trackMat,
    mats,
  );
  citadelPortal.group.position.set(0, 0, 17.8);
  citadelPortal.group.rotation.y = Math.PI;
  const citSignTex = trackTex(makeCitadelReturnSignTexture());
  const citSignBack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.2, 0.9, 0.12)), mats.antiqueGold);
  citSignBack.position.set(0, 6.95, 0.1);
  const citSignFace = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(3.04, 0.78)),
    trackMat(
      new THREE.MeshStandardMaterial({
        map: citSignTex,
        emissiveMap: citSignTex,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.3,
      }),
    ),
  );
  citSignFace.position.set(0, 6.95, 0.18);
  citadelPortal.group.add(citSignBack, citSignFace);
  group.add(citadelPortal.group);

  // Carpet leading South to Citadel Gate
  const southCarpet = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.2, 0.02, 9.8)),
    mats.velvetCrimson,
  );
  southCarpet.position.set(0, 0.022, 11.4);
  southCarpet.receiveShadow = true;
  const southTrimL = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.14, 0.026, 9.8)),
    mats.antiqueGold,
  );
  southTrimL.position.set(-1.12, 0.024, 11.4);
  const southTrimR = southTrimL.clone();
  southTrimR.position.x = 1.12;
  group.add(southCarpet, southTrimL, southTrimR);

  interactables.push({
    id: 'portal-citadel',
    label: 'Gerbang Balai Agung Diraja',
    sublabel: 'Kembali ke Balai Agung Diraja & Takhta Utama',
    position: new THREE.Vector3(0, 0, 17.8),
    radius: 2.9,
    action: { type: 'portal', targetLocation: 'citadel' },
    visualRef: citadelPortal.group,
  });

  // Standing Golden Candelabras near South Entrance
  [-4.6, 4.6].forEach((cx) => {
    const cand = new THREE.Group();
    cand.position.set(cx, 0, 14.8);
    const pole = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.09, 0.24, 2.7, 12)),
      mats.antiqueGold,
    );
    pole.position.y = 1.35;
    const orb = new THREE.Mesh(
      trackGeo(new THREE.OctahedronGeometry(0.24, 0)),
      trackMat(
        new THREE.MeshStandardMaterial({
          color: 0xffe49e,
          emissive: 0xffd066,
          emissiveIntensity: 1.25,
        }),
      ),
    );
    orb.position.y = 2.9;
    cand.add(pole, orb);
    group.add(cand);
    circleColliders.push({ x: cx, z: 14.8, radius: 0.45 });
  });

  // 8. Floating Golden Magic Sparkles across the Hall
  const sparkleCount = isSoftwareGl ? 36 : 95;
  const sparklePos = new Float32Array(sparkleCount * 3);
  for (let i = 0; i < sparkleCount; i++) {
    const ang = (i / sparkleCount) * Math.PI * 2 * 4.3;
    const rad = Math.sqrt((i + 1) / sparkleCount) * 16.5;
    sparklePos[i * 3] = Math.cos(ang) * rad;
    sparklePos[i * 3 + 1] = 1.0 + ((i * 1.9) % 9.5);
    sparklePos[i * 3 + 2] = Math.sin(ang) * rad;
  }
  const sparkleGeo = trackGeo(new THREE.BufferGeometry());
  sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparklePos, 3));
  const sparkleMat = trackMat(
    new THREE.PointsMaterial({
      color: 0xffe69c,
      size: 0.16,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    }),
  );
  const sparkles = new THREE.Points(sparkleGeo, sparkleMat);
  group.add(sparkles);

  // 9. Portal Animation & Activation Boost Loop
  animatedUpdates.push((elapsed, dt) => {
    sparkles.rotation.y = elapsed * 0.035;
    sparkles.position.y = Math.sin(elapsed * 0.65) * 0.22;

    citadelPortal.ring.rotation.z = elapsed * 0.55;
    citadelPortal.vortex.rotation.z = -elapsed * 0.4;
    citadelPortal.previewObj.rotation.y = elapsed * 0.9;

    portalRigs.forEach((rig, idx) => {
      const targetBoost = activeMissionNumber === rig.missionNumber ? 1 : 0;
      rig.activationBoost = THREE.MathUtils.damp(rig.activationBoost, targetBoost, 6.5, dt);
      const b = rig.activationBoost;

      // Spin speeds scale up dramatically on active portal
      rig.ring.rotation.z += dt * (0.75 + b * 4.6);
      rig.outerRing.rotation.z -= dt * (0.52 + b * 3.4);
      rig.vortex.rotation.z -= dt * (1.15 + b * 5.2);
      const vortexScale = 1.0 + Math.sin(elapsed * 3.2 + idx) * 0.03 + b * 0.18;
      rig.vortex.scale.setScalar(vortexScale);
      rig.vortexMat.opacity = 0.76 + b * 0.24;

      rig.previewObj.rotation.y = elapsed * (1.1 + b * 2.8);
      rig.previewObj.position.y = 2.65 + Math.sin(elapsed * 2.1 + idx) * 0.12;

      rig.pointLight.intensity = 2.8 + Math.sin(elapsed * 2.4 + idx) * 0.35 + b * 6.5;
      rig.beamMat.opacity = b * (0.34 + Math.sin(elapsed * 7.5) * 0.08);
      rig.beamMesh.rotation.y += dt * (1.2 + b * 3.5);
      rig.carpetGlowMat.emissiveIntensity = 0.16 + b * 0.85;

      rig.crystals.forEach((shard, cIdx) => {
        const orbitA = elapsed * (1.1 + b * 3.2) + (cIdx / 3) * Math.PI * 2;
        const orbitR = 1.82 + b * 0.22;
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
    skyColor: 0x1a264a,
    fogColor: 0x202e56,
    fogDensity: 0.008,
    boundsRadius: 18.2,
    circleColliders,
    boxColliders,
    interactables,
    portalTargets,
    setActivePortal: (missionNumber) => {
      activeMissionNumber = missionNumber;
    },
    groundHeightAt: () => 0,
    update: (elapsed, dt) => {
      for (const fn of animatedUpdates) {
        fn(elapsed, dt);
      }
    },
    dispose: () => {
      geos.forEach((g) => g.dispose());
      localMats.forEach((m) => m.dispose());
      localTextures.forEach((t) => t.dispose());
    },
  };
}
