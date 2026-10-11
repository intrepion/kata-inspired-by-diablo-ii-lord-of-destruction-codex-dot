export type Slot = "weapon" | "coat" | "charm";
export type Relic = {
  id: number;
  name: string;
  slot: Slot;
  rarity: number;
  power: number;
  value: number;
};
export type FoeKind = "wraith" | "brute" | "scribe" | "bell" | "mire" | "king";
export type Foe = {
  id: number;
  kind: FoeKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  timer: number;
  windup: number;
  tx: number;
  ty: number;
};
export type Danger = {
  x: number;
  y: number;
  radius: number;
  timer: number;
  damage: number;
};
export type Drop = { x: number; y: number; relic: Relic };
export type Chamber = {
  foes: Foe[];
  drops: Drop[];
  dangers: Danger[];
  cleared: boolean;
  visited: boolean;
  seen: number[];
};
export type State = {
  version: 1;
  seed: number;
  nextId: number;
  mode: "town" | "field" | "dead" | "ending";
  room: number;
  cycle: number;
  embers: number;
  level: number;
  xp: number;
  points: number;
  ranks: { edge: number; cinder: number; resolve: number };
  gold: number;
  flasks: number;
  hp: number;
  mana: number;
  x: number;
  y: number;
  attackCd: number;
  novaCd: number;
  dashCd: number;
  invulnerable: number;
  gear: Record<Slot, Relic>;
  pack: Relic[];
  rooms: Chamber[];
  journal: string[];
  time: number;
};
export type Input = {
  dx: number;
  dy: number;
  target?: { x: number; y: number };
  attack?: boolean;
};
export const WIDTH = 960,
  HEIGHT = 600;
export const DISTRICTS = [
  {
    name: "The Ashen Steps",
    boss: "The Bellkeeper",
    color: "#c39158",
    story: "A bell tolls beneath the ash. Silence its keeper.",
  },
  {
    name: "The Drowned Archive",
    boss: "The Mire Matron",
    color: "#66b7ab",
    story: "The ink remembers every drowned soul. Burn its roots.",
  },
  {
    name: "The Crownless Court",
    boss: "The Hollow King",
    color: "#a596d5",
    story: "A stolen light keeps the empty throne alive. Take it back.",
  },
];
export const PILLARS = [
  { x: 340, y: 175, w: 64, h: 76 },
  { x: 340, y: 395, w: 64, h: 76 },
  { x: 650, y: 165, w: 62, h: 80 },
  { x: 650, y: 390, w: 62, h: 80 },
];
const names: Record<Slot, string[]> = {
  weapon: ["Ashglass sabre", "Grave iron", "Sundering sickle"],
  coat: ["Pilgrim mantle", "Cinder mail", "Vesper shroud"],
  charm: ["Widow lantern", "Oathstone", "Dawn seal"],
};
export const clamp = (v: number, a: number, b: number) =>
  Math.max(a, Math.min(b, v));
