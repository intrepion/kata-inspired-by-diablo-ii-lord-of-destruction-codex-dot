import "./style.css";
import * as G from "./game";
import { draw } from "./render";
import { FieldInput } from "./field-input";
import {
  cameraAt,
  canvasPoint,
  groundAt,
  groundDirection,
  pickFoe,
} from "./projection";
import { sound, setSound } from "./audio";
const SAVE = "cinderwake-v1";
let state = G.newGame();
let saveMessage = "Autosave ready";
let storageAvailable = true;
try {
  const raw = localStorage.getItem(SAVE);
  if (raw) {
    const loaded = G.restore(raw);
    if (loaded) {
      state = loaded;
      saveMessage = "Lantern restored";
    } else saveMessage = "Invalid save ignored · new keeper";
  }
} catch {
  storageAvailable = false;
  saveMessage = "Storage unavailable · session only";
}
let modal = "",
  paused = false,
  soundOn = true;
const command = new FieldInput();
const keys = new Set<string>();
const movePointers = new Map<number, string>();
let attackPointer: number | undefined;
const pressed = (key: string) =>
  keys.has(key) || [...movePointers.values()].includes(key);
let lastMode = "",
  lastRoom = -1,
  lastOverlay = "";
let hudClock = 0,
  lastSave = 0,
  lastHp = state.hp;
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `<div class="shell"><header class="masthead"><div class="brand"><div class="sigil"></div><div><h1>CINDERWAKE</h1><p class="subtitle">THE HOLLOW CROWN</p></div></div><div class="top-actions"><span class="save-status" id="save-status"></span><button class="quiet" id="sound" aria-label="Toggle synthesized sound">Sound off</button><button class="quiet" id="help">Guide</button><button class="quiet" id="pause">Pause</button></div></header><section class="chapter"><div><p class="eyebrow" id="chapter-kicker"></p><h2 id="chapter-title"></h2><p id="chapter-desc"></p></div><div class="embers" id="embers"></div></section><div class="layout"><main><div class="stage"><canvas width="960" height="600" id="world" aria-label="Dungeon. Click or tap to move; click a foe to approach and attack." tabindex="0"></canvas><div class="stage-label" id="stage-label"></div><div class="boss-bar" id="boss"></div><div class="stage-note" id="stage-note"></div><div class="overlay" id="overlay"></div></div><div class="controls"><button class="ability" id="strike"><kbd>SPACE</kbd><span><strong>Strike</strong><small>Hold to cleave</small></span></button><button class="ability" id="nova"><kbd>Q</kbd><span><strong>Ember nova</strong><small id="nova-status"></small></span></button><button class="ability" id="dash"><kbd>E</kbd><span><strong>Veilstep</strong><small id="dash-status"></small></span></button><button class="ability" id="flask"><kbd>H</kbd><span><strong>Heal</strong><small id="flask-status"></small></span></button><button class="ability" id="relics"><kbd>I</kbd><span><strong>Relics</strong><small id="pack-status"></small></span></button></div><div class="mobile-move" aria-label="Directional movement"><button data-move="ArrowLeft" aria-label="Move left">←</button><button data-move="ArrowUp" aria-label="Move up">↑</button><button data-move="ArrowDown" aria-label="Move down">↓</button><button data-move="ArrowRight" aria-label="Move right">→</button></div><div class="objective"><p id="objective"></p><button id="interact">Gather [F]</button><button class="quiet" id="recall">Recall [R]</button></div><p class="hint">Isometric view follows you · WASD / arrows move in view · Click a foe to pursue & strike · Q nova · E evade · H heal<br>Gather nearby relics · I pack · K disciplines · Esc pauses · Menus pause combat</p></main><aside class="sidebar"><section class="panel"><div class="portrait-row"><div class="portrait"></div><div><h3>Iona</h3><small id="keeper-title"></small></div></div><div class="bar-label"><span>VITALITY</span><span id="hp-value"></span></div><div class="bar"><div class="health" id="hp-bar"></div></div><div class="bar-label"><span>CINDER</span><span id="mana-value"></span></div><div class="bar"><div class="mana" id="mana-bar"></div></div><div class="bar-label"><span>EXPERIENCE</span><span id="xp-value"></span></div><div class="bar"><div class="xp" id="xp-bar"></div></div><div class="stats"><div class="stat" id="attack-stat"></div><div class="stat" id="armor-stat"></div><div class="stat" id="gold-stat"></div><div class="stat" id="level-stat"></div></div><button id="skills" style="width:100%;margin-top:18px">Disciplines</button></section><section class="panel"><p class="panel-title">BOUND RELICS</p><div id="gear"></div><button class="quiet" id="manage" style="width:100%;font-size:11px">Open relic pack</button></section><section class="panel journal"><p class="panel-title">THE LANTERN REMEMBERS</p><div id="journal"></div></section></aside></div><footer class="footer"><span>AN ORIGINAL TALE OF ASH, OATHS & STOLEN LIGHT</span><span>LOCAL ADVENTURE · CYCLE <span id="cycle"></span></span></footer></div><div class="modal-layer" id="modal" role="dialog" aria-modal="true" aria-label="Game menu"></div>`;
const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>("world");
const html = (v: string) =>
  v.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
