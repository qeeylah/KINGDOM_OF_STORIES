import * as THREE from 'three';
import type { PlayerProgress } from '../types/game';
import { createNpcCharacter } from './characters';
import type { MaterialPalette } from './materials';
import type { BoxCollider, BuiltWorld, CircleCollider, InteractablePoint } from './worlds';

type TrackGeoFn = <T extends THREE.BufferGeometry>(g: T) => T;
type TrackMatFn = <T extends THREE.Material>(m: T) => T;

export interface RoyalLibraryHelpers {
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

function createGlowSprite(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(255, 250, 224, 1)');
  g.addColorStop(0.35, 'rgba(255, 219, 128, 0.85)');
  g.addColorStop(0.75, 'rgba(155, 134, 201, 0.25)');
  g.addColorStop(1, 'rgba(155, 134, 201, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createRuneRingTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 512, 512);
  const cx = 256;
  const cy = 256;

  ctx.strokeStyle = 'rgba(235, 209, 133, 0.88)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, 232, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(123, 224, 230, 0.72)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 194, 0, Math.PI * 2);
  ctx.stroke();

  // Ancient Royal Geometric Runes
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < 24; i++) {
    ctx.rotate((Math.PI * 2) / 24);
    ctx.strokeStyle = i % 2 === 0 ? '#FFE699' : '#8BE9FD';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -200);
    ctx.lineTo(-8, -214);
    ctx.lineTo(0, -226);
    ctx.lineTo(8, -214);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createLightRayTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, 'rgba(255, 240, 190, 0.42)');
  g.addColorStop(0.55, 'rgba(205, 188, 248, 0.16)');
  g.addColorStop(1, 'rgba(123, 224, 230, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildRoyalLibrary(
  mats: MaterialPalette,
  _progress: PlayerProgress,
  isSoftwareGl: boolean,
  helpers: RoyalLibraryHelpers,
): BuiltWorld {
  const group = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const localMats: THREE.Material[] = [];
  const localTex: THREE.Texture[] = [];
  const disposables: Array<() => void> = [];
  const mixers: THREE.AnimationMixer[] = [];
  const animatedUpdates: Array<(elapsed: number, dt: number, playerPos?: THREE.Vector3) => void> = [];

  const circleColliders: CircleCollider[] = [];
  const boxColliders: BoxCollider[] = [];
  const interactables: InteractablePoint[] = [];

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

  const maxAniso = isSoftwareGl ? 1 : 4;
  const glowSprite = trackTex(createGlowSprite());
  const runeRingTex = trackTex(createRuneRingTexture());
  const lightRayTex = trackTex(createLightRayTexture());

  // --------------------------------------------------------------------------
  // 1. PROCEDURAL ARCHIVE TEXTURES & SPECIALTY MATERIALS
  // --------------------------------------------------------------------------
  const archiveFloorTex = trackTex(
    makeCanvasTex(
      1024,
      (ctx, s) => {
        const cx = s / 2;
        const cy = s / 2;
        ctx.fillStyle = '#EFE6DA';
        ctx.fillRect(0, 0, s, s);

        // Soft lavender & sapphire marble veins
        for (let i = 0; i < 65; i++) {
          ctx.strokeStyle =
            i % 2 === 0 ? 'rgba(136, 114, 186, 0.16)' : 'rgba(202, 168, 92, 0.22)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          const x = (i * 93) % s;
          const y = (i * 67) % s;
          ctx.moveTo(x, y);
          ctx.bezierCurveTo(x + 48, y + 26, x + 92, y - 18, x + 150, y + 14);
          ctx.stroke();
        }

        // Outer Sapphire & Lavender Concentric Archive Borders
        ctx.fillStyle = '#1D3162';
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.48, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#745EA8';
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.43, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#F2EAD9';
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.39, 0, Math.PI * 2);
        ctx.fill();

        // Radial Champagne Gold Astrolabe Spokes
        ctx.save();
        ctx.translate(cx, cy);
        for (let i = 0; i < 12; i++) {
          ctx.rotate((Math.PI * 2) / 12);
          ctx.strokeStyle = 'rgba(204, 166, 62, 0.52)';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(0, s * 0.14);
          ctx.lineTo(0, s * 0.48);
          ctx.stroke();
        }
        ctx.restore();

        // Concentric Gold Rings
        [0.48, 0.43, 0.39, 0.26, 0.16].forEach((rf, idx) => {
          ctx.strokeStyle = idx % 2 === 0 ? '#D4AF37' : '#E8CC78';
          ctx.lineWidth = idx === 0 ? 10 : 5;
          ctx.beginPath();
          ctx.arc(cx, cy, s * rf, 0, Math.PI * 2);
          ctx.stroke();
        });

        // Central Sapphire Sanctuary Star
        ctx.fillStyle = '#20366E';
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.155, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(cx, cy);
        for (let i = 0; i < 8; i++) {
          ctx.rotate((Math.PI * 2) / 8);
          ctx.fillStyle = i % 2 === 0 ? '#E5C35A' : '#7BE0E6';
          ctx.beginPath();
          ctx.moveTo(0, -s * 0.14);
          ctx.lineTo(14, -s * 0.05);
          ctx.lineTo(0, 0);
          ctx.lineTo(-14, -s * 0.05);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      },
      maxAniso,
      1,
    ),
  );

  const archiveFloorMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: archiveFloorTex,
      roughness: 0.18,
      metalness: 0.14,
      envMapIntensity: 0.95,
    }),
  );

  const vaultDomeTex = trackTex(
    makeCanvasTex(
      1024,
      (ctx, s) => {
        const cx = s / 2;
        const cy = s / 2;
        const grad = ctx.createRadialGradient(cx, cy, 40, cx, cy, s * 0.5);
        grad.addColorStop(0, '#FFF4DA');
        grad.addColorStop(0.22, '#B6A2E3');
        grad.addColorStop(0.58, '#2D3F7E');
        grad.addColorStop(1, '#18244D');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, s, s);

        ctx.save();
        ctx.translate(cx, cy);
        for (let i = 0; i < 12; i++) {
          ctx.rotate((Math.PI * 2) / 12);
          ctx.strokeStyle = 'rgba(229, 201, 123, 0.55)';
          ctx.lineWidth = 7;
          ctx.beginPath();
          ctx.moveTo(0, 40);
          ctx.lineTo(0, s * 0.49);
          ctx.stroke();
        }
        ctx.restore();

        [0.2, 0.32, 0.44].forEach((rf) => {
          ctx.strokeStyle = 'rgba(235, 209, 133, 0.6)';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(cx, cy, s * rf, 0, Math.PI * 2);
          ctx.stroke();
        });

        for (let i = 0; i < 42; i++) {
          const a = i * 1.37;
          const r = s * (0.14 + ((i * 29) % 34) * 0.01);
          ctx.fillStyle = i % 3 === 0 ? '#7BE0E6' : '#FFEAA7';
          ctx.beginPath();
          ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, i % 4 === 0 ? 5 : 3, 0, Math.PI * 2);
          ctx.fill();
        }
      },
      maxAniso,
      1,
    ),
  );

  const vaultDomeMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: vaultDomeTex,
      emissiveMap: vaultDomeTex,
      emissive: new THREE.Color(0xd7c8ff),
      emissiveIntensity: 0.22,
      roughness: 0.45,
      side: THREE.DoubleSide,
    }),
  );

  const amethystCrystalMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xb794f4,
      emissive: 0x7c3aed,
      emissiveIntensity: 0.65,
      roughness: 0.12,
      metalness: 0.16,
      clearcoat: 0.9,
    }),
  );

  const amberGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffe6a3,
      emissive: 0xffb84d,
      emissiveIntensity: 1.25,
      roughness: 0.2,
    }),
  );

  const parchmentMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfef8e8,
      emissive: 0xffe19c,
      emissiveIntensity: 0.28,
      roughness: 0.48,
    }),
  );

  const runeHaloMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: runeRingTex,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
  );

  // --------------------------------------------------------------------------
  // 2. GRAND CENTRAL HALL FLOOR, CARPET RUNNERS & FLOATING RUNES
  // --------------------------------------------------------------------------
  const mainFloor = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(22.2, 22.2, 0.3, 48)),
    archiveFloorMat,
  );
  mainFloor.position.y = -0.15;
  mainFloor.receiveShadow = true;
  group.add(mainFloor);

  // Royal Sapphire & Gold Central Processional Runner
  const centralRunner = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(3.4, 0.03, 21.5)),
    mats.royalBlueBrocade,
  );
  centralRunner.position.set(0, 0.015, 3.2);
  centralRunner.receiveShadow = true;
  group.add(centralRunner);

  [-1.72, 1.72].forEach((rx) => {
    const runnerTrim = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.14, 0.035, 21.5)),
      mats.champagneGold,
    );
    runnerTrim.position.set(rx, 0.02, 3.2);
    group.add(runnerTrim);
  });

  // Glowing Royal Floor Rune Halo around Sanctuary Center
  const centerRuneDisc = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(7.2, 7.2)), runeHaloMat);
  centerRuneDisc.rotation.x = -Math.PI / 2;
  centerRuneDisc.position.set(0, 0.03, -1.5);
  group.add(centerRuneDisc);
  animatedUpdates.push((elapsed) => {
    centerRuneDisc.rotation.z = elapsed * 0.14;
  });

  // --------------------------------------------------------------------------
  // 3. MULTI-STOREY ROYAL ARCHITECTURE, STAINED GLASS, MEZZANINE & VAULTED DOME
  // --------------------------------------------------------------------------
  const numSides = 12;
  const wallRadius = 21.6;
  const wallHeight = 16.0;

  const swayingBanners: Array<{ mesh: THREE.Mesh; phase: number }> = [];

  for (let i = 0; i < numSides; i++) {
    const ang = (i / numSides) * Math.PI * 2;
    const nextAng = ((i + 0.5) / numSides) * Math.PI * 2;
    const isWindowBay = i % 2 === 1;

    // Exterior Bay Wall Panel
    const bayWall = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(11.6, wallHeight, 0.9)),
      mats.pearlIvory,
    );
    bayWall.position.set(Math.sin(ang) * wallRadius, wallHeight * 0.5, Math.cos(ang) * wallRadius);
    bayWall.rotation.y = ang;
    bayWall.receiveShadow = true;
    group.add(bayWall);

    // Lavender architectural wainscot trim
    const wainscot = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(11.2, 1.4, 1.02)),
      mats.lavenderWall,
    );
    wainscot.position.set(Math.sin(ang) * (wallRadius - 0.1), 0.7, Math.cos(ang) * (wallRadius - 0.1));
    wainscot.rotation.y = ang;
    group.add(wainscot);

    if (isWindowBay) {
      // Towering Tall Arched Stained-Glass Cathedral Window
      const winPlane = new THREE.Mesh(
        trackGeo(new THREE.PlaneGeometry(5.6, 11.4)),
        i % 4 === 1 ? mats.stainedGlass : mats.stainedGlassWarm,
      );
      winPlane.position.set(Math.sin(ang) * (wallRadius - 0.55), 8.2, Math.cos(ang) * (wallRadius - 0.55));
      winPlane.rotation.y = ang + Math.PI;
      group.add(winPlane);

      const archTop = new THREE.Mesh(
        trackGeo(new THREE.CircleGeometry(2.8, 20, 0, Math.PI)),
        i % 4 === 1 ? mats.stainedGlass : mats.stainedGlassWarm,
      );
      archTop.position.set(Math.sin(ang) * (wallRadius - 0.55), 13.9, Math.cos(ang) * (wallRadius - 0.55));
      archTop.rotation.y = ang + Math.PI;
      group.add(archTop);

      // Ornate Champagne Gold Window Frame Mullions
      [-2.85, 0, 2.85].forEach((mx) => {
        const mullion = new THREE.Mesh(
          trackGeo(new THREE.BoxGeometry(0.18, 11.6, 0.2)),
          mats.antiqueGold,
        );
        mullion.position.set(
          Math.sin(ang) * (wallRadius - 0.5) + Math.cos(ang) * mx,
          8.2,
          Math.cos(ang) * (wallRadius - 0.5) - Math.sin(ang) * mx,
        );
        mullion.rotation.y = ang;
        group.add(mullion);
      });
    }

    // Monumental Fluted Pillars at Every Corner with Golden Capitals & Magical Sconces
    const px = Math.sin(nextAng) * 19.8;
    const pz = Math.cos(nextAng) * 19.8;
    const pillar = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.56, 0.68, wallHeight, 14)),
      mats.warmIvoryMarble,
    );
    pillar.position.set(px, wallHeight * 0.5, pz);
    pillar.castShadow = !isSoftwareGl;
    group.add(pillar);

    const pBase = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.84, 0.92, 0.8, 12)),
      mats.antiqueGold,
    );
    pBase.position.set(px, 0.4, pz);
    const pCapital = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.95, 0.62, 0.9, 12)),
      mats.champagneGold,
    );
    pCapital.position.set(px, wallHeight - 0.4, pz);
    group.add(pBase, pCapital);

    // Magical Crystal Wall Sconce facing inward on every pillar
    const sx = Math.sin(nextAng) * 18.9;
    const sz = Math.cos(nextAng) * 18.9;
    const sconceArm = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.18, 0.18, 0.7)),
      mats.antiqueGold,
    );
    sconceArm.position.set(sx, 4.2, sz);
    sconceArm.rotation.y = nextAng;
    const sconceCrystal = new THREE.Mesh(
      trackGeo(new THREE.OctahedronGeometry(0.26, 0)),
      i % 2 === 0 ? amberGlowMat : mats.crystalTurquoise,
    );
    sconceCrystal.position.set(Math.sin(nextAng) * 18.5, 4.55, Math.cos(nextAng) * 18.5);
    group.add(sconceArm, sconceCrystal);

    // Swaying Royal Silk Banners suspended from Mezzanine Ring
    const bx = Math.sin(ang) * 16.4;
    const bz = Math.cos(ang) * 16.4;
    if (i !== 0) {
      // Keep arrival portal front clean
      const bannerGeo = trackGeo(new THREE.PlaneGeometry(1.15, 3.3, 2, 6));
      bannerGeo.translate(0, -1.65, 0);
      const banner = new THREE.Mesh(
        bannerGeo,
        i % 2 === 0 ? mats.lavenderVelvet : mats.royalBlueBrocade,
      );
      banner.position.set(bx, 6.45, bz);
      banner.rotation.y = ang + Math.PI;
      group.add(banner);
      swayingBanners.push({ mesh: banner, phase: i * 0.7 });
    }
  }

  animatedUpdates.push((elapsed) => {
    swayingBanners.forEach((sb) => {
      sb.mesh.rotation.x = Math.sin(elapsed * 1.45 + sb.phase) * 0.045;
    });
  });

  // Upper Mezzanine Balcony Walkway & Golden Balustrade (y = 6.8)
  const mezzFloor = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(16.2, 21.4, 36)),
    mats.warmIvoryMarble,
  );
  mezzFloor.rotation.x = -Math.PI / 2;
  mezzFloor.position.y = 6.8;
  group.add(mezzFloor);

  const mezzEdgeRail = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(16.3, 0.14, 10, 48)),
    mats.antiqueGold,
  );
  mezzEdgeRail.rotation.x = Math.PI / 2;
  mezzEdgeRail.position.y = 7.95;
  group.add(mezzEdgeRail);

  const mezzSlabBorder = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(16.25, 0.18, 10, 48)),
    mats.champagneGold,
  );
  mezzSlabBorder.rotation.x = Math.PI / 2;
  mezzSlabBorder.position.y = 6.8;
  group.add(mezzSlabBorder);

  // Balustrade Spindles via InstancedMesh
  const spindleCount = 48;
  const spindleInst = new THREE.InstancedMesh(
    trackGeo(new THREE.CylinderGeometry(0.08, 0.1, 1.15, 8)),
    mats.pearlIvory,
    spindleCount,
  );
  const spDummy = new THREE.Object3D();
  for (let i = 0; i < spindleCount; i++) {
    const a = (i / spindleCount) * Math.PI * 2;
    spDummy.position.set(Math.sin(a) * 16.3, 7.38, Math.cos(a) * 16.3);
    spDummy.updateMatrix();
    spindleInst.setMatrixAt(i, spDummy.matrix);
  }
  spindleInst.computeBoundingSphere();
  group.add(spindleInst);

  // Grand Vaulted Ceiling Dome & 12 Sweeping Golden Rib Arches
  const vaultDome = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(22.2, 36, 18, 0, Math.PI * 2, 0, Math.PI * 0.44)),
    vaultDomeMat,
  );
  vaultDome.scale.set(1, 0.48, 1);
  vaultDome.position.y = 13.8;
  group.add(vaultDome);

  for (let r = 0; r < 12; r++) {
    const a = (r / 12) * Math.PI * 2;
    const ribArch = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(19.8, 0.24, 8, 28, Math.PI * 0.44)),
      mats.champagneGold,
    );
    ribArch.scale.set(1, 0.48, 1);
    ribArch.position.y = 14.0;
    ribArch.rotation.y = a;
    group.add(ribArch);
  }

  const centralOculus = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(3.6, 0.26, 12, 36)),
    mats.antiqueGold,
  );
  centralOculus.rotation.x = Math.PI / 2;
  centralOculus.position.y = 22.8;
  group.add(centralOculus);

  // --------------------------------------------------------------------------
  // 4. GRAND TWIN SPIRAL STAIRCASES CONNECTING GROUND TO MEZZANINE
  // --------------------------------------------------------------------------
  [-1, 1].forEach((side) => {
    const stairRoot = new THREE.Group();
    stairRoot.position.set(side * 13.5, 0, -10.0);

    const centralColumn = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.45, 0.58, 7.2, 12)),
      mats.antiqueGold,
    );
    centralColumn.position.y = 3.6;
    stairRoot.add(centralColumn);

    const stepsCount = 18;
    const stairRadius = 2.4;
    for (let st = 0; st < stepsCount; st++) {
      const frac = st / stepsCount;
      const sAngle = side * (frac * Math.PI * 1.45 + 0.4);
      const sy = 0.2 + frac * 6.5;

      const step = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(1.9, 0.2, 0.72)),
        mats.warmIvoryMarble,
      );
      step.position.set(Math.cos(sAngle) * (stairRadius * 0.62), sy, Math.sin(sAngle) * (stairRadius * 0.62));
      step.rotation.y = -sAngle;
      stairRoot.add(step);

      const post = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 6)),
        mats.champagneGold,
      );
      post.position.set(Math.cos(sAngle) * stairRadius, sy + 0.5, Math.sin(sAngle) * stairRadius);
      stairRoot.add(post);

      if (st % 4 === 0) {
        const orb = new THREE.Mesh(
          trackGeo(new THREE.SphereGeometry(0.1, 8, 8)),
          amberGlowMat,
        );
        orb.position.set(Math.cos(sAngle) * stairRadius, sy + 1.0, Math.sin(sAngle) * stairRadius);
        stairRoot.add(orb);
      }
    }

    group.add(stairRoot);
    circleColliders.push({ x: side * 13.5, z: -10.0, radius: 2.5 });
  });

  // --------------------------------------------------------------------------
  // 5. COLOSSAL CARVED BOOKSHELVES, LADDERS & THOUSANDS OF INSTANCED BOOKS
  // --------------------------------------------------------------------------
  const bookRecords: Array<{
    x: number;
    y: number;
    z: number;
    ry: number;
    sx: number;
    sy: number;
    sz: number;
    colorHex: number;
    glow?: boolean;
  }> = [];

  const bookPalette = [
    0x27407a, // Deep sapphire
    0x7e57c2, // Royal lavender
    0xdcb854, // Champagne gold
    0xa24d67, // Dusty rose crimson
    0x3b7a62, // Emerald
    0x489eb0, // Turquoise
    0x5d4777, // Soft violet
    0xe6d7bf, // Pearl ivory vellum
  ];

  const addGrandShelfUnit = (
    cx: number,
    cy: number,
    cz: number,
    rotY: number,
    width: number,
    height: number,
    depth: number,
    tiers: number,
    booksPerTier: number,
    withCollider: boolean,
    withLadder: boolean,
  ) => {
    const unit = new THREE.Group();
    unit.position.set(cx, cy, cz);
    unit.rotation.y = rotY;

    const frame = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(width, height, depth)),
      mats.darkWalnut,
    );
    frame.position.y = height * 0.5;
    frame.castShadow = !isSoftwareGl;
    frame.receiveShadow = true;
    unit.add(frame);

    const crown = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(width + 0.35, 0.38, depth + 0.28)),
      mats.antiqueGold,
    );
    crown.position.y = height + 0.16;
    unit.add(crown);

    const basePlinth = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(width + 0.25, 0.32, depth + 0.22)),
      mats.champagneGold,
    );
    basePlinth.position.y = 0.16;
    unit.add(basePlinth);

    // Side golden pilasters
    [-width * 0.48, width * 0.48].forEach((px) => {
      const pil = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.18, height, depth + 0.08)),
        mats.champagneGold,
      );
      pil.position.set(px, height * 0.5, 0);
      unit.add(pil);
    });

    if (withLadder) {
      const ladder = new THREE.Group();
      ladder.position.set(width * 0.26, 0, depth * 0.5 + 0.42);
      ladder.rotation.x = -0.14;
      [-0.24, 0.24].forEach((lx) => {
        const rail = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.035, 0.035, height * 0.92, 6)),
          mats.antiqueGold,
        );
        rail.position.set(lx, height * 0.46, 0);
        ladder.add(rail);
      });
      for (let r = 0; r < 9; r++) {
        const rung = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.025, 0.025, 0.48, 6)),
          mats.woodOak,
        );
        rung.rotation.z = Math.PI / 2;
        rung.position.y = 0.55 + r * (height * 0.095);
        ladder.add(rung);
      }
      unit.add(ladder);
    }

    group.add(unit);

    if (withCollider) {
      const cosA = Math.abs(Math.cos(rotY));
      const sinA = Math.abs(Math.sin(rotY));
      const halfX = (width * cosA + depth * sinA) * 0.5 + 0.25;
      const halfZ = (width * sinA + depth * cosA) * 0.5 + 0.25;
      boxColliders.push({
        minX: cx - halfX,
        maxX: cx + halfX,
        minZ: cz - halfZ,
        maxZ: cz + halfZ,
      });
    }

    // Record Books on Both Front (+Z) and Back (-Z) or Front Face
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const tierGap = (height - 0.8) / tiers;
    for (let t = 0; t < tiers; t++) {
      const localY = cy + 0.58 + t * tierGap;
      for (let b = 0; b < booksPerTier; b++) {
        const localX = -width * 0.43 + (b / (booksPerTier - 1)) * (width * 0.86);
        const localZ = depth * 0.44;
        const wx = cx + localX * cosY + localZ * sinY;
        const wz = cz - localX * sinY + localZ * cosY;
        const seed = (t * 31 + b * 17 + Math.round(cx * 3 + cz * 5)) & 0xff;
        bookRecords.push({
          x: wx,
          y: localY,
          z: wz,
          ry: rotY,
          sx: 0.85 + (seed % 5) * 0.1,
          sy: 0.82 + ((seed >> 2) % 6) * 0.08,
          sz: 0.9 + ((seed >> 4) % 4) * 0.08,
          colorHex: bookPalette[seed % bookPalette.length],
          glow: seed % 29 === 0,
        });
      }
    }
  };

  // Perimeter Wall Bookshelves (Ground Level & Upper Mezzanine Level across 6 Solid Bays!)
  for (let i = 0; i < numSides; i++) {
    if (i % 2 === 0 && i !== 0) {
      const ang = (i / numSides) * Math.PI * 2;
      const rPos = 20.1;
      const wx = Math.sin(ang) * rPos;
      const wz = Math.cos(ang) * rPos;
      // Lower 2-tier grand shelf
      addGrandShelfUnit(wx, 0, wz, ang + Math.PI, 8.6, 6.2, 1.1, 4, 24, false, i === 2 || i === 10);
      // Upper mezzanine colossal shelf reaching toward vaulted ceiling!
      addGrandShelfUnit(wx, 6.85, wz, ang + Math.PI, 8.6, 6.8, 1.1, 5, 24, false, false);
    }
  }

  // 6 Freestanding Royal Archive Bookshelf Towers on Ground Floor (clear walkways!)
  const freestandingShelves: Array<[number, number, number, boolean]> = [
    [-11.8, 2.2, Math.PI * 0.5, true],
    [-11.8, -4.4, Math.PI * 0.5, false],
    [11.8, 2.2, -Math.PI * 0.5, true],
    [11.8, -4.4, -Math.PI * 0.5, false],
    [-7.8, -12.6, Math.PI * 0.18, false],
    [7.8, -12.6, -Math.PI * 0.18, false],
  ];
  freestandingShelves.forEach(([sx, sz, sRot, hasLad]) => {
    addGrandShelfUnit(sx, 0, sz, sRot, 4.8, 6.2, 1.15, 4, 18, true, hasLad);
  });

  // Render all 1,800+ books in ONE InstancedMesh draw call!
  const bookInstMesh = new THREE.InstancedMesh(
    trackGeo(new THREE.BoxGeometry(0.18, 0.58, 0.34)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.08 })),
    bookRecords.length,
  );
  const bDummy = new THREE.Object3D();
  const bCol = new THREE.Color();
  bookRecords.forEach((br, idx) => {
    bDummy.position.set(br.x, br.y, br.z);
    bDummy.rotation.set(0, br.ry, 0);
    bDummy.scale.set(br.sx, br.sy, br.sz);
    bDummy.updateMatrix();
    bookInstMesh.setMatrixAt(idx, bDummy.matrix);
    bCol.setHex(br.colorHex);
    bookInstMesh.setColorAt(idx, bCol);
  });
  bookInstMesh.computeBoundingSphere();
  group.add(bookInstMesh);

  // Selected Glowing Magical Books embedded along shelves
  const glowingShelfBooks = bookRecords.filter((b) => b.glow).slice(0, 22);
  const glowBookMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x9cf0f8,
      emissive: 0x4cc9d6,
      emissiveIntensity: 1.1,
      roughness: 0.22,
    }),
  );
  const glowBookInst = new THREE.InstancedMesh(
    trackGeo(new THREE.BoxGeometry(0.22, 0.64, 0.38)),
    glowBookMat,
    Math.max(1, glowingShelfBooks.length),
  );
  glowingShelfBooks.forEach((gb, idx) => {
    bDummy.position.set(gb.x, gb.y, gb.z + 0.04);
    bDummy.rotation.set(0, gb.ry, 0);
    bDummy.scale.set(1.05, 1.05, 1.05);
    bDummy.updateMatrix();
    glowBookInst.setMatrixAt(idx, bDummy.matrix);
  });
  glowBookInst.computeBoundingSphere();
  group.add(glowBookInst);

  // --------------------------------------------------------------------------
  // 6. MAGNIFICENT CENTRAL ROTATING ROYAL CRYSTAL CHANDELIER
  // --------------------------------------------------------------------------
  const chandelierGroup = new THREE.Group();
  chandelierGroup.position.set(0, 14.5, -1.2);
  group.add(chandelierGroup);

  const chainShaft = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.08, 0.12, 8.4, 8)),
    mats.antiqueGold,
  );
  chainShaft.position.y = 4.2;
  chandelierGroup.add(chainShaft);

  const coreGem = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.75, 0)),
    mats.crystalTurquoise,
  );
  coreGem.scale.set(0.85, 1.5, 0.85);
  coreGem.position.y = -0.8;
  chandelierGroup.add(coreGem);

  const tierRadii = [3.4, 2.2, 1.05];
  const tierHeights = [0.2, 1.35, 2.35];
  tierRadii.forEach((tr, ti) => {
    const ring = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(tr, 0.08, 10, 36)),
      mats.champagneGold,
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = tierHeights[ti];
    chandelierGroup.add(ring);

    const arms = 12 - ti * 3;
    for (let a = 0; a < arms; a++) {
      const ang = (a / arms) * Math.PI * 2;
      const cx = Math.cos(ang) * tr;
      const cz = Math.sin(ang) * tr;

      const candleStick = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.05, 0.07, 0.35, 6)),
        mats.pearlIvory,
      );
      candleStick.position.set(cx, tierHeights[ti] + 0.22, cz);
      const flame = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.11, 8, 8)),
        amberGlowMat,
      );
      flame.position.set(cx, tierHeights[ti] + 0.45, cz);
      const crystalDrop = new THREE.Mesh(
        trackGeo(new THREE.OctahedronGeometry(0.18, 0)),
        a % 2 === 0 ? mats.chandelierCrystal : amethystCrystalMat,
      );
      crystalDrop.scale.set(0.7, 1.65, 0.7);
      crystalDrop.position.set(cx, tierHeights[ti] - 0.32, cz);
      chandelierGroup.add(candleStick, flame, crystalDrop);
    }
  });

  const chandelierLight = new THREE.PointLight(0xffdca0, 14, 34, 1.25);
  chandelierLight.position.set(0, 12.8, -1.2);
  group.add(chandelierLight);

  animatedUpdates.push((elapsed, dt) => {
    chandelierGroup.rotation.y += dt * 0.095;
    chandelierLight.intensity = 13.5 + Math.sin(elapsed * 2.1) * 1.1;
  });

  // --------------------------------------------------------------------------
  // 7. ORNAMENTAL FOUNTAIN OF WISDOM & GOLDEN SCHOLAR STATUES
  // --------------------------------------------------------------------------
  const fountainGroup = new THREE.Group();
  fountainGroup.position.set(0, 0, -13.6);
  const fBase = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(2.4, 2.75, 0.65, 24)),
    mats.warmIvoryMarble,
  );
  fBase.position.y = 0.32;
  const fWater = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(2.15, 24)),
    mats.waterStream,
  );
  fWater.rotation.x = -Math.PI / 2;
  fWater.position.y = 0.66;
  const fStem = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.28, 0.45, 1.85, 12)),
    mats.champagneGold,
  );
  fStem.position.y = 1.25;
  const fBowl = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.15, 0.42, 0.35, 18)),
    mats.pearlIvory,
  );
  fBowl.position.y = 2.05;
  const fCrownOrb = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.45, 0)),
    mats.crystalTurquoise,
  );
  fCrownOrb.position.y = 2.85;
  fountainGroup.add(fBase, fWater, fStem, fBowl, fCrownOrb);
  group.add(fountainGroup);
  circleColliders.push({ x: 0, z: -13.6, radius: 2.7 });

  const fountainDrops: THREE.Mesh[] = [];
  for (let d = 0; d < 8; d++) {
    const drop = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.08, 6, 6)),
      mats.waterStream,
    );
    fountainGroup.add(drop);
    fountainDrops.push(drop);
  }
  animatedUpdates.push((elapsed) => {
    fCrownOrb.rotation.y = elapsed * 0.8;
    fCrownOrb.position.y = 2.85 + Math.sin(elapsed * 2.1) * 0.12;
    fountainDrops.forEach((dr, idx) => {
      const ang = (idx / fountainDrops.length) * Math.PI * 2;
      const cyc = (elapsed * 1.4 + idx * 0.25) % 1;
      const rad = 0.3 + cyc * 1.35;
      dr.position.set(
        Math.cos(ang) * rad,
        2.35 + Math.sin(cyc * Math.PI) * 0.9 - cyc * 1.7,
        Math.sin(ang) * rad,
      );
    });
  });

  // 4 Decorative Golden Scholar / Astrolabe Statues on Pedestals
  [
    [-7.2, 7.6],
    [7.2, 7.6],
    [-7.2, -7.8],
    [7.2, -7.8],
  ].forEach(([sx, sz], idx) => {
    const st = new THREE.Group();
    st.position.set(sx, 0, sz);

    const plinth = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.65, 0.78, 1.5, 10)),
      mats.warmIvoryMarble,
    );
    plinth.position.y = 0.75;
    const goldCap = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.74, 0.65, 0.22, 10)),
      mats.antiqueGold,
    );
    goldCap.position.y = 1.58;
    const astroRing1 = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.48, 0.05, 8, 24)),
      mats.champagneGold,
    );
    astroRing1.position.y = 2.3;
    const astroRing2 = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.36, 0.04, 8, 24)),
      mats.antiqueGold,
    );
    astroRing2.position.y = 2.3;
    astroRing2.rotation.x = Math.PI / 3;
    const astroGem = new THREE.Mesh(
      trackGeo(new THREE.OctahedronGeometry(0.18, 0)),
      idx % 2 === 0 ? mats.crystalTurquoise : amethystCrystalMat,
    );
    astroGem.position.y = 2.3;

    st.add(plinth, goldCap, astroRing1, astroRing2, astroGem);
    group.add(st);
    circleColliders.push({ x: sx, z: sz, radius: 0.9 });
    animatedUpdates.push((elapsed) => {
      astroRing1.rotation.y = elapsed * 0.55 + idx;
      astroRing2.rotation.z = -elapsed * 0.75;
      astroGem.rotation.y = elapsed * 1.4;
    });
  });

  // --------------------------------------------------------------------------
  // 8. VOLUMETRIC STAINED-GLASS LIGHT RAYS, FLOATING CRYSTALS & DUST
  // --------------------------------------------------------------------------
  const rayMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: lightRayTex,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
  );
  const rayGeo = trackGeo(new THREE.CylinderGeometry(1.1, 3.6, 17, 12, 1, true));
  const lightBeams: Array<{ mesh: THREE.Mesh; phase: number }> = [];
  [
    { x: -12.5, y: 8.5, z: -7.5, rz: -0.45, rx: 0.22 },
    { x: 12.5, y: 8.5, z: -7.5, rz: 0.45, rx: 0.22 },
    { x: -12.5, y: 8.5, z: 7.5, rz: -0.42, rx: -0.22 },
    { x: 12.5, y: 8.5, z: 7.5, rz: 0.42, rx: -0.22 },
  ].forEach((lb, idx) => {
    const beam = new THREE.Mesh(rayGeo, rayMat);
    beam.position.set(lb.x, lb.y, lb.z);
    beam.rotation.set(lb.rx, 0, lb.rz);
    group.add(beam);
    lightBeams.push({ mesh: beam, phase: idx * 1.4 });
  });
  animatedUpdates.push((elapsed) => {
    lightBeams.forEach((b) => {
      b.mesh.rotation.y = Math.sin(elapsed * 0.28 + b.phase) * 0.14;
    });
  });

  // Floating Magical Crystals circling upper hall
  const floatingCrystals: Array<{ mesh: THREE.Mesh; basePos: [number, number, number]; phase: number }> = [];
  for (let c = 0; c < 10; c++) {
    const ang = (c / 10) * Math.PI * 2;
    const rad = 13.8;
    const cx = Math.cos(ang) * rad;
    const cy = 4.6 + (c % 3) * 1.3;
    const cz = Math.sin(ang) * rad;
    const cMesh = new THREE.Mesh(
      trackGeo(new THREE.OctahedronGeometry(0.38, 0)),
      c % 3 === 0 ? mats.crystalTurquoise : c % 3 === 1 ? amethystCrystalMat : amberGlowMat,
    );
    cMesh.scale.set(0.65, 1.75, 0.65);
    cMesh.position.set(cx, cy, cz);
    group.add(cMesh);
    floatingCrystals.push({ mesh: cMesh, basePos: [cx, cy, cz], phase: c * 0.8 });
  }
  animatedUpdates.push((elapsed) => {
    floatingCrystals.forEach((fc) => {
      fc.mesh.rotation.y = elapsed * 0.65 + fc.phase;
      fc.mesh.position.y = fc.basePos[1] + Math.sin(elapsed * 1.4 + fc.phase) * 0.35;
    });
  });

  // Floating Magical Dust Motes throughout Hall
  const dustCount = isSoftwareGl ? 80 : 210;
  const dustPos = new Float32Array(dustCount * 3);
  const dustBase = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * 17.5;
    dustPos[i * 3] = dustBase[i * 3] = Math.cos(a) * r;
    dustPos[i * 3 + 1] = dustBase[i * 3 + 1] = 0.6 + Math.random() * 14.0;
    dustPos[i * 3 + 2] = dustBase[i * 3 + 2] = Math.sin(a) * r;
  }
  const dustGeo = trackGeo(new THREE.BufferGeometry());
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = trackMat(
    new THREE.PointsMaterial({
      map: glowSprite,
      color: 0xffe49c,
      size: 0.28,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const dustPts = new THREE.Points(dustGeo, dustMat);
  group.add(dustPts);
  animatedUpdates.push((elapsed) => {
    const attr = dustGeo.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < dustCount; i++) {
      const ix = i * 3;
      arr[ix] = dustBase[ix] + Math.sin(elapsed * 0.5 + i) * 0.35;
      arr[ix + 1] = ((dustBase[ix + 1] + elapsed * 0.35 + (i % 5) * 0.2) % 14.2) + 0.4;
      arr[ix + 2] = dustBase[ix + 2] + Math.cos(elapsed * 0.4 + i) * 0.35;
    }
    attr.needsUpdate = true;
  });

  // --------------------------------------------------------------------------
  // 9. FLOATING WINGED BOOKS (AnimationMixer + Page Motion + Golden Sparkles)
  // --------------------------------------------------------------------------
  const buildAnimatedBook = (
    namePrefix: string,
    coverMat: THREE.Material,
    scale: number,
    phaseOffset: number,
    loopSec = 3.6,
  ) => {
    const bookRoot = new THREE.Group();
    bookRoot.scale.setScalar(scale);

    const spine = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.1, 0.08, 0.64)), mats.antiqueGold);
    bookRoot.add(spine);

    const leftWing = new THREE.Group();
    leftWing.name = `${namePrefix}_L`;
    const lCov = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.46, 0.04, 0.62)), coverMat);
    lCov.position.x = -0.24;
    const lPg = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.42, 0.035, 0.56)), parchmentMat);
    lPg.position.set(-0.22, 0.035, 0);
    leftWing.add(lCov, lPg);

    const rightWing = new THREE.Group();
    rightWing.name = `${namePrefix}_R`;
    const rCov = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.46, 0.04, 0.62)), coverMat);
    rCov.position.x = 0.24;
    const rPg = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.42, 0.035, 0.56)), parchmentMat);
    rPg.position.set(0.22, 0.035, 0);
    rightWing.add(rCov, rPg);

    bookRoot.add(leftWing, rightWing);

    const mixer = new THREE.AnimationMixer(bookRoot);
    const lOpen = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.3));
    const lClose = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.95));
    const rOpen = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.3));
    const rClose = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.95));
    const clip = new THREE.AnimationClip(`${namePrefix}_Clip`, loopSec, [
      new THREE.QuaternionKeyframeTrack(
        `${namePrefix}_L.quaternion`,
        [0, loopSec * 0.5, loopSec],
        [lOpen.x, lOpen.y, lOpen.z, lOpen.w, lClose.x, lClose.y, lClose.z, lClose.w, lOpen.x, lOpen.y, lOpen.z, lOpen.w],
      ),
      new THREE.QuaternionKeyframeTrack(
        `${namePrefix}_R.quaternion`,
        [0, loopSec * 0.5, loopSec],
        [rOpen.x, rOpen.y, rOpen.z, rOpen.w, rClose.x, rClose.y, rClose.z, rClose.w, rOpen.x, rOpen.y, rOpen.z, rOpen.w],
      ),
    ]);
    const act = mixer.clipAction(clip);
    act.time = phaseOffset;
    act.play();
    mixers.push(mixer);

    return { bookRoot, leftWing, rightWing };
  };

  const soaringBooks: Array<{ root: THREE.Group; radius: number; height: number; speed: number; phase: number }> = [];
  for (let i = 0; i < 14; i++) {
    const cMat = i % 3 === 0 ? mats.royalBlueBrocade : i % 3 === 1 ? mats.lavenderVelvet : mats.dustyRoseVelvet;
    const { bookRoot } = buildAnimatedBook(`SoarBook_${i}`, cMat, 0.78 + (i % 3) * 0.14, i * 0.45, 3.2);
    group.add(bookRoot);
    soaringBooks.push({
      root: bookRoot,
      radius: 6.8 + (i % 4) * 2.2,
      height: 5.2 + (i % 3) * 1.9,
      speed: 0.24 + (i % 3) * 0.06,
      phase: (i / 14) * Math.PI * 2,
    });
  }

  animatedUpdates.push((elapsed, dt) => {
    for (const m of mixers) m.update(dt);
    soaringBooks.forEach((sb, idx) => {
      const a = elapsed * sb.speed + sb.phase;
      sb.root.position.set(
        Math.cos(a) * sb.radius,
        sb.height + Math.sin(elapsed * 1.5 + idx) * 0.48,
        Math.sin(a) * sb.radius,
      );
      sb.root.rotation.set(0.22, -a, Math.sin(elapsed * 1.2 + idx) * 0.12);
    });
  });

  // Ambient Proximity-Reactive Floating Tomes along Walkways (Requirement 4C)
  const reactiveTomes: Array<{
    pos: THREE.Vector3;
    bookGroup: THREE.Group;
    leftWing: THREE.Group;
    rightWing: THREE.Group;
    haloRing: THREE.Mesh;
    indicatorStar: THREE.Mesh;
    openBlend: number;
  }> = [];
  [
    new THREE.Vector3(-6.4, 1.9, 4.8),
    new THREE.Vector3(6.4, 1.9, 4.8),
    new THREE.Vector3(0, 2.25, 4.0),
  ].forEach((pos, idx) => {
    const holder = new THREE.Group();
    holder.position.copy(pos);

    const book = new THREE.Group();
    const sp = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.1, 0.08, 0.65)), mats.antiqueGold);
    book.add(sp);
    const lw = new THREE.Group();
    const lc = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.46, 0.04, 0.64)), mats.lavenderVelvet);
    lc.position.x = -0.24;
    const lp = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.42, 0.035, 0.58)), parchmentMat);
    lp.position.set(-0.22, 0.035, 0);
    lw.add(lc, lp);

    const rw = new THREE.Group();
    const rc = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.46, 0.04, 0.64)), mats.lavenderVelvet);
    rc.position.x = 0.24;
    const rp = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.42, 0.035, 0.58)), parchmentMat);
    rp.position.set(0.22, 0.035, 0);
    rw.add(rc, rp);
    book.add(lw, rw);
    book.rotation.x = 0.35;

    const haloRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.75, 0.035, 8, 28)),
      amberGlowMat,
    );
    haloRing.rotation.x = Math.PI / 2;
    haloRing.position.y = -0.35;

    const indicatorStar = new THREE.Mesh(
      trackGeo(new THREE.OctahedronGeometry(0.15, 0)),
      mats.crystalTurquoise,
    );
    indicatorStar.position.y = 0.65;
    indicatorStar.visible = false;

    holder.add(book, haloRing, indicatorStar);
    group.add(holder);

    reactiveTomes.push({
      pos,
      bookGroup: book,
      leftWing: lw,
      rightWing: rw,
      haloRing,
      indicatorStar,
      openBlend: 0,
    });
    animatedUpdates.push((elapsed, dt, playerPos) => {
      const rt = reactiveTomes[idx];
      const near = playerPos ? Math.hypot(playerPos.x - rt.pos.x, playerPos.z - rt.pos.z) < 3.8 : false;
      rt.openBlend = THREE.MathUtils.lerp(rt.openBlend, near ? 1 : 0, 1 - Math.exp(-6 * dt));
      const openAngle = THREE.MathUtils.lerp(1.05, 0.24, rt.openBlend);
      rt.leftWing.rotation.z = -openAngle;
      rt.rightWing.rotation.z = openAngle;
      rt.bookGroup.position.y = Math.sin(elapsed * 2.1 + idx) * (0.12 + rt.openBlend * 0.08);
      rt.bookGroup.rotation.y += dt * (0.45 + rt.openBlend * 0.9);
      rt.haloRing.scale.setScalar(0.85 + rt.openBlend * 0.4);
      rt.indicatorStar.visible = rt.openBlend > 0.25;
      rt.indicatorStar.rotation.y = elapsed * 2.6;
      rt.indicatorStar.position.y = 0.65 + Math.sin(elapsed * 3.5) * 0.1;
    });
  });

  // --------------------------------------------------------------------------
  // 10. STATION 1 (PRESERVED): STESEN PENDENGARAN AJAIB (-4.5, 0, -2.5)
  //     Interactive Ancient Book that glows, opens & spawns golden particles on approach!
  // --------------------------------------------------------------------------
  const audioStation = new THREE.Group();
  audioStation.position.set(-4.5, 0, -2.5);

  const audioPedestal = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.15, 1.38, 1.05, 24)),
    mats.warmIvoryMarble,
  );
  audioPedestal.position.y = 0.525;
  const audioTrim = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(1.18, 0.07, 8, 28)),
    mats.antiqueGold,
  );
  audioTrim.rotation.x = Math.PI / 2;
  audioTrim.position.y = 1.05;
  const audioOrb = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.32, 0)),
    mats.crystalTurquoise,
  );
  audioOrb.position.y = 1.48;

  // Interactive Ancient Grimoire hovering above Pedestal
  const ancientBook = new THREE.Group();
  ancientBook.position.y = 2.05;
  ancientBook.rotation.x = 0.42;
  const abSpine = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.12, 0.09, 0.72)), mats.antiqueGold);
  const abLeft = new THREE.Group();
  const abLeftCov = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.52, 0.045, 0.7)), mats.royalBlueBrocade);
  abLeftCov.position.x = -0.26;
  const abLeftPg = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.46, 0.04, 0.62)), parchmentMat);
  abLeftPg.position.set(-0.24, 0.04, 0);
  abLeft.add(abLeftCov, abLeftPg);

  const abRight = new THREE.Group();
  const abRightCov = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.52, 0.045, 0.7)), mats.royalBlueBrocade);
  abRightCov.position.x = 0.26;
  const abRightPg = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.46, 0.04, 0.62)), parchmentMat);
  abRightPg.position.set(0.24, 0.04, 0);
  abRight.add(abRightCov, abRightPg);
  ancientBook.add(abSpine, abLeft, abRight);

  const audioRuneRing = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(2.8, 2.8)), runeHaloMat);
  audioRuneRing.rotation.x = -Math.PI / 2;
  audioRuneRing.position.y = 0.04;

  // Golden particles emerging from the Ancient Book
  const abParticlesCount = isSoftwareGl ? 14 : 26;
  const abPPos = new Float32Array(abParticlesCount * 3);
  for (let i = 0; i < abParticlesCount; i++) {
    const a = (i / abParticlesCount) * Math.PI * 2;
    abPPos[i * 3] = Math.cos(a) * 0.7;
    abPPos[i * 3 + 1] = 1.6 + (i % 5) * 0.35;
    abPPos[i * 3 + 2] = Math.sin(a) * 0.7;
  }
  const abPGeo = trackGeo(new THREE.BufferGeometry());
  abPGeo.setAttribute('position', new THREE.BufferAttribute(abPPos, 3));
  const abPMat = trackMat(
    new THREE.PointsMaterial({
      map: glowSprite,
      color: 0xffdf7a,
      size: 0.26,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const abParticles = new THREE.Points(abPGeo, abPMat);

  audioStation.add(audioPedestal, audioTrim, audioOrb, ancientBook, audioRuneRing, abParticles);
  group.add(audioStation);
  circleColliders.push({ x: -4.5, z: -2.5, radius: 1.3 });

  let abOpenBlend = 0;
  animatedUpdates.push((elapsed, dt, playerPos) => {
    const nearAudio = playerPos ? Math.hypot(playerPos.x + 4.5, playerPos.z + 2.5) < 3.6 : false;
    abOpenBlend = THREE.MathUtils.lerp(abOpenBlend, nearAudio ? 1 : 0, 1 - Math.exp(-5.5 * dt));

    const hinge = THREE.MathUtils.lerp(1.08, 0.24, abOpenBlend);
    abLeft.rotation.z = -hinge;
    abRight.rotation.z = hinge;

    ancientBook.position.y = 2.05 + Math.sin(elapsed * 2.2) * (0.08 + abOpenBlend * 0.08);
    ancientBook.rotation.y = Math.sin(elapsed * 0.9) * 0.22;
    audioOrb.rotation.y = elapsed * (1.1 + abOpenBlend * 1.4);
    audioRuneRing.rotation.z = elapsed * (0.4 + abOpenBlend * 1.1);
    audioRuneRing.scale.setScalar(1 + abOpenBlend * 0.22);

    abPMat.opacity = 0.45 + abOpenBlend * 0.5;
    abPMat.size = 0.22 + abOpenBlend * 0.16;
    const attr = abPGeo.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < abParticlesCount; i++) {
      const ix = i * 3;
      const a = (i / abParticlesCount) * Math.PI * 2 + elapsed * (0.6 + abOpenBlend * 1.2);
      const rad = 0.55 + Math.sin(elapsed * 2 + i) * 0.25;
      arr[ix] = Math.cos(a) * rad;
      arr[ix + 1] = 1.65 + ((elapsed * (0.7 + abOpenBlend) + i * 0.22) % 1.8);
      arr[ix + 2] = Math.sin(a) * rad;
    }
    attr.needsUpdate = true;
  });

  interactables.push({
    id: 'lib-audio',
    label: 'Tekan E untuk Stesen Pendengaran Ajaib',
    sublabel: 'Dengar kisah digital "Misi Menyelamatkan Taman Sekolah"',
    position: new THREE.Vector3(-4.5, 1, -2.5),
    radius: 3.3,
    action: { type: 'library_audio' },
    visualRef: ancientBook,
  });

  // --------------------------------------------------------------------------
  // 11. STATION 2 (PRESERVED): MEJA MANUSKRIP PURBA (4.5, 0, -2.5)
  //     Royal Archive Table with Rotating Rune Seal & Illuminated Manuscript
  // --------------------------------------------------------------------------
  const msGroup = new THREE.Group();
  msGroup.position.set(4.5, 0, -2.5);

  const msTableBase = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.6, 1.02, 1.6)),
    mats.darkWalnut,
  );
  msTableBase.position.y = 0.51;
  const msTableTrim = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.74, 0.12, 1.74)),
    mats.antiqueGold,
  );
  msTableTrim.position.y = 1.02;
  const msScroll = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.38, 0.08, 0.94)),
    parchmentMat,
  );
  msScroll.position.y = 1.12;

  const msRuneRing = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(3.0, 3.0)), runeHaloMat);
  msRuneRing.rotation.x = -Math.PI / 2;
  msRuneRing.position.y = 0.04;

  const msHaloTorus = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.95, 0.04, 8, 32)),
    mats.champagneGold,
  );
  msHaloTorus.position.y = 2.15;
  msHaloTorus.rotation.x = Math.PI * 0.35;

  const msGem = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.28, 0)),
    amberGlowMat,
  );
  msGem.position.y = 2.15;

  msGroup.add(msTableBase, msTableTrim, msScroll, msRuneRing, msHaloTorus, msGem);
  group.add(msGroup);
  circleColliders.push({ x: 4.5, z: -2.5, radius: 1.45 });

  let msNearBlend = 0;
  animatedUpdates.push((elapsed, dt, playerPos) => {
    const nearMs = playerPos ? Math.hypot(playerPos.x - 4.5, playerPos.z + 2.5) < 3.6 : false;
    msNearBlend = THREE.MathUtils.lerp(msNearBlend, nearMs ? 1 : 0, 1 - Math.exp(-5.5 * dt));
    msRuneRing.rotation.z = -elapsed * (0.45 + msNearBlend * 1.2);
    msRuneRing.scale.setScalar(1 + msNearBlend * 0.25);
    msHaloTorus.rotation.z = elapsed * (0.85 + msNearBlend * 1.6);
    msHaloTorus.scale.setScalar(0.9 + msNearBlend * 0.25);
    msGem.rotation.y = elapsed * (1.5 + msNearBlend * 1.5);
    msGem.position.y = 2.15 + Math.sin(elapsed * 2.4) * 0.14;
  });

  interactables.push({
    id: 'lib-manuscript',
    label: 'Tekan E untuk Memeriksa Manuskrip Purba',
    sublabel: 'Lengkapkan cabaran kefahaman unsur cerita',
    position: new THREE.Vector3(4.5, 1, -2.5),
    radius: 3.3,
    action: { type: 'library_manuscript' },
    visualRef: msGem,
  });

  // --------------------------------------------------------------------------
  // 12. PUSTAKAWAN SERI NPC & RETURN PORTAL (PRESERVED)
  // --------------------------------------------------------------------------
  const librarian = createNpcCharacter(0x9b86c9, 0xdcb854, 0x2a1f36);
  librarian.group.position.set(-2.3, 0, 8.4);
  group.add(librarian.group);
  disposables.push(librarian.dispose);
  circleColliders.push({ x: -2.3, z: 8.4, radius: 0.75 });
  animatedUpdates.push((elapsed) => librarian.updateIdle(elapsed));

  const libBeacon = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.22, 0)),
    amethystCrystalMat,
  );
  libBeacon.position.set(-2.3, 2.55, 8.4);
  group.add(libBeacon);
  animatedUpdates.push((elapsed) => {
    libBeacon.rotation.y = elapsed * 1.8;
    libBeacon.position.y = 2.55 + Math.sin(elapsed * 2.4) * 0.12;
  });

  interactables.push({
    id: 'npc-librarian',
    label: 'Berbicara dengan Pustakawan Seri',
    sublabel: 'Dapatkan panduan Misi 1',
    position: new THREE.Vector3(-2.3, 1, 8.4),
    radius: 3.1,
    action: { type: 'npc', npcKey: 'librarian' },
    visualRef: libBeacon,
  });

  const retPortal = helpers.createArchitecturalPortal('citadel', 0xdcb854, true, trackGeo, trackMat, mats);
  retPortal.group.position.set(0, 0, 15.6);
  group.add(retPortal.group);
  animatedUpdates.push((elapsed) => {
    retPortal.ring.rotation.z = elapsed * 1.1;
  });
  interactables.push({
    id: 'return-citadel',
    label: 'Tekan E untuk kembali ke Balai Agung Diraja',
    sublabel: 'Kembali ke istana kerajaan',
    position: new THREE.Vector3(0, 1, 15.6),
    radius: 3.1,
    action: { type: 'portal', targetLocation: 'citadel' },
    visualRef: retPortal.ring,
  });

  return {
    group,
    skyColor: 0x222e58,
    fogColor: 0x2b3664,
    fogDensity: 0.0085,
    boundsRadius: 19.8,
    roomRect: { minX: -19.2, maxX: 19.2, minZ: -19.2, maxZ: 19.2, maxY: 20.5 },
    circleColliders,
    boxColliders,
    interactables,
    groundHeightAt: () => 0,
    update: (elapsed, dt, playerPos) => animatedUpdates.forEach((fn) => fn(elapsed, dt, playerPos)),
    dispose: () => {
      geos.forEach((g) => g.dispose());
      localMats.forEach((m) => m.dispose());
      localTex.forEach((t) => t.dispose());
      disposables.forEach((d) => d());
    },
  };
}
