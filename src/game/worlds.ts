import * as THREE from 'three';
import type { LocationId, PlayerProgress } from '../types/game';
import { buildAtelierChambers, type VoiceTelemetry } from './atelierChambers';
import { buildBalairungGemilangDiraja } from './balairungGemilangDiraja';
import { buildImperialGrandHall } from './imperialGrandHall';
import type { MaterialPalette } from './materials';
import { buildRimbaCahayaMahkota } from './rimbaCahayaMahkota';
import { buildRoyalLibrary } from './royalLibrary';

export interface CircleCollider {
  x: number;
  z: number;
  radius: number;
}

export interface BoxCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export type InteractAction =
  | { type: 'portal'; targetLocation: LocationId; missionHintNumber?: 1 | 2 | 3 | 4 | 5 }
  | { type: 'npc'; npcKey: 'guardian' | 'librarian' | 'forestKeeper' | 'atelierMaster' | 'theatreDirector' }
  | { type: 'mission_board' }
  | { type: 'hero_pedestal' }
  | { type: 'library_audio' }
  | { type: 'library_manuscript' }
  | { type: 'collect_fragment'; fragmentId: string }
  | { type: 'woods_altar' }
  | { type: 'atelier_writer' }
  | { type: 'atelier_voice' }
  | { type: 'atelier_teleport'; targetX: number; targetZ: number; targetYaw: number; targetZoneName: string }
  | { type: 'theatre_stage' };

export interface InteractablePoint {
  id: string;
  label: string;
  sublabel: string;
  position: THREE.Vector3;
  radius: number;
  action: InteractAction;
  locked?: boolean;
  lockReason?: string;
  visualRef?: THREE.Object3D;
}

export interface PortalTargetPoint {
  missionNumber: 1 | 2 | 3 | 4 | 5;
  targetLocation: LocationId;
  title: string;
  portalPosition: THREE.Vector3;
  approachPosition: THREE.Vector3;
  entryPosition: THREE.Vector3;
  colorHex: number;
}

export interface BuiltWorld {
  group: THREE.Group;
  skyColor: number;
  fogColor: number;
  fogDensity: number;
  boundsRadius: number;
  roomRect?: { minX: number; maxX: number; minZ: number; maxZ: number; maxY: number };
  circleColliders: CircleCollider[];
  boxColliders: BoxCollider[];
  interactables: InteractablePoint[];
  portalTargets?: PortalTargetPoint[];
  setActivePortal?: (missionNumber: 1 | 2 | 3 | 4 | 5 | null) => void;
  groundHeightAt: (x: number, z: number) => number;
  update: (elapsed: number, dt: number, playerPos?: THREE.Vector3, voice?: VoiceTelemetry) => void;
  dispose: () => void;
}

type TrackGeoFn = <T extends THREE.BufferGeometry>(g: T) => T;
type TrackMatFn = <T extends THREE.Material>(m: T) => T;