function save() {
  try {
    localStorage.setItem(SAVE, G.serialize(state));
    storageAvailable = true;
    saveMessage = "Saved locally";
  } catch {
    storageAvailable = false;
    saveMessage = "Save failed · session only";
  }
  $("save-status").textContent = saveMessage;
  $("save-status").classList.toggle("save-error", !storageAvailable);
}
function resetInput() {
  keys.clear();
  movePointers.clear();
  attackPointer = undefined;
  command.clear();
}
function change(fn: () => unknown) {
  fn();
  save();
  refresh();
  if (modal) renderModal();
  sound("click");
}
function action(kind: string) {
  if (modal || paused) return;
  if (kind === "strike") {
    if (G.strike(state, command.enemyTarget)) sound("strike");
  }
  if (kind === "nova") {
    if (G.nova(state)) sound("nova");
  }
  if (kind === "dash") {
    const dx =
        (pressed("d") || pressed("arrowright") ? 1 : 0) -
        (pressed("a") || pressed("arrowleft") ? 1 : 0),
      dy =
        (pressed("s") || pressed("arrowdown") ? 1 : 0) -
        (pressed("w") || pressed("arrowup") ? 1 : 0);
    const direction = groundDirection(dx, dy);
    G.dash(
      state,
      dx || dy
        ? direction.x
        : command.target
          ? command.target.x - state.x
          : Math.SQRT1_2,
      dx || dy
        ? direction.y
        : command.target
          ? command.target.y - state.y
          : -Math.SQRT1_2,
    );
  }
  if (kind === "flask") G.flask(state);
  if (kind === "interact") {
    if (state.mode === "field" && state.rooms[state.room].cleared) {
      G.collect(state);
      G.next(state);
      resetInput();
    } else G.collect(state);
  }
  if (kind === "recall") {
    G.recall(state);
    resetInput();
  }
  save();
  refresh();
}
function open(which: string) {
  resetInput();
  modal = which;
  renderModal();
  $("close-modal")?.focus();
}
function close() {
  modal = "";
  paused = false;
  $("modal").innerHTML = "";
  $("pause").textContent = "Pause";
  resetInput();
  canvas.focus({ preventScroll: true });
}
function renderModal() {
  const st = G.stats(state);
  let content = "";
  if (modal === "relics") {
    content = `<p>${state.pack.length}/12 relics carried. Equipping swaps the old item into the same slot; salvage sells only the chosen carried relic. Equipped items remain bound.</p><div class="inventory">${state.pack.map((r) => `<article class="item rarity-${r.rarity}"><h3>${html(r.name)}</h3><p>${r.slot.toUpperCase()} · ${["Common", "Enchanted", "Legendary"][r.rarity]} · Power ${r.power}<br>Bound ${r.slot}: power ${state.gear[r.slot].power}</p><button data-equip="${r.id}" ${state.mode === "dead" ? "disabled" : ""}>Equip ${r.slot}</button> <button class="quiet" data-salvage="${r.id}" ${state.mode === "dead" ? "disabled" : ""}>Salvage · ${r.value} gold</button></article>`).join("")}</div>${state.pack.length ? "" : "<p>Your pack is empty. Defeat foes and walk over the glowing relics.</p>"}<p>Attack ${st.attack} · Armor ${st.armor.toFixed(1)} · Nova ${st.nova} · Maximum vitality ${st.maxHp}</p>`;
  }
  if (modal === "skills")
    content = `<p>${state.points} unspent points. Each level grants one point. Every discipline has five ranks; choose a build that suits your next encounter.</p>${(["edge", "cinder", "resolve"] as const).map((k) => `<div class="discipline"><div><h3>${{ edge: "Oath of the Edge", cinder: "Heart of Cinder", resolve: "Keeper’s Resolve" }[k]} · ${state.ranks[k]}/5</h3><p>${{ edge: "+6 strike damage per rank. A relentless blade.", cinder: "+14 nova damage and faster cinder recovery per rank.", resolve: "+18 maximum vitality, armor, and movement speed per rank." }[k]}</p></div><button data-learn="${k}" ${state.points < 1 || state.ranks[k] >= 5 || state.mode === "dead" ? "disabled" : ""}>Learn</button></div>`).join("")}`;
  if (modal === "help")
    content = `<p><b>Your oath</b> — Recover the three stolen embers. Clear each chamber and use the eastern gate. Defeat the Hollow King, then return the light to Vesper.</p><p><b>Fight</b> — The isometric camera follows you. Move in the view with WASD/arrows or click/tap the floor. Click a foe’s upright body to select it, pursue and strike that foe within blade range. A selected foe is never replaced by a closer one. Click another foe or the floor to change commands. Hold Space or Strike for melee. Q casts a wide nova (25 cinder). E performs an invulnerable Veilstep toward your movement or click destination. H drinks a flask.</p><p><b>Read the threat</b> — Rust circles mark a locked attack location. Step out before the attack lands. Wraiths pursue, stone brutes swing slowly, and ink scribes cast at range. The Bellkeeper rings around itself; the Matron spreads mire; the King calls overlapping judgement circles.</p><p><b>Prepare</b> — Nearby relics gather automatically if there is pack space. I opens equipment. K opens disciplines. R recalls to the sanctuary and refills health, cinder, and three flasks. Progress stays in the chamber. Death costs 20% gold; relics and experience remain.</p><p><b>Saving</b> — Whole-session autosave every two seconds and after commands. Your browser stores the save on this origin. Menus, focus loss, and hidden tabs freeze combat. No network or account is required.</p>`;
  if (modal === "pause")
    content = `<p>The lantern holds its breath. Your adventure is paused.</p><div class="buttons"><button id="manual-save">Save now</button><button class="quiet" id="reset-confirm">New keeper…</button></div><p class="notice">${storageAvailable ? "Saved on this browser only." : html(saveMessage)}</p>`;
  if (modal === "reset")
    content = `<p>Start a new keeper? This replaces your current saved adventure, including equipment and campaign progress.</p><button id="reset-game" class="primary">Replace save & start anew</button>`;
  $("modal").innerHTML =
    `<section class="modal"><div class="modal-head"><div><p class="eyebrow">THE CINDER LANTERN · COMBAT PAUSED</p><h2>${{ relics: "Relic pack", skills: "Disciplines", help: "A keeper’s field guide", pause: "Rest a moment", reset: "A new oath" }[modal as "relics"]}</h2></div><button id="close-modal" aria-label="Close menu">Close</button></div>${content}</section>`;
  $("close-modal").onclick = close;
  document
    .querySelectorAll<HTMLButtonElement>("[data-equip]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          change(() => G.equip(state, Number(b.dataset.equip)))),
    );
  document
    .querySelectorAll<HTMLButtonElement>("[data-salvage]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          change(() => G.salvage(state, Number(b.dataset.salvage)))),
    );
  document
    .querySelectorAll<HTMLButtonElement>("[data-learn]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          change(() =>
            G.learn(state, b.dataset.learn as keyof G.State["ranks"]),
          )),
    );
  if ($("manual-save"))
    $("manual-save").onclick = () => {
      save();
      renderModal();
    };
  if ($("reset-confirm")) $("reset-confirm").onclick = () => open("reset");
  if ($("reset-game"))
    $("reset-game").onclick = () => {
      state = G.newGame();
      close();
      lastMode = "";
      change(() => {});
    };
}
function refresh() {
  const st = G.stats(state);
  $("save-status").textContent = saveMessage;
  $("keeper-title").textContent = `Lantern keeper · Level ${state.level}`;
  $("hp-value").textContent = `${Math.ceil(state.hp)} / ${st.maxHp}`;
  $("mana-value").textContent = `${Math.floor(state.mana)} / ${st.maxMana}`;
  $("xp-value").textContent = `${state.xp} / ${40 + state.level * 20}`;
  $("hp-bar").style.width = `${(state.hp / st.maxHp) * 100}%`;
  $("mana-bar").style.width = `${(state.mana / st.maxMana) * 100}%`;
  $("xp-bar").style.width = `${(state.xp / (40 + state.level * 20)) * 100}%`;
  $("attack-stat").innerHTML = `${st.attack}<span>STRIKE</span>`;
  $("armor-stat").innerHTML = `${st.armor.toFixed(1)}<span>ARMOR</span>`;
  $("gold-stat").innerHTML = `${state.gold}<span>GOLD</span>`;
  $("level-stat").innerHTML = `${st.nova}<span>NOVA</span>`;
  $("skills").textContent =
    `Disciplines${state.points ? ` · ${state.points} available` : ""}`;
  $("pack-status").textContent = `${state.pack.length} / 12 carried`;
  $("nova-status").textContent =
    state.novaCd > 0 ? `${state.novaCd.toFixed(1)}s` : "25 cinder · area burst";
  $("dash-status").textContent =
    state.dashCd > 0 ? `${state.dashCd.toFixed(1)}s` : "Dash & evade";
  $("flask-status").textContent = `${state.flasks} flasks · +70 HP`;
  $("cycle").textContent = String(state.cycle);
  $("gear").innerHTML = (["weapon", "coat", "charm"] as G.Slot[])
    .map(
      (slot) =>
        `<div class="gear-row rarity-${state.gear[slot].rarity}"><span class="gear-icon">${{ weapon: "†", coat: "◇", charm: "◈" }[slot]}</span><div>${html(state.gear[slot].name)}<small>${slot.toUpperCase()} · power ${state.gear[slot].power}</small></div></div>`,
    )
    .join("");
  $("journal").innerHTML = state.journal
    .slice(0, 4)
    .map((j) => `<p>${html(j)}</p>`)
    .join("");
  $("embers").innerHTML = ["BELL", "MIRE", "CROWN"]
    .map(
      (e, i) =>
        `<span class="ember ${state.embers > i ? "lit" : ""}"><i></i>${e}</span>`,
    )
    .join("");
  const field = state.mode === "field",
    room = state.rooms[state.room],
    zone = G.DISTRICTS[Math.floor(state.room / 2)];
  $("chapter-kicker").textContent =
    state.mode === "town"
      ? "VESPER · THE LAST SANCTUARY"
      : `DISTRICT ${Math.floor(state.room / 2) + 1} / 3 · ${state.room % 2 ? "SOVEREIGN CHAMBER" : "OUTER CHAMBER"}`;
  $("chapter-title").textContent =
    state.mode === "town" ? "A light against the dark" : zone.name;
  $("chapter-desc").textContent =
    state.mode === "town"
      ? "Recover. Bind your relics. Keep your oath."
      : zone.story;
  $("stage-label").textContent =
    state.mode === "town"
      ? "THE CINDER SANCTUARY"
      : `${zone.name.toUpperCase()} · ${state.room % 2 ? "THE SOVEREIGN" : "APPROACH"}`;
  $("stage-note").textContent = field
    ? room.cleared
      ? "The eastern gate is open."
      : "Move out of the rust circles before they strike."
    : "Your lantern remembers every step.";
  $("objective").innerHTML =
    state.mode === "town"
      ? `<b>${state.embers}/3 embers</b> · The road waits beyond the sanctuary.`
      : state.mode === "ending"
        ? "<b>Oath fulfilled.</b> Dawn returns to Vesper."
        : state.mode === "dead"
          ? "<b>The lantern is extinguished.</b> Rekindle to continue."
          : room.cleared
            ? "<b>Chamber cleared.</b> Gather relics, then continue."
            : `<b>${room.foes.filter((f) => f.hp > 0).length} foes remain.</b> Reclaim the ${Math.floor(state.room / 2) + 1}${["st", "nd", "rd"][Math.floor(state.room / 2)]} ember.`;
  $("interact").textContent = room.cleared ? "Eastern gate [F]" : "Gather [F]";
  $<HTMLButtonElement>("interact").disabled = !field;
  $<HTMLButtonElement>("recall").disabled = !field;
  for (const id of ["strike", "nova", "dash", "flask"])
    $<HTMLButtonElement>(id).disabled =
      !field ||
      (id === "nova" && (state.novaCd > 0 || state.mana < 25)) ||
      (id === "dash" && state.dashCd > 0) ||
      (id === "flask" && (state.flasks < 1 || state.hp >= st.maxHp));
  const boss = room.foes.find(
    (f) => ["bell", "mire", "king"].includes(f.kind) && f.hp > 0,
  );
  $("boss").innerHTML =
    field && boss
      ? `<span>${zone.boss}</span><div class="bar"><div style="width:${(boss.hp / boss.maxHp) * 100}%"></div></div>`
      : "";
  const overlayKey = `${state.mode}-${state.room}-${state.cycle}`;
  if (overlayKey !== lastOverlay) {
    lastOverlay = overlayKey;
    resetInput();
    let content = "";
    $("overlay").className = "overlay";
    if (state.mode === "town") {
      $("overlay").className = "overlay town-overlay";
      content = `<section class="card town-card"><p class="eyebrow">THE OATHKEEPER’S REFUGE</p><h2>Welcome home, Iona.</h2><p>The last fire still burns. Carry it through the ruins and recover the three embers that the crown stole.</p><div class="buttons"><button class="primary" id="enter">${state.rooms[state.room].visited ? "Return to chamber" : "Venture into the ruins"}</button><button id="shop">Relic smith · ${25 + state.cycle * 10}g</button></div><p style="font-size:10px;margin-bottom:0">Vitality & cinder restored · three flasks refilled</p><p id="shop-note" class="notice"></p></section>`;
    }
    if (state.mode === "dead")
      content = `<section class="card"><p class="eyebrow">ASH IS NOT THE END</p><h2>The lantern goes dark.</h2><p>Keep your relics and experience. Return to the sanctuary at the cost of one fifth of your gold.</p><button class="primary" id="retry">Rekindle at sanctuary</button></section>`;
    if (state.mode === "ending")
      content = `<section class="card"><p class="eyebrow">THREE EMBERS · ONE DAWN</p><h2>The Hollow Crown falls.</h2><p>Iona lifts the lantern. Across Vesper, windows kindle for the first time in an age. The long night is over. Your oath is fulfilled.</p><p>Cycle ${state.cycle} complete · Level ${state.level} · ${state.gold} gold</p><button class="primary" id="cycle-next">Walk the next cycle</button></section>`;
    $("overlay").innerHTML = content;
    if ($("enter")) $("enter").onclick = () => change(() => G.enter(state));
    if ($("retry")) $("retry").onclick = () => change(() => G.retry(state));
    if ($("cycle-next"))
      $("cycle-next").onclick = () => change(() => G.newCycle(state));
    if ($("shop"))
      $("shop").onclick = () => {
        const bought = G.buy(state);
        $("shop-note").textContent = bought
          ? "A new relic awaits in your pack."
          : state.pack.length >= 12
            ? "Your pack is full. Salvage a relic first."
            : "More gold is needed. The ruins hold plenty.";
        save();
        refresh();
      };
  }
  if (lastMode !== state.mode || lastRoom !== state.room) {
    lastMode = state.mode;
    lastRoom = state.room;
    save();
  }
}
$("relics").onclick = () => open("relics");
$("manage").onclick = () => open("relics");
$("skills").onclick = () => open("skills");
$("help").onclick = () => open("help");
$("pause").onclick = () => {
  paused = true;
  open("pause");
};
$("sound").onclick = () => {
  soundOn = !soundOn;
  setSound(soundOn);
  $("sound").textContent = soundOn ? "Sound off" : "Sound on";
  sound("click");
};
for (const kind of ["strike", "nova", "dash", "flask", "interact", "recall"])
  $(kind).onclick = () => action(kind);
