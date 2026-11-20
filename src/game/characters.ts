import * as THREE from 'three';
import type { HeroId } from '../types/game';

export type CharacterAnimState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'land'
  | 'interact'
  | 'talk'
  | 'victory';

export interface CharacterRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  upperTorsoPivot: THREE.Group;
  headGroup: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftForearmPivot: THREE.Group;
  rightForearmPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  leftKneePivot: THREE.Group;
  rightKneePivot: THREE.Group;
  capePivot: THREE.Group;
  auraRing: THREE.Mesh;
  accessoryGroup: THREE.Group;
  updateAnimation: (
    state: CharacterAnimState,
    dt: number,
    elapsed: number,
    stridePhase?: number,
  ) => void;
  dispose: () => void;
}

interface HeroStyleConfig {
  coatColor: number;
  secondaryColor: number;
  shirtColor: number;
  trouserOrSkirtColor: number;
  trimColor: number;
  hairColor: number;
  hairHighlight: number;
  skinColor: number;
  eyeColor: number;
  bootColor: number;
  isGown: boolean;
}

const HERO_STYLES: Record<HeroId, HeroStyleConfig> = {
  ayden: {
    coatColor: 0x3b6e52, // Royal emerald explorer coat
    secondaryColor: 0x244636,
    shirtColor: 0xf7f1e3,
    trouserOrSkirtColor: 0x2e2a38,
    trimColor: 0xdcb854, // Champagne gold
    hairColor: 0x2c1b12, // Rich short dark brown hair
    hairHighlight: 0x4a2f20,
    skinColor: 0xf2c8a7,
    eyeColor: 0x2c6b53,
    bootColor: 0x472d21,
    isGown: false,
  },
  elena: {
    coatColor: 0x9b86c9, // Royal lavender
    secondaryColor: 0x223668, // Deep royal blue
    shirtColor: 0xfbf7ef,
    trouserOrSkirtColor: 0x675596,
    trimColor: 0xe6c86e,
    hairColor: 0x20182b, // Midnight plum-black
    hairHighlight: 0x3f2e57,
    skinColor: 0xf6d5bd,
    eyeColor: 0x5c4799,
    bootColor: 0x2b2542,
    isGown: true,
  },
  ryan: {
    coatColor: 0x2d538e, // Tailored royal sapphire coat
    secondaryColor: 0x1b335c,
    shirtColor: 0xfaf5e8,
    trouserOrSkirtColor: 0x262e42,
    trimColor: 0xe2bb58,
    hairColor: 0x241914, // Short dark hair
    hairHighlight: 0x412d22,
    skinColor: 0xedc4a0,
    eyeColor: 0x35749e,
    bootColor: 0x3d281e,
    isGown: false,
  },
  eva: {
    coatColor: 0xc97b8e, // Dusty rose velvet bodice
    secondaryColor: 0xf7efe0, // Pearl ivory pleated gown
    shirtColor: 0xfdf9f2,
    trouserOrSkirtColor: 0xe8d5e4,
    trimColor: 0xe4c265,
    hairColor: 0x6b3a27, // Warm chestnut brown wavy hair
    hairHighlight: 0x8e5238,
    skinColor: 0xf5ceb5,
    eyeColor: 0x6b4f82,
    bootColor: 0x5e3b49,
    isGown: true,
  },
};

function makeBrocadeCanvasTexture(baseHex: number, trimHex: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const c = new THREE.Color(baseHex);
  const t = new THREE.Color(trimHex);
  ctx.fillStyle = `#${c.getHexString()}`;
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = `rgba(${Math.round(t.r * 255)}, ${Math.round(t.g * 255)}, ${Math.round(t.b * 255)}, 0.42)`;
  ctx.lineWidth = 2;
  for (let y = 16; y < 256; y += 32) {
    for (let x = 16; x < 256; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, y - 10);
      ctx.lineTo(x + 8, y);
      ctx.lineTo(x, y + 10);
      ctx.lineTo(x - 8, y);
      ctx.closePath();
      ctx.stroke();
    }
  }
  // Bottom hem gold embroidery band
  ctx.fillStyle = `rgba(${Math.round(t.r * 255)}, ${Math.round(t.g * 255)}, ${Math.round(t.b * 255)}, 0.85)`;
  ctx.fillRect(0, 232, 256, 12);
  ctx.fillRect(0, 218, 256, 4);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function makeHairStrandTexture(baseHex: number, hiHex: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const base = new THREE.Color(baseHex);
  const hi = new THREE.Color(hiHex);
  const dark = base.clone().multiplyScalar(0.68);

  ctx.fillStyle = `#${base.getHexString()}`;
  ctx.fillRect(0, 0, 256, 256);

  // Fine longitudinal hair strands
  for (let i = 0; i < 160; i++) {
    const x = (i * 19) % 256;
    const isHi = i % 3 === 0;
    const col = isHi ? hi : dark;
    ctx.strokeStyle = `rgba(${Math.round(col.r * 255)}, ${Math.round(col.g * 255)}, ${Math.round(col.b * 255)}, ${isHi ? 0.5 : 0.45})`;
    ctx.lineWidth = isHi ? 1.5 : 2.0;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + 3, 85, x - 3, 170, x, 256);
    ctx.stroke();
  }

  // Subtle horizontal silk sheen band across mid-crown
  const sheenGrad = ctx.createLinearGradient(0, 75, 0, 145);
  sheenGrad.addColorStop(0, 'rgba(255,255,255,0)');
  sheenGrad.addColorStop(0.5, 'rgba(255,248,238,0.16)');
  sheenGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheenGrad;
  ctx.fillRect(0, 75, 256, 70);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
  return tex;
}

