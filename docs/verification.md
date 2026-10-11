# Verification record · 2026-10-11

## Actual Mac Chrome game verification

Used the connected Mac Chrome tab at http://127.0.0.1:5189/ with normal game controls and visible screenshots. No save editing, debug progression buttons, injected game commands, or cheated boss fixtures were used in this playthrough.

- Entered the sanctuary and ruins; moved with held keyboard input and clicked floor locations.
- Used held melee, nova, Veilstep, and the healing command. Saw locked rust telegraphs and enemy health bars. First character died during real combat; death overlay blocked continuation.
- Reloaded while dead; death, two carried relics, gold and XP survived. Retried to full sanctuary recovery, with gold reduced once (34 → 27).
- Equipped a power-5 weapon and coat, saw stat changes and previous equipment returned to pack. Collected randomized drops including a naturally rolled legendary power-14 weapon. Equipped it and a power-6 coat; salvaged a weaker relic.
- Spent points in all three disciplines. Cleared all six chambers, defeated Bellkeeper, Mire Matron and Hollow King, recovered three embers, and entered the earned campaign ending at level six. Reloaded; ending and progress persisted.
- Recalled to the sanctuary, bought a randomized smith relic, and resumed the preserved chamber.
- Started cycle two with retained equipment/progression. Cleared a stronger approach encounter with visible movement/Strike/nova buttons. Clicked the second-cycle Bellkeeper and let normal click-to-pursue movement/attack defeat it.
- Tested desktop and 390×844 layout. Screenshot inspection identified clipped mobile sanctuary content; changed narrow-screen overlays to flow below the canvas and captured/inspected the repaired result. Reset viewport override after testing.
- Inspected application console: no error entries. Existing wallet-extension warnings appeared separately; they were not game warnings.
- Left Chrome at the recovered sanctuary in cycle two. Live tab marked as a deliverable.

Screenshots: `screenshots/hollow-king.jpg`, `campaign-ending.jpg`, `mobile-sanctuary.jpg`, `desktop-sanctuary.jpg`. These are actual Chrome screenshots, not mockups.

## Automated domain checks and simulations

14 Vitest tests cover equipment swapping/idempotence; complete save round trips; uint32 RNG; malformed nested saves; death/retry guards and one-time penalty; recall preserving wounded foes; progression gate guards/ending/new cycle; full pack retaining drops; cooldown/mana/flask guards; skill point spending; timestep clamp/wall collision; attack windup before damage; saves after completed and long-running enemy timers; and pursuit around pillars. Fixtures that mark chambers cleared are lifecycle simulations, separate from the actual boss playthrough above.

Strict TypeScript checking and production Vite build pass. Production output is approximately 37 KB JavaScript and 10 KB CSS before compression. Dependency audit passes with zero vulnerabilities. GitHub Actions repeats install, typecheck, tests, build and audit.

## Server and preservation

Inspected existing listener ports; 5189 was free, and no earlier listener was terminated. The server was detached with Node `spawn({detached:true,stdio:['ignore',log,log]})` plus `unref`, not with boot/login autostart. PID and log are recorded under ignored `.play/`. Verified HTTP 200, the Cinderwake response header, bundled assets, and actual Chrome load after detach. A repeated launch recognizes the owned healthy server.

## Honest limits

Native Mac app access reported that the Mac was locked. The connected Chrome tab continued working; browser automation exercised actual rendered gameplay with keyboard/pointer inputs. Physical touch hardware, audible speaker output, simultaneous physical keyboard/mouse holds, and native app/tab focus interruption were not verified. Menu pausing was exercised; focus/visibility handlers were inspected in source but their native interruption path remains untested. Storage quota/denial warnings were reviewed in code rather than forced in the user's browser. Only Chrome was playtested; this is a compact single-character, six-chamber campaign, with stronger cycles rather than a large procedural world.

A parent checkpoint send returned `thread not found`; visible progress checkpoints were posted in this task. No sidebar project registration is claimed.