export function random(s: State) {
  s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0;
  return s.seed / 4294967296;
}
export function makeRelic(s: State, slot: Slot, tier: number): Relic {
  const r = random(s);
  const rarity = r > 0.94 ? 2 : r > 0.55 ? 1 : 0;
  const power = 2 + tier * 2 + rarity * 3 + Math.floor(random(s) * 3);
  return {
    id: s.nextId++,
    name:
      (rarity === 2 ? "Sunbound " : rarity === 1 ? "Runed " : "") +
      names[slot][Math.floor(random(s) * 3)],
    slot,
    rarity,
    power,
    value: 5 + power * 2,
  };
}
export function stats(s: State) {
  return {
    maxHp:
      100 + (s.level - 1) * 14 + s.gear.coat.power * 3 + s.ranks.resolve * 18,
    attack: 18 + (s.level - 1) * 3 + s.gear.weapon.power * 2 + s.ranks.edge * 6,
    armor: s.gear.coat.power * 0.6 + s.ranks.resolve * 1.5,
    nova: 32 + s.gear.charm.power * 3 + s.ranks.cinder * 14,
    maxMana: 80 + s.gear.charm.power * 3,
    speed: 165 + s.ranks.resolve * 8,
  };
}
export function newGame(seed = Date.now()): State {
  const s = {
    version: 1,
    seed: seed >>> 0,
    nextId: 1,
    mode: "town",
    room: 0,
    cycle: 1,
    embers: 0,
    level: 1,
    xp: 0,
    points: 0,
    ranks: { edge: 0, cinder: 0, resolve: 0 },
    gold: 20,
    flasks: 3,
    hp: 100,
    mana: 80,
    x: 150,
    y: 300,
    attackCd: 0,
    novaCd: 0,
    dashCd: 0,
    invulnerable: 0,
    gear: {} as Record<Slot, Relic>,
    pack: [],
    rooms: [],
    journal: ["The lantern stirs. Three stolen embers await."],
    time: 0,
  } as State;
  for (const slot of ["weapon", "coat", "charm"] as Slot[])
    s.gear[slot] = {
      id: s.nextId++,
      name: names[slot][0],
      slot,
      rarity: 0,
      power: 2,
      value: 5,
    };
  s.hp = stats(s).maxHp;
  s.mana = stats(s).maxMana;
  s.rooms = makeRooms(s);
  return s;
}
function makeRooms(s: State): Chamber[] {
  return Array.from({ length: 6 }, (_, room) => {
    const tier = Math.floor(room / 2);
    const boss = room % 2 === 1;
    const kinds: FoeKind[] = boss
      ? [(["bell", "mire", "king"] as FoeKind[])[tier]]
      : ["wraith", "scribe", "brute", "wraith"];
    const foes = kinds.map((kind, i) => {
      const hp =
        (boss
          ? 180 + tier * 90
          : kind === "brute"
            ? 80
            : kind === "scribe"
              ? 48
              : 58) *
        (1 + (s.cycle - 1) * 0.5);
      return {
        id: s.nextId++,
        kind,
        x: boss ? 740 : 510 + i * 95,
        y: boss ? 300 : 150 + i * 95,
        hp,
        maxHp: hp,
        timer: 1 + i * 0.4,
        windup: 0,
        tx: 0,
        ty: 0,
      };
    });
    return {
      foes,
      drops: [],
      dangers: [],
      cleared: false,
      visited: false,
      seen: [],
    };
  });
}
export function log(s: State, message: string) {
  s.journal = [message, ...s.journal].slice(0, 6);
}
export function equip(s: State, id: number) {
  const i = s.pack.findIndex((r) => r.id === id);
  if (i < 0 || s.mode === "dead") return false;
  const relic = s.pack[i];
  s.pack[i] = s.gear[relic.slot];
  s.gear[relic.slot] = relic;
  s.hp = Math.min(s.hp, stats(s).maxHp);
  s.mana = Math.min(s.mana, stats(s).maxMana);
  log(s, `Equipped ${relic.name}.`);
  return true;
}
export function salvage(s: State, id: number) {
  if (s.mode === "dead") return false;
  const i = s.pack.findIndex((r) => r.id === id);
  if (i < 0) return false;
  s.gold += s.pack[i].value;
  s.pack.splice(i, 1);
  return true;
}
export function learn(s: State, path: keyof State["ranks"]) {
  if (s.points < 1 || s.ranks[path] >= 5 || s.mode === "dead") return false;
  s.points--;
  s.ranks[path]++;
  log(s, `${path[0].toUpperCase() + path.slice(1)} deepens.`);
  return true;
}
export function buy(s: State) {
  const cost = 25 + s.cycle * 10;
  if (s.mode !== "town" || s.gold < cost || s.pack.length >= 12) return false;
  s.gold -= cost;
  s.pack.push(
    makeRelic(
      s,
      (["weapon", "coat", "charm"] as Slot[])[Math.floor(random(s) * 3)],
      Math.floor(s.room / 2) + s.cycle,
    ),
  );
  return true;
}
export function enter(s: State) {
  if (s.mode !== "town") return false;
  s.mode = "field";
  s.rooms[s.room].visited = true;
  s.x = 150;
  s.y = 300;
  s.invulnerable = 1;
  log(s, DISTRICTS[Math.floor(s.room / 2)].story);
  return true;
}
export function recall(s: State) {
  if (s.mode !== "field") return false;
  s.mode = "town";
  recover(s);
  log(s, "The sanctuary rekindles your lantern.");
  return true;
}
function recover(s: State) {
  s.hp = stats(s).maxHp;
  s.mana = stats(s).maxMana;
  s.flasks = 3;
  s.attackCd = 0;
  s.novaCd = 0;
  s.dashCd = 0;
  s.invulnerable = 1;
}
export function retry(s: State) {
  if (s.mode !== "dead") return false;
  s.gold = Math.floor(s.gold * 0.8);
  s.mode = "town";
  recover(s);
  log(s, "Rekindled. Relics and experience remain; one fifth of gold is lost.");
  return true;
}
export function next(s: State) {
  if (s.mode !== "field" || !s.rooms[s.room].cleared) return false;
  if (s.room === 5) {
    s.mode = "ending";
    log(s, "The crown falls. Dawn returns to Vesper.");
    return true;
  }
  s.room++;
  s.x = 150;
  s.y = 300;
  s.rooms[s.room].visited = true;
  s.hp = Math.min(stats(s).maxHp, s.hp + 25);
  s.mana = Math.min(stats(s).maxMana, s.mana + 30);
  s.invulnerable = 1;
  log(s, DISTRICTS[Math.floor(s.room / 2)].story);
  return true;
}
export function newCycle(s: State) {
  if (s.mode !== "ending") return false;
  s.cycle++;
  s.embers = 0;
  s.room = 0;
  s.rooms = makeRooms(s);
  s.mode = "town";
  recover(s);
  log(s, `Cycle ${s.cycle}: the darkness gathers again.`);
  return true;
}
export function flask(s: State) {
  if (s.mode !== "field" || s.flasks < 1 || s.hp === stats(s).maxHp)
    return false;
  s.flasks--;
  s.hp = Math.min(stats(s).maxHp, s.hp + 70);
  return true;
}
export function walkable(x: number, y: number) {
  return (
    x >= 64 &&
    x <= 896 &&
    y >= 72 &&
    y <= 528 &&
    !PILLARS.some(
      (p) =>
        x > p.x - 18 &&
        x < p.x + p.w + 18 &&
        y > p.y - 18 &&
        y < p.y + p.h + 18,
    )
  );
}
function move(s: State, dx: number, dy: number) {
  if (walkable(s.x + dx, s.y)) s.x += dx;
  if (walkable(s.x, s.y + dy)) s.y += dy;
}
export function dash(s: State, dx: number, dy: number) {
  if (s.mode !== "field" || s.dashCd > 0) return false;
  const len = Math.hypot(dx, dy) || 1;
  for (let i = 0; i < 12; i++) move(s, (dx / len) * 13, (dy / len) * 13);
  s.invulnerable = 0.6;
  s.dashCd = 2.8;
  return true;
}
export function hurt(s: State, damage: number) {
  if (s.mode !== "field" || s.invulnerable > 0) return;
  s.hp = Math.max(0, s.hp - Math.max(1, damage - stats(s).armor));
  if (s.hp === 0) {
    s.mode = "dead";
    log(s, "Your lantern goes dark. Return to the sanctuary to rekindle.");
  }
}
function xp(s: State, amount: number) {
  s.xp += amount;
  while (s.xp >= 40 + s.level * 20) {
    s.xp -= 40 + s.level * 20;
    s.level++;
    s.points++;
    s.hp = stats(s).maxHp;
    s.mana = stats(s).maxMana;
    log(s, `Level ${s.level}. A discipline point awakens.`);
  }
}
function damage(s: State, f: Foe, amount: number) {
  if (f.hp <= 0) return;
  f.hp = Math.max(0, f.hp - amount);
  if (f.hp > 0) return;
  const boss = ["bell", "mire", "king"].includes(f.kind);
  s.gold += boss ? 35 + s.room * 8 : 7 + s.room * 2;
  xp(s, boss ? 70 + s.room * 10 : 20 + s.room * 3);
  if (boss || random(s) > 0.3) {
    const slot = (["weapon", "coat", "charm"] as Slot[])[
      Math.floor(random(s) * 3)
    ];
    const relic = makeRelic(s, slot, Math.floor(s.room / 2) + s.cycle);
    s.rooms[s.room].drops.push({ x: f.x, y: f.y, relic });
  }
  if (boss) {
    s.embers++;
    log(
      s,
      `${DISTRICTS[Math.floor(s.room / 2)].boss} falls. Ember ${s.embers}/3 recovered.`,
    );
  }
  const room = s.rooms[s.room];
  if (room.foes.every((e) => e.hp <= 0)) {
    room.cleared = true;
    room.dangers = [];
    log(s, "Chamber cleared. Gather relics, then take the eastern gate.");
  }
}
export function strike(s: State) {
  if (s.mode !== "field" || s.attackCd > 0) return false;
  const foes = s.rooms[s.room].foes
    .filter((f) => f.hp > 0)
    .sort(
      (a, b) =>
        Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y),
    );
  const f = foes[0];
  if (
    !f ||
    Math.hypot(f.x - s.x, f.y - s.y) > 125 ||
    !lineClear(s.x, s.y, f.x, f.y)
  )
    return false;
  s.attackCd = 0.42;
  damage(s, f, stats(s).attack);
  return true;
}
export function nova(s: State) {
  if (s.mode !== "field" || s.novaCd > 0 || s.mana < 25) return false;
  s.mana -= 25;
  s.novaCd = 3.8;
  for (const f of s.rooms[s.room].foes)
    if (Math.hypot(f.x - s.x, f.y - s.y) < 245) damage(s, f, stats(s).nova);
  return true;
}
export function collect(s: State) {
  if (s.mode !== "field") return 0;
  const room = s.rooms[s.room];
  let n = 0;
  for (let i = room.drops.length - 1; i >= 0; i--) {
    const d = room.drops[i];
    if (Math.hypot(d.x - s.x, d.y - s.y) > 80) continue;
    if (s.pack.length >= 12) {
      log(s, "Pack full. Open Relics and salvage an item.");
      break;
    }
    s.pack.push(d.relic);
    room.drops.splice(i, 1);
    n++;
  }
  if (n) log(s, `${n} relic${n === 1 ? "" : "s"} gathered.`);
  return n;
}
export function tick(s: State, dt: number, input: Input) {
  if (s.mode !== "field") return;
  dt = clamp(dt, 0, 0.05);
  s.time += dt;
  s.attackCd = Math.max(0, s.attackCd - dt);
  s.novaCd = Math.max(0, s.novaCd - dt);
  s.dashCd = Math.max(0, s.dashCd - dt);
  s.invulnerable = Math.max(0, s.invulnerable - dt);
  s.mana = Math.min(stats(s).maxMana, s.mana + dt * (7 + s.ranks.cinder));
  let dx = input.dx,
    dy = input.dy;
  if (input.target && !dx && !dy) {
    dx = input.target.x - s.x;
    dy = input.target.y - s.y;
    if (Math.hypot(dx, dy) < 5) {
      dx = 0;
      dy = 0;
    }
  }
  const length = Math.hypot(dx, dy);
  if (length > 0) {
    const direction =
      input.target && !input.dx && !input.dy
        ? navigate(s.x, s.y, input.target.x, input.target.y)
        : { dx: dx / length, dy: dy / length };
    move(
      s,
      direction.dx * stats(s).speed * dt,
      direction.dy * stats(s).speed * dt,
    );
  }
  if (input.attack) strike(s);
  const room = s.rooms[s.room];
  const cell = Math.floor(s.x / 80) + Math.floor(s.y / 75) * 12;
  if (!room.seen.includes(cell)) room.seen.push(cell);
  for (const f of room.foes) {
    if (f.hp <= 0) continue;
    const dist = Math.hypot(f.x - s.x, f.y - s.y);
    if (dist > 520) continue;
    f.timer = Math.max(0, f.timer - dt);
    const boss = ["bell", "mire", "king"].includes(f.kind);
    const ranged = f.kind === "scribe";
    const speed =
      (boss ? 48 : f.kind === "brute" ? 60 : 92) * (1 + (s.cycle - 1) * 0.08);
    if (f.windup > 0) {
      f.windup = Math.max(0, f.windup - dt);
      if (f.windup <= 0) {
        const radius =
          f.kind === "bell"
            ? 135
            : f.kind === "mire"
              ? 95
              : f.kind === "king"
                ? 115
                : f.kind === "brute"
                  ? 75
                  : ranged
                    ? 48
                    : 46;
        room.dangers.push({
          x: f.tx,
          y: f.ty,
          radius,
          timer: 0.06,
          damage:
            (boss ? 24 : f.kind === "brute" ? 23 : 14) *
            (1 + (s.cycle - 1) * 0.3),
        });
        f.timer = boss ? 1.6 : ranged ? 1.8 : 1.1;
      }
      continue;
    }
    if (dist > (ranged ? 220 : boss ? 130 : 50)) {
      const direction = navigate(f.x, f.y, s.x, s.y);
      const ux = direction.dx * speed * dt,
        uy = direction.dy * speed * dt;
      if (walkable(f.x + ux, f.y)) f.x += ux;
      if (walkable(f.x, f.y + uy)) f.y += uy;
    }
    if (f.timer <= 0 && dist < (ranged ? 420 : boss ? 340 : 100)) {
      f.windup = boss ? 1.05 : ranged ? 0.9 : f.kind === "brute" ? 0.85 : 0.55;
      f.tx = s.x;
      f.ty = s.y;
      if (f.kind === "bell") {
        f.tx = f.x;
        f.ty = f.y;
      }
      if (f.kind === "king") {
        room.dangers.push({
          x: s.x,
          y: s.y,
          radius: 70,
          timer: 1.25,
          damage: 28,
        });
      }
      if (f.kind === "mire") {
        room.dangers.push({
          x: clamp(s.x + 120, 75, 885),
          y: clamp(s.y - 90, 85, 515),
          radius: 80,
          timer: 1.45,
          damage: 20,
        });
      }
    }
  }
  for (let i = room.dangers.length - 1; i >= 0; i--) {
    const d = room.dangers[i];
    d.timer -= dt;
    if (d.timer <= 0) {
      if (Math.hypot(d.x - s.x, d.y - s.y) < d.radius) hurt(s, d.damage);
      room.dangers.splice(i, 1);
    }
  }
}
export function serialize(s: State) {
  return JSON.stringify(s);
}
export function restore(raw: string): State | null {
  try {
    const s = JSON.parse(raw);
    if (!validState(s)) return null;
    for (const r of s.rooms)
      for (const f of r.foes) {
        f.timer = Math.max(0, f.timer);
        f.windup = Math.max(0, f.windup);
      }
    return s;
  } catch {
    return null;
  }
}
function validState(s: unknown): s is State {
  if (!s || typeof s !== "object") return false;
  const v = s as State;
  const number = (n: unknown, min = 0, max = 1e9) =>
    typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;
  const relic = (r: Relic) =>
    r &&
    number(r.id, 1) &&
    typeof r.name === "string" &&
    r.name.length < 100 &&
    ["weapon", "coat", "charm"].includes(r.slot) &&
    number(r.rarity, 0, 2) &&
    number(r.power, 0, 10000) &&
    number(r.value);
  if (v.version !== 1 || !["town", "field", "dead", "ending"].includes(v.mode))
    return false;
  for (const key of [
    "seed",
    "nextId",
    "room",
    "cycle",
    "embers",
    "level",
    "xp",
    "points",
    "gold",
    "flasks",
    "hp",
    "mana",
    "x",
    "y",
    "attackCd",
    "novaCd",
    "dashCd",
    "invulnerable",
    "time",
  ] as const)
    if (!number(v[key], 0, key === "seed" ? 4294967295 : 1e9)) return false;
  if (
    !Number.isInteger(v.room) ||
    v.room > 5 ||
    v.cycle < 1 ||
    v.level < 1 ||
    v.flasks > 3 ||
    v.embers > 3 ||
    v.x > WIDTH ||
    v.y > HEIGHT
  )
    return false;
  if (
    !v.ranks ||
    !["edge", "cinder", "resolve"].every((k) =>
      number(v.ranks[k as keyof typeof v.ranks], 0, 5),
    )
  )
    return false;
  if (
    !v.gear ||
    !(["weapon", "coat", "charm"] as Slot[]).every(
      (k) => relic(v.gear[k]) && v.gear[k].slot === k,
    ) ||
    !Array.isArray(v.pack) ||
    v.pack.length > 12 ||
    !v.pack.every(relic)
  )
    return false;
  if (!Array.isArray(v.rooms) || v.rooms.length !== 6) return false;
  for (const r of v.rooms) {
    if (
      !r ||
      typeof r.cleared !== "boolean" ||
      typeof r.visited !== "boolean" ||
      !Array.isArray(r.seen) ||
      !r.seen.every((n) => number(n, 0, 95)) ||
      !Array.isArray(r.foes) ||
      r.foes.length > 8 ||
      !Array.isArray(r.drops) ||
      r.drops.length > 20 ||
      !Array.isArray(r.dangers) ||
      r.dangers.length > 30
    )
      return false;
    for (const f of r.foes) {
      if (
        !["wraith", "brute", "scribe", "bell", "mire", "king"].includes(f.kind)
      )
        return false;
      for (const k of [
        "id",
        "x",
        "y",
        "hp",
        "maxHp",
        "windup",
        "tx",
        "ty",
      ] as const)
        if (!number(f[k], k === "windup" ? -1 : 0)) return false;
      if (
        !number(f.timer, -1e9, 100) ||
        f.x > WIDTH ||
        f.y > HEIGHT ||
        f.hp > f.maxHp
      )
        return false;
    }
    for (const d of r.drops)
      if (!number(d.x, 0, WIDTH) || !number(d.y, 0, HEIGHT) || !relic(d.relic))
        return false;
    for (const d of r.dangers)
      if (
        !number(d.x, 0, WIDTH) ||
        !number(d.y, 0, HEIGHT) ||
        !number(d.radius, 0, 500) ||
        !number(d.timer, -1, 100) ||
        !number(d.damage)
      )
        return false;
  }
  return (
    Array.isArray(v.journal) &&
    v.journal.length <= 6 &&
    v.journal.every((t) => typeof t === "string" && t.length < 300)
  );
}