export function createHeroCharacter(heroId: HeroId): CharacterRig {
  const style = HERO_STYLES[heroId];
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  const brocadeTex = makeBrocadeCanvasTexture(style.coatColor, style.trimColor);
  textures.push(brocadeTex);

  const coatMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      map: brocadeTex,
      roughness: 0.56,
      metalness: 0.08,
      sheen: 0.7,
      sheenColor: new THREE.Color(style.trimColor),
      side: THREE.DoubleSide,
    }),
  );
  const secondaryMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: style.secondaryColor,
      roughness: 0.58,
      metalness: 0.06,
      sheen: 0.65,
      sheenColor: new THREE.Color(0xfaf5eb),
      side: THREE.DoubleSide,
    }),
  );
  const shirtMat = trackMat(
    new THREE.MeshStandardMaterial({ color: style.shirtColor, roughness: 0.65, metalness: 0.02 }),
  );
  const trouserMat = trackMat(
    new THREE.MeshStandardMaterial({ color: style.trouserOrSkirtColor, roughness: 0.72, metalness: 0.05 }),
  );
  const goldMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: style.trimColor,
      roughness: 0.22,
      metalness: 0.88,
      clearcoat: 0.4,
    }),
  );
  const pearlMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xfcf8ee,
      roughness: 0.16,
      metalness: 0.12,
      clearcoat: 0.85,
    }),
  );
  const crystalMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x7de3e8,
      emissive: 0x44bcc4,
      emissiveIntensity: 0.6,
      roughness: 0.12,
      metalness: 0.2,
      clearcoat: 0.9,
    }),
  );
  const skinMat = trackMat(
    new THREE.MeshStandardMaterial({ color: style.skinColor, roughness: 0.6, metalness: 0.02 }),
  );
  const blushMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe69896,
      transparent: true,
      opacity: 0.38,
      roughness: 0.8,
    }),
  );
  const hairStrandTex = makeHairStrandTexture(style.hairColor, style.hairHighlight);
  textures.push(hairStrandTex);
  const hairMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      map: hairStrandTex,
      roughness: 0.42,
      metalness: 0.08,
      sheen: 0.65,
      sheenRoughness: 0.42,
      sheenColor: new THREE.Color(style.hairHighlight),
    }),
  );
  const hairHiMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      map: hairStrandTex,
      color: 0xffffff,
      emissive: new THREE.Color(style.hairHighlight),
      emissiveIntensity: 0.08,
      roughness: 0.38,
      metalness: 0.1,
      sheen: 0.75,
      sheenColor: new THREE.Color(style.hairHighlight),
    }),
  );
  const bootMat = trackMat(
    new THREE.MeshStandardMaterial({ color: style.bootColor, roughness: 0.55, metalness: 0.12 }),
  );

  // 1. Contact shadow + Royal Emblem Aura Ring
  const shadowRing = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(0.42, 28)),
    trackMat(
      new THREE.MeshBasicMaterial({
        color: 0x162038,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
      }),
    ),
  );
  shadowRing.rotation.x = -Math.PI / 2;
  shadowRing.position.y = 0.015;
  root.add(shadowRing);

  const auraRing = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(0.48, 0.57, 36)),
    trackMat(
      new THREE.MeshBasicMaterial({
        color: style.trimColor,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    ),
  );
  auraRing.rotation.x = -Math.PI / 2;
  auraRing.position.y = 0.025;
  root.add(auraRing);

  // 2. Articulated Legs (Hip -> Thigh -> Knee -> Calf -> Boot with cuff & sole)
  const createLeg = (xOffset: number): { hip: THREE.Group; knee: THREE.Group } => {
    const hip = new THREE.Group();
    hip.position.set(xOffset, 0.76, 0);

    const thighGeo = trackGeo(new THREE.CylinderGeometry(0.092, 0.074, 0.36, 14));
    const thigh = new THREE.Mesh(thighGeo, trouserMat);
    thigh.position.y = -0.18;
    thigh.castShadow = true;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.set(0, -0.36, 0);
    hip.add(knee);

    const calf = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.072, 0.058, 0.24, 12)), bootMat);
    calf.position.y = -0.12;
    calf.castShadow = true;
    knee.add(calf);

    const bootCuff = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.086, 0.076, 0.07, 14)), goldMat);
    bootCuff.position.y = -0.05;
    knee.add(bootCuff);

    const footUpper = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.062, 0.13, 6, 10)), bootMat);
    footUpper.rotation.x = Math.PI / 2;
    footUpper.position.set(0, -0.33, 0.055);
    footUpper.castShadow = true;
    knee.add(footUpper);

    const sole = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.13, 0.032, 0.25)), goldMat);
    sole.position.set(0, -0.384, 0.05);
    knee.add(sole);

    return { hip, knee };
  };

  const leftLeg = createLeg(-0.125);
  const rightLeg = createLeg(0.125);
  bodyPivot.add(leftLeg.hip, rightLeg.hip);

  // 3. Sculpted Torso, Waist, Collar & Coat Skirt/Gown (LatheGeometry)
  const upperTorsoPivot = new THREE.Group();
  upperTorsoPivot.position.set(0, 0.78, 0);
  bodyPivot.add(upperTorsoPivot);

  // Lower sculpted pelvis/waist
  const waistMesh = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.185, 0.21, 0.2, 16)), coatMat);
  waistMesh.position.y = 0.04;
  waistMesh.castShadow = true;
  upperTorsoPivot.add(waistMesh);

  // Sculpted upper chest (tailored taper)
  const chestPts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.18, 0.04),
    new THREE.Vector2(0.225, 0.24),
    new THREE.Vector2(0.21, 0.42),
    new THREE.Vector2(0.11, 0.48),
    new THREE.Vector2(0.0, 0.48),
  ];
  const chestGeo = trackGeo(new THREE.LatheGeometry(chestPts, 18));
  chestGeo.scale(1.06, 1.0, 0.78);
  const chestMesh = new THREE.Mesh(chestGeo, coatMat);
  chestMesh.position.y = 0.08;
  chestMesh.castShadow = true;
  upperTorsoPivot.add(chestMesh);

  // Crisp ivory inner jabot/vest front
  const vestMesh = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.095, 0.075, 0.38, 10)),
    shirtMat,
  );
  vestMesh.position.set(0, 0.34, 0.125);
  vestMesh.scale.set(1.15, 1, 0.45);
  upperTorsoPivot.add(vestMesh);

  // Standing Royal Collar
  const collar = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.135, 0.145, 0.11, 16, 1, true, Math.PI * 0.2, Math.PI * 1.6)),
    goldMat,
  );
  collar.position.set(0, 0.54, -0.01);
  collar.rotation.y = Math.PI;
  upperTorsoPivot.add(collar);

  // Embroidered Waist Belt + Center Royal Buckle/Gem
  const belt = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.195, 0.205, 0.075, 18)), goldMat);
  belt.scale.set(1.06, 1, 0.82);
  belt.position.y = 0.11;
  upperTorsoPivot.add(belt);

  const beltGem = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.045, 0)), crystalMat);
  beltGem.position.set(0, 0.11, 0.175);
  upperTorsoPivot.add(beltGem);

  // Chest Royal Crest Brooch
  const brooch = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.055, 0)), goldMat);
  brooch.position.set(0, 0.44, 0.178);
  upperTorsoPivot.add(brooch);

  // Skirt / Coat Tail Flare using LatheGeometry
  if (style.isGown) {
    // Layered Royal Gown + Gold Overskirt Peplum
    const gownPts = [
      new THREE.Vector2(0.19, 0.08),
      new THREE.Vector2(0.28, -0.14),
      new THREE.Vector2(0.38, -0.44),
      new THREE.Vector2(0.44, -0.68),
    ];
    const gownGeo = trackGeo(new THREE.LatheGeometry(gownPts, 24));
    const gownMesh = new THREE.Mesh(gownGeo, secondaryMat);
    gownMesh.castShadow = true;
    upperTorsoPivot.add(gownMesh);

    const peplumPts = [
      new THREE.Vector2(0.195, 0.08),
      new THREE.Vector2(0.27, -0.08),
      new THREE.Vector2(0.32, -0.25),
    ];
    const peplumGeo = trackGeo(
      new THREE.LatheGeometry(peplumPts, 20, Math.PI * 0.18, Math.PI * 1.64),
    );
    const peplumMesh = new THREE.Mesh(peplumGeo, coatMat);
    peplumMesh.rotation.y = Math.PI;
    upperTorsoPivot.add(peplumMesh);
  } else {
    // Flared Long Royal Coat Tails (open at front so trousers & boots show cleanly)
    const coatTailPts = [
      new THREE.Vector2(0.19, 0.08),
      new THREE.Vector2(0.24, -0.14),
      new THREE.Vector2(0.29, -0.42),
    ];
    const coatTailGeo = trackGeo(
      new THREE.LatheGeometry(coatTailPts, 18, Math.PI * 0.24, Math.PI * 1.52),
    );
    const coatTail = new THREE.Mesh(coatTailGeo, coatMat);
    coatTail.rotation.y = Math.PI;
    coatTail.castShadow = true;
    upperTorsoPivot.add(coatTail);
  }

  // 4. Sculpted Flowing Cape with Gold Shoulder Clasps
  const capePivot = new THREE.Group();
  capePivot.position.set(0, 0.51, -0.15);
  const capeGeo = trackGeo(new THREE.CylinderGeometry(0.18, 0.36, 0.92, 14, 4, true, -0.75, 1.5));
  const capeMesh = new THREE.Mesh(capeGeo, secondaryMat);
  capeMesh.position.set(0, -0.46, 0.04);
  capeMesh.rotation.y = Math.PI;
  capeMesh.rotation.x = 0.08;
  capeMesh.castShadow = true;
  capePivot.add(capeMesh);
  upperTorsoPivot.add(capePivot);

  // 5. Articulated Arms (Shoulder -> Epaulette -> UpperArm -> Elbow -> Forearm -> Cuff -> Hand)
  const createArm = (side: -1 | 1): { shoulder: THREE.Group; forearm: THREE.Group } => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.26, 0.49, 0);

    // Ornate Royal Epaulette
    const ep = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.088, 12, 10)), goldMat);
    ep.scale.set(1.2, 0.72, 1.05);
    shoulder.add(ep);

    // Upper sleeve (subtle puff for gown heroes)
    const upperSleeve = new THREE.Mesh(
      trackGeo(new THREE.CapsuleGeometry(style.isGown ? 0.072 : 0.065, 0.16, 6, 12)),
      coatMat,
    );
    upperSleeve.position.y = -0.12;
    upperSleeve.castShadow = true;
    shoulder.add(upperSleeve);

    const forearm = new THREE.Group();
    forearm.position.set(0, -0.24, 0);
    shoulder.add(forearm);

    const lowerSleeve = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.056, 0.048, 0.2, 12)),
      style.isGown ? shirtMat : coatMat,
    );
    lowerSleeve.position.y = -0.1;
    lowerSleeve.castShadow = true;
    forearm.add(lowerSleeve);

    const cuff = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.058, 0.058, 0.045, 12)), goldMat);
    cuff.position.y = -0.2;
    forearm.add(cuff);

    const hand = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.054, 12, 10)), skinMat);
    hand.scale.set(0.92, 1.15, 0.85);
    hand.position.y = -0.255;
    forearm.add(hand);

    return { shoulder, forearm };
  };

  const leftArm = createArm(-1);
  const rightArm = createArm(1);
  upperTorsoPivot.add(leftArm.shoulder, rightArm.shoulder);

  // 6. Sculpted Neck, Expressive Face & Full Hair
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.56, 0);
  upperTorsoPivot.add(headGroup);

  const neck = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.068, 0.082, 0.12, 12)), skinMat);
  neck.position.y = 0.04;
  headGroup.add(neck);

  // Sculpted Head Silhouette (slightly elongated vertical + subtle chin taper)
  const headMesh = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.21, 24, 20)), skinMat);
  headMesh.scale.set(0.95, 1.07, 0.98);
  headMesh.position.y = 0.23;
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Subtle Ears
  [-0.195, 0.195].forEach((ex) => {
    const ear = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.04, 10, 10)), skinMat);
    ear.scale.set(0.55, 1.05, 0.75);
    ear.position.set(ex, 0.22, -0.01);
    headGroup.add(ear);
  });

  // Sculpted Nose + Soft Cheeks + Smile/Talking Mouth
  const nose = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.024, 0.055, 8)), skinMat);
  nose.rotation.x = Math.PI * 0.42;
  nose.position.set(0, 0.215, 0.205);
  headGroup.add(nose);

  [-0.095, 0.095].forEach((cx) => {
    const blush = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.032, 12)), blushMat);
    blush.position.set(cx, 0.185, 0.185);
    blush.rotation.y = cx < 0 ? -0.35 : 0.35;
    headGroup.add(blush);
  });

  const mouthMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xa85258 }));
  const mouthMesh = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.011, 0.042, 4, 8)), mouthMat);
  mouthMesh.rotation.z = Math.PI / 2;
  mouthMesh.position.set(0, 0.145, 0.192);
  headGroup.add(mouthMesh);

  // Layered Expressive Eyes + Specular Catchlight + Animated Eyelids & Eyebrows
  const scleraMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xfefefe }));
  const irisMat = trackMat(new THREE.MeshBasicMaterial({ color: style.eyeColor }));
  const pupilMat = trackMat(new THREE.MeshBasicMaterial({ color: 0x101726 }));
  const catchMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xffffff }));

  const eyelids: THREE.Mesh[] = [];
  const eyebrows: THREE.Mesh[] = [];

  [-0.072, 0.072].forEach((ex, idx) => {
    const eyeSocket = new THREE.Group();
    eyeSocket.position.set(ex, 0.245, 0.18);
    eyeSocket.rotation.y = idx === 0 ? -0.14 : 0.14;

    const sclera = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.036, 12, 12)), scleraMat);
    sclera.scale.set(1.0, 1.12, 0.55);
    eyeSocket.add(sclera);

    const iris = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.024, 12, 12)), irisMat);
    iris.scale.set(1, 1.08, 0.5);
    iris.position.z = 0.015;
    eyeSocket.add(iris);

    const pupil = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.013, 10, 10)), pupilMat);
    pupil.scale.set(1, 1, 0.5);
    pupil.position.z = 0.022;
    eyeSocket.add(pupil);

    const catchlight = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.006, 8, 8)), catchMat);
    catchlight.position.set(0.009, 0.01, 0.026);
    eyeSocket.add(catchlight);

    // Animated Eyelid
    const lid = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.039, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.52)),
      skinMat,
    );
    lid.scale.set(1.05, 0.2, 0.65);
    lid.position.y = 0.026;
    eyeSocket.add(lid);
    eyelids.push(lid);

    // Sculpted Eyebrow
    const brow = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.01, 0.056, 4, 8)), hairMat);
    brow.rotation.z = Math.PI / 2 + (idx === 0 ? 0.08 : -0.08);
    brow.position.set(0, 0.058, 0.012);
    eyeSocket.add(brow);
    eyebrows.push(brow);

    headGroup.add(eyeSocket);
  });

  // 7. Refined Hero-Specific 3D Hairstyles + Hair Ornaments + Preserved Accessories
  const accessoryGroup = new THREE.Group();
  bodyPivot.add(accessoryGroup);

  // Secondary motion pivot for long flowing back hair (Elena & Eva) and subtle tuft motion
  const hairSwayPivot = new THREE.Group();
  hairSwayPivot.position.set(0, 0.25, -0.155);
  headGroup.add(hairSwayPivot);

  // Tailored cranial hair base sitting cleanly behind forehead & temples (never helmet-like)
  const crownHair = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.212, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.56)),
    hairMat,
  );
  crownHair.scale.set(0.97, 1.05, 0.99);
  crownHair.position.set(0, 0.242, -0.024);
  crownHair.rotation.x = -0.26;
  crownHair.castShadow = true;
  headGroup.add(crownHair);

  // Tapered nape fit at rear of skull so rear 3/4 view is clean and seamless
  const napeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.26, -0.175),
    new THREE.Vector3(0, 0.17, -0.185),
    new THREE.Vector3(0, 0.10, -0.145),
  ]);
  const napeSweep = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(napeCurve, 10, 0.095, 12, false)),
    hairMat,
  );
  napeSweep.scale.set(1.38, 1.0, 0.52);
  headGroup.add(napeSweep);

  if (heroId === 'ayden') {
    // AYDEN — Male Royal Explorer: Neat Side-Swept Quiff (short dark brown, clean silhouette, full face open)
    // Short neatly tapered sides above the ears
    [-1, 1].forEach((side) => {
      const sideFadeCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.186, 0.34, 0.03),
        new THREE.Vector3(side * 0.194, 0.275, -0.01),
        new THREE.Vector3(side * 0.176, 0.215, -0.055),
      ]);
      const sideFade = new THREE.Mesh(
        trackGeo(new THREE.TubeGeometry(sideFadeCurve, 10, 0.032, 8, false)),
        hairMat,
      );
      headGroup.add(sideFade);

      const backTaper = new THREE.Mesh(
        trackGeo(
          new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3([
              new THREE.Vector3(side * 0.14, 0.31, -0.13),
              new THREE.Vector3(side * 0.12, 0.21, -0.165),
              new THREE.Vector3(side * 0.075, 0.125, -0.155),
            ]),
            10,
            0.038,
            8,
            false,
          ),
        ),
        hairMat,
      );
      headGroup.add(backTaper);
    });

    // Neat Side-Swept Quiff on top: sculpted upward & diagonally right (zero bangs over forehead/eyes)
    const quiffSpecs: Array<{ sx: number; ex: number; yLift: number; zStart: number; r: number; hi?: boolean }> = [
      { sx: -0.09, ex: 0.08, yLift: 0.455, zStart: 0.155, r: 0.044 },
      { sx: -0.04, ex: 0.115, yLift: 0.472, zStart: 0.14, r: 0.048, hi: true },
      { sx: 0.01, ex: 0.14, yLift: 0.462, zStart: 0.11, r: 0.042 },
      { sx: -0.11, ex: 0.04, yLift: 0.445, zStart: 0.09, r: 0.04 },
      { sx: -0.05, ex: 0.125, yLift: 0.452, zStart: 0.02, r: 0.044, hi: true },
    ];
    quiffSpecs.forEach((q) => {
      const qCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(q.sx, 0.382, q.zStart),
        new THREE.Vector3((q.sx + q.ex) * 0.42, q.yLift, q.zStart - 0.05),
        new THREE.Vector3(q.ex, q.yLift - 0.028, q.zStart - 0.145),
        new THREE.Vector3(q.ex * 0.92, 0.375, q.zStart - 0.24),
      ]);
      const strand = new THREE.Mesh(
        trackGeo(new THREE.TubeGeometry(qCurve, 14, q.r, 10, false)),
        q.hi ? hairHiMat : hairMat,
      );
      strand.castShadow = true;
      headGroup.add(strand);
    });

    // Cross-body explorer utility belt + satchel (preserved)
    const crossStrap = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.235, 0.02, 8, 24)), bootMat);
    crossStrap.scale.set(0.95, 1.35, 0.78);
    crossStrap.position.set(0, 0.3, 0);
    crossStrap.rotation.z = 0.62;
    upperTorsoPivot.add(crossStrap);

    // Glowing Golden Compass Lantern in Right Hand (preserved)
    const lanternFrame = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.075, 0.065, 0.16, 6)), goldMat);
    lanternFrame.position.set(0, -0.34, 0.09);
    const lanternCore = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.055, 0)), crystalMat);
    lanternCore.position.set(0, -0.34, 0.09);
    rightArm.forearm.add(lanternFrame, lanternCore);
  } else if (heroId === 'elena') {
    // ELENA — Female Royal Scholar: Elegant Half-Up, Half-Down (visible forehead, swept front, crystal ornament)
    // Smooth front hairline swept cleanly outward to the sides (never blocking eyes or forehead)
    [-1, 1].forEach((side) => {
      const frontSweepCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.018, 0.415, 0.142),
        new THREE.Vector3(side * 0.115, 0.388, 0.125),
        new THREE.Vector3(side * 0.19, 0.312, 0.055),
        new THREE.Vector3(side * 0.196, 0.255, -0.055),
        new THREE.Vector3(side * 0.11, 0.282, -0.175),
      ]);
      const frontSweep = new THREE.Mesh(
        trackGeo(new THREE.TubeGeometry(frontSweepCurve, 18, 0.036, 10, false)),
        hairMat,
      );
      frontSweep.castShadow = true;
      headGroup.add(frontSweep);

      // Half-up pulled-back temple ribbon meeting at rear crown
      const halfUpCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.155, 0.355, 0.035),
        new THREE.Vector3(side * 0.172, 0.325, -0.095),
        new THREE.Vector3(side * 0.035, 0.29, -0.208),
      ]);
      const halfUpRibbon = new THREE.Mesh(
        trackGeo(new THREE.TubeGeometry(halfUpCurve, 14, 0.034, 8, false)),
        hairHiMat,
      );
      headGroup.add(halfUpRibbon);
    });

    // Delicate Crystal & Pearl Half-Up Ornament at the rear gathered knot + slim front royal circlet
    const halfUpClasp = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.055, 0.012, 8, 18)), goldMat);
    halfUpClasp.position.set(0, 0.288, -0.215);
    const halfUpCrystal = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.036, 0)), crystalMat);
    halfUpCrystal.position.set(0, 0.288, -0.225);
    [-0.045, 0.045].forEach((px) => {
      const pearlPin = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.017, 10, 10)), pearlMat);
      pearlPin.position.set(px, 0.292, -0.214);
      headGroup.add(pearlPin);
    });
    headGroup.add(halfUpClasp, halfUpCrystal);

    // Slim Scholar Diadem Band resting neatly on upper crown (leaves forehead & swept hairline visible)
    const tiaraBand = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.204, 0.011, 8, 24, Math.PI * 1.1)), goldMat);
    tiaraBand.rotation.x = Math.PI / 2;
    tiaraBand.rotation.z = -Math.PI * 0.05;
    tiaraBand.position.set(0, 0.388, 0.01);
    const centerGem = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.034, 0)), crystalMat);
    centerGem.position.set(0, 0.425, 0.165);
    headGroup.add(tiaraBand, centerGem);

    // Long Flowing Lower Half Falling Gracefully Behind Shoulders (attached to hairSwayPivot)
    const elenaFlowCols = [-0.15, -0.1, -0.05, 0, 0.05, 0.1, 0.15];
    elenaFlowCols.forEach((cx, idx) => {
      const outer = Math.abs(cx) > 0.11;
      const flowCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(cx * 0.72, 0.05, -0.025),
        new THREE.Vector3(cx * 1.05, -0.15, outer ? -0.055 : -0.075),
        new THREE.Vector3(cx * 1.24, -0.4, outer ? -0.05 : -0.085),
        new THREE.Vector3(cx * 1.18, -0.66, outer ? -0.075 : -0.105),
      ]);
      const flowLock = new THREE.Mesh(
        trackGeo(new THREE.TubeGeometry(flowCurve, 18, outer ? 0.034 : 0.042, 8, false)),
        idx % 2 === 0 ? hairMat : hairHiMat,
      );
      flowLock.castShadow = true;
      hairSwayPivot.add(flowLock);
    });

    // Pearl Necklace (preserved)
    for (let i = 0; i < 9; i++) {
      const a = -0.9 + i * 0.225;
      const pearl = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.016, 8, 8)), pearlMat);
      pearl.position.set(Math.sin(a) * 0.115, 0.51, Math.cos(a) * 0.11);
      upperTorsoPivot.add(pearl);
    }

    // Hovering Royal Manuscript Tome (preserved)
    const tomeCover = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.22, 0.28, 0.055)), secondaryMat);
    const tomePages = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.19, 0.25, 0.045)), pearlMat);
    tomePages.position.x = 0.01;
    const tomeGem = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.036, 0)), crystalMat);
    tomeGem.position.z = 0.035;
    const floatingTome = new THREE.Group();
    floatingTome.add(tomeCover, tomePages, tomeGem);
    floatingTome.position.set(0.48, 1.42, 0.08);
    floatingTome.rotation.y = -0.35;
    accessoryGroup.add(floatingTome);
  } else if (heroId === 'ryan') {
    // RYAN — Male Royal Inventor: Textured Side Part (short dark hair, neat sides, sophisticated volume on top)
    // Neatly tapered masculine sides
    [-1, 1].forEach((side) => {
      const sideClip = new THREE.Mesh(
        trackGeo(
          new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3([
              new THREE.Vector3(side * 0.184, 0.34, 0.02),
              new THREE.Vector3(side * 0.19, 0.27, -0.025),
              new THREE.Vector3(side * 0.172, 0.21, -0.07),
            ]),
            10,
            0.03,
            8,
            false,
          ),
        ),
        hairMat,
      );
      headGroup.add(sideClip);
    });

    // Left shorter combed side next to the side part (x = -0.085)
    [-0.085, -0.135].forEach((lx, idx) => {
      const leftSideCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(lx, 0.39 - idx * 0.02, 0.095),
        new THREE.Vector3(lx - 0.038, 0.372 - idx * 0.02, 0.015),
        new THREE.Vector3(lx - 0.025, 0.335 - idx * 0.02, -0.095),
      ]);
      headGroup.add(
        new THREE.Mesh(trackGeo(new THREE.TubeGeometry(leftSideCurve, 12, 0.034, 8, false)), hairMat),
      );
    });

    // Textured Side-Parted Top Volume sweeping from left part (-0.07) neatly across to the right
    const ryanLocks: Array<{ z: number; yMid: number; ex: number; r: number; hi?: boolean }> = [
      { z: 0.125, yMid: 0.452, ex: 0.115, r: 0.04, hi: true },
      { z: 0.075, yMid: 0.464, ex: 0.145, r: 0.043 },
      { z: 0.015, yMid: 0.458, ex: 0.155, r: 0.042, hi: true },
      { z: -0.055, yMid: 0.442, ex: 0.14, r: 0.04 },
      { z: -0.115, yMid: 0.415, ex: 0.115, r: 0.038 },
    ];
    ryanLocks.forEach((lk) => {
      const lockCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.072, 0.402, lk.z),
        new THREE.Vector3(0.035, lk.yMid, lk.z - 0.015),
        new THREE.Vector3(lk.ex, lk.yMid - 0.048, lk.z - 0.045),
        new THREE.Vector3(lk.ex + 0.015, 0.335, lk.z - 0.085),
      ]);
      const lockMesh = new THREE.Mesh(
        trackGeo(new THREE.TubeGeometry(lockCurve, 14, lk.r, 8, false)),
        lk.hi ? hairHiMat : hairMat,
      );
      lockMesh.castShadow = true;
      headGroup.add(lockMesh);
    });

    // Precision Brass & Turquoise Goggles tucked cleanly at upper hairline (compact so side part shines)
    const goggleStrap = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.21, 0.011, 8, 24)), bootMat);
    goggleStrap.rotation.x = Math.PI / 2;
    goggleStrap.position.set(0, 0.352, -0.005);
    headGroup.add(goggleStrap);
    [-0.068, 0.068].forEach((gx) => {
      const frame = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.038, 0.011, 8, 18)), goldMat);
      frame.position.set(gx, 0.356, 0.195);
      const lens = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.031, 14)), crystalMat);
      lens.position.set(gx, 0.356, 0.198);
      headGroup.add(frame, lens);
    });

    // Twin leather-and-gold inventor chest straps (preserved)
    [-0.1, 0.1].forEach((sx) => {
      const strap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.045, 0.42, 0.34)), bootMat);
      strap.position.set(sx, 0.3, 0);
      upperTorsoPivot.add(strap);
    });

    // Clockwork Crystal Astrolabe Wand in Right Hand (preserved)
    const rod = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.018, 0.02, 0.48, 10)), goldMat);
    rod.position.set(0, -0.3, 0.18);
    rod.rotation.x = Math.PI / 2.2;
    const astroRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.075, 0.012, 8, 20)), goldMat);
    astroRing.position.set(0, -0.27, 0.42);
    const astroGem = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.036, 0)), crystalMat);
    astroGem.position.copy(astroRing.position);
    rightArm.forearm.add(rod, astroRing, astroGem);
  } else {
    // EVA — Female Royal Envoy: Elegant Half-Up Waves (chestnut brown, front swept away, pearl/crystal accessory)
    // Soft front wave ribbons sweeping gracefully away from the face & forehead
    [-1, 1].forEach((side) => {
      const sideWaveCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.025, 0.41, 0.145),
        new THREE.Vector3(side * 0.125, 0.375, 0.115),
        new THREE.Vector3(side * 0.19, 0.295, 0.038),
        new THREE.Vector3(side * 0.186, 0.258, -0.075),
        new THREE.Vector3(side * 0.085, 0.295, -0.185),
      ]);
      const sideWave = new THREE.Mesh(
        trackGeo(new THREE.TubeGeometry(sideWaveCurve, 18, 0.038, 10, false)),
        hairHiMat,
      );
      sideWave.castShadow = true;
      headGroup.add(sideWave);
    });

    // Delicate Pearl & Crystal Half-Up Comb/Ornament at the rear wave gather + slender hairline pearl band
    const combArc = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.075, 0.011, 8, 18, Math.PI)), goldMat);
    combArc.position.set(0, 0.29, -0.21);
    const pearlCenter = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.024, 10, 10)), pearlMat);
    pearlCenter.position.set(0, 0.315, -0.218);
    [-0.048, 0.048].forEach((px) => {
      const crystalDrop = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.018, 0)), crystalMat);
      crystalDrop.position.set(px, 0.298, -0.214);
      headGroup.add(crystalDrop);
    });
    const slimBand = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.205, 0.01, 8, 24, Math.PI * 1.05)), goldMat);
    slimBand.rotation.x = Math.PI / 2;
    slimBand.rotation.z = -Math.PI * 0.025;
    slimBand.position.set(0, 0.382, 0.005);
    const sidePearl = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.022, 10, 10)), pearlMat);
    sidePearl.position.set(0.155, 0.362, 0.095);
    headGroup.add(combArc, pearlCenter, slimBand, sidePearl);

    // Long Naturally Wavy Chestnut Brown Hair Falling Behind Shoulders (attached to hairSwayPivot)
    const evaWaveOffsets = [-0.155, -0.11, -0.065, -0.02, 0.025, 0.07, 0.115, 0.155];
    evaWaveOffsets.forEach((wx, idx) => {
      const amp = 0.028 * (idx % 2 === 0 ? 1 : -1);
      const waveStrand = new THREE.CatmullRomCurve3([
        new THREE.Vector3(wx * 0.72, 0.045, -0.025),
        new THREE.Vector3(wx * 1.04 + amp, -0.14, -0.07),
        new THREE.Vector3(wx * 1.18 - amp, -0.32, -0.045),
        new THREE.Vector3(wx * 1.24 + amp, -0.5, -0.095),
        new THREE.Vector3(wx * 1.16 - amp * 0.6, -0.66, -0.07),
      ]);
      const waveMesh = new THREE.Mesh(
        trackGeo(new THREE.TubeGeometry(waveStrand, 20, 0.038, 8, false)),
        idx % 2 === 0 ? hairMat : hairHiMat,
      );
      waveMesh.castShadow = true;
      hairSwayPivot.add(waveMesh);
    });

    // Pearl Necklace (preserved)
    const necklace = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.115, 0.013, 8, 20)), pearlMat);
    necklace.rotation.x = Math.PI / 2;
    necklace.position.set(0, 0.51, 0.02);
    upperTorsoPivot.add(necklace);

    // Golden Storyteller Quill in Right Hand (preserved)
    const shaft = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.009, 0.015, 0.38, 8)), goldMat);
    shaft.position.set(0, -0.26, 0.16);
    shaft.rotation.x = 0.72;
    const feather = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.042, 0.26, 6)), pearlMat);
    feather.scale.set(0.45, 1, 1.1);
    feather.position.set(0, -0.17, 0.26);
    feather.rotation.x = 0.72;
    rightArm.forearm.add(shaft, feather);
  }

  let interactTimer = 0;
  let victoryPhase = 0;
  let landRecover = 0;
  let prevState: CharacterAnimState = 'idle';

  const updateAnimation = (
    state: CharacterAnimState,
    dt: number,
    elapsed: number,
    stridePhase?: number,
  ) => {
    const damp = 1 - Math.exp(-13 * dt);

    if (prevState === 'jump' && (state === 'idle' || state === 'walk' || state === 'land')) {
      landRecover = 0.28;
    }
    prevState = state;
    if (landRecover > 0) landRecover = Math.max(0, landRecover - dt);

    // Floating hero accessory orbit & bob
    accessoryGroup.position.y = Math.sin(elapsed * 2.4) * 0.055;
    accessoryGroup.rotation.y = Math.sin(elapsed * 0.8) * 0.18;

    // Natural eye blink every ~3.4 seconds
    const blinkCycle = elapsed % 3.4;
    const isBlinking = blinkCycle > 3.24;
    eyelids.forEach((lid) => {
      lid.scale.y = THREE.MathUtils.lerp(lid.scale.y, isBlinking ? 1.05 : 0.18, 1 - Math.exp(-26 * dt));
    });

    // Subtle mouth talk animation when in talk state
    if (state === 'talk') {
      mouthMesh.scale.y = 1 + Math.abs(Math.sin(elapsed * 12)) * 1.4;
    } else {
      mouthMesh.scale.y = THREE.MathUtils.lerp(mouthMesh.scale.y, 1, damp);
    }

    if (state === 'interact') {
      interactTimer += dt * 7;
    } else {
      interactTimer = 0;
    }

    // Subtle secondary hair motion during walk/run/jump/idle
    if (state === 'walk' || state === 'run') {
      const isRun = state === 'run';
      const phase = stridePhase !== undefined ? stridePhase : elapsed * (isRun ? 10.5 : 6.8);
      hairSwayPivot.rotation.x = THREE.MathUtils.lerp(
        hairSwayPivot.rotation.x,
        (isRun ? 0.28 : 0.14) + Math.abs(Math.sin(phase)) * (isRun ? 0.12 : 0.06),
        damp,
      );
      hairSwayPivot.rotation.z = Math.sin(phase) * (isRun ? 0.08 : 0.04);
    } else if (state === 'jump') {
      hairSwayPivot.rotation.x = THREE.MathUtils.lerp(hairSwayPivot.rotation.x, 0.34, damp);
      hairSwayPivot.rotation.z = THREE.MathUtils.lerp(hairSwayPivot.rotation.z, 0, damp);
    } else {
      hairSwayPivot.rotation.x = THREE.MathUtils.lerp(
        hairSwayPivot.rotation.x,
        0.04 + Math.sin(elapsed * 1.6) * 0.025,
        damp,
      );
      hairSwayPivot.rotation.z = THREE.MathUtils.lerp(
        hairSwayPivot.rotation.z,
        Math.sin(elapsed * 1.1) * 0.02,
        damp,
      );
    }

    if (state === 'victory') {
      victoryPhase += dt * 4.5;
      bodyPivot.position.y = Math.abs(Math.sin(victoryPhase)) * 0.24;
      upperTorsoPivot.rotation.x = THREE.MathUtils.lerp(upperTorsoPivot.rotation.x, -0.05, damp);
      leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(leftArm.shoulder.rotation.x, -2.55, damp);
      rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(rightArm.shoulder.rotation.x, -2.55, damp);
      leftArm.shoulder.rotation.z = THREE.MathUtils.lerp(leftArm.shoulder.rotation.z, -0.38, damp);
      rightArm.shoulder.rotation.z = THREE.MathUtils.lerp(rightArm.shoulder.rotation.z, 0.38, damp);
      leftArm.forearm.rotation.x = THREE.MathUtils.lerp(leftArm.forearm.rotation.x, -0.25, damp);
      rightArm.forearm.rotation.x = THREE.MathUtils.lerp(rightArm.forearm.rotation.x, -0.25, damp);
      leftLeg.hip.rotation.x = THREE.MathUtils.lerp(leftLeg.hip.rotation.x, 0, damp);
      rightLeg.hip.rotation.x = THREE.MathUtils.lerp(rightLeg.hip.rotation.x, 0, damp);
      leftLeg.knee.rotation.x = THREE.MathUtils.lerp(leftLeg.knee.rotation.x, 0.12, damp);
      rightLeg.knee.rotation.x = THREE.MathUtils.lerp(rightLeg.knee.rotation.x, 0.12, damp);
      capePivot.rotation.x = 0.32 + Math.sin(elapsed * 5) * 0.08;
      return;
    }

    if (state === 'jump') {
      bodyPivot.position.y = THREE.MathUtils.lerp(bodyPivot.position.y, 0.06, damp);
      leftLeg.hip.rotation.x = THREE.MathUtils.lerp(leftLeg.hip.rotation.x, -0.45, damp);
      rightLeg.hip.rotation.x = THREE.MathUtils.lerp(rightLeg.hip.rotation.x, 0.32, damp);
      leftLeg.knee.rotation.x = THREE.MathUtils.lerp(leftLeg.knee.rotation.x, 0.72, damp);
      rightLeg.knee.rotation.x = THREE.MathUtils.lerp(rightLeg.knee.rotation.x, 0.25, damp);
      leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(leftArm.shoulder.rotation.x, -1.15, damp);
      rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(rightArm.shoulder.rotation.x, -1.15, damp);
      leftArm.forearm.rotation.x = THREE.MathUtils.lerp(leftArm.forearm.rotation.x, -0.45, damp);
      rightArm.forearm.rotation.x = THREE.MathUtils.lerp(rightArm.forearm.rotation.x, -0.45, damp);
      capePivot.rotation.x = THREE.MathUtils.lerp(capePivot.rotation.x, 0.58, damp);
      return;
    }

    if (state === 'walk' || state === 'run') {
      const isRun = state === 'run';
      const phase = stridePhase !== undefined ? stridePhase : elapsed * (isRun ? 10.5 : 6.8);
      const amp = isRun ? 0.78 : 0.52;
      const swing = Math.sin(phase) * amp;

      leftLeg.hip.rotation.x = swing;
      rightLeg.hip.rotation.x = -swing;
      // Knee bends cleanly when leg swings forward or lifts back
      leftLeg.knee.rotation.x = Math.max(0.05, Math.cos(phase) * (isRun ? 0.82 : 0.52));
      rightLeg.knee.rotation.x = Math.max(0.05, -Math.cos(phase) * (isRun ? 0.82 : 0.52));

      leftArm.shoulder.rotation.x = -swing * 0.82;
      rightArm.shoulder.rotation.x = swing * 0.82;
      leftArm.shoulder.rotation.z = THREE.MathUtils.lerp(leftArm.shoulder.rotation.z, -0.1, damp);
      rightArm.shoulder.rotation.z = THREE.MathUtils.lerp(rightArm.shoulder.rotation.z, 0.1, damp);
      leftArm.forearm.rotation.x = THREE.MathUtils.lerp(leftArm.forearm.rotation.x, isRun ? -0.75 : -0.35, damp);
      rightArm.forearm.rotation.x = THREE.MathUtils.lerp(rightArm.forearm.rotation.x, isRun ? -0.75 : -0.35, damp);

      bodyPivot.position.y = Math.abs(Math.cos(phase)) * (isRun ? 0.07 : 0.038) - landRecover * 0.2;
      upperTorsoPivot.rotation.x = THREE.MathUtils.lerp(upperTorsoPivot.rotation.x, isRun ? 0.12 : 0.04, damp);
      upperTorsoPivot.rotation.y = -Math.sin(phase) * 0.07;
      headGroup.rotation.y = THREE.MathUtils.lerp(headGroup.rotation.y, 0, damp);
      capePivot.rotation.x = THREE.MathUtils.lerp(
        capePivot.rotation.x,
        (isRun ? 0.5 : 0.24) + Math.sin(phase) * 0.08,
        damp,
      );
      return;
    }

    if (state === 'interact') {
      rightArm.shoulder.rotation.x = -1.05 + Math.sin(interactTimer) * 0.22;
      rightArm.forearm.rotation.x = -0.45;
      leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(leftArm.shoulder.rotation.x, 0.08, damp);
      upperTorsoPivot.rotation.x = THREE.MathUtils.lerp(upperTorsoPivot.rotation.x, 0.08, damp);
      return;
    }

    if (state === 'talk') {
      bodyPivot.position.y = Math.sin(elapsed * 2.3) * 0.02;
      upperTorsoPivot.rotation.x = THREE.MathUtils.lerp(upperTorsoPivot.rotation.x, 0.03, damp);
      rightArm.shoulder.rotation.x = -0.55 + Math.sin(elapsed * 3.8) * 0.18;
      rightArm.forearm.rotation.x = -0.65 + Math.cos(elapsed * 4.2) * 0.14;
      leftArm.shoulder.rotation.x = -0.35 + Math.cos(elapsed * 3.1) * 0.12;
      leftArm.forearm.rotation.x = -0.45;
      headGroup.rotation.y = Math.sin(elapsed * 2.1) * 0.12;
      headGroup.rotation.x = Math.sin(elapsed * 3.5) * 0.05;
      return;
    }

    // Idle state: natural breathing, gentle weight shift, subtle look & landing cushion
    const cushion = landRecover * 0.28;
    bodyPivot.position.y = Math.sin(elapsed * 2.0) * 0.022 - cushion;
    upperTorsoPivot.rotation.x = THREE.MathUtils.lerp(upperTorsoPivot.rotation.x, cushion * 0.4, damp);
    upperTorsoPivot.rotation.y = THREE.MathUtils.lerp(upperTorsoPivot.rotation.y, Math.sin(elapsed * 0.9) * 0.03, damp);
    leftLeg.hip.rotation.x = THREE.MathUtils.lerp(leftLeg.hip.rotation.x, -cushion * 0.6, damp);
    rightLeg.hip.rotation.x = THREE.MathUtils.lerp(rightLeg.hip.rotation.x, -cushion * 0.6, damp);
    leftLeg.knee.rotation.x = THREE.MathUtils.lerp(leftLeg.knee.rotation.x, cushion * 1.2, damp);
    rightLeg.knee.rotation.x = THREE.MathUtils.lerp(rightLeg.knee.rotation.x, cushion * 1.2, damp);

    leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(leftArm.shoulder.rotation.x, Math.sin(elapsed * 1.7) * 0.04, damp);
    rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(rightArm.shoulder.rotation.x, -Math.sin(elapsed * 1.7) * 0.04, damp);
    leftArm.shoulder.rotation.z = THREE.MathUtils.lerp(leftArm.shoulder.rotation.z, -0.09, damp);
    rightArm.shoulder.rotation.z = THREE.MathUtils.lerp(rightArm.shoulder.rotation.z, 0.09, damp);
    leftArm.forearm.rotation.x = THREE.MathUtils.lerp(leftArm.forearm.rotation.x, -0.18, damp);
    rightArm.forearm.rotation.x = THREE.MathUtils.lerp(rightArm.forearm.rotation.x, -0.18, damp);

    capePivot.rotation.x = THREE.MathUtils.lerp(capePivot.rotation.x, 0.07 + Math.sin(elapsed * 1.5) * 0.035, damp);
    headGroup.rotation.y = Math.sin(elapsed * 0.75) * 0.1;
    headGroup.rotation.x = Math.sin(elapsed * 1.3) * 0.025;
  };

  return {
    root,
    bodyPivot,
    upperTorsoPivot,
    headGroup,
    leftArmPivot: leftArm.shoulder,
    rightArmPivot: rightArm.shoulder,
    leftForearmPivot: leftArm.forearm,
    rightForearmPivot: rightArm.forearm,
    leftLegPivot: leftLeg.hip,
    rightLegPivot: rightLeg.hip,
    leftKneePivot: leftLeg.knee,
    rightKneePivot: rightLeg.knee,
    capePivot,
    auraRing,
    accessoryGroup,
    updateAnimation,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}

