import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CheckCircle2, Crown, Sparkles, Users, Volume2 } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { HERO_VOICE_GREETINGS, type VoiceRole } from '../audio/voiceProfiles';
import { HEROES } from '../data/gameContent';
import { type CharacterAnimState, type CharacterRig, createHeroCharacter } from '../game/characters';
import { createKingdomMaterials } from '../game/materials';
import type { HeroId, LearningMode } from '../types/game';

interface CharacterSelectionHall3DProps {
  selectedHero: HeroId;
  learningMode: LearningMode;
  onSelectHero: (heroId: HeroId) => void;
  onChangeLearningMode: (mode: LearningMode) => void;
  onConfirmAndClose: () => void;
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

const PEDESTAL_POSITIONS: Record<HeroId, [number, number, number]> = {
  ayden: [-3.9, 0, -0.6],
  elena: [-1.3, 0, 0.3],
  ryan: [1.3, 0, 0.3],
  eva: [3.9, 0, -0.6],
};

export const CharacterSelectionHall3D: React.FC<CharacterSelectionHall3DProps> = ({
  selectedHero,
  learningMode,
  onSelectHero,
  onChangeLearningMode,
  onConfirmAndClose,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [previewAnim, setPreviewAnim] = useState<'idle' | 'walk' | 'victory'>('idle');
  const [focusedHero, setFocusedHero] = useState<HeroId>(selectedHero);

  const focusedHeroRef = useRef<HeroId>(focusedHero);
  const previewAnimRef = useRef<'idle' | 'walk' | 'victory'>(previewAnim);
  const onSelectRef = useRef(onSelectHero);
  focusedHeroRef.current = focusedHero;
  previewAnimRef.current = previewAnim;
  onSelectRef.current = onSelectHero;

  useEffect(() => {
    setFocusedHero(selectedHero);
  }, [selectedHero]);

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
    renderer.setSize(container.clientWidth || 720, container.clientHeight || 400);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe6dff2);
    scene.fog = new THREE.FogExp2(0xe6dff2, 0.022);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(
      42,
      (container.clientWidth || 720) / (container.clientHeight || 400),
      0.1,
      80,
    );

    // Bright Royal Gallery Lighting
    const hemi = new THREE.HemisphereLight(0xfff9ec, 0x8e7fa6, 1.15);
    scene.add(hemi);

    const sunKey = new THREE.DirectionalLight(0xfff2d6, 1.55);
    sunKey.position.set(5, 11, 9);
    sunKey.castShadow = !isSoftwareGl;
    sunKey.shadow.mapSize.set(1024, 1024);
    scene.add(sunKey);

    const rimLight = new THREE.DirectionalLight(0x7be0e6, 0.65);
    rimLight.position.set(-7, 6, -8);
    scene.add(rimLight);

    const mats = createKingdomMaterials(renderer.capabilities.getMaxAnisotropy(), isSoftwareGl);
    const geos: THREE.BufferGeometry[] = [];
    const localMats: THREE.Material[] = [];
    const tg = <T extends THREE.BufferGeometry>(g: T): T => {
      geos.push(g);
      return g;
    };
    const tm = <T extends THREE.Material>(m: T): T => {
      localMats.push(m);
      return m;
    };

    // Gallery Marble Floor + Royal Carpet Runner
    const galleryFloor = new THREE.Mesh(tg(new THREE.CylinderGeometry(16, 16, 0.2, 48)), mats.marbleFloor);
    galleryFloor.position.y = -0.1;
    galleryFloor.receiveShadow = true;
    scene.add(galleryFloor);

    const carpet = new THREE.Mesh(tg(new THREE.BoxGeometry(11.5, 0.02, 5.2)), mats.royalBlueBrocade);
    carpet.position.set(0, 0.01, -0.1);
    carpet.receiveShadow = true;
    scene.add(carpet);

    // Curved Royal Backdrop Colonnade with Stained-Glass Windows & Banners
    for (let i = 0; i < 7; i++) {
      const a = -0.85 + (i / 6) * 1.7;
      const px = Math.sin(a) * 8.6;
      const pz = -Math.cos(a) * 6.8;
      const col = new THREE.Mesh(tg(new THREE.CylinderGeometry(0.28, 0.34, 6.2, 16)), mats.creamStone);
      col.position.set(px, 3.1, pz);
      col.castShadow = true;
      const cap = new THREE.Mesh(tg(new THREE.BoxGeometry(0.85, 0.28, 0.85)), mats.antiqueGold);
      cap.position.set(px, 6.25, pz);
      scene.add(col, cap);

      if (i < 6) {
        const wa = a + 0.14;
        const wx = Math.sin(wa) * 9.0;
        const wz = -Math.cos(wa) * 7.2;
        const win = new THREE.Mesh(
          tg(new THREE.PlaneGeometry(1.75, 4.1)),
          i % 2 === 0 ? mats.stainedGlass : mats.stainedGlassWarm,
        );
        win.position.set(wx, 3.5, wz);
        win.lookAt(0, 3.5, 2);
        scene.add(win);
      }
    }

    // 4 Illuminated Hero Pedestals + Redesigned 3D Hero Rigs
    const rigs: Record<HeroId, CharacterRig> = {} as Record<HeroId, CharacterRig>;
    const clickTargets: Array<{ mesh: THREE.Object3D; heroId: HeroId }> = [];
    const haloRings: Record<HeroId, THREE.Mesh> = {} as Record<HeroId, THREE.Mesh>;

    HEROES.forEach((heroDef) => {
      const [px, py, pz] = PEDESTAL_POSITIONS[heroDef.id];
      const ped = new THREE.Group();
      ped.position.set(px, py, pz);

      const base = new THREE.Mesh(tg(new THREE.CylinderGeometry(0.95, 1.12, 0.28, 28)), mats.pearlIvory);
      base.position.y = 0.14;
      base.receiveShadow = true;
      base.castShadow = true;

      const goldRim = new THREE.Mesh(tg(new THREE.TorusGeometry(0.95, 0.035, 10, 32)), mats.antiqueGold);
      goldRim.rotation.x = Math.PI / 2;
      goldRim.position.y = 0.28;

      const glowDisc = new THREE.Mesh(
        tg(new THREE.RingGeometry(0.75, 0.92, 32)),
        tm(
          new THREE.MeshBasicMaterial({
            color: heroDef.primaryColor,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide,
          }),
        ),
      );
      glowDisc.rotation.x = -Math.PI / 2;
      glowDisc.position.y = 0.295;
      haloRings[heroDef.id] = glowDisc;

      // Invisible generous raycast column for easy click selection
      const hitCylinder = new THREE.Mesh(
        tg(new THREE.CylinderGeometry(0.9, 0.9, 2.3, 12)),
        tm(new THREE.MeshBasicMaterial({ visible: false })),
      );
      hitCylinder.position.y = 1.25;
      ped.add(base, goldRim, glowDisc, hitCylinder);
      scene.add(ped);
      clickTargets.push({ mesh: hitCylinder, heroId: heroDef.id });

      const rig = createHeroCharacter(heroDef.id);
      rig.root.position.set(px, 0.28, pz);
      scene.add(rig.root);
      rigs[heroDef.id] = rig;
    });

    // Camera orbit + smooth target focus state
    let orbitYaw = 0;
    let orbitPitch = 0.14;
    let orbitDist = 3.55;
    let isDragging = false;
    let pointerDownPos = { x: 0, y: 0 };
    let lastPos = { x: 0, y: 0 };

    const focusTarget = new THREE.Vector3(...PEDESTAL_POSITIONS[focusedHeroRef.current]);
    focusTarget.y = 1.22;

    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    const canvas = renderer.domElement;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      pointerDownPos = { x: e.clientX, y: e.clientY };
      lastPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastPos.x;
      const dy = e.clientY - lastPos.y;
      lastPos = { x: e.clientX, y: e.clientY };
      orbitYaw -= dx * 0.009;
      orbitPitch = THREE.MathUtils.clamp(orbitPitch + dy * 0.005, -0.08, 0.65);
    };