// ============================================================================
// ORGANIC MULTI-CLUSTER BOTANICAL TREE BUILDER (ZERO PRIMITIVE SPHERE TREES)
// ============================================================================
function buildOrganicTree(
  x: number,
  y: number,
  z: number,
  scale: number,
  hueOffset: number,
  tg: TrackGeoFn,
  tm: TrackMatFn,
  mats: MaterialPalette,
  withBlossoms = false,
): THREE.Group {
  const tree = new THREE.Group();
  tree.position.set(x, y, z);

  // Curved tapered trunk via LatheGeometry
  const trunkPts = [
    new THREE.Vector2(0.46 * scale, 0),
    new THREE.Vector2(0.32 * scale, 0.55 * scale),
    new THREE.Vector2(0.24 * scale, 2.2 * scale),
    new THREE.Vector2(0.15 * scale, 3.8 * scale),
  ];
  const trunk = new THREE.Mesh(tg(new THREE.LatheGeometry(trunkPts, 10)), mats.darkWalnut);
  trunk.castShadow = true;
  tree.add(trunk);

  // Root flares
  for (let r = 0; r < 4; r++) {
    const ra = (r / 4) * Math.PI * 2 + hueOffset * 2;
    const root = new THREE.Mesh(
      tg(new THREE.ConeGeometry(0.22 * scale, 0.7 * scale, 6)),
      mats.darkWalnut,
    );
    root.position.set(Math.cos(ra) * 0.3 * scale, 0.16 * scale, Math.sin(ra) * 0.3 * scale);
    root.rotation.z = -Math.cos(ra) * 0.75;
    root.rotation.x = Math.sin(ra) * 0.75;
    tree.add(root);
  }

  // Sculpted branches
  const branchAngles = [0.2, 2.3, 4.4];
  branchAngles.forEach((ba, idx) => {
    const branch = new THREE.Mesh(
      tg(new THREE.CylinderGeometry(0.06 * scale, 0.13 * scale, 1.8 * scale, 7)),
      mats.woodOak,
    );
    branch.position.set(
      Math.cos(ba) * 0.55 * scale,
      (2.7 + idx * 0.28) * scale,
      Math.sin(ba) * 0.55 * scale,
    );
    branch.rotation.z = -Math.cos(ba) * 0.65;
    branch.rotation.x = Math.sin(ba) * 0.65;
    tree.add(branch);
  });

  // Layered multi-cluster asymmetrical leaf tufts
  const leafColor = new THREE.Color().setHSL(0.38 + hueOffset, 0.42, 0.46);
  const leafMat = tm(
    new THREE.MeshStandardMaterial({
      map: mats.emeraldCanopy.map,
      color: leafColor,
      roughness: 0.78,
      metalness: 0.02,
    }),
  );

  const clusters: Array<[number, number, number, number, number, number]> = [
    [0, 4.35, 0, 1.55, 0.92, 1.45],
    [-1.05, 3.65, 0.55, 1.15, 0.82, 1.05],
    [1.1, 3.75, -0.4, 1.2, 0.85, 1.1],
    [0.25, 3.55, 1.0, 1.05, 0.78, 1.0],
    [-0.35, 3.6, -1.0, 1.1, 0.8, 1.0],
    [0.15, 4.95, 0.1, 0.95, 0.75, 0.95],
  ];

  clusters.forEach(([cx, cy, cz, sx, sy, sz], i) => {
    const tuft = new THREE.Mesh(tg(new THREE.DodecahedronGeometry(1, 1)), leafMat);
    tuft.position.set(cx * scale, cy * scale, cz * scale);
    tuft.scale.set(sx * scale, sy * scale, sz * scale);
    tuft.rotation.set(i * 0.5, i * 1.1, 0);
    tuft.castShadow = true;
    tree.add(tuft);
  });

  if (withBlossoms) {
    const blossomMat = tm(
      new THREE.MeshStandardMaterial({ color: 0xebb5c4, emissive: 0xd690a5, emissiveIntensity: 0.18 }),
    );
    for (let b = 0; b < 6; b++) {
      const ba = (b / 6) * Math.PI * 2;
      const flower = new THREE.Mesh(tg(new THREE.OctahedronGeometry(0.16 * scale, 0)), blossomMat);
      flower.position.set(Math.cos(ba) * 1.15 * scale, (3.8 + (b % 2) * 0.5) * scale, Math.sin(ba) * 1.15 * scale);
      tree.add(flower);
    }
  }

  return tree;
}

// ============================================================================
// CRYSTAL CHANDELIER BUILDER
// ============================================================================
function buildCrystalChandelier(
  tg: TrackGeoFn,
  tm: TrackMatFn,
  mats: MaterialPalette,
): THREE.Group {
  const group = new THREE.Group();
  const chain = new THREE.Mesh(tg(new THREE.CylinderGeometry(0.05, 0.05, 4.2, 8)), mats.antiqueGold);
  chain.position.y = 2.1;
  group.add(chain);

  const glowMat = tm(
    new THREE.MeshStandardMaterial({
      color: 0xfff5d6,
      emissive: 0xffdf8e,
      emissiveIntensity: 1.15,
      roughness: 0.2,
    }),
  );

  // Two golden concentric tiers + hanging crystal prisms
  [
    { r: 1.55, y: 0, count: 8 },
    { r: 0.95, y: -0.85, count: 6 },
  ].forEach((tier) => {
    const ring = new THREE.Mesh(tg(new THREE.TorusGeometry(tier.r, 0.06, 8, 28)), mats.champagneGold);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = tier.y;
    group.add(ring);

    for (let i = 0; i < tier.count; i++) {
      const a = (i / tier.count) * Math.PI * 2;
      const cx = Math.cos(a) * tier.r;
      const cz = Math.sin(a) * tier.r;

      const candle = new THREE.Mesh(tg(new THREE.CylinderGeometry(0.04, 0.045, 0.24, 8)), mats.pearlIvory);
      candle.position.set(cx, tier.y + 0.14, cz);
      const flame = new THREE.Mesh(tg(new THREE.OctahedronGeometry(0.065, 0)), glowMat);
      flame.position.set(cx, tier.y + 0.3, cz);

      const prism = new THREE.Mesh(tg(new THREE.OctahedronGeometry(0.11, 0)), mats.crystalTurquoise);
      prism.scale.set(0.7, 1.7, 0.7);
      prism.position.set(cx, tier.y - 0.25, cz);
      group.add(candle, flame, prism);
    }
  });

  const finial = new THREE.Mesh(tg(new THREE.OctahedronGeometry(0.24, 0)), mats.crystalTurquoise);
  finial.scale.set(0.8, 1.8, 0.8);
  finial.position.y = -1.45;
  group.add(finial);

  return group;
}