function lineClear(x: number, y: number, tx: number, ty: number) {
  const length = Math.hypot(tx - x, ty - y);
  const steps = Math.ceil(length / 12);
  for (let i = 1; i <= steps; i++)
    if (!walkable(x + ((tx - x) * i) / steps, y + ((ty - y) * i) / steps))
      return false;
  return true;
}
const navNodes = Array.from({ length: 24 * 15 }, (_, i) => ({
  x: (i % 24) * 40 + 20,
  y: Math.floor(i / 24) * 40 + 20,
})).filter((p) => walkable(p.x, p.y));
const navLookup = new Map(navNodes.map((p, i) => [`${p.x},${p.y}`, i]));
function navigate(x: number, y: number, tx: number, ty: number) {
  const unit = (x2: number, y2: number) => {
    const length = Math.hypot(x2 - x, y2 - y) || 1;
    return { dx: (x2 - x) / length, dy: (y2 - y) / length };
  };
  if (lineClear(x, y, tx, ty)) return unit(tx, ty);
  const nearest = (px: number, py: number) =>
    navNodes.reduce(
      (best, p, i) =>
        Math.hypot(p.x - px, p.y - py) <
        Math.hypot(navNodes[best].x - px, navNodes[best].y - py)
          ? i
          : best,
      0,
    );
  const start = nearest(x, y),
    end = nearest(tx, ty);
  const queue = [start],
    parent = new Map<number, number>([[start, -1]]);
  for (let at = 0; at < queue.length; at++) {
    const id = queue[at];
    if (id === end) break;
    const p = navNodes[id];
    for (const [dx, dy] of [
      [40, 0],
      [-40, 0],
      [0, 40],
      [0, -40],
    ]) {
      const next = navLookup.get(`${p.x + dx},${p.y + dy}`);
      if (next !== undefined && !parent.has(next)) {
        parent.set(next, id);
        queue.push(next);
      }
    }
  }
  if (!parent.has(end)) return { dx: 0, dy: 0 };
  let step = end;
  while (parent.get(step) !== start && parent.get(step) !== -1)
    step = parent.get(step)!;
  const p = navNodes[step];
  return unit(p.x, p.y);
}
