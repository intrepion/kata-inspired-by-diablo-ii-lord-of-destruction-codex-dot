# 0002 — Project the durable chamber instead of migrating its coordinates

The fidelity audit found that a fixed whole-room overhead arena loses the source game's exploration camera and mouse-ground skill. A field-view correction must retain existing cycle-two progress and durable enemy/drop positions.

Keep the version-one Cartesian world, navigation and save record unchanged. Put a following isometric projection at the render/input boundary, with one inverse transform for ground commands and separate upright-body picking for foes. Explicit selected IDs flow through ordinary melee input so a screen selection cannot damage a different nearby foe. Generic unselected strikes retain their prior rules.

This trades a general 3D renderer and coordinate migration for a compact orthographic field view over the existing simulation. Ground points can be recovered exactly after camera/CSS scaling changes, and old saves retain their coordinates and progression. Camera state and current input are transient. Simple painter depth ordering is adequate for the current separated pillars and sprites but is not a general mesh occlusion system.
