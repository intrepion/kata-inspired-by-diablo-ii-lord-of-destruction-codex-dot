# Isometric following field — focused fidelity correction

> Focused desktop native acceptance completed on 2026-10-15 after manual Mac unlock. See [the observed route, recovery and limits](LOCAL_ACCEPTANCE_2026-10-15.md). Earlier source-only checks remain distinct from that browser evidence.

## Baseline and primary research

2026-10-15. Exact audited checkout: `kata-inspired-by-diablo-ii-lord-of-destruction-codex-dot`, clean at HEAD `51f4e81db2985c38d10e2749555585c983cf7afb` before modification. Preview baseline: the owned Node listener PID `80532` was listening at `127.0.0.1:5189`, matching `.play/server.json`; no process was stopped or restarted by this source worker.

Read before planning: Blizzard's original [Arreat Summit controls](https://classic.battle.net/diablo2exp/basics/controls.shtml). The page describes mouse-assigned actions, direct item/name clicks, standing attacks, running and the live automap. Those controls make the world-space mouse command central to the source game's skill. [Blizzard's Basics](https://classic.battle.net/diablo2exp/basics/) further documents the exploration/recovery context. This change applies the audit's isometric-camera baseline to the existing chamber; it does not reproduce every source-game binding, skill or formula, and original numeric camera settings were not measured.

## Accepted decisions and scope

The user authorized recommended defaults and one focused high-impact fix. Grill with Docs/domain modeling and Implement guide this bounded change without an optional interview or commits.

| Decision | Recommended default applied |
|---|---|
| Camera/world boundary | Project the existing Cartesian ground into a following isometric view. Preserve every chamber, pillar coordinate, foe, drop and gate. |
| Coordinate contract | Share a pure world-to-screen and screen-to-ground transform between drawing and input, including canvas CSS scaling and camera position. |
| Upright entities | Keep the original keeper/foe vector artwork upright; sort pillars, characters, gates and drops by ground depth. Pick foe bodies in screen space, frontmost first. |
| Selected melee | Pass the selected foe ID through `tick` into `strike`. An invalid, dead, blocked or distant selection never substitutes a nearer foe. Space with no selection retains the existing nearest strike. Nova remains an area effect. |
| Input conveniences | WASD/arrows and keyboard dash directions follow the viewport axes; floor commands and pathfinding remain in world coordinates. Existing abilities, menus and focus-loss clearing remain. |
| Persistence | No state field or version change. Camera and current command stay transient. Keep the sanctuary cycle-two save; use a coordinated isolated origin for fresh browser acceptance. |
| Public test seams | Projection/picking functions, the transient FieldInput controller used by the Strike button, and existing game commands/observations. Test literal projected points plus a normal-command encounter route, not renderer-private internals. |
| Delivery boundary | Local source/tests/docs only. Parent coordinates the build slot, independent review and exclusive browser playthrough. |

[ADR 0002](adr/0002-isometric-view-over-durable-world.md) records the compatibility choice. Selected foe and ground command are recorded in the glossary.

## Checks and evidence

| Check | Result |
|---|---|
| Installed strict typecheck | Passed in the original checkout |
| Installed full tests | 25 passed across three files: 14 retained tests and 11 new projection/selection/route checks |
| Known projection values | Camera (400,240), floor (500,300) projects to (528,432); inverse and half-size CSS viewport select that ground point within floating precision |
| Follow/crop | An unchanged foe at (510,150) is off-screen at screen x1092 when the camera is (150,300), and visible at x852 after the camera moves to (350,300) |
| Explicit target | A selected farther scribe loses 22 vitality while the nearer wraith keeps all 58; invalid/dead/blocked/out-of-range selections cause no redirected damage |
| Control-only encounter | Keeper navigates from spawn around the upper-left pillar to (440,215), reveals foes, clears the encounter by selected melee, gathers/equips a drop, walks to (875,300), advances through the gate and round-trips the unchanged v1 save |
| Existing regressions | Pursuit around stone, collision/time bounds, enemy telegraphs, recall/death/loot/equipment/gates/cycle and save rejection/round-trip tests passed |
| Production build | Passed in exclusive slot: Vite 8, 6.96 s, `dist/assets/index-CZJj2kDQ.js` |
| Independent review | One confirmed UI selection P2 corrected with an integration regression; independent final recheck passed |
| Browser acceptance | Passed focused desktop route after manual unlock: native following/floor/pillar, selected melee/no retarget, clear/loot/equip, eastern gate and reload; see final acceptance |

Independent review identified a Strike-button path that cleared a dead selection before melee. The actual button now delegates to `FieldInput.beginStrike`, which retains even a spent selected ID; a controller-to-game regression verifies the nearby survivor keeps all 58 vitality until an explicit new floor command clears selection.

Compatibility checks: the State v1 definition is byte-identical to baseline (SHA256 `a1798176f01b3e68ea8567a5fa34e5cf63af8df1daa361d80f51cacc4552d555`), as are the original upright keeper/foe drawing functions (SHA256 `4bbdbd3a4bb37d73fe8bca66c0868bd7cd3e83ba30fb0190b127f6e6ecd3b19c`). `git diff --check` is clean; baseline HEAD and the owned preview PID remain unchanged.

These domain checks establish source behavior. The separately recorded native route establishes the focused desktop input/render/encounter outcomes; it does not replace the numerical inverse/selection regressions or claim full-campaign coverage.

## Normal-input browser walkthrough (focused desktop route completed)

Use the newly built preview on port 5189. The accepted route used `http://fidelity-diablo-20261015.localhost:5189/`, preserving the known sanctuary cycle-two save on its original origin. Do not click New keeper on that known save. The steps below remain route guidance; exact observed outcomes and the ambiguous pixel click are recorded in the final acceptance file.

1. Enter the ruins from the sanctuary. The keeper stays around the center while visible world boundaries and pillars move in isometric projection. The first foes begin beyond the right edge. Click open ground and verify the keeper arrives at the marked location; walk in the view with arrows/WASD as a convenience.
2. A fresh spawn has world position (150,300). An initial click near internal canvas (762,375) commands (300,215). After arriving, an internal click near (648,420) commands (440,215), beyond the upper-left pillar. Existing navigation should walk around the stone instead of through it. Canvas coordinates scale to its displayed bounding rectangle. React to live foes; if an enemy occupies that screen point, use other visible floor instead of blindly repeating coordinates.
3. Camera motion should expose new floor and foes; it must not simply shrink the entire original room. Click a foe's visible torso rather than its ground shadow. Its selection ring/name appears. If two foes are nearby, select the farther one and hold Space or Strike: only that selected foe should lose melee health while eligible. When it dies, the held action must not silently switch to the other foe. Click the other foe explicitly to continue. Nova is intentionally an area attack.
4. Use H to heal and Q/E if needed under the unchanged combat rules. Walk over a glowing relic or use F nearby, open I, equip it and inspect the changed stats. Ordinary nonboss drops remain randomized; if no relic drops in the first room, the following boss guarantees one.
5. Clear the chamber, walk toward the glowing eastern gate, then F / Eastern gate to advance. Reload and verify room, equipment, cycle and progress survive. Open/close a menu and lose/refocus the window once to check paused input clears without stale pursuit. Do not reset an existing keeper to make the check easier.
6. Inspect narrow viewport scaling and pointer selection on both upper and lower portions of the canvas, including selecting a foe after camera movement. Record any pillar/actor occlusion artifacts and console/load errors separately from the completed domain route.

## Remaining limits

Six authored chambers remain; the original three scalar disciplines, dash/nova kit and simplified loot economy are unchanged. No connected outdoor world, potion belt, skill assignments, run/walk defense rule, sockets/runes, hirelings or multiplayer was added. The compact painter renderer uses upright vector characters and simple depth ordering; it is not a reproduction of Diablo II's sprite assets, measured camera settings or complete occlusion system. The focused desktop native route is accepted as linked above. Physical touch/gamepad, narrow viewport, measured original camera tuning and a newly completed full campaign remain unverified.
