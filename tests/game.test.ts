import { describe, it, expect } from "vitest";
import {
  newGame,
  equip,
  makeRelic,
  stats,
  serialize,
  restore,
} from "../src/game";
describe("keeper equipment and saving", () => {
  it("equipping a relic swaps the prior one back into the pack", () => {
    const s = newGame(7);
    const r = makeRelic(s, "weapon", 2);
    s.pack.push(r);
    const old = s.gear.weapon.id;
    expect(equip(s, r.id)).toBe(true);
    expect(s.gear.weapon.id).toBe(r.id);
    expect(s.pack.some((i) => i.id === old)).toBe(true);
    expect(equip(s, r.id)).toBe(false);
    expect(stats(s).attack).toBeGreaterThan(0);
  });
  it("round-trips the whole session and rejects corrupted saves", () => {
    const s = newGame(17);
    s.gold = 123;
    expect(restore(serialize(s))).toEqual(s);
    expect(restore("{bad")).toBeNull();
    expect(restore('{"version":99}')).toBeNull();
  });
});

it("restores a legitimate full uint32 RNG seed after loot rolls", () => {
  const s = newGame(4294967295);
  s.pack.push(makeRelic(s, "weapon", 2));
  s.seed = 4000000000;
  expect(restore(serialize(s))).toEqual(s);
});
