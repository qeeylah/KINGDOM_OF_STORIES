import * as THREE from 'three';
import { STORY_FRAGMENTS } from '../data/gameContent';
import type { PlayerProgress } from '../types/game';
import { createNpcCharacter } from './characters';
import type { MaterialPalette } from './materials';
import type { BoxCollider, BuiltWorld, CircleCollider, InteractablePoint } from './worlds';

type TrackGeoFn = <T extends THREE.BufferGeometry>(g: T) => T;
type TrackMatFn = <T extends THREE.Material>(m: T) => T;

export interface RimbaHelpers {
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
  g.addColorStop(0, 'rgba(255, 254, 232, 1)');
  g.addColorStop(0.35, 'rgba(130, 240, 230, 0.85)');
  g.addColorStop(0.72, 'rgba(229, 195, 90, 0.35)');
  g.addColorStop(1, 'rgba(120, 210, 200, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createRuneHaloTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 512, 512);
  const cx = 256;
  const cy = 256;

  ctx.strokeStyle = 'rgba(235, 209, 133, 0.9)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, 232, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(110, 235, 228, 0.8)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 194, 0, Math.PI * 2);
  ctx.stroke();

  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < 24; i++) {
    ctx.rotate((Math.PI * 2) / 24);
    ctx.strokeStyle = i % 2 === 0 ? '#FFE89E' : '#7BE0E6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -198);
    ctx.lineTo(-9, -214);
    ctx.lineTo(0, -228);
    ctx.lineTo(9, -214);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Deterministic pseudo-random helper for repeatable lush forest placement
function seeded(i: number, salt = 1): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Keep gameplay corridors, spawn, NPC, bridge, portal, altar & fragments clear of colliders
function isWalkwayOrObjective(x: number, z: number): boolean {
  if (Math.hypot(x, z - 14) < 3.4) return true; // Spawn
  if (Math.hypot(x, z - 18) < 4.2) return true; // Return portal
  if (Math.hypot(x + 3.2, z - 10) < 3.4) return true; // NPC Laila
  if (Math.hypot(x, z + 19) < 5.0) return true; // Chronology Altar plaza
  if (Math.abs(x) < 3.2 && z > -20 && z < 19) return true; // Central royal pathway & bridge
  if (Math.abs(z + 0.5) < 3.4 && Math.abs(x) < 16) return true; // River & riverbank clear view
  for (const frag of STORY_FRAGMENTS) {
    const [fx, , fz] = frag.worldPosition;
    if (Math.hypot(x - fx, z - fz) < 3.2) return true;
  }
  return false;
}

export function buildRimbaCahayaMahkota(
  mats: MaterialPalette,
  progress: PlayerProgress,
  isSoftwareGl: boolean,
  helpers: RimbaHelpers,
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
  const animatedUpdates: Array<(elapsed: number, dt: number, playerPos?: THREE.Vector3) => void> = [];
  const mixers: THREE.AnimationMixer[] = [];
  const aniso = isSoftwareGl ? 1 : 4;

  // ==========================================================================
  // 1. PROCEDURAL TEXTURES & JEWEL-TONE ROYAL FOREST MATERIALS
  // ==========================================================================
  const mossFloorTex = trackTex(
    makeCanvasTex(
      1024,
      (ctx, s) => {
        const bg = ctx.createRadialGradient(s / 2, s / 2, 40, s / 2, s / 2, s * 0.65);
        bg.addColorStop(0, '#4F9E70');
        bg.addColorStop(0.55, '#3E8B61');
        bg.addColorStop(1, '#2D6E4E');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, s, s);

        // Soft clover/moss patches
        for (let i = 0; i < 420; i++) {
          const px = seeded(i, 1) * s;
          const py = seeded(i, 2) * s;
          const r = 8 + seeded(i, 3) * 26;
          ctx.fillStyle =
            i % 4 === 0
              ? 'rgba(116, 206, 148, 0.24)'
              : i % 4 === 1
                ? 'rgba(42, 118, 86, 0.26)'
                : i % 4 === 2
                  ? 'rgba(90, 198, 178, 0.16)'
                  : 'rgba(182, 164, 224, 0.12)';
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
        }

        // Fine grass blade strokes & tiny golden pollen flecks
        for (let i = 0; i < 1800; i++) {
          const gx = seeded(i, 4) * s;
          const gy = seeded(i, 5) * s;
          ctx.fillStyle = i % 9 === 0 ? 'rgba(242, 217, 136, 0.45)' : 'rgba(134, 218, 158, 0.35)';
          ctx.fillRect(gx, gy, 2.5, 7);
        }
      },
      aniso,
      12,
    ),
  );

  const barkRuneTex = trackTex(
    makeCanvasTex(
      512,
      (ctx, s) => {
        ctx.fillStyle = '#533B2C';
        ctx.fillRect(0, 0, s, s);

        // Deep longitudinal bark ridges & moss streaks
        for (let x = 0; x < s; x += 12) {
          ctx.fillStyle = x % 24 === 0 ? 'rgba(38, 25, 18, 0.45)' : 'rgba(110, 82, 60, 0.28)';
          ctx.fillRect(x, 0, 7, s);
        }
        for (let i = 0; i < 80; i++) {
          ctx.fillStyle = 'rgba(68, 148, 98, 0.28)';
          ctx.fillRect(seeded(i, 10) * s, seeded(i, 11) * s, 10, 36);
        }

        // Enchanted champagne-gold & turquoise vertical rune veins
        ctx.strokeStyle = 'rgba(229, 195, 90, 0.72)';
        ctx.lineWidth = 3;
        for (let v = 0; v < 4; v++) {
          const bx = (v + 0.5) * (s / 4);
          ctx.beginPath();
          ctx.moveTo(bx, 0);
          for (let y = 0; y <= s; y += 32) {
            ctx.lineTo(bx + Math.sin(y * 0.04 + v) * 14, y);
          }
          ctx.stroke();
        }
      },
      aniso,
      1,
      2,
    ),
  );

  const waterfallTex = trackTex(
    makeCanvasTex(
      512,
      (ctx, s) => {
        const g = ctx.createLinearGradient(0, 0, s, 0);
        g.addColorStop(0, '#3AA8D8');
        g.addColorStop(0.28, '#7BE0E6');
        g.addColorStop(0.5, '#DDFBFC');
        g.addColorStop(0.72, '#6CD7E2');
        g.addColorStop(1, '#2D8AC4');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, s, s);

        for (let i = 0; i < 240; i++) {
          const sx = seeded(i, 20) * s;
          const sy = seeded(i, 21) * s;
          const h = 24 + seeded(i, 22) * 58;
          ctx.fillStyle = i % 3 === 0 ? 'rgba(255, 255, 255, 0.52)' : 'rgba(180, 250, 255, 0.34)';
          ctx.fillRect(sx, sy, 4, h);
        }
      },
      aniso,
      1,
      2,
    ),
  );

