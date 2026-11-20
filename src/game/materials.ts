import * as THREE from 'three';

export interface MaterialPalette {
  marbleFloor: THREE.MeshStandardMaterial;
  pearlIvory: THREE.MeshStandardMaterial;
  warmIvoryMarble: THREE.MeshStandardMaterial;
  creamStone: THREE.MeshStandardMaterial;
  lavenderWall: THREE.MeshStandardMaterial;
  lavenderVelvet: THREE.MeshPhysicalMaterial;
  royalBlueBrocade: THREE.MeshPhysicalMaterial;
  dustyRoseVelvet: THREE.MeshPhysicalMaterial;
  emeraldBrocade: THREE.MeshPhysicalMaterial;
  antiqueGold: THREE.MeshPhysicalMaterial;
  champagneGold: THREE.MeshPhysicalMaterial;
  midnightNavy: THREE.MeshStandardMaterial;
  sageGrass: THREE.MeshStandardMaterial;
  emeraldCanopy: THREE.MeshStandardMaterial;
  woodOak: THREE.MeshStandardMaterial;
  darkWalnut: THREE.MeshStandardMaterial;
  velvetCrimson: THREE.MeshPhysicalMaterial;
  waterStream: THREE.MeshPhysicalMaterial;
  stainedGlass: THREE.MeshStandardMaterial;
  stainedGlassWarm: THREE.MeshStandardMaterial;
  crystalTurquoise: THREE.MeshPhysicalMaterial;
  chandelierCrystal: THREE.MeshPhysicalMaterial;
  candleFlame: THREE.MeshStandardMaterial;
  cofferedCeiling: THREE.MeshStandardMaterial;
  ceilingFresco: THREE.MeshStandardMaterial;
  royalMosaicFloor: THREE.MeshStandardMaterial;
  royalCrestMat: THREE.MeshStandardMaterial;
  dispose: () => void;
}

