import { State, WIDTH, HEIGHT, PILLARS } from "./game";
import type { Foe } from "./game";
import { cameraAt, project, SPRITE_SCALE, type Point } from "./projection";

export type FieldCommand = { target?: Point; enemyTarget?: number };
export function draw(
  canvas: HTMLCanvasElement,
  s: State,
  clock: number,
  command: FieldCommand = {},
) {
  const c = canvas.getContext("2d")!;
  const town = s.mode === "town",
    zone = Math.floor(s.room / 2),
    t = clock / 1000;
  const camera = cameraAt(town ? { x: 480, y: 300 } : s, WIDTH, HEIGHT);
  const room = s.rooms[s.room];
  c.clearRect(0, 0, WIDTH, HEIGHT);
  c.fillStyle = "#080e11";
  c.fillRect(0, 0, WIDTH, HEIGHT);
  const tone = town ? "#263331" : ["#302a24", "#1d3434", "#282535"][zone];
  const polygon = (
    points: Point[],
    color: string,
    stroke?: string,
    elevation = 0,
  ) => {
    c.beginPath();
    points.forEach((point, index) => {
      const p = project(point, camera, elevation);
      if (index) c.lineTo(p.x, p.y);
      else c.moveTo(p.x, p.y);
    });
    c.closePath();
    c.fillStyle = color;
    c.fill();
    if (stroke) {
      c.strokeStyle = stroke;
      c.lineWidth = 1;
      c.stroke();
    }
  };
  const rectangle = (x: number, y: number, width: number, depth: number) => [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + depth },
    { x, y: y + depth },
  ];
  const stone = (
    x: number,
    y: number,
    width: number,
    depth: number,
    height: number,
    top: string,
    side = "#222d2c",
    bottom = 0,
  ) => {
    const points = rectangle(x, y, width, depth),
      foot = points.map((p) => project(p, camera, bottom));
    for (const [a, b] of [
      [1, 2],
      [2, 3],
    ]) {
      c.beginPath();
      c.moveTo(foot[a].x, foot[a].y);
      c.lineTo(foot[b].x, foot[b].y);
      c.lineTo(foot[b].x, foot[b].y - height);
      c.lineTo(foot[a].x, foot[a].y - height);
      c.closePath();
      c.fillStyle = a === 1 ? side : "#34413b";
      c.fill();
      c.strokeStyle = "#0b131ba0";
      c.stroke();
    }
    polygon(points, top, "#a99c5e60", height + bottom);
  };
  const circle = (
    point: Point,
    radius: number,
    fill: string,
    stroke: string,
    line = 2,
  ) => {
    const points = Array.from({ length: 40 }, (_, i) => ({
      x: point.x + Math.cos((i / 40) * Math.PI * 2) * radius,
      y: point.y + Math.sin((i / 40) * Math.PI * 2) * radius,
    }));
    polygon(points, fill);
    c.strokeStyle = stroke;
    c.lineWidth = line;
    c.stroke();
  };
  polygon(rectangle(46, 50, 868, 500), tone, "#9e926b");
  for (let y = 72; y < 528; y += 57)
    for (let x = 64; x < 896; x += 64) {
      const surveyed =
        town ||
        Math.hypot(x + 32 - s.x, y + 28 - s.y) < 330 ||
        room.seen.includes(
          Math.floor((x + 32) / 80) + Math.floor((y + 28) / 75) * 12,
        );
      polygon(
        rectangle(x + 1, y + 1, Math.min(62, 895 - x), 55),
        surveyed
          ? Math.sin(x * 8 + y * 37) > 0
            ? "#ffffff07"
            : "#00000015"
          : "#030a0e95",
        "#0b131b60",
      );
    }
  // The camera crops the actual world: pillars, actors and exits retain their world positions.
  circle({ x: 480, y: 300 }, 120, "#00000000", "#b59b6a25", 1);
  if (!town) {
    for (const danger of room.dangers)
      circle(danger, danger.radius, "#ff513329", "#ff725d");
    for (const f of room.foes)
      if (f.hp > 0 && f.windup > 0) {
        const radius =
          f.kind === "bell"
            ? 135
            : f.kind === "mire"
              ? 95
              : f.kind === "king"
                ? 115
                : f.kind === "brute"
                  ? 75
                  : f.kind === "scribe"
                    ? 48
                    : 46;
        circle({ x: f.tx, y: f.ty }, radius, "#ff664426", "#ed8464");
      }
    for (const f of room.foes)
      if (f.hp <= 0) circle(f, 20, "#822d2838", "#00000000");
    if (command.target && !command.enemyTarget)
      circle(command.target, 12, "#eac88215", "#eac882");
    const selected = room.foes.find(
      (f) => f.id === command.enemyTarget && f.hp > 0,
    );
    if (selected) circle(selected, 26, "#ffb87915", "#f0c18d");
    circle(s, 24, "#efd8a70b", "#c0cdb36b", 1);
    if (s.novaCd > 3.2)
      circle(s, (245 * (3.8 - s.novaCd)) / 0.6, "#00000000", "#efa968", 3);
  }
  const objects: { depth: number; draw: () => void }[] = [];
  for (const p of PILLARS)
    objects.push({
      depth: p.x + p.w + p.y + p.h,
      draw: () => {
        stone(p.x - 4, p.y - 4, p.w + 8, p.h + 8, 10, "#626457");
        stone(p.x + 5, p.y + 6, p.w - 10, p.h - 12, 98, "#4a5144", "#202b28");
        stone(p.x - 4, p.y - 4, p.w + 8, p.h + 8, 10, "#727365", "#50574a", 98);
      },
    });
  for (let x = 46; x < 914; x += 96)
    objects.push({
      depth: x + 50,
      draw: () => stone(x, 45, 35, 14, 63, "#4d5548"),
    });
  objects.push({
    depth: 46 + 530,
    draw: () => stone(39, 50, 12, 500, 25, "#535947"),
  });
  objects.push({
    depth: 914 + 550,
    draw: () => stone(910, 50, 12, 500, 20, "#535947"),
  });
  if (!town) {
    objects.push({
      depth: 910 + 340,
      draw: () => {
        stone(889, 266, 24, 74, 68, room.cleared ? "#86c6ac" : "#6a5745");
        const p = project({ x: 900, y: 300 }, camera, 90);
        c.fillStyle = room.cleared ? "#b5efc8" : "#caae82";
        c.font = "11px Georgia";
        c.textAlign = "center";
        c.fillText(room.cleared ? "EASTERN GATE · F" : "GATE SEALED", p.x, p.y);
      },
    });
    for (const drop of room.drops)
      objects.push({
        depth: drop.x + drop.y,
        draw: () => {
          const p = project(drop, camera),
            color = ["#c9b88c", "#75c7b6", "#edbd5e"][drop.relic.rarity];
          c.strokeStyle = color;
          c.fillStyle = "#152321d9";
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(p.x, p.y - 20);
          c.lineTo(p.x + 9, p.y - 6);
          c.lineTo(p.x, p.y + 5);
          c.lineTo(p.x - 9, p.y - 6);
          c.closePath();
          c.fill();
          c.stroke();
          c.fillStyle = color;
          c.font = "10px sans-serif";
          c.textAlign = "center";
          c.fillText(drop.relic.slot.toUpperCase(), p.x, p.y + 20);
        },
      });
    for (const f of room.foes)
      if (f.hp > 0)
        objects.push({
          depth: f.x + f.y,
          draw: () => {
            const p = project(f, camera);
            c.save();
            c.translate(p.x, p.y);
            c.scale(SPRITE_SCALE, SPRITE_SCALE);
            foe(c, { ...f, x: 0, y: 0 }, t, zone);
            c.restore();
            if (f.id === command.enemyTarget) {
              c.fillStyle = "#f2d2a0";
              c.font = "12px Georgia";
              c.textAlign = "center";
              c.fillText(
                `${f.kind.toUpperCase()} · ${Math.ceil(f.hp)}/${f.maxHp}`,
                p.x,
                p.y -
                  (f.kind === "brute"
                    ? 100
                    : ["bell", "mire", "king"].includes(f.kind)
                      ? 125
                      : 83),
              );
            }
          },
        });
    objects.push({
      depth: s.x + s.y,
      draw: () => {
        const p = project(s, camera);
        c.save();
        c.translate(p.x, p.y);
        c.scale(SPRITE_SCALE, SPRITE_SCALE);
        keeper(c, 0, 0, t, s);
        c.restore();
        if (s.attackCd > 0.25) {
          c.strokeStyle = "#f4dea1";
          c.lineWidth = 4;
          c.beginPath();
          c.arc(p.x, p.y - 20, 56, -1.7, 1.5);
          c.stroke();
        }
      },
    });
  } else {
    objects.push({
      depth: 480 + 300,
      draw: () => {
        stone(440, 260, 80, 80, 35, "#8b845d");
        const p = project({ x: 480, y: 300 }, camera, 95);
        c.fillStyle = "#edcb7a";
        c.beginPath();
        c.arc(p.x, p.y, 15 + Math.sin(t), 0, Math.PI * 2);
        c.fill();
      },
    });
    objects.push({
      depth: 580 + 350,
      draw: () => {
        const p = project({ x: 580, y: 350 }, camera);
        c.save();
        c.translate(p.x, p.y);
        c.scale(SPRITE_SCALE, SPRITE_SCALE);
        keeper(c, 0, 0, t, s);
        c.restore();
      },
    });
  }
  objects.sort((a, b) => a.depth - b.depth).forEach((object) => object.draw());
  if (!town) survey(c, s);
  const shade = c.createRadialGradient(
    WIDTH / 2,
    HEIGHT / 2,
    190,
    WIDTH / 2,
    HEIGHT / 2,
    640,
  );
  shade.addColorStop(0, "#02080800");
  shade.addColorStop(1, "#020808b0");
  c.fillStyle = shade;
  c.fillRect(0, 0, WIDTH, HEIGHT);
}
function survey(c: CanvasRenderingContext2D, s: State) {
  const x = 797,
    y = 67,
    w = 130,
    h = 82,
    room = s.rooms[s.room];
  c.fillStyle = "#071011e8";
  c.fillRect(x, y, w, h);
  c.strokeStyle = "#a08f5770";
  c.strokeRect(x, y, w, h);
  for (const cell of room.seen) {
    c.fillStyle = "#4b665880";
    c.fillRect(
      x + ((cell % 12) * w) / 12,
      y + (Math.floor(cell / 12) * h) / 8,
      w / 12,
      h / 8,
    );
  }
  for (const pillar of PILLARS) {
    c.fillStyle = "#8b8960";
    c.fillRect(
      x + (pillar.x / WIDTH) * w,
      y + (pillar.y / HEIGHT) * h,
      (pillar.w / WIDTH) * w,
      (pillar.h / HEIGHT) * h,
    );
  }
  // The map marks the keeper, gate and explored ground; it does not expose hidden foes.
  c.fillStyle = "#efcf8f";
  c.beginPath();
  c.arc(x + (s.x / WIDTH) * w, y + (s.y / HEIGHT) * h, 3, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = room.cleared ? "#95e8bd" : "#886d53";
  c.fillRect(x + (900 / WIDTH) * w - 2, y + (300 / HEIGHT) * h - 3, 4, 6);
  c.font = "9px sans-serif";
  c.fillStyle = "#a4b3a3";
  c.textAlign = "right";
  c.fillText("SURVEY · FOLLOWING FIELD", x + w, y + h + 13);
}
function keeper(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  t: number,
  s: State,
) {
  c.save();
  c.translate(x, y);
  c.fillStyle = "#0009";
  c.beginPath();
  c.ellipse(0, 9, 20, 9, 0, 0, 7);
  c.fill();
  const b = Math.sin(t * 5) * 1;
  c.fillStyle = s.invulnerable > 0 ? "#bce9ce" : "#947d62";
  c.beginPath();
  c.moveTo(0, -38 + b);
  c.quadraticCurveTo(-14, -32, -17, 3);
  c.lineTo(0, 8);
  c.lineTo(17, 3);
  c.quadraticCurveTo(15, -31, 0, -38 + b);
  c.fill();
  c.fillStyle = "#354c4d";
  c.beginPath();
  c.moveTo(0, -25);
  c.lineTo(-13, 5);
  c.lineTo(13, 5);
  c.fill();
  c.strokeStyle = "#b9a885";
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(-12, -20);
  c.lineTo(-24, -7);
  c.lineTo(-30, 14);
  c.stroke();
  c.strokeStyle = "#e9d7aa";
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(12, -17);
  c.lineTo(30, -36);
  c.stroke();
  c.fillStyle = "#131c1d";
  c.beginPath();
  c.ellipse(0, -27 + b, 7, 9, 0, 0, 7);
  c.fill();
  c.fillStyle = "#ffdb87";
  c.fillRect(-27, -8, 7, 10);
  c.fillStyle = "#f3d8ae";
  c.fillRect(-3, -28, 6, 2);
  c.restore();
}
function foe(c: CanvasRenderingContext2D, f: Foe, t: number, zone: number) {
  const boss = ["bell", "mire", "king"].includes(f.kind),
    size = boss ? 1.7 : f.kind === "brute" ? 1.3 : 1;
  c.save();
  c.translate(f.x, f.y);
  c.scale(size, size);
  c.fillStyle = "#0009";
  c.beginPath();
  c.ellipse(0, 7, 21, 10, 0, 0, 7);
  c.fill();
  const b = Math.sin(t * 3 + f.id) * 2;
  const color =
    f.kind === "scribe"
      ? "#658c92"
      : f.kind === "brute"
        ? "#877569"
        : boss
          ? ["#bb9566", "#6ba396", "#9e91bc"][zone]
          : "#6a7b6d";
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(0, -37 + b);
  c.lineTo(-13, -22);
  c.lineTo(-19, 6);
  c.lineTo(-7, 2);
  c.lineTo(0, 9);
  c.lineTo(8, 2);
  c.lineTo(20, 6);
  c.lineTo(12, -21);
  c.closePath();
  c.fill();
  c.fillStyle = "#131a1c";
  c.beginPath();
  c.ellipse(0, -25 + b, 7, 10, 0, 0, 7);
  c.fill();
  c.fillStyle = f.windup > 0 ? "#ffb373" : "#d9b69a";
  c.fillRect(-5, -27 + b, 3, 2);
  c.fillRect(3, -27 + b, 3, 2);
  c.strokeStyle = color;
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(-11, -22);
  c.lineTo(-25, -9);
  c.moveTo(11, -22);
  c.lineTo(25, -12);
  c.stroke();
  if (f.kind === "brute" || f.kind === "bell") {
    c.fillStyle = "#646b63";
    c.fillRect(23, -26, 6, 28);
    c.beginPath();
    c.ellipse(26, -27, 13, 8, 0, 0, 7);
    c.fill();
  }
  if (f.kind === "scribe" || f.kind === "mire") {
    c.strokeStyle = "#a4b8a2";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(24, 4);
    c.lineTo(24, -41);
    c.stroke();
    c.fillStyle = "#8fddc5";
    c.beginPath();
    c.arc(24, -42, 5, 0, 7);
    c.fill();
  }
  if (f.kind === "king") {
    c.fillStyle = "#d4b67b";
    c.beginPath();
    c.moveTo(-10, -35);
    c.lineTo(-12, -46);
    c.lineTo(-3, -39);
    c.lineTo(0, -50);
    c.lineTo(5, -40);
    c.lineTo(12, -46);
    c.lineTo(10, -35);
    c.fill();
  }
  c.restore();
  c.fillStyle = "#151b1d";
  c.fillRect(f.x - 23 * size, f.y - 52 * size, 46 * size, 4);
  c.fillStyle = boss ? "#ddb77b" : "#c37566";
  c.fillRect(f.x - 23 * size, f.y - 52 * size, (46 * size * f.hp) / f.maxHp, 4);
}
