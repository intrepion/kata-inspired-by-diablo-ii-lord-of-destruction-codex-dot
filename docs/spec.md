# Cinderwake: The Hollow Crown

Decisions are delegated by the user; no interactive interview took place. Design tree: browser RPG → readable real-time movement/combat → six hand-authored chambers in three districts → randomized equipment and skills → town/retry and versioned whole-session saving → original canvas art and synthesized sound. Recommended decisions are accepted under the user's explicit delegation.

You are Iona, last keeper of the Cinder Lantern. Recover three stolen embers from the Bellkeeper, Mire Matron, and Hollow King. Carry them through the final gate to bring dawn back to Vesper.

## Acceptance contract

- One playable character; WASD/arrows and click/tap movement; Space or visible Strike button attacks the nearest foe. Visible buttons for every ability and essential progression action. Touch-friendly layout.
- Six connected chambers: approach and boss in each of three distinct districts. Pillars/walls obstruct movement; discovery veil and minimap support exploration. Three enemy archetypes (pursuer, ranged caster, telegraphed brute), three unique boss patterns. Damage telegraphs must precede harm.
- Ember nova, evasive dash, three upgrade paths. Experience levels increase health and grant skill points. Equipping weapon/armor/charm changes visible stats. Random common, enchanted, and legendary relics; full pack cannot silently delete existing equipment. Salvage and shop create useful gold sinks.
- Sanctuary heals, refills flasks, and offers upgrades. Recall retains room state; entering new chambers heals modestly. Death requires explicit retry, retains equipment/XP and takes 20% gold. Paused menus, focus loss, and hidden tabs do not advance combat.
- Whole session autosaves after meaningful actions and periodically. Reload restores foes, drops, progression, equipment, and death/ending states. Reject malformed/incompatible saves safely; storage failure displayed. Save/reset actions are explicit; reset has confirmation.
- Final boss yields a campaign ending and optional stronger repeat campaign. No paid services, copied assets/text, multiplayer, or public hosting.

## Test seams

User delegated engineering decisions; chosen public seams are game commands/ticks, inventory/equipment, and save codec. Domain tests cover the critical lifecycle contracts. Actual Chrome input playtest is separate evidence from simulations.