export function createNpcCharacter(
  robeHex: number,
  accentHex: number,
  hairHex = 0x2f211a,
): {
  group: THREE.Group;
  updateIdle: (elapsed: number) => void;
  dispose: () => void;
} {
  const group = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];

  const g = <T extends THREE.BufferGeometry>(geo: T): T => {
    geos.push(geo);
    return geo;
  };
  const m = <T extends THREE.Material>(mat: T): T => {
    mats.push(mat);
    return mat;
  };

  const robeMat = m(
    new THREE.MeshPhysicalMaterial({
      color: robeHex,
      roughness: 0.58,
      metalness: 0.08,
      sheen: 0.75,
      sheenColor: new THREE.Color(accentHex),
      side: THREE.DoubleSide,
    }),
  );
  const accentMat = m(
    new THREE.MeshPhysicalMaterial({ color: accentHex, roughness: 0.24, metalness: 0.86, clearcoat: 0.35 }),
  );
  const skinMat = m(new THREE.MeshStandardMaterial({ color: 0xf2c8a7, roughness: 0.62 }));
  const hairMat = m(new THREE.MeshStandardMaterial({ color: hairHex, roughness: 0.5 }));
  const scleraMat = m(new THREE.MeshBasicMaterial({ color: 0xffffff }));
  const pupilMat = m(new THREE.MeshBasicMaterial({ color: 0x162038 }));
  const crystalMat = m(
    new THREE.MeshStandardMaterial({ color: 0x7de3e8, emissive: 0x4cc2cb, emissiveIntensity: 0.8 }),
  );

  // Pedestal Aura Ring
  const ring = new THREE.Mesh(
    g(new THREE.RingGeometry(0.56, 0.66, 32)),
    m(new THREE.MeshBasicMaterial({ color: accentHex, transparent: true, opacity: 0.45, side: THREE.DoubleSide })),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.025;
  group.add(ring);

  const animBody = new THREE.Group();
  group.add(animBody);

  // Sculpted Lathe Royal Gown / Mantle
  const robePts = [
    new THREE.Vector2(0.18, 1.32),
    new THREE.Vector2(0.22, 0.92),
    new THREE.Vector2(0.32, 0.45),
    new THREE.Vector2(0.41, 0.02),
  ];
  const robe = new THREE.Mesh(g(new THREE.LatheGeometry(robePts, 20)), robeMat);
  robe.castShadow = true;
  animBody.add(robe);

  // Golden sash & royal collar
  const sash = new THREE.Mesh(g(new THREE.TorusGeometry(0.22, 0.032, 8, 22)), accentMat);
  sash.rotation.x = Math.PI / 2;
  sash.position.y = 0.92;
  const collar = new THREE.Mesh(g(new THREE.CylinderGeometry(0.14, 0.16, 0.1, 14, 1, true)), accentMat);
  collar.position.y = 1.36;
  animBody.add(sash, collar);

  // Articulated Arms & Hands
  [-0.25, 0.25].forEach((ax) => {
    const sleeve = new THREE.Mesh(g(new THREE.CapsuleGeometry(0.065, 0.32, 6, 10)), robeMat);
    sleeve.position.set(ax, 1.12, 0.04);
    sleeve.rotation.z = ax < 0 ? 0.18 : -0.18;
    sleeve.rotation.x = -0.25;
    const hand = new THREE.Mesh(g(new THREE.SphereGeometry(0.052, 10, 10)), skinMat);
    hand.position.set(ax * 1.15, 0.92, 0.14);
    animBody.add(sleeve, hand);
  });

  // Expressive Head + Hair + Crown/Circlet
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.44;
  animBody.add(headGroup);

  const head = new THREE.Mesh(g(new THREE.SphereGeometry(0.195, 20, 16)), skinMat);
  head.scale.set(0.95, 1.06, 0.96);
  head.position.y = 0.18;
  head.castShadow = true;
  headGroup.add(head);

  const hairCap = new THREE.Mesh(
    g(new THREE.SphereGeometry(0.212, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.64)),
    hairMat,
  );
  hairCap.position.set(0, 0.19, -0.015);
  hairCap.rotation.x = -0.16;
  headGroup.add(hairCap);

  [-0.068, 0.068].forEach((ex) => {
    const sclera = new THREE.Mesh(g(new THREE.SphereGeometry(0.032, 10, 10)), scleraMat);
    sclera.position.set(ex, 0.195, 0.17);
    const pupil = new THREE.Mesh(g(new THREE.SphereGeometry(0.018, 8, 8)), pupilMat);
    pupil.position.set(ex, 0.195, 0.192);
    const brow = new THREE.Mesh(g(new THREE.CapsuleGeometry(0.008, 0.045, 4, 6)), hairMat);
    brow.rotation.z = Math.PI / 2;
    brow.position.set(ex, 0.24, 0.175);
    headGroup.add(sclera, pupil, brow);
  });

  const circlet = new THREE.Mesh(g(new THREE.TorusGeometry(0.19, 0.018, 8, 22)), accentMat);
  circlet.rotation.x = Math.PI / 2;
  circlet.position.y = 0.31;
  headGroup.add(circlet);

  // Ornate Royal Staff
  const staff = new THREE.Mesh(g(new THREE.CylinderGeometry(0.026, 0.022, 1.85, 10)), accentMat);
  staff.position.set(0.38, 0.92, 0.14);
  const orb = new THREE.Mesh(g(new THREE.OctahedronGeometry(0.1, 0)), crystalMat);
  orb.position.set(0.38, 1.9, 0.14);
  animBody.add(staff, orb);

  const updateIdle = (elapsed: number) => {
    animBody.position.y = Math.sin(elapsed * 1.9) * 0.018;
    headGroup.rotation.y = Math.sin(elapsed * 0.7) * 0.14;
    orb.rotation.y = elapsed * 1.2;
  };

  return {
    group,
    updateIdle,
    dispose: () => {
      geos.forEach((x) => x.dispose());
      mats.forEach((x) => x.dispose());
    },
  };
}
