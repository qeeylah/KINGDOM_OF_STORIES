import * as THREE from 'three';
import type { PlayerProgress } from '../types/game';
import { createNpcCharacter } from './characters';
import type { MaterialPalette } from './materials';
import type { BoxCollider, BuiltWorld, CircleCollider, InteractablePoint } from './worlds';

type TrackGeoFn = <T extends THREE.BufferGeometry>(g: T) => T;
type TrackMatFn = <T extends THREE.Material>(m: T) => T;

export interface BalairungHelpers {
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
}

function makeCanvasTex(
  size: number,
  draw: (ctx: CanvasRenderingContext2D, s: number) => void,
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
  return tex;
}

function createRubyDamaskTexture(): THREE.CanvasTexture {
  return makeCanvasTex(
    512,
    (ctx, s) => {
      const bg = ctx.createLinearGradient(0, 0, 0, s);
      bg.addColorStop(0, '#5B0D20');
      bg.addColorStop(0.5, '#7A122B');
      bg.addColorStop(1, '#4C0A1B');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, s, s);

      // Subtle gilded royal damask quatrefoil lattice
      const step = 64;
      ctx.strokeStyle = 'rgba(229, 195, 90, 0.24)';
      ctx.lineWidth = 2;
      for (let y = 0; y <= s; y += step) {
        for (let x = 0; x <= s; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, y - 22);
          ctx.quadraticCurveTo(x + 18, y - 6, x + 22, y);
          ctx.quadraticCurveTo(x + 18, y + 6, x, y + 22);
          ctx.quadraticCurveTo(x - 18, y + 6, x - 22, y);
          ctx.quadraticCurveTo(x - 18, y - 6, x, y - 22);
          ctx.stroke();

          ctx.fillStyle = 'rgba(235, 209, 133, 0.22)';
          ctx.beginPath();
          ctx.arc(x, y, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
    3,
    2,
  );
}

function createRoyalPurpleWallTexture(): THREE.CanvasTexture {
  return makeCanvasTex(
    512,
    (ctx, s) => {
      const grad = ctx.createLinearGradient(0, 0, 0, s);
      grad.addColorStop(0, '#2B154A');
      grad.addColorStop(0.5, '#3D2068');
      grad.addColorStop(1, '#261341');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, s, s);

      // Recessed classical wall panels with champagne gold moldings
      const cols = 2;
      const cw = s / cols;
      for (let c = 0; c < cols; c++) {
        const ox = c * cw;
        ctx.strokeStyle = 'rgba(224, 189, 98, 0.62)';
        ctx.lineWidth = 6;
        ctx.strokeRect(ox + 22, 24, cw - 44, s - 48);

        ctx.strokeStyle = 'rgba(224, 189, 98, 0.28)';
        ctx.lineWidth = 2;
        ctx.strokeRect(ox + 36, 38, cw - 72, s - 76);

        // Delicate crown diamond inside panel
        const mx = ox + cw / 2;
        const my = s / 2;
        ctx.fillStyle = 'rgba(140, 22, 46, 0.35)';
        ctx.beginPath();
        ctx.moveTo(mx, my - 65);
        ctx.lineTo(mx + 44, my);
        ctx.lineTo(mx, my + 65);
        ctx.lineTo(mx - 44, my);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(235, 209, 133, 0.45)';
        ctx.stroke();
      }
    },
    4,
    1,
  );
}

function createStageBackdropTexture(): THREE.CanvasTexture {
  return makeCanvasTex(1024, (ctx, s) => {
    const cx = s / 2;
    const cy = s * 0.48;
    const bg = ctx.createRadialGradient(cx, cy, 40, cx, cy, s * 0.58);
    bg.addColorStop(0, '#4E2A7A');
    bg.addColorStop(0.42, '#2B154C');
    bg.addColorStop(0.82, '#1A0D33');
    bg.addColorStop(1, '#120824');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, s, s);

    // Golden celestial rays behind the throne backdrop
    ctx.save();
    ctx.translate(cx, cy);
    for (let i = 0; i < 32; i++) {
      ctx.rotate((Math.PI * 2) / 32);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(235, 204, 118, 0.16)' : 'rgba(182, 136, 232, 0.08)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-14, -s * 0.48);
      ctx.lineTo(14, -s * 0.48);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Ornate golden concentric frame rings
    [0.39, 0.31].forEach((r, idx) => {
      ctx.strokeStyle = idx === 0 ? 'rgba(229, 195, 90, 0.72)' : 'rgba(244, 218, 146, 0.45)';
      ctx.lineWidth = idx === 0 ? 10 : 4;
      ctx.beginPath();
      ctx.arc(cx, cy, s * r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Golden open storybook & crown filigree emblem
    ctx.fillStyle = 'rgba(246, 234, 206, 0.92)';
    ctx.beginPath();
    ctx.moveTo(cx, cy + 56);
    ctx.quadraticCurveTo(cx - 64, cy + 32, cx - 102, cy + 56);
    ctx.lineTo(cx - 102, cy - 36);
    ctx.quadraticCurveTo(cx - 56, cy - 56, cx, cy - 26);
    ctx.quadraticCurveTo(cx + 56, cy - 56, cx + 102, cy - 36);
    ctx.lineTo(cx + 102, cy + 56);
    ctx.quadraticCurveTo(cx + 64, cy + 32, cx, cy + 56);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Crown above open book
    ctx.fillStyle = '#E5C35A';
    ctx.beginPath();
    ctx.moveTo(cx - 56, cy - 58);
    ctx.lineTo(cx - 70, cy - 112);
    ctx.lineTo(cx - 28, cy - 82);
    ctx.lineTo(cx, cy - 130);
    ctx.lineTo(cx + 28, cy - 82);
    ctx.lineTo(cx + 70, cy - 112);
    ctx.lineTo(cx + 56, cy - 58);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });
}

function createSpotlightBeamTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, 'rgba(255, 235, 168, 0.55)');
  grad.addColorStop(0.35, 'rgba(245, 212, 128, 0.28)');
  grad.addColorStop(0.75, 'rgba(220, 180, 240, 0.08)');
  grad.addColorStop(1, 'rgba(220, 180, 240, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createGoldParticleTex(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(255, 252, 230, 1)');
  g.addColorStop(0.35, 'rgba(240, 206, 118, 0.85)');
  g.addColorStop(0.75, 'rgba(196, 130, 224, 0.25)');
  g.addColorStop(1, 'rgba(196, 130, 224, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildRoyalCrownEmblem(
  tg: TrackGeoFn,
  goldMat: THREE.Material,
  rubyMat: THREE.Material,
  ivoryMat: THREE.Material,
  scale = 1,
): THREE.Group {
  const crown = new THREE.Group();
  crown.scale.setScalar(scale);

  // Crown velvet cushion core
  const cushion = new THREE.Mesh(
    tg(new THREE.SphereGeometry(0.38, 16, 12)),
    rubyMat,
  );
  cushion.scale.set(1.1, 0.72, 1.1);
  cushion.position.y = 0.24;
  crown.add(cushion);

  // Circlet band via LatheGeometry
  const bandPts = [
    new THREE.Vector2(0.4, 0),
    new THREE.Vector2(0.46, 0.08),
    new THREE.Vector2(0.48, 0.24),
    new THREE.Vector2(0.43, 0.3),
  ];
  const band = new THREE.Mesh(tg(new THREE.LatheGeometry(bandPts, 24)), goldMat);
  crown.add(band);

  // 8 sculpted crown spires with pearl/ruby finials
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const spire = new THREE.Mesh(tg(new THREE.ConeGeometry(0.08, 0.32, 8)), goldMat);
    spire.position.set(Math.cos(a) * 0.43, 0.42, Math.sin(a) * 0.43);
    crown.add(spire);

    const pearl = new THREE.Mesh(
      tg(new THREE.SphereGeometry(0.055, 10, 8)),
      i % 2 === 0 ? ivoryMat : rubyMat,
    );
    pearl.position.set(Math.cos(a) * 0.43, 0.59, Math.sin(a) * 0.43);
    crown.add(pearl);
  }

  // Crossed imperial arches
  [0, Math.PI / 2].forEach((ry) => {
    const arch = new THREE.Mesh(tg(new THREE.TorusGeometry(0.42, 0.032, 8, 24, Math.PI)), goldMat);
    arch.position.y = 0.28;
    arch.rotation.y = ry;
    crown.add(arch);
  });

  // Top orb + diamond finial
  const orb = new THREE.Mesh(tg(new THREE.SphereGeometry(0.09, 12, 10)), goldMat);
  orb.position.y = 0.72;
  const gem = new THREE.Mesh(tg(new THREE.OctahedronGeometry(0.09, 0)), rubyMat);
  gem.position.y = 0.86;
  crown.add(orb, gem);

  return crown;
}

function buildOperaChandelier(
  tg: TrackGeoFn,
  tm: TrackMatFn,
  mats: MaterialPalette,
  rubyMat: THREE.Material,
  tiers: 2 | 3,
): { group: THREE.Group; flames: THREE.Mesh[] } {
  const chandelier = new THREE.Group();
  const flames: THREE.Mesh[] = [];

  const candleGlowMat = tm(
    new THREE.MeshStandardMaterial({
      color: 0xfff8de,
      emissive: 0xffd26a,
      emissiveIntensity: 1.5,
      roughness: 0.18,
    }),
  );

  // Suspension chain & ceiling rose boss reaching dome oculus
  const chain = new THREE.Mesh(tg(new THREE.CylinderGeometry(0.06, 0.08, 7.6, 10)), mats.antiqueGold);
  chain.position.y = 3.8;
  chandelier.add(chain);

  // Sculpted central golden stem (LatheGeometry)
  const stemPts = [
    new THREE.Vector2(0.12, -2.0),
    new THREE.Vector2(0.28, -1.5),
    new THREE.Vector2(0.16, -0.7),
    new THREE.Vector2(0.36, 0.0),
    new THREE.Vector2(0.22, 0.55),
    new THREE.Vector2(0.1, 0.85),
  ];
  const stem = new THREE.Mesh(tg(new THREE.LatheGeometry(stemPts, 16)), mats.antiqueGold);
  chandelier.add(stem);

  const tierConfigs =
    tiers === 3
      ? [
          { r: 2.35, y: -0.05, candles: 12 },
          { r: 1.55, y: -0.95, candles: 8 },
          { r: 0.85, y: -1.65, candles: 6 },
        ]
      : [
          { r: 1.4, y: -0.1, candles: 8 },
          { r: 0.8, y: -0.85, candles: 6 },
        ];

  tierConfigs.forEach((tier, tIdx) => {
    const ring = new THREE.Mesh(tg(new THREE.TorusGeometry(tier.r, 0.075, 10, 36)), mats.champagneGold);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = tier.y;
    chandelier.add(ring);

    // Ornate ruby jewel ring accent
    if (tIdx === 0) {
      const rubyTrim = new THREE.Mesh(tg(new THREE.TorusGeometry(tier.r - 0.1, 0.03, 8, 32)), rubyMat);
      rubyTrim.rotation.x = Math.PI / 2;
      rubyTrim.position.y = tier.y - 0.04;
      chandelier.add(rubyTrim);
    }

    for (let i = 0; i < tier.candles; i++) {
      const a = (i / tier.candles) * Math.PI * 2;
      const cx = Math.cos(a) * tier.r;
      const cz = Math.sin(a) * tier.r;

      // Curved golden scroll arm to central stem
      const armCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(cx * 0.25, tier.y - 0.22, cz * 0.25),
        new THREE.Vector3(cx * 0.68, tier.y - 0.34, cz * 0.68),
        new THREE.Vector3(cx, tier.y, cz),
      ]);
      const arm = new THREE.Mesh(tg(new THREE.TubeGeometry(armCurve, 8, 0.025, 6, false)), mats.antiqueGold);
      chandelier.add(arm);

      const bobeche = new THREE.Mesh(tg(new THREE.CylinderGeometry(0.11, 0.05, 0.06, 10)), mats.champagneGold);
      bobeche.position.set(cx, tier.y + 0.04, cz);

      const candle = new THREE.Mesh(tg(new THREE.CylinderGeometry(0.045, 0.05, 0.28, 10)), mats.pearlIvory);
      candle.position.set(cx, tier.y + 0.2, cz);

      const flame = new THREE.Mesh(tg(new THREE.OctahedronGeometry(0.075, 0)), candleGlowMat);
      flame.scale.set(0.75, 1.5, 0.75);
      flame.position.set(cx, tier.y + 0.39, cz);
      flames.push(flame);

      // Hanging crystal prism teardrop below each candle
      const drop = new THREE.Mesh(tg(new THREE.OctahedronGeometry(0.13, 0)), mats.chandelierCrystal);
      drop.scale.set(0.65, 1.9, 0.65);
      drop.position.set(cx, tier.y - 0.28, cz);
      chandelier.add(bobeche, candle, flame, drop);
    }
  });

  // Grand central crystal finial drop
  const centralDrop = new THREE.Mesh(tg(new THREE.OctahedronGeometry(0.32, 0)), mats.chandelierCrystal);
  centralDrop.scale.set(0.75, 1.9, 0.75);
  centralDrop.position.y = tiers === 3 ? -2.35 : -1.45;
  chandelier.add(centralDrop);

  return { group: chandelier, flames };
}

