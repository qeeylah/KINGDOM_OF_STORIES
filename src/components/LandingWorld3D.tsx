import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { soundEngine } from '../audio/soundEngine';
import { type CharacterAnimState, type CharacterRig, createHeroCharacter } from '../game/characters';
import { createKingdomMaterials } from '../game/materials';
import type { HeroId, UserRole } from '../types/game';

interface LandingWorld3DProps {
  selectedRole: UserRole;
  hoveredRole: UserRole | null;
  enteringRole: UserRole | null;
  reducedMotion: boolean;
  lowPowerMode: boolean;
  onHoverPortal: (role: UserRole | null) => void;
  onSelectPortal: (role: UserRole) => void;
}

interface PortalRig {
  role: UserRole;
  group: THREE.Group;
  hitMesh: THREE.Mesh;
  vortexMat: THREE.ShaderMaterial;
  innerRing: THREE.Mesh;
  outerRing: THREE.Mesh;
  emblemGroup: THREE.Group;
  orbitGroup: THREE.Group;
  particles: THREE.Points;
  particleBase: Float32Array;
  glowLight: THREE.PointLight | null;
  frameAccentMat: THREE.MeshStandardMaterial;
  worldCenter: THREE.Vector3;
  hoverScale: number;
}

interface WavingFlag {
  mesh: THREE.Mesh;
  basePositions: Float32Array;
  phase: number;
  width: number;
}

interface FloatingIslandRig {
  group: THREE.Group;
  baseY: number;
  bobSpeed: number;
  bobAmp: number;
  phase: number;
  crystals: THREE.Mesh[];
  splashRings: THREE.Mesh[];
}

interface ButterflyRig {
  group: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  center: THREE.Vector3;
  rx: number;
  rz: number;
  speed: number;
  phase: number;
  flapSpeed: number;
}

interface HeroActor {
  id: HeroId;
  rig: CharacterRig;
  basePos: THREE.Vector3;
  baseRotY: number;
  phase: number;
}

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

function createGlowSpriteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255, 252, 232, 1)');
  grad.addColorStop(0.35, 'rgba(255, 224, 130, 0.85)');
  grad.addColorStop(0.7, 'rgba(212, 175, 55, 0.28)');
  grad.addColorStop(1, 'rgba(212, 175, 55, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createWaterfallTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0, 'rgba(130, 228, 240, 0.55)');
  grad.addColorStop(0.5, 'rgba(225, 252, 255, 0.92)');
  grad.addColorStop(1, 'rgba(130, 228, 240, 0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 48; i++) {
    const x = (i * 43) % 256;
    const y = (i * 67) % 256;
    const h = 36 + (i % 4) * 20;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.45)' : 'rgba(123, 224, 230, 0.45)';
    ctx.fillRect(x, y, 6, h);
    ctx.fillRect(x, y - 256, 6, h);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 2.2);
  return tex;
}

function createLightBeamTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, 'rgba(255, 245, 200, 0.0)');
  grad.addColorStop(0.25, 'rgba(255, 236, 175, 0.16)');
  grad.addColorStop(0.75, 'rgba(218, 210, 255, 0.34)');
  grad.addColorStop(1, 'rgba(255, 248, 225, 0.65)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createPortalPlaqueTexture(title: string, subtitle: string, accentHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#121c38';
  ctx.fillRect(0, 0, 512, 160);

  ctx.strokeStyle = '#e5c35a';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 496, 144);

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 3;
  ctx.strokeRect(18, 18, 476, 124);

  ctx.fillStyle = '#faf6ee';
  ctx.font = 'bold 48px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 256, 76);

  ctx.fillStyle = accentHex;
  ctx.font = '600 24px sans-serif';
  ctx.fillText(subtitle, 256, 120);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createPortalVortexShader(innerHex: number, outerHex: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uBoost: { value: 1.0 },
      uInnerColor: { value: new THREE.Color(innerHex) },
      uOuterColor: { value: new THREE.Color(outerHex) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uBoost;
      uniform vec3 uInnerColor;
      uniform vec3 uOuterColor;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        if (r > 1.0) discard;
        float angle = atan(p.y, p.x);
        float swirl = sin(angle * 5.0 - uTime * (2.6 * uBoost) + r * 9.0) * 0.5 + 0.5;
        float ripple = sin(r * 16.0 - uTime * (3.4 * uBoost)) * 0.5 + 0.5;
        float coreGlow = smoothstep(0.95, 0.08, r);
        vec3 col = mix(uOuterColor, uInnerColor, swirl * 0.65 + ripple * 0.35);
        col += vec3(0.35, 0.32, 0.25) * pow(1.0 - r, 2.2) * uBoost;
        float alpha = clamp((0.48 + 0.45 * swirl) * smoothstep(1.0, 0.72, r) * (0.85 + 0.25 * uBoost) + coreGlow * 0.18, 0.0, 0.96);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
}

export const LandingWorld3D: React.FC<LandingWorld3DProps> = ({
  selectedRole,
  hoveredRole,
  enteringRole,
  reducedMotion,
  lowPowerMode,
  onHoverPortal,
  onSelectPortal,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const selectedRoleRef = useRef<UserRole>(selectedRole);
  const hoveredRoleRef = useRef<UserRole | null>(hoveredRole);
  const enteringRoleRef = useRef<UserRole | null>(enteringRole);
  const reducedMotionRef = useRef<boolean>(reducedMotion);
  const lowPowerRef = useRef<boolean>(lowPowerMode);
  const onHoverPortalRef = useRef(onHoverPortal);
  const onSelectPortalRef = useRef(onSelectPortal);

  selectedRoleRef.current = selectedRole;
  hoveredRoleRef.current = hoveredRole;
  enteringRoleRef.current = enteringRole;
  reducedMotionRef.current = reducedMotion;
  lowPowerRef.current = lowPowerMode;
  onHoverPortalRef.current = onHoverPortal;
  onSelectPortalRef.current = onSelectPortal;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const perfReduced = isSoftwareGl || lowPowerRef.current;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.75));
    renderer.shadowMap.enabled = !perfReduced;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x3a4374, 0.0105);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 260);
    camera.position.set(-1.6, 5.2, 18.6);

    const geometries: THREE.BufferGeometry[] = [];
    const customMats: THREE.Material[] = [];
    const customTextures: THREE.Texture[] = [];
    const mixers: THREE.AnimationMixer[] = [];
    const heroRigs: CharacterRig[] = [];

    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      geometries.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      customMats.push(m);
      return m;
    };
    const trackTex = <T extends THREE.Texture>(t: T): T => {
      customTextures.push(t);
      return t;
    };

    const materials = createKingdomMaterials(isSoftwareGl ? 1 : 4, isSoftwareGl);
    const glowSprite = trackTex(createGlowSpriteTexture());
    const waterfallTex = trackTex(createWaterfallTexture());
    const lightBeamTex = trackTex(createLightBeamTexture());

    // 1. Lighting Rig (Warm Pastel Fantasy Daylight / Golden Twilight)
    const hemiLight = new THREE.HemisphereLight(0xfff1dc, 0x5c548a, 1.35);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xffe7bd, 2.35);
    sunLight.position.set(16, 26, 18);
    if (!perfReduced) {
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.set(1024, 1024);
      sunLight.shadow.camera.near = 2;
      sunLight.shadow.camera.far = 65;
      sunLight.shadow.camera.left = -22;
      sunLight.shadow.camera.right = 22;
      sunLight.shadow.camera.top = 22;
      sunLight.shadow.camera.bottom = -22;
      sunLight.shadow.bias = -0.0005;
    }
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0xa3d8ff, 0.85);
    rimLight.position.set(-18, 14, -22);
    scene.add(rimLight);

    const castleBeaconLight = new THREE.PointLight(0xffd77d, 4.5, 42, 1.4);
    castleBeaconLight.position.set(-2.5, 11.5, -16.5);
    scene.add(castleBeaconLight);

    // 2. Gradient Fantasy Sky Dome + Twinkling Stars
    const skyMat = trackMat(
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uTop: { value: new THREE.Color(0x16224b) },
          uMid: { value: new THREE.Color(0x52528f) },
          uHorizon: { value: new THREE.Color(0xe8baa2) },
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
            col = mix(col, uTop, smoothstep(0.28, 0.78, h));
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    );
    const skyDome = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(140, 28, 18)), skyMat);
    scene.add(skyDome);

    // 3 layered twinkling starfields appearing & disappearing in upper sky
    const starLayers: Array<{ points: THREE.Points; mat: THREE.PointsMaterial; speed: number; phase: number }> = [];
    for (let layer = 0; layer < 3; layer++) {
      const count = perfReduced ? 35 : 70;
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = 0.22 + Math.random() * 0.92;
        const r = 92 + Math.random() * 24;
        pos[i * 3] = Math.cos(theta) * Math.sin(phi) * r;
        pos[i * 3 + 1] = Math.cos(phi) * r + 14;
        pos[i * 3 + 2] = Math.sin(theta) * Math.sin(phi) * r - 18;
      }
      const geo = trackGeo(new THREE.BufferGeometry());
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = trackMat(
        new THREE.PointsMaterial({
          map: glowSprite,
          color: layer === 0 ? 0xfff5d4 : layer === 1 ? 0xcbe8ff : 0xf4d2ff,
          size: layer === 1 ? 1.55 : 1.15,
          transparent: true,
          opacity: 0.75,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      const pts = new THREE.Points(geo, mat);
      scene.add(pts);
      starLayers.push({ points: pts, mat, speed: 1.05 + layer * 0.55, phase: layer * 2.1 });
    }

    // 3. Drifting Soft Pastel Clouds
    const cloudMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfbf0ea,
        emissive: 0x6f5986,
        emissiveIntensity: 0.2,
        roughness: 0.92,
        metalness: 0.0,
        transparent: true,
        opacity: 0.9,
      }),
    );
    const clouds: Array<{ group: THREE.Group; speed: number; zBase: number }> = [];
    const cloudSpecs = [
      { x: -34, y: 15, z: -26, s: 1.4, sp: 0.55 },
      { x: -16, y: 18, z: -34, s: 1.8, sp: 0.42 },
      { x: 4, y: 14, z: -28, s: 1.5, sp: 0.48 },
      { x: 24, y: 17, z: -32, s: 1.7, sp: 0.38 },
      { x: -24, y: 11, z: -15, s: 1.05, sp: 0.68 },
      { x: 16, y: 12, z: -14, s: 1.15, sp: 0.62 },
      { x: -6, y: 21, z: -40, s: 2.1, sp: 0.32 },
      { x: 34, y: 13, z: -22, s: 1.3, sp: 0.52 },
    ];
    cloudSpecs.forEach((cs) => {
      const cg = new THREE.Group();
      const puffOffsets = [
        [0, 0, 0, 1.5],
        [-1.3, -0.25, 0.2, 1.15],
        [1.35, -0.2, -0.15, 1.2],
        [0.45, 0.45, 0.25, 1.05],
        [-0.55, 0.35, -0.2, 0.95],
      ];
      puffOffsets.forEach(([px, py, pz, pr]) => {
        const puff = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(pr, 12, 10)), cloudMat);
        puff.position.set(px, py, pz);
        puff.scale.set(1.25, 0.72, 0.85);
        cg.add(puff);
      });
      cg.scale.setScalar(cs.s);
      cg.position.set(cs.x, cs.y, cs.z);
      scene.add(cg);
      clouds.push({ group: cg, speed: cs.sp, zBase: cs.z });
    });

    // 4. Shared Texture/Material Helpers for Waving Flags, Crystals, Waterfalls
    const wavingFlags: WavingFlag[] = [];
    const createWavingFlag = (
      colorHex: number,
      widthVal: number,
      heightVal: number,
      phase: number,
    ): THREE.Mesh => {
      const geo = trackGeo(new THREE.PlaneGeometry(widthVal, heightVal, 8, 2));
      geo.translate(widthVal * 0.5, 0, 0);
      const mat = trackMat(
        new THREE.MeshStandardMaterial({
          color: colorHex,
          roughness: 0.65,
          metalness: 0.1,
          side: THREE.DoubleSide,
        }),
      );
      const mesh = new THREE.Mesh(geo, mat);
      const posAttr = geo.attributes.position as THREE.BufferAttribute;
      wavingFlags.push({
        mesh,
        basePositions: new Float32Array(posAttr.array as Float32Array),
        phase,
        width: widthVal,
      });
      return mesh;
    };

    const waterfallMat = trackMat(
      new THREE.MeshBasicMaterial({
        map: waterfallTex,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
      }),
    );

    const crystalMatRose = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xf498b8,
        emissive: 0xc24878,
        emissiveIntensity: 0.55,
        roughness: 0.14,
        metalness: 0.15,
        clearcoat: 0.85,
      }),
    );

    const crystalMatAmethyst = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xb794f4,
        emissive: 0x7c3aed,
        emissiveIntensity: 0.55,
        roughness: 0.14,
        metalness: 0.15,
        clearcoat: 0.85,
      }),
    );

    const islandRockMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x5c537d,
        roughness: 0.88,
        metalness: 0.06,
        flatShading: true,
      }),
    );

    // 5. Floating Magical Islands & Continuous Flowing Waterfalls
    const floatingIslands: FloatingIslandRig[] = [];
    const buildFloatingIsland = (opts: {
      x: number;
      y: number;
      z: number;
      radius: number;
      hasWaterfall?: boolean;
      crystalType?: 'aqua' | 'rose' | 'amethyst';
      hasTree?: boolean;
      phase: number;
      bobSpeed: number;
    }): FloatingIslandRig => {
      const group = new THREE.Group();
      group.position.set(opts.x, opts.y, opts.z);

      // Sculpted rocky underside cone + emerald meadow cap
      const rockCone = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(opts.radius, opts.radius * 1.45, 7)),
        islandRockMat,
      );
      rockCone.rotation.x = Math.PI;
      rockCone.position.y = -opts.radius * 0.72;
      group.add(rockCone);

      const meadowCap = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(opts.radius * 1.03, opts.radius * 0.94, 0.55, 12)),
        materials.sageGrass,
      );
      meadowCap.position.y = 0.18;
      group.add(meadowCap);

      const rimGold = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(opts.radius * 0.96, 0.08, 8, 24)),
        materials.champagneGold,
      );
      rimGold.rotation.x = Math.PI / 2;
      rimGold.position.y = 0.05;
      group.add(rimGold);

      const crystals: THREE.Mesh[] = [];
      const cMat =
        opts.crystalType === 'rose'
          ? crystalMatRose
          : opts.crystalType === 'amethyst'
            ? crystalMatAmethyst
            : materials.crystalTurquoise;

      // Floating glowing root crystal underneath island
      const rootCrystal = new THREE.Mesh(
        trackGeo(new THREE.OctahedronGeometry(opts.radius * 0.28, 0)),
        cMat,
      );
      rootCrystal.position.y = -opts.radius * 1.65;
      rootCrystal.scale.set(0.75, 1.5, 0.75);
      group.add(rootCrystal);
      crystals.push(rootCrystal);

      // Surface magical crystals
      for (let c = 0; c < 3; c++) {
        const ang = (c / 3) * Math.PI * 2 + opts.phase;
        const cMesh = new THREE.Mesh(
          trackGeo(new THREE.OctahedronGeometry(0.45 + c * 0.12, 0)),
          cMat,
        );
        cMesh.scale.set(0.65, 1.75, 0.65);
        cMesh.position.set(
          Math.cos(ang) * opts.radius * 0.5,
          1.15 + c * 0.2,
          Math.sin(ang) * opts.radius * 0.5,
        );
        cMesh.rotation.z = (c - 1) * 0.16;
        group.add(cMesh);
        crystals.push(cMesh);
      }

      if (opts.hasTree) {
        const trunk = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.14, 0.24, 1.8, 7)),
          materials.woodOak,
        );
        trunk.position.set(-opts.radius * 0.25, 1.15, -opts.radius * 0.15);
        group.add(trunk);
        const foliageOffsets = [
          [0, 1.1, 0, 0.95],
          [-0.45, 0.85, 0.3, 0.72],
          [0.45, 0.9, -0.25, 0.75],
        ];
        foliageOffsets.forEach(([fx, fy, fz, fr]) => {
          const leaf = new THREE.Mesh(trackGeo(new THREE.IcosahedronGeometry(fr, 1)), materials.emeraldCanopy);
          leaf.position.set(trunk.position.x + fx, trunk.position.y + fy, trunk.position.z + fz);
          group.add(leaf);
        });
      }

      const splashRings: THREE.Mesh[] = [];
      if (opts.hasWaterfall) {
        const springPool = new THREE.Mesh(
          trackGeo(new THREE.CircleGeometry(opts.radius * 0.42, 16)),
          materials.waterStream,
        );
        springPool.rotation.x = -Math.PI / 2;
        springPool.position.set(0, 0.47, opts.radius * 0.38);
        group.add(springPool);

        const wfHeight = 9.5;
        const wfGeo = trackGeo(new THREE.PlaneGeometry(opts.radius * 0.58, wfHeight, 4, 12));
        const wfPos = wfGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < wfPos.count; i++) {
          const py = wfPos.getY(i);
          const topNorm = (wfHeight * 0.5 - py) / wfHeight;
          const curveZ = Math.sin(Math.min(1, topNorm * 2.2) * Math.PI * 0.5) * 0.85;
          wfPos.setZ(i, curveZ);
        }
        wfGeo.computeVertexNormals();
        const waterfall = new THREE.Mesh(wfGeo, waterfallMat);
        waterfall.position.set(0, -wfHeight * 0.5 + 0.45, opts.radius * 0.82);
        group.add(waterfall);

        const mistRing = new THREE.Mesh(
          trackGeo(new THREE.RingGeometry(0.45, 1.35, 18)),
          trackMat(
            new THREE.MeshBasicMaterial({
              color: 0xdffcff,
              transparent: true,
              opacity: 0.48,
              side: THREE.DoubleSide,
            }),
          ),
        );
        mistRing.rotation.x = -Math.PI / 2;
        mistRing.position.set(0, -wfHeight + 0.55, opts.radius * 0.82 + 0.85);
        group.add(mistRing);
        splashRings.push(mistRing);
      }

      scene.add(group);
      const rig: FloatingIslandRig = {
        group,
        baseY: opts.y,
        bobSpeed: opts.bobSpeed,
        bobAmp: 0.34,
        phase: opts.phase,
        crystals,
        splashRings,
      };
      floatingIslands.push(rig);
      return rig;
    };

    // Surrounding floating islands with waterfalls & glowing crystals
    buildFloatingIsland({
      x: -14.5,
      y: 4.8,
      z: -12.5,
      radius: 3.1,
      hasWaterfall: true,
      crystalType: 'aqua',
      hasTree: true,
      phase: 0.4,
      bobSpeed: 0.72,
    });
    buildFloatingIsland({
      x: 10.2,
      y: 5.5,
      z: -14.8,
      radius: 2.9,
      hasWaterfall: true,
      crystalType: 'rose',
      hasTree: true,
      phase: 1.7,
      bobSpeed: 0.65,
    });
    buildFloatingIsland({
      x: -11.4,
      y: 1.9,
      z: -4.8,
      radius: 2.1,
      hasWaterfall: false,
      crystalType: 'amethyst',
      hasTree: true,
      phase: 2.8,
      bobSpeed: 0.84,
    });
    buildFloatingIsland({
      x: 6.8,
      y: 2.6,
      z: -6.2,
      radius: 2.0,
      hasWaterfall: true,
      crystalType: 'aqua',
      hasTree: false,
      phase: 3.9,
      bobSpeed: 0.78,
    });
    buildFloatingIsland({
      x: -2.2,
      y: 8.2,
      z: -29.0,
      radius: 3.6,
      hasWaterfall: false,
      crystalType: 'amethyst',
      hasTree: true,
      phase: 5.1,
      bobSpeed: 0.55,
    });

    // 6. Central Animated Fairytale Royal Castle on Grand Floating Citadel
    const castleGroup = new THREE.Group();
    castleGroup.position.set(-2.4, 2.2, -16.8);
    scene.add(castleGroup);

    const citadelBase = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(8.8, 10.5, 9)), islandRockMat);
    citadelBase.rotation.x = Math.PI;
    citadelBase.position.y = -5.1;
    castleGroup.add(citadelBase);

    const citadelPlateau = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(9.2, 8.6, 0.9, 18)),
      materials.warmIvoryMarble,
    );
    citadelPlateau.position.y = 0.2;
    castleGroup.add(citadelPlateau);

    const citadelGoldBorder = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(9.1, 0.14, 10, 36)),
      materials.antiqueGold,
    );
    citadelGoldBorder.rotation.x = Math.PI / 2;
    citadelGoldBorder.position.y = 0.66;
    castleGroup.add(citadelGoldBorder);

    // Animated glowing window material (modulated continuously in loop)
    const castleGlowWindowMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfff0be,
        emissive: 0xffc65c,
        emissiveIntensity: 1.35,
        roughness: 0.18,
      }),
    );

    const spireRoofMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x384b8c,
        roughness: 0.38,
        metalness: 0.25,
      }),
    );

    // Main Keep Palace Body
    const keepBody = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(7.2, 5.2, 5.4)),
      materials.pearlIvory,
    );
    keepBody.position.set(0, 3.2, 0);
    castleGroup.add(keepBody);

    const keepTrim = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(7.5, 0.35, 5.7)),
      materials.champagneGold,
    );
    keepTrim.position.set(0, 5.85, 0);
    castleGroup.add(keepTrim);

    // Rose Stained-Glass Window + Grand Arch Gate
    const roseWindow = new THREE.Mesh(
      trackGeo(new THREE.CircleGeometry(1.15, 20)),
      materials.stainedGlass,
    );
    roseWindow.position.set(0, 4.1, 2.74);
    castleGroup.add(roseWindow);

    const roseFrame = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(1.18, 0.1, 8, 24)),
      materials.antiqueGold,
    );
    roseFrame.position.set(0, 4.1, 2.75);
    castleGroup.add(roseFrame);

    const palaceArchGate = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(1.8, 2.4)),
      castleGlowWindowMat,
    );
    palaceArchGate.position.set(0, 1.85, 2.73);
    castleGroup.add(palaceArchGate);

    // Central High Clocktower Spire
    const centralTower = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(1.55, 1.85, 8.6, 12)),
      materials.warmIvoryMarble,
    );
    centralTower.position.set(0, 7.6, -0.2);
    castleGroup.add(centralTower);

    const centralRoof = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(2.1, 4.6, 12)),
      spireRoofMat,
    );
    centralRoof.position.set(0, 14.1, -0.2);
    castleGroup.add(centralRoof);

    // Animated Royal Clock Face & Hands
    const clockFace = new THREE.Mesh(
      trackGeo(new THREE.CircleGeometry(0.95, 24)),
      castleGlowWindowMat,
    );
    clockFace.position.set(0, 9.6, 1.44);
    castleGroup.add(clockFace);

    const clockRim = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.98, 0.08, 8, 24)),
      materials.antiqueGold,
    );
    clockRim.position.set(0, 9.6, 1.45);
    castleGroup.add(clockRim);

    const clockMinuteHand = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.07, 0.7, 0.04)),
      materials.midnightNavy,
    );
    clockMinuteHand.geometry.translate(0, 0.3, 0);
    clockMinuteHand.position.set(0, 9.6, 1.48);
    castleGroup.add(clockMinuteHand);

    const clockHourHand = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.09, 0.45, 0.04)),
      materials.midnightNavy,
    );
    clockHourHand.geometry.translate(0, 0.18, 0);
    clockHourHand.position.set(0, 9.6, 1.49);
    castleGroup.add(clockHourHand);

    // Main spire flag
    const topMast = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.05, 0.07, 2.2, 6)),
      materials.antiqueGold,
    );
    topMast.position.set(0, 17.1, -0.2);
    castleGroup.add(topMast);
    const mainFlag = createWavingFlag(0xd94873, 1.8, 0.85, 0.2);
    mainFlag.position.set(0.04, 17.65, -0.2);
    castleGroup.add(mainFlag);

    // 6 Flanking Castle Towers with Glowing Windows & Waving Flags
    const towerSpecs = [
      { x: -3.9, z: 2.3, r: 1.05, h: 6.2, roofH: 3.1, flagColor: 0x3b82f6, phase: 0.9 },
      { x: 3.9, z: 2.3, r: 1.05, h: 6.2, roofH: 3.1, flagColor: 0x3b82f6, phase: 1.8 },
      { x: -5.4, z: -0.6, r: 1.25, h: 7.4, roofH: 3.6, flagColor: 0x8b5cf6, phase: 2.7 },
      { x: 5.4, z: -0.6, r: 1.25, h: 7.4, roofH: 3.6, flagColor: 0x8b5cf6, phase: 3.6 },
      { x: -2.9, z: -3.1, r: 1.15, h: 8.0, roofH: 3.8, flagColor: 0x10b981, phase: 4.4 },
      { x: 2.9, z: -3.1, r: 1.15, h: 8.0, roofH: 3.8, flagColor: 0x10b981, phase: 5.2 },
    ];
    towerSpecs.forEach((ts) => {
      const tw = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(ts.r * 0.92, ts.r * 1.08, ts.h, 10)),
        materials.pearlIvory,
      );
      tw.position.set(ts.x, ts.h * 0.5 + 0.5, ts.z);
      castleGroup.add(tw);

      const rf = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(ts.r * 1.32, ts.roofH, 10)),
        spireRoofMat,
      );
      rf.position.set(ts.x, ts.h + ts.roofH * 0.5 + 0.5, ts.z);
      castleGroup.add(rf);

      const collar = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(ts.r * 1.02, 0.09, 8, 20)),
        materials.champagneGold,
      );
      collar.rotation.x = Math.PI / 2;
      collar.position.set(ts.x, ts.h + 0.5, ts.z);
      castleGroup.add(collar);

      // Glowing arched windows
      [-0.4, 0.4].forEach((angOffset) => {
        const win = new THREE.Mesh(
          trackGeo(new THREE.PlaneGeometry(0.42, 0.92)),
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
      mast.position.set(ts.x, ts.h + ts.roofH + 1.15, ts.z);
      castleGroup.add(mast);

      const flag = createWavingFlag(ts.flagColor, 1.25, 0.6, ts.phase);
      flag.position.set(ts.x + 0.03, ts.h + ts.roofH + 1.58, ts.z);
      castleGroup.add(flag);
    });

    // Moving Magical Light Beams projecting from the Castle spires
    const beamMat = trackMat(
      new THREE.MeshBasicMaterial({
        map: lightBeamTex,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    );
    const castleBeams: Array<{ pivot: THREE.Group; baseRotZ: number; speed: number; phase: number }> = [];
    const beamGeo = trackGeo(new THREE.CylinderGeometry(0.18, 2.8, 19, 14, 1, true));
    beamGeo.translate(0, 9.5, 0);
    [
      { x: 0, y: 12.5, z: -0.2, rz: -0.34, sp: 0.42, ph: 0.0 },
      { x: 0, y: 12.5, z: -0.2, rz: 0.36, sp: 0.38, ph: 1.4 },
      { x: -3.9, y: 7.5, z: 2.3, rz: 0.25, sp: 0.46, ph: 2.6 },
      { x: 3.9, y: 7.5, z: 2.3, rz: -0.25, sp: 0.44, ph: 3.9 },
    ].forEach((bs) => {
      const pivot = new THREE.Group();
      pivot.position.set(bs.x, bs.y, bs.z);
      pivot.rotation.z = bs.rz;
      pivot.rotation.x = -0.18;
      const beam = new THREE.Mesh(beamGeo, beamMat);
      pivot.add(beam);
      castleGroup.add(pivot);
      castleBeams.push({ pivot, baseRotZ: bs.rz, speed: bs.sp, phase: bs.ph });
    });

    // Floating Magical Ornaments circling Central Castle Spire (driven by AnimationMixer!)
    const castleOrnamentsGroup = new THREE.Group();
    castleOrnamentsGroup.name = 'CastleOrnaments';
    castleOrnamentsGroup.position.set(0, 12.2, -0.2);
    castleGroup.add(castleOrnamentsGroup);

    const orbitRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(3.2, 0.07, 8, 36)),
      materials.champagneGold,
    );
    orbitRing.rotation.x = Math.PI * 0.44;
    castleOrnamentsGroup.add(orbitRing);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const orb = new THREE.Mesh(
        trackGeo(new THREE.OctahedronGeometry(0.28, 0)),
        i % 2 === 0 ? materials.crystalTurquoise : materials.candleFlame,
      );
      orb.position.set(Math.cos(a) * 3.2, 0, Math.sin(a) * 3.2);
      castleOrnamentsGroup.add(orb);
    }

    const ornamentMixer = new THREE.AnimationMixer(castleOrnamentsGroup);
    const q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.12, 0, 0));
    const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.12, Math.PI, 0));
    const q2 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.12, Math.PI * 2, 0));
    const ornamentClip = new THREE.AnimationClip('CastleOrnamentsOrbit', 12, [
      new THREE.QuaternionKeyframeTrack(
        '.quaternion',
        [0, 6, 12],
        [q0.x, q0.y, q0.z, q0.w, q1.x, q1.y, q1.z, q1.w, q2.x, q2.y, q2.z, q2.w],
      ),
      new THREE.VectorKeyframeTrack(
        '.position',
        [0, 6, 12],
        [0, 12.1, -0.2, 0, 12.85, -0.2, 0, 12.1, -0.2],
      ),
    ]);
    ornamentMixer.clipAction(ornamentClip).play();
    mixers.push(ornamentMixer);

    // 7. Foreground Royal Garden Terrace, Fountains, Banners & Flowers
    const terraceGroup = new THREE.Group();
    scene.add(terraceGroup);

    const terraceDeck = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(14.5, 13.8, 0.85, 36)),
      materials.marbleFloor,
    );
    terraceDeck.position.set(-2.2, -0.35, 6.8);
    terraceDeck.receiveShadow = !perfReduced;
    terraceGroup.add(terraceDeck);

    const terraceBorder = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(14.45, 0.16, 10, 48)),
      materials.champagneGold,
    );
    terraceBorder.rotation.x = Math.PI / 2;
    terraceBorder.position.set(-2.2, 0.09, 6.8);
    terraceGroup.add(terraceBorder);

    // Balustrade pillars along rear arc of terrace
    const swayingCurtains: Array<{ mesh: THREE.Mesh; phase: number; baseRotX: number }> = [];
    for (let i = 0; i < 9; i++) {
      const ang = Math.PI * 0.72 + (i / 8) * Math.PI * 1.56;
      const px = -2.2 + Math.cos(ang) * 13.6;
      const pz = 6.8 + Math.sin(ang) * 13.6;
      if (pz > 11.5) continue; // Keep camera sightline unobstructed

      const post = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.18, 0.24, 1.35, 10)),
        materials.pearlIvory,
      );
      post.position.set(px, 0.72, pz);
      terraceGroup.add(post);

      const finial = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.16, 10, 10)),
        materials.candleFlame,
      );
      finial.position.set(px, 1.5, pz);
      terraceGroup.add(finial);
    }

    // Tall Royal Banner Arches flanking Terrace Sides with Swaying Velvet Curtains
    [-11.8, 7.4].forEach((bx, sideIdx) => {
      const bannerPillar = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.32, 0.42, 6.2, 12)),
        materials.warmIvoryMarble,
      );
      bannerPillar.position.set(bx, 3.1, 3.8);
      terraceGroup.add(bannerPillar);

      const arm = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.08, 0.08, 2.0, 8)),
        materials.antiqueGold,
      );
      arm.rotation.z = Math.PI / 2;
      arm.position.set(bx + (sideIdx === 0 ? 0.9 : -0.9), 5.85, 3.8);
      terraceGroup.add(arm);

      const curtainGeo = trackGeo(new THREE.PlaneGeometry(1.35, 4.2, 2, 8));
      curtainGeo.translate(0, -2.1, 0);
      const curtainMesh = new THREE.Mesh(
        curtainGeo,
        sideIdx === 0 ? materials.royalBlueBrocade : materials.dustyRoseVelvet,
      );
      curtainMesh.position.set(bx + (sideIdx === 0 ? 1.0 : -1.0), 5.8, 3.8);
      terraceGroup.add(curtainMesh);
      swayingCurtains.push({ mesh: curtainMesh, phase: sideIdx * 1.7, baseRotX: 0.06 });
    });

    // Animated Royal Garden Fountains (Left & Right Terrace Wings)
    const fountainWaterDiscs: THREE.Mesh[] = [];
    const fountainJets: Array<{ mesh: THREE.Mesh; baseY: number; phase: number }> = [];
    [
      { x: -9.8, z: 7.4 },
      { x: 5.4, z: 7.0 },
    ].forEach((fp, fIdx) => {
      const fGroup = new THREE.Group();
      fGroup.position.set(fp.x, 0.08, fp.z);

      const basin = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(1.45, 1.65, 0.48, 20)),
        materials.warmIvoryMarble,
      );
      basin.position.y = 0.24;
      fGroup.add(basin);

      const waterPool = new THREE.Mesh(
        trackGeo(new THREE.CircleGeometry(1.3, 20)),
        materials.waterStream,
      );
      waterPool.rotation.x = -Math.PI / 2;
      waterPool.position.y = 0.49;
      fGroup.add(waterPool);
      fountainWaterDiscs.push(waterPool);

      const stem = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.2, 0.34, 1.35, 12)),
        materials.pearlIvory,
      );
      stem.position.y = 0.85;
      fGroup.add(stem);

      const upperBowl = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.75, 0.28, 0.28, 16)),
        materials.champagneGold,
      );
      upperBowl.position.y = 1.45;
      fGroup.add(upperBowl);

      const spout = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(0.18, 0.55, 10)),
        materials.crystalTurquoise,
      );
      spout.position.y = 1.78;
      fGroup.add(spout);

      for (let j = 0; j < 6; j++) {
        const ang = (j / 6) * Math.PI * 2;
        const jet = new THREE.Mesh(
          trackGeo(new THREE.SphereGeometry(0.085, 8, 8)),
          materials.waterStream,
        );
        jet.position.set(Math.cos(ang) * 0.45, 1.6, Math.sin(ang) * 0.45);
        fGroup.add(jet);
        fountainJets.push({ mesh: jet, baseY: 1.6, phase: fIdx * 1.3 + j * 0.9 });
      }

      terraceGroup.add(fGroup);
    });

    // Royal Garden Flower Clusters
    const bloomColors = [0xf48fb1, 0xce93d8, 0xffe082, 0x80deea];
    const bloomMats = bloomColors.map((hex) =>
      trackMat(
        new THREE.MeshStandardMaterial({
          color: hex,
          emissive: hex,
          emissiveIntensity: 0.22,
          roughness: 0.42,
        }),
      ),
    );
    const flowerPositions = [
      [-8.2, 9.5],
      [-7.1, 10.6],
      [-0.2, 10.7],
      [2.2, 9.6],
      [3.7, 8.9],
      [-10.4, 5.2],
      [5.9, 4.9],
    ];
    flowerPositions.forEach(([fx, fz], idx) => {
      const shrub = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.55, 10, 8)),
        materials.emeraldCanopy,
      );
      shrub.scale.set(1.3, 0.58, 1.3);
      shrub.position.set(fx, 0.22, fz);
      terraceGroup.add(shrub);

      for (let b = 0; b < 5; b++) {
        const a = (b / 5) * Math.PI * 2;
        const bloom = new THREE.Mesh(
          trackGeo(new THREE.DodecahedronGeometry(0.14, 0)),
          bloomMats[(idx + b) % bloomMats.length],
        );
        bloom.position.set(fx + Math.cos(a) * 0.35, 0.48 + (b % 2) * 0.08, fz + Math.sin(a) * 0.35);
        terraceGroup.add(bloom);
      }
    });

    // 8. Magical Fluttering 3D Butterflies
    const butterflies: ButterflyRig[] = [];
    const butterflyWingColors = [0x8be9fd, 0xf6a6c1, 0xffdf7d, 0xd4b6ff];
    const butterflyCount = perfReduced ? 5 : 10;
    for (let i = 0; i < butterflyCount; i++) {
      const bGroup = new THREE.Group();
      const bMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: butterflyWingColors[i % butterflyWingColors.length],
          emissive: butterflyWingColors[i % butterflyWingColors.length],
          emissiveIntensity: 0.65,
          roughness: 0.25,
          side: THREE.DoubleSide,
        }),
      );
      const leftWingGeo = trackGeo(new THREE.PlaneGeometry(0.24, 0.18));
      leftWingGeo.translate(-0.12, 0, 0);
      const rightWingGeo = trackGeo(new THREE.PlaneGeometry(0.24, 0.18));
      rightWingGeo.translate(0.12, 0, 0);

      const leftWing = new THREE.Mesh(leftWingGeo, bMat);
      const rightWing = new THREE.Mesh(rightWingGeo, bMat);
      bGroup.add(leftWing, rightWing);
      scene.add(bGroup);

      const anchor = flowerPositions[i % flowerPositions.length];
      butterflies.push({
        group: bGroup,
        leftWing,
        rightWing,
        center: new THREE.Vector3(anchor[0], 1.35 + (i % 3) * 0.45, anchor[1] - 0.5),
        rx: 1.1 + (i % 3) * 0.45,
        rz: 0.9 + (i % 2) * 0.5,
        speed: 0.95 + (i % 4) * 0.22,
        phase: i * 1.15,
        flapSpeed: 12.5 + (i % 3) * 2.2,
      });
    }

    // 9. Floating Opening & Closing Magical Books (Real THREE.AnimationMixer + AnimationClip)
    const floatingBooks: Array<{ group: THREE.Group; baseY: number; phase: number }> = [];
    const parchmentMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfef8e6,
        emissive: 0xffe4a8,
        emissiveIntensity: 0.45,
        roughness: 0.45,
      }),
    );
    const bookSpots = [
      { x: -4.2, y: 1.55, z: 9.8, scale: 0.95, phase: 0.0 },
      { x: -2.2, y: 2.35, z: 4.5, scale: 0.85, phase: 1.2 },
      { x: -6.9, y: 2.45, z: 5.8, scale: 0.8, phase: 2.3 },
      { x: 1.8, y: 2.35, z: 5.7, scale: 0.8, phase: 3.4 },
    ];
    bookSpots.forEach((bs, idx) => {
      const bookRoot = new THREE.Group();
      bookRoot.position.set(bs.x, bs.y, bs.z);
      bookRoot.scale.setScalar(bs.scale);

      const spine = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.08, 0.06, 0.54)),
        materials.antiqueGold,
      );
      bookRoot.add(spine);

      const leftWing = new THREE.Group();
      leftWing.name = `BookLeft_${idx}`;
      const leftCover = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.42, 0.035, 0.56)),
        materials.royalBlueBrocade,
      );
      leftCover.position.set(-0.22, 0, 0);
      const leftPage = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.38, 0.03, 0.5)),
        parchmentMat,
      );
      leftPage.position.set(-0.21, 0.035, 0);
      leftWing.add(leftCover, leftPage);

      const rightWing = new THREE.Group();
      rightWing.name = `BookRight_${idx}`;
      const rightCover = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.42, 0.035, 0.56)),
        materials.royalBlueBrocade,
      );
      rightCover.position.set(0.22, 0, 0);
      const rightPage = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.38, 0.03, 0.5)),
        parchmentMat,
      );
      rightPage.position.set(0.21, 0.035, 0);
      rightWing.add(rightCover, rightPage);

      bookRoot.add(leftWing, rightWing);
      bookRoot.rotation.x = 0.28;
      scene.add(bookRoot);

      const bookMixer = new THREE.AnimationMixer(bookRoot);
      const lOpen = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.35));
      const lClosed = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -1.25));
      const rOpen = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.35));
      const rClosed = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 1.25));
      const clip = new THREE.AnimationClip(`SpellbookFlutter_${idx}`, 4.0, [
        new THREE.QuaternionKeyframeTrack(
          `BookLeft_${idx}.quaternion`,
          [0, 2, 4],
          [lOpen.x, lOpen.y, lOpen.z, lOpen.w, lClosed.x, lClosed.y, lClosed.z, lClosed.w, lOpen.x, lOpen.y, lOpen.z, lOpen.w],
        ),
        new THREE.QuaternionKeyframeTrack(
          `BookRight_${idx}.quaternion`,
          [0, 2, 4],
          [rOpen.x, rOpen.y, rOpen.z, rOpen.w, rClosed.x, rClosed.y, rClosed.z, rClosed.w, rOpen.x, rOpen.y, rOpen.z, rOpen.w],
        ),
      ]);
      const action = bookMixer.clipAction(clip);
      action.time = bs.phase;
      action.play();
      mixers.push(bookMixer);

      floatingBooks.push({ group: bookRoot, baseY: bs.y, phase: bs.phase });
    });

    // 10. All 4 Existing Playable Characters (Ayden, Elena, Ryan, Eva) — untouched designs!
    const heroPlacements: Array<{ id: HeroId; x: number; z: number; rotY: number; phase: number }> = [
      { id: 'ayden', x: -5.4, z: 8.8, rotY: 0.35, phase: 0.0 },
      { id: 'elena', x: -3.4, z: 9.4, rotY: 0.14, phase: 1.6 },
      { id: 'ryan', x: -1.3, z: 9.3, rotY: -0.12, phase: 3.1 },
      { id: 'eva', x: 0.85, z: 8.7, rotY: -0.36, phase: 4.5 },
    ];
    const heroActors: HeroActor[] = heroPlacements.map((hp) => {
      const rig = createHeroCharacter(hp.id);
      rig.root.position.set(hp.x, 0.08, hp.z);
      rig.root.rotation.y = hp.rotY;
      rig.auraRing.visible = false;
      scene.add(rig.root);
      heroRigs.push(rig);
      return {
        id: hp.id,
        rig,
        basePos: new THREE.Vector3(hp.x, 0.08, hp.z),
        baseRotY: hp.rotY,
        phase: hp.phase,
      };
    });

    // 11. 3 Interactive Animated 3D Role Portals (MURID, GURU, PENTADBIR)
    const portalConfigs: Array<{
      role: UserRole;
      label: string;
      sublabel: string;
      x: number;
      z: number;
      rotY: number;
      innerColor: number;
      outerColor: number;
      accentHex: string;
    }> = [
      {
        role: 'student',
        label: 'MURID',
        sublabel: 'Portal Pengembaraan',
        x: -6.3,
        z: 4.8,
        rotY: 0.22,
        innerColor: 0x7be0e6,
        outerColor: 0x2563eb,
        accentHex: '#7BE0E6',
      },
      {
        role: 'teacher',
        label: 'GURU',
        sublabel: 'Portal Pemantauan',
        x: -2.3,
        z: 3.5,
        rotY: 0.0,
        innerColor: 0x6ee7b7,
        outerColor: 0x059669,
        accentHex: '#6EE7B7',
      },
      {
        role: 'admin',
        label: 'PENTADBIR',
        sublabel: 'Portal Tadbir Urus',
        x: 1.7,
        z: 4.8,
        rotY: -0.22,
        innerColor: 0xd8b4fe,
        outerColor: 0x7e22ce,
        accentHex: '#D8B4FE',
      },
    ];

    const portalRigs: PortalRig[] = [];
    const hitMeshes: THREE.Mesh[] = [];

    portalConfigs.forEach((pc) => {
      const pGroup = new THREE.Group();
      pGroup.position.set(pc.x, 0.08, pc.z);
      pGroup.rotation.y = pc.rotY;

      // Stepped marble plinth
      const plinth1 = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(1.75, 1.9, 0.22, 16)),
        materials.warmIvoryMarble,
      );
      plinth1.position.y = 0.11;
      pGroup.add(plinth1);

      const plinth2 = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(1.42, 1.55, 0.2, 16)),
        materials.champagneGold,
      );
      plinth2.position.y = 0.31;
      pGroup.add(plinth2);

      // Ornate Gate Pillars & Arch Frame
      [-1.08, 1.08].forEach((px) => {
        const pillar = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.16, 0.22, 2.7, 10)),
          materials.pearlIvory,
        );
        pillar.position.set(px, 1.65, 0);
        pGroup.add(pillar);

        const cap = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.24, 0.18, 0.2, 10)),
          materials.antiqueGold,
        );
        cap.position.set(px, 3.05, 0);
        pGroup.add(cap);
      });

      const frameAccentMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: pc.innerColor,
          emissive: pc.outerColor,
          emissiveIntensity: 0.65,
          roughness: 0.22,
          metalness: 0.35,
        }),
      );

      const archFrame = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(1.12, 0.13, 10, 28, Math.PI)),
        materials.antiqueGold,
      );
      archFrame.position.set(0, 3.0, 0);
      pGroup.add(archFrame);

      const innerRing = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(1.06, 0.05, 8, 32)),
        frameAccentMat,
      );
      innerRing.position.set(0, 2.1, 0);
      pGroup.add(innerRing);

      const outerRing = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(1.26, 0.035, 8, 36)),
        materials.champagneGold,
      );
      outerRing.position.set(0, 2.1, 0);
      pGroup.add(outerRing);

      // Swirling Energy Disc
      const vortexMat = trackMat(createPortalVortexShader(pc.innerColor, pc.outerColor));
      const vortexDisc = new THREE.Mesh(
        trackGeo(new THREE.CircleGeometry(1.04, 32)),
        vortexMat,
      );
      vortexDisc.position.set(0, 2.1, 0.02);
      pGroup.add(vortexDisc);

      // Crisp 3D Keystone Nameplate Plaque (MURID / GURU / PENTADBIR)
      const plaqueTex = trackTex(createPortalPlaqueTexture(pc.label, pc.sublabel, pc.accentHex));
      const plaqueMat = trackMat(
        new THREE.MeshBasicMaterial({ map: plaqueTex }),
      );
      const plaqueMesh = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(1.85, 0.58)), plaqueMat);
      plaqueMesh.position.set(0, 3.68, 0.12);
      pGroup.add(plaqueMesh);

      const plaqueBacking = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(1.94, 0.66, 0.1)),
        materials.antiqueGold,
      );
      plaqueBacking.position.set(0, 3.68, 0.05);
      pGroup.add(plaqueBacking);

      // Role-Specific Floating Emblem & Orbiting Effects
      const emblemGroup = new THREE.Group();
      emblemGroup.position.set(0, 4.45, 0);
      pGroup.add(emblemGroup);

      const orbitGroup = new THREE.Group();
      orbitGroup.position.set(0, 2.1, 0);
      pGroup.add(orbitGroup);

      if (pc.role === 'student') {
        // Pulsating Golden Crown Emblem + Orbiting Sapphire Crystals
        const crownBase = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.28, 0.22, 0.16, 6)),
          materials.champagneGold,
        );
        emblemGroup.add(crownBase);
        for (let pt = 0; pt < 5; pt++) {
          const a = (pt / 5) * Math.PI * 2;
          const spike = new THREE.Mesh(
            trackGeo(new THREE.ConeGeometry(0.06, 0.22, 5)),
            materials.candleFlame,
          );
          spike.position.set(Math.cos(a) * 0.22, 0.16, Math.sin(a) * 0.22);
          emblemGroup.add(spike);
        }
        for (let c = 0; c < 4; c++) {
          const a = (c / 4) * Math.PI * 2;
          const crys = new THREE.Mesh(
            trackGeo(new THREE.OctahedronGeometry(0.14, 0)),
            frameAccentMat,
          );
          crys.scale.set(0.7, 1.5, 0.7);
          crys.position.set(Math.cos(a) * 1.38, Math.sin(a * 2) * 0.3, Math.sin(a) * 0.38);
          orbitGroup.add(crys);
        }
      } else if (pc.role === 'teacher') {
        // Floating Glowing Open Book Pages + Emerald Wisdom Gem
        const gem = new THREE.Mesh(
          trackGeo(new THREE.OctahedronGeometry(0.26, 0)),
          frameAccentMat,
        );
        emblemGroup.add(gem);
        for (let pg = 0; pg < 4; pg++) {
          const a = (pg / 4) * Math.PI * 2;
          const page = new THREE.Mesh(
            trackGeo(new THREE.PlaneGeometry(0.26, 0.34)),
            parchmentMat,
          );
          page.position.set(Math.cos(a) * 1.32, (pg % 2 === 0 ? 0.25 : -0.25), Math.sin(a) * 0.35);
          page.rotation.y = a;
          page.rotation.x = 0.3;
          orbitGroup.add(page);
        }
      } else {
        // Rotating Royal Crest + Glowing Golden Ornaments
        const crestDisc = new THREE.Mesh(
          trackGeo(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 16)),
          materials.royalCrestMat,
        );
        crestDisc.rotation.x = Math.PI / 2;
        const crestRing = new THREE.Mesh(
          trackGeo(new THREE.TorusGeometry(0.36, 0.05, 8, 24)),
          materials.antiqueGold,
        );
        emblemGroup.add(crestDisc, crestRing);
        for (let o = 0; o < 4; o++) {
          const a = (o / 4) * Math.PI * 2;
          const orb = new THREE.Mesh(
            trackGeo(new THREE.SphereGeometry(0.11, 10, 10)),
            materials.candleFlame,
          );
          orb.position.set(Math.cos(a) * 1.36, Math.cos(a) * 0.24, Math.sin(a) * 0.42);
          orbitGroup.add(orb);
        }
      }

      // Portal Rising Magic Particles
      const pCount = perfReduced ? 18 : 34;
      const pPos = new Float32Array(pCount * 3);
      for (let i = 0; i < pCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const rad = 0.3 + Math.random() * 1.05;
        pPos[i * 3] = Math.cos(a) * rad;
        pPos[i * 3 + 1] = 0.4 + Math.random() * 3.1;
        pPos[i * 3 + 2] = Math.sin(a) * 0.45;
      }
      const pGeo = trackGeo(new THREE.BufferGeometry());
      pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
      const pMat = trackMat(
        new THREE.PointsMaterial({
          map: glowSprite,
          color: pc.innerColor,
          size: 0.32,
          transparent: true,
          opacity: 0.72,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      const particles = new THREE.Points(pGeo, pMat);
      pGroup.add(particles);

      const glowLight = perfReduced ? null : new THREE.PointLight(pc.innerColor, 2.2, 8.5, 1.5);
      if (glowLight) {
        glowLight.position.set(0, 2.2, 0.9);
        pGroup.add(glowLight);
      }

      // Generous invisible raycast collider for responsive click & hover
      const hitMesh = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(2.8, 4.5, 1.4)),
        trackMat(new THREE.MeshBasicMaterial({ visible: false })),
      );
      hitMesh.position.set(0, 2.25, 0);
      hitMesh.userData.portalRole = pc.role;
      pGroup.add(hitMesh);
      hitMeshes.push(hitMesh);

      scene.add(pGroup);
      const worldCenter = new THREE.Vector3(pc.x, 2.1, pc.z);
      portalRigs.push({
        role: pc.role,
        group: pGroup,
        hitMesh,
        vortexMat,
        innerRing,
        outerRing,
        emblemGroup,
        orbitGroup,
        particles,
        particleBase: new Float32Array(pPos),
        glowLight,
        frameAccentMat,
        worldCenter,
        hoverScale: 1,
      });
    });

    // 12. Floating Golden Ambient Particles throughout Environment
    const dustCount = perfReduced ? 85 : 210;
    const dustPos = new Float32Array(dustCount * 3);
    const dustBase = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      const x = -19 + Math.random() * 34;
      const y = 0.5 + Math.random() * 14.5;
      const z = -22 + Math.random() * 34;
      dustPos[i * 3] = dustBase[i * 3] = x;
      dustPos[i * 3 + 1] = dustBase[i * 3 + 1] = y;
      dustPos[i * 3 + 2] = dustBase[i * 3 + 2] = z;
    }
    const dustGeo = trackGeo(new THREE.BufferGeometry());
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = trackMat(
      new THREE.PointsMaterial({
        map: glowSprite,
        color: 0xffe494,
        size: 0.34,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    const dustPoints = new THREE.Points(dustGeo, dustMat);
    scene.add(dustPoints);

    // 13. Raycasting, Mouse Parallax & Resize Handlers
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2(99, 99);
    const mouseParallax = { x: 0, y: 0 };
    let rayHoverRole: UserRole | null = null;

    const updatePointerCoords = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((clientY - rect.top) / rect.height) * 2 - 1);
      pointerNdc.set(nx, ny);
      mouseParallax.x = THREE.MathUtils.clamp(nx, -1, 1);
      mouseParallax.y = THREE.MathUtils.clamp(ny, -1, 1);
    };

    const onPointerMove = (e: PointerEvent) => {
      updatePointerCoords(e.clientX, e.clientY);
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(hitMeshes, false);
      const hitRole = (hits[0]?.object?.userData?.portalRole as UserRole | undefined) ?? null;
      if (hitRole !== rayHoverRole) {
        rayHoverRole = hitRole;
        renderer.domElement.style.cursor = hitRole ? 'pointer' : 'default';
        onHoverPortalRef.current(hitRole);
        if (hitRole) {
          soundEngine.playPortalHoverSound(hitRole);
        }
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      updatePointerCoords(e.clientX, e.clientY);
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(hitMeshes, false);
      const hitRole = (hits[0]?.object?.userData?.portalRole as UserRole | undefined) ?? null;
      if (hitRole) {
        soundEngine.playUiClickSound();
        onSelectPortalRef.current(hitRole);
      }
    };

    const onPointerLeave = () => {
      mouseParallax.x = 0;
      mouseParallax.y = 0;
      if (rayHoverRole) {
        rayHoverRole = null;
        renderer.domElement.style.cursor = 'default';
        onHoverPortalRef.current(null);
      }
    };

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('resize', onResize);

    // 14. Main Animation Loop
    const clock = new THREE.Clock();
    const camCurrentPos = new THREE.Vector3(-1.4, 5.1, 18.6);
    const camLookCurrent = new THREE.Vector3(0.4, 3.3, -2.0);
    const camDesiredPos = new THREE.Vector3();
    const camDesiredLook = new THREE.Vector3();

    let disposed = false;
    let frameId = 0;
    let elapsedTotal = 0;

    function afterDraw(callback: () => void) {
      let fired = false;
      const next = () => {
        if (fired || disposed) return;
        fired = true;
        frameId = window.setTimeout(callback, 42);
      };
      requestAnimationFrame(next);
      window.setTimeout(next, 95);
    }

    const tick = () => {
      if (disposed) return;
      const rawDt = Math.min(clock.getDelta(), 0.05);
      const isReduced = reducedMotionRef.current;
      const motionScale = isReduced ? 0.18 : 1.0;
      const dt = rawDt * motionScale;
      elapsedTotal += dt;
      const t = elapsedTotal;

      // Update AnimationMixers (floating books opening/closing + orbiting castle ornaments)
      for (const m of mixers) {
        m.update(dt);
      }

      // Floating book bobbing
      for (const b of floatingBooks) {
        b.group.position.y = b.baseY + Math.sin(t * 1.45 + b.phase) * 0.16;
        b.group.rotation.y = Math.sin(t * 0.6 + b.phase) * 0.22;
      }

      // Twinkling upper sky stars
      for (const sl of starLayers) {
        sl.mat.opacity = 0.22 + 0.72 * (0.5 + 0.5 * Math.sin(t * sl.speed + sl.phase));
      }

      // Drifting clouds
      for (const cl of clouds) {
        cl.group.position.x += cl.speed * dt;
        if (cl.group.position.x > 46) cl.group.position.x = -46;
        cl.group.position.z = cl.zBase + Math.sin(t * 0.25 + cl.speed) * 0.6;
      }

      // Floating islands + rotating crystals + waterfall splash rings
      for (const isl of floatingIslands) {
        isl.group.position.y = isl.baseY + Math.sin(t * isl.bobSpeed + isl.phase) * isl.bobAmp;
        for (let ci = 0; ci < isl.crystals.length; ci++) {
          isl.crystals[ci].rotation.y += dt * (0.55 + ci * 0.15);
        }
        for (const sr of isl.splashRings) {
          const pulse = 0.85 + 0.3 * Math.sin(t * 3.4 + isl.phase);
          sr.scale.setScalar(pulse);
        }
      }

      // Continuous flowing waterfall UV scroll
      waterfallTex.offset.y -= dt * 0.95;

      // Castle waving flags (vertex displacement)
      for (const wf of wavingFlags) {
        const attr = wf.mesh.geometry.attributes.position as THREE.BufferAttribute;
        const arr = attr.array as Float32Array;
        const base = wf.basePositions;
        for (let i = 0; i < attr.count; i++) {
          const bx = base[i * 3];
          const normX = bx / wf.width;
          const wave = Math.sin(t * 4.6 - normX * 4.4 + wf.phase) * 0.16 * normX;
          const lift = Math.cos(t * 3.1 - normX * 3.0 + wf.phase) * 0.04 * normX;
          arr[i * 3 + 1] = base[i * 3 + 1] + lift;
          arr[i * 3 + 2] = base[i * 3 + 2] + wave;
        }
        attr.needsUpdate = true;
      }

      // Castle animated glowing windows, clock hands, and sweeping magical light beams
      castleGlowWindowMat.emissiveIntensity = 1.05 + 0.45 * Math.sin(t * 1.9);
      castleBeaconLight.intensity = 3.8 + 1.2 * Math.sin(t * 1.4);
      clockMinuteHand.rotation.z = -t * 0.45;
      clockHourHand.rotation.z = -t * 0.06;
      for (const cb of castleBeams) {
        cb.pivot.rotation.z = cb.baseRotZ + Math.sin(t * cb.speed + cb.phase) * 0.18;
      }

      // Royal terrace swaying curtains & animated fountains
      for (const sc of swayingCurtains) {
        sc.mesh.rotation.x = sc.baseRotX + Math.sin(t * 1.65 + sc.phase) * 0.06;
        sc.mesh.rotation.z = Math.cos(t * 1.15 + sc.phase) * 0.04;
      }
      for (const wd of fountainWaterDiscs) {
        wd.rotation.z += dt * 0.5;
      }
      for (const fj of fountainJets) {
        const cyc = (t * 1.8 + fj.phase) % 1;
        fj.mesh.position.y = fj.baseY + Math.sin(cyc * Math.PI) * 0.65 - cyc * 0.95;
      }

      // Magical butterflies gliding & flapping wings
      for (const bf of butterflies) {
        const a = t * bf.speed + bf.phase;
        const nx = bf.center.x + Math.sin(a) * bf.rx;
        const nz = bf.center.z + Math.sin(a * 1.5) * bf.rz;
        const ny = bf.center.y + Math.sin(a * 2.2) * 0.38;
        bf.group.rotation.y = Math.atan2(nx - bf.group.position.x, nz - bf.group.position.z);
        bf.group.position.set(nx, ny, nz);
        const flap = Math.sin(t * bf.flapSpeed + bf.phase) * 0.85;
        bf.leftWing.rotation.z = flap;
        bf.rightWing.rotation.z = -flap;
      }

      // Golden dust motes floating gracefully upward
      const dustAttr = dustGeo.attributes.position as THREE.BufferAttribute;
      const dArr = dustAttr.array as Float32Array;
      for (let i = 0; i < dustCount; i++) {
        const ix = i * 3;
        dArr[ix] = dustBase[ix] + Math.sin(t * 0.55 + i) * 0.45;
        dArr[ix + 1] = ((dustBase[ix + 1] + t * 0.42 + (i % 7) * 0.25) % 14.5) + 0.4;
        dArr[ix + 2] = dustBase[ix + 2] + Math.cos(t * 0.45 + i * 0.7) * 0.45;
      }
      dustAttr.needsUpdate = true;

      // Living Hero Characters (Ayden, Elena, Ryan, Eva) with distinct periodic actions
      for (let hi = 0; hi < heroActors.length; hi++) {
        const h = heroActors[hi];
        const cycle = (t + h.phase) % 12;
        let state: CharacterAnimState = 'idle';
        if (!isReduced) {
          if (cycle > 7.5 && cycle < 9.4) {
            state = hi === 2 ? 'victory' : 'interact';
          } else if (cycle >= 9.4 && cycle < 11.4) {
            state = 'talk';
          }
        }
        h.rig.updateAnimation(state, Math.max(rawDt, 0.008), t);
        h.rig.root.rotation.y = h.baseRotY + Math.sin(t * 0.45 + h.phase) * 0.08;
      }

      // 3 Interactive Animated 3D Portals
      const activeFocus = enteringRoleRef.current ?? hoveredRoleRef.current ?? selectedRoleRef.current;
      for (const pr of portalRigs) {
        const isHovered = hoveredRoleRef.current === pr.role;
        const isSelected = selectedRoleRef.current === pr.role;
        const isEntering = enteringRoleRef.current === pr.role;
        const targetScale = isEntering ? 1.24 : isHovered ? 1.13 : isSelected ? 1.07 : 1.0;
        const scaleLerp = 1 - Math.exp(-8 * rawDt);
        pr.hoverScale = THREE.MathUtils.lerp(pr.hoverScale, targetScale, scaleLerp);
        pr.group.scale.setScalar(pr.hoverScale);

        const boost = isEntering ? 2.2 : isHovered ? 1.65 : isSelected ? 1.3 : 1.0;
        pr.vortexMat.uniforms.uTime.value = t;
        pr.vortexMat.uniforms.uBoost.value = THREE.MathUtils.lerp(
          pr.vortexMat.uniforms.uBoost.value,
          boost,
          scaleLerp,
        );

        pr.innerRing.rotation.z += dt * (isHovered ? 1.45 : 0.55);
        pr.outerRing.rotation.z -= dt * (isHovered ? 1.1 : 0.38);
        pr.emblemGroup.rotation.y += dt * (isHovered ? 2.3 : 0.95);
        pr.emblemGroup.position.y = 4.45 + Math.sin(t * 2.2 + pr.worldCenter.x) * 0.09;
        pr.orbitGroup.rotation.z += dt * (isHovered ? 1.7 : 0.72);
        pr.frameAccentMat.emissiveIntensity = isHovered ? 1.6 : isSelected ? 1.15 : 0.65;
        if (pr.glowLight) {
          pr.glowLight.intensity = isHovered ? 4.4 : isSelected ? 3.2 : 2.1;
        }

        // Portal particles shimmer & lift
        const ppAttr = pr.particles.geometry.attributes.position as THREE.BufferAttribute;
        const ppArr = ppAttr.array as Float32Array;
        const ppCount = ppArr.length / 3;
        const speedMult = isHovered ? 2.2 : 1.0;
        for (let pi = 0; pi < ppCount; pi++) {
          const idx = pi * 3;
          ppArr[idx + 1] = ((pr.particleBase[idx + 1] + t * 0.8 * speedMult) % 3.4) + 0.35;
          ppArr[idx] = pr.particleBase[idx] + Math.sin(t * 1.9 + pi) * (isHovered ? 0.22 : 0.1);
        }
        ppAttr.needsUpdate = true;
        (pr.particles.material as THREE.PointsMaterial).opacity = isHovered ? 0.96 : isSelected ? 0.82 : 0.58;
        (pr.particles.material as THREE.PointsMaterial).size = isHovered ? 0.42 : 0.32;
      }

      // Cinematic Camera Parallax + Portal Focus + Zoom-In Transition
      const isDesktopWide = (container.clientWidth || window.innerWidth) >= 1024;
      const desktopRightShift = isDesktopWide ? 2.55 : 0.0;
      const enterTarget = enteringRoleRef.current
        ? portalRigs.find((p) => p.role === enteringRoleRef.current)
        : null;

      if (enterTarget) {
        const portalForward = new THREE.Vector3(0, 0, 1).applyEuler(enterTarget.group.rotation);
        camDesiredPos
          .copy(enterTarget.worldCenter)
          .addScaledVector(portalForward, 2.15)
          .add(new THREE.Vector3(0, 0.25, 0));
        camDesiredLook.copy(enterTarget.worldCenter);
        const zoomLerp = 1 - Math.exp(-5.4 * rawDt);
        camCurrentPos.lerp(camDesiredPos, zoomLerp);
        camLookCurrent.lerp(camDesiredLook, zoomLerp);
      } else {
        const focusPortal = portalRigs.find((p) => p.role === activeFocus);
        const focusBiasX = focusPortal ? (focusPortal.worldCenter.x + 2.3) * 0.26 : 0;
        const pxAmp = isReduced ? 0.2 : 1.35;
        const pyAmp = isReduced ? 0.1 : 0.65;

        camDesiredPos.set(
          -1.4 + desktopRightShift * 0.35 + focusBiasX + mouseParallax.x * pxAmp,
          5.05 + mouseParallax.y * pyAmp,
          18.6 - (hoveredRoleRef.current ? 0.65 : 0),
        );
        camDesiredLook.set(
          desktopRightShift + focusBiasX * 0.9 - mouseParallax.x * 0.45,
          3.25 - mouseParallax.y * 0.3,
          -2.4,
        );

        const dampFactor = 1 - Math.exp(-4.5 * rawDt);
        camCurrentPos.lerp(camDesiredPos, dampFactor);
        camLookCurrent.lerp(camDesiredLook, dampFactor);
      }

      camera.position.copy(camCurrentPos);
      camera.lookAt(camLookCurrent);

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('resize', onResize);

      heroRigs.forEach((r) => r.dispose());
      geometries.forEach((g) => g.dispose());
      customMats.forEach((m) => m.dispose());
      customTextures.forEach((tx) => tx.dispose());
      materials.dispose();
      envTex.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full select-none"
      aria-label="Dunia Fantasi 3D Kingdom of Stories"
    />
  );
};