function makeCanvasTexture(
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

export function createKingdomMaterials(maxAnisotropy: number, isSoftwareGl: boolean): MaterialPalette {
  const textures: THREE.Texture[] = [];

  // 1. Geometric Inlaid Warm Ivory & Champagne Gold Royal Marble Floor (balanced, non-overexposed)
  const marbleTex = makeCanvasTexture(
    512,
    (ctx, s) => {
      ctx.fillStyle = '#EFE5D6';
      ctx.fillRect(0, 0, s, s);

      // Rich natural ivory/champagne/lavender marble veining
      for (let i = 0; i < 80; i++) {
        ctx.strokeStyle =
          i % 3 === 0
            ? 'rgba(176, 152, 206, 0.24)'
            : i % 3 === 1
              ? 'rgba(196, 168, 118, 0.28)'
              : 'rgba(130, 166, 198, 0.16)';
        ctx.lineWidth = 1.1 + (i % 4) * 0.55;
        ctx.beginPath();
        const x = (i * 83) % s;
        const y = (i * 47) % s;
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x + 38, y + 18, x + 72, y - 24, x + 122, y + 10);
        ctx.stroke();
      }

      // Geometric royal diamond + gold inlay tiles
      const step = s / 2;
      for (let gx = 0; gx < 2; gx++) {
        for (let gy = 0; gy < 2; gy++) {
          const ox = gx * step;
          const oy = gy * step;
          ctx.strokeStyle = 'rgba(202, 164, 58, 0.55)';
          ctx.lineWidth = 3;
          ctx.strokeRect(ox + 4, oy + 4, step - 8, step - 8);
          ctx.strokeStyle = 'rgba(202, 164, 58, 0.28)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(ox + 12, oy + 12, step - 24, step - 24);

          // Inner diamond motif
          ctx.fillStyle = (gx + gy) % 2 === 0 ? 'rgba(220, 204, 236, 0.34)' : 'rgba(232, 214, 180, 0.36)';
          ctx.beginPath();
          ctx.moveTo(ox + step / 2, oy + 20);
          ctx.lineTo(ox + step - 20, oy + step / 2);
          ctx.lineTo(ox + step / 2, oy + step - 20);
          ctx.lineTo(ox + 20, oy + step / 2);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = 'rgba(188, 150, 52, 0.52)';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Corner & center rosette dot
          ctx.fillStyle = 'rgba(204, 166, 56, 0.6)';
          ctx.beginPath();
          ctx.arc(ox + step / 2, oy + step / 2, 7, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
    maxAnisotropy,
    7,
  );
  textures.push(marbleTex);

  // 2. Fluted Warm Cream / Ivory Stone Texture
  const creamStoneTex = makeCanvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#F5ECDA';
      ctx.fillRect(0, 0, s, s);
      for (let x = 0; x < s; x += 16) {
        const grad = ctx.createLinearGradient(x, 0, x + 16, 0);
        grad.addColorStop(0, 'rgba(215, 198, 170, 0.28)');
        grad.addColorStop(0.5, 'rgba(255, 252, 245, 0.32)');
        grad.addColorStop(1, 'rgba(205, 185, 155, 0.25)');
        ctx.fillStyle = grad;
        ctx.fillRect(x, 0, 16, s);
      }
    },
    maxAnisotropy,
    2,
  );
  textures.push(creamStoneTex);

  // 3. Stained-Glass Cathedral Window Texture (Cool Turquoise + Lavender + Gold)
  const stainedTex = makeCanvasTexture(
    512,
    (ctx, s) => {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, s);
      bgGrad.addColorStop(0, '#9DE6EC');
      bgGrad.addColorStop(0.45, '#C8B6E2');
      bgGrad.addColorStop(0.75, '#E4B1BD');
      bgGrad.addColorStop(1, '#F3DDA0');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, s, s);

      // Cathedral leaded rose & lancet panes
      const cols = 4;
      const rows = 6;
      const cw = s / cols;
      const rh = s / rows;
      const jewelPalette = ['#7CE0E6', '#D5C2F0', '#E8AEBD', '#F7DF9C', '#A6D8B8'];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          ctx.fillStyle = jewelPalette[(r * 3 + c) % jewelPalette.length];
          ctx.globalAlpha = 0.72;
          ctx.fillRect(c * cw + 4, r * rh + 4, cw - 8, rh - 8);
          ctx.globalAlpha = 1;
          ctx.strokeStyle = '#6E5828';
          ctx.lineWidth = 4;
          ctx.strokeRect(c * cw + 2, r * rh + 2, cw - 4, rh - 4);
        }
      }

      // Radiant sun rosette in upper third
      ctx.save();
      ctx.translate(s / 2, s * 0.28);
      for (let i = 0; i < 12; i++) {
        ctx.rotate((Math.PI * 2) / 12);
        ctx.fillStyle = i % 2 === 0 ? '#FFE89E' : '#96E7ED';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-18, -90);
        ctx.lineTo(18, -90);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#8C6B23';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.fillStyle = '#FFF6D6';
      ctx.beginPath();
      ctx.arc(0, 0, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    },
    maxAnisotropy,
    1,
  );
  textures.push(stainedTex);

  // 4. Warm Rose/Gold Stained Glass Texture
  const stainedWarmTex = makeCanvasTexture(
    256,
    (ctx, s) => {
      const grad = ctx.createLinearGradient(0, 0, 0, s);
      grad.addColorStop(0, '#FFF1BD');
      grad.addColorStop(0.5, '#E7B1C0');
      grad.addColorStop(1, '#98DCE2');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = '#7C622A';
      ctx.lineWidth = 5;
      for (let y = 0; y < s; y += 42) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(s, y);
        ctx.stroke();
      }
      for (let x = 0; x < s; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, s);
        ctx.stroke();
      }
    },
    maxAnisotropy,
    1,
  );
  textures.push(stainedWarmTex);

  // 5. Royal Brocade Helper
  const makeBrocadeTex = (baseHex: string, motifHex: string) => {
    const tex = makeCanvasTexture(
      256,
      (ctx, s) => {
        ctx.fillStyle = baseHex;
        ctx.fillRect(0, 0, s, s);
        ctx.strokeStyle = motifHex;
        ctx.lineWidth = 2;
        const step = 48;
        for (let y = 0; y <= s; y += step) {
          for (let x = 0; x <= s; x += step) {
            ctx.beginPath();
            ctx.arc(x, y, 12, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y - 18);
            ctx.lineTo(x + 14, y);
            ctx.lineTo(x, y + 18);
            ctx.lineTo(x - 14, y);
            ctx.closePath();
            ctx.stroke();
          }
        }
      },
      maxAnisotropy,
      2,
    );
    textures.push(tex);
    return tex;
  };

  const royalBlueTex = makeBrocadeTex('#1D3162', 'rgba(229, 201, 123, 0.35)');
  const dustyRoseTex = makeBrocadeTex('#B86D82', 'rgba(250, 240, 210, 0.34)');
  const emeraldBrocadeTex = makeBrocadeTex('#3F7B5B', 'rgba(229, 201, 123, 0.32)');

  // 6. Coffered Champagne Gold & Ivory Ceiling Texture
  const ceilingTex = makeCanvasTexture(
    512,
    (ctx, s) => {
      ctx.fillStyle = '#F7EFE0';
      ctx.fillRect(0, 0, s, s);
      const cells = 4;
      const cs = s / cells;
      for (let x = 0; x < cells; x++) {
        for (let y = 0; y < cells; y++) {
          const ox = x * cs;
          const oy = y * cs;
          ctx.strokeStyle = '#CFA844';
          ctx.lineWidth = 8;
          ctx.strokeRect(ox + 6, oy + 6, cs - 12, cs - 12);
          ctx.fillStyle = 'rgba(218, 198, 236, 0.35)';
          ctx.fillRect(ox + 16, oy + 16, cs - 32, cs - 32);
          ctx.fillStyle = '#DFBA58';
          ctx.beginPath();
          ctx.arc(ox + cs / 2, oy + cs / 2, 12, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
    maxAnisotropy,
    4,
  );
  textures.push(ceilingTex);

  // 7. Sunlit Royal Meadow Grass Texture
  const grassTex = makeCanvasTexture(
    512,
    (ctx, s) => {
      ctx.fillStyle = '#6FA67B';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 1200; i++) {
        const x = (i * 137) % s;
        const y = (i * 293) % s;
        ctx.fillStyle =
          i % 4 === 0 ? '#5B9668' : i % 4 === 1 ? '#86BD91' : i % 4 === 2 ? '#98CCA0' : '#A6D7AF';
        ctx.fillRect(x, y, 4, 9);
      }
    },
    maxAnisotropy,
    10,
  );
  textures.push(grassTex);

  // 8. Botanical Leaf Cluster Texture
  const foliageTex = makeCanvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#4B8E64';
      ctx.fillRect(0, 0, s, s);
      const shades = ['#3E7D55', '#5BA375', '#73BA89', '#8FD09E'];
      for (let i = 0; i < 240; i++) {
        ctx.save();
        ctx.translate((i * 73) % s, (i * 139) % s);
        ctx.rotate((i % 7) * 0.5);
        ctx.fillStyle = shades[i % shades.length];
        ctx.beginPath();
        ctx.ellipse(0, 0, 14, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    },
    maxAnisotropy,
    2,
  );
  textures.push(foliageTex);

  // 9. Oak & Dark Walnut Wood Textures
  const woodTex = makeCanvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#9D734F';
      ctx.fillRect(0, 0, s, s);
      for (let y = 0; y < s; y += 6) {
        ctx.fillStyle = y % 12 === 0 ? 'rgba(72, 46, 26, 0.22)' : 'rgba(195, 155, 110, 0.18)';
        ctx.fillRect(0, y, s, 3);
      }
    },
    maxAnisotropy,
    2,
  );
  textures.push(woodTex);

  const walnutTex = makeCanvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#62412A';
      ctx.fillRect(0, 0, s, s);
      for (let y = 0; y < s; y += 6) {
        ctx.fillStyle = y % 12 === 0 ? 'rgba(38, 22, 12, 0.28)' : 'rgba(130, 92, 62, 0.16)';
        ctx.fillRect(0, y, s, 3);
      }
    },
    maxAnisotropy,
    2,
  );
  textures.push(walnutTex);

  // 10. Warm Veined Ivory Architectural Marble (for sculpted walls, dais & columns)
  const warmIvoryTex = makeCanvasTexture(
    512,
    (ctx, s) => {
      ctx.fillStyle = '#F2E9DC';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 60; i++) {
        ctx.strokeStyle =
          i % 3 === 0
            ? 'rgba(182, 158, 128, 0.22)'
            : i % 3 === 1
              ? 'rgba(176, 154, 202, 0.16)'
              : 'rgba(255, 250, 240, 0.35)';
        ctx.lineWidth = 1.2 + (i % 4) * 0.6;
        ctx.beginPath();
        const x = (i * 97) % s;
        const y = (i * 59) % s;
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x + 45, y + 25, x + 90, y - 20, x + 150, y + 12);
        ctx.stroke();
      }
    },
    maxAnisotropy,
    2,
  );
  textures.push(warmIvoryTex);

  // 11. Tufted Rich Royal Lavender Velvet Texture (for Throne Upholstery)
  const lavenderVelvetTex = makeCanvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#6A4C9C';
      ctx.fillRect(0, 0, s, s);
      const step = 42.66;
      for (let y = 0; y <= s + step; y += step) {
        for (let x = 0; x <= s + step; x += step) {
          ctx.strokeStyle = 'rgba(46, 28, 74, 0.45)';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(x, y - step * 0.5);
          ctx.lineTo(x + step * 0.5, y);
          ctx.lineTo(x, y + step * 0.5);
          ctx.lineTo(x - step * 0.5, y);
          ctx.closePath();
          ctx.stroke();

          ctx.fillStyle = 'rgba(235, 209, 133, 0.85)';
          ctx.beginPath();
          ctx.arc(x, y, 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
    maxAnisotropy,
    3,
  );
  textures.push(lavenderVelvetTex);

  // 12. Fantasy Celestial Fresco Ceiling Medallion Texture
  const ceilingFrescoTex = makeCanvasTexture(
    1024,
    (ctx, s) => {
      const cx = s / 2;
      const cy = s / 2;
      const sky = ctx.createRadialGradient(cx, cy, 40, cx, cy, s * 0.5);
      sky.addColorStop(0, '#FFF5DC');
      sky.addColorStop(0.28, '#E7D8F6');
      sky.addColorStop(0.62, '#B6DCEE');
      sky.addColorStop(0.86, '#907BC0');
      sky.addColorStop(1, '#3B4D82');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, s, s);

      // Sunburst golden rays
      ctx.save();
      ctx.translate(cx, cy);
      for (let i = 0; i < 24; i++) {
        ctx.rotate((Math.PI * 2) / 24);
        ctx.fillStyle = i % 2 === 0 ? 'rgba(235, 206, 120, 0.28)' : 'rgba(255, 250, 232, 0.14)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-20, -s * 0.44);
        ctx.lineTo(20, -s * 0.44);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Soft painted fairytale clouds
      const cloudSpots = [
        [0.28, 0.34, 95],
        [0.72, 0.32, 105],
        [0.24, 0.68, 110],
        [0.74, 0.68, 95],
        [0.5, 0.22, 85],
        [0.5, 0.78, 85],
      ];
      cloudSpots.forEach(([ux, uy, r]) => {
        const g = ctx.createRadialGradient(ux * s, uy * s, r * 0.1, ux * s, uy * s, r);
        g.addColorStop(0, 'rgba(255, 248, 240, 0.72)');
        g.addColorStop(0.55, 'rgba(246, 224, 232, 0.38)');
        g.addColorStop(1, 'rgba(255, 248, 240, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(ux * s, uy * s, r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Concentric gold laurel rings & celestial stars
      [s * 0.45, s * 0.36, s * 0.21].forEach((rad, idx) => {
        ctx.strokeStyle = idx === 0 ? '#D4AF37' : '#E8CC78';
        ctx.lineWidth = idx === 0 ? 14 : 6;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.stroke();
      });

      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const sx = cx + Math.cos(a) * s * 0.405;
        const sy = cy + Math.sin(a) * s * 0.405;
        ctx.fillStyle = '#FFE99D';
        ctx.beginPath();
        ctx.arc(sx, sy, i % 2 === 0 ? 9 : 5, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    maxAnisotropy,
    1,
  );
  textures.push(ceilingFrescoTex);

  // 13. Elaborate Central Royal Floor Mosaic with Kingdom of Stories Emblem
  const royalMosaicTex = makeCanvasTexture(
    1024,
    (ctx, s) => {
      const cx = s / 2;
      const cy = s / 2;

      // Base warm alabaster disc
      ctx.fillStyle = '#EFE5D6';
      ctx.fillRect(0, 0, s, s);

      // Outer sapphire & dusty-rose marble border ring
      ctx.fillStyle = '#25396B';
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.48, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#B87B8F';
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.435, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#EFE5D6';
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.39, 0, Math.PI * 2);
      ctx.fill();

      // Concentric champagne gold inlay rings
      [0.48, 0.435, 0.39, 0.285, 0.19].forEach((rFrac, i) => {
        ctx.strokeStyle = i % 2 === 0 ? '#D4AF37' : '#E8CC78';
        ctx.lineWidth = i === 0 ? 12 : 7;
        ctx.beginPath();
        ctx.arc(cx, cy, s * rFrac, 0, Math.PI * 2);
        ctx.stroke();
      });

      // 16-point royal compass star leading North toward the Throne
      for (let i = 0; i < 16; i++) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((i / 16) * Math.PI * 2);
        const isMain = i % 4 === 0;
        const len = isMain ? s * 0.38 : i % 2 === 0 ? s * 0.32 : s * 0.26;
        ctx.fillStyle = isMain ? '#D4AF37' : i % 2 === 0 ? '#7862A8' : '#7BC4CD';
        ctx.beginPath();
        ctx.moveTo(0, -len);
        ctx.lineTo(isMain ? 24 : 14, -s * 0.16);
        ctx.lineTo(0, 0);
        ctx.lineTo(-(isMain ? 24 : 14), -s * 0.16);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Inner Royal Medallion Background
      ctx.fillStyle = '#1E315E';
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.185, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#E6C86E';
      ctx.lineWidth = 8;
      ctx.stroke();

      // Official Kingdom of Stories Open Book & Crown Emblem in center
      ctx.fillStyle = '#FAF3E3';
      ctx.beginPath();
      ctx.moveTo(cx, cy + 52);
      ctx.quadraticCurveTo(cx - 58, cy + 32, cx - 92, cy + 54);
      ctx.lineTo(cx - 92, cy - 30);
      ctx.quadraticCurveTo(cx - 50, cy - 48, cx, cy - 22);
      ctx.quadraticCurveTo(cx + 50, cy - 48, cx + 92, cy - 30);
      ctx.lineTo(cx + 92, cy + 54);
      ctx.quadraticCurveTo(cx + 58, cy + 32, cx, cy + 52);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 5;
      ctx.stroke();

      // Golden Crown above the open book
      ctx.fillStyle = '#E5C35A';
      ctx.beginPath();
      ctx.moveTo(cx - 48, cy - 46);
      ctx.lineTo(cx - 58, cy - 92);
      ctx.lineTo(cx - 24, cy - 68);
      ctx.lineTo(cx, cy - 108);
      ctx.lineTo(cx + 24, cy - 68);
      ctx.lineTo(cx + 58, cy - 92);
      ctx.lineTo(cx + 48, cy - 46);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    },
    maxAnisotropy,
    1,
  );
  textures.push(royalMosaicTex);

  // 14. Official Kingdom of Stories Heraldic Crest Texture (for Throne Wall & Shields)
  const royalCrestTex = makeCanvasTexture(
    512,
    (ctx, s) => {
      const cx = s / 2;
      const cy = s / 2;
      ctx.fillStyle = '#1D305E';
      ctx.fillRect(0, 0, s, s);

      // Sunburst backdrop
      ctx.save();
      ctx.translate(cx, cy);
      for (let i = 0; i < 16; i++) {
        ctx.rotate((Math.PI * 2) / 16);
        ctx.fillStyle = i % 2 === 0 ? 'rgba(230, 198, 108, 0.22)' : 'rgba(125, 224, 230, 0.12)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-18, -240);
        ctx.lineTo(18, -240);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Heraldic Shield
      ctx.fillStyle = '#263F7A';
      ctx.beginPath();
      ctx.moveTo(cx - 125, cy - 110);
      ctx.lineTo(cx + 125, cy - 110);
      ctx.lineTo(cx + 115, cy + 40);
      ctx.quadraticCurveTo(cx + 80, cy + 145, cx, cy + 185);
      ctx.quadraticCurveTo(cx - 80, cy + 145, cx - 115, cy + 40);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#E5C35A';
      ctx.lineWidth = 14;
      ctx.stroke();

      // Open Golden Book inside Shield
      ctx.fillStyle = '#FAF2E1';
      ctx.beginPath();
      ctx.moveTo(cx, cy + 68);
      ctx.quadraticCurveTo(cx - 46, cy + 46, cx - 78, cy + 65);
      ctx.lineTo(cx - 78, cy - 14);
      ctx.quadraticCurveTo(cx - 42, cy - 30, cx, cy - 6);
      ctx.quadraticCurveTo(cx + 42, cy - 30, cx + 78, cy - 14);
      ctx.lineTo(cx + 78, cy + 65);
      ctx.quadraticCurveTo(cx + 46, cy + 46, cx, cy + 68);
      ctx.closePath();
      ctx.fill();

      // Crown & Turquoise Star
      ctx.fillStyle = '#E5C35A';
      ctx.beginPath();
      ctx.moveTo(cx - 56, cy - 42);
      ctx.lineTo(cx - 68, cy - 92);
      ctx.lineTo(cx - 28, cy - 64);
      ctx.lineTo(cx, cy - 108);
      ctx.lineTo(cx + 28, cy - 64);
      ctx.lineTo(cx + 68, cy - 92);
      ctx.lineTo(cx + 56, cy - 42);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#7DE3E8';
      ctx.beginPath();
      ctx.arc(cx, cy + 115, 22, 0, Math.PI * 2);
      ctx.fill();
    },
    maxAnisotropy,
    1,
  );
  textures.push(royalCrestTex);

  const marbleFloor = new THREE.MeshStandardMaterial({
    map: marbleTex,
    roughness: 0.22,
    metalness: 0.12,
    envMapIntensity: 0.85,
  });

  const pearlIvory = new THREE.MeshStandardMaterial({
    color: 0xf3eadc,
    roughness: 0.44,
    metalness: 0.05,
  });

  const warmIvoryMarble = new THREE.MeshStandardMaterial({
    map: warmIvoryTex,
    roughness: 0.34,
    metalness: 0.08,
  });

  const creamStone = new THREE.MeshStandardMaterial({
    map: creamStoneTex,
    roughness: 0.54,
    metalness: 0.06,
  });

  const lavenderWall = new THREE.MeshStandardMaterial({
    color: 0xd7c8eb,
    roughness: 0.5,
    metalness: 0.06,
  });

  const lavenderVelvet = new THREE.MeshPhysicalMaterial({
    map: lavenderVelvetTex,
    roughness: 0.72,
    metalness: 0.06,
    sheen: 0.92,
    sheenRoughness: 0.45,
    sheenColor: new THREE.Color(0xf4dca0),
    side: THREE.DoubleSide,
  });

  const royalBlueBrocade = new THREE.MeshPhysicalMaterial({
    map: royalBlueTex,
    roughness: 0.68,
    metalness: 0.08,
    sheen: 0.75,
    sheenColor: new THREE.Color(0xe5c97b),
    side: THREE.DoubleSide,
  });

  const dustyRoseVelvet = new THREE.MeshPhysicalMaterial({
    map: dustyRoseTex,
    roughness: 0.72,
    metalness: 0.05,
    sheen: 0.85,
    sheenColor: new THREE.Color(0xf7e3c6),
    side: THREE.DoubleSide,
  });

  const emeraldBrocade = new THREE.MeshPhysicalMaterial({
    map: emeraldBrocadeTex,
    roughness: 0.66,
    metalness: 0.06,
    sheen: 0.7,
    sheenColor: new THREE.Color(0xe5c97b),
    side: THREE.DoubleSide,
  });

  const antiqueGold = new THREE.MeshPhysicalMaterial({
    color: 0xd6b145,
    roughness: 0.22,
    metalness: 0.9,
    anisotropy: isSoftwareGl ? 0 : 0.7,
    clearcoat: 0.4,
  });

  const champagneGold = new THREE.MeshPhysicalMaterial({
    color: 0xebd185,
    roughness: 0.24,
    metalness: 0.85,
    clearcoat: 0.35,
  });

  const midnightNavy = new THREE.MeshStandardMaterial({
    color: 0x1e315e,
    roughness: 0.44,
    metalness: 0.2,
  });

  const sageGrass = new THREE.MeshStandardMaterial({
    map: grassTex,
    roughness: 0.85,
    metalness: 0.02,
  });

  const emeraldCanopy = new THREE.MeshStandardMaterial({
    map: foliageTex,
    roughness: 0.78,
    metalness: 0.02,
  });

  const woodOak = new THREE.MeshStandardMaterial({
    map: woodTex,
    roughness: 0.66,
    metalness: 0.05,
  });

  const darkWalnut = new THREE.MeshStandardMaterial({
    map: walnutTex,
    roughness: 0.62,
    metalness: 0.06,
  });

  const velvetCrimson = new THREE.MeshPhysicalMaterial({
    color: 0xa24d67,
    roughness: 0.76,
    metalness: 0.05,
    sheen: 0.9,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color(0xf6dfaa),
    side: THREE.DoubleSide,
  });

  const waterStream = new THREE.MeshPhysicalMaterial({
    color: 0x6cd3dc,
    emissive: 0x2f8794,
    emissiveIntensity: 0.22,
    roughness: 0.1,
    metalness: 0.1,
    transmission: isSoftwareGl ? 0 : 0.55,
    transparent: true,
    opacity: isSoftwareGl ? 0.78 : 0.9,
    ior: 1.33,
  });

  const stainedGlass = new THREE.MeshStandardMaterial({
    map: stainedTex,
    emissiveMap: stainedTex,
    emissive: new THREE.Color(0xfff4dd),
    emissiveIntensity: 0.75,
    roughness: 0.22,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });

  const stainedGlassWarm = new THREE.MeshStandardMaterial({
    map: stainedWarmTex,
    emissiveMap: stainedWarmTex,
    emissive: new THREE.Color(0xffeec9),
    emissiveIntensity: 0.68,
    roughness: 0.24,
    side: THREE.DoubleSide,
  });

  const crystalTurquoise = new THREE.MeshPhysicalMaterial({
    color: 0x7be0e6,
    emissive: 0x4cc2cb,
    emissiveIntensity: 0.55,
    roughness: 0.12,
    metalness: 0.15,
    clearcoat: 0.85,
  });

  const chandelierCrystal = new THREE.MeshPhysicalMaterial({
    color: 0xf4fcff,
    emissive: 0x9ce3ea,
    emissiveIntensity: 0.24,
    roughness: 0.06,
    metalness: 0.12,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    ior: 1.85,
    transparent: true,
    opacity: isSoftwareGl ? 0.85 : 0.94,
  });

  const candleFlame = new THREE.MeshStandardMaterial({
    color: 0xfff5d4,
    emissive: 0xffc857,
    emissiveIntensity: 1.45,
    roughness: 0.2,
  });

  const cofferedCeiling = new THREE.MeshStandardMaterial({
    map: ceilingTex,
    roughness: 0.42,
    metalness: 0.18,
  });

  const ceilingFresco = new THREE.MeshStandardMaterial({
    map: ceilingFrescoTex,
    emissiveMap: ceilingFrescoTex,
    emissive: new THREE.Color(0xfff3dd),
    emissiveIntensity: 0.14,
    roughness: 0.44,
    metalness: 0.1,
  });

  const royalMosaicFloor = new THREE.MeshStandardMaterial({
    map: royalMosaicTex,
    roughness: 0.2,
    metalness: 0.14,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const royalCrestMat = new THREE.MeshStandardMaterial({
    map: royalCrestTex,
    roughness: 0.34,
    metalness: 0.22,
  });

  const allMaterials = [
    marbleFloor,
    pearlIvory,
    warmIvoryMarble,
    creamStone,
    lavenderWall,
    lavenderVelvet,
    royalBlueBrocade,
    dustyRoseVelvet,
    emeraldBrocade,
    antiqueGold,
    champagneGold,
    midnightNavy,
    sageGrass,
    emeraldCanopy,
    woodOak,
    darkWalnut,
    velvetCrimson,
    waterStream,
    stainedGlass,
    stainedGlassWarm,
    crystalTurquoise,
    chandelierCrystal,
    candleFlame,
    cofferedCeiling,
    ceilingFresco,
    royalMosaicFloor,
    royalCrestMat,
  ];

  return {
    marbleFloor,
    pearlIvory,
    warmIvoryMarble,
    creamStone,
    lavenderWall,
    lavenderVelvet,
    royalBlueBrocade,
    dustyRoseVelvet,
    emeraldBrocade,
    antiqueGold,
    champagneGold,
    midnightNavy,
    sageGrass,
    emeraldCanopy,
    woodOak,
    darkWalnut,
    velvetCrimson,
    waterStream,
    stainedGlass,
    stainedGlassWarm,
    crystalTurquoise,
    chandelierCrystal,
    candleFlame,
    cofferedCeiling,
    ceilingFresco,
    royalMosaicFloor,
    royalCrestMat,
    dispose: () => {
      textures.forEach((t) => t.dispose());
      allMaterials.forEach((m) => m.dispose());
    },
  };
}
