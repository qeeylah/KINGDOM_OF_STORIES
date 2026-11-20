import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { type CharacterRig, createHeroCharacter } from '../game/characters';
import { createKingdomMaterials } from '../game/materials';
import type { HeroId } from '../types/game';

export type FestivalScenePhase = 'rescue_clip' | 'festival' | 'complete';

interface FestivalLightScene3DProps {
  phase: FestivalScenePhase;
  onFireworkBurst?: (intensity: number) => void;
}

function detectSoftwareWebGL(renderer: THREE.WebGLRenderer): boolean {
  try {
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) {
      const r = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '').toLowerCase();
      if (
        r.includes('swiftshader') ||
        r.includes('llvmpipe') ||
        r.includes('software') ||
        r.includes('angle (google')
      ) {
        return true;
      }
    }
  } catch {
    // Ignore context query errors
  }
  return false;
}

function createRadialGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,244,210,0.82)');
  grad.addColorStop(0.75, 'rgba(255,214,120,0.22)');
  grad.addColorStop(1, 'rgba(255,214,120,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createVerticalBeamTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 256, 0, 0);
  grad.addColorStop(0, 'rgba(255, 224, 140, 0.65)');
  grad.addColorStop(0.45, 'rgba(245, 198, 92, 0.25)');
  grad.addColorStop(1, 'rgba(245, 198, 92, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface FireworkRocket {
  active: boolean;
  stage: 'rising' | 'burst';
  origin: THREE.Vector3;
  pos: THREE.Vector3;
  velY: number;
  apexY: number;
  age: number;
  color: THREE.Color;
  rocketMesh: THREE.Mesh;
  burstPoints: THREE.Points;
  burstPositions: Float32Array;
  burstVelocities: Float32Array;
  burstMat: THREE.PointsMaterial;
}

export const FestivalLightScene3D: React.FC<FestivalLightScene3DProps> = ({
  phase,
  onFireworkBurst,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const phaseRef = useRef<FestivalScenePhase>(phase);
  const fireworkCallbackRef = useRef(onFireworkBurst);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    fireworkCallbackRef.current = onFireworkBurst;
  }, [onFireworkBurst]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const trackedGeos: THREE.BufferGeometry[] = [];
    const trackedMats: THREE.Material[] = [];
    const trackedTexs: THREE.Texture[] = [];

    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      trackedGeos.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      trackedMats.push(m);
      return m;
    };
    const trackTex = <T extends THREE.Texture>(t: T): T => {
      trackedTexs.push(t);
      return t;
    };

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    const isSoftwareGl = detectSoftwareWebGL(renderer);
    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 240);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c1330);
    scene.fog = new THREE.FogExp2(0x11193f, 0.0115);

    const camera = new THREE.PerspectiveCamera(46, width / height, 0.2, 240);
    camera.position.set(0, 8.0, 24.5);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;

    const maxAniso = isSoftwareGl ? 1 : Math.min(4, renderer.capabilities.getMaxAnisotropy());
    const materials = createKingdomMaterials(maxAniso, isSoftwareGl);

    const glowTex = trackTex(createRadialGlowTexture());
    const beamTex = trackTex(createVerticalBeamTexture());

    // Luminous Night Royal Festival Sky Dome
    const skyMat = trackMat(
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uTop: { value: new THREE.Color(0x090f28) },
          uMid: { value: new THREE.Color(0x1a2554) },
          uHorizon: { value: new THREE.Color(0x2d2a5c) },
        },
        vertexShader: `
          varying vec3 vWorldPos;
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorldPos = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: `
          uniform vec3 uTop;
          uniform vec3 uMid;
          uniform vec3 uHorizon;
          varying vec3 vWorldPos;
          void main() {
            float h = normalize(vWorldPos).y;
            vec3 col = mix(uHorizon, uMid, smoothstep(-0.08, 0.28, h));
            col = mix(col, uTop, smoothstep(0.28, 0.82, h));
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    );
    scene.add(new THREE.Mesh(trackGeo(new THREE.SphereGeometry(145, 28, 18)), skyMat));

    // Glowing Crescent / Full Royal Moon in Upper Sky
    const moonMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xfff3cb,
      }),
    );
    const moon = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(3.2, 20, 16)), moonMat);
    moon.position.set(-24, 29, -68);
    scene.add(moon);

    const moonHalo = new THREE.Sprite(
      trackMat(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: 0xffe49e,
          transparent: true,
          opacity: 0.48,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      ),
    );
    moonHalo.scale.set(22, 22, 1);
    moonHalo.position.copy(moon.position);
    scene.add(moonHalo);

    // Twinkling Night Starfield
    const starCount = isSoftwareGl ? 90 : 210;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = 0.14 + Math.random() * 0.85;
      const r = 95 + Math.random() * 25;
      starPos[i * 3] = Math.cos(theta) * Math.sin(phi) * r;
      starPos[i * 3 + 1] = Math.cos(phi) * r + 8;
      starPos[i * 3 + 2] = Math.sin(theta) * Math.sin(phi) * r - 12;
    }
    const starGeo = trackGeo(new THREE.BufferGeometry());
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = trackMat(
      new THREE.PointsMaterial({
        map: glowTex,
        color: 0xfff5d4,
        size: 1.45,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    scene.add(new THREE.Points(starGeo, starMat));

    // Lighting — Moonlight + Warm Courtyard Lanterns + Palace Radiance
    const hemiLight = new THREE.HemisphereLight(0x9cb8ff, 0x2b2448, 1.05);
    scene.add(hemiLight);

    const moonDirLight = new THREE.DirectionalLight(0xd9e8ff, 1.35);
    moonDirLight.position.set(-18, 28, 16);
    if (!isSoftwareGl) {
      moonDirLight.castShadow = true;
      moonDirLight.shadow.mapSize.set(1024, 1024);
      moonDirLight.shadow.camera.near = 2;
      moonDirLight.shadow.camera.far = 90;
      moonDirLight.shadow.camera.left = -22;
      moonDirLight.shadow.camera.right = 22;
      moonDirLight.shadow.camera.top = 24;
      moonDirLight.shadow.camera.bottom = -12;
    }
    scene.add(moonDirLight);

    const palaceWarmLight = new THREE.PointLight(0xffcb66, 3.2, 46, 1.35);
    palaceWarmLight.position.set(0, 7.5, -2.5);
    scene.add(palaceWarmLight);

    const courtyardFillLight = new THREE.PointLight(0xffdfa0, 2.2, 32, 1.4);
    courtyardFillLight.position.set(0, 4.6, 10.5);
    scene.add(courtyardFillLight);

    // Foreground Royal Courtyard Terrace (connects cleanly to the Castle Keep)
    const courtyardGroup = new THREE.Group();
    scene.add(courtyardGroup);

    const floorSlab = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(13.8, 14.4, 1.2, 32)),
      materials.warmIvoryMarble,
    );
    floorSlab.position.set(0, -0.6, 7.5);
    floorSlab.receiveShadow = true;
    courtyardGroup.add(floorSlab);

    const floorRim = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(13.8, 0.16, 10, 48)),
      materials.antiqueGold,
    );
    floorRim.rotation.x = Math.PI / 2;
    floorRim.position.set(0, 0.02, 7.5);
    courtyardGroup.add(floorRim);

    // Royal Burgundy & Gold Ceremonial Carpet leading toward Castle Gate
    const carpetMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x7a1c33,
        roughness: 0.78,
        metalness: 0.08,
      }),
    );
    const carpet = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(4.4, 0.05, 16.5)),
      carpetMat,
    );
    carpet.position.set(0, 0.03, 7.2);
    carpet.receiveShadow = true;
    courtyardGroup.add(carpet);

    [-2.25, 2.25].forEach((bx) => {
      const border = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.14, 0.06, 16.5)),
        materials.champagneGold,
      );
      border.position.set(bx, 0.035, 7.2);
      courtyardGroup.add(border);
    });

    // Festival Lantern Posts flanking the Courtyard Carpet
    const lanternOrbMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xffe9a6,
        emissive: 0xffb838,
        emissiveIntensity: 1.65,
        roughness: 0.2,
      }),
    );
    [-4.6, 4.6].forEach((lx) => {
      [2.5, 8.2, 13.8].forEach((lz) => {
        const post = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.08, 0.12, 3.1, 8)),
          materials.antiqueGold,
        );
        post.position.set(lx, 1.55, lz);
        courtyardGroup.add(post);

        const lanternHead = new THREE.Mesh(
          trackGeo(new THREE.OctahedronGeometry(0.32, 0)),
          lanternOrbMat,
        );
        lanternHead.position.set(lx, 3.22, lz);
        courtyardGroup.add(lanternHead);
      });
    });

    // Existing Kingdom of Stories Fairytale Royal Castle Backdrop (at z = -10.5)
    const castleGroup = new THREE.Group();
    castleGroup.position.set(0, 0.25, -10.5);
    scene.add(castleGroup);

    const islandRockMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x4f4770,
        roughness: 0.88,
        metalness: 0.06,
        flatShading: true,
      }),
    );

    const citadelBase = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(10.5, 9.5, 10)), islandRockMat);
    citadelBase.rotation.x = Math.PI;
    citadelBase.position.y = -4.9;
    castleGroup.add(citadelBase);

    const citadelPlateau = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(10.4, 9.8, 0.9, 24)),
      materials.warmIvoryMarble,
    );
    citadelPlateau.position.y = 0.0;
    castleGroup.add(citadelPlateau);

    const citadelGoldBorder = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(10.3, 0.14, 10, 42)),
      materials.antiqueGold,
    );
    citadelGoldBorder.rotation.x = Math.PI / 2;
    citadelGoldBorder.position.y = 0.46;
    castleGroup.add(citadelGoldBorder);

    // Dynamic window emission — transitions from dim twilight to golden glory as heroes save palace
    const castleGlowWindowMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfff0be,
        emissive: 0xffc65c,
        emissiveIntensity: 0.35,
        roughness: 0.18,
      }),
    );
    const spireRoofMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x2d3f7a,
        roughness: 0.36,
        metalness: 0.28,
      }),
    );

    const keepBody = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(7.8, 5.4, 5.6)),
      materials.pearlIvory,
    );
    keepBody.position.set(0, 3.1, 0);
    castleGroup.add(keepBody);

    const keepTrim = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(8.1, 0.38, 5.9)),
      materials.champagneGold,
    );
    keepTrim.position.set(0, 5.85, 0);
    castleGroup.add(keepTrim);

    const roseWindow = new THREE.Mesh(
      trackGeo(new THREE.CircleGeometry(1.2, 24)),
      materials.stainedGlass,
    );
    roseWindow.position.set(0, 4.15, 2.84);
    castleGroup.add(roseWindow);

    const roseFrame = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(1.24, 0.1, 8, 24)),
      materials.antiqueGold,
    );
    roseFrame.position.set(0, 4.15, 2.85);
    castleGroup.add(roseFrame);

    const palaceArchGate = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(2.0, 2.55)),
      castleGlowWindowMat,
    );
    palaceArchGate.position.set(0, 1.75, 2.83);
    castleGroup.add(palaceArchGate);

    // Central High Clocktower Spire
    const centralTower = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(1.65, 1.95, 8.8, 12)),
      materials.warmIvoryMarble,
    );
    centralTower.position.set(0, 7.7, -0.2);
    castleGroup.add(centralTower);

    const centralRoof = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(2.2, 4.8, 12)),
      spireRoofMat,
    );
    centralRoof.position.set(0, 14.4, -0.2);
    castleGroup.add(centralRoof);

    const clockFace = new THREE.Mesh(
      trackGeo(new THREE.CircleGeometry(1.02, 24)),
      castleGlowWindowMat,
    );
    clockFace.position.set(0, 9.75, 1.54);
    castleGroup.add(clockFace);

    const clockRim = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(1.05, 0.085, 8, 24)),
      materials.antiqueGold,
    );
    clockRim.position.set(0, 9.75, 1.55);
    castleGroup.add(clockRim);

    const clockMinuteHand = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.07, 0.72, 0.04)),
      materials.midnightNavy,
    );
    clockMinuteHand.geometry.translate(0, 0.3, 0);
    clockMinuteHand.position.set(0, 9.75, 1.58);
    castleGroup.add(clockMinuteHand);

    const clockHourHand = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.09, 0.46, 0.04)),
      materials.midnightNavy,
    );
    clockHourHand.geometry.translate(0, 0.18, 0);
    clockHourHand.position.set(0, 9.75, 1.59);
    castleGroup.add(clockHourHand);

    // Waving Spire Banners
    interface FlagAnim {
      mesh: THREE.Mesh;
      base: Float32Array;
      phase: number;
      w: number;
    }
    const flags: FlagAnim[] = [];
    const makeFlag = (colorHex: number, w: number, h: number, phase: number) => {
      const geo = trackGeo(new THREE.PlaneGeometry(w, h, 8, 2));
      geo.translate(w * 0.5, 0, 0);
      const mat = trackMat(
        new THREE.MeshStandardMaterial({
          color: colorHex,
          roughness: 0.6,
          metalness: 0.12,
          side: THREE.DoubleSide,
        }),
      );
      const mesh = new THREE.Mesh(geo, mat);
      const posAttr = geo.attributes.position as THREE.BufferAttribute;
      flags.push({ mesh, base: new Float32Array(posAttr.array as Float32Array), phase, w });
      return mesh;
    };

    const topMast = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.05, 0.07, 2.3, 6)),
      materials.antiqueGold,
    );
    topMast.position.set(0, 17.5, -0.2);
    castleGroup.add(topMast);
    const mainFlag = makeFlag(0xd94873, 1.9, 0.88, 0.2);
    mainFlag.position.set(0.04, 18.05, -0.2);
    castleGroup.add(mainFlag);

    // 6 Flanking Castle Towers
    const towerSpecs = [
      { x: -4.2, z: 2.3, r: 1.08, h: 6.4, roofH: 3.2, flagColor: 0x3b82f6, phase: 0.9 },
      { x: 4.2, z: 2.3, r: 1.08, h: 6.4, roofH: 3.2, flagColor: 0x3b82f6, phase: 1.8 },
      { x: -5.8, z: -0.6, r: 1.28, h: 7.6, roofH: 3.7, flagColor: 0x8b5cf6, phase: 2.7 },
      { x: 5.8, z: -0.6, r: 1.28, h: 7.6, roofH: 3.7, flagColor: 0x8b5cf6, phase: 3.6 },
      { x: -3.1, z: -3.2, r: 1.18, h: 8.2, roofH: 3.9, flagColor: 0x10b981, phase: 4.4 },
      { x: 3.1, z: -3.2, r: 1.18, h: 8.2, roofH: 3.9, flagColor: 0x10b981, phase: 5.2 },
    ];
    towerSpecs.forEach((ts) => {
      const tw = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(ts.r * 0.92, ts.r * 1.08, ts.h, 10)),
        materials.pearlIvory,
      );
      tw.position.set(ts.x, ts.h * 0.5 + 0.35, ts.z);
      castleGroup.add(tw);

      const rf = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(ts.r * 1.32, ts.roofH, 10)),
        spireRoofMat,
      );
      rf.position.set(ts.x, ts.h + ts.roofH * 0.5 + 0.35, ts.z);
      castleGroup.add(rf);

      const collar = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(ts.r * 1.02, 0.09, 8, 20)),
        materials.champagneGold,
      );
      collar.rotation.x = Math.PI / 2;
      collar.position.set(ts.x, ts.h + 0.35, ts.z);
      castleGroup.add(collar);

      [-0.4, 0.4].forEach((angOffset) => {
        const win = new THREE.Mesh(
          trackGeo(new THREE.PlaneGeometry(0.44, 0.96)),
          castleGlowWindowMat,
        );
        win.position.set(
          ts.x + Math.sin(angOffset) * (ts.r + 0.04),
          ts.h * 0.65,
          ts.z + Math.cos(angOffset) * (ts.r + 0.04),
        );
        win.rotation.y = angOffset;
        castleGroup.add(win);
      });

      const mast = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.035, 0.05, 1.55, 6)),
        materials.antiqueGold,
      );
      mast.position.set(ts.x, ts.h + ts.roofH + 1.0, ts.z);
      castleGroup.add(mast);

      const fl = makeFlag(ts.flagColor, 1.25, 0.6, ts.phase);
      fl.position.set(ts.x + 0.03, ts.h + ts.roofH + 1.44, ts.z);
      castleGroup.add(fl);
    });

    // Sweeping Skyward Castle Light Beams
    const beamMat = trackMat(
      new THREE.MeshBasicMaterial({
        map: beamTex,
        transparent: true,
        opacity: 0.08,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    );
    const beamGeo = trackGeo(new THREE.CylinderGeometry(0.22, 3.1, 23, 14, 1, true));
    beamGeo.translate(0, 11.5, 0);
    const castleBeams: Array<{ pivot: THREE.Group; baseRotZ: number; speed: number; phase: number }> = [];
    [
      { x: 0, y: 13.0, z: -0.2, rz: -0.34, sp: 0.45, ph: 0.0 },
      { x: 0, y: 13.0, z: -0.2, rz: 0.36, sp: 0.4, ph: 1.4 },
      { x: -4.2, y: 7.5, z: 2.3, rz: 0.25, sp: 0.48, ph: 2.6 },
      { x: 4.2, y: 7.5, z: 2.3, rz: -0.25, sp: 0.46, ph: 3.9 },
    ].forEach((bs) => {
      const pivot = new THREE.Group();
      pivot.position.set(bs.x, bs.y, bs.z);
      pivot.rotation.z = bs.rz;
      pivot.rotation.x = -0.18;
      pivot.add(new THREE.Mesh(beamGeo, beamMat));
      castleGroup.add(pivot);
      castleBeams.push({ pivot, baseRotZ: bs.rz, speed: bs.sp, phase: bs.ph });
    });

    // Orbiting Spire Ornaments
    const castleOrnaments = new THREE.Group();
    castleOrnaments.position.set(0, 12.6, -0.2);
    castleGroup.add(castleOrnaments);
    const orbitRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(3.4, 0.07, 8, 36)),
      materials.champagneGold,
    );
    orbitRing.rotation.x = Math.PI * 0.44;
    castleOrnaments.add(orbitRing);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const orb = new THREE.Mesh(
        trackGeo(new THREE.OctahedronGeometry(0.28, 0)),
        i % 2 === 0 ? materials.crystalTurquoise : materials.candleFlame,
      );
      orb.position.set(Math.cos(a) * 3.4, 0, Math.sin(a) * 3.4);
      castleOrnaments.add(orb);
    }

    // All 4 Original Hero Characters (Ayden, Elena, Ryan, Eva)
    const heroIds: HeroId[] = ['ayden', 'elena', 'ryan', 'eva'];
    const heroPositionsX = [-2.55, -0.85, 0.85, 2.55];
    const heroRigs: Array<{
      rig: CharacterRig;
      targetX: number;
      startZ: number;
      endZ: number;
      phaseOffset: number;
    }> = heroIds.map((hid, idx) => {
      const rig = createHeroCharacter(hid);
      const startZ = 14.4 + (idx === 1 || idx === 2 ? -0.45 : 0.35);
      const endZ = 7.4 + (idx === 1 || idx === 2 ? -0.4 : 0.25);
      rig.root.position.set(heroPositionsX[idx], 0.05, startZ);
      rig.root.rotation.y = Math.PI; // Walking toward castle initially
      rig.root.scale.setScalar(1.06);
      scene.add(rig.root);
      return {
        rig,
        targetX: heroPositionsX[idx],
        startZ,
        endZ,
        phaseOffset: idx * 0.85,
      };
    });

    // Floating Festival Sky Lanterns
    const lanternCount = isSoftwareGl ? 14 : 22;
    const lanternGeo = trackGeo(new THREE.CylinderGeometry(0.24, 0.18, 0.46, 8));
    const lanternMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xffd275,
        transparent: true,
        opacity: 0.92,
      }),
    );
    const skyLanterns: Array<{
      mesh: THREE.Mesh;
      baseX: number;
      baseZ: number;
      y: number;
      speed: number;
      swayPhase: number;
    }> = [];
    for (let i = 0; i < lanternCount; i++) {
      const mesh = new THREE.Mesh(lanternGeo, lanternMat);
      const bx = (Math.random() - 0.5) * 32;
      const bz = -22 + Math.random() * 28;
      const by = 1.5 + Math.random() * 17;
      mesh.position.set(bx, by, bz);
      scene.add(mesh);
      skyLanterns.push({
        mesh,
        baseX: bx,
        baseZ: bz,
        y: by,
        speed: 0.75 + Math.random() * 0.75,
        swayPhase: Math.random() * Math.PI * 2,
      });
    }

    // Drifting Golden Magic Dust Particles
    const moteCount = isSoftwareGl ? 70 : 140;
    const motePos = new Float32Array(moteCount * 3);
    for (let i = 0; i < moteCount; i++) {
      motePos[i * 3] = (Math.random() - 0.5) * 26;
      motePos[i * 3 + 1] = 0.6 + Math.random() * 14;
      motePos[i * 3 + 2] = -14 + Math.random() * 26;
    }
    const moteGeo = trackGeo(new THREE.BufferGeometry());
    moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
    const moteMat = trackMat(
      new THREE.PointsMaterial({
        map: glowTex,
        color: 0xffe494,
        size: 0.55,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    const motes = new THREE.Points(moteGeo, moteMat);
    scene.add(motes);

    // 3D Particle Fireworks Pool
    const FIREWORK_PALETTE = [
      new THREE.Color(0xffd76a),
      new THREE.Color(0x67e8f9),
      new THREE.Color(0xfb7185),
      new THREE.Color(0xc084fc),
      new THREE.Color(0xff9f43),
      new THREE.Color(0x6ee7b7),
    ];
    const sparksPerShell = isSoftwareGl ? 44 : 72;
    const fireworkPool: FireworkRocket[] = Array.from({ length: 5 }, (_, idx) => {
      const color = FIREWORK_PALETTE[idx % FIREWORK_PALETTE.length];
      const rocketMesh = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.18, 8, 6)),
        trackMat(new THREE.MeshBasicMaterial({ color })),
      );
      rocketMesh.visible = false;
      scene.add(rocketMesh);

      const burstPositions = new Float32Array(sparksPerShell * 3);
      const burstVelocities = new Float32Array(sparksPerShell * 3);
      const burstGeo = trackGeo(new THREE.BufferGeometry());
      burstGeo.setAttribute('position', new THREE.BufferAttribute(burstPositions, 3));

      const burstMat = trackMat(
        new THREE.PointsMaterial({
          map: glowTex,
          color,
          size: 1.15,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      const burstPoints = new THREE.Points(burstGeo, burstMat);
      burstPoints.visible = false;
      scene.add(burstPoints);

      return {
        active: false,
        stage: 'rising',
        origin: new THREE.Vector3(),
        pos: new THREE.Vector3(),
        velY: 16,
        apexY: 18,
        age: 0,
        color,
        rocketMesh,
        burstPoints,
        burstPositions,
        burstVelocities,
        burstMat,
      };
    });

    const launchFirework = (shell: FireworkRocket) => {
      const col = FIREWORK_PALETTE[Math.floor(Math.random() * FIREWORK_PALETTE.length)];
      shell.color.copy(col);
      (shell.rocketMesh.material as THREE.MeshBasicMaterial).color.copy(col);
      shell.burstMat.color.copy(col);

      const x = (Math.random() - 0.5) * 26;
      const z = -18 + (Math.random() - 0.5) * 12;
      shell.origin.set(x, 2.5, z);
      shell.pos.copy(shell.origin);
      shell.velY = 14 + Math.random() * 5;
      shell.apexY = 15 + Math.random() * 7.5;
      shell.stage = 'rising';
      shell.age = 0;
      shell.active = true;
      shell.rocketMesh.position.copy(shell.pos);
      shell.rocketMesh.visible = true;
      shell.burstPoints.visible = false;
    };

    const explodeFirework = (shell: FireworkRocket) => {
      shell.stage = 'burst';
      shell.age = 0;
      shell.rocketMesh.visible = false;
      shell.burstPoints.visible = true;
      shell.burstMat.opacity = 1;

      const baseSpeed = 5.5 + Math.random() * 3.2;
      for (let i = 0; i < sparksPerShell; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const speed = baseSpeed * (0.55 + Math.random() * 0.65);

        shell.burstPositions[i * 3] = shell.pos.x;
        shell.burstPositions[i * 3 + 1] = shell.pos.y;
        shell.burstPositions[i * 3 + 2] = shell.pos.z;

        shell.burstVelocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
        shell.burstVelocities[i * 3 + 1] = Math.cos(phi) * speed;
        shell.burstVelocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;
      }
      (shell.burstPoints.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      fireworkCallbackRef.current?.(0.75 + Math.random() * 0.45);
    };

    // Resize Handling
    const handleResize = () => {
      if (!container) return;
      const w = Math.max(container.clientWidth, 320);
      const h = Math.max(container.clientHeight, 240);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Pre-allocated animation vectors
    const _camPos = new THREE.Vector3();
    const _camLook = new THREE.Vector3();
    const _clockStart = performance.now();
    let lastTime = _clockStart;
    let rescueTimer = 0;
    let nextFireworkSpawnAt = 0.25;
    let festivalElapsed = 0;
    let rafId = 0;
    let timerId: number | null = null;
    let disposed = false;

    const tick = (now: number) => {
      if (disposed) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      const elapsed = (now - _clockStart) / 1000;
      const activePhase = phaseRef.current;

      if (activePhase === 'rescue_clip') {
        rescueTimer += dt;
      } else {
        festivalElapsed += dt;
      }

      // 1. Palace Lighting & Radiance Awakening
      const awakeningRatio =
        activePhase === 'rescue_clip' ? Math.min(1, Math.max(0, (rescueTimer - 2.6) / 3.4)) : 1;
      castleGlowWindowMat.emissiveIntensity = 0.35 + awakeningRatio * 1.45;
      beamMat.opacity = 0.06 + awakeningRatio * 0.42 + Math.sin(elapsed * 2.1) * 0.04;
      palaceWarmLight.intensity = 1.4 + awakeningRatio * 2.3;

      // Clocktower Hands Restored to Smooth Motion once awakened
      const clockSpeed = awakeningRatio > 0.15 ? 1 : 0;
      clockMinuteHand.rotation.z = -elapsed * 0.85 * clockSpeed;
      clockHourHand.rotation.z = -elapsed * 0.16 * clockSpeed;

      // Skyward Beams Sweep & Ornaments Orbit
      castleBeams.forEach((b) => {
        b.pivot.rotation.z = b.baseRotZ + Math.sin(elapsed * b.speed + b.phase) * 0.24;
      });
      castleOrnaments.rotation.y = elapsed * 0.55;

      // Waving Castle Banners
      flags.forEach((fl) => {
        const attr = fl.mesh.geometry.attributes.position as THREE.BufferAttribute;
        const arr = attr.array as Float32Array;
        for (let i = 0; i < arr.length; i += 3) {
          const bx = fl.base[i];
          const u = bx / fl.w;
          arr[i + 2] = Math.sin(elapsed * 4.2 - u * 4.5 + fl.phase) * 0.16 * u;
        }
        attr.needsUpdate = true;
      });

      // 2. Hero Choreography (All 4 Original Heroes)
      heroRigs.forEach((h) => {
        if (activePhase === 'rescue_clip') {
          if (rescueTimer < 4.2) {
            const walkT = Math.min(1, rescueTimer / 4.2);
            const easedWalk = walkT * (2 - walkT);
            h.rig.root.position.z = THREE.MathUtils.lerp(h.startZ, h.endZ, easedWalk);
            h.rig.root.rotation.y = Math.PI;
            h.rig.updateAnimation('walk', dt, elapsed + h.phaseOffset, elapsed * 5.2 + h.phaseOffset);
          } else if (rescueTimer < 6.7) {
            h.rig.root.position.z = h.endZ;
            h.rig.root.rotation.y = Math.PI;
            h.rig.updateAnimation('interact', dt, elapsed + h.phaseOffset, 0);
          } else {
            // Turn forward gracefully toward festival finale
            const turnT = Math.min(1, (rescueTimer - 6.7) / 1.2);
            h.rig.root.rotation.y = THREE.MathUtils.lerp(Math.PI, Math.PI * 2, turnT);
            h.rig.updateAnimation('victory', dt, elapsed + h.phaseOffset, 0);
          }
        } else {
          // Festival & Complete: 4 heroes stand proud and cheer together
          h.rig.root.position.z = h.endZ;
          h.rig.root.rotation.y = -h.targetX * 0.08;
          h.rig.updateAnimation('victory', dt, elapsed + h.phaseOffset, 0);
        }
      });

      // 3. Floating Sky Lanterns & Golden Magic Particles
      skyLanterns.forEach((l) => {
        const showLanterns = activePhase !== 'rescue_clip' || awakeningRatio > 0.35;
        l.mesh.visible = showLanterns;
        if (!showLanterns) return;
        l.y += l.speed * dt;
        if (l.y > 26) l.y = 1.5;
        l.mesh.position.set(
          l.baseX + Math.sin(elapsed * 0.7 + l.swayPhase) * 0.65,
          l.y,
          l.baseZ + Math.cos(elapsed * 0.55 + l.swayPhase) * 0.5,
        );
      });

      const moteArr = (motes.geometry.attributes.position as THREE.BufferAttribute)
        .array as Float32Array;
      for (let i = 0; i < moteCount; i++) {
        moteArr[i * 3 + 1] += dt * (0.35 + (i % 4) * 0.1);
        if (moteArr[i * 3 + 1] > 15.5) moteArr[i * 3 + 1] = 0.6;
      }
      (motes.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

      // 4. Fireworks Spawning & Simulation (during festival & complete phases)
      const fireworksEnabled = activePhase !== 'rescue_clip' || rescueTimer > 7.2;
      if (fireworksEnabled && elapsed >= nextFireworkSpawnAt) {
        const idleShell = fireworkPool.find((f) => !f.active);
        if (idleShell) {
          launchFirework(idleShell);
          nextFireworkSpawnAt = elapsed + (isSoftwareGl ? 0.95 : 0.65) + Math.random() * 0.55;
        }
      }

      fireworkPool.forEach((shell) => {
        if (!shell.active) return;
        if (shell.stage === 'rising') {
          shell.pos.y += shell.velY * dt;
          shell.velY = Math.max(5.5, shell.velY - 3.4 * dt);
          shell.rocketMesh.position.copy(shell.pos);
          if (shell.pos.y >= shell.apexY) {
            explodeFirework(shell);
          }
        } else {
          shell.age += dt;
          const burstDuration = 1.9;
          if (shell.age >= burstDuration) {
            shell.active = false;
            shell.burstPoints.visible = false;
            return;
          }
          for (let i = 0; i < sparksPerShell; i++) {
            shell.burstPositions[i * 3] += shell.burstVelocities[i * 3] * dt;
            shell.burstPositions[i * 3 + 1] += shell.burstVelocities[i * 3 + 1] * dt;
            shell.burstPositions[i * 3 + 2] += shell.burstVelocities[i * 3 + 2] * dt;
            // Air drag & gentle gravity
            shell.burstVelocities[i * 3] *= 1 - 0.9 * dt;
            shell.burstVelocities[i * 3 + 1] =
              shell.burstVelocities[i * 3 + 1] * (1 - 0.85 * dt) - 3.6 * dt;
            shell.burstVelocities[i * 3 + 2] *= 1 - 0.9 * dt;
          }
          shell.burstMat.opacity = Math.max(0, 1 - Math.pow(shell.age / burstDuration, 1.35));
          (shell.burstPoints.geometry.attributes.position as THREE.BufferAttribute).needsUpdate =
            true;
        }
      });

      // 5. Smooth Cinematic Camera Choreography
      if (activePhase === 'rescue_clip') {
        const camT = Math.min(1, rescueTimer / 8.0);
        const smooth = camT * camT * (3 - 2 * camT);
        _camPos.set(
          Math.sin(smooth * Math.PI * 0.65) * 3.8,
          THREE.MathUtils.lerp(7.4, 4.3, smooth),
          THREE.MathUtils.lerp(24.2, 16.2, smooth),
        );
        _camLook.set(
          0,
          THREE.MathUtils.lerp(3.2, 5.8, smooth),
          THREE.MathUtils.lerp(6.5, -5.5, smooth),
        );
      } else {
        const sway = Math.sin(festivalElapsed * 0.24) * 3.6;
        _camPos.set(sway, 4.45 + Math.sin(festivalElapsed * 0.32) * 0.45, 16.5);
        _camLook.set(sway * 0.18, 5.4, -5.2);
      }

      camera.position.lerp(_camPos, Math.min(1, dt * 4.0));
      camera.lookAt(_camLook);

      renderer.render(scene, camera);

      const gl = renderer.getContext();
      if (isSoftwareGl && typeof (gl as unknown as { afterDraw?: unknown }).afterDraw === 'function') {
        timerId = window.setTimeout(() => {
          rafId = requestAnimationFrame(tick);
        }, 16);
      } else {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      if (timerId !== null) window.clearTimeout(timerId);
      window.removeEventListener('resize', handleResize);
      heroRigs.forEach((h) => h.rig.dispose());
      materials.dispose();
      trackedGeos.forEach((g) => g.dispose());
      trackedMats.forEach((m) => m.dispose());
      trackedTexs.forEach((t) => t.dispose());
      envTarget.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative select-none"
      aria-label="Pentas 3D Festival Cahaya Diraja bersama empat wira dan Istana Kota Diraja"
    />
  );
};
