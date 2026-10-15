import { describe, expect, it } from "vitest";
import * as G from "../src/game";
import { FieldInput } from "../src/field-input";
import {
  cameraAt,
  canvasPoint,
  groundAt,
  groundDirection,
  pickFoe,
  project,
} from "../src/projection";

describe("following isometric field and pointer commands", () => {
  it("projects a known floor point and picks it under an off-center camera", () => {
    const camera = cameraAt({ x: 400, y: 240 });
    const screen = project({ x: 500, y: 300 }, camera),
      ground = groundAt({ x: 528, y: 432 }, camera);
    expect(screen.x).toBeCloseTo(528);
    expect(screen.y).toBeCloseTo(432);
    expect(ground.x).toBeCloseTo(500);
    expect(ground.y).toBeCloseTo(300);
    expect(project({ x: 400, y: 240 }, camera).y).toBeCloseTo(336);
  });

  it("accounts for CSS scaling and canvas offsets before inverse ground picking", () => {
    const camera = cameraAt({ x: 400, y: 240 });
    const point = canvasPoint(
      { x: 364, y: 266 },
      { left: 100, top: 50, width: 480, height: 300 },
      camera,
    )!;
    expect(point).toEqual({ x: 528, y: 432 });
    expect(groundAt(point, camera).x).toBeCloseTo(500);
    expect(groundAt(point, camera).y).toBeCloseTo(300);
    expect(
      canvasPoint(
        { x: 364, y: 266 },
        { left: 100, top: 50, width: 0, height: 300 },
        camera,
      ),
    ).toBeNull();
  });

  it("reveals previously off-screen world as the camera follows without moving the foe", () => {
    const point = { x: 510, y: 150 };
    expect(project(point, cameraAt({ x: 150, y: 300 })).x).toBe(1092);
    expect(project(point, cameraAt({ x: 350, y: 300 })).x).toBe(852);
    expect(point).toEqual({ x: 510, y: 150 });
  });

  it("picks elevated upright foe bodies and resolves overlapping sprites frontmost first", () => {
    const camera = cameraAt({ x: 400, y: 240 });
    const foes = [
      { id: 1, x: 500, y: 300, kind: "wraith", hp: 58 },
      { id: 2, x: 510, y: 310, kind: "scribe", hp: 48 },
    ];
    expect(pickFoe({ x: 528, y: 398 }, camera, [foes[0]])).toBe(1);
    expect(pickFoe({ x: 528, y: 420 }, camera, foes)).toBe(2);
    foes[1].hp = 0;
    expect(pickFoe({ x: 528, y: 420 }, camera, foes)).toBe(1);
    expect(pickFoe({ x: 300, y: 100 }, camera, foes)).toBeUndefined();
  });

  it("maps keyboard conveniences into viewport directions without changing rule coordinates", () => {
    const right = groundDirection(1, 0),
      up = groundDirection(0, -1);
    expect(right.x).toBeCloseTo(Math.SQRT1_2);
    expect(right.y).toBeCloseTo(-Math.SQRT1_2);
    expect(up.x).toBeCloseTo(-Math.SQRT1_2);
    expect(up.y).toBeCloseTo(-Math.SQRT1_2);
    expect(groundDirection(0, 0)).toEqual({ x: 0, y: 0 });
  });
});

