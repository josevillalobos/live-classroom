import { useMemo } from "react";
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeTexture(
  width: number,
  height: number,
  seed: number,
  srgb: boolean,
  draw: (context: CanvasRenderingContext2D, random: () => number) => void,
): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context) draw(context, mulberry32(seed));
  const texture = new CanvasTexture(canvas);
  if (srgb) texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

function drawFloor(context: CanvasRenderingContext2D, random: () => number): void {
  const tile = 128;
  const shades = ["#cdc7b6", "#c6c0af", "#bfb9a8", "#c9c3b2", "#a4aba0"];
  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      const accent = random() < 0.08;
      context.fillStyle = accent ? "#93a096" : shades[Math.floor(random() * 4)];
      context.fillRect(column * tile, row * tile, tile, tile);
      for (let speck = 0; speck < 70; speck += 1) {
        const light = random() < 0.5;
        context.fillStyle = light ? "rgba(240,235,220,0.30)" : "rgba(90,86,76,0.24)";
        context.fillRect(
          column * tile + random() * tile,
          row * tile + random() * tile,
          1 + random() * 2,
          1 + random() * 2,
        );
      }
    }
  }
  context.strokeStyle = "rgba(72,68,60,0.38)";
  context.lineWidth = 2;
  for (let line = 0; line <= 8; line += 1) {
    context.beginPath();
    context.moveTo(line * tile, 0);
    context.lineTo(line * tile, 1024);
    context.moveTo(0, line * tile);
    context.lineTo(1024, line * tile);
    context.stroke();
  }
  for (let scuff = 0; scuff < 26; scuff += 1) {
    context.strokeStyle = `rgba(42,40,36,${0.03 + random() * 0.05})`;
    context.lineWidth = 2 + random() * 5;
    context.beginPath();
    context.arc(random() * 1024, random() * 1024, 24 + random() * 90, random() * 6, random() * 1.4);
    context.stroke();
  }
}

function drawFloorRoughness(context: CanvasRenderingContext2D, random: () => number): void {
  context.fillStyle = "#4f4f4f";
  context.fillRect(0, 0, 512, 512);
  for (let streak = 0; streak < 40; streak += 1) {
    context.fillStyle = `rgba(${random() < 0.5 ? "24,24,24" : "182,182,182"},${0.05 + random() * 0.1})`;
    context.fillRect(random() * 512, random() * 512, 30 + random() * 160, 4 + random() * 26);
  }
  for (let scuff = 0; scuff < 30; scuff += 1) {
    context.strokeStyle = `rgba(214,214,214,${0.1 + random() * 0.2})`;
    context.lineWidth = 1 + random() * 4;
    context.beginPath();
    context.arc(random() * 512, random() * 512, 10 + random() * 60, random() * 6, random() * 1.2);
    context.stroke();
  }
}

function drawWall(context: CanvasRenderingContext2D, random: () => number): void {
  const blockWidth = 128;
  const blockHeight = 64;
  const railY = 660;
  context.fillStyle = "#ded9c8";
  context.fillRect(0, 0, 1024, railY);
  context.fillStyle = "#9dab97";
  context.fillRect(0, railY, 1024, 1024 - railY);
  for (let row = 0; row < 16; row += 1) {
    const offset = row % 2 === 0 ? 0 : -blockWidth / 2;
    for (let column = -1; column < 9; column += 1) {
      const x = column * blockWidth + offset;
      const y = row * blockHeight;
      const below = y >= railY - blockHeight / 2;
      context.fillStyle = below
        ? `rgba(52,66,50,${0.02 + random() * 0.05})`
        : `rgba(120,112,96,${0.02 + random() * 0.05})`;
      context.fillRect(x + 2, y + 2, blockWidth - 4, blockHeight - 4);
      context.strokeStyle = "rgba(96,92,82,0.16)";
      context.lineWidth = 3;
      context.strokeRect(x + 1, y + 1, blockWidth - 2, blockHeight - 2);
    }
  }
  context.fillStyle = "#c9c2ac";
  context.fillRect(0, railY - 10, 1024, 14);
  const grime = context.createLinearGradient(0, 880, 0, 1024);
  grime.addColorStop(0, "rgba(40,42,36,0)");
  grime.addColorStop(1, "rgba(40,42,36,0.22)");
  context.fillStyle = grime;
  context.fillRect(0, 880, 1024, 144);
}

function drawCeiling(context: CanvasRenderingContext2D, random: () => number): void {
  context.fillStyle = "#e2e0d4";
  context.fillRect(0, 0, 512, 256);
  for (let hole = 0; hole < 2600; hole += 1) {
    context.fillStyle = `rgba(122,120,110,${0.1 + random() * 0.22})`;
    context.fillRect(random() * 512, random() * 256, 1.4, 1.4);
  }
  context.strokeStyle = "rgba(150,146,132,0.85)";
  context.lineWidth = 4;
  for (const x of [0, 256, 512]) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, 256);
    context.stroke();
  }
  for (const y of [0, 128, 256]) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(512, y);
    context.stroke();
  }
}

