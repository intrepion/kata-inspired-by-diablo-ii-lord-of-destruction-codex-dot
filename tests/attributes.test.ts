import { it, expect } from "vitest";
import * as G from "../src/game";
function levelUp() {
  const s = G.newGame(5);
  G.enter(s);
  s.xp = 59;
  const f = s.rooms[0].foes[0];
  f.hp = 1;
  s.x = f.x - 40;
  s.y = f.y;
  G.strike(s, f.id);
  return s;
}
it("awards five attribute points separately from the discipline point on a combat level-up", () => {
  const s = levelUp();
  expect(s.level).toBe(2);
  expect(s.points).toBe(1);
  expect(s.attributes?.unspent).toBe(5);
  expect(G.restore(G.serialize(s))).toEqual(s);
});
it("allocates distinct bonuses without healing, refilling or overspending", () => {
  const s = levelUp(),
    base = G.stats(s),
    hp = s.hp,
    mana = s.mana;
  for (const k of G.ATTRIBUTES) expect(G.allocate(s, k)).toBe(true);
  const after = G.stats(s);
  expect(after.attack).toBe(base.attack + 1);
  expect(after.armor).toBeCloseTo(base.armor + 0.2);
  expect(after.speed).toBe(base.speed + 0.5);
  expect(after.maxHp).toBe(base.maxHp + 3);
  expect(after.maxMana).toBe(base.maxMana + 2);
  expect(s.hp).toBe(hp);
  expect(s.mana).toBe(mana);
  expect(G.allocate(s, "might")).toBe(true);
  expect(G.allocate(s, "might")).toBe(false);
  expect(s.attributes?.ranks.might).toBe(2);
  expect(s.points).toBe(1);
  expect(G.restore(G.serialize(s))).toEqual(s);
});
it("migrates old saves with earned points while preserving existing stats and gear", () => {
  const s = levelUp();
  delete s.attributes;
  const before = G.stats(s),
    loaded = G.restore(G.serialize(s))!;
  expect(loaded.attributes?.unspent).toBe(5);
  expect(G.stats(loaded)).toEqual(before);
  expect(loaded.gear).toEqual(s.gear);
  expect(G.restore(G.serialize(loaded))).toEqual(loaded);
});
it("rejects malformed or invented allocation totals", () => {
  const s = levelUp();
  for (const attributes of [
    null,
    { unspent: 6, ranks: { might: 0, agility: 0, vitality: 0, focus: 0 } },
    { unspent: 5, ranks: { might: -1, agility: 1, vitality: 0, focus: 0 } },
    { unspent: 4.5, ranks: { might: 0.5, agility: 0, vitality: 0, focus: 0 } },
  ])
    expect(G.restore(JSON.stringify({ ...s, attributes }))).toBeNull();
});
it("blocks dead, ending and unknown allocations, and preserves choices across retry", () => {
  const s = levelUp();
  expect(G.allocate(s, "oops" as G.Attribute)).toBe(false);
  s.mode = "dead";
  expect(G.allocate(s, "might")).toBe(false);
  G.retry(s);
  expect(G.allocate(s, "focus")).toBe(true);
  s.mode = "ending";
  expect(G.allocate(s, "focus")).toBe(false);
  expect(s.attributes?.unspent).toBe(4);
});