$("strike").addEventListener("pointerdown", (e) => {
  if (state.mode !== "field" || modal) return;
  e.preventDefault();
  command.beginStrike();
  attackPointer = e.pointerId;
  $("strike").setPointerCapture(e.pointerId);
  action("strike");
});
window.addEventListener("pointerup", (e) => {
  if (e.pointerId === attackPointer) {
    command.releaseStrike();
    attackPointer = undefined;
  }
  movePointers.delete(e.pointerId);
});
window.addEventListener("pointercancel", resetInput);
for (const b of document.querySelectorAll<HTMLButtonElement>("[data-move]")) {
  b.onpointerdown = (e) => {
    e.preventDefault();
    movePointers.set(e.pointerId, b.dataset.move!.toLowerCase());
    b.setPointerCapture(e.pointerId);
    command.moveTo();
  };
  b.onpointerup = (e) => movePointers.delete(e.pointerId);
  b.onpointercancel = resetInput;
}
canvas.addEventListener("pointerdown", (e) => {
  if (state.mode !== "field" || modal || paused || e.button !== 0) return;
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const camera = cameraAt(state, G.WIDTH, G.HEIGHT);
  const point = canvasPoint({ x: e.clientX, y: e.clientY }, rect, camera);
  if (!point) return;
  const selected = pickFoe(point, camera, state.rooms[state.room].foes);
  const ground = groundAt(point, camera);
  if (selected !== undefined) command.chooseFoe(selected);
  else command.moveTo(G.walkable(ground.x, ground.y) ? ground : undefined);
  canvas.focus({ preventScroll: true });
  sound("click");
});
window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key))
    e.preventDefault();
  if (key === "escape") {
    if (modal) close();
    else {
      paused = true;
      open("pause");
    }
    return;
  }
  if (modal && key === "tab") {
    const buttons = [
      ...$("modal").querySelectorAll<HTMLButtonElement>(
        "button:not(:disabled)",
      ),
    ];
    const first = buttons[0],
      last = buttons.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
    return;
  }
  if (modal || (e.target instanceof HTMLButtonElement && key === " ")) return;
  if (["i", "k"].includes(key) && !e.repeat) {
    open(key === "i" ? "relics" : "skills");
    return;
  }
  keys.add(key);
  if (
    [
      "w",
      "a",
      "s",
      "d",
      "arrowup",
      "arrowdown",
      "arrowleft",
      "arrowright",
    ].includes(key)
  ) {
    command.moveTo();
  }
  if (!e.repeat) {
    const command: Record<string, string> = {
      q: "nova",
      e: "dash",
      h: "flask",
      f: "interact",
      r: "recall",
    };
    if (command[key]) action(command[key]);
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener("blur", () => {
  resetInput();
  if (state.mode === "field" && !modal) {
    paused = true;
    open("pause");
  }
  save();
});
document.addEventListener("visibilitychange", () => {
  resetInput();
  if (document.hidden) {
    save();
    if (state.mode === "field" && !modal) {
      paused = true;
      open("pause");
    }
  }
});
window.addEventListener("pagehide", save);
let previous = performance.now();
function frame(now: number) {
  const dt = Math.min((now - previous) / 1000, 0.05);
  previous = now;
  if (!modal && !paused && !document.hidden) {
    let selectedAlive = false;
    if (command.enemyTarget) {
      const foe = state.rooms[state.room].foes.find(
        (f) => f.id === command.enemyTarget && f.hp > 0,
      );
      if (foe) {
        selectedAlive = true;
        command.target =
          Math.hypot(foe.x - state.x, foe.y - state.y) > 90
            ? { x: foe.x, y: foe.y }
            : undefined;
      } else {
        // Keep the spent target ID until a new command: held attacks cannot redirect after its death.
        command.target = undefined;
      }
    }
    const oldCd = state.attackCd;
    const direction = groundDirection(
      (pressed("d") || pressed("arrowright") ? 1 : 0) -
        (pressed("a") || pressed("arrowleft") ? 1 : 0),
      (pressed("s") || pressed("arrowdown") ? 1 : 0) -
        (pressed("w") || pressed("arrowup") ? 1 : 0),
    );
    G.tick(state, dt, {
      dx: direction.x,
      dy: direction.y,
      target: command.target,
      attack: pressed(" ") || command.heldAttack || selectedAlive,
      attackTarget: command.enemyTarget,
    });
    if (oldCd <= 0 && state.attackCd > 0) sound("strike");
    if (state.mode === "field" && state.pack.length < 12 && G.collect(state))
      sound("loot");
    if (state.hp < lastHp) sound("hurt");
    lastHp = state.hp;
  }
  draw(canvas, state, now, {
    target: command.target,
    enemyTarget: command.enemyTarget,
  });
  if (now - hudClock > 100) {
    refresh();
    hudClock = now;
  }
  if (now - lastSave > 2000) {
    save();
    lastSave = now;
  }
  requestAnimationFrame(frame);
}
refresh();
requestAnimationFrame(frame);
