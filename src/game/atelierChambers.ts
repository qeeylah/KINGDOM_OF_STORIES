import * as THREE from 'three';
import type { PlayerProgress } from '../types/game';
import { createNpcCharacter } from './characters';
import type { MaterialPalette } from './materials';
import type { BoxCollider, BuiltWorld, CircleCollider, InteractablePoint } from './worlds';

type TrackGeoFn = <T extends THREE.BufferGeometry>(g: T) => T;
type TrackMatFn = <T extends THREE.Material>(m: T) => T;

export interface VoiceTelemetry {
  isRecording: boolean;
  level: number;
}

export interface AtelierHelpers {
  createArchitecturalPortal: (
    theme: 'citadel' | 'library' | 'woods' | 'atelier' | 'voice' | 'theatre',
    colorHex: number,
    unlocked: boolean,
    tg: TrackGeoFn,
    tm: TrackMatFn,
    mats: MaterialPalette,
  ) => {
    group: THREE.Group;
    ring: THREE.Mesh;
    vortex: THREE.Mesh;
    previewObj: THREE.Group;
  };
  buildCrystalChandelier: (
    tg: TrackGeoFn,
    tm: TrackMatFn,
    mats: MaterialPalette,
  ) => THREE.Group;
}

function makeCanvasTex(
  size: number,
  draw: (ctx: CanvasRenderingContext2D, s: number) => void,
  anisotropy: number,
  repeatX = 1,
  repeatY = repeatX,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = anisotropy;
  return tex;
}

