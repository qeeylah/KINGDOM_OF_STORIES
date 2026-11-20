import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { soundEngine } from '../audio/soundEngine';
import { LOCATIONS } from '../data/gameContent';
import type { VoiceTelemetry } from '../game/atelierChambers';
import { type CharacterAnimState, type CharacterRig, createHeroCharacter } from '../game/characters';
import { createKingdomMaterials, type MaterialPalette } from '../game/materials';
import { type BuiltWorld, type InteractAction, type InteractablePoint, buildWorldScene } from '../game/worlds';
import type { HeroId, LocationId, PlayerProgress } from '../types/game';

export type CameraMode = 'classic' | 'shoulder' | 'scenic';
export type AtelierZone = 'lobby' | 'workshop' | 'studio';

export interface AtelierWarpRequest {
  seq: number;
  x: number;
  z: number;
  yaw: number;
}

export interface AutoPortalRequest {
  seq: number;
  missionNumber: 1 | 2 | 3 | 4 | 5;
}

interface GameViewport3DProps {
  progress: PlayerProgress;
  paused: boolean;
  isTalking?: boolean;
  cameraMode: CameraMode;
  mobileMoveInput: { x: number; y: number };
  mobileRun: boolean;
  jumpTrigger: number;
  interactTrigger: number;
  victoryTrigger: number;
  palaceIntroTrigger: number;
  atelierWarp?: AtelierWarpRequest | null;
  autoPortalRequest?: AutoPortalRequest | null;
  voiceTelemetryRef?: React.MutableRefObject<VoiceTelemetry>;
  onAtelierZoneChange?: (zone: AtelierZone) => void;
  onNearInteractable: (item: InteractablePoint | null) => void;
  onInteract: (action: InteractAction, item: InteractablePoint) => void;
  onAutoPortalArrived?: (targetLocation: LocationId, missionNumber: 1 | 2 | 3 | 4 | 5) => void;
  onRequestPortalAutoEntry?: (missionNumber: 1 | 2 | 3 | 4 | 5) => void;
  onPalaceIntroActiveChange?: (active: boolean) => void;
}

const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _desiredCamPos = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _introCam = new THREE.Vector3();
const _introLook = new THREE.Vector3();
const _portalCamPos = new THREE.Vector3();
const _portalLookAt = new THREE.Vector3();
const _portalForward = new THREE.Vector3();
const _rayPointer = new THREE.Vector2();

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