function buildClassicalColumn(
  height: number,
  tg: TrackGeoFn,
  mats: MaterialPalette,
): THREE.Group {
  const col = new THREE.Group();

  // Stepped marble plinth base
  const base1 = new THREE.Mesh(tg(new THREE.BoxGeometry(1.35, 0.42, 1.35)), mats.warmIvoryMarble);
  base1.position.y = 0.21;
  base1.castShadow = true;
  base1.receiveShadow = true;

  const baseProfile = [
    new THREE.Vector2(0.62, 0),
    new THREE.Vector2(0.56, 0.16),
    new THREE.Vector2(0.45, 0.34),
    new THREE.Vector2(0.5, 0.46),
    new THREE.Vector2(0.42, 0.6),
  ];
  const torusBase = new THREE.Mesh(tg(new THREE.LatheGeometry(baseProfile, 20)), mats.antiqueGold);
  torusBase.position.y = 0.42;

  // Fluted ivory marble shaft
  const shaftH = height - 2.1;
  const shaft = new THREE.Mesh(tg(new THREE.CylinderGeometry(0.38, 0.44, shaftH, 18)), mats.creamStone);
  shaft.position.y = 1.02 + shaftH / 2;
  shaft.castShadow = true;
  shaft.receiveShadow = true;

  // Golden ring collars
  const collar = new THREE.Mesh(tg(new THREE.TorusGeometry(0.4, 0.045, 8, 24)), mats.antiqueGold);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 1.02 + shaftH - 0.12;

  // Sculpted Corinthian-style capital
  const capProfile = [
    new THREE.Vector2(0.38, 0),
    new THREE.Vector2(0.48, 0.28),
    new THREE.Vector2(0.62, 0.62),
    new THREE.Vector2(0.66, 0.8),
    new THREE.Vector2(0.55, 0.85),
  ];
  const capital = new THREE.Mesh(tg(new THREE.LatheGeometry(capProfile, 20)), mats.antiqueGold);
  capital.position.y = 1.02 + shaftH;

  const abacus = new THREE.Mesh(tg(new THREE.BoxGeometry(1.38, 0.24, 1.38)), mats.warmIvoryMarble);
  abacus.position.y = 1.02 + shaftH + 0.94;

  col.add(base1, torusBase, shaft, collar, capital, abacus);
  return col;
}