// ============================================================================
// ARCHITECTURAL DESTINATION-SPECIFIC PORTAL BUILDER
// ============================================================================
type PortalTheme = 'citadel' | 'library' | 'woods' | 'atelier' | 'voice' | 'theatre';

function createArchitecturalPortal(
  theme: PortalTheme,
  colorHex: number,
  unlocked: boolean,
  tg: TrackGeoFn,
  tm: TrackMatFn,
  mats: MaterialPalette,
): { group: THREE.Group; ring: THREE.Mesh; vortex: THREE.Mesh; previewObj: THREE.Group } {
  const group = new THREE.Group();

  // Two-stepped ivory-and-gold pedestal dais
  const step1 = new THREE.Mesh(tg(new THREE.CylinderGeometry(2.45, 2.7, 0.18, 24)), mats.pearlIvory);
  step1.position.y = 0.09;
  step1.receiveShadow = true;
  const step2 = new THREE.Mesh(tg(new THREE.CylinderGeometry(2.05, 2.2, 0.18, 24)), mats.creamStone);
  step2.position.y = 0.27;
  step2.receiveShadow = true;
  const rim = new THREE.Mesh(tg(new THREE.TorusGeometry(2.05, 0.05, 8, 32)), mats.antiqueGold);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.36;
  group.add(step1, step2, rim);

  // Fluted architectural columns flanking the gateway
  [-1.65, 1.65].forEach((px) => {
    const colBase = new THREE.Mesh(tg(new THREE.BoxGeometry(0.68, 0.35, 0.68)), mats.pearlIvory);
    colBase.position.set(px, 0.52, 0);
    const colShaft = new THREE.Mesh(
      tg(new THREE.CylinderGeometry(0.22, 0.27, 3.65, 16)),
      theme === 'woods' ? mats.darkWalnut : mats.creamStone,
    );
    colShaft.position.set(px, 2.45, 0);
    colShaft.castShadow = true;
    const colCap = new THREE.Mesh(tg(new THREE.BoxGeometry(0.66, 0.28, 0.66)), mats.antiqueGold);
    colCap.position.set(px, 4.38, 0);
    group.add(colBase, colShaft, colCap);
  });

  // Grand sculpted arch
  const arch = new THREE.Mesh(
    tg(new THREE.TorusGeometry(1.68, 0.18, 12, 36, Math.PI)),
    mats.antiqueGold,
  );
  arch.position.y = 4.38;
  group.add(arch);

  // Keystone Crest specific to each destination
  const crestGroup = new THREE.Group();
  crestGroup.position.set(0, 6.2, 0.05);
  if (theme === 'library') {
    // Open Book Keystone Crest
    const pageL = new THREE.Mesh(tg(new THREE.BoxGeometry(0.55, 0.42, 0.06)), mats.pearlIvory);
    pageL.position.x = -0.24;
    pageL.rotation.y = 0.35;
    const pageR = pageL.clone();
    pageR.position.x = 0.24;
    pageR.rotation.y = -0.35;
    crestGroup.add(pageL, pageR);
  } else if (theme === 'woods') {
    // Twisted Vine Crown + Emerald Crystal
    const gem = new THREE.Mesh(tg(new THREE.OctahedronGeometry(0.32, 0)), mats.crystalTurquoise);
    const vineArch = new THREE.Mesh(tg(new THREE.TorusGeometry(0.42, 0.06, 8, 20)), mats.emeraldBrocade);
    crestGroup.add(gem, vineArch);
  } else if (theme === 'atelier') {
    // Golden Astrolabe Emblem
    const r1 = new THREE.Mesh(tg(new THREE.TorusGeometry(0.38, 0.04, 8, 24)), mats.antiqueGold);
    const r2 = new THREE.Mesh(tg(new THREE.TorusGeometry(0.25, 0.035, 8, 20)), mats.champagneGold);
    r2.rotation.y = Math.PI / 3;
    crestGroup.add(r1, r2);
  } else if (theme === 'voice') {
    // Royal Acoustic Lyre + Drapery Curtains
    const lyre = new THREE.Mesh(tg(new THREE.TorusGeometry(0.36, 0.045, 8, 22, Math.PI * 1.4)), mats.antiqueGold);
    lyre.rotation.z = -Math.PI * 0.2;
    const gem = new THREE.Mesh(tg(new THREE.OctahedronGeometry(0.18, 0)), mats.crystalTurquoise);
    crestGroup.add(lyre, gem);
    [-1.2, 1.2].forEach((cx) => {
      const drape = new THREE.Mesh(tg(new THREE.CylinderGeometry(0.18, 0.32, 3.9, 10)), mats.dustyRoseVelvet);
      drape.position.set(cx, 2.35, 0.14);
      group.add(drape);
    });
  } else if (theme === 'theatre') {
    // Crowned Royal Curtain Arch
    const crown = new THREE.Mesh(tg(new THREE.ConeGeometry(0.38, 0.45, 6)), mats.antiqueGold);
    crestGroup.add(crown);
    [-1.22, 1.22].forEach((cx) => {
      const drape = new THREE.Mesh(tg(new THREE.CylinderGeometry(0.18, 0.34, 3.9, 10)), mats.velvetCrimson);
      drape.position.set(cx, 2.35, 0.14);
      group.add(drape);
    });
  } else {
    const gem = new THREE.Mesh(tg(new THREE.OctahedronGeometry(0.3, 0)), mats.antiqueGold);
    crestGroup.add(gem);
  }
  group.add(crestGroup);

  // Inner luminous spinning rune ring
  const ringMat = tm(
    new THREE.MeshStandardMaterial({
      color: unlocked ? colorHex : 0x7b8399,
      emissive: unlocked ? colorHex : 0x3b4257,
      emissiveIntensity: unlocked ? 0.95 : 0.25,
      roughness: 0.25,
      metalness: 0.7,
    }),
  );
  const ring = new THREE.Mesh(tg(new THREE.TorusGeometry(1.36, 0.055, 8, 32)), ringMat);
  ring.position.y = 2.7;
  group.add(ring);

  // Shimmering portal energy veil
  const vortexMat = tm(
    new THREE.MeshBasicMaterial({
      color: unlocked ? colorHex : 0x677088,
      transparent: true,
      opacity: unlocked ? 0.36 : 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const vortex = new THREE.Mesh(tg(new THREE.CircleGeometry(1.34, 32)), vortexMat);
  vortex.position.y = 2.7;
  group.add(vortex);

  // Subtle Miniature Destination Preview Floating Inside Portal Threshold
  const previewObj = new THREE.Group();
  previewObj.position.set(0, 2.65, -0.2);
  if (unlocked) {
    if (theme === 'library') {
      const miniBook = new THREE.Mesh(tg(new THREE.BoxGeometry(0.45, 0.58, 0.14)), mats.royalBlueBrocade);
      previewObj.add(miniBook);
    } else if (theme === 'woods') {
      const miniCanopy = new THREE.Mesh(tg(new THREE.DodecahedronGeometry(0.38, 1)), mats.emeraldCanopy);
      miniCanopy.position.y = 0.2;
      const miniTrunk = new THREE.Mesh(tg(new THREE.CylinderGeometry(0.08, 0.12, 0.5, 8)), mats.darkWalnut);
      miniTrunk.position.y = -0.15;
      previewObj.add(miniTrunk, miniCanopy);
    } else if (theme === 'atelier' || theme === 'voice') {
      const orb = new THREE.Mesh(tg(new THREE.OctahedronGeometry(0.32, 0)), mats.crystalTurquoise);
      const orbit = new THREE.Mesh(tg(new THREE.TorusGeometry(0.55, 0.03, 8, 24)), mats.antiqueGold);
      orbit.rotation.x = Math.PI / 3;
      previewObj.add(orb, orbit);
    } else {
      const stageStar = new THREE.Mesh(tg(new THREE.OctahedronGeometry(0.36, 0)), mats.champagneGold);
      previewObj.add(stageStar);
    }
  }
  group.add(previewObj);

  return { group, ring, vortex, previewObj };
}

// ============================================================================
// MAIN WORLD SCENE BUILDER
// ============================================================================
export function buildWorldScene(
  locationId: LocationId,
  mats: MaterialPalette,
  progress: PlayerProgress,
  isSoftwareGl: boolean,
): BuiltWorld {
  const group = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const localMats: THREE.Material[] = [];
  const disposables: Array<() => void> = [];

  const trackGeo: TrackGeoFn = (g) => {
    geos.push(g);
    return g;
  };
  const trackMat: TrackMatFn = (m) => {
    localMats.push(m);
    return m;
  };

  const circleColliders: CircleCollider[] = [];
  const boxColliders: BoxCollider[] = [];
  const interactables: InteractablePoint[] = [];
  const animatedUpdates: Array<(elapsed: number, dt: number) => void> = [];

  const addSparkles = (count: number, radius: number, maxHeight: number, colorHex: number) => {
    const actualCount = isSoftwareGl ? Math.min(count, 40) : count;
    const positions = new Float32Array(actualCount * 3);
    for (let i = 0; i < actualCount; i++) {
      const angle = (i / actualCount) * Math.PI * 2 * 3.7;
      const r = Math.sqrt((i + 1) / actualCount) * radius;
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = 0.7 + ((i * 1.7) % maxHeight);
      positions[i * 3 + 2] = Math.sin(angle) * r;
    }
    const geo = trackGeo(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = trackMat(
      new THREE.PointsMaterial({
        color: colorHex,
        size: 0.18,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
      }),
    );
    const pts = new THREE.Points(geo, mat);
    group.add(pts);
    animatedUpdates.push((elapsed) => {
      pts.rotation.y = elapsed * 0.04;
      pts.position.y = Math.sin(elapsed * 0.7) * 0.25;
    });
  };

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

  const addFlyingBirds = (count: number, centerZ: number, radius: number, baseHeight: number) => {
    const birds: THREE.Group[] = [];
    for (let i = 0; i < count; i++) {
      const bird = new THREE.Group();
      const wingL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.45, 0.04, 0.18)), mats.pearlIvory);
      wingL.position.x = -0.22;
      const wingR = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.45, 0.04, 0.18)), mats.pearlIvory);
      wingR.position.x = 0.22;
      bird.add(wingL, wingR);
      group.add(bird);
      birds.push(bird);
      animatedUpdates.push((elapsed) => {
        const a = elapsed * 0.28 + (i / count) * Math.PI * 2;
        const bx = Math.cos(a) * radius;
        const bz = centerZ + Math.sin(a) * (radius * 0.65);
        const by = baseHeight + Math.sin(elapsed * 1.3 + i) * 1.1;
        bird.position.set(bx, by, bz);
        bird.rotation.y = -a;
        const flap = Math.sin(elapsed * 8.5 + i * 2) * 0.45;
        wingL.rotation.z = flap;
        wingR.rotation.z = -flap;
      });
    }
  };

  // ============================================================================
  // 1. BALAI AGUNG DIRAJA & TAMAN ISTANA (PUSAT UTAMA 5 MISI & 5 PORTAL AJAIB)
  // ============================================================================
  if (locationId === 'citadel' || locationId === 'gate_hall') {
    return buildImperialGrandHall(mats, progress, isSoftwareGl, {
      buildOrganicTree,
      createArchitecturalPortal,
    });
  }

  // ============================================================================
  // 2. PUSTAKA AGUNG HIKAYAT DIRAJA (THE GRAND ENCHANTED ROYAL LIBRARY)
  // ============================================================================
  if (locationId === 'library') {
    return buildRoyalLibrary(mats, progress, isSoftwareGl, {
      createArchitecturalPortal,
    });
  }

  // ============================================================================
  // 3. RIMBA CAHAYA MAHKOTA (THE CROWN OF ENCHANTED LIGHT)
  // ============================================================================
  if (locationId === 'woods') {
    return buildRimbaCahayaMahkota(mats, progress, isSoftwareGl, {
      createArchitecturalPortal,
    });
  }

  // ============================================================================
  // 4. BALAI CIPTA MAHKOTA & BALAI GEMA DIRAJA (WORKSHOP & VOICE CHAMBER)
  // ============================================================================
  if (locationId === 'atelier') {
    return buildAtelierChambers(mats, progress, isSoftwareGl, {
      createArchitecturalPortal,
      buildCrystalChandelier,
    });
  }

  // ============================================================================
  // 5. BALAIRUNG GEMILANG DIRAJA (IMPERIAL ROYAL PERFORMANCE HALL)
  // ============================================================================
  return buildBalairungGemilangDiraja(mats, progress, isSoftwareGl, {
    createArchitecturalPortal,
  });
}