export const GameViewport3D: React.FC<GameViewport3DProps> = ({
  progress,
  paused,
  isTalking = false,
  cameraMode,
  mobileMoveInput,
  mobileRun,
  jumpTrigger,
  interactTrigger,
  victoryTrigger,
  palaceIntroTrigger,
  atelierWarp,
  autoPortalRequest,
  voiceTelemetryRef,
  onAtelierZoneChange,
  onNearInteractable,
  onInteract,
  onAutoPortalArrived,
  onRequestPortalAutoEntry,
  onPalaceIntroActiveChange,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const [introActive, setIntroActive] = useState(false);

  const progressRef = useRef(progress);
  const pausedRef = useRef(paused);
  const isTalkingRef = useRef(isTalking);
  const cameraModeRef = useRef(cameraMode);
  const mobileInputRef = useRef(mobileMoveInput);
  const mobileRunRef = useRef(mobileRun);
  const onNearRef = useRef(onNearInteractable);
  const onInteractRef = useRef(onInteract);
  const onAutoArrivedRef = useRef(onAutoPortalArrived);
  const onRequestPortalAutoEntryRef = useRef(onRequestPortalAutoEntry);
  const onIntroChangeRef = useRef(onPalaceIntroActiveChange);
  const onAtelierZoneRef = useRef(onAtelierZoneChange);

  progressRef.current = progress;
  pausedRef.current = paused;
  isTalkingRef.current = isTalking;
  cameraModeRef.current = cameraMode;
  mobileInputRef.current = mobileMoveInput;
  mobileRunRef.current = mobileRun;
  onNearRef.current = onNearInteractable;
  onInteractRef.current = onInteract;
  onAutoArrivedRef.current = onAutoPortalArrived;
  onRequestPortalAutoEntryRef.current = onRequestPortalAutoEntry;
  onIntroChangeRef.current = onPalaceIntroActiveChange;
  onAtelierZoneRef.current = onAtelierZoneChange;

  const pendingJumpRef = useRef(false);
  const pendingInteractRef = useRef(false);
  const victoryUntilRef = useRef(0);
  const introTimerRef = useRef<number | null>(null);
  const pendingWarpRef = useRef<{ x: number; z: number; yaw: number } | null>(null);
  const pendingAutoPortalRef = useRef<AutoPortalRequest | null>(null);

  useEffect(() => {
    if (atelierWarp) {
      pendingWarpRef.current = { x: atelierWarp.x, z: atelierWarp.z, yaw: atelierWarp.yaw };
    }
  }, [atelierWarp]);

  useEffect(() => {
    if (autoPortalRequest) {
      pendingAutoPortalRef.current = autoPortalRequest;
    }
  }, [autoPortalRequest]);

  useEffect(() => {
    if (jumpTrigger > 0) pendingJumpRef.current = true;
  }, [jumpTrigger]);

  useEffect(() => {
    if (interactTrigger > 0) pendingInteractRef.current = true;
  }, [interactTrigger]);

  useEffect(() => {
    if (victoryTrigger > 0) victoryUntilRef.current = performance.now() + 2600;
  }, [victoryTrigger]);

  useEffect(() => {
    if (palaceIntroTrigger > 0 && progressRef.current.currentLocation === 'citadel') {
      introTimerRef.current = 0;
      setIntroActive(true);
      onIntroChangeRef.current?.(true);
    }
  }, [palaceIntroTrigger]);

  const skipPalaceIntro = () => {
    introTimerRef.current = null;
    setIntroActive(false);
    onIntroChangeRef.current?.(false);
  };

  const rebuildWorldRef = useRef<((loc: LocationId, p: PlayerProgress) => void) | null>(null);
  const rebuildHeroRef = useRef<((heroId: HeroId) => void) | null>(null);

  const fragmentKey = progress.collectedFragmentIds.join(',');
  const missionsKey = progress.completedMissions.join(',');
  const unlockedKey = progress.unlockedLocations.join(',');
  useEffect(() => {
    rebuildWorldRef.current?.(progress.currentLocation, progress);
  }, [
    progress.currentLocation,
    fragmentKey,
    missionsKey,
    unlockedKey,
    progress.festivalUnlocked,
    progress.selectedHero,
  ]);

  useEffect(() => {
    rebuildHeroRef.current?.(progress.selectedHero);
  }, [progress.selectedHero]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const scene = new THREE.Scene();
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      54,
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
      0.1,
      240,
    );

    // Bright Luxurious Imperial Royal Fantasy Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xfff9ee, 0x8d82aa, 1.18);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1d4, 1.55);
    keyLight.position.set(16, 26, 18);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 85;
    const d = 28;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x7be0e6, 0.58);
    rimLight.position.set(-18, 14, -20);
    scene.add(rimLight);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const materials: MaterialPalette = createKingdomMaterials(maxAnisotropy, isSoftwareGl);

    let currentHero: CharacterRig | null = null;
    let currentWorld: BuiltWorld | null = null;
    let activeLocationId: LocationId | null = null;

    // Player physics & stride state
    const playerPos = new THREE.Vector3(0, 0, 12);
    let playerYaw = Math.PI;
    let verticalVel = 0;
    let isGrounded = true;
    let interactAnimUntil = 0;
    let lastReportedNearId: string | null = null;
    let stridePhase = 0;

    // Camera orbit state
    let camYaw = 0;
    let camPitch = 0.32;
    let camDistance = 7.6;
    let zoneExtraDist = 0;
    let zoneExtraHeight = 0;
    let lastAtelierZone: AtelierZone = 'lobby';
    let isDraggingCam = false;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let pointerDownX = 0;
    let pointerDownY = 0;
    const raycaster = new THREE.Raycaster();

    interface AutoEntryState {
      missionNumber: 1 | 2 | 3 | 4 | 5;
      targetLocation: LocationId;
      portalPos: THREE.Vector3;
      approachPos: THREE.Vector3;
      entryPos: THREE.Vector3;
      reachedApproach: boolean;
      phase: 'focus' | 'run' | 'enter';
      timer: number;
    }
    let autoEntry: AutoEntryState | null = null;

    const buildHero = (heroId: HeroId) => {
      if (currentHero) {
        scene.remove(currentHero.root);
        currentHero.dispose();
      }
      currentHero = createHeroCharacter(heroId);
      currentHero.root.scale.setScalar(1);
      currentHero.root.position.copy(playerPos);
      currentHero.root.rotation.y = playerYaw;
      scene.add(currentHero.root);
    };

    const loadWorld = (locId: LocationId, prog: PlayerProgress) => {
      const locationChanged = activeLocationId !== locId;
      activeLocationId = locId;

      if (currentWorld) {
        scene.remove(currentWorld.group);
        currentWorld.dispose();
      }
      currentWorld = buildWorldScene(locId, materials, prog, isSoftwareGl);
      scene.add(currentWorld.group);
      scene.background = new THREE.Color(currentWorld.skyColor);
      scene.fog = new THREE.FogExp2(currentWorld.fogColor, currentWorld.fogDensity);

      if (locId === 'gate_hall') {
        renderer.toneMappingExposure = 1.08;
        hemiLight.color.setHex(0xf6f0ff);
        hemiLight.groundColor.setHex(0x4b4274);
        hemiLight.intensity = 1.05;
        keyLight.color.setHex(0xffe8ba);
        keyLight.intensity = 1.38;
        rimLight.color.setHex(0x7be0e6);
        rimLight.intensity = 0.62;
      } else if (locId === 'citadel') {
        renderer.toneMappingExposure = 1.02;
        hemiLight.color.setHex(0xfff4e2);
        hemiLight.groundColor.setHex(0x6b5c8a);
        hemiLight.intensity = 0.84;
        keyLight.color.setHex(0xffe4b8);
        keyLight.intensity = 1.18;
        rimLight.color.setHex(0x9cd8ea);
        rimLight.intensity = 0.44;
      } else if (locId === 'library') {
        renderer.toneMappingExposure = 1.08;
        hemiLight.color.setHex(0xfbf1ff);
        hemiLight.groundColor.setHex(0x5b4d82);
        hemiLight.intensity = 1.05;
        keyLight.color.setHex(0xffe4a8);
        keyLight.intensity = 1.38;
        rimLight.color.setHex(0x7be0e6);
        rimLight.intensity = 0.62;
      } else if (locId === 'woods') {
        renderer.toneMappingExposure = 1.08;
        hemiLight.color.setHex(0xe8fbff);
        hemiLight.groundColor.setHex(0x3a6e59);
        hemiLight.intensity = 1.15;
        keyLight.color.setHex(0xffeab8);
        keyLight.intensity = 1.48;
        rimLight.color.setHex(0x62dce8);
        rimLight.intensity = 0.66;
      } else if (locId === 'atelier') {
        renderer.toneMappingExposure = 1.08;
        hemiLight.color.setHex(0xf6edff);
        hemiLight.groundColor.setHex(0x4a3875);
        hemiLight.intensity = 1.04;
        keyLight.color.setHex(0xffe5b0);
        keyLight.intensity = 1.38;
        rimLight.color.setHex(0x8ee6f2);
        rimLight.intensity = 0.62;
      } else if (locId === 'theatre') {
        renderer.toneMappingExposure = 1.08;
        hemiLight.color.setHex(0xfff1d8);
        hemiLight.groundColor.setHex(0x4b2458);
        hemiLight.intensity = 1.05;
        keyLight.color.setHex(0xffe2a4);
        keyLight.intensity = 1.38;
        rimLight.color.setHex(0xe8b8ff);
        rimLight.intensity = 0.62;
      } else {
        renderer.toneMappingExposure = 1.12;
        hemiLight.color.setHex(0xfff9ee);
        hemiLight.groundColor.setHex(0x8d82aa);
        hemiLight.intensity = 1.18;
        keyLight.color.setHex(0xfff1d4);
        keyLight.intensity = 1.55;
        rimLight.color.setHex(0x7be0e6);
        rimLight.intensity = 0.58;
      }

      if (locationChanged) {
        lastAtelierZone = 'lobby';
        onAtelierZoneRef.current?.('lobby');
        autoEntry = null;
        zoneExtraDist = 0;
        zoneExtraHeight = 0;
        const isMainHub = locId === 'citadel' || locId === 'gate_hall';
        camDistance = isMainHub ? 8.4 : 7.6;
        camera.fov = isMainHub ? 56 : 54;
        camera.updateProjectionMatrix();

        const locDef = LOCATIONS.find((l) => l.id === locId) || LOCATIONS[0];
        const spawn = locDef?.spawnPosition || [0, 0, 12];
        playerPos.set(spawn[0], currentWorld.groundHeightAt(spawn[0], spawn[2]), spawn[2]);
        playerYaw = Math.PI;
        camYaw = 0;
        verticalVel = 0;
        isGrounded = true;
        if (currentHero) {
          currentHero.root.scale.setScalar(1);
          currentHero.root.position.copy(playerPos);
          currentHero.root.rotation.y = playerYaw;
        }
        camera.position.set(playerPos.x, playerPos.y + 3.4, playerPos.z + camDistance);
        camera.lookAt(playerPos.x, playerPos.y + (isMainHub ? 2.0 : 1.4), isMainHub ? -4 : playerPos.z);
        lastReportedNearId = null;
        onNearRef.current(null);
      }
    };

    rebuildHeroRef.current = buildHero;
    rebuildWorldRef.current = loadWorld;

    buildHero(progressRef.current.selectedHero);
    loadWorld(progressRef.current.currentLocation, progressRef.current);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const keys: Record<string, boolean> = {};
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      keys[e.code] = true;
      if (e.code === 'Space') pendingJumpRef.current = true;
      if (e.code === 'KeyE') pendingInteractRef.current = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };

    const canvas = renderer.domElement;
    const onPointerDown = (e: PointerEvent) => {
      isDraggingCam = true;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      pointerDownX = e.clientX;
      pointerDownY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingCam || pausedRef.current || introTimerRef.current !== null || autoEntry !== null) return;
      const dx = e.clientX - lastPointerX;
      const dy = e.clientY - lastPointerY;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      camYaw -= dx * 0.0065;
      camPitch = THREE.MathUtils.clamp(camPitch + dy * 0.0055, 0.06, 0.95);
    };
    const onPointerUp = (e: PointerEvent) => {
      const wasDragging = isDraggingCam;
      isDraggingCam = false;
      if (
        !wasDragging ||
        pausedRef.current ||
        introTimerRef.current !== null ||
        autoEntry !== null ||
        (activeLocationId !== 'citadel' && activeLocationId !== 'gate_hall') ||
        !currentWorld
      ) {
        return;
      }
      const dragDist = Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY);
      if (dragDist >= 6) return;

      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      _rayPointer.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(_rayPointer, camera);
      const hits = raycaster.intersectObjects(currentWorld.group.children, true);
      for (const hit of hits) {
        const num = hit.object.userData?.portalMissionNumber as (1 | 2 | 3 | 4 | 5) | undefined;
        if (num) {
          onRequestPortalAutoEntryRef.current?.(num);
          break;
        }
      }
    };
    const onWheel = (e: WheelEvent) => {
      if (pausedRef.current || introTimerRef.current !== null || autoEntry !== null) return;
      camDistance = THREE.MathUtils.clamp(camDistance + e.deltaY * 0.005, 4.0, 14.5);
    };

    const onResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onResize);
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: true });

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    function resolveCollisions(pos: THREE.Vector3, world: BuiltWorld) {
      const playerRadius = 0.45;
      const distFromCenter = Math.hypot(pos.x, pos.z);
      if (distFromCenter > world.boundsRadius) {
        const scale = world.boundsRadius / distFromCenter;
        pos.x *= scale;
        pos.z *= scale;
      }

      if (world.roomRect) {
        pos.x = THREE.MathUtils.clamp(pos.x, world.roomRect.minX + 1.2, world.roomRect.maxX - 1.2);
        pos.z = THREE.MathUtils.clamp(pos.z, world.roomRect.minZ + 1.2, world.roomRect.maxZ - 1.2);
      }

      for (const c of world.circleColliders) {
        const dx = pos.x - c.x;
        const dz = pos.z - c.z;
        const minD = c.radius + playerRadius;
        const dist = Math.hypot(dx, dz);
        if (dist < minD && dist > 0.0001) {
          const push = (minD - dist) / dist;
          pos.x += dx * push;
          pos.z += dz * push;
        }
      }

      for (const b of world.boxColliders) {
        const closestX = THREE.MathUtils.clamp(pos.x, b.minX, b.maxX);
        const closestZ = THREE.MathUtils.clamp(pos.z, b.minZ, b.maxZ);
        const dx = pos.x - closestX;
        const dz = pos.z - closestZ;
        const distSq = dx * dx + dz * dz;
        if (distSq < playerRadius * playerRadius) {
          const dist = Math.sqrt(distSq);
          if (dist > 0.0001) {
            const push = (playerRadius - dist) / dist;
            pos.x += dx * push;
            pos.z += dz * push;
          } else {
            pos.z = b.maxZ + playerRadius;
          }
        }
      }
    }

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;

      if (currentWorld && currentHero) {
        if (pendingWarpRef.current) {
          const w = pendingWarpRef.current;
          pendingWarpRef.current = null;
          playerPos.set(w.x, currentWorld.groundHeightAt(w.x, w.z), w.z);
          playerYaw = w.yaw;
          camYaw = w.yaw + Math.PI;
          verticalVel = 0;
          isGrounded = true;
          lastReportedNearId = null;
          onNearRef.current(null);
          camera.position.set(
            playerPos.x + Math.sin(camYaw) * 6.5,
            playerPos.y + 3.2,
            playerPos.z + Math.cos(camYaw) * 6.5,
          );
          camera.lookAt(playerPos.x, playerPos.y + 1.45, playerPos.z);
        }

        // Initiate 1-click portal auto-entry sequence inside Balai Agung Diraja
        if (
          pendingAutoPortalRef.current &&
          (activeLocationId === 'citadel' || activeLocationId === 'gate_hall') &&
          currentWorld.portalTargets
        ) {
          const req = pendingAutoPortalRef.current;
          pendingAutoPortalRef.current = null;
          const target = currentWorld.portalTargets.find((p) => p.missionNumber === req.missionNumber);
          if (target) {
            currentWorld.setActivePortal?.(req.missionNumber);
            lastReportedNearId = null;
            onNearRef.current(null);
            const distHeroToApproach = Math.hypot(
              target.approachPosition.x - playerPos.x,
              target.approachPosition.z - playerPos.z,
            );
            const distHeroToEntry = Math.hypot(
              target.entryPosition.x - playerPos.x,
              target.entryPosition.z - playerPos.z,
            );
            autoEntry = {
              missionNumber: req.missionNumber,
              targetLocation: target.targetLocation,
              portalPos: target.portalPosition.clone(),
              approachPos: target.approachPosition.clone(),
              entryPos: target.entryPosition.clone(),
              reachedApproach: distHeroToEntry < 3.4 || distHeroToApproach < 0.9,
              phase: 'focus',
              timer: 0,
            };
          }
        }

        currentWorld.update(elapsed, dt, playerPos, voiceTelemetryRef?.current);

        // Automated 1-Click Portal Entry Choreography (Camera Focus -> Doors Swing Open -> Hero Auto-Runs -> Portal Enter)
        if (autoEntry && !pausedRef.current) {
          autoEntry.timer += dt;
          let autoAnim: CharacterAnimState = 'idle';

          const runTarget = autoEntry.reachedApproach ? autoEntry.entryPos : autoEntry.approachPos;
          const dx = runTarget.x - playerPos.x;
          const dz = runTarget.z - playerPos.z;
          const distToTarget = Math.hypot(dx, dz);

          const pfx = autoEntry.portalPos.x - playerPos.x;
          const pfz = autoEntry.portalPos.z - playerPos.z;
          const pfLen = Math.hypot(pfx, pfz) || 1;
          _portalForward.set(pfx / pfLen, 0, pfz / pfLen);

          if (autoEntry.phase === 'focus') {
            const targetYaw = Math.atan2(_portalForward.x, _portalForward.z);
            let diff = targetYaw - playerYaw;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            playerYaw += diff * (1 - Math.exp(-14 * dt));

            _portalCamPos.set(
              playerPos.x - _portalForward.x * 6.5 - _portalForward.z * 1.4,
              playerPos.y + 3.05,
              playerPos.z - _portalForward.z * 6.5 + _portalForward.x * 1.4,
            );
            _portalLookAt.set(
              THREE.MathUtils.lerp(playerPos.x, autoEntry.portalPos.x, 0.62),
              2.55,
              THREE.MathUtils.lerp(playerPos.z, autoEntry.portalPos.z, 0.62),
            );
            camera.position.lerp(_portalCamPos, 1 - Math.exp(-8.5 * dt));
            camera.lookAt(_portalLookAt);

            if (autoEntry.timer >= 0.45) {
              autoEntry.phase = 'run';
              autoEntry.timer = 0;
            }
          } else if (autoEntry.phase === 'run') {
            if (!autoEntry.reachedApproach && distToTarget <= 0.65) {
              autoEntry.reachedApproach = true;
            } else if ((autoEntry.reachedApproach && distToTarget <= 0.35) || autoEntry.timer > 3.2) {
              autoEntry.phase = 'enter';
              autoEntry.timer = 0;
              soundEngine.playPortalSound();
            } else {
              const speed = 11.2;
              const step = Math.min(speed * dt, distToTarget);
              _moveDir.set(dx / distToTarget, 0, dz / distToTarget);
              playerPos.x += _moveDir.x * step;
              playerPos.z += _moveDir.z * step;
              playerPos.y = currentWorld.groundHeightAt(playerPos.x, playerPos.z);
              stridePhase += step * 1.48;

              const targetYaw = Math.atan2(_moveDir.x, _moveDir.z);
              let diff = targetYaw - playerYaw;
              while (diff > Math.PI) diff -= Math.PI * 2;
              while (diff < -Math.PI) diff += Math.PI * 2;
              playerYaw += diff * (1 - Math.exp(-14 * dt));
              autoAnim = 'run';

              _portalCamPos.set(
                playerPos.x - _moveDir.x * 5.8 - _moveDir.z * 0.9,
                playerPos.y + 2.55,
                playerPos.z - _moveDir.z * 5.8 + _moveDir.x * 0.9,
              );
              _portalLookAt.set(
                THREE.MathUtils.lerp(playerPos.x, autoEntry.portalPos.x, 0.65),
                2.45,
                THREE.MathUtils.lerp(playerPos.z, autoEntry.portalPos.z, 0.65),
              );
              camera.position.lerp(_portalCamPos, 1 - Math.exp(-9 * dt));
              camera.lookAt(_portalLookAt);
            }
          } else {
            // Phase 'enter': step through wide-open royal doors into swirling vortex
            const u = Math.min(1, autoEntry.timer / 0.28);
            playerPos.x = THREE.MathUtils.lerp(playerPos.x, autoEntry.portalPos.x, 1 - Math.exp(-12 * dt));
            playerPos.z = THREE.MathUtils.lerp(playerPos.z, autoEntry.portalPos.z, 1 - Math.exp(-12 * dt));
            playerPos.y = THREE.MathUtils.lerp(0, 0.28, u);
            currentHero.root.scale.setScalar(THREE.MathUtils.lerp(1, 0.26, u));
            autoAnim = 'run';

            _portalLookAt.set(autoEntry.portalPos.x, 2.5, autoEntry.portalPos.z);
            camera.lookAt(_portalLookAt);

            if (autoEntry.timer >= 0.3) {
              const arrivedLoc = autoEntry.targetLocation;
              const arrivedNum = autoEntry.missionNumber;
              autoEntry = null;
              currentHero.root.scale.setScalar(1);
              currentWorld.setActivePortal?.(null);
              onAutoArrivedRef.current?.(arrivedLoc, arrivedNum);
            }
          }

          currentHero.root.position.copy(playerPos);
          currentHero.root.rotation.y = playerYaw;
          currentHero.updateAnimation(autoAnim, dt, elapsed, stridePhase);
          renderer.render(scene, camera);
          if (isSoftwareGl) afterDraw(tick);
          else frameId = requestAnimationFrame(tick);
          return;
        }

        // In-Engine 3D Palace Cinematic Intro Sequence (~7.5 seconds)
        if (introTimerRef.current !== null && activeLocationId === 'citadel') {
          introTimerRef.current += dt;
          const t = introTimerRef.current;
          const total = 7.5;
          if (t >= total) {
            introTimerRef.current = null;
            setIntroActive(false);
            onIntroChangeRef.current?.(false);
          } else {
            const u = t / total;
            if (u < 0.38) {
              // Phase 1: High majestic sweep under coffered ceiling & chandeliers toward Throne
              const k = u / 0.38;
              _introCam.set(THREE.MathUtils.lerp(-10, 4, k), THREE.MathUtils.lerp(11.5, 8.2, k), THREE.MathUtils.lerp(16, 2, k));
              _introLook.set(0, THREE.MathUtils.lerp(5.5, 4.2, k), -18);
            } else if (u < 0.72) {
              // Phase 2: Sweeping pan past curved staircases toward Royal Throne & Crest
              const k = (u - 0.38) / 0.34;
              _introCam.set(THREE.MathUtils.lerp(4, -5.5, k), THREE.MathUtils.lerp(8.2, 4.6, k), THREE.MathUtils.lerp(2, -9, k));
              _introLook.set(0, 3.8, -21);
            } else {
              // Phase 3: Smooth descent behind Hero
              const k = (u - 0.72) / 0.28;
              const smooth = k * k * (3 - 2 * k);
              _introCam.set(
                THREE.MathUtils.lerp(-5.5, playerPos.x, smooth),
                THREE.MathUtils.lerp(4.6, playerPos.y + 3.4, smooth),
                THREE.MathUtils.lerp(-9, playerPos.z + camDistance, smooth),
              );
              _introLook.set(
                THREE.MathUtils.lerp(0, playerPos.x, smooth),
                THREE.MathUtils.lerp(3.8, playerPos.y + 1.45, smooth),
                THREE.MathUtils.lerp(-21, playerPos.z, smooth),
              );
            }
            camera.position.lerp(_introCam, 1 - Math.exp(-6 * dt));
            camera.lookAt(_introLook);
            currentHero.updateAnimation('idle', dt, elapsed, stridePhase);
            renderer.render(scene, camera);
            if (isSoftwareGl) afterDraw(tick);
            else frameId = requestAnimationFrame(tick);
            return;
          }
        }

        let animState: CharacterAnimState = 'idle';
        if (!pausedRef.current) {
          const forwardInput =
            (keys['KeyW'] || keys['ArrowUp'] ? 1 : 0) -
            (keys['KeyS'] || keys['ArrowDown'] ? 1 : 0) +
            mobileInputRef.current.y;
          const rightInput =
            (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0) -
            (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0) +
            mobileInputRef.current.x;

          const isRunning = Boolean(keys['ShiftLeft'] || keys['ShiftRight'] || mobileRunRef.current);

          if (Math.abs(forwardInput) > 0.05 || Math.abs(rightInput) > 0.05) {
            _forward.set(-Math.sin(camYaw), 0, -Math.cos(camYaw)).normalize();
            _right.set(Math.cos(camYaw), 0, -Math.sin(camYaw)).normalize();
            _moveDir.set(0, 0, 0).addScaledVector(_forward, forwardInput).addScaledVector(_right, rightInput);
            if (_moveDir.lengthSq() > 0.001) {
              _moveDir.normalize();
              const moveSpeed = isRunning ? 8.2 : 4.8;
              playerPos.x += _moveDir.x * moveSpeed * dt;
              playerPos.z += _moveDir.z * moveSpeed * dt;
              // Sync stride frequency directly to ground displacement so zero foot sliding
              stridePhase += moveSpeed * dt * 1.48;

              const targetYaw = Math.atan2(_moveDir.x, _moveDir.z);
              let diff = targetYaw - playerYaw;
              while (diff > Math.PI) diff -= Math.PI * 2;
              while (diff < -Math.PI) diff += Math.PI * 2;
              playerYaw += diff * (1 - Math.exp(-12 * dt));

              animState = isRunning ? 'run' : 'walk';
            }
          }

          if (pendingJumpRef.current) {
            pendingJumpRef.current = false;
            if (isGrounded) {
              verticalVel = 7.4;
              isGrounded = false;
            }
          }

          resolveCollisions(playerPos, currentWorld);

          const groundY = currentWorld.groundHeightAt(playerPos.x, playerPos.z);
          if (!isGrounded || playerPos.y > groundY) {
            verticalVel -= 19.5 * dt;
            playerPos.y += verticalVel * dt;
            if (playerPos.y <= groundY) {
              playerPos.y = groundY;
              verticalVel = 0;
              isGrounded = true;
            } else {
              animState = 'jump';
            }
          } else {
            playerPos.y = groundY;
          }

          let nearest: InteractablePoint | null = null;
          let bestDist = Infinity;
          for (const item of currentWorld.interactables) {
            const dist = Math.hypot(playerPos.x - item.position.x, playerPos.z - item.position.z);
            if (dist <= item.radius && dist < bestDist) {
              bestDist = dist;
              nearest = item;
            }
          }

          const nearId = nearest ? nearest.id : null;
          if (nearId !== lastReportedNearId) {
            lastReportedNearId = nearId;
            onNearRef.current(nearest);
          }

          if (pendingInteractRef.current) {
            pendingInteractRef.current = false;
            if (nearest) {
              interactAnimUntil = performance.now() + 450;
              soundEngine.playInteractBeep();
              onInteractRef.current(nearest.action, nearest);
            }
          }
        } else {
          pendingJumpRef.current = false;
          pendingInteractRef.current = false;
        }

        if (performance.now() < victoryUntilRef.current) {
          animState = 'victory';
        } else if (isTalkingRef.current && animState === 'idle') {
          animState = 'talk';
        } else if (performance.now() < interactAnimUntil && animState === 'idle') {
          animState = 'interact';
        }

        currentHero.root.position.copy(playerPos);
        currentHero.root.rotation.y = playerYaw;
        currentHero.auraRing.scale.setScalar(
          progressRef.current.selectedHero === 'ayden' ? 1.05 + Math.sin(elapsed * 4) * 0.14 : 1.0,
        );
        currentHero.updateAnimation(animState, dt, elapsed, stridePhase);

        // Smooth chamber entry camera framing & zone detection inside Balai Cipta & Balai Gema
        let targetFov = 54;
        let targetExtraDist = 0;
        let targetExtraHeight = 0;
        if (activeLocationId === 'atelier') {
          const nextZone: AtelierZone =
            playerPos.x < -5.5 ? 'workshop' : playerPos.x > 5.5 ? 'studio' : 'lobby';
          if (nextZone !== lastAtelierZone) {
            lastAtelierZone = nextZone;
            onAtelierZoneRef.current?.(nextZone);
          }
          if (nextZone === 'workshop') {
            targetFov = 58;
            targetExtraDist = 1.05;
            targetExtraHeight = 0.28;
          } else if (nextZone === 'studio') {
            targetFov = 57;
            targetExtraDist = 0.72;
            targetExtraHeight = 0.22;
          }
        } else if (activeLocationId === 'citadel' || activeLocationId === 'gate_hall') {
          targetFov = 56;
          targetExtraDist = 0.45;
          targetExtraHeight = 0.2;
        } else if (activeLocationId === 'theatre') {
          targetFov = 57;
          targetExtraDist = 0.75;
          targetExtraHeight = 0.25;
        }
        zoneExtraDist = THREE.MathUtils.damp(zoneExtraDist, targetExtraDist, 3.6, dt);
        zoneExtraHeight = THREE.MathUtils.damp(zoneExtraHeight, targetExtraHeight, 3.6, dt);
        const nextFov = THREE.MathUtils.damp(camera.fov, targetFov, 3.8, dt);
        if (Math.abs(nextFov - camera.fov) > 0.02) {
          camera.fov = nextFov;
          camera.updateProjectionMatrix();
        }

        // Collision-aware Indoor & Outdoor Third-Person Camera
        let modeDist = camDistance + zoneExtraDist;
        let modeHeightOffset = 1.65 + zoneExtraHeight;
        let lateralOffset = 0;
        if (cameraModeRef.current === 'shoulder') {
          modeDist = 3.8;
          modeHeightOffset = 1.75;
          lateralOffset = 0.72;
        } else if (cameraModeRef.current === 'scenic') {
          modeDist = 11.8;
          modeHeightOffset = 2.3;
        }

        const horizDist = Math.cos(camPitch) * modeDist;
        const vertDist = Math.sin(camPitch) * modeDist;
        let cx = playerPos.x + Math.sin(camYaw) * horizDist + Math.cos(camYaw) * lateralOffset;
        let cz = playerPos.z + Math.cos(camYaw) * horizDist - Math.sin(camYaw) * lateralOffset;
        let cy = Math.max(
          currentWorld.groundHeightAt(cx, cz) + 0.85,
          playerPos.y + modeHeightOffset + vertDist,
        );

        if (currentWorld.roomRect) {
          cx = THREE.MathUtils.clamp(cx, currentWorld.roomRect.minX + 0.6, currentWorld.roomRect.maxX - 0.6);
          cz = THREE.MathUtils.clamp(cz, currentWorld.roomRect.minZ + 0.6, currentWorld.roomRect.maxZ - 0.6);
          cy = Math.min(cy, currentWorld.roomRect.maxY - 0.6);
        } else {
          const camRadial = Math.hypot(cx, cz);
          const maxCamRadial = currentWorld.boundsRadius + 0.8;
          if (camRadial > maxCamRadial) {
            const s = maxCamRadial / camRadial;
            cx *= s;
            cz *= s;
          }
        }

        _desiredCamPos.set(cx, cy, cz);
        const camDamp = 1 - Math.exp(-10 * dt);
        camera.position.lerp(_desiredCamPos, camDamp);

        _lookTarget.set(playerPos.x, playerPos.y + 1.45, playerPos.z);
        camera.lookAt(_lookTarget);
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);

      if (currentHero) currentHero.dispose();
      if (currentWorld) currentWorld.dispose();
      materials.dispose();
      envTex.dispose();
      renderer.dispose();
    };
  }, []);

  if (contextLost) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#162038] text-[#FAF6EE] p-8 text-center">
        <h2 className="font-display text-2xl text-[#D4AF37] mb-2">Konteks 3D Sedang Dipulihkan</h2>
        <p className="text-sm text-[#FAF6EE]/80 max-w-md">
          Paparan WebGL terhenti seketika. Sila tunggu sebentar atau muat semula pelayar anda untuk meneruskan pengembaraan.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing select-none" />
      {introActive && (
        <div className="pointer-events-none absolute inset-x-0 bottom-10 z-30 flex flex-col items-center gap-3 px-4">
          <div className="rounded-xl border border-[#D4AF37]/70 bg-[#101930]/92 px-6 py-3 text-center shadow-2xl max-w-xl">
            <div className="text-[11px] uppercase tracking-widest text-[#D4AF37] font-semibold">
              Balai Agung Diraja · Kota Diraja
            </div>
            <p className="text-xs sm:text-sm text-[#FAF6EE] mt-1">
              Meninjau keagungan Istana Diraja, takhta hikayat dan lima gerbang portal menuju pengembaraan anda.
            </p>
          </div>
          <button
            type="button"
            onClick={skipPalaceIntro}
            className="pointer-events-auto px-4 py-2 rounded-lg bg-[#D4AF37] text-[#162038] text-xs font-bold shadow-lg hover:bg-[#E6C86E]"
          >
            Langkau Pengenalan Istana
          </button>
        </div>
      )}
    </div>
  );
};