    const onPointerUp = (e: PointerEvent) => {
      const moved = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      isDragging = false;
      if (moved < 6) {
        const rect = canvas.getBoundingClientRect();
        pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointerNdc, camera);
        const hits = raycaster.intersectObjects(
          clickTargets.map((t) => t.mesh),
          false,
        );
        if (hits.length > 0) {
          const hitObj = hits[0].object;
          const found = clickTargets.find((t) => t.mesh === hitObj);
          if (found) {
            soundEngine.playCollectSound();
            setFocusedHero(found.heroId);
            onSelectRef.current(found.heroId);
            orbitYaw = 0;
          }
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      orbitDist = THREE.MathUtils.clamp(orbitDist + e.deltaY * 0.0035, 2.2, 6.2);
    };

    const onResize = () => {
      const w = container.clientWidth || 720;
      const h = container.clientHeight || 400;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

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

    const desiredTarget = new THREE.Vector3();
    const desiredCam = new THREE.Vector3();

    function tick() {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;

      const activeId = focusedHeroRef.current;
      const pedPos = PEDESTAL_POSITIONS[activeId];
      desiredTarget.set(pedPos[0], 1.24, pedPos[2]);
      const damp = 1 - Math.exp(-8 * dt);
      focusTarget.lerp(desiredTarget, damp);

      const horiz = Math.cos(orbitPitch) * orbitDist;
      const vert = Math.sin(orbitPitch) * orbitDist;
      desiredCam.set(
        focusTarget.x + Math.sin(orbitYaw) * horiz,
        focusTarget.y + 0.12 + vert,
        focusTarget.z + Math.cos(orbitYaw) * horiz,
      );
      camera.position.lerp(desiredCam, damp);
      camera.lookAt(focusTarget);

      // Update all 4 3D hero rigs
      HEROES.forEach((h) => {
        const rig = rigs[h.id];
        const isFocus = h.id === activeId;
        const anim: CharacterAnimState = isFocus ? previewAnimRef.current : 'idle';
        rig.updateAnimation(anim, dt, elapsed + (isFocus ? 0 : HEROES.indexOf(h) * 0.7));
        const ringMat = haloRings[h.id].material as THREE.MeshBasicMaterial;
        ringMat.opacity = isFocus ? 0.85 : 0.28;
        rig.auraRing.scale.setScalar(isFocus ? 1.12 + Math.sin(elapsed * 3.5) * 0.08 : 0.92);
      });

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
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);

      Object.values(rigs).forEach((r) => r.dispose());
      geos.forEach((g) => g.dispose());
      localMats.forEach((m) => m.dispose());
      mats.dispose();
      envTex.dispose();
      renderer.dispose();
    };
  }, []);

  const heroMeta = HEROES.find((h) => h.id === focusedHero) || HEROES[0];

  return (
    <div className="space-y-4">
      {/* Learning Mode Bar */}
      <div className="rounded-xl border border-[#D4AF37]/30 bg-[#1B2948] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Users className="w-4 h-4 text-[#8FBCE0]" />
          <div>
            <div className="text-xs font-semibold text-[#FAF6EE]">Mod Pembelajaran</div>
            <div className="text-[11px] text-[#C8B6E2]">
              Teroka secara kendiri atau sertai rakan di Bilik Kolaborasi
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#121A30] border border-[#FAF6EE]/10">
          <button
            type="button"
            onClick={() => onChangeLearningMode('individual')}
            className={`px-3 py-1.5 rounded text-xs font-semibold ${
              learningMode === 'individual' ? 'bg-[#D4AF37] text-[#162038]' : 'text-[#FAF6EE]/75'
            }`}
          >
            Individu
          </button>
          <button
            type="button"
            onClick={() => onChangeLearningMode('collaborative')}
            className={`px-3 py-1.5 rounded text-xs font-semibold ${
              learningMode === 'collaborative' ? 'bg-[#D4AF37] text-[#162038]' : 'text-[#FAF6EE]/75'
            }`}
          >
            Kolaboratif
          </button>
        </div>
      </div>

      {/* Interactive 3D Character Selection Hall */}
      <div className="relative rounded-2xl border border-[#D4AF37]/45 overflow-hidden bg-[#E6DFF2]">
        <div ref={mountRef} className="w-full h-[330px] sm:h-[380px] cursor-grab active:cursor-grabbing" />

        {/* Top-left subtle gallery hint */}
        <div className="pointer-events-none absolute top-3 left-3 rounded-lg border border-[#D4AF37]/50 bg-[#162038]/88 px-3 py-1.5 text-[11px] text-[#FAF6EE]">
          Klik wira di pentas · Seret untuk pusing 360° · Tatal untuk zum
        </div>

        {/* Top-right Animation Preview Controls */}
        <div className="absolute top-3 right-3 flex items-center gap-1 rounded-lg border border-[#D4AF37]/50 bg-[#162038]/92 p-1">
          {(
            [
              { id: 'idle', label: 'Diam' },
              { id: 'walk', label: 'Berjalan' },
              { id: 'victory', label: 'Sorak' },
            ] as const
          ).map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setPreviewAnim(mode.id)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                previewAnim === mode.id
                  ? 'bg-[#D4AF37] text-[#162038]'
                  : 'text-[#FAF6EE]/80 hover:text-[#FAF6EE]'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Hero Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {HEROES.map((hero) => {
          const isFocused = hero.id === focusedHero;
          return (
            <button
              key={hero.id}
              type="button"
              onClick={() => {
                soundEngine.playCollectSound();
                setFocusedHero(hero.id);
                onSelectHero(hero.id);
              }}
              className={`rounded-xl border p-3 text-left transition-all ${
                isFocused
                  ? 'border-[#D4AF37] bg-[#233256] shadow-lg'
                  : 'border-[#FAF6EE]/15 bg-[#1B2948] hover:border-[#C8B6E2]/50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-sm font-bold text-[#FAF6EE]">{hero.name}</span>
                {selectedHero === hero.id && <CheckCircle2 className="w-4 h-4 text-[#7FA88C] shrink-0" />}
              </div>
              <div className="text-[11px] text-[#D4AF37] mt-0.5">{hero.title}</div>
            </button>
          );
        })}
      </div>

      {/* Selected Hero Lore & Ability Detail */}
      <div className="rounded-xl border border-[#D4AF37]/35 bg-[#1B2948] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-[#D4AF37]" />
            <span className="font-display text-base font-bold text-[#FAF6EE]">
              {heroMeta.name} — {heroMeta.title}
            </span>
          </div>
          <div className="text-xs text-[#8FBCE0]">
            Peranan: {heroMeta.roleLabel} · Sifat: {heroMeta.personality.join(', ')}
          </div>
          <p className="text-xs text-[#EFE6D5]/90 leading-relaxed">
            <Sparkles className="w-3.5 h-3.5 text-[#C8B6E2] inline mr-1.5" />
            <strong className="text-[#C8B6E2]">{heroMeta.abilityName}: </strong>
            {heroMeta.abilityDescription}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() =>
              void soundEngine.speakMalay(HERO_VOICE_GREETINGS[heroMeta.id], {
                voiceRole: `hero_${heroMeta.id}` as VoiceRole,
                styleHint: 'dialogue',
              })
            }
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#D4AF37]/45 bg-[#162038] text-[#E5C97B] font-semibold text-xs hover:bg-[#233256]"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Dengar Suara Wira</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.stopNarration();
              soundEngine.playMissionComplete();
              onConfirmAndClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-[#D4AF37] text-[#162038] font-bold text-xs sm:text-sm hover:bg-[#E6C86E] whitespace-nowrap shrink-0"
          >
            Sahkan Wira & Terokai Istana
          </button>
        </div>
      </div>
    </div>
  );
};