  const riverTex = trackTex(
    makeCanvasTex(
      512,
      (ctx, s) => {
        const g = ctx.createLinearGradient(0, 0, 0, s);
        g.addColorStop(0, '#277BC0');
        g.addColorStop(0.5, '#48CFE0');
        g.addColorStop(1, '#277BC0');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, s, s);

        for (let i = 0; i < 180; i++) {
          const wx = seeded(i, 30) * s;
          const wy = seeded(i, 31) * s;
          ctx.strokeStyle = i % 2 === 0 ? 'rgba(220, 255, 255, 0.42)' : 'rgba(255, 238, 178, 0.24)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(wx, wy);
          ctx.bezierCurveTo(wx + 22, wy - 6, wx + 44, wy + 6, wx + 66, wy);
          ctx.stroke();
        }
      },
      aniso,
      4,
      1,
    ),
  );

  const runeHaloTex = trackTex(createRuneHaloTexture());
  const glowSpriteTex = trackTex(createGlowSpriteTex());

  const mossTerrainMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: mossFloorTex,
      roughness: 0.86,
      metalness: 0.02,
    }),
  );

  const ancientBarkMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: barkRuneTex,
      roughness: 0.78,
      metalness: 0.06,
      emissive: 0x3b2d12,
      emissiveIntensity: 0.16,
    }),
  );

  const canopyEmeraldMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: mats.emeraldCanopy.map,
      color: 0x4ca875,
      roughness: 0.72,
      metalness: 0.03,
    }),
  );

  const canopyTealMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: mats.emeraldCanopy.map,
      color: 0x3a9488,
      roughness: 0.72,
      metalness: 0.04,
    }),
  );

  const canopyLavenderMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: mats.emeraldCanopy.map,
      color: 0xa78be0,
      emissive: 0x5c4296,
      emissiveIntensity: 0.18,
      roughness: 0.65,
    }),
  );

  const waterfallMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      map: waterfallTex,
      color: 0xaef6fc,
      emissive: 0x2c8bb8,
      emissiveIntensity: 0.42,
      roughness: 0.14,
      metalness: 0.05,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    }),
  );

  const riverMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      map: riverTex,
      color: 0x62dce8,
      emissive: 0x1d6c96,
      emissiveIntensity: 0.34,
      roughness: 0.12,
      metalness: 0.08,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.88,
    }),
  );

  const crystalSapphireMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x3f88f2,
      emissive: 0x2054b8,
      emissiveIntensity: 0.55,
      roughness: 0.12,
      metalness: 0.18,
      clearcoat: 1.0,
    }),
  );

  const crystalLavenderMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xc29ef5,
      emissive: 0x7b56c2,
      emissiveIntensity: 0.52,
      roughness: 0.14,
      metalness: 0.15,
      clearcoat: 1.0,
    }),
  );

  const crystalGoldMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xf4d47c,
      emissive: 0xc9962a,
      emissiveIntensity: 0.55,
      roughness: 0.14,
      metalness: 0.35,
      clearcoat: 1.0,
    }),
  );

  const mossyRockMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x6b7f7c,
      roughness: 0.88,
      metalness: 0.04,
    }),
  );

  const runeFloorMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: runeHaloTex,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );

  const vineLumMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x78e8c8,
      emissive: 0x3ec9a8,
      emissiveIntensity: 0.65,
      roughness: 0.35,
    }),
  );

  // ==========================================================================
  // 2. SCULPTED TERRAIN, BRIDGE WALKWAY SURFACE & DISTANT VALLEY BOWL
  // ==========================================================================
  const groundHeightAt = (x: number, z: number): number => {
    const r = Math.hypot(x, z);
    let base = 0;
    if (r >= 6.5) {
      const altarFlat = Math.min(1, Math.max(0, (Math.hypot(x, z + 19) - 3.6) / 3.5));
      const portalFlat = Math.min(1, Math.max(0, (Math.hypot(x, z - 18) - 3.4) / 3.0));
      const rimLift = r > 32 ? Math.min(11.5, ((r - 32) / 32) * 8.5) : 0;
      const undulation = Math.sin(x * 0.14) * Math.cos(z * 0.14) * 0.42 * Math.min(1, (r - 6.5) / 14);
      base = (undulation + rimLift) * altarFlat * portalFlat;
    }

    // Gentle arched bridge elevation over the central river (x in [-1.75, 1.75], z in [-3.4, 2.4])
    if (Math.abs(x) <= 1.75 && z >= -3.4 && z <= 2.4) {
      const norm = (z + 0.5) / 2.9;
      const archY = 0.25 + Math.cos(norm * (Math.PI / 2)) * 0.62;
      if (archY > base) return archY;
    }
    return base;
  };

  const terrainGeo = trackGeo(new THREE.PlaneGeometry(180, 180, 72, 72));
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    // Terrain itself dips gently at the riverbed instead of rising with the bridge
    const r = Math.hypot(vx, vz);
    let ty = 0;
    if (r >= 6.5) {
      const altarFlat = Math.min(1, Math.max(0, (Math.hypot(vx, vz + 19) - 3.6) / 3.5));
      const portalFlat = Math.min(1, Math.max(0, (Math.hypot(vx, vz - 18) - 3.4) / 3.0));
      const rimLift = r > 32 ? Math.min(11.5, ((r - 32) / 32) * 8.5) : 0;
      const undulation = Math.sin(vx * 0.14) * Math.cos(vz * 0.14) * 0.42 * Math.min(1, (r - 6.5) / 14);
      ty = (undulation + rimLift) * altarFlat * portalFlat;
    }
    // Slight river channel depression along z ~ -0.5 + x * -0.32
    const riverCenterZ = -0.5 - vx * 0.28 + Math.sin(vx * 0.14) * 1.1;
    const distToRiver = Math.abs(vz - riverCenterZ);
    if (distToRiver < 2.5 && Math.abs(vx) < 28) {
      ty -= (1 - distToRiver / 2.5) * 0.34;
    }
    posAttr.setY(i, ty);
  }
  terrainGeo.computeVertexNormals();
  const terrainMesh = new THREE.Mesh(terrainGeo, mossTerrainMat);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // Subtle Royal Golden-Edged Stone Pathway Leading from Portal -> Bridge -> Altar
  for (let i = 0; i < 16; i++) {
    const pz = 15.2 - i * 2.1;
    if (pz > -3.3 && pz < 2.3) continue; // Bridge spans this gap
    const px = Math.sin(pz * 0.18) * 0.45;
    const stone = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.95, 1.08, 0.1, 8)),
      i % 3 === 0 ? mats.pearlIvory : mats.creamStone,
    );
    stone.position.set(px, groundHeightAt(px, pz) + 0.03, pz);
    stone.rotation.y = i * 0.45;
    stone.receiveShadow = true;
    const goldRim = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.96, 0.03, 6, 16)),
      mats.champagneGold,
    );
    goldRim.rotation.x = Math.PI / 2;
    goldRim.position.y = 0.05;
    stone.add(goldRim);
    group.add(stone);
  }

  // ==========================================================================
  // 3. ENCHANTED WATERFALL CLIFFS, CASCADES & WINDING CRYSTAL RIVER
  // ==========================================================================
  const riverCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-24, 0.02, 5.4),
    new THREE.Vector3(-12, 0.02, 2.7),
    new THREE.Vector3(0, 0.02, -0.5),
    new THREE.Vector3(12, 0.02, -3.5),
    new THREE.Vector3(24, 0.02, -6.9),
  ]);
  const riverGeo = trackGeo(new THREE.TubeGeometry(riverCurve, 56, 2.15, 10, false));
  riverGeo.scale(1, 0.06, 1);
  const riverMesh = new THREE.Mesh(riverGeo, riverMat);
  riverMesh.position.y = 0.05;
  group.add(riverMesh);

  // Sculpted riverbanks & glowing royal lotus lily-pads along banks
  const lotusGeo = trackGeo(new THREE.CylinderGeometry(0.45, 0.45, 0.05, 14, 1, false, 0, Math.PI * 1.85));
  const lotusFlowerMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffd7ec,
      emissive: 0xe290c4,
      emissiveIntensity: 0.48,
      roughness: 0.3,
    }),
  );
  for (let i = 0; i < 16; i++) {
    const t = (i + 0.5) / 16;
    const pt = riverCurve.getPoint(t);
    const side = i % 2 === 0 ? 1 : -1;
    // Small mossy riverside stone
    const bankStone = new THREE.Mesh(
      trackGeo(new THREE.DodecahedronGeometry(0.42 + (i % 3) * 0.14, 0)),
      mossyRockMat,
    );
    bankStone.scale.set(1.3, 0.55, 1.1);
    bankStone.position.set(pt.x + side * 0.3, groundHeightAt(pt.x, pt.z) + 0.05, pt.z + side * 2.15);
    group.add(bankStone);

    // Floating luminous lotus pads inside stream edges (away from bridge center)
    if (Math.abs(pt.x) > 2.6) {
      const pad = new THREE.Mesh(lotusGeo, canopyEmeraldMat);
      pad.position.set(pt.x, 0.09, pt.z + side * 1.15);
      pad.rotation.y = i * 1.3;
      const bloom = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.14, 0)), lotusFlowerMat);
      bloom.position.y = 0.12;
      pad.add(bloom);
      group.add(pad);
      animatedUpdates.push((elapsed) => {
        pad.position.y = 0.09 + Math.sin(elapsed * 1.9 + i) * 0.03;
      });
    }
  }

  // Twin Enchanted Cliff Waterfalls in North-West (-19, -27) and North-East (19, -26)
  const buildWaterfallCliff = (cx: number, cz: number, facingAngle: number, seedOffset: number) => {
    const cliffGroup = new THREE.Group();
    cliffGroup.position.set(cx, 0, cz);
    cliffGroup.rotation.y = facingAngle;

    // Tiered rocky cliff monoliths
    [
      [-3.2, 4.5, -0.8, 3.8, 9.5, 3.2],
      [3.2, 4.8, -0.8, 3.6, 10.2, 3.2],
      [0, 5.2, -1.6, 5.8, 11.2, 3.4],
    ].forEach(([rx, ry, rz, sx, sy, sz], idx) => {
      const rock = new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(1, 1)), mossyRockMat);
      rock.position.set(rx, ry, rz);
      rock.scale.set(sx, sy, sz);
      rock.rotation.y = idx * 0.8 + seedOffset;
      cliffGroup.add(rock);
    });

    // Golden-trimmed Royal Aqueduct Archway crowning the falls
    const fallArch = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(2.6, 0.24, 10, 24, Math.PI)),
      mats.antiqueGold,
    );
    fallArch.position.set(0, 8.8, 0.45);
    cliffGroup.add(fallArch);

    // Curved continuous flowing waterfall sheet
    const wfGeo = trackGeo(new THREE.PlaneGeometry(4.2, 10.4, 8, 18));
    const wfPos = wfGeo.attributes.position;
    for (let i = 0; i < wfPos.count; i++) {
      const py = wfPos.getY(i);
      const tNorm = (5.2 - py) / 10.4; // 0 top -> 1 bottom
      wfPos.setZ(i, Math.pow(tNorm, 1.55) * 1.45);
    }
    wfGeo.computeVertexNormals();
    const waterfallMesh = new THREE.Mesh(wfGeo, waterfallMat);
    waterfallMesh.position.set(0, 5.1, 0.3);
    cliffGroup.add(waterfallMesh);

    // Turquoise plunge pool & glowing mist ring
    const pool = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(4.6, 4.8, 0.22, 24)), riverMat);
    pool.position.set(0, 0.12, 2.2);
    const poolHalo = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(3.8, 0.18, 8, 28)),
      mats.crystalTurquoise,
    );
    poolHalo.rotation.x = Math.PI / 2;
    poolHalo.position.set(0, 0.16, 2.2);
    cliffGroup.add(pool, poolHalo);

    // Plunge-pool splash spray particles
    const sprayCount = isSoftwareGl ? 24 : 56;
    const sprayPos = new Float32Array(sprayCount * 3);
    for (let i = 0; i < sprayCount; i++) {
      const ang = (i / sprayCount) * Math.PI * 2;
      const rad = 0.6 + seeded(i, 40 + seedOffset) * 2.8;
      sprayPos[i * 3] = Math.cos(ang) * rad;
      sprayPos[i * 3 + 1] = 0.2 + seeded(i, 41 + seedOffset) * 2.0;
      sprayPos[i * 3 + 2] = 2.0 + Math.sin(ang) * rad * 0.7;
    }
    const sprayGeo = trackGeo(new THREE.BufferGeometry());
    sprayGeo.setAttribute('position', new THREE.BufferAttribute(sprayPos, 3));
    const sprayMat = trackMat(
      new THREE.PointsMaterial({
        map: glowSpriteTex,
        color: 0xbef9ff,
        size: 0.65,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    const sprayPts = new THREE.Points(sprayGeo, sprayMat);
    cliffGroup.add(sprayPts);

    animatedUpdates.push((elapsed) => {
      const arr = sprayGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < sprayCount; i++) {
        arr[i * 3 + 1] = 0.25 + ((elapsed * 1.8 + seeded(i, 42 + seedOffset) * 3) % 2.3);
      }
      sprayGeo.attributes.position.needsUpdate = true;
    });

    group.add(cliffGroup);
  };

  buildWaterfallCliff(-19.5, -26.5, 0.55, 1);
  buildWaterfallCliff(20.5, -25.5, -0.58, 7);

  animatedUpdates.push((_elapsed, dt) => {
    waterfallTex.offset.y += dt * 0.95;
    riverTex.offset.x -= dt * 0.22;
  });

  // ==========================================================================
  // 4. ORNATE ROYAL ARCH BRIDGE & STEPPING-STONE RIVER FORDS
  // ==========================================================================
  const bridgeGroup = new THREE.Group();
  bridgeGroup.position.set(0, 0, -0.5);

  // Curved bridge deck built from 9 sculpted ivory-and-oak arch segments
  for (let s = -4; s <= 4; s++) {
    const zOff = s * 0.64;
    const norm = zOff / 2.9;
    const archY = 0.25 + Math.cos(norm * (Math.PI / 2)) * 0.62;
    const slope = -Math.sin(norm * (Math.PI / 2)) * 0.28;
    const plank = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(3.45, 0.24, 0.68)),
      s % 2 === 0 ? mats.pearlIvory : mats.creamStone,
    );
    plank.position.set(0, archY - 0.1, zOff);
    plank.rotation.x = slope;
    plank.receiveShadow = true;
    plank.castShadow = true;

    const goldEdge = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(3.58, 0.08, 0.66)),
      mats.antiqueGold,
    );
    goldEdge.position.set(0, archY - 0.12, zOff);
    goldEdge.rotation.x = slope;
    bridgeGroup.add(plank, goldEdge);
  }

  // Sweeping gold-trimmed ivory bridge side arches & 4 corner crystal lamp posts
  [-1.68, 1.68].forEach((bx) => {
    const railCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(bx, 0.85, -2.75),
      new THREE.Vector3(bx, 1.48, -1.35),
      new THREE.Vector3(bx, 1.68, 0),
      new THREE.Vector3(bx, 1.48, 1.35),
      new THREE.Vector3(bx, 0.85, 2.75),
    ]);
    const railTube = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(railCurve, 24, 0.09, 8, false)),
      mats.antiqueGold,
    );
    bridgeGroup.add(railTube);

    [-2.75, -1.35, 0, 1.35, 2.75].forEach((pz, pIdx) => {
      const postY = 0.25 + Math.cos((pz / 2.9) * (Math.PI / 2)) * 0.62;
      const post = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.11, 0.14, 0.92, 10)),
        mats.pearlIvory,
      );
      post.position.set(bx, postY + 0.42, pz);
      bridgeGroup.add(post);

      if (pIdx === 0 || pIdx === 4) {
        const finial = new THREE.Mesh(
          trackGeo(new THREE.OctahedronGeometry(0.22, 0)),
          mats.crystalTurquoise,
        );
        finial.position.set(bx, postY + 1.05, pz);
        bridgeGroup.add(finial);
      }
    });
  });
  group.add(bridgeGroup);

  // East & West Stepping-Stone River Crossings (scenic & walkable shortcuts)
  [-10.5, 10.5].forEach((fx) => {
    const centerPt = riverCurve.getPoint(fx < 0 ? 0.28 : 0.72);
    for (let s = -2; s <= 2; s++) {
      const stepStone = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.68, 0.78, 0.22, 10)),
        mats.pearlIvory,
      );
      stepStone.position.set(centerPt.x + (s % 2) * 0.28, 0.12, centerPt.z + s * 0.92);
      const stepTrim = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.62, 0.03, 6, 16)),
        mats.champagneGold,
      );
      stepTrim.rotation.x = Math.PI / 2;
      stepTrim.position.y = 0.11;
      stepStone.add(stepTrim);
      group.add(stepStone);
    }
  });

  // ==========================================================================
  // 5. ANCIENT GIANT ROYAL TREES (HERO MOTHER TREES + DIVERSE GROVES)
  // ==========================================================================
  const swayNodes: Array<{ obj: THREE.Object3D; phase: number; amp: number }> = [];

  const buildAncientRoyalTree = (
    x: number,
    z: number,
    scale: number,
    style: 'emerald' | 'teal' | 'lavender',
    isHeroMotherTree: boolean,
    withCollider: boolean,
  ) => {
    const gy = groundHeightAt(x, z);
    const tree = new THREE.Group();
    tree.position.set(x, gy, z);

    // Tapered organic Lathe trunk
    const trunkPts = [
      new THREE.Vector2(0.75 * scale, 0),
      new THREE.Vector2(0.48 * scale, 1.1 * scale),
      new THREE.Vector2(0.36 * scale, 3.2 * scale),
      new THREE.Vector2(0.28 * scale, 5.2 * scale),
      new THREE.Vector2(0.18 * scale, 6.4 * scale),
    ];
    const trunk = new THREE.Mesh(trackGeo(new THREE.LatheGeometry(trunkPts, 12)), ancientBarkMat);
    trunk.castShadow = !isSoftwareGl;
    trunk.receiveShadow = true;
    tree.add(trunk);

    // Gnarled TubeGeometry buttress roots gripping terrain
    const rootCount = isHeroMotherTree ? 6 : 4;
    for (let r = 0; r < rootCount; r++) {
      const ra = (r / rootCount) * Math.PI * 2 + seeded(r, x + z) * 0.4;
      const rootCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(Math.cos(ra) * 0.35 * scale, 1.35 * scale, Math.sin(ra) * 0.35 * scale),
        new THREE.Vector3(Math.cos(ra) * 0.85 * scale, 0.45 * scale, Math.sin(ra) * 0.85 * scale),
        new THREE.Vector3(Math.cos(ra + 0.15) * 1.45 * scale, -0.05 * scale, Math.sin(ra + 0.15) * 1.45 * scale),
      ]);
      const rootMesh = new THREE.Mesh(
        trackGeo(new THREE.TubeGeometry(rootCurve, 10, 0.15 * scale, 6, false)),
        ancientBarkMat,
      );
      tree.add(rootMesh);
    }

    // Sweeping boughs & layered multi-cluster foliage crown
    const crownGroup = new THREE.Group();
    tree.add(crownGroup);
    swayNodes.push({ obj: crownGroup, phase: x * 0.4 + z * 0.3, amp: isHeroMotherTree ? 0.016 : 0.025 });

    const leafMat =
      style === 'lavender'
        ? canopyLavenderMat
        : style === 'teal'
          ? canopyTealMat
          : canopyEmeraldMat;

    const branchCount = isHeroMotherTree ? 5 : 3;
    for (let b = 0; b < branchCount; b++) {
      const ba = (b / branchCount) * Math.PI * 2 + seeded(b, x) * 0.5;
      const bCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 3.8 * scale, 0),
        new THREE.Vector3(Math.cos(ba) * 1.2 * scale, 4.9 * scale, Math.sin(ba) * 1.2 * scale),
        new THREE.Vector3(Math.cos(ba) * 2.2 * scale, 5.7 * scale, Math.sin(ba) * 2.2 * scale),
      ]);
      const branch = new THREE.Mesh(
        trackGeo(new THREE.TubeGeometry(bCurve, 8, 0.12 * scale, 6, false)),
        ancientBarkMat,
      );
      crownGroup.add(branch);

      // Foliate clusters at branch tips
      const cluster = new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(1.45 * scale, 1)), leafMat);
      cluster.position.set(Math.cos(ba) * 1.95 * scale, (5.5 + (b % 2) * 0.5) * scale, Math.sin(ba) * 1.95 * scale);
      cluster.scale.set(1.25, 0.72, 1.18);
      cluster.rotation.set(b * 0.4, ba, 0);
      cluster.castShadow = !isSoftwareGl;
      crownGroup.add(cluster);
    }

    // Upper domed canopy tiers
    [
      [0, 6.4, 0, 2.2, 1.05, 2.1],
      [0.45, 7.25, -0.35, 1.45, 0.85, 1.4],
    ].forEach(([cx, cy, cz, sx, sy, sz], idx) => {
      const crown = new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(scale, 1)), leafMat);
      crown.position.set(cx * scale, cy * scale, cz * scale);
      crown.scale.set(sx * scale, sy * scale, sz * scale);
      crown.rotation.y = idx * 1.1;
      crown.castShadow = !isSoftwareGl;
      crownGroup.add(crown);
    });

    // Hero Mother Trees get Embedded Glowing Crystals & Hanging Luminescent Vines
    if (isHeroMotherTree) {
      for (let v = 0; v < 5; v++) {
        const va = (v / 5) * Math.PI * 2 + 0.3;
        const vLen = 1.6 + (v % 2) * 0.8;
        const vine = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.035, 0.015, vLen, 6)),
          vineLumMat,
        );
        vine.position.set(Math.cos(va) * 2.1 * scale, 4.9 * scale - vLen * 0.5, Math.sin(va) * 2.1 * scale);
        const drop = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.11, 0)), crystalGoldMat);
        drop.position.y = -vLen * 0.52;
        vine.add(drop);
        crownGroup.add(vine);
      }

      // Embedded trunk crystal cluster
      for (let c = 0; c < 3; c++) {
        const ca = c * 0.8 + 0.6;
        const spire = new THREE.Mesh(
          trackGeo(new THREE.ConeGeometry(0.22 * scale, 1.1 * scale, 6)),
          c % 2 === 0 ? mats.crystalTurquoise : crystalSapphireMat,
        );
        spire.position.set(Math.cos(ca) * 0.45 * scale, (1.4 + c * 0.6) * scale, Math.sin(ca) * 0.45 * scale);
        spire.rotation.z = -Math.cos(ca) * 0.9;
        spire.rotation.x = Math.sin(ca) * 0.9;
        tree.add(spire);
      }
    }

    group.add(tree);
    if (withCollider) {
      circleColliders.push({ x, z, radius: 0.88 * scale });
    }
  };

  // 4 Hero Giant Mother Trees framing the glade
  buildAncientRoyalTree(-15.5, 10.5, 1.55, 'emerald', true, true);
  buildAncientRoyalTree(15.5, 8.5, 1.6, 'lavender', true, true);
  buildAncientRoyalTree(-15.5, -16.5, 1.65, 'teal', true, true);
  buildAncientRoyalTree(15.5, -15.5, 1.58, 'emerald', true, true);

  // Midground Enchanted Grove (clear of paths & collectibles)
  const midStyles: Array<'emerald' | 'teal' | 'lavender'> = ['emerald', 'teal', 'lavender'];
  for (let i = 0; i < 20; i++) {
    const ang = (i / 20) * Math.PI * 2 + seeded(i, 50) * 0.25;
    const rad = 11.5 + (i % 4) * 3.4;
    const tx = Math.cos(ang) * rad;
    const tz = Math.sin(ang) * rad;
    if (isWalkwayOrObjective(tx, tz)) continue;
    buildAncientRoyalTree(tx, tz, 0.95 + (i % 3) * 0.18, midStyles[i % 3], false, true);
  }

  // Towering Perimeter Cathedral-Canopy Ring creating dense royal forest depth
  for (let i = 0; i < 34; i++) {
    const ang = (i / 34) * Math.PI * 2;
    const rad = 26 + (i % 3) * 6.5;
    const tx = Math.cos(ang) * rad;
    const tz = Math.sin(ang) * rad;
    // Leave clear gap around the two waterfalls
    if (Math.hypot(tx + 19.5, tz + 26.5) < 7.5 || Math.hypot(tx - 20.5, tz + 25.5) < 7.5) continue;
    buildAncientRoyalTree(tx, tz, 1.45 + (i % 4) * 0.25, midStyles[(i + 1) % 3], i % 6 === 0, false);
  }

  // ==========================================================================
  // 6. MAGICAL CRYSTAL FORMATIONS (GROUND OUTCROPS + ROTATING FLOATING PILLARS)
  // ==========================================================================
  const addCrystalCluster = (
    x: number,
    z: number,
    scale: number,
    primaryMat: THREE.Material,
    secondaryMat: THREE.Material,
    withCollider = false,
  ) => {
    const gy = groundHeightAt(x, z);
    const cluster = new THREE.Group();
    cluster.position.set(x, gy, z);

    const rockBase = new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(0.75 * scale, 0)), mossyRockMat);
    rockBase.scale.set(1.25, 0.55, 1.15);
    rockBase.position.y = 0.2 * scale;
    cluster.add(rockBase);

    const spires: Array<[number, number, number, number, number]> = [
      [0, 1.3 * scale, 0, 0, 0],
      [-0.36 * scale, 0.95 * scale, 0.22 * scale, 0.28, -0.22],
      [0.34 * scale, 0.88 * scale, -0.2 * scale, -0.26, 0.24],
      [0.12 * scale, 0.72 * scale, 0.34 * scale, 0.22, 0.3],
    ];
    spires.forEach(([sx, sh, sz, rx, rz], idx) => {
      const crystal = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(0.24 * scale * (1 - idx * 0.14), sh, 6)),
        idx % 2 === 0 ? primaryMat : secondaryMat,
      );
      crystal.position.set(sx, sh * 0.52 + 0.15 * scale, sz);
      crystal.rotation.set(rx, idx * 0.9, rz);
      crystal.castShadow = !isSoftwareGl;
      cluster.add(crystal);
    });

    group.add(cluster);
    if (withCollider) {
      circleColliders.push({ x, z, radius: 0.78 * scale });
    }
  };

  // Scenic Crystal Outcrops flanking glade corners, waterfall edges, and Altar avenue
  [
    [-6.2, -13.5, 1.25, mats.crystalTurquoise, crystalSapphireMat, true],
    [6.2, -13.5, 1.25, crystalLavenderMat, crystalGoldMat, true],
    [-8.5, 9.2, 1.05, mats.crystalTurquoise, crystalGoldMat, true],
    [8.2, 8.8, 1.1, crystalSapphireMat, crystalLavenderMat, true],
    [-16.8, -1.5, 1.35, mats.crystalTurquoise, crystalSapphireMat, true],
    [16.8, -4.5, 1.35, crystalLavenderMat, mats.crystalTurquoise, true],
    [-4.8, -21.8, 1.4, crystalGoldMat, mats.crystalTurquoise, true],
    [4.8, -21.8, 1.4, crystalSapphireMat, crystalGoldMat, true],
  ].forEach(([cx, cz, sc, m1, m2, col]) => {
    addCrystalCluster(cx as number, cz as number, sc as number, m1 as THREE.Material, m2 as THREE.Material, col as boolean);
  });

  // Floating Rotating Crown Crystal Pillars (AnimationMixer Keyframe Tracks)
  const skyCrystalPositions: Array<[number, number, number, THREE.Material]> = [
    [-8.5, 7.6, -15.5, mats.crystalTurquoise],
    [8.5, 7.8, -15.5, crystalSapphireMat],
    [-13.5, 8.2, 2.5, crystalLavenderMat],
    [13.5, 8.4, 1.5, crystalGoldMat],
    [-4.5, 9.5, -22.5, crystalSapphireMat],
    [4.5, 9.5, -22.5, mats.crystalTurquoise],
  ];

  skyCrystalPositions.forEach(([sx, sy, sz, mat], idx) => {
    const pillar = new THREE.Group();
    pillar.name = `FloatingCrownCrystal_${idx}`;
    pillar.position.set(sx, sy, sz);

    const upper = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.46, 1.65, 6)), mat);
    upper.position.y = 0.82;
    const lower = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.46, 1.15, 6)), mat);
    lower.rotation.x = Math.PI;
    lower.position.y = -0.57;

    const halo = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.86, 0.045, 8, 24)), mats.champagneGold);
    halo.rotation.x = Math.PI * 0.38;

    pillar.add(upper, lower, halo);
    group.add(pillar);

    // Keyframed smooth rotation + bobbing via THREE.AnimationMixer
    const times = [0, 2.5, 5.0];
    const yValues = [sy, sy + 0.55, sy];
    const q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
    const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0));
    const q2 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI * 2, 0));

    const posTrack = new THREE.VectorKeyframeTrack('.position', times, [
      sx, yValues[0], sz,
      sx, yValues[1], sz,
      sx, yValues[2], sz,
    ]);
    const rotTrack = new THREE.QuaternionKeyframeTrack('.quaternion', times, [
      q0.x, q0.y, q0.z, q0.w,
      q1.x, q1.y, q1.z, q1.w,
      q2.x, q2.y, q2.z, q2.w,
    ]);
    const clip = new THREE.AnimationClip(`CrystalOrbit_${idx}`, 5.0, [posTrack, rotTrack]);
    const mixer = new THREE.AnimationMixer(pillar);
    const action = mixer.clipAction(clip);
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.time = idx * 0.85;
    action.play();
    mixers.push(mixer);
  });

  // ==========================================================================
  // 7. ROYAL STONE ARCHWAY, LANTERN PILLARS & ALTAR KRONOLOGI BATU PURBA
  // ==========================================================================
  const archGateway = new THREE.Group();
  archGateway.position.set(0, groundHeightAt(0, -15.5), -15.5);
  [-4.2, 4.2].forEach((px) => {
    const plinth = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.5, 0.55, 1.5)), mats.pearlIvory);
    plinth.position.set(px, 0.27, 0);
    const col = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.46, 0.56, 5.3, 12)), mats.creamStone);
    col.position.set(px, 3.05, 0);
    col.castShadow = !isSoftwareGl;
    const cap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.38, 0.42, 1.38)), mats.antiqueGold);
    cap.position.set(px, 5.75, 0);
    const lanternGem = new THREE.Mesh(
      trackGeo(new THREE.OctahedronGeometry(0.32, 0)),
      mats.crystalTurquoise,
    );
    lanternGem.position.set(px * 0.85, 4.4, 0.65);
    archGateway.add(plinth, col, cap, lanternGem);
  });
  const grandArch = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(4.2, 0.34, 12, 36, Math.PI)),
    mats.antiqueGold,
  );
  grandArch.position.y = 5.75;
  const keystoneCrown = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.55, 0)), crystalGoldMat);
  keystoneCrown.position.set(0, 9.95, 0.15);
  archGateway.add(grandArch, keystoneCrown);
  group.add(archGateway);
  circleColliders.push({ x: -4.2, z: -15.5, radius: 0.9 }, { x: 4.2, z: -15.5, radius: 0.9 });

  // Ornate Royal Rune Lantern Posts lining the central avenue
  [
    [-3.6, 12.8],
    [3.6, 12.8],
    [-3.8, -6.5],
    [3.8, -6.5],
  ].forEach(([lx, lz], idx) => {
    const ly = groundHeightAt(lx, lz);
    const post = new THREE.Group();
    post.position.set(lx, ly, lz);
    const base = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.3, 0.42, 0.45, 8)), mats.pearlIvory);
    base.position.y = 0.22;
    const shaft = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.11, 0.16, 2.3, 10)), mats.creamStone);
    shaft.position.y = 1.5;
    const cage = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.34, 0.04, 6, 18)), mats.antiqueGold);
    cage.position.y = 2.95;
    const gem = new THREE.Mesh(
      trackGeo(new THREE.OctahedronGeometry(0.22, 0)),
      idx % 2 === 0 ? crystalGoldMat : mats.crystalTurquoise,
    );
    gem.position.y = 2.95;
    post.add(base, shaft, cage, gem);
    group.add(post);
    circleColliders.push({ x: lx, z: lz, radius: 0.45 });
  });

  // Altar Kronologi Batu Purba — The Crown Sanctuary (PRESERVED AT (0, 0, -19))
  const altarY = groundHeightAt(0, -19);
  const altarGroup = new THREE.Group();
  altarGroup.position.set(0, altarY, -19);

  const altarStep1 = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(3.25, 3.65, 0.26, 24)), mats.pearlIvory);
  altarStep1.position.y = 0.13;
  altarStep1.receiveShadow = true;
  const altarStep2 = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(2.55, 2.8, 0.24, 24)), mats.creamStone);
  altarStep2.position.y = 0.38;
  altarStep2.receiveShadow = true;

  const altarGoldRim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(2.58, 0.06, 8, 36)), mats.antiqueGold);
  altarGoldRim.rotation.x = Math.PI / 2;
  altarGoldRim.position.y = 0.51;

  const altarRuneCircle = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(5.6, 5.6)), runeFloorMat);
  altarRuneCircle.rotation.x = -Math.PI / 2;
  altarRuneCircle.position.y = 0.52;

  const altarPedestal = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.95, 1.25, 1.35, 8)), mats.lavenderWall);
  altarPedestal.position.y = 1.15;
  const altarTableTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.15, 0.22, 1.35)), mats.antiqueGold);
  altarTableTop.position.y = 1.9;

  // Flanking Ancient Stone Chronology Tablets around Sanctuary backdrop
  [-2.35, 0, 2.35].forEach((tx, tIdx) => {
    const tablet = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.92, 2.25, 0.28)), mats.creamStone);
    tablet.position.set(tx, 1.55, -2.05 + Math.abs(tx) * 0.22);
    tablet.rotation.y = tx * -0.18;
    const tabletGem = new THREE.Mesh(
      trackGeo(new THREE.OctahedronGeometry(0.18, 0)),
      tIdx === 1 ? crystalGoldMat : mats.crystalTurquoise,
    );
    tabletGem.position.set(0, 0.68, 0.16);
    tablet.add(tabletGem);
    altarGroup.add(tablet);
  });

  // Hovering Royal Crown Crystal & Astrolabe Rings above Altar
  const altarCrystal = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.52, 0)), mats.crystalTurquoise);
  altarCrystal.position.y = 2.85;
  const altarOrbitA = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.92, 0.04, 8, 28)), mats.champagneGold);
  altarOrbitA.position.y = 2.85;
  altarOrbitA.rotation.x = Math.PI * 0.35;
  const altarOrbitB = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.16, 0.03, 8, 28)), crystalLavenderMat);
  altarOrbitB.position.y = 2.85;
  altarOrbitB.rotation.y = Math.PI * 0.35;

  altarGroup.add(
    altarStep1,
    altarStep2,
    altarGoldRim,
    altarRuneCircle,
    altarPedestal,
    altarTableTop,
    altarCrystal,
    altarOrbitA,
    altarOrbitB,
  );
  group.add(altarGroup);
  circleColliders.push({ x: 0, z: -19, radius: 1.5 });

  let altarNearBlend = 0;
  animatedUpdates.push((elapsed, dt, playerPos) => {
    const nearAltar = playerPos ? Math.hypot(playerPos.x, playerPos.z + 19) < 4.5 : false;
    altarNearBlend = THREE.MathUtils.lerp(altarNearBlend, nearAltar ? 1 : 0, 1 - Math.exp(-5 * dt));
    const speedBoost = 1 + altarNearBlend * 1.4;
    altarCrystal.rotation.y = elapsed * 1.2 * speedBoost;
    altarCrystal.position.y = 2.85 + Math.sin(elapsed * 2.2) * 0.14;
    altarOrbitA.rotation.z = elapsed * 0.85 * speedBoost;
    altarOrbitB.rotation.x = elapsed * 0.65 * speedBoost;
    altarRuneCircle.rotation.z = elapsed * (0.28 + altarNearBlend * 0.75);
  });

  interactables.push({
    id: 'woods-altar',
    label: 'Tekan E untuk Altar Kronologi Batu Purba',
    sublabel: 'Susun urutan peristiwa cerita "Misi Menyelamatkan Taman Sekolah"',
    position: new THREE.Vector3(0, altarY + 1, -19),
    radius: 3.3,
    action: { type: 'woods_altar' },
    visualRef: altarCrystal,
  });

  // ==========================================================================
  // 8. INSTANCED MEADOW FERNS, GLOWING MUSHROOMS & PROXIMITY-REACTIVE FLOWERS
  // ==========================================================================
  const fernCount = isSoftwareGl ? 60 : 140;
  const fernGeo = trackGeo(new THREE.ConeGeometry(0.32, 0.78, 5));
  const fernMesh = new THREE.InstancedMesh(fernGeo, canopyEmeraldMat, fernCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < fernCount; i++) {
    const ang = seeded(i, 60) * Math.PI * 2;
    const rad = 5.5 + seeded(i, 61) * 18.5;
    const fx = Math.cos(ang) * rad;
    const fz = Math.sin(ang) * rad;
    const fy = groundHeightAt(fx, fz);
    dummy.position.set(fx, fy + 0.22, fz);
    dummy.rotation.set(0.25, seeded(i, 62) * Math.PI * 2, 0.15);
    const fScale = 0.65 + seeded(i, 63) * 0.75;
    dummy.scale.set(fScale, fScale * 0.85, fScale);
    dummy.updateMatrix();
    fernMesh.setMatrixAt(i, dummy.matrix);
  }
  fernMesh.instanceMatrix.needsUpdate = true;
  group.add(fernMesh);

  // Glowing Crystal Mushrooms clustered in shady mossy pockets
  const mushCount = isSoftwareGl ? 28 : 64;
  const mushStemGeo = trackGeo(new THREE.CylinderGeometry(0.04, 0.06, 0.28, 6));
  const mushCapGeo = trackGeo(new THREE.SphereGeometry(0.16, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55));
  const mushStemInst = new THREE.InstancedMesh(mushStemGeo, mats.pearlIvory, mushCount);
  const mushCapInst = new THREE.InstancedMesh(mushCapGeo, vineLumMat, mushCount);
  for (let i = 0; i < mushCount; i++) {
    const ang = seeded(i, 70) * Math.PI * 2;
    const rad = 7.5 + seeded(i, 71) * 15.5;
    const mx = Math.cos(ang) * rad;
    const mz = Math.sin(ang) * rad;
    const my = groundHeightAt(mx, mz);
    const ms = 0.75 + seeded(i, 72) * 0.9;
    dummy.position.set(mx, my + 0.12 * ms, mz);
    dummy.rotation.set(0, seeded(i, 73) * Math.PI * 2, 0);
    dummy.scale.setScalar(ms);
    dummy.updateMatrix();
    mushStemInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(mx, my + 0.25 * ms, mz);
    dummy.updateMatrix();
    mushCapInst.setMatrixAt(i, dummy.matrix);
  }
  mushStemInst.instanceMatrix.needsUpdate = true;
  mushCapInst.instanceMatrix.needsUpdate = true;
  group.add(mushStemInst, mushCapInst);

  // Proximity-Reactive Royal Crown Flowers (petals unfurl & glow as Elena approaches)
  interface CrownFlowerRig {
    posX: number;
    posZ: number;
    petals: THREE.Mesh[];
    stamen: THREE.Mesh;
    stamenMat: THREE.MeshStandardMaterial;
    openBlend: number;
  }
  const crownFlowers: CrownFlowerRig[] = [];
  const flowerCoords: Array<[number, number, number]> = [
    [-2.4, 12.2, 0xc8a6ff],
    [2.6, 11.4, 0x7be0e6],
    [-2.5, 6.2, 0x7be0e6],
    [2.8, 5.4, 0xc8a6ff],
    [-6.8, 3.8, 0xf2d988],
    [6.5, 3.2, 0x7be0e6],
    [-2.6, -4.6, 0xc8a6ff],
    [2.6, -4.8, 0xf2d988],
    [-7.5, -8.5, 0x7be0e6],
    [7.8, -8.8, 0xc8a6ff],
    [-3.1, -13.5, 0x7be0e6],
    [3.1, -13.5, 0xc8a6ff],
    [-3.5, -17.5, 0xf2d988],
    [3.5, -17.5, 0x7be0e6],
  ];

  const petalGeo = trackGeo(new THREE.ConeGeometry(0.14, 0.44, 5));
  petalGeo.translate(0, 0.22, 0); // Pivot at base

  flowerCoords.forEach(([fx, fz, petalHex], idx) => {
    const fy = groundHeightAt(fx, fz);
    const fGroup = new THREE.Group();
    fGroup.position.set(fx, fy, fz);

    const stem = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.035, 0.055, 0.56, 6)), canopyEmeraldMat);
    stem.position.y = 0.28;
    fGroup.add(stem);

    const head = new THREE.Group();
    head.position.y = 0.56;
    fGroup.add(head);

    const petalMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: petalHex,
        emissive: petalHex,
        emissiveIntensity: 0.35,
        roughness: 0.28,
      }),
    );

    const petals: THREE.Mesh[] = [];
    for (let p = 0; p < 6; p++) {
      const pHolder = new THREE.Group();
      pHolder.rotation.y = (p / 6) * Math.PI * 2;
      const petal = new THREE.Mesh(petalGeo, petalMat);
      petal.rotation.x = 0.42; // Closed bud tilt when far, opens toward 1.15 when Elena is near
      pHolder.add(petal);
      head.add(pHolder);
      petals.push(petal);
    }

    const stamenMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffe89e,
        emissive: 0xffd564,
        emissiveIntensity: 0.6,
        roughness: 0.2,
      }),
    );
    const stamen = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.13, 0)), stamenMat);
    stamen.position.y = 0.14;
    head.add(stamen);

    group.add(fGroup);
    crownFlowers.push({ posX: fx, posZ: fz, petals, stamen, stamenMat, openBlend: 0 });

    animatedUpdates.push((elapsed) => {
      fGroup.rotation.z = Math.sin(elapsed * 1.4 + idx) * 0.04;
    });
  });

  animatedUpdates.push((elapsed, dt, playerPos) => {
    const damp = 1 - Math.exp(-5.5 * dt);
    for (let i = 0; i < crownFlowers.length; i++) {
      const fl = crownFlowers[i];
      const near = playerPos ? Math.hypot(playerPos.x - fl.posX, playerPos.z - fl.posZ) < 4.4 : false;
      fl.openBlend = THREE.MathUtils.lerp(fl.openBlend, near ? 1 : 0, damp);
      const tilt = THREE.MathUtils.lerp(0.42, 1.18, fl.openBlend);
      for (let p = 0; p < fl.petals.length; p++) {
        fl.petals[p].rotation.x = tilt;
      }
      fl.stamen.position.y = 0.14 + fl.openBlend * 0.12 + Math.sin(elapsed * 2.5 + i) * 0.02;
      fl.stamen.rotation.y = elapsed * (0.9 + fl.openBlend * 1.8);
      fl.stamenMat.emissiveIntensity = 0.6 + fl.openBlend * 0.9;
    }
  });

  // ==========================================================================
  // 9. VOLUMETRIC CANOPY SUNBEAMS, CRYSTAL BUTTERFLIES & PARTICLE SYSTEMS
  // ==========================================================================
  // Slanted Enchanted Sunbeams piercing the canopy
  const beamMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xfff2c2,
      transparent: true,
      opacity: isSoftwareGl ? 0.06 : 0.085,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
  );
  [
    [0, 9.5, -18.5, 0.22, -0.15, 2.8],
    [-6.5, 9.5, 5.5, 0.26, 0.18, 2.4],
    [7.2, 9.5, -6.5, -0.24, 0.16, 2.5],
    [-1.8, 9.2, 9.5, 0.18, -0.18, 2.1],
    [1.2, 9.2, -1.0, -0.16, 0.14, 2.6],
  ].forEach(([bx, by, bz, rz, rx, br], idx) => {
    const beam = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(br * 0.45, br, 20, 14, 1, true)), beamMat);
    beam.position.set(bx, by, bz);
    beam.rotation.set(rx, 0, rz);
    group.add(beam);
    animatedUpdates.push((elapsed) => {
      beam.rotation.z = rz + Math.sin(elapsed * 0.4 + idx) * 0.02;
    });
  });

  // Animated Crystal Butterflies / Luminous Forest Wisps (AnimationMixer wing flap + orbital flight)
  const butterflyCount = isSoftwareGl ? 5 : 9;
  const bWingGeo = trackGeo(new THREE.PlaneGeometry(0.24, 0.16));
  bWingGeo.translate(0.12, 0, 0);
  const bColors = [0x7be0e6, 0xc8a8ff, 0xffe490];
  for (let i = 0; i < butterflyCount; i++) {
    const bGroup = new THREE.Group();
    const wingMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: bColors[i % bColors.length],
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      }),
    );
    const wingL = new THREE.Mesh(bWingGeo, wingMat);
    wingL.name = 'WingL';
    wingL.rotation.y = Math.PI;
    const wingR = new THREE.Mesh(bWingGeo, wingMat);
    wingR.name = 'WingR';
    bGroup.add(wingL, wingR);
    group.add(bGroup);

    const radius = 5.5 + (i % 4) * 3.8;
    const baseY = 2.0 + (i % 3) * 1.4;
    const centerZ = (i % 2 === 0 ? -4 : 5);

    const flapClip = new THREE.AnimationClip(`ButterflyFlap_${i}`, 0.4, [
      new THREE.NumberKeyframeTrack('WingL.rotation[z]', [0, 0.2, 0.4], [-0.55, 0.65, -0.55]),
      new THREE.NumberKeyframeTrack('WingR.rotation[z]', [0, 0.2, 0.4], [0.55, -0.65, 0.55]),
    ]);
    const mixer = new THREE.AnimationMixer(bGroup);
    const act = mixer.clipAction(flapClip);
    act.setLoop(THREE.LoopRepeat, Infinity);
    act.time = i * 0.09;
    act.play();
    mixers.push(mixer);

    animatedUpdates.push((elapsed) => {
      const t = elapsed * (0.36 + (i % 3) * 0.08) + i * 1.4;
      const bx = Math.cos(t) * radius;
      const bz = centerZ + Math.sin(t * 2) * (radius * 0.48);
      const by = baseY + Math.sin(elapsed * 2.1 + i) * 0.55;
      bGroup.position.set(bx, by, bz);
      bGroup.rotation.y = -Math.atan2(Math.cos(t * 2) * radius * 0.96, -Math.sin(t) * radius);
    });
  }

  // Rising Fireflies (Turquoise & Gold) + Drifting Enchanted Leaves/Petals
  const fireflyCount = isSoftwareGl ? 45 : 120;
  const fireflyPos = new Float32Array(fireflyCount * 3);
  for (let i = 0; i < fireflyCount; i++) {
    const a = seeded(i, 80) * Math.PI * 2;
    const r = 2 + seeded(i, 81) * 20;
    fireflyPos[i * 3] = Math.cos(a) * r;
    fireflyPos[i * 3 + 1] = 0.6 + seeded(i, 82) * 7.5;
    fireflyPos[i * 3 + 2] = Math.sin(a) * r;
  }
  const fireflyGeo = trackGeo(new THREE.BufferGeometry());
  fireflyGeo.setAttribute('position', new THREE.BufferAttribute(fireflyPos, 3));
  const fireflyMat = trackMat(
    new THREE.PointsMaterial({
      map: glowSpriteTex,
      color: 0xc2ffec,
      size: 0.42,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const fireflies = new THREE.Points(fireflyGeo, fireflyMat);
  group.add(fireflies);

  const petalCount = isSoftwareGl ? 32 : 84;
  const petalPos = new Float32Array(petalCount * 3);
  for (let i = 0; i < petalCount; i++) {
    const a = seeded(i, 90) * Math.PI * 2;
    const r = 2 + seeded(i, 91) * 21;
    petalPos[i * 3] = Math.cos(a) * r;
    petalPos[i * 3 + 1] = 1.0 + seeded(i, 92) * 10.0;
    petalPos[i * 3 + 2] = Math.sin(a) * r;
  }
  const petalDropGeo = trackGeo(new THREE.BufferGeometry());
  petalDropGeo.setAttribute('position', new THREE.BufferAttribute(petalPos, 3));
  const petalDropMat = trackMat(
    new THREE.PointsMaterial({
      map: glowSpriteTex,
      color: 0xffe49c,
      size: 0.3,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const petalDrops = new THREE.Points(petalDropGeo, petalDropMat);
  group.add(petalDrops);

  animatedUpdates.push((elapsed) => {
    fireflies.rotation.y = elapsed * 0.045;
    fireflies.position.y = Math.sin(elapsed * 0.85) * 0.35;

    const pArr = petalDropGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < petalCount; i++) {
      const fall = 10.5 - ((elapsed * 0.72 + seeded(i, 93) * 10.5) % 10.0);
      pArr[i * 3 + 1] = fall;
    }
    petalDropGeo.attributes.position.needsUpdate = true;
    petalDrops.rotation.y = -elapsed * 0.03;

    // Gentle breeze sway on canopies
    for (let i = 0; i < swayNodes.length; i++) {
      const s = swayNodes[i];
      s.obj.rotation.z = Math.sin(elapsed * 1.15 + s.phase) * s.amp;
      s.obj.rotation.x = Math.cos(elapsed * 0.9 + s.phase) * s.amp * 0.7;
    }
  });

  // ==========================================================================
  // 10. 5 HIDDEN STORY FRAGMENTS (PRESERVED GAMEPLAY & COORDINATES)
  // ==========================================================================
  STORY_FRAGMENTS.forEach((frag) => {
    if (progress.collectedFragmentIds.includes(frag.id)) return;
    const [fx, , fz] = frag.worldPosition;
    const fy = groundHeightAt(fx, fz) + 1.4;
    const fragGroup = new THREE.Group();
    fragGroup.position.set(fx, fy, fz);

    // Ornate mossy stone pedestal beneath each floating fragment
    const plinth = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.55, 0.72, 0.35, 8)),
      mats.pearlIvory,
    );
    plinth.position.y = -1.22;
    fragGroup.add(plinth);

    const coreColor = progress.selectedHero === 'ayden' ? 0xdcb854 : 0x7be0e6;
    const orb = new THREE.Mesh(
      trackGeo(new THREE.OctahedronGeometry(0.46, 0)),
      trackMat(
        new THREE.MeshStandardMaterial({
          color: coreColor,
          emissive: coreColor,
          emissiveIntensity: progress.selectedHero === 'ayden' ? 1.05 : 0.85,
          roughness: 0.16,
        }),
      ),
    );
    const halo = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.78, 0.048, 8, 28)), mats.antiqueGold);
    const innerRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.62, 0.025, 8, 24)),
      crystalLavenderMat,
    );
    fragGroup.add(orb, halo, innerRing);
    group.add(fragGroup);

    animatedUpdates.push((elapsed) => {
      orb.position.y = Math.sin(elapsed * 2.5 + fx) * 0.22;
      halo.position.y = orb.position.y;
      innerRing.position.y = orb.position.y;
      orb.rotation.y = elapsed * 1.6;
      halo.rotation.x = elapsed * 1.1;
      halo.rotation.y = elapsed * 0.7;
      innerRing.rotation.y = -elapsed * 1.3;
    });

    interactables.push({
      id: `collect-${frag.id}`,
      label: `Tekan E untuk mengutip ${frag.title}`,
      sublabel: 'Simpan serpihan kisah ke dalam jurnal anda',
      position: new THREE.Vector3(fx, fy, fz),
      radius: 3.1,
      action: { type: 'collect_fragment', fragmentId: frag.id },
      visualRef: fragGroup,
    });
  });

  // ==========================================================================
  // 11. PENUNGGU RIMBA LAILA NPC (PRESERVED IDENTITY & LOCATION)
  // ==========================================================================
  const keeperY = groundHeightAt(-2.5, 10.6);
  const keeper = createNpcCharacter(0x3f7b5b, 0xdcb854, 0x2c1f1a);
  keeper.group.position.set(-2.5, keeperY, 10.6);
  group.add(keeper.group);
  disposables.push(keeper.dispose);
  circleColliders.push({ x: -2.5, z: 10.6, radius: 0.7 });
  animatedUpdates.push((elapsed) => keeper.updateIdle(elapsed));

  // Decorative mossy stone sanctuary pad beneath Laila
  const keeperPad = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.15, 1.3, 0.1, 16)),
    mats.creamStone,
  );
  keeperPad.position.set(-2.5, keeperY + 0.04, 10.6);
  group.add(keeperPad);

  const keeperBeacon = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.22, 0)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x73ba89,
        emissive: 0x73ba89,
        emissiveIntensity: 0.9,
        roughness: 0.18,
      }),
    ),
  );
  keeperBeacon.position.set(-2.5, keeperY + 2.55, 10.6);
  group.add(keeperBeacon);
  animatedUpdates.push((elapsed) => {
    keeperBeacon.rotation.y = elapsed * 1.8;
    keeperBeacon.position.y = keeperY + 2.55 + Math.sin(elapsed * 2.4) * 0.12;
  });

  interactables.push({
    id: 'npc-forest',
    label: 'Berbicara dengan Penunggu Rimba Laila',
    sublabel: 'Dengar panduan pencarian serpihan',
    position: new THREE.Vector3(-2.5, keeperY + 1, 10.6),
    radius: 3.1,
    action: { type: 'npc', npcKey: 'forestKeeper' },
    visualRef: keeperBeacon,
  });

  // ==========================================================================
  // 12. RETURN PORTAL TO BALAI AGUNG DIRAJA (PRESERVED)
  // ==========================================================================
  const retPortalY = groundHeightAt(0, 18);
  const retPortal = helpers.createArchitecturalPortal('citadel', 0xdcb854, true, trackGeo, trackMat, mats);
  retPortal.group.position.set(0, retPortalY, 18);
  group.add(retPortal.group);
  animatedUpdates.push((elapsed) => {
    retPortal.ring.rotation.z = elapsed * 1.1;
  });
  interactables.push({
    id: 'return-citadel',
    label: 'Tekan E untuk kembali ke Balai Agung Diraja',
    sublabel: 'Kembali ke istana kerajaan',
    position: new THREE.Vector3(0, retPortalY + 1, 18),
    radius: 3.1,
    action: { type: 'portal', targetLocation: 'citadel' },
    visualRef: retPortal.ring,
  });

  return {
    group,
    skyColor: 0x8fd6e8,
    fogColor: 0xbce8e4,
    fogDensity: 0.0082,
    boundsRadius: 23,
    circleColliders,
    boxColliders,
    interactables,
    groundHeightAt,
    update: (elapsed, dt, playerPos) => {
      for (let i = 0; i < mixers.length; i++) {
        mixers[i].update(dt);
      }
      for (let i = 0; i < animatedUpdates.length; i++) {
        animatedUpdates[i](elapsed, dt, playerPos);
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