function buildRoyalStageThrone(
  tg: TrackGeoFn,
  mats: MaterialPalette,
  rubyMat: THREE.Material,
  purpleMat: THREE.Material,
): THREE.Group {
  const throne = new THREE.Group();

  // Octagonal stepped golden & ivory pedestal dais
  const step1 = new THREE.Mesh(tg(new THREE.CylinderGeometry(2.35, 2.55, 0.24, 8)), mats.warmIvoryMarble);
  step1.position.y = 0.12;
  step1.receiveShadow = true;
  const step2 = new THREE.Mesh(tg(new THREE.CylinderGeometry(1.75, 1.92, 0.24, 8)), rubyMat);
  step2.position.y = 0.36;
  step2.receiveShadow = true;
  const stepTrim = new THREE.Mesh(tg(new THREE.TorusGeometry(1.76, 0.045, 8, 32)), mats.antiqueGold);
  stepTrim.rotation.x = Math.PI / 2;
  stepTrim.position.y = 0.48;
  throne.add(step1, step2, stepTrim);

  // Throne base plinth & 4 sculpted cabriole legs
  const seatY = 0.48;
  [
    [-0.64, -0.52],
    [0.64, -0.52],
    [-0.68, 0.52],
    [0.68, 0.52],
  ].forEach(([lx, lz]) => {
    const legPts = [
      new THREE.Vector2(0.11, 0),
      new THREE.Vector2(0.07, 0.16),
      new THREE.Vector2(0.12, 0.36),
      new THREE.Vector2(0.09, 0.56),
    ];
    const leg = new THREE.Mesh(tg(new THREE.LatheGeometry(legPts, 12)), mats.antiqueGold);
    leg.position.set(lx, seatY, lz);
    throne.add(leg);
  });

  // Carved golden seat frame & plush tufted ruby velvet cushion
  const frameCurve = new THREE.Shape();
  frameCurve.moveTo(-0.74, -0.58);
  frameCurve.lineTo(0.74, -0.58);
  frameCurve.quadraticCurveTo(0.84, 0, 0.72, 0.58);
  frameCurve.quadraticCurveTo(0, 0.72, -0.72, 0.58);
  frameCurve.quadraticCurveTo(-0.84, 0, -0.74, -0.58);
  const seatFrameGeo = tg(
    new THREE.ExtrudeGeometry(frameCurve, {
      depth: 0.16,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 2,
    }),
  );
  seatFrameGeo.rotateX(Math.PI / 2);
  const seatFrame = new THREE.Mesh(seatFrameGeo, mats.antiqueGold);
  seatFrame.position.y = seatY + 0.68;
  seatFrame.castShadow = true;

  const cushionGeo = tg(new THREE.SphereGeometry(0.68, 18, 12));
  const cushion = new THREE.Mesh(cushionGeo, rubyMat);
  cushion.scale.set(1.06, 0.28, 0.92);
  cushion.position.set(0, seatY + 0.76, 0.02);
  throne.add(seatFrame, cushion);

  // Curved gilded armrests & velvet arm pads + ruby cabochon finials
  [-0.76, 0.76].forEach((ax) => {
    const post = new THREE.Mesh(tg(new THREE.CylinderGeometry(0.06, 0.08, 0.45, 10)), mats.antiqueGold);
    post.position.set(ax, seatY + 0.88, 0.45);

    const armCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(ax, seatY + 1.12, -0.45),
      new THREE.Vector3(ax * 1.04, seatY + 1.18, 0.0),
      new THREE.Vector3(ax, seatY + 1.08, 0.48),
    ]);
    const armRail = new THREE.Mesh(tg(new THREE.TubeGeometry(armCurve, 12, 0.065, 8, false)), mats.antiqueGold);
    const armPad = new THREE.Mesh(tg(new THREE.CapsuleGeometry(0.065, 0.5, 4, 8)), rubyMat);
    armPad.rotation.x = Math.PI / 2;
    armPad.position.set(ax * 1.03, seatY + 1.19, 0.02);

    const finial = new THREE.Mesh(tg(new THREE.OctahedronGeometry(0.09, 0)), rubyMat);
    finial.position.set(ax, seatY + 1.14, 0.55);
    throne.add(post, armRail, armPad, finial);
  });

  // High Arched Gilded & Tufted Royal Backrest (ExtrudeGeometry silhouette)
  const backShape = new THREE.Shape();
  backShape.moveTo(-0.78, 0);
  backShape.lineTo(-0.84, 1.35);
  backShape.quadraticCurveTo(-0.82, 2.25, 0, 2.65);
  backShape.quadraticCurveTo(0.82, 2.25, 0.84, 1.35);
  backShape.lineTo(0.78, 0);
  backShape.closePath();

  const backFrameGeo = tg(
    new THREE.ExtrudeGeometry(backShape, {
      depth: 0.16,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 3,
    }),
  );
  const backFrame = new THREE.Mesh(backFrameGeo, mats.antiqueGold);
  backFrame.position.set(0, seatY + 0.65, -0.62);
  backFrame.castShadow = true;

  const innerBack = new THREE.Mesh(backFrameGeo, rubyMat);
  innerBack.scale.set(0.84, 0.88, 0.6);
  innerBack.position.set(0, seatY + 0.74, -0.52);

  // Side throne finials + central sculpted Crown Crest above backrest
  [-0.84, 0.84].forEach((fx) => {
    const sideSpire = new THREE.Mesh(tg(new THREE.ConeGeometry(0.11, 0.42, 8)), mats.champagneGold);
    sideSpire.position.set(fx, seatY + 2.15, -0.54);
    const orb = new THREE.Mesh(tg(new THREE.SphereGeometry(0.08, 10, 8)), purpleMat);
    orb.position.set(fx, seatY + 2.4, -0.54);
    throne.add(sideSpire, orb);
  });

  const crestHalo = new THREE.Mesh(tg(new THREE.TorusGeometry(0.55, 0.045, 8, 28)), mats.champagneGold);
  crestHalo.position.set(0, seatY + 3.25, -0.56);
  const topCrown = buildRoyalCrownEmblem(tg, mats.antiqueGold, rubyMat, mats.pearlIvory, 0.62);
  topCrown.position.set(0, seatY + 3.3, -0.54);

  throne.add(backFrame, innerBack, crestHalo, topCrown);
  return throne;
}