describe("explicit selected-foe melee", () => {
  function encounter() {
    const s = G.newGame(800);
    G.enter(s);
    const [near, selected] = s.rooms[0].foes;
    near.x = 190;
    near.y = 300;
    selected.x = 230;
    selected.y = 300;
    return { s, near, selected };
  }
  it("strikes the farther selected eligible foe instead of an unrelated nearer foe", () => {
    const { s, near, selected } = encounter();
    expect(G.strike(s, selected.id)).toBe(true);
    expect(near.hp).toBe(58);
    expect(selected.hp).toBe(26);
  });
  it("carries the explicit target through the ordinary tick input seam", () => {
    const { s, near, selected } = encounter();
    G.tick(s, 1 / 60, {
      dx: 0,
      dy: 0,
      attack: true,
      attackTarget: selected.id,
    });
    expect(near.hp).toBe(58);
    expect(selected.hp).toBe(26);
  });
  it("never retargets when the selected foe is absent, dead, too far away or behind stone", () => {
    const { s, near, selected } = encounter();
    expect(G.strike(s, -1)).toBe(false);
    selected.x = 500;
    expect(G.strike(s, selected.id)).toBe(false);
    s.x = 300;
    s.y = 215;
    near.x = 280;
    near.y = 215;
    selected.x = 430;
    selected.y = 215;
    expect(G.strike(s, selected.id)).toBe(false);
    selected.hp = 0;
    expect(G.strike(s, selected.id)).toBe(false);
    expect(near.hp).toBe(58);
    expect(s.attackCd).toBe(0);
  });
  it("retains the existing nearest-foe keyboard strike when no target was selected", () => {
    const { s, near, selected } = encounter();
    expect(G.strike(s)).toBe(true);
    expect(near.hp).toBe(36);
    expect(selected.hp).toBe(48);
  });

  it("preserves a spent selection through the same Strike-button command used by the UI", () => {
    const { s, near, selected } = encounter(),
      command = new FieldInput();
    command.chooseFoe(selected.id);
    selected.hp = 0;
    command.beginStrike();
    expect(command.enemyTarget).toBe(selected.id);
    expect(G.strike(s, command.enemyTarget)).toBe(false);
    G.tick(s, 0.05, {
      dx: 0,
      dy: 0,
      attack: command.heldAttack,
      attackTarget: command.enemyTarget,
    });
    expect(near.hp).toBe(58);
    command.releaseStrike();
    command.moveTo({ x: s.x, y: s.y });
    command.beginStrike();
    expect(command.enemyTarget).toBeUndefined();
    expect(G.strike(s, command.enemyTarget)).toBe(true);
    expect(near.hp).toBe(36);
  });

  it("walks around a pillar, clears an encounter, equips a drop and reaches the gate without state injection", () => {
    const s = G.newGame(800);
    G.enter(s);
    expect(project(s.rooms[0].foes[0], cameraAt(s)).x).toBeGreaterThan(G.WIDTH);
    function walkTo(x: number, y: number) {
      for (
        let frame = 0;
        frame < 600 && Math.hypot(s.x - x, s.y - y) > 5 && s.mode === "field";
        frame++
      ) {
        const camera = cameraAt(s),
          click = project({ x, y }, camera);
        G.tick(s, 0.05, { dx: 0, dy: 0, target: groundAt(click, camera) });
        G.collect(s);
        if (s.hp < 50) G.flask(s);
      }
      expect(Math.hypot(s.x - x, s.y - y)).toBeLessThanOrEqual(5);
    }
    walkTo(300, 215);
    walkTo(440, 215);
    expect(
      s.rooms[0].foes.some((f) => {
        const p = project(f, cameraAt(s));
        return p.x > 0 && p.x < G.WIDTH;
      }),
    ).toBe(true);
    for (
      let frame = 0;
      frame < 1000 && !s.rooms[0].cleared && s.mode === "field";
      frame++
    ) {
      const foe = s.rooms[0].foes
        .filter((f) => f.hp > 0)
        .sort(
          (a, b) =>
            Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y),
        )[0];
      G.tick(s, 0.05, {
        dx: 0,
        dy: 0,
        target: Math.hypot(foe.x - s.x, foe.y - s.y) > 90 ? foe : undefined,
        attack: true,
        attackTarget: foe.id,
      });
      G.collect(s);
      if (s.hp < 50) G.flask(s);
    }
    expect(s.rooms[0].cleared).toBe(true);
    // The final foe may leave a drop outside automatic collection range.
    for (const drop of [...s.rooms[0].drops]) walkTo(drop.x, drop.y);
    expect(s.pack.length).toBeGreaterThan(0);
    const relic = s.pack[0];
    expect(G.equip(s, relic.id)).toBe(true);
    expect(s.gear[relic.slot].id).toBe(relic.id);
    walkTo(875, 300);
    expect(G.next(s)).toBe(true);
    expect(s.room).toBe(1);
    expect(G.restore(G.serialize(s))).toEqual(s);
  });
});