function drawWood(context: CanvasRenderingContext2D, random: () => number): void {
  context.fillStyle = "#a97e4c";
  context.fillRect(0, 0, 512, 512);
  for (let grain = 0; grain < 46; grain += 1) {
    const dark = random() < 0.65;
    context.strokeStyle = dark
      ? `rgba(112,74,36,${0.1 + random() * 0.2})`
      : `rgba(206,164,110,${0.1 + random() * 0.16})`;
    context.lineWidth = 1 + random() * 2.4;
    const y = random() * 512;
    const wobble = 3 + random() * 9;
    context.beginPath();
    context.moveTo(0, y);
    for (let x = 0; x <= 512; x += 32) {
      context.lineTo(x, y + Math.sin(x * 0.02 + grain) * wobble);
    }
    context.stroke();
  }
  for (let knot = 0; knot < 3; knot += 1) {
    context.strokeStyle = "rgba(96,62,28,0.32)";
    context.lineWidth = 2;
    context.beginPath();
    context.ellipse(random() * 512, random() * 512, 8 + random() * 10, 4 + random() * 5, random(), 0, Math.PI * 2);
    context.stroke();
  }
}

function drawChalkboard(context: CanvasRenderingContext2D, random: () => number): void {
  context.fillStyle = "#2c483c";
  context.fillRect(0, 0, 1024, 512);
  for (let smudge = 0; smudge < 60; smudge += 1) {
    context.save();
    context.translate(random() * 1024, random() * 512);
    context.rotate((random() - 0.5) * 0.5);
    context.fillStyle = `rgba(226,224,208,${0.015 + random() * 0.035})`;
    context.beginPath();
    context.ellipse(0, 0, 40 + random() * 130, 8 + random() * 26, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
  for (let drag = 0; drag < 10; drag += 1) {
    context.fillStyle = `rgba(222,220,204,${0.02 + random() * 0.03})`;
    context.fillRect(random() * 900, random() * 460, 90 + random() * 200, 24 + random() * 40);
  }
  context.strokeStyle = "rgba(238,236,222,0.10)";
  context.lineWidth = 3;
  for (let mark = 0; mark < 6; mark += 1) {
    context.beginPath();
    const x = 80 + random() * 860;
    const y = 70 + random() * 360;
    context.moveTo(x, y);
    context.quadraticCurveTo(x + 40 + random() * 60, y - 20 + random() * 40, x + 90 + random() * 90, y + (random() - 0.5) * 30);
    context.stroke();
  }
  // Every chalk stroke is drawn twice with jitter so lines wobble like a hand, not a ruler.
  const stroke = (
    points: ReadonlyArray<readonly [number, number]>,
    width: number,
    alpha: number,
    dashed = false,
  ) => {
    context.strokeStyle = `rgba(244, 242, 232, ${alpha})`;
    context.lineWidth = width;
    context.lineCap = "round";
    context.setLineDash(dashed ? [10 + random() * 6, 8 + random() * 6] : []);
    for (let pass = 0; pass < 2; pass += 1) {
      context.globalAlpha = pass === 0 ? 1 : 0.4;
      context.beginPath();
      points.forEach(([x, y], index) => {
        const jx = x + (random() - 0.5) * 5;
        const jy = y + (random() - 0.5) * 5;
        if (index === 0) {
          context.moveTo(jx, jy);
          return;
        }
        const [px, py] = points[index - 1];
        context.quadraticCurveTo(
          (px + jx) / 2 + (random() - 0.5) * 9,
          (py + jy) / 2 + (random() - 0.5) * 9,
          jx,
          jy,
        );
      });
      context.stroke();
    }
    context.globalAlpha = 1;
    context.setLineDash([]);
  };
  // Glyph-by-glyph placement: each letter gets its own size, tilt, baseline drift, and chalk pressure.
  const chalk = (text: string, x: number, y: number, size: number, alpha = 0.88) => {
    let cursor = x;
    for (const glyph of text) {
      const wobble = size * (0.88 + random() * 0.24);
      context.font = `${wobble}px Chalkduster, "Bradley Hand", "Comic Sans MS", "Segoe Print", cursive`;
      const advance = context.measureText(glyph).width;
      if (glyph === " ") {
        cursor += advance;
        continue;
      }
      context.save();
      context.translate(cursor + advance / 2, y + (random() - 0.5) * size * 0.16);
      context.rotate((random() - 0.5) * 0.18);
      context.fillStyle = `rgba(236, 234, 222, ${alpha * 0.3})`;
      context.fillText(glyph, -advance / 2 + 1.5, 1.5);
      context.fillStyle = `rgba(244, 242, 232, ${Math.min(1, alpha * (0.7 + random() * 0.35))})`;
      context.fillText(glyph, -advance / 2, 0);
      context.restore();
      cursor += advance * (0.92 + random() * 0.12);
    }
  };
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  // Square chalk brackets around a matrix laid out at (x, y) with the given row height.
  const bracket = (x: number, y: number, height: number, width: number, alpha = 0.8) => {
    stroke([[x + 12, y], [x, y + 2], [x - 1, y + height], [x + 12, y + height + 2]], 3, alpha);
    stroke([[x + width - 12, y], [x + width, y + 2], [x + width + 1, y + height], [x + width - 12, y + height + 2]], 3, alpha);
  };
  const matrix = (x: number, y: number, rows: readonly (readonly string[])[], size: number, alpha = 0.85) => {
    const column = size * 1.55;
    const rowHeight = size * 1.25;
    bracket(x, y - size * 0.95, rows.length * rowHeight, rows[0].length * column + size * 0.55, alpha);
    rows.forEach((row, r) => {
      row.forEach((cell, c) => chalk(cell, x + 16 + c * column, y + r * rowHeight, size, alpha));
    });
  };
  chalk("A =", 70, 178, 34, 0.85);
  matrix(150, 178, [["1", "2"], ["3", "4"]], 34);
  chalk("B =", 300, 178, 34, 0.85);
  matrix(380, 178, [["5", "6"], ["7", "8"]], 34);
  chalk("AB =", 70, 300, 34, 0.85);
  matrix(170, 300, [["1·5+2·7", "1·6+2·8"], ["3·5+4·7", "3·6+4·8"]], 24, 0.75);
  chalk("=", 500, 300, 34, 0.85);
  matrix(560, 300, [["19", "22"], ["43", "50"]], 34);
  const ring: Array<readonly [number, number]> = [];
  for (let step = 0; step <= 22; step += 1) {
    const angle = (step / 22) * Math.PI * 2.05 - 0.5;
    ring.push([596 + Math.cos(angle) * 27, 290 + Math.sin(angle) * 23]);
  }
  stroke(ring, 3, 0.55);
  chalk("row 1 · col 1", 660, 262, 22, 0.7);
  stroke([[655, 268], [640, 280], [636, 290]], 2.5, 0.6);
  chalk("(AB)ij = Σ aik bkj", 70, 400, 32, 0.8);
  chalk("k", 268, 428, 20, 0.7);
  chalk("(m × n)(n × p) → m × p", 560, 130, 30, 0.8);
  chalk("inner sizes must match!", 585, 178, 24, 0.7);
  stroke([[676, 138], [740, 140]], 2.5, 0.55);
  stroke([[708, 138], [700, 150], [712, 158]], 2.5, 0.55);
  chalk("Homework: p. 42  #1-12", 560, 430, 28, 0.7);
}

function drawClockFace(context: CanvasRenderingContext2D): void {
  context.fillStyle = "#f4f2e8";
  context.beginPath();
  context.arc(128, 128, 126, 0, Math.PI * 2);
  context.fill();
  for (let tick = 0; tick < 60; tick += 1) {
    const major = tick % 5 === 0;
    const angle = (tick / 60) * Math.PI * 2;
    context.strokeStyle = "#2c2f30";
    context.lineWidth = major ? 5 : 2;
    context.beginPath();
    context.moveTo(128 + Math.cos(angle) * (major ? 102 : 112), 128 + Math.sin(angle) * (major ? 102 : 112));
    context.lineTo(128 + Math.cos(angle) * 120, 128 + Math.sin(angle) * 120);
    context.stroke();
  }
  context.fillStyle = "#2c2f30";
  context.font = "700 44px Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("12", 128, 44);
  context.fillText("3", 214, 128);
  context.fillText("6", 128, 214);
  context.fillText("9", 42, 128);
}

function drawPaper(context: CanvasRenderingContext2D, random: () => number): void {
  context.fillStyle = "#f5f3ec";
  context.fillRect(0, 0, 256, 340);
  context.fillStyle = "rgba(90, 88, 82, 0.75)";
  context.fillRect(24, 18, 104 + random() * 40, 7);
  context.strokeStyle = "rgba(118, 116, 108, 0.55)";
  context.lineWidth = 2.4;
  for (let line = 0; line < 18; line += 1) {
    const y = 48 + line * 15;
    let x = 24;
    while (x < 206) {
      const length = 10 + random() * 36;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(Math.min(228, x + length), y);
      context.stroke();
      x += length + 8;
    }
  }
  const shade = context.createLinearGradient(0, 0, 256, 340);
  shade.addColorStop(0, "rgba(0, 0, 0, 0)");
  shade.addColorStop(1, "rgba(62, 58, 50, 0.09)");
  context.fillStyle = shade;
  context.fillRect(0, 0, 256, 340);
}

function drawDesktopScreen(context: CanvasRenderingContext2D, random: () => number): void {
  context.fillStyle = "#3f6e9e";
  context.fillRect(0, 0, 256, 192);
  const glow = context.createRadialGradient(128, 88, 26, 128, 96, 168);
  glow.addColorStop(0, "rgba(255, 255, 255, 0.15)");
  glow.addColorStop(1, "rgba(8, 18, 40, 0.4)");
  context.fillStyle = glow;
  context.fillRect(0, 0, 256, 192);
  ["#e8c84a", "#d8dde2", "#7fb069", "#c98a4b"].forEach((color, icon) => {
    const y = 14 + icon * 36;
    context.fillStyle = color;
    context.fillRect(13, y, 15, 13);
    context.fillStyle = "rgba(255, 255, 255, 0.85)";
    context.fillRect(9, y + 17, 24, 3);
  });
  context.fillStyle = "#ece9df";
  context.fillRect(92, 42, 122, 92);
  context.fillStyle = "#2d4f8a";
  context.fillRect(92, 42, 122, 13);
  context.fillStyle = "#b7bcb1";
  context.fillRect(203, 44, 9, 9);
  context.strokeStyle = "rgba(72, 80, 90, 0.55)";
  context.lineWidth = 2;
  for (let line = 0; line < 5; line += 1) {
    context.beginPath();
    context.moveTo(101, 70 + line * 12);
    context.lineTo(140 + random() * 62, 70 + line * 12);
    context.stroke();
  }
  context.fillStyle = "#c8c5ba";
  context.fillRect(0, 174, 256, 18);
  context.fillStyle = "#6f9455";
  context.fillRect(3, 177, 34, 12);
  context.fillStyle = "#a9a698";
  context.fillRect(214, 177, 39, 12);
}

function drawKeyboardKeys(context: CanvasRenderingContext2D): void {
  context.fillStyle = "#cfc8b6";
  context.fillRect(0, 0, 256, 96);
  for (let row = 0; row < 4; row += 1) {
    for (let x = 7 + (row % 2) * 4; x < 240; x += 17) {
      context.fillStyle = "#b4ad9c";
      context.fillRect(x, 7 + row * 21, 14, 15);
      context.fillStyle = "rgba(70, 66, 56, 0.35)";
      context.fillRect(x, 19 + row * 21, 14, 3);
    }
  }
  context.fillStyle = "#b4ad9c";
  context.fillRect(78, 70, 100, 15);
  context.fillStyle = "rgba(70, 66, 56, 0.35)";
  context.fillRect(78, 82, 100, 3);
}

export function useClassroomTextures() {
  return useMemo(() => {
    const floorMap = makeTexture(1024, 1024, 11, true, drawFloor);
    floorMap.repeat.set(3, 2.45);
    const floorRoughness = makeTexture(512, 512, 12, false, drawFloorRoughness);
    floorRoughness.repeat.set(3, 2.45);
    const wallBack = makeTexture(1024, 1024, 21, true, drawWall);
    wallBack.repeat.set(2.2, 1);
    const wallSide = wallBack.clone();
    wallSide.repeat.set(1.5, 1);
    wallSide.needsUpdate = true;
    const ceiling = makeTexture(512, 256, 31, true, drawCeiling);
    ceiling.repeat.set(5.5, 8);
    const wood = makeTexture(512, 512, 41, true, drawWood);
    const woodLarge = wood.clone();
    woodLarge.repeat.set(0.34, 0.34);
    woodLarge.needsUpdate = true;
    const chalkboard = makeTexture(1024, 512, 51, true, drawChalkboard);
    const clockFace = makeTexture(256, 256, 81, true, (context) => drawClockFace(context));
    const paper = makeTexture(256, 340, 111, true, drawPaper);
    const paperAlt = makeTexture(256, 340, 121, true, drawPaper);
    const desktopScreen = makeTexture(256, 192, 131, true, drawDesktopScreen);
    const keyboardKeys = makeTexture(256, 96, 141, true, (context) => drawKeyboardKeys(context));
    return {
      ceiling,
      chalkboard,
      clockFace,
      desktopScreen,
      floorMap,
      floorRoughness,
      keyboardKeys,
      paper,
      paperAlt,
      wallBack,
      wallSide,
      wood,
      woodLarge,
    };
  }, []);
}

export type ClassroomTextures = ReturnType<typeof useClassroomTextures>;