export function buildBalairungGemilangDiraja(
  mats: MaterialPalette,
  _progress: PlayerProgress,
  isSoftwareGl: boolean,
  helpers: BalairungHelpers,
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
  const animatedUpdates: Array<(elapsed: number, dt: number) => void> = [];

  // Custom Luxury Opera House Materials (Royal Gold, Ruby Crimson, Ivory, Royal Purple)
  const rubyDamaskTex = trackTex(createRubyDamaskTexture());
  const royalPurpleTex = trackTex(createRoyalPurpleWallTexture());
  const stageBackdropTex = trackTex(createStageBackdropTexture());
  const spotBeamTex = trackTex(createSpotlightBeamTexture());
  const goldParticleTex = trackTex(createGoldParticleTex());

  const rubyVelvetMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x991632,
      roughness: 0.74,
      metalness: 0.06,
      sheen: 0.95,
      sheenRoughness: 0.42,
      sheenColor: new THREE.Color(0xf6d388),
      side: THREE.DoubleSide,
    }),
  );

  const rubyDamaskMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      map: rubyDamaskTex,
      roughness: 0.66,
      metalness: 0.08,
      sheen: 0.85,
      sheenColor: new THREE.Color(0xebd185),
    }),
  );

  const royalPurpleMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: royalPurpleTex,
      roughness: 0.56,
      metalness: 0.12,
      side: THREE.DoubleSide,
    }),
  );

  const royalPurpleVelvetMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x4b2478,
      roughness: 0.72,
      metalness: 0.06,
      sheen: 0.85,
      sheenColor: new THREE.Color(0xe5c35a),
    }),
  );

  // ============================================================================
  // 1. GRAND POLISHED MARBLE FLOOR, ROYAL MOSAIC & RUBY CARPET RUNNER
  // ============================================================================
  const mainFloor = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(23.5, 23.5, 0.24, 56)),
    mats.marbleFloor,
  );
  mainFloor.position.y = -0.12;
  mainFloor.receiveShadow = true;
  group.add(mainFloor);

  // Central Inlaid Royal Mosaic Medallion
  const mosaic = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(7.2, 48)), mats.royalMosaicFloor);
  mosaic.rotation.x = -Math.PI / 2;
  mosaic.position.set(0, 0.022, 6.2);
  mosaic.receiveShadow = true;
  group.add(mosaic);

  // Royal Ruby Velvet Carpet Runner leading directly to the Grand Stage
  const carpetRunner = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(3.2, 0.04, 21.8)),
    rubyDamaskMat,
  );
  carpetRunner.position.set(0, 0.025, 6.2);
  carpetRunner.receiveShadow = true;
  group.add(carpetRunner);

  [-1.62, 1.62].forEach((gx) => {
    const goldEdge = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.14, 0.048, 21.8)),
      mats.champagneGold,
    );
    goldEdge.position.set(gx, 0.028, 6.2);
    group.add(goldEdge);
  });

  // Ornate Golden Velvet Rope Stanchions along the Royal Carpet Aisle
  for (let i = 0; i < 4; i++) {
    const sz = 1.6 + i * 3.1;
    [-2.05, 2.05].forEach((sx) => {
      const post = new THREE.Group();
      post.position.set(sx, 0, sz);
      const base = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.18, 0.22, 0.08, 12)), mats.antiqueGold);
      base.position.y = 0.04;
      const rod = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.035, 0.04, 0.92, 10)), mats.champagneGold);
      rod.position.y = 0.52;
      const finial = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.08, 10, 8)), mats.antiqueGold);
      finial.position.y = 1.02;
      post.add(base, rod, finial);
      group.add(post);
      circleColliders.push({ x: sx, z: sz, radius: 0.26 });
    });

    if (i < 3) {
      [-2.05, 2.05].forEach((sx) => {
        const ropeCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(sx, 0.92, sz),
          new THREE.Vector3(sx, 0.66, sz + 1.55),
          new THREE.Vector3(sx, 0.92, sz + 3.1),
        ]);
        const rope = new THREE.Mesh(
          trackGeo(new THREE.TubeGeometry(ropeCurve, 12, 0.032, 8, false)),
          rubyVelvetMat,
        );
        group.add(rope);
      });
    }
  }

  // ============================================================================
  // 2. ROYAL OPERA HOUSE ROTUNDA WALLS, BALCONY BOXES & VAULTED DOME CEILING
  // ============================================================================
  // Lower Ivory Marble Wainscot Dado & Upper Royal Purple Paneled Perimeter Wall
  const lowerWall = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(22.4, 22.4, 3.8, 32, 1, true)),
    trackMat(
      new THREE.MeshStandardMaterial({
        map: mats.warmIvoryMarble.map,
        roughness: 0.36,
        metalness: 0.08,
        side: THREE.BackSide,
      }),
    ),
  );
  lowerWall.position.y = 1.9;
  group.add(lowerWall);

  const upperWall = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(22.35, 22.35, 11.4, 32, 1, true)),
    trackMat(
      new THREE.MeshStandardMaterial({
        map: royalPurpleTex,
        roughness: 0.56,
        metalness: 0.12,
        side: THREE.BackSide,
      }),
    ),
  );
  upperWall.position.y = 9.5;
  group.add(upperWall);

  // Golden Dado & Cornice Moldings circling the Hall
  [3.82, 9.2, 15.1].forEach((ry, idx) => {
    const cornice = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(22.1, idx === 2 ? 0.32 : 0.16, 10, 56)),
      mats.antiqueGold,
    );
    cornice.rotation.x = Math.PI / 2;
    cornice.position.y = ry;
    group.add(cornice);
  });

  // Grand Vaulted Dome Ceiling with Coffered Rib Arches & Celestial Fresco Oculus
  const domeCeiling = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(22.8, 36, 18, 0, Math.PI * 2, 0, Math.PI * 0.48)),
    trackMat(
      new THREE.MeshStandardMaterial({
        map: mats.cofferedCeiling.map,
        roughness: 0.45,
        metalness: 0.18,
        side: THREE.BackSide,
      }),
    ),
  );
  domeCeiling.scale.set(1, 0.36, 1);
  domeCeiling.position.y = 14.8;
  group.add(domeCeiling);

  // Sweeping Golden Dome Ribs converging on Central Ceiling Medallion
  for (let r = 0; r < 12; r++) {
    const angle = (r / 12) * Math.PI * 2;
    const rib = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(22.1, 0.14, 8, 28, Math.PI)),
      mats.antiqueGold,
    );
    rib.scale.set(1, 0.35, 1);
    rib.position.y = 14.9;
    rib.rotation.y = angle;
    group.add(rib);
  }

  // Luminous Central Ceiling Fresco Oculus & Crowned Chandelier Boss
  const frescoDisc = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(7.8, 40)),
    mats.ceilingFresco,
  );
  frescoDisc.rotation.x = Math.PI / 2;
  frescoDisc.position.set(0, 21.6, 1.0);
  group.add(frescoDisc);

  const oculusRim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(7.8, 0.24, 10, 48)), mats.champagneGold);
  oculusRim.rotation.x = Math.PI / 2;
  oculusRim.position.set(0, 21.45, 1.0);
  group.add(oculusRim);

  // 14 Classical Fluted Marble Columns + Crown Wall Sconces around the Perimeter
  const colPositions: Array<[number, number]> = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const cx = Math.sin(a) * 20.6;
    const cz = Math.cos(a) * 20.6;
    // Leave clean opening right behind the grand stage screen & right behind entrance portal
    if (Math.abs(cx) < 5.5 && cz < -17.5) continue;
    if (Math.abs(cx) < 3.6 && cz > 17.5) continue;
    colPositions.push([cx, cz]);

    const col = buildClassicalColumn(15.0, trackGeo, mats);
    col.position.set(cx, 0, cz);
    group.add(col);
    circleColliders.push({ x: cx, z: cz, radius: 0.78 });

    // Illuminated Golden Sconce + Royal Crown Shield between pillars
    const sconceAngle = a + Math.PI / 14;
    const sx = Math.sin(sconceAngle) * 21.85;
    const sz = Math.cos(sconceAngle) * 21.85;
    if (!(Math.abs(sx) < 6.5 && sz < -17.0) && !(Math.abs(sx) < 3.5 && sz > 17.0)) {
      const wallEmblem = new THREE.Group();
      wallEmblem.position.set(sx, 6.2, sz);
      wallEmblem.lookAt(0, 6.2, 0);

      const medallionBack = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.95, 0.95, 0.14, 24)),
        mats.royalCrestMat,
      );
      medallionBack.rotation.x = Math.PI / 2;
      const medallionRim = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.98, 0.09, 8, 28)),
        mats.antiqueGold,
      );
      const miniCrown = buildRoyalCrownEmblem(trackGeo, mats.champagneGold, rubyVelvetMat, mats.pearlIvory, 0.38);
      miniCrown.position.set(0, 1.15, 0.12);

      // Warm glowing crystal wall torch beneath crest
      const torchArm = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.05, 0.08, 0.45, 8)), mats.antiqueGold);
      torchArm.rotation.x = Math.PI / 3;
      torchArm.position.set(0, -1.25, 0.24);
      const torchBulb = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.16, 10, 8)), mats.candleFlame);
      torchBulb.position.set(0, -1.05, 0.42);

      wallEmblem.add(medallionBack, medallionRim, miniCrown, torchArm, torchBulb);
      group.add(wallEmblem);
    }
  }

  // Elevated Royal Opera Balcony Boxes (West & East Wings)
  [-1, 1].forEach((side) => {
    const balcony = new THREE.Group();
    balcony.position.set(side * 17.8, 5.4, 2.2);
    balcony.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;

    const deck = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(16.2, 0.5, 4.2)), mats.warmIvoryMarble);
    deck.castShadow = true;
    deck.receiveShadow = true;
    balcony.add(deck);

    // Underside gilded brackets
    for (let b = -6; b <= 6; b += 3) {
      const bracket = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.45, 1.35, 6)), mats.antiqueGold);
      bracket.rotation.z = Math.PI;
      bracket.position.set(b, -0.85, 1.45);
      balcony.add(bracket);
    }

    // Balcony front gilded rail + ruby velvet draped swag panels
    const frontWall = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(16.0, 1.15, 0.24)), rubyDamaskMat);
    frontWall.position.set(0, 0.82, 1.98);
    const goldTopRail = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(16.2, 0.18, 0.34)), mats.antiqueGold);
    goldTopRail.position.set(0, 1.44, 1.98);
    balcony.add(frontWall, goldTopRail);

    // Royal box velvet canopy curtains flanking balcony tiers
    for (let box = -5.5; box <= 5.5; box += 5.5) {
      const crest = buildRoyalCrownEmblem(trackGeo, mats.champagneGold, rubyVelvetMat, mats.pearlIvory, 0.35);
      crest.position.set(box, 1.54, 2.08);
      balcony.add(crest);

      [-2.1, 2.1].forEach((dx) => {
        const boxDrape = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.18, 0.3, 4.2, 10)),
          royalPurpleVelvetMat,
        );
        boxDrape.position.set(box + dx, 2.4, 1.75);
        balcony.add(boxDrape);
      });
    }

    group.add(balcony);
  });

  // ============================================================================
  // 3. GRAND STAGE PLATFORM, SWEeping SIDE STAIRCASES & GILDED PROSCENIUM ARCH
  // ============================================================================
  const stageY = 1.1;

  // Stage Apron & Main Performance Deck (z = -6.8 to -18.5)
  const stageDeck = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(21.6, stageY, 11.8)),
    mats.darkWalnut,
  );
  stageDeck.position.set(0, stageY / 2, -12.7);
  stageDeck.receiveShadow = true;
  stageDeck.castShadow = true;
  group.add(stageDeck);

  // Carved Ivory & Gold Stage Apron Fascia
  const apronTrim = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(21.9, 0.22, 12.0)),
    mats.antiqueGold,
  );
  apronTrim.position.set(0, stageY - 0.08, -12.7);
  group.add(apronTrim);

  // Front apron colliders between central and side staircases so hero walks cleanly up the stairs
  boxColliders.push(
    { minX: -6.15, maxX: -2.95, minZ: -7.15, maxZ: -6.65 },
    { minX: 2.95, maxX: 6.15, minZ: -7.15, maxZ: -6.65 },
    { minX: -11.0, maxX: -9.45, minZ: -7.15, maxZ: -6.65 },
    { minX: 9.45, maxX: 11.0, minZ: -7.15, maxZ: -6.65 },
  );

  // Stage Ruby Carpeted Center Runner
  const stageCarpet = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(9.6, 0.04, 10.6)),
    rubyDamaskMat,
  );
  stageCarpet.position.set(0, stageY + 0.025, -12.3);
  stageCarpet.receiveShadow = true;
  group.add(stageCarpet);

  // Grand Sweeping Curved Central Steps (z = -6.8 to -5.1) + Elegant Left & Right Side Staircases (x = ±8.2)
  for (let s = 0; s < 4; s++) {
    const sy = (s + 1) * (stageY / 4);
    const sz = -5.2 - s * 0.44;
    const step = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(5.6 - s * 0.16, stageY / 4, 0.48)),
      mats.warmIvoryMarble,
    );
    step.position.set(0, sy - stageY / 8, sz);
    step.receiveShadow = true;
    const goldNos = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(5.64 - s * 0.16, 0.05, 0.08)),
      mats.champagneGold,
    );
    goldNos.position.set(0, sy - 0.02, sz + 0.22);
    group.add(step, goldNos);
  }

  // Side Elegant Balustraded Staircases flanking Stage Apron (x = ±7.8)
  [-1, 1].forEach((side) => {
    const sx = side * 7.8;
    for (let s = 0; s < 4; s++) {
      const sy = (s + 1) * (stageY / 4);
      const sz = -4.9 - s * 0.52;
      const sideStep = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(3.1, stageY / 4, 0.54)),
        mats.warmIvoryMarble,
      );
      sideStep.position.set(sx, sy - stageY / 8, sz);
      sideStep.receiveShadow = true;
      group.add(sideStep);
    }

    // Ornate carved balustrades & curved golden handrails beside each side staircase
    [-1.45, 1.45].forEach((offset) => {
      const bx = sx + offset;
      const railPts: THREE.Vector3[] = [];
      for (let b = 0; b <= 4; b++) {
        const by = b * (stageY / 4);
        const bz = -4.65 - b * 0.52;
        railPts.push(new THREE.Vector3(bx, by + 0.92, bz));

        const balProfile = [
          new THREE.Vector2(0.11, 0),
          new THREE.Vector2(0.06, 0.22),
          new THREE.Vector2(0.12, 0.48),
          new THREE.Vector2(0.06, 0.75),
          new THREE.Vector2(0.1, 0.88),
        ];
        const baluster = new THREE.Mesh(
          trackGeo(new THREE.LatheGeometry(balProfile, 12)),
          b === 0 || b === 4 ? mats.antiqueGold : mats.pearlIvory,
        );
        baluster.position.set(bx, by, bz);
        group.add(baluster);
      }
      const railCurve = new THREE.CatmullRomCurve3(railPts);
      const handrail = new THREE.Mesh(
        trackGeo(new THREE.TubeGeometry(railCurve, 16, 0.065, 8, false)),
        mats.antiqueGold,
      );
      const newelOrb = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.15, 12, 10)), rubyVelvetMat);
      newelOrb.position.set(bx, 1.06, -4.65);
      group.add(handrail, newelOrb);
    });
  });

  // Ornate Sculpted Golden Proscenium Arch Frame (at z = -10.4)
  const prosceniumZ = -10.4;
  [-8.6, 8.6].forEach((px) => {
    const pilaster = buildClassicalColumn(9.8, trackGeo, mats);
    pilaster.position.set(px, stageY, prosceniumZ);
    group.add(pilaster);
    circleColliders.push({ x: px, z: prosceniumZ, radius: 0.85 });
  });

  // Sweeping Golden Proscenium Arch + Outer Crown Pediment
  const prosceniumArch = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(8.6, 0.42, 14, 48, Math.PI)),
    mats.antiqueGold,
  );
  prosceniumArch.scale.set(1, 0.55, 1);
  prosceniumArch.position.set(0, stageY + 9.2, prosceniumZ);
  group.add(prosceniumArch);

  const innerArchTrim = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(7.95, 0.16, 10, 48, Math.PI)),
    mats.champagneGold,
  );
  innerArchTrim.scale.set(1, 0.54, 1);
  innerArchTrim.position.set(0, stageY + 9.2, prosceniumZ + 0.18);
  group.add(innerArchTrim);

  // Grand Proscenium Apex Royal Crest & Crown Cartouche
  const apexCartouche = new THREE.Group();
  apexCartouche.position.set(0, stageY + 13.9, prosceniumZ + 0.35);
  const cartouchePlate = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.45, 1.45, 0.24, 28)),
    mats.royalCrestMat,
  );
  cartouchePlate.rotation.x = Math.PI / 2;
  const cartoucheRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(1.5, 0.16, 10, 32)),
    mats.antiqueGold,
  );
  const apexCrown = buildRoyalCrownEmblem(trackGeo, mats.champagneGold, rubyVelvetMat, mats.pearlIvory, 0.92);
  apexCrown.position.set(0, 1.55, 0.05);
  apexCartouche.add(cartouchePlate, cartoucheRing, apexCrown);
  group.add(apexCartouche);

  // Top Ruby Velvet Valance Pelmet across Proscenium Header
  const valance = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(8.1, 8.1, 1.25, 32, 1, true, -Math.PI * 0.32, Math.PI * 0.64)),
    rubyVelvetMat,
  );
  valance.scale.set(1, 1, 0.18);
  valance.position.set(0, stageY + 8.85, prosceniumZ + 0.25);
  group.add(valance);

  // ============================================================================
  // 4. ANIMATED OPENING RUBY VELVET CURTAINS & ROYAL STAGE BACKDROP
  // ============================================================================
  // Luminous Royal Stage Backdrop Tapestry Screen (at z = -16.8)
  const backdropScreen = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(15.6, 8.8)),
    trackMat(
      new THREE.MeshStandardMaterial({
        map: stageBackdropTex,
        emissiveMap: stageBackdropTex,
        emissive: new THREE.Color(0xfff1d2),
        emissiveIntensity: 0.42,
        roughness: 0.32,
      }),
    ),
  );
  backdropScreen.position.set(0, stageY + 4.8, -16.8);
  group.add(backdropScreen);

  // Gilded Backdrop Frame
  const frameTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(16.2, 0.42, 0.35)), mats.antiqueGold);
  frameTop.position.set(0, stageY + 9.3, -16.75);
  group.add(frameTop);

  // Multi-Pleat Animated Left & Right Ruby Velvet Stage Curtains
  const createPleatedCurtain = (side: -1 | 1): THREE.Group => {
    const curtain = new THREE.Group();
    const pleatCount = 9;
    for (let p = 0; p < pleatCount; p++) {
      const px = (p - (pleatCount - 1) / 2) * 0.56;
      const pleat = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.28, 0.36, 9.2, 12)),
        rubyVelvetMat,
      );
      pleat.position.set(px, 4.6, Math.sin(p * 1.1) * 0.14);
      pleat.castShadow = true;
      curtain.add(pleat);
    }
    // Golden braided fringe band along inner edge & lower hem
    const goldHem = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(5.2, 0.26, 0.6)), mats.champagneGold);
    goldHem.position.set(0, 0.15, 0);
    const goldTie = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.45, 0.08, 8, 20)),
      mats.champagneGold,
    );
    goldTie.rotation.x = Math.PI / 2;
    goldTie.scale.set(side > 0 ? 4.2 : 4.2, 0.85, 1);
    goldTie.position.set(0, 3.1, 0.12);
    curtain.add(goldHem, goldTie);
    return curtain;
  };

  const curtainLeft = createPleatedCurtain(-1);
  curtainLeft.position.set(-2.6, stageY, prosceniumZ + 0.55);
  const curtainRight = createPleatedCurtain(1);
  curtainRight.position.set(2.6, stageY, prosceniumZ + 0.55);
  group.add(curtainLeft, curtainRight);

  // Curtain Opening Animation on Entry + Gentle Living Velvet Sway
  let curtainOpenProgress = 0;
  animatedUpdates.push((elapsed, dt) => {
    curtainOpenProgress = Math.min(1, curtainOpenProgress + dt * 0.42);
    const eased = 1 - Math.pow(1 - curtainOpenProgress, 3);
    const openOffset = THREE.MathUtils.lerp(2.45, 6.65, eased);
    const sway = Math.sin(elapsed * 0.95) * 0.08;

    curtainLeft.position.x = -openOffset - sway;
    curtainRight.position.x = openOffset + sway;
    curtainLeft.rotation.y = eased * 0.14 + Math.sin(elapsed * 0.7) * 0.015;
    curtainRight.rotation.y = -eased * 0.14 - Math.sin(elapsed * 0.7) * 0.015;
    curtainLeft.scale.x = THREE.MathUtils.lerp(1.0, 0.64, eased);
    curtainRight.scale.x = THREE.MathUtils.lerp(1.0, 0.64, eased);
  });

  // ============================================================================
  // 5. HERO ROYAL STAGE THRONE CENTERPIECE & STAGE CANDELABRAS
  // ============================================================================
  const stageThrone = buildRoyalStageThrone(trackGeo, mats, rubyVelvetMat, royalPurpleVelvetMat);
  stageThrone.position.set(0, stageY, -13.6);
  group.add(stageThrone);
  circleColliders.push({ x: 0, z: -13.6, radius: 2.3 });

  // Twin Standing Golden Candelabras flanking the Royal Stage Throne
  const throneFlames: THREE.Mesh[] = [];
  [-3.2, 3.2].forEach((cx) => {
    const stand = new THREE.Group();
    stand.position.set(cx, stageY, -13.2);
    const base = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.28, 0.46, 0.28, 12)), mats.antiqueGold);
    base.position.y = 0.14;
    const stem = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.08, 0.12, 2.3, 12)), mats.champagneGold);
    stem.position.y = 1.35;
    stand.add(base, stem);

    for (let arm = -1; arm <= 1; arm++) {
      const candle = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.045, 0.05, 0.34, 8)), mats.pearlIvory);
      candle.position.set(arm * 0.28, 2.68 - Math.abs(arm) * 0.12, 0);
      const flame = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.08, 0)), mats.candleFlame);
      flame.scale.set(0.75, 1.6, 0.75);
      flame.position.set(arm * 0.28, 2.94 - Math.abs(arm) * 0.12, 0);
      throneFlames.push(flame);
      stand.add(candle, flame);
    }
    group.add(stand);
    circleColliders.push({ x: cx, z: -13.2, radius: 0.55 });
  });

  // ============================================================================
  // 6. DETAILED MULTI-PART AUDIENCE SEATING (48 ROYAL VELVET ARMCHAIRS)
  // ============================================================================
  // Curved Auditorium Layout:
  //   - 4 concentric arcs centered on the stage focal axis (0, -14.5)
  //   - Wide unobstructed central ruby carpet aisle (|x| >= 3.35)
  //   - Local chair front is +Z (backrest is at -Z), so Math.atan2(-x, -12.5 - z)
  //     rotates every seat cleanly to face the main stage & royal throne at (0, -12.5)
  const seatSpots: Array<{ x: number; z: number; rotY: number }> = [];
  const arcCenterZ = -14.5;
  const stageFocusZ = -12.5;
  const rowRadii = [16.5, 19.0, 21.5, 24.0];
  const aisleClearHalfWidth = 3.35;
  const seatArcSpacing = 1.62;

  rowRadii.forEach((radius) => {
    const startAngle = Math.asin(aisleClearHalfWidth / radius);
    const stepAngle = seatArcSpacing / radius;
    [-1, 1].forEach((wing) => {
      for (let col = 0; col < 6; col++) {
        const theta = startAngle + col * stepAngle;
        const x = wing * Math.sin(theta) * radius;
        const z = arcCenterZ + Math.cos(theta) * radius;
        const rotY = Math.atan2(-x, stageFocusZ - z);
        seatSpots.push({ x, z, rotY });
      }
    });
  });

  const totalSeats = seatSpots.length;
  // Sculpted armchair frame (beveled arched frame)
  const chairBackShape = new THREE.Shape();
  chairBackShape.moveTo(-0.44, 0.42);
  chairBackShape.lineTo(-0.46, 1.15);
  chairBackShape.quadraticCurveTo(0, 1.48, 0.46, 1.15);
  chairBackShape.lineTo(0.44, 0.42);
  chairBackShape.closePath();
  const chairFrameGeo = trackGeo(
    new THREE.ExtrudeGeometry(chairBackShape, {
      depth: 0.12,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 2,
    }),
  );
  chairFrameGeo.translate(0, 0, -0.34);

  const chairCushionGeo = trackGeo(new THREE.CylinderGeometry(0.44, 0.46, 0.22, 16));
  chairCushionGeo.scale(1.0, 1.0, 0.92);
  chairCushionGeo.translate(0, 0.48, 0.04);

  const chairCrestGeo = trackGeo(new THREE.OctahedronGeometry(0.11, 0));
  chairCrestGeo.scale(1.2, 1.4, 0.55);
  chairCrestGeo.translate(0, 1.42, -0.28);

  const frameInst = new THREE.InstancedMesh(chairFrameGeo, mats.antiqueGold, totalSeats);
  const cushionInst = new THREE.InstancedMesh(chairCushionGeo, rubyVelvetMat, totalSeats);
  const crestInst = new THREE.InstancedMesh(chairCrestGeo, mats.champagneGold, totalSeats);

  // Add inner backrest plush ruby cushion instanced layer + golden legs instanced layer
  const backPadGeo = trackGeo(new THREE.CylinderGeometry(0.36, 0.34, 0.72, 14));
  backPadGeo.scale(1.05, 1.0, 0.28);
  backPadGeo.translate(0, 0.92, -0.22);
  const backPadInst = new THREE.InstancedMesh(backPadGeo, rubyDamaskMat, totalSeats);

  const seatPedestalGeo = trackGeo(new THREE.CylinderGeometry(0.14, 0.26, 0.42, 12));
  seatPedestalGeo.translate(0, 0.21, 0.02);
  const seatPedestalInst = new THREE.InstancedMesh(seatPedestalGeo, mats.antiqueGold, totalSeats);

  const seatDummy = new THREE.Object3D();
  seatSpots.forEach((spot, idx) => {
    seatDummy.position.set(spot.x, 0, spot.z);
    seatDummy.rotation.set(0, spot.rotY, 0);
    seatDummy.updateMatrix();
    frameInst.setMatrixAt(idx, seatDummy.matrix);
    cushionInst.setMatrixAt(idx, seatDummy.matrix);
    crestInst.setMatrixAt(idx, seatDummy.matrix);
    backPadInst.setMatrixAt(idx, seatDummy.matrix);
    seatPedestalInst.setMatrixAt(idx, seatDummy.matrix);
    circleColliders.push({ x: spot.x, z: spot.z, radius: 0.54 });
  });

  [frameInst, cushionInst, crestInst, backPadInst, seatPedestalInst].forEach((inst) => {
    inst.instanceMatrix.needsUpdate = true;
    inst.computeBoundingSphere();
    inst.castShadow = !isSoftwareGl;
    inst.receiveShadow = true;
    group.add(inst);
  });

  // ============================================================================
  // 7. HANGING CRYSTAL CHANDELIERS (SWAYING + WARM CANDLE SPARKLE)
  // ============================================================================
  const grandChandelier = buildOperaChandelier(trackGeo, trackMat, mats, rubyVelvetMat, 3);
  grandChandelier.group.position.set(0, 14.2, 2.2);
  group.add(grandChandelier.group);

  const sideChandeliers: Array<{ group: THREE.Group; flames: THREE.Mesh[]; phase: number }> = [];
  [
    [-11.5, 11.8, -1.5, 0.8],
    [11.5, 11.8, -1.5, 2.1],
    [-11.5, 11.8, 7.5, 3.6],
    [11.5, 11.8, 7.5, 5.0],
  ].forEach(([cx, cy, cz, phase]) => {
    const ch = buildOperaChandelier(trackGeo, trackMat, mats, rubyVelvetMat, 2);
    ch.group.position.set(cx, cy, cz);
    ch.group.scale.setScalar(0.76);
    group.add(ch.group);
    sideChandeliers.push({ group: ch.group, flames: ch.flames, phase });
  });

  animatedUpdates.push((elapsed) => {
    // Gentle pendulum sway & slow royal shimmer rotation
    grandChandelier.group.rotation.y = elapsed * 0.08;
    grandChandelier.group.rotation.z = Math.sin(elapsed * 0.55) * 0.022;
    grandChandelier.group.rotation.x = Math.cos(elapsed * 0.42) * 0.015;
    grandChandelier.flames.forEach((f, idx) => {
      const s = 0.92 + Math.sin(elapsed * 7.5 + idx * 1.3) * 0.14;
      f.scale.set(0.75 * s, 1.5 * s, 0.75 * s);
    });

    sideChandeliers.forEach((sc) => {
      sc.group.rotation.y = -elapsed * 0.1 + sc.phase;
      sc.group.rotation.z = Math.sin(elapsed * 0.65 + sc.phase) * 0.028;
      sc.group.rotation.x = Math.cos(elapsed * 0.5 + sc.phase) * 0.02;
    });

    throneFlames.forEach((f, idx) => {
      const s = 0.9 + Math.sin(elapsed * 8.2 + idx * 1.9) * 0.16;
      f.scale.set(0.75 * s, 1.6 * s, 0.75 * s);
    });
  });

  // ============================================================================
  // 8. CINEMATIC STAGE SPOTLIGHTS, VOLUMETRIC BEAMS & FLOATING GOLD PARTICLES
  // ============================================================================
  const warmChandelierLight = new THREE.PointLight(0xffdca0, 3.2, 34, 1.3);
  warmChandelierLight.position.set(0, 12.2, 2.2);
  group.add(warmChandelierLight);

  const stageThroneGlow = new THREE.PointLight(0xffcb78, 3.6, 26, 1.35);
  stageThroneGlow.position.set(0, 7.2, -11.5);
  group.add(stageThroneGlow);

  // Two animated theatrical spotlights focused on the Grand Stage & Throne
  const spotLeft = new THREE.SpotLight(0xffe7ad, 14, 38, Math.PI / 6.5, 0.55, 1.2);
  spotLeft.position.set(-10.5, 12.5, -2.5);
  spotLeft.target.position.set(-1.5, stageY + 1.5, -13.2);
  group.add(spotLeft, spotLeft.target);

  const spotRight = new THREE.SpotLight(0xf6c9ff, 11, 38, Math.PI / 6.5, 0.55, 1.2);
  spotRight.position.set(10.5, 12.5, -2.5);
  spotRight.target.position.set(1.5, stageY + 1.5, -13.2);
  group.add(spotRight, spotRight.target);

  // Volumetric Translucent Light Beam Cones synced with the Spotlights
  const beamGeo = trackGeo(new THREE.CylinderGeometry(0.16, 3.4, 15.5, 24, 1, true));
  beamGeo.translate(0, -7.75, 0);
  const beamLeftMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: spotBeamTex,
      color: 0xffeba8,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  const beamRightMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: spotBeamTex,
      color: 0xe8b8ff,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  const beamLeft = new THREE.Mesh(beamGeo, beamLeftMat);
  beamLeft.position.copy(spotLeft.position);
  const beamRight = new THREE.Mesh(beamGeo, beamRightMat);
  beamRight.position.copy(spotRight.position);
  group.add(beamLeft, beamRight);

  const _beamUp = new THREE.Vector3(0, -1, 0);
  const _beamDir = new THREE.Vector3();
  animatedUpdates.push((elapsed) => {
    const sweepL = Math.sin(elapsed * 0.42) * 3.2;
    const sweepR = Math.cos(elapsed * 0.36) * 3.2;

    spotLeft.target.position.set(sweepL - 0.8, stageY + 1.4, -13.4 + Math.cos(elapsed * 0.3) * 1.2);
    spotRight.target.position.set(-sweepR + 0.8, stageY + 1.4, -13.4 + Math.sin(elapsed * 0.28) * 1.2);

    _beamDir.subVectors(spotLeft.target.position, beamLeft.position).normalize();
    beamLeft.quaternion.setFromUnitVectors(_beamUp, _beamDir);

    _beamDir.subVectors(spotRight.target.position, beamRight.position).normalize();
    beamRight.quaternion.setFromUnitVectors(_beamUp, _beamDir);

    // Subtle warm shimmer on stage & chandelier lights
    warmChandelierLight.intensity = 3.1 + Math.sin(elapsed * 2.2) * 0.25;
    stageThroneGlow.intensity = 3.45 + Math.sin(elapsed * 1.7 + 1.0) * 0.35;
    beamLeftMat.opacity = 0.21 + Math.sin(elapsed * 0.8) * 0.04;
    beamRightMat.opacity = 0.18 + Math.cos(elapsed * 0.75) * 0.04;
  });

  // Floating Golden Dust & Royal Embers throughout the Grand Ballroom
  const particleCount = 260;
  const pGeo = trackGeo(new THREE.BufferGeometry());
  const pPos = new Float32Array(particleCount * 3);
  const pBase = new Float32Array(particleCount * 3);
  const pSpeed = new Float32Array(particleCount);
  for (let i = 0; i < particleCount; i++) {
    const r = Math.sqrt(Math.random()) * 19.5;
    const theta = Math.random() * Math.PI * 2;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    const y = 0.8 + Math.random() * 12.2;
    pBase[i * 3] = x;
    pBase[i * 3 + 1] = y;
    pBase[i * 3 + 2] = z;
    pPos[i * 3] = x;
    pPos[i * 3 + 1] = y;
    pPos[i * 3 + 2] = z;
    pSpeed[i] = 0.35 + Math.random() * 0.55;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pMat = trackMat(
    new THREE.PointsMaterial({
      size: 0.28,
      map: goldParticleTex,
      color: 0xffe8a6,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const particles = new THREE.Points(pGeo, pMat);
  group.add(particles);

  animatedUpdates.push((elapsed) => {
    const attr = pGeo.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      const spd = pSpeed[i];
      arr[idx] = pBase[idx] + Math.sin(elapsed * spd + i) * 0.45;
      arr[idx + 1] = 0.8 + ((pBase[idx + 1] + elapsed * spd * 0.45) % 12.2);
      arr[idx + 2] = pBase[idx + 2] + Math.cos(elapsed * spd * 0.85 + i) * 0.45;
    }
    attr.needsUpdate = true;
  });

  // ============================================================================
  // 9. INTERACTABLES (PODIUM MISI 5, PENGARAH PENTAS PUAN SALMA, PORTAL KEMBALI)
  // ============================================================================
  // Ornate Royal Herald Lectern / Stage Podium at (0, 0, -4.4)
  const lectern = new THREE.Group();
  lectern.position.set(0, 0, -4.4);
  const lecBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.68, 0.84, 0.22, 16)), mats.warmIvoryMarble);
  lecBase.position.y = 0.11;
  const lecStemPts = [
    new THREE.Vector2(0.32, 0),
    new THREE.Vector2(0.18, 0.35),
    new THREE.Vector2(0.24, 0.65),
    new THREE.Vector2(0.42, 1.02),
  ];
  const lecStem = new THREE.Mesh(trackGeo(new THREE.LatheGeometry(lecStemPts, 16)), mats.antiqueGold);
  lecStem.position.y = 0.22;
  const lecDesk = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.05, 0.1, 0.72)), rubyVelvetMat);
  lecDesk.position.set(0, 1.28, 0);
  lecDesk.rotation.x = 0.25;
  const lecBook = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.62, 0.08, 0.44)), mats.pearlIvory);
  lecBook.position.set(0, 1.35, 0.02);
  lecBook.rotation.x = 0.25;
  lectern.add(lecBase, lecStem, lecDesk, lecBook);
  group.add(lectern);
  circleColliders.push({ x: 0, z: -4.4, radius: 0.9 });

  const stageBeacon = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.26, 0)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffdf7a,
        emissive: 0xd8a832,
        emissiveIntensity: 1.0,
        roughness: 0.2,
      }),
    ),
  );
  stageBeacon.position.set(0, 2.25, -4.4);
  group.add(stageBeacon);
  animatedUpdates.push((elapsed) => {
    stageBeacon.rotation.y = elapsed * 1.4;
    stageBeacon.position.y = 2.25 + Math.sin(elapsed * 2.5) * 0.12;
  });

  interactables.push({
    id: 'theatre-stage',
    label: 'Tekan E untuk Pentas Persembahan Hikayat Terakhir',
    sublabel: 'Muat naik atau tayangkan video penceritaan digital akhir di Balairung Gemilang Diraja',
    position: new THREE.Vector3(0, 1, -4.4),
    radius: 3.5,
    action: { type: 'theatre_stage' },
    visualRef: stageBeacon,
  });

  // Pengarah Pentas Puan Salma NPC (Preserved rig & role)
  const director = createNpcCharacter(0x991632, 0xdcb854, 0x2f1e24);
  director.group.position.set(-1.45, 0, 9.4);
  group.add(director.group);
  disposables.push(director.dispose);
  circleColliders.push({ x: -1.45, z: 9.4, radius: 0.72 });
  animatedUpdates.push((elapsed) => director.updateIdle(elapsed));

  const dirBeacon = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.2, 0)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xf4b6c8,
        emissive: 0xd27092,
        emissiveIntensity: 0.9,
      }),
    ),
  );
  dirBeacon.position.set(-1.45, 2.55, 9.4);
  group.add(dirBeacon);
  animatedUpdates.push((elapsed) => {
    dirBeacon.rotation.y = elapsed * 1.2;
    dirBeacon.position.y = 2.55 + Math.sin(elapsed * 2.3 + 1.0) * 0.1;
  });

  interactables.push({
    id: 'npc-theatre',
    label: 'Berbicara dengan Pengarah Pentas Puan Salma',
    sublabel: 'Dengar taklimat persembahan akhir Balairung Gemilang Diraja',
    position: new THREE.Vector3(-1.45, 1, 9.4),
    radius: 3.2,
    action: { type: 'npc', npcKey: 'theatreDirector' },
    visualRef: dirBeacon,
  });

  // Architectural Return Portal to Balai Agung Diraja
  const retPortal = helpers.createArchitecturalPortal('citadel', 0xdcb854, true, trackGeo, trackMat, mats);
  retPortal.group.position.set(0, 0, 16.5);
  group.add(retPortal.group);
  animatedUpdates.push((elapsed) => {
    retPortal.ring.rotation.z = elapsed * 1.1;
    retPortal.vortex.rotation.z = -elapsed * 0.65;
  });
  interactables.push({
    id: 'return-citadel',
    label: 'Tekan E untuk kembali ke Balai Agung Diraja',
    sublabel: 'Kembali ke istana kerajaan',
    position: new THREE.Vector3(0, 1, 16.5),
    radius: 3.2,
    action: { type: 'portal', targetLocation: 'citadel' },
    visualRef: retPortal.ring,
  });

  // Walkable Grand Stage + Central/Side Staircase Height Map
  const groundHeightAt = (x: number, z: number): number => {
    // Central grand staircase (-6.8 <= z <= -4.9, |x| <= 2.9)
    if (Math.abs(x) <= 2.9 && z <= -4.9 && z >= -6.9) {
      const t = THREE.MathUtils.clamp((-4.9 - z) / 2.0, 0, 1);
      return t * stageY;
    }
    // Left & right side staircases (|x| between 6.2 and 9.4, -6.9 <= z <= -4.6)
    if (Math.abs(x) >= 6.2 && Math.abs(x) <= 9.4 && z <= -4.6 && z >= -6.9) {
      const t = THREE.MathUtils.clamp((-4.6 - z) / 2.3, 0, 1);
      return t * stageY;
    }
    // On the main grand stage deck
    if (Math.abs(x) <= 10.6 && z < -6.8 && z >= -18.5) {
      return stageY;
    }
    return 0;
  };

  return {
    group,
    skyColor: 0x2a1642,
    fogColor: 0x351c52,
    fogDensity: 0.0085,
    boundsRadius: 21.0,
    roomRect: { minX: -20.5, maxX: 20.5, minZ: -18.2, maxZ: 18.8, maxY: 16.5 },
    circleColliders,
    boxColliders,
    interactables,
    groundHeightAt,
    update: (elapsed, dt) => animatedUpdates.forEach((fn) => fn(elapsed, dt)),
    dispose: () => {
      geos.forEach((g) => g.dispose());
      localMats.forEach((m) => m.dispose());
      localTex.forEach((t) => t.dispose());
      disposables.forEach((d) => d());
    },
  };
}