function createGlowSpriteTex(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(255, 252, 232, 1)');
  g.addColorStop(0.35, 'rgba(235, 206, 128, 0.85)');
  g.addColorStop(0.72, 'rgba(176, 138, 232, 0.35)');
  g.addColorStop(1, 'rgba(176, 138, 232, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createGearShape(outerR: number, innerR: number, teeth: number, holeR: number): THREE.Shape {
  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a0 = i * step;
    const a1 = a0 + step * 0.25;
    const a2 = a0 + step * 0.5;
    const a3 = a0 + step * 0.75;
    if (i === 0) shape.moveTo(Math.cos(a0) * innerR, Math.sin(a0) * innerR);
    else shape.lineTo(Math.cos(a0) * innerR, Math.sin(a0) * innerR);
    shape.lineTo(Math.cos(a1) * outerR, Math.sin(a1) * outerR);
    shape.lineTo(Math.cos(a2) * outerR, Math.sin(a2) * outerR);
    shape.lineTo(Math.cos(a3) * innerR, Math.sin(a3) * innerR);
  }
  shape.closePath();

  const hole = new THREE.Path();
  hole.absarc(0, 0, holeR, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return shape;
}

function createWorkshopRuneSealTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const cx = 256;
  const cy = 256;

  ctx.strokeStyle = 'rgba(235, 204, 118, 0.92)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, 232, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(123, 224, 230, 0.8)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 186, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(235, 204, 118, 0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 134, 0, Math.PI * 2);
  ctx.stroke();

  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < 16; i++) {
    ctx.rotate((Math.PI * 2) / 16);
    ctx.strokeStyle = i % 2 === 0 ? '#FFE89E' : '#7BE0E6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -188);
    ctx.lineTo(-10, -210);
    ctx.lineTo(0, -228);
    ctx.lineTo(10, -210);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createAcousticWallTexture(anisotropy: number): THREE.CanvasTexture {
  return makeCanvasTex(
    512,
    (ctx, s) => {
      const grad = ctx.createLinearGradient(0, 0, 0, s);
      grad.addColorStop(0, '#1B1136');
      grad.addColorStop(0.5, '#342060');
      grad.addColorStop(1, '#190F32');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, s, s);

      for (let x = 0; x < s; x += 24) {
        ctx.fillStyle = x % 48 === 0 ? 'rgba(14, 8, 30, 0.65)' : 'rgba(120, 88, 178, 0.25)';
        ctx.fillRect(x, 0, 10, s);
      }

      ctx.strokeStyle = 'rgba(229, 195, 90, 0.68)';
      ctx.lineWidth = 3;
      const cell = 64;
      for (let y = 0; y <= s; y += cell) {
        for (let x = 0; x <= s; x += cell) {
          ctx.beginPath();
          ctx.moveTo(x + cell / 2, y);
          ctx.lineTo(x + cell, y + cell / 2);
          ctx.lineTo(x + cell / 2, y + cell);
          ctx.lineTo(x, y + cell / 2);
          ctx.closePath();
          ctx.stroke();

          ctx.fillStyle = 'rgba(235, 206, 122, 0.52)';
          ctx.beginPath();
          ctx.arc(x + cell / 2, y + cell / 2, 3.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
    anisotropy,
    2,
    1,
  );
}

function createMixingConsoleScreenTexture(anisotropy: number): THREE.CanvasTexture {
  return makeCanvasTex(
    512,
    (ctx, s) => {
      ctx.fillStyle = '#0D132B';
      ctx.fillRect(0, 0, s, s);

      ctx.strokeStyle = 'rgba(229, 195, 90, 0.62)';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, s - 20, s - 20);

      const bars = 16;
      const bw = (s - 64) / bars;
      for (let i = 0; i < bars; i++) {
        const h = 45 + Math.abs(Math.sin(i * 0.7)) * 130;
        const grad = ctx.createLinearGradient(0, 220, 0, 220 - h);
        grad.addColorStop(0, '#7B56C2');
        grad.addColorStop(0.55, '#7BE0E6');
        grad.addColorStop(1, '#F2D988');
        ctx.fillStyle = grad;
        ctx.fillRect(32 + i * bw, 230 - h, bw - 8, h);
      }

      ctx.strokeStyle = '#7BE0E6';
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let x = 32; x <= s - 32; x += 6) {
        const y = 330 + Math.sin(x * 0.04) * 34 * Math.sin((x / s) * Math.PI);
        if (x === 32) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      for (let i = 0; i < 8; i++) {
        const fx = 52 + i * 56;
        ctx.fillStyle = '#252F58';
        ctx.fillRect(fx, 400, 10, 72);
        const knobY = 412 + (i % 3) * 16;
        ctx.fillStyle = '#E5C35A';
        ctx.fillRect(fx - 6, knobY, 22, 12);
      }
    },
    anisotropy,
  );
}

function createStoryboardDisplayTexture(
  title: string,
  subtitle: string,
  accentHex: string,
  anisotropy: number,
): THREE.CanvasTexture {
  return makeCanvasTex(
    512,
    (ctx, s) => {
      const grad = ctx.createLinearGradient(0, 0, s, s);
      grad.addColorStop(0, '#0F1A3C');
      grad.addColorStop(0.55, '#1B2D62');
      grad.addColorStop(1, '#101B3B');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, s, s);

      ctx.strokeStyle = '#E5C35A';
      ctx.lineWidth = 8;
      ctx.strokeRect(14, 14, s - 28, s - 28);

      ctx.fillStyle = '#FFE89E';
      ctx.font = 'bold 28px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(title, s / 2, 66);

      ctx.fillStyle = accentHex;
      ctx.font = '600 18px sans-serif';
      ctx.fillText(subtitle, s / 2, 98);

      // Three illuminated digital storyboard cards
      const cardW = 128;
      const cardH = 152;
      for (let i = 0; i < 3; i++) {
        const cx = 42 + i * 150;
        const cy = 135;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.fillRect(cx, cy, cardW, cardH);
        ctx.strokeStyle = i === 1 ? '#FFE89E' : accentHex;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(cx, cy, cardW, cardH);

        // Mini geometric scene sketch inside each storyboard frame
        ctx.fillStyle = accentHex;
        ctx.beginPath();
        ctx.arc(cx + cardW / 2, cy + 56, 20 + i * 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 232, 158, 0.72)';
        ctx.fillRect(cx + 18, cy + 104, cardW - 36, 8);
        ctx.fillRect(cx + 26, cy + 122, cardW - 52, 6);
      }

      // Bottom royal progress nodes
      ctx.strokeStyle = '#E5C35A';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(76, 372);
      ctx.lineTo(s - 76, 372);
      ctx.stroke();
      for (let n = 0; n < 4; n++) {
        const nx = 76 + n * 120;
        ctx.fillStyle = n % 2 === 0 ? '#FFE89E' : accentHex;
        ctx.beginPath();
        ctx.arc(nx, 372, 14, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = 'rgba(250, 246, 238, 0.85)';
      ctx.font = '600 17px sans-serif';
      ctx.fillText('ARKIB KREATIVITI DIGITAL KERAJAAN', s / 2, 444);
    },
    anisotropy,
  );
}

function createStudioSignTexture(anisotropy: number): THREE.CanvasTexture {
  return makeCanvasTex(
    512,
    (ctx, s) => {
      const grad = ctx.createLinearGradient(0, 0, s, 0);
      grad.addColorStop(0, '#241442');
      grad.addColorStop(0.5, '#4A2B7E');
      grad.addColorStop(1, '#241442');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, s, s);

      ctx.strokeStyle = '#E5C35A';
      ctx.lineWidth = 10;
      ctx.strokeRect(16, 16, s - 32, s - 32);

      ctx.fillStyle = '#FFE89E';
      ctx.font = 'bold 40px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('BALAI GEMA DIRAJA', s / 2, s * 0.45);

      ctx.fillStyle = '#8CE8F0';
      ctx.font = '600 22px sans-serif';
      ctx.fillText('STUDIO RAKAMAN SUARA DIRAJA', s / 2, s * 0.64);
    },
    anisotropy,
  );
}

function createWorkshopSignTexture(anisotropy: number): THREE.CanvasTexture {
  return makeCanvasTex(
    512,
    (ctx, s) => {
      const grad = ctx.createLinearGradient(0, 0, s, 0);
      grad.addColorStop(0, '#121E44');
      grad.addColorStop(0.5, '#223872');
      grad.addColorStop(1, '#121E44');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, s, s);

      ctx.strokeStyle = '#E5C35A';
      ctx.lineWidth = 10;
      ctx.strokeRect(16, 16, s - 32, s - 32);

      ctx.fillStyle = '#FFE89E';
      ctx.font = 'bold 40px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('BALAI CIPTA MAHKOTA', s / 2, s * 0.45);

      ctx.fillStyle = '#9EDCF2';
      ctx.font = '600 22px sans-serif';
      ctx.fillText('BENGKEL INOVASI & KARYA DIRAJA', s / 2, s * 0.64);
    },
    anisotropy,
  );
}

export function buildAtelierChambers(
  mats: MaterialPalette,
  _progress: PlayerProgress,
  isSoftwareGl: boolean,
  helpers: AtelierHelpers,
): BuiltWorld {
  const group = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const localMats: THREE.Material[] = [];
  const localTex: THREE.Texture[] = [];
  const disposables: Array<() => void> = [];

  const trackGeo: TrackGeoFn = (g) => {
    geos.push(g);
    return g;
  };
  const trackMat: TrackMatFn = (m) => {
    localMats.push(m);
    return m;
  };
  const trackTex = <T extends THREE.Texture>(t: T): T => {
    localTex.push(t);
    return t;
  };

  const circleColliders: CircleCollider[] = [];
  const boxColliders: BoxCollider[] = [];
  const interactables: InteractablePoint[] = [];
  const animatedUpdates: Array<
    (elapsed: number, dt: number, playerPos?: THREE.Vector3, voice?: VoiceTelemetry) => void
  > = [];
  const mixers: THREE.AnimationMixer[] = [];
  const aniso = isSoftwareGl ? 1 : 4;

  // Pre-allocated scratch vectors for zero per-frame allocation
  const _tmpOrbPos = new THREE.Vector3();

  // ==========================================================================
  // 1. PROCEDURAL TEXTURES & SHARED LUXURY MATERIALS
  // ==========================================================================
  const centerFloorTex = trackTex(
    makeCanvasTex(
      512,
      (ctx, s) => {
        ctx.fillStyle = '#E8DFCF';
        ctx.fillRect(0, 0, s, s);
        const step = s / 4;
        for (let y = 0; y < 4; y++) {
          for (let x = 0; x < 4; x++) {
            ctx.fillStyle = (x + y) % 2 === 0 ? '#EFE7D8' : '#DDD2BE';
            ctx.fillRect(x * step, y * step, step, step);
            ctx.strokeStyle = 'rgba(212, 175, 55, 0.58)';
            ctx.lineWidth = 3;
            ctx.strokeRect(x * step + 4, y * step + 4, step - 8, step - 8);
            ctx.fillStyle = 'rgba(212, 175, 55, 0.32)';
            ctx.beginPath();
            ctx.arc(x * step + step / 2, y * step + step / 2, 5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      },
      aniso,
      3,
      6,
    ),
  );

  const workshopFloorTex = trackTex(
    makeCanvasTex(
      512,
      (ctx, s) => {
        ctx.fillStyle = '#152146';
        ctx.fillRect(0, 0, s, s);
        const step = s / 4;
        for (let y = 0; y < 4; y++) {
          for (let x = 0; x < 4; x++) {
            ctx.fillStyle = (x + y) % 2 === 0 ? '#1C2C5C' : '#131F42';
            ctx.fillRect(x * step, y * step, step, step);
            ctx.strokeStyle = 'rgba(229, 195, 90, 0.42)';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(x * step + 3, y * step + 3, step - 6, step - 6);
          }
        }
      },
      aniso,
      4,
    ),
  );

  const studioFloorTex = trackTex(
    makeCanvasTex(
      512,
      (ctx, s) => {
        ctx.fillStyle = '#1E1138';
        ctx.fillRect(0, 0, s, s);
        const step = s / 4;
        for (let y = 0; y < 4; y++) {
          for (let x = 0; x < 4; x++) {
            ctx.fillStyle = (x + y) % 2 === 0 ? '#2A184E' : '#190E30';
            ctx.fillRect(x * step, y * step, step, step);
            ctx.strokeStyle = 'rgba(229, 195, 90, 0.38)';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(x * step + 4, y * step + 4, step - 8, step - 8);
          }
        }
      },
      aniso,
      4,
    ),
  );

  const acousticWallTex = trackTex(createAcousticWallTexture(aniso));
  const consoleScreenTex = trackTex(createMixingConsoleScreenTexture(aniso));
  const storyboardTexNorth = trackTex(
    createStoryboardDisplayTexture('PAPAN CERITA DIGITAL', 'Bab I - III · Balai Cipta Mahkota', '#7BE0E6', aniso),
  );
  const storyboardTexSouth = trackTex(
    createStoryboardDisplayTexture('ARKIB INOVASI DIRAJA', 'Reka Bentuk & Artifak Hikayat', '#C8A4FA', aniso),
  );
  const workshopSignTex = trackTex(createWorkshopSignTexture(aniso));
  const studioSignTex = trackTex(createStudioSignTexture(aniso));
  const runeSealTex = trackTex(createWorkshopRuneSealTexture());
  const glowSpriteTex = trackTex(createGlowSpriteTex());

  const centerFloorMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: centerFloorTex,
      roughness: 0.22,
      metalness: 0.16,
    }),
  );

  const workshopFloorMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: workshopFloorTex,
      roughness: 0.26,
      metalness: 0.25,
    }),
  );

  const studioFloorMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: studioFloorTex,
      roughness: 0.3,
      metalness: 0.24,
    }),
  );

  const acousticPanelMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: acousticWallTex,
      roughness: 0.52,
      metalness: 0.18,
    }),
  );

  const royalPurpleVelvetMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x4b287c,
      roughness: 0.72,
      metalness: 0.05,
      sheen: 0.9,
      sheenColor: new THREE.Color(0xc8a8ff),
    }),
  );

  const studioGlassMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x9cecf4,
      roughness: 0.1,
      metalness: 0.08,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    }),
  );

  const brushedGoldMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xe6c35a,
      roughness: 0.2,
      metalness: 0.88,
      clearcoat: 0.55,
    }),
  );

  const crystalLavenderMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xc8a4fa,
      emissive: 0x7b52c7,
      emissiveIntensity: 0.58,
      roughness: 0.14,
      metalness: 0.15,
      clearcoat: 1.0,
    }),
  );

  const crystalSapphireMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x62b4f8,
      emissive: 0x2664c8,
      emissiveIntensity: 0.62,
      roughness: 0.12,
      metalness: 0.18,
      clearcoat: 1.0,
    }),
  );

  const runeSealMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: runeSealTex,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );

  // Flowing directional energy light-stream shader for floor pathways & wall moldings
  const createPulseFlowShader = (colorA: number, colorB: number, speed = 1.4) =>
    trackMat(
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uBoost: { value: 0 },
          uColorA: { value: new THREE.Color(colorA) },
          uColorB: { value: new THREE.Color(colorB) },
          uSpeed: { value: speed },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          uniform float uTime;
          uniform float uBoost;
          uniform float uSpeed;
          uniform vec3 uColorA;
          uniform vec3 uColorB;
          void main() {
            float wave = 0.5 + 0.5 * sin(vUv.x * 18.85 - uTime * uSpeed);
            float pulse = pow(wave, 2.8);
            float edge = smoothstep(0.0, 0.22, vUv.y) * smoothstep(1.0, 0.78, vUv.y);
            vec3 col = mix(uColorA, uColorB, pulse);
            float alpha = edge * (0.34 + pulse * 0.56 + uBoost * 0.28);
            gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.96));
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    );

  const westFlowMat = createPulseFlowShader(0x47c6e8, 0xffe89e, 2.2);
  const eastFlowMat = createPulseFlowShader(0xa774f8, 0xffe89e, 2.2);
  const wallMoldingPulseMat = createPulseFlowShader(0xd8b454, 0xfff0be, 1.6);

  // ==========================================================================
  // 2. GROUND HEIGHT ELEVATION & FLOOR ZONES (SMOOTH STEPPED PLATFORMS)
  // ==========================================================================
  const groundHeightAt = (x: number, z: number): number => {
    const dWork = Math.hypot(x + 12.5, z + 2.0);
    if (dWork < 4.4) {
      return dWork < 3.6 ? 0.32 : THREE.MathUtils.lerp(0.32, 0, (dWork - 3.6) / 0.8);
    }
    const dStudio = Math.hypot(x - 12.5, z + 2.0);
    if (dStudio < 4.5) {
      return dStudio < 3.7 ? 0.36 : THREE.MathUtils.lerp(0.36, 0, (dStudio - 3.7) / 0.8);
    }
    return 0;
  };

  // Central Rotunda Lobby Floor (Gold-Inlaid Ivory Marble)
  const centerFloor = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(11.0, 0.2, 34)), centerFloorMat);
  centerFloor.position.set(0, -0.1, 0);
  centerFloor.receiveShadow = true;
  group.add(centerFloor);

  // West Wing Floor (Balai Cipta Mahkota — Midnight Navy & Gold Inlay)
  const westFloor = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(18.0, 0.2, 34)), workshopFloorMat);
  westFloor.position.set(-14.5, -0.1, 0);
  westFloor.receiveShadow = true;
  group.add(westFloor);

  // East Wing Floor (Balai Gema Diraja — Deep Royal Purple & Gold Inlay)
  const eastFloor = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(18.0, 0.2, 34)), studioFloorMat);
  eastFloor.position.set(14.5, -0.1, 0);
  eastFloor.receiveShadow = true;
  group.add(eastFloor);

  // Ornate Coffered Ceiling overhead across all 3 connected bays
  const ceiling = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(47, 0.6, 35)), mats.cofferedCeiling);
  ceiling.position.set(0, 14.8, 0);
  group.add(ceiling);

  // Perimeter Enclosure Walls (Midnight Navy in West, Royal Acoustic Purple in East, Ivory Center)
  const backWallW = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(18, 15, 0.8)), mats.midnightNavy);
  backWallW.position.set(-14.5, 7.5, -17);
  const backWallC = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(11, 15, 0.8)), mats.creamStone);
  backWallC.position.set(0, 7.5, -17);
  const backWallE = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(18, 15, 0.8)), acousticPanelMat);
  backWallE.position.set(14.5, 7.5, -17);

  const frontWallW = backWallW.clone();
  frontWallW.position.z = 17;
  const frontWallC = backWallC.clone();
  frontWallC.position.z = 17;
  const frontWallE = backWallE.clone();
  frontWallE.position.z = 17;

  const sideWallWest = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.8, 15, 34.4)), mats.midnightNavy);
  sideWallWest.position.set(-23.2, 7.5, 0);
  const sideWallEast = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.8, 15, 34.4)), acousticPanelMat);
  sideWallEast.position.set(23.2, 7.5, 0);
  group.add(backWallW, backWallC, backWallE, frontWallW, frontWallC, frontWallE, sideWallWest, sideWallEast);

  // Animated Light Pulses flowing continuously along gilded perimeter dado moldings
  [-16.52, 16.52].forEach((mz) => {
    const moldingBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(45.2, 0.24, 0.18)), brushedGoldMat);
    moldingBase.position.set(0, 3.6, mz);
    const pulseStrip = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(45.0, 0.14)), wallMoldingPulseMat);
    pulseStrip.position.set(0, 3.74, mz + (mz < 0 ? 0.1 : -0.1));
    if (mz > 0) pulseStrip.rotation.y = Math.PI;
    group.add(moldingBase, pulseStrip);
  });

  // ==========================================================================
  // 3. CENTRAL ROYAL CONNECTING ROTUNDA, ASTROLABE MONUMENT & PORTAL GATEWAYS
  // ==========================================================================
  // A. Central Inlaid Royal Medallion & Animated Astral Astrolabe Centerpiece (0, 0, 1.8)
  const rotundaCenter = new THREE.Group();
  rotundaCenter.position.set(0, 0, 1.8);

  const centerSealDisc = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(7.2, 7.2)), runeSealMat);
  centerSealDisc.rotation.x = -Math.PI / 2;
  centerSealDisc.position.y = 0.025;
  rotundaCenter.add(centerSealDisc);

  const fountainPlinth1 = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.5, 1.72, 0.28, 16)),
    mats.pearlIvory,
  );
  fountainPlinth1.position.y = 0.14;
  const fountainPlinth2 = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.08, 1.24, 0.56, 16)),
    mats.creamStone,
  );
  fountainPlinth2.position.y = 0.56;
  const fountainGoldCollar = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(1.12, 0.06, 8, 28)),
    brushedGoldMat,
  );
  fountainGoldCollar.rotation.x = Math.PI / 2;
  fountainGoldCollar.position.y = 0.85;

  const rotundaSpire = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(0.42, 1.15, 8)),
    brushedGoldMat,
  );
  rotundaSpire.position.y = 1.38;

  const rotundaOrbGroup = new THREE.Group();
  rotundaOrbGroup.position.y = 2.65;
  const rotundaCoreCrystal = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.44, 0)),
    mats.crystalTurquoise,
  );
  const rotundaRingA = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.95, 0.048, 8, 32)),
    brushedGoldMat,
  );
  const rotundaRingB = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.72, 0.036, 8, 28)),
    crystalLavenderMat,
  );
  rotundaRingB.rotation.x = Math.PI / 3;
  rotundaOrbGroup.add(rotundaCoreCrystal, rotundaRingA, rotundaRingB);

  rotundaCenter.add(fountainPlinth1, fountainPlinth2, fountainGoldCollar, rotundaSpire, rotundaOrbGroup);
  group.add(rotundaCenter);
  circleColliders.push({ x: 0, z: 1.8, radius: 1.62 });

  // 4 Fluted Ivory & Gold Rotunda Columns framing Tukang Kata Arif & the Return Portal
  const rotundaColumnRings: THREE.Mesh[] = [];
  [
    [-4.1, -9.8],
    [4.1, -9.8],
    [-4.1, 9.8],
    [4.1, 9.8],
  ].forEach(([cx, cz], idx) => {
    const base = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.15, 0.55, 1.15)), mats.pearlIvory);
    base.position.set(cx, 0.27, cz);
    const shaft = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.36, 0.42, 13.4, 14)), mats.creamStone);
    shaft.position.set(cx, 7.2, cz);
    shaft.castShadow = !isSoftwareGl;
    const cap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.22, 0.42, 1.22)), brushedGoldMat);
    cap.position.set(cx, 14.0, cz);
    const haloRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.68, 0.04, 8, 24)),
      idx % 2 === 0 ? mats.crystalTurquoise : crystalLavenderMat,
    );
    haloRing.rotation.x = Math.PI / 2;
    haloRing.position.set(cx, 4.6, cz);
    rotundaColumnRings.push(haloRing);
    group.add(base, shaft, cap, haloRing);
    circleColliders.push({ x: cx, z: cz, radius: 0.65 });
  });

  // Grand Partition Gateways separating Central Rotunda from Both Chambers (wide open z in [-6.4, 6.4])
  const portalVeilMaterials: THREE.MeshBasicMaterial[] = [];
  const buildWingDividerArch = (
    xPos: number,
    signTex: THREE.CanvasTexture,
    accentMat: THREE.Material,
    veilColor: number,
  ) => {
    const archGroup = new THREE.Group();
    archGroup.position.set(xPos, 0, 0);

    [-11.8, 11.8].forEach((pz) => {
      const wallPier = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.85, 14.5, 10.2)), mats.creamStone);
      wallPier.position.set(0, 7.25, pz);
      wallPier.receiveShadow = true;
      const trim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.05, 0.45, 10.3)), brushedGoldMat);
      trim.position.set(0, 1.2, pz);
      const upperTrim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.05, 0.35, 10.3)), brushedGoldMat);
      upperTrim.position.set(0, 7.5, pz);
      archGroup.add(wallPier, trim, upperTrim);
    });

    [-6.6, 6.6].forEach((pz) => {
      const colBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.3, 0.6, 1.3)), mats.pearlIvory);
      colBase.position.set(0, 0.3, pz);
      const colShaft = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.42, 0.48, 8.2, 14)), brushedGoldMat);
      colShaft.position.set(0, 4.7, pz);
      colShaft.castShadow = !isSoftwareGl;
      const colCap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.25, 0.45, 1.25)), mats.antiqueGold);
      colCap.position.set(0, 9.0, pz);

      const torchGem = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.28, 0)), accentMat);
      torchGem.position.set(xPos < 0 ? 0.65 : -0.65, 3.8, pz);
      archGroup.add(colBase, colShaft, colCap, torchGem);
    });

    const archSpan = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(6.6, 0.38, 10, 32, Math.PI)),
      brushedGoldMat,
    );
    archSpan.rotation.y = Math.PI / 2;
    archSpan.position.set(0, 9.0, 0);
    archGroup.add(archSpan);

    // Shimmering Magical Portal Threshold Veil hanging gently in the arch upper-sides
    const veilMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: veilColor,
        transparent: true,
        opacity: 0.11,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    );
    portalVeilMaterials.push(veilMat);
    const portalVeil = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(12.2, 8.8)), veilMat);
    portalVeil.rotation.y = Math.PI / 2;
    portalVeil.position.set(0, 4.6, 0);
    archGroup.add(portalVeil);

    const spandrel = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.8, 2.8, 14)), mats.creamStone);
    spandrel.position.set(0, 13.4, 0);
    archGroup.add(spandrel);

    const signMat = trackMat(
      new THREE.MeshStandardMaterial({
        map: signTex,
        emissive: 0xffffff,
        emissiveMap: signTex,
        emissiveIntensity: 0.48,
        roughness: 0.25,
      }),
    );
    const signBoard = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 1.85, 5.8)), signMat);
    signBoard.position.set(xPos < 0 ? 0.52 : -0.52, 10.6, 0);
    const signFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.18, 2.05, 6.05)), accentMat);
    signFrame.position.copy(signBoard.position);
    archGroup.add(signFrame, signBoard);

    group.add(archGroup);
    boxColliders.push(
      { minX: xPos - 0.65, maxX: xPos + 0.65, minZ: -16.8, maxZ: -6.4 },
      { minX: xPos - 0.65, maxX: xPos + 0.65, minZ: 6.4, maxZ: 16.8 },
    );
  };

  buildWingDividerArch(-5.5, workshopSignTex, mats.crystalTurquoise, 0x62d9f8);
  buildWingDividerArch(5.5, studioSignTex, crystalLavenderMat, 0xb884ff);

  // Central Rotunda Chandelier
  const lobbyChand = helpers.buildCrystalChandelier(trackGeo, trackMat, mats);
  lobbyChand.position.set(0, 11.4, 1.8);
  group.add(lobbyChand);

  // Ornate Carpeted Runners + Animated Glowing Directional Floor Pathways leading into Both Wings
  const westRunner = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(11.6, 0.04, 2.8)), mats.royalBlueBrocade);
  westRunner.position.set(-5.8, 0.02, -2.0);
  const eastRunner = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(11.6, 0.04, 2.8)), royalPurpleVelvetMat);
  eastRunner.position.set(5.8, 0.02, -2.0);

  const westFlowRibbon = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(11.2, 0.65)), westFlowMat);
  westFlowRibbon.rotation.x = -Math.PI / 2;
  westFlowRibbon.rotation.z = Math.PI; // flow outward toward -X (Balai Cipta Mahkota)
  westFlowRibbon.position.set(-5.6, 0.05, -2.0);

  const eastFlowRibbon = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(11.2, 0.65)), eastFlowMat);
  eastFlowRibbon.rotation.x = -Math.PI / 2; // flow outward toward +X (Balai Gema Diraja)
  eastFlowRibbon.position.set(5.6, 0.05, -2.0);

  // North-South Royal Carpet Runner connecting Tukang Kata Arif -> Center -> Return Portal
  const centerSpineRunner = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.6, 0.036, 20.5)), mats.velvetCrimson);
  centerSpineRunner.position.set(0, 0.018, 3.6);
  group.add(westRunner, eastRunner, westFlowRibbon, eastFlowRibbon, centerSpineRunner);

  // ==========================================================================
  // 3B. INTERACTIVE MAGICAL PORTAL TELEPORTATION PADS BETWEEN CHAMBERS
  // ==========================================================================
  const teleportRingRefs: Array<{ ring: THREE.Mesh; gem: THREE.Mesh; phase: number }> = [];
  const addTeleportPad = (
    id: string,
    x: number,
    z: number,
    colorHex: number,
    label: string,
    sublabel: string,
    targetX: number,
    targetZ: number,
    targetYaw: number,
    targetZoneName: string,
    phase: number,
  ) => {
    const padGroup = new THREE.Group();
    padGroup.position.set(x, 0, z);

    const disc = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.05, 1.18, 0.08, 24)), mats.pearlIvory);
    disc.position.y = 0.04;
    const goldRim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.06, 0.05, 8, 28)), brushedGoldMat);
    goldRim.rotation.x = Math.PI / 2;
    goldRim.position.y = 0.08;

    const magicRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.86, 0.04, 8, 28)),
      trackMat(
        new THREE.MeshStandardMaterial({
          color: colorHex,
          emissive: colorHex,
          emissiveIntensity: 0.95,
          roughness: 0.2,
        }),
      ),
    );
    magicRing.rotation.x = Math.PI / 2;
    magicRing.position.y = 0.14;

    const gem = new THREE.Mesh(
      trackGeo(new THREE.OctahedronGeometry(0.24, 0)),
      trackMat(
        new THREE.MeshStandardMaterial({
          color: colorHex,
          emissive: colorHex,
          emissiveIntensity: 1.0,
          roughness: 0.15,
        }),
      ),
    );
    gem.position.y = 1.25;

    padGroup.add(disc, goldRim, magicRing, gem);
    group.add(padGroup);
    teleportRingRefs.push({ ring: magicRing, gem, phase });

    interactables.push({
      id,
      label,
      sublabel,
      position: new THREE.Vector3(x, 0.8, z),
      radius: 2.2,
      action: {
        type: 'atelier_teleport',
        targetX,
        targetZ,
        targetYaw,
        targetZoneName,
      },
      visualRef: gem,
    });
  };

  // Atrium -> Balai Cipta Mahkota & Atrium -> Balai Gema Diraja
  addTeleportPad(
    'portal-to-workshop',
    -3.8,
    5.2,
    0x62d9f8,
    'Tekan E untuk Portal Ajaib ke Balai Cipta Mahkota',
    'Teleportasi terus ke ruang inovasi dan penulisan hikayat',
    -8.8,
    2.2,
    Math.PI * 0.35,
    'Balai Cipta Mahkota',
    0,
  );
  addTeleportPad(
    'portal-to-studio',
    3.8,
    5.2,
    0xc88cff,
    'Tekan E untuk Portal Ajaib ke Balai Gema Diraja',
    'Teleportasi terus ke studio rakaman suara diraja',
    8.8,
    2.2,
    -Math.PI * 0.35,
    'Balai Gema Diraja',
    1.5,
  );
  // Direct cross-chamber portals inside each wing
  addTeleportPad(
    'portal-workshop-to-studio',
    -7.5,
    8.6,
    0xc88cff,
    'Tekan E untuk Portal Ajaib ke Balai Gema Diraja',
    'Melintas terus ke studio rakaman suara diraja',
    8.8,
    2.2,
    -Math.PI * 0.35,
    'Balai Gema Diraja',
    3.0,
  );
  addTeleportPad(
    'portal-studio-to-workshop',
    7.5,
    8.6,
    0x62d9f8,
    'Tekan E untuk Portal Ajaib ke Balai Cipta Mahkota',
    'Melintas terus ke bengkel inovasi hikayat',
    -8.8,
    2.2,
    Math.PI * 0.35,
    'Balai Cipta Mahkota',
    4.5,
  );

  // Central Rotunda Animation + Proximity Threshold Shimmer
  let centerNearBlend = 0;
  animatedUpdates.push((elapsed, dt, playerPos) => {
    lobbyChand.rotation.y = elapsed * 0.14;
    westFlowMat.uniforms.uTime.value = elapsed;
    eastFlowMat.uniforms.uTime.value = elapsed;
    wallMoldingPulseMat.uniforms.uTime.value = elapsed;

    const nearCenter = playerPos ? Math.hypot(playerPos.x, playerPos.z - 1.8) < 4.5 : false;
    centerNearBlend = THREE.MathUtils.lerp(centerNearBlend, nearCenter ? 1 : 0, 1 - Math.exp(-5 * dt));

    const rotSpin = 1 + centerNearBlend * 1.45;
    centerSealDisc.rotation.z = elapsed * (0.22 + centerNearBlend * 0.5);
    rotundaRingA.rotation.y = elapsed * 0.7 * rotSpin;
    rotundaRingA.rotation.x = Math.sin(elapsed * 0.6) * 0.35;
    rotundaRingB.rotation.z = -elapsed * 0.95 * rotSpin;
    rotundaCoreCrystal.rotation.y = elapsed * 1.3 * rotSpin;
    rotundaOrbGroup.position.y = 2.65 + Math.sin(elapsed * 1.8) * 0.14 + centerNearBlend * 0.15;

    rotundaColumnRings.forEach((r, idx) => {
      r.position.y = 4.6 + Math.sin(elapsed * 1.5 + idx) * 0.25;
      r.rotation.z = elapsed * 0.8;
    });

    // Portal curtain intensifies softly as player nears either gateway x = +-5.5
    const nearWestGate = playerPos ? Math.abs(playerPos.x + 5.5) < 2.4 && Math.abs(playerPos.z) < 6.5 : false;
    const nearEastGate = playerPos ? Math.abs(playerPos.x - 5.5) < 2.4 && Math.abs(playerPos.z) < 6.5 : false;
    portalVeilMaterials[0].opacity = THREE.MathUtils.lerp(
      portalVeilMaterials[0].opacity,
      nearWestGate ? 0.28 : 0.1,
      1 - Math.exp(-6 * dt),
    );
    portalVeilMaterials[1].opacity = THREE.MathUtils.lerp(
      portalVeilMaterials[1].opacity,
      nearEastGate ? 0.28 : 0.1,
      1 - Math.exp(-6 * dt),
    );

    teleportRingRefs.forEach((tr) => {
      tr.gem.rotation.y = elapsed * 1.6 + tr.phase;
      tr.gem.position.y = 1.25 + Math.sin(elapsed * 2.4 + tr.phase) * 0.14;
      tr.ring.rotation.z = elapsed * 1.1;
    });
  });

  // ==========================================================================
  // 4. WING 1 (WEST): BALAI CIPTA MAHKOTA — THE ROYAL ENCHANTED WORKSHOP
  // ==========================================================================
  const workshopGroup = new THREE.Group();
  group.add(workshopGroup);

  // A. Elevated Mezzanine Balcony + Stained Glass Windows with Sunbeams
  const mezzDeck = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.4, 0.42, 32)), mats.creamStone);
  mezzDeck.position.set(-20.4, 3.6, 0);
  const mezzRail = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.18, 0.95, 32)), brushedGoldMat);
  mezzRail.position.set(-18.3, 4.3, 0);
  workshopGroup.add(mezzDeck, mezzRail);
  boxColliders.push({ minX: -22.8, maxX: -18.1, minZ: -16.5, maxZ: 16.5 });

  const beamMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xffeeb8,
      transparent: true,
      opacity: isSoftwareGl ? 0.06 : 0.09,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
  );
  [-9.5, 0, 9.5].forEach((wz, idx) => {
    const winPane = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(4.2, 8.2)), mats.stainedGlass);
    winPane.position.set(-22.72, 8.6, wz);
    winPane.rotation.y = Math.PI / 2;
    const winFrame = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(2.15, 0.16, 8, 24, Math.PI)),
      brushedGoldMat,
    );
    winFrame.position.set(-22.66, 10.6, wz);
    winFrame.rotation.y = Math.PI / 2;

    const beam = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.1, 2.6, 15, 12, 1, true)), beamMat);
    beam.position.set(-16.5, 6.2, wz);
    beam.rotation.z = -0.68;
    workshopGroup.add(winPane, winFrame, beam);
    animatedUpdates.push((elapsed) => {
      beam.rotation.x = Math.sin(elapsed * 0.45 + idx) * 0.06;
    });
  });

  // B. Tall Elegant Fluted Golden Workshop Pillars with Orbiting Crystal Rings
  [
    [-8.5, -11.5],
    [-16.2, -11.5],
    [-8.5, 11.5],
    [-16.2, 11.5],
  ].forEach(([px, pz], idx) => {
    const plinth = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.3, 0.65, 1.3)), mats.pearlIvory);
    plinth.position.set(px, 0.32, pz);
    const shaft = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.4, 0.48, 13.0, 14)), brushedGoldMat);
    shaft.position.set(px, 7.1, pz);
    shaft.castShadow = !isSoftwareGl;
    const cap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.4, 0.45, 1.4)), mats.antiqueGold);
    cap.position.set(px, 13.8, pz);
    const ring = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.85, 0.04, 8, 24)), mats.crystalTurquoise);
    ring.position.set(px, 5.2, pz);
    ring.rotation.x = Math.PI * 0.42;
    workshopGroup.add(plinth, shaft, cap, ring);
    circleColliders.push({ x: px, z: pz, radius: 0.72 });
    animatedUpdates.push((elapsed) => {
      ring.rotation.z = elapsed * (0.65 + idx * 0.1);
      ring.position.y = 5.2 + Math.sin(elapsed * 1.6 + idx) * 0.35;
    });
  });

  // C. Royal Workshop Chandelier overhead
  const workChand = helpers.buildCrystalChandelier(trackGeo, trackMat, mats);
  workChand.position.set(-12.5, 11.2, -2.0);
  workshopGroup.add(workChand);
  animatedUpdates.push((elapsed) => {
    workChand.rotation.y = -elapsed * 0.16;
  });

  // D. Stepped Golden Creation Dais + Elaborate Royal Creation Table (-12.5, 0.32, -2.0)
  const wDais1 = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(4.4, 4.7, 0.18, 24)), mats.pearlIvory);
  wDais1.position.set(-12.5, 0.09, -2.0);
  const wDais2 = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(3.8, 4.0, 0.16, 24)), mats.creamStone);
  wDais2.position.set(-12.5, 0.25, -2.0);
  const wDaisRim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(3.82, 0.06, 8, 36)), brushedGoldMat);
  wDaisRim.rotation.x = Math.PI / 2;
  wDaisRim.position.set(-12.5, 0.34, -2.0);
  const wRuneSeal = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(6.8, 6.8)), runeSealMat);
  wRuneSeal.rotation.x = -Math.PI / 2;
  wRuneSeal.position.set(-12.5, 0.35, -2.0);
  workshopGroup.add(wDais1, wDais2, wDaisRim, wRuneSeal);

  const deskGroup = new THREE.Group();
  deskGroup.position.set(-12.5, 0.32, -2.0);

  const deskTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.0, 0.2, 2.1)), mats.darkWalnut);
  deskTop.position.y = 1.12;
  const deskGoldTrim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.18, 0.14, 2.28)), brushedGoldMat);
  deskGoldTrim.position.y = 1.07;

  const deskLegProfile = [
    new THREE.Vector2(0.28, 0),
    new THREE.Vector2(0.18, 0.24),
    new THREE.Vector2(0.24, 0.52),
    new THREE.Vector2(0.15, 0.8),
    new THREE.Vector2(0.24, 1.04),
  ];
  const deskLegGeo = trackGeo(new THREE.LatheGeometry(deskLegProfile, 14));
  [
    [-1.65, -0.75],
    [1.65, -0.75],
    [-1.65, 0.75],
    [1.65, 0.75],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(deskLegGeo, mats.antiqueGold);
    leg.position.set(lx, 0, lz);
    deskGroup.add(leg);
  });

  // Illuminated Open Hero Manuscript directly on Creation Table (auto-turning pages)
  const heroManuscriptGroup = new THREE.Group();
  heroManuscriptGroup.position.set(-0.45, 1.34, 0.18);
  const heroSpine = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.12, 0.08, 0.92)), brushedGoldMat);
  const heroPageGeo = trackGeo(new THREE.BoxGeometry(0.68, 0.05, 0.88));
  heroPageGeo.translate(0.34, 0, 0);
  const heroBookPageL = new THREE.Mesh(heroPageGeo, mats.pearlIvory);
  heroBookPageL.rotation.y = Math.PI;
  const heroBookPageR = new THREE.Mesh(heroPageGeo, mats.pearlIvory);
  const heroTurnLeaf = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(0.62, 0.82)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfff8e6,
        emissive: 0xffdf8e,
        emissiveIntensity: 0.45,
        side: THREE.DoubleSide,
      }),
    ),
  );
  heroTurnLeaf.rotation.x = -Math.PI / 2;
  heroManuscriptGroup.add(heroSpine, heroBookPageL, heroBookPageR, heroTurnLeaf);

  const inkCrystal = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.22, 0)), mats.crystalTurquoise);
  inkCrystal.position.set(1.25, 1.48, 0.32);

  // Digital Creation Storyboard Blueprint Easel on the Creation Table
  const easelFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.2, 2.15, 0.12)), brushedGoldMat);
  easelFrame.position.set(0, 2.52, -1.32);
  const easelCanvas = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(2.96, 1.92)),
    trackMat(
      new THREE.MeshStandardMaterial({
        map: storyboardTexNorth,
        emissive: 0xffffff,
        emissiveMap: storyboardTexNorth,
        emissiveIntensity: 0.42,
        roughness: 0.25,
      }),
    ),
  );
  easelCanvas.position.set(0, 2.52, -1.24);

  // Orbiting Multi-Ring Arcane Astrolabe + Flowing Light Ribbons circling the Creation Table
  const astroGroup = new THREE.Group();
  astroGroup.position.set(0, 4.25, 0);
  const astroCore = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.34, 0)), crystalSapphireMat);
  const astroR1 = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.05, 0.048, 8, 32)), brushedGoldMat);
  const astroR2 = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.74, 0.036, 8, 28)), mats.crystalTurquoise);
  astroR2.rotation.x = Math.PI / 3;
  astroGroup.add(astroCore, astroR1, astroR2);

  const tableLightStreamMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x7be0e6,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const tableOrbitRingA = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(2.45, 0.032, 8, 48)), tableLightStreamMat);
  tableOrbitRingA.rotation.x = Math.PI / 2 - 0.16;
  tableOrbitRingA.position.y = 1.65;
  const tableOrbitRingB = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(2.15, 0.028, 8, 48)), brushedGoldMat);
  tableOrbitRingB.rotation.x = Math.PI / 2 + 0.18;
  tableOrbitRingB.position.y = 1.85;

  const tableManaOrbs: THREE.Mesh[] = [];
  for (let o = 0; o < 6; o++) {
    const orb = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.095, 10, 10)),
      o % 2 === 0 ? mats.crystalTurquoise : crystalSapphireMat,
    );
    deskGroup.add(orb);
    tableManaOrbs.push(orb);
  }

  deskGroup.add(
    deskTop,
    deskGoldTrim,
    heroManuscriptGroup,
    inkCrystal,
    easelFrame,
    easelCanvas,
    astroGroup,
    tableOrbitRingA,
    tableOrbitRingB,
  );
  workshopGroup.add(deskGroup);
  boxColliders.push({ minX: -14.7, maxX: -10.3, minZ: -3.5, maxZ: -0.8 });

  let workNearBlend = 0;
  animatedUpdates.push((elapsed, dt, playerPos) => {
    const nearW = playerPos ? Math.hypot(playerPos.x + 12.5, playerPos.z + 2.0) < 4.7 : false;
    workNearBlend = THREE.MathUtils.lerp(workNearBlend, nearW ? 1 : 0, 1 - Math.exp(-5 * dt));
    const spin = 1 + workNearBlend * 1.5;

    wRuneSeal.rotation.z = elapsed * (0.25 + workNearBlend * 0.7);
    westFlowMat.uniforms.uBoost.value = workNearBlend * 0.6;

    astroR1.rotation.y = elapsed * 0.9 * spin;
    astroR1.rotation.x = Math.sin(elapsed * 0.7) * 0.35;
    astroR2.rotation.z = -elapsed * 1.2 * spin;
    astroCore.rotation.y = elapsed * 1.6;
    astroGroup.position.y = 4.25 + Math.sin(elapsed * 2.1) * 0.14 + workNearBlend * 0.2;
    inkCrystal.rotation.y = elapsed * 1.4;

    // Animated hero open manuscript right on creation desk
    heroManuscriptGroup.position.y = 1.34 + workNearBlend * 0.18 + Math.sin(elapsed * 2.2) * 0.03;
    const flap = Math.sin(elapsed * (1.8 + workNearBlend * 1.4)) * 0.12;
    heroBookPageL.rotation.z = -0.22 + flap;
    heroBookPageR.rotation.z = 0.22 - flap;
    const pagePhase = (elapsed * (0.55 + workNearBlend * 0.45)) % 1;
    heroTurnLeaf.rotation.y = Math.PI * pagePhase;
    heroTurnLeaf.position.y = 0.05 + Math.sin(pagePhase * Math.PI) * 0.24;

    // Flowing light ring & mana orbs circling creation table
    tableOrbitRingA.rotation.z = elapsed * 0.65 * spin;
    tableOrbitRingB.rotation.z = -elapsed * 0.5 * spin;
    tableLightStreamMat.opacity = 0.36 + workNearBlend * 0.35;
    for (let o = 0; o < tableManaOrbs.length; o++) {
      const a = elapsed * (0.85 + workNearBlend * 0.5) + (o / tableManaOrbs.length) * Math.PI * 2;
      tableManaOrbs[o].position.set(
        Math.cos(a) * 2.45,
        1.65 + Math.sin(a * 2 + o) * 0.28 + workNearBlend * 0.2,
        Math.sin(a) * 1.65,
      );
    }
  });

  interactables.push({
    id: 'atelier-writer',
    label: 'Tekan E untuk Meja Balai Cipta Mahkota & Mentor AI',
    sublabel: 'Rancang jalan cerita, papan cerita, dan semak skrip bersama Mentor AI',
    position: new THREE.Vector3(-12.5, 1.32, -2.0),
    radius: 4.1,
    action: { type: 'atelier_writer' },
    visualRef: astroGroup,
  });

  // E. Enchanted Invention Machines (Gearwork Forge + Crystal Alembic) & Energy Conduits
  const gearShape = createGearShape(1.15, 0.88, 12, 0.28);
  const gearGeo = trackGeo(
    new THREE.ExtrudeGeometry(gearShape, {
      depth: 0.18,
      bevelEnabled: true,
      bevelSize: 0.03,
      bevelThickness: 0.03,
    }),
  );
  gearGeo.center();

  const buildInventionMachine = (mx: number, mz: number, matCore: THREE.Material, dir: number) => {
    const mach = new THREE.Group();
    mach.position.set(mx, 0, mz);

    const base = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.65, 1.9, 0.75, 12)), mats.pearlIvory);
    base.position.y = 0.37;
    const brassCol = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.45, 0.6, 2.4, 12)), brushedGoldMat);
    brassCol.position.y = 1.9;
    const glassDome = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(1.1, 1.1, 2.1, 16, 1, true)),
      studioGlassMat,
    );
    glassDome.position.y = 2.0;
    const coreCrystal = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.55, 0)), matCore);
    coreCrystal.position.y = 2.1;

    const gearA = new THREE.Mesh(gearGeo, brushedGoldMat);
    gearA.position.set(0, 3.3, 0);
    gearA.rotation.x = Math.PI / 2;
    const gearB = new THREE.Mesh(gearGeo, mats.antiqueGold);
    gearB.scale.setScalar(0.68);
    gearB.position.set(0.85 * dir, 1.85, 0.6);

    mach.add(base, brassCol, glassDome, coreCrystal, gearA, gearB);
    workshopGroup.add(mach);
    circleColliders.push({ x: mx, z: mz, radius: 1.8 });

    const conduitCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(mx, 3.4, mz),
      new THREE.Vector3((mx - 12.5) * 0.5, 6.4, (mz - 2.0) * 0.5),
      new THREE.Vector3(-12.5, 4.5, -2.0),
    ]);
    const conduitTube = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(conduitCurve, 24, 0.06, 8, false)),
      brushedGoldMat,
    );
    workshopGroup.add(conduitTube);

    const pulseOrb = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.18, 12, 12)), matCore);
    workshopGroup.add(pulseOrb);

    animatedUpdates.push((elapsed) => {
      gearA.rotation.z = elapsed * 0.7 * dir;
      gearB.rotation.z = -elapsed * 1.1 * dir;
      coreCrystal.rotation.y = elapsed * 1.4;
      coreCrystal.position.y = 2.1 + Math.sin(elapsed * 2.2 + mx) * 0.18;
      const t = (elapsed * 0.28 + (dir > 0 ? 0 : 0.5)) % 1;
      conduitCurve.getPointAt(t, _tmpOrbPos);
      pulseOrb.position.copy(_tmpOrbPos);
    });
  };

  buildInventionMachine(-16.2, -9.2, mats.crystalTurquoise, 1);
  buildInventionMachine(-16.2, 5.4, crystalSapphireMat, -1);

  // F. Royal Artifact Display Racks & Digital Creation Showcase Panels (North & South West Walls)
  const buildArtifactDisplayBay = (
    x: number,
    z: number,
    rotY: number,
    displayTex: THREE.CanvasTexture,
    artifactType: 'castle' | 'crown',
  ) => {
    const bay = new THREE.Group();
    bay.position.set(x, 0, z);
    bay.rotation.y = rotY;

    // Ornate Gilded Glass Artifact Cabinet (Left side of bay)
    const cabBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.6, 1.1, 1.15)), mats.darkWalnut);
    cabBase.position.set(-1.7, 0.55, 0);
    const cabTrim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.74, 0.14, 1.28)), brushedGoldMat);
    cabTrim.position.set(-1.7, 1.12, 0);
    const cabGlass = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.4, 2.2, 0.96)), studioGlassMat);
    cabGlass.position.set(-1.7, 2.25, 0);
    const cabTopArch = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(1.22, 0.1, 8, 24, Math.PI)),
      brushedGoldMat,
    );
    cabTopArch.position.set(-1.7, 3.35, 0);

    // Floating Royal Artifact inside Glass Vitrine
    const artifact = new THREE.Group();
    artifact.position.set(-1.7, 2.15, 0);
    if (artifactType === 'castle') {
      const keep = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.65, 0.65, 0.65)), brushedGoldMat);
      const roof = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.45, 0.52, 6)), mats.royalBlueBrocade);
      roof.position.y = 0.58;
      const gem = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.18, 0)), mats.crystalTurquoise);
      gem.position.y = 0.98;
      artifact.add(keep, roof, gem);
    } else {
      const crownRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.42, 0.08, 8, 24)), brushedGoldMat);
      crownRing.rotation.x = Math.PI / 2;
      const centerGem = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.28, 0)), crystalLavenderMat);
      centerGem.position.y = 0.25;
      artifact.add(crownRing, centerGem);
    }

    // Illuminated Digital Creation Showcase Display Stand (Right side of bay)
    const screenPed = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.32, 0.45, 1.1, 12)), brushedGoldMat);
    screenPed.position.set(1.6, 0.55, 0);
    const screenFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.2, 2.4, 0.16)), brushedGoldMat);
    screenFrame.position.set(1.6, 2.45, 0);
    const screenBoard = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(2.96, 2.16)),
      trackMat(
        new THREE.MeshStandardMaterial({
          map: displayTex,
          emissive: 0xffffff,
          emissiveMap: displayTex,
          emissiveIntensity: 0.46,
          roughness: 0.22,
        }),
      ),
    );
    screenBoard.position.set(1.6, 2.45, 0.1);

    bay.add(cabBase, cabTrim, cabGlass, cabTopArch, artifact, screenPed, screenFrame, screenBoard);
    workshopGroup.add(bay);

    boxColliders.push({ minX: x - 3.3, maxX: x + 3.3, minZ: z - 0.8, maxZ: z + 0.8 });

    let bayNearBlend = 0;
    animatedUpdates.push((elapsed, dt, playerPos) => {
      const nearBay = playerPos ? Math.hypot(playerPos.x - x, playerPos.z - z) < 4.8 : false;
      bayNearBlend = THREE.MathUtils.lerp(bayNearBlend, nearBay ? 1 : 0, 1 - Math.exp(-5 * dt));
      artifact.rotation.y = elapsed * (0.9 + bayNearBlend * 1.4);
      artifact.position.y = 2.15 + Math.sin(elapsed * 2.2) * 0.1 + bayNearBlend * 0.22;
      (screenBoard.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.42 + bayNearBlend * 0.45;
    });
  };

  buildArtifactDisplayBay(-12.5, -14.9, 0, storyboardTexNorth, 'castle');
  buildArtifactDisplayBay(-12.5, 14.9, Math.PI, storyboardTexSouth, 'crown');

  // G. Floating Magical Storybooks (Opening & Closing Pages via AnimationMixer + Proximity Reaction)
  const bookPositions: Array<[number, number, number]> = [
    [-15.2, 4.8, -5.5],
    [-9.8, 5.2, -7.2],
    [-10.2, 4.6, 3.5],
    [-15.4, 5.1, 1.5],
    [-19.2, 6.2, -4.5],
    [-19.2, 6.0, 4.5],
    [-12.5, 5.8, -10.5],
    [-12.5, 5.6, 9.8],
  ];
  const pageGeo = trackGeo(new THREE.BoxGeometry(0.46, 0.04, 0.64));
  pageGeo.translate(0.23, 0, 0);
  const innerPageGeo = trackGeo(new THREE.BoxGeometry(0.41, 0.045, 0.56));
  innerPageGeo.translate(0.21, 0.032, 0);

  bookPositions.forEach(([bx, by, bz], idx) => {
    const book = new THREE.Group();
    book.position.set(bx, by, bz);
    const spine = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.09, 0.07, 0.66)), brushedGoldMat);
    const coverL = new THREE.Mesh(pageGeo, idx % 2 === 0 ? mats.royalBlueBrocade : mats.velvetCrimson);
    coverL.name = 'WingL';
    coverL.rotation.y = Math.PI;
    const innerL = new THREE.Mesh(innerPageGeo, mats.pearlIvory);
    coverL.add(innerL);

    const coverR = new THREE.Mesh(pageGeo, idx % 2 === 0 ? mats.royalBlueBrocade : mats.velvetCrimson);
    coverR.name = 'WingR';
    const innerR = new THREE.Mesh(innerPageGeo, mats.pearlIvory);
    coverR.add(innerR);

    book.add(spine, coverL, coverR);
    workshopGroup.add(book);

    const clip = new THREE.AnimationClip(`WorkshopBook_${idx}`, 2.8, [
      new THREE.NumberKeyframeTrack('WingL.rotation[z]', [0, 1.4, 2.8], [-0.22, -0.82, -0.22]),
      new THREE.NumberKeyframeTrack('WingR.rotation[z]', [0, 1.4, 2.8], [0.22, 0.82, 0.22]),
    ]);
    const mixer = new THREE.AnimationMixer(book);
    const act = mixer.clipAction(clip);
    act.setLoop(THREE.LoopRepeat, Infinity);
    act.time = idx * 0.42;
    act.play();
    mixers.push(mixer);

    animatedUpdates.push((elapsed) => {
      book.position.y = by + Math.sin(elapsed * 1.4 + idx) * 0.34;
      book.rotation.y = elapsed * 0.38 + idx;
    });
  });

  // H. Orbiting Glowing Workshop Crystals floating gracefully around Balai Cipta Mahkota
  const crystalPositions: Array<[number, number, number]> = [
    [-9.2, 3.6, -4.8],
    [-15.8, 3.8, -1.8],
    [-9.5, 3.5, 4.2],
    [-15.2, 4.0, 8.6],
  ];
  crystalPositions.forEach(([cx, cy, cz], idx) => {
    const cGroup = new THREE.Group();
    cGroup.position.set(cx, cy, cz);
    const shard = new THREE.Mesh(
      trackGeo(new THREE.OctahedronGeometry(0.32, 0)),
      idx % 2 === 0 ? mats.crystalTurquoise : crystalSapphireMat,
    );
    shard.scale.set(0.75, 1.65, 0.75);
    const halo = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.55, 0.025, 6, 20)), brushedGoldMat);
    halo.rotation.x = Math.PI / 2.4;
    cGroup.add(shard, halo);
    workshopGroup.add(cGroup);
    animatedUpdates.push((elapsed) => {
      cGroup.position.y = cy + Math.sin(elapsed * 1.7 + idx * 1.4) * 0.32;
      shard.rotation.y = elapsed * 1.1;
      halo.rotation.z = -elapsed * 0.9;
    });
  });

  // ==========================================================================
  // 5. WING 2 (EAST): BALAI GEMA DIRAJA — THE ROYAL VOICE RECORDING CHAMBER
  // ==========================================================================
  const studioGroup = new THREE.Group();
  group.add(studioGroup);

  // A. Sculpted 3D Royal Purple & Gold Acoustic Wall Panels + Velvet Curtains + Sconces
  [-11.5, 0, 11.5].forEach((sz, idx) => {
    [-2.4, 2.4].forEach((offZ) => {
      const curtain = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.32, 0.48, 12.2, 12)),
        royalPurpleVelvetMat,
      );
      curtain.position.set(22.1, 6.2, sz + offZ);
      const tieRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.42, 0.05, 8, 20)), brushedGoldMat);
      tieRing.rotation.x = Math.PI / 2;
      tieRing.position.set(22.1, 4.2, sz + offZ);
      studioGroup.add(curtain, tieRing);
    });

    // 3D Beveled Geometric Diamond Acoustic Coffer Reliefs flanking the studio wall
    const baffleFrame = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.65, 0.08, 6, 4)), brushedGoldMat);
    baffleFrame.position.set(22.58, 7.6, sz);
    baffleFrame.rotation.y = Math.PI / 2;
    const medGem = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.42, 0)), crystalLavenderMat);
    medGem.position.set(22.3, 7.6, sz);
    studioGroup.add(baffleFrame, medGem);
    animatedUpdates.push((elapsed) => {
      medGem.rotation.y = elapsed * 1.1 + idx;
    });
  });

  // Sculpted 3D Acoustic Diamond Baffles along North & South Studio Walls (x = 9..20, z = +-16.4)
  [9.8, 14.5, 19.2].forEach((ax) => {
    [-16.42, 16.42].forEach((az) => {
      const diamond = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(1.15, 0)), royalPurpleVelvetMat);
      diamond.scale.set(1.2, 1.7, 0.22);
      diamond.position.set(ax, 7.8, az);
      const frame = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.38, 0.06, 6, 4)), brushedGoldMat);
      frame.position.set(ax, 7.8, az + (az < 0 ? 0.14 : -0.14));
      studioGroup.add(diamond, frame);
    });
  });

  // B. Monumental Illuminated Live Audio-Wave Wall Display behind the Stage (22.0, 5.2, -2.0)
  const wallWaveShaderMat = trackMat(
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uActivity: { value: 0.2 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform float uActivity;
        void main() {
          vec3 bg = mix(vec3(0.06, 0.04, 0.16), vec3(0.14, 0.08, 0.30), vUv.y);
          float amp = 0.08 + uActivity * 0.26;
          float w1 = smoothstep(0.035, 0.0, abs(vUv.y - 0.5 - sin(vUv.x * 16.0 + uTime * 3.8) * amp));
          float w2 = smoothstep(0.04, 0.0, abs(vUv.y - 0.5 + cos(vUv.x * 11.0 - uTime * 2.9) * (amp * 0.78)));
          float w3 = smoothstep(0.025, 0.0, abs(vUv.y - 0.5 - sin(vUv.x * 26.0 + uTime * 5.2) * (amp * 0.48)));
          vec3 gold = vec3(0.96, 0.84, 0.44);
          vec3 violet = vec3(0.76, 0.54, 1.0);
          vec3 cyan = vec3(0.48, 0.90, 0.94);
          vec3 col = bg + gold * w1 * 1.15 + violet * w2 * 0.95 + cyan * w3 * 0.85;
          gl_FragColor = vec4(col, 0.95);
        }
      `,
    }),
  );
  const wallWaveFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 3.8, 7.6)), brushedGoldMat);
  wallWaveFrame.position.set(22.25, 5.2, -2.0);
  const wallWaveScreen = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(7.1, 3.3)), wallWaveShaderMat);
  wallWaveScreen.rotation.y = -Math.PI / 2;
  wallWaveScreen.position.set(22.08, 5.2, -2.0);
  studioGroup.add(wallWaveFrame, wallWaveScreen);

  // C. Ornate Recording Studio Chandelier + Dramatic Volumetric Studio Spotlight Beams
  const studioChand = helpers.buildCrystalChandelier(trackGeo, trackMat, mats);
  studioChand.position.set(12.5, 11.4, -2.0);
  studioGroup.add(studioChand);
  animatedUpdates.push((elapsed) => {
    studioChand.rotation.y = elapsed * 0.18;
  });

  const studioSpotBeamMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xdab8ff,
      transparent: true,
      opacity: isSoftwareGl ? 0.06 : 0.085,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
  );
  [-1, 1].forEach((sideZ) => {
    const spotCone = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.45, 2.9, 10.2, 16, 1, true)),
      studioSpotBeamMat,
    );
    spotCone.position.set(12.5, 5.6, -2.0 + sideZ * 2.1);
    spotCone.rotation.x = sideZ * 0.36;
    studioGroup.add(spotCone);
  });

  // D. Magnificent Central Royal Recording Stage (12.5, 0.36, -2.0) + Soundproof Booth Canopy
  const stStep1 = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(4.5, 4.85, 0.18, 28)), mats.pearlIvory);
  stStep1.position.set(12.5, 0.09, -2.0);
  const stStep2 = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(3.9, 4.1, 0.18, 28)), royalPurpleVelvetMat);
  stStep2.position.set(12.5, 0.27, -2.0);
  const stGoldRim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(3.92, 0.07, 8, 36)), brushedGoldMat);
  stGoldRim.rotation.x = Math.PI / 2;
  stGoldRim.position.set(12.5, 0.37, -2.0);
  const stStepGlowRim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(4.54, 0.04, 8, 36)), crystalLavenderMat);
  stStepGlowRim.rotation.x = Math.PI / 2;
  stStepGlowRim.position.set(12.5, 0.19, -2.0);
  const stFloorSeal = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(7.2, 7.2)), runeSealMat);
  stFloorSeal.rotation.x = -Math.PI / 2;
  stFloorSeal.position.set(12.5, 0.38, -2.0);
  studioGroup.add(stStep1, stStep2, stGoldRim, stStepGlowRim, stFloorSeal);

  const boothCrownRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(4.05, 0.12, 10, 32, Math.PI * 1.15)),
    brushedGoldMat,
  );
  boothCrownRing.rotation.x = Math.PI / 2;
  boothCrownRing.rotation.z = -Math.PI * 0.58;
  boothCrownRing.position.set(12.5, 4.85, -2.0);
  studioGroup.add(boothCrownRing);

  for (let b = 0; b < 5; b++) {
    const ba = -Math.PI * 0.55 + (b / 4) * Math.PI * 1.1;
    const bx = 12.5 + Math.cos(ba) * 4.05;
    const bz = -2.0 + Math.sin(ba) * 4.05;
    const post = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.11, 0.14, 4.5, 10)), brushedGoldMat);
    post.position.set(bx, 2.6, bz);
    studioGroup.add(post);

    if (b < 4) {
      const midA = ba + (Math.PI * 1.1) / 8;
      const gx = 12.5 + Math.cos(midA) * 4.05;
      const gz = -2.0 + Math.sin(midA) * 4.05;
      const glassPanel = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.6, 3.8, 0.08)), studioGlassMat);
      glassPanel.position.set(gx, 2.45, gz);
      glassPanel.rotation.y = -midA + Math.PI / 2;
      studioGroup.add(glassPanel);
    }
  }

  const onAirMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xdcb854,
      emissive: 0x9b66f5,
      emissiveIntensity: 0.45,
      roughness: 0.2,
      metalness: 0.5,
    }),
  );
  const onAirCrown = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.6, 0.52, 0.24)), onAirMat);
  onAirCrown.position.set(12.5, 5.2, -5.85);
  studioGroup.add(onAirCrown);

  // E. Detailed Royal Studio Condenser Microphone & Stand on Central Stage
  const micGroup = new THREE.Group();
  micGroup.position.set(12.5, 0.36, -2.0);

  const micBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.36, 0.46, 0.12, 16)), brushedGoldMat);
  micBase.position.y = 0.06;
  const micShaft = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.038, 0.055, 1.55, 12)), brushedGoldMat);
  micShaft.position.y = 0.85;
  const micMountRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.22, 0.025, 8, 24)), mats.antiqueGold);
  micMountRing.position.y = 1.78;

  const micBody = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.085, 0.075, 0.26, 14)), mats.midnightNavy);
  micBody.position.y = 1.72;
  const micGrilleMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf7df9c,
      emissive: 0x7be0e6,
      emissiveIntensity: 0.55,
      roughness: 0.2,
      metalness: 0.75,
    }),
  );
  const micGrille = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.11, 14, 14)), micGrilleMat);
  micGrille.scale.set(0.95, 1.35, 0.95);
  micGrille.position.y = 1.9;

  const popFilter = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.16, 0.015, 6, 20)), mats.pearlIvory);
  popFilter.position.set(-0.22, 1.88, 0.08);
  popFilter.rotation.y = Math.PI / 3;

  const micCollarMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xc8a8ff,
      emissive: 0x9b68f5,
      emissiveIntensity: 0.65,
      roughness: 0.2,
    }),
  );
  const micCollar = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.26, 0.032, 8, 24)), micCollarMat);
  micCollar.rotation.x = Math.PI / 2;
  micCollar.position.y = 1.64;

  micGroup.add(micBase, micShaft, micMountRing, micBody, micGrille, popFilter, micCollar);
  studioGroup.add(micGroup);
  circleColliders.push({ x: 12.5, z: -2.0, radius: 0.65 });

  interactables.push({
    id: 'atelier-voice',
    label: 'Tekan E untuk memasuki Balai Gema Diraja',
    sublabel: 'Studio Rakaman Suara & Penganalisis Pertuturan AI',
    position: new THREE.Vector3(12.5, 1.36, -2.0),
    radius: 4.2,
    action: { type: 'atelier_voice' },
    visualRef: micGrille,
  });

  // F. Two Royal Golden Acoustic Lyre Trophy Pedestals in Studio Wing
  [
    [16.8, -10.8, 0],
    [9.4, -10.8, 1.5],
  ].forEach(([lx, lz, phase]) => {
    const ped = new THREE.Group();
    ped.position.set(lx, 0, lz);
    const base = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.58, 0.72, 1.15, 14)), mats.pearlIvory);
    base.position.y = 0.57;
    const cap = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.64, 0.64, 0.12, 14)), brushedGoldMat);
    cap.position.y = 1.2;

    const lyreGroup = new THREE.Group();
    lyreGroup.position.y = 2.05;
    const lyreArc = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.45, 0.05, 8, 24, Math.PI * 1.45)),
      brushedGoldMat,
    );
    lyreArc.rotation.z = -Math.PI * 0.22;
    const lyreCrystal = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.22, 0)), crystalLavenderMat);
    lyreGroup.add(lyreArc, lyreCrystal);

    ped.add(base, cap, lyreGroup);
    studioGroup.add(ped);
    circleColliders.push({ x: lx, z: lz, radius: 0.85 });

    let lyreNear = 0;
    animatedUpdates.push((elapsed, dt, playerPos) => {
      const isNear = playerPos ? Math.hypot(playerPos.x - lx, playerPos.z - lz) < 4.0 : false;
      lyreNear = THREE.MathUtils.lerp(lyreNear, isNear ? 1 : 0, 1 - Math.exp(-5 * dt));
      lyreGroup.rotation.y = elapsed * (0.9 + lyreNear * 1.6) + phase;
      lyreGroup.position.y = 2.05 + Math.sin(elapsed * 2.2 + phase) * 0.1 + lyreNear * 0.24;
    });
  });

  // G. Luxurious Royal Audio Mixing Console & Pedestal Monitor Speakers (17.2, 0, 5.2)
  const consoleGroup = new THREE.Group();
  consoleGroup.position.set(17.2, 0, 5.2);
  consoleGroup.rotation.y = -Math.PI * 0.28;

  const deskShell = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.2, 1.05, 1.65)), mats.darkWalnut);
  deskShell.position.y = 0.52;
  const deskTrim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.36, 0.1, 1.78)), brushedGoldMat);
  deskTrim.position.y = 1.04;

  const screenMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: consoleScreenTex,
      emissive: 0xffffff,
      emissiveMap: consoleScreenTex,
      emissiveIntensity: 0.55,
      roughness: 0.2,
    }),
  );
  const deskDisplay = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(3.4, 1.15)), screenMat);
  deskDisplay.position.set(0, 1.68, -0.45);
  deskDisplay.rotation.x = -0.22;

  const deskSlopePanel = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.6, 0.14, 0.95)), mats.midnightNavy);
  deskSlopePanel.position.set(0, 1.14, 0.15);
  deskSlopePanel.rotation.x = 0.18;

  [-2.55, 2.55].forEach((sx) => {
    const spkStand = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.12, 0.24, 1.35, 10)), brushedGoldMat);
    spkStand.position.set(sx, 0.67, -0.2);
    const spkBox = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.68, 0.92, 0.58)), mats.midnightNavy);
    spkBox.position.set(sx, 1.75, -0.2);
    const spkCone = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.22, 0.14, 0.08, 16)), mats.antiqueGold);
    spkCone.rotation.x = Math.PI / 2;
    spkCone.position.set(sx, 1.72, 0.1);
    consoleGroup.add(spkStand, spkBox, spkCone);
  });

  consoleGroup.add(deskShell, deskTrim, deskDisplay, deskSlopePanel);
  studioGroup.add(consoleGroup);
  circleColliders.push({ x: 17.2, z: 5.2, radius: 2.35 });

  // H. Real-Time Audio-Reactive 3D Holographic Sound Waves & 24 Harmonic Spectrum Bars
  const waveShaderMat = trackMat(
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uActivity: { value: 0.15 },
      },
      vertexShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform float uActivity;
        void main() {
          vUv = uv;
          vec3 pos = position;
          float wave = sin(uv.x * 18.84955 + uTime * 3.8) * (0.08 + uActivity * 0.34);
          pos.y += wave;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform float uActivity;
        void main() {
          float lineA = smoothstep(0.08, 0.0, abs(vUv.y - 0.5 - sin(vUv.x * 25.13 + uTime * 4.5) * (0.14 + uActivity * 0.28)));
          float lineB = smoothstep(0.09, 0.0, abs(vUv.y - 0.5 + cos(vUv.x * 18.84 - uTime * 3.2) * (0.12 + uActivity * 0.24)));
          vec3 gold = vec3(0.95, 0.82, 0.42);
          vec3 violet = vec3(0.76, 0.55, 0.98);
          vec3 cyan = vec3(0.48, 0.88, 0.92);
          vec3 col = mix(violet, gold, lineA) + cyan * lineB * 0.7;
          float alpha = clamp((lineA + lineB) * (0.42 + uActivity * 0.52), 0.0, 0.92);
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
  );

  const holoWaveCylinder = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(3.45, 3.45, 1.35, 48, 1, true)),
    waveShaderMat,
  );
  holoWaveCylinder.position.set(12.5, 2.75, -2.0);
  studioGroup.add(holoWaveCylinder);

  const specCount = 24;
  const specGeo = trackGeo(new THREE.BoxGeometry(0.16, 1.0, 0.16));
  specGeo.translate(0, 0.5, 0);
  const specBars: THREE.Mesh[] = [];
  for (let i = 0; i < specCount; i++) {
    const a = (i / specCount) * Math.PI * 2;
    const barMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0xf2d988 : 0xc8a4fa,
        emissive: i % 2 === 0 ? 0xd4af37 : 0x8a5be2,
        emissiveIntensity: 0.55,
        roughness: 0.22,
      }),
    );
    const bar = new THREE.Mesh(specGeo, barMat);
    bar.position.set(12.5 + Math.cos(a) * 3.15, 0.38, -2.0 + Math.sin(a) * 3.15);
    bar.rotation.y = -a;
    studioGroup.add(bar);
    specBars.push(bar);
  }

  const pulseRings: THREE.Mesh[] = [];
  for (let r = 0; r < 3; r++) {
    const pMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: r % 2 === 0 ? 0xffe89e : 0xc8a4fa,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    const pRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.8, 0.032, 6, 32)), pMat);
    pRing.rotation.x = Math.PI / 2;
    pRing.position.set(12.5, 2.2, -2.0);
    studioGroup.add(pRing);
    pulseRings.push(pRing);
  }

  // Disciplined 3-PointLight Environmental Accent Rig
  const studioAccentLight = new THREE.PointLight(0xb98aff, 1.8, 18);
  studioAccentLight.position.set(12.5, 5.2, -2.0);
  const workshopAccentLight = new THREE.PointLight(0xffd984, 1.7, 18);
  workshopAccentLight.position.set(-12.5, 5.4, -2.0);
  const rotundaLight = new THREE.PointLight(0xffe7a8, 1.35, 16);
  rotundaLight.position.set(0, 6.2, 1.8);
  group.add(studioAccentLight, workshopAccentLight, rotundaLight);

  let smoothVoiceActivity = 0;
  let studioNearBlend = 0;
  let consoleNearBlend = 0;
  animatedUpdates.push((elapsed, dt, playerPos, voice) => {
    const nearStudio = playerPos ? Math.hypot(playerPos.x - 12.5, playerPos.z + 2.0) < 4.9 : false;
    const nearConsole = playerPos ? Math.hypot(playerPos.x - 17.2, playerPos.z - 5.2) < 4.5 : false;
    studioNearBlend = THREE.MathUtils.lerp(studioNearBlend, nearStudio ? 1 : 0, 1 - Math.exp(-5 * dt));
    consoleNearBlend = THREE.MathUtils.lerp(consoleNearBlend, nearConsole ? 1 : 0, 1 - Math.exp(-5 * dt));

    const targetVoice = voice?.isRecording ? Math.max(0.28, Math.min(1, voice.level * 1.45)) : 0;
    smoothVoiceActivity = THREE.MathUtils.lerp(smoothVoiceActivity, targetVoice, 1 - Math.exp(-10 * dt));

    // Combine real recording activity with subtle welcoming studio proximity awakening
    const visualActivity = Math.max(smoothVoiceActivity, studioNearBlend * 0.36);

    waveShaderMat.uniforms.uTime.value = elapsed;
    waveShaderMat.uniforms.uActivity.value = 0.08 + visualActivity;

    wallWaveShaderMat.uniforms.uTime.value = elapsed;
    wallWaveShaderMat.uniforms.uActivity.value = 0.16 + visualActivity;
    eastFlowMat.uniforms.uBoost.value = studioNearBlend * 0.6;

    studioSpotBeamMat.opacity = (isSoftwareGl ? 0.055 : 0.08) + visualActivity * 0.07;
    screenMat.emissiveIntensity = 0.5 + Math.max(consoleNearBlend * 0.45, smoothVoiceActivity * 0.55);

    micCollarMat.emissiveIntensity = 0.45 + visualActivity * 1.6;
    micGrilleMat.emissiveIntensity = 0.4 + visualActivity * 1.4;
    onAirMat.emissiveIntensity = voice?.isRecording ? 1.35 + smoothVoiceActivity * 0.8 : 0.35 + studioNearBlend * 0.45;
    onAirMat.emissive.setHex(voice?.isRecording ? 0xf2526e : 0x9b66f5);

    studioAccentLight.intensity = 1.6 + visualActivity * 2.4;
    studioAccentLight.color.setHex(voice?.isRecording ? 0xf7d070 : 0xb98aff);
    stFloorSeal.rotation.z = elapsed * (0.22 + visualActivity * 0.9);

    for (let i = 0; i < specCount; i++) {
      const idleWave = 0.25 + Math.abs(Math.sin(elapsed * 1.5 + i * 0.45)) * 0.22;
      const activeWave = Math.abs(Math.sin(elapsed * 7.5 + i * 0.7)) * (0.65 + visualActivity * 1.45);
      const h = THREE.MathUtils.lerp(idleWave, activeWave, Math.min(1, visualActivity * 1.15));
      specBars[i].scale.y = Math.max(0.18, h);
    }

    for (let r = 0; r < pulseRings.length; r++) {
      const phase = (elapsed * (0.35 + visualActivity * 0.65) + r / 3) % 1;
      const ring = pulseRings[r];
      ring.position.y = 2.0 + phase * 3.4;
      ring.scale.setScalar(0.55 + phase * (1.4 + visualActivity * 1.3));
      (ring.material as THREE.MeshBasicMaterial).opacity =
        (1 - phase) * (0.18 + visualActivity * 0.65);
    }
  });

  // ==========================================================================
  // 6. GOLDEN MAGIC PARTICLES ACROSS ALL THREE CONNECTED SPACES
  // ==========================================================================
  const sparkCount = isSoftwareGl ? 60 : 180;
  const sparkPos = new Float32Array(sparkCount * 3);
  for (let i = 0; i < sparkCount; i++) {
    const t = i / sparkCount;
    sparkPos[i * 3] = (Math.sin(i * 73.1) * 0.5 + (i % 2 === 0 ? -0.25 : 0.25)) * 40;
    sparkPos[i * 3 + 1] = 0.8 + ((t * 9.5) % 9.5);
    sparkPos[i * 3 + 2] = Math.cos(i * 41.7) * 14.5;
  }
  const sparkGeo = trackGeo(new THREE.BufferGeometry());
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const sparkMat = trackMat(
    new THREE.PointsMaterial({
      map: glowSpriteTex,
      color: 0xffe8a4,
      size: 0.38,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  group.add(sparks);
  animatedUpdates.push((elapsed) => {
    sparks.position.y = Math.sin(elapsed * 0.7) * 0.28;
    sparks.rotation.y = elapsed * 0.025;
  });

  // ==========================================================================
  // 7. TUKANG KATA ARIF NPC & RETURN PORTAL (PRESERVED EXACT POSITIONS & IDS!)
  // ==========================================================================
  const master = createNpcCharacter(0x2d538e, 0xdcb854, 0x3b281e);
  master.group.position.set(1.9, 0, 7.6);
  group.add(master.group);
  disposables.push(master.dispose);
  circleColliders.push({ x: 1.9, z: 7.6, radius: 0.75 });
  animatedUpdates.push((elapsed) => master.updateIdle(elapsed));

  const masterBeacon = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.22, 0)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xdcb854,
        emissive: 0xdcb854,
        emissiveIntensity: 0.9,
        roughness: 0.18,
      }),
    ),
  );
  masterBeacon.position.set(1.9, 2.55, 7.6);
  group.add(masterBeacon);
  animatedUpdates.push((elapsed) => {
    masterBeacon.rotation.y = elapsed * 1.8;
    masterBeacon.position.y = 2.55 + Math.sin(elapsed * 2.4) * 0.12;
  });

  interactables.push({
    id: 'npc-atelier',
    label: 'Berbicara dengan Tukang Kata Arif',
    sublabel: 'Dengar bimbingan Misi 3 & Misi 4',
    position: new THREE.Vector3(1.9, 1, 7.6),
    radius: 3.1,
    action: { type: 'npc', npcKey: 'atelierMaster' },
    visualRef: masterBeacon,
  });

  const retPortal = helpers.createArchitecturalPortal('citadel', 0xdcb854, true, trackGeo, trackMat, mats);
  retPortal.group.position.set(0, 0, 14);
  group.add(retPortal.group);
  animatedUpdates.push((elapsed) => {
    retPortal.ring.rotation.z = elapsed * 1.1;
  });
  interactables.push({
    id: 'return-citadel',
    label: 'Tekan E untuk kembali ke Balai Agung Diraja',
    sublabel: 'Kembali ke istana kerajaan',
    position: new THREE.Vector3(0, 1, 14),
    radius: 3.1,
    action: { type: 'portal', targetLocation: 'citadel' },
    visualRef: retPortal.ring,
  });

  return {
    group,
    skyColor: 0x1e2548,
    fogColor: 0x262652,
    fogDensity: 0.0082,
    boundsRadius: 24.5,
    roomRect: { minX: -22.5, maxX: 22.5, minZ: -16.5, maxZ: 16.5, maxY: 14.5 },
    circleColliders,
    boxColliders,
    interactables,
    groundHeightAt,
    update: (elapsed, dt, playerPos, voice) => {
      for (let i = 0; i < mixers.length; i++) {
        mixers[i].update(dt);
      }
      for (let i = 0; i < animatedUpdates.length; i++) {
        animatedUpdates[i](elapsed, dt, playerPos, voice);
      }
    },
    dispose: () => {
      mixers.forEach((m) => m.stopAllAction());
      geos.forEach((g) => g.dispose());
      localMats.forEach((m) => m.dispose());
      localTex.forEach((t) => t.dispose());
      disposables.forEach((d) => d());
    },
  };
}
