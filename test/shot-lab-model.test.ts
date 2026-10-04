import assert from "node:assert/strict";
import test from "node:test";

import { SHOT_MODES, applyShotAction, buildShotNarsStep, createShotWorld, rankShotPlayers, senseFor, stepShotWorld } from "../src/shot-lab-model.ts";

test("Shot exposes the six NARust-o source modes", () => {
  assert.deepEqual(SHOT_MODES.map((mode) => mode.id), ["shot-test", "shot-test2", "shot-2p", "shot-2p-2ai", "shot-evolve", "shot-evolve2"]);
  assert.equal(SHOT_MODES[0].players, 2, "single-player modes retain the original static target");
  assert.equal(SHOT_MODES[2].players, 2);
  assert.deepEqual(SHOT_MODES[4].ai, ["null", "nar", "nar"]);
  assert.deepEqual(SHOT_MODES[5].ai, ["null", "nar", "nar2", "nar", "nar2"]);
  assert.equal(SHOT_MODES[4].evolution, true);
});

test("Shot uses a 50x20 bounded world and emits composite OpenNARS perception", () => {
  const world = createShotWorld("shot-test", 304);
  const activeId = world.players.find((player) => player.ai !== "null")!.id;
  assert.equal(world.width, 50);
  assert.equal(world.height, 20);
  const input = buildShotNarsStep(world, activeId);
  assert.ok(input.goals.every((goal) => goal.startsWith("<{SELF} --> [") && goal.endsWith(">! :|:")));
  assert.ok(input.beliefs.every((belief) => belief.includes("<{SELF} --> [")));
  assert.ok(senseFor(world, activeId).length > 0);
});

test("Shot resolves the first collinear target, records hit feedback, and respawns it", () => {
  const world = createShotWorld("shot-test", 304);
  const shooter = world.players.find((player) => player.ai !== "null")!;
  const target = world.players.find((player) => player.ai === "null")!;
  shooter.x = 5; shooter.y = 5; shooter.direction = "east";
  target.x = 7; target.y = 5;
  const notes = applyShotAction(world, shooter.id, "^Shoot");
  assert.deepEqual(notes, []);
  assert.equal(shooter.hits, 0, "shooting resolves on the following world tick");
  const resolved = stepShotWorld(world).notes;
  assert.ok(resolved.includes(`${shooter.id}:HIT:${target.id}`));
  assert.equal(shooter.hits, 1);
  assert.equal(target.alive, true);
  assert.equal(world.rays.length, 1);
  assert.ok(buildShotNarsStep(world, shooter.id).feedback.some((belief) => belief.includes("hit")));
});

test("Shot blocks occupied movement and evolves by cloning the best player at tick 500", () => {
  const world = createShotWorld("shot-evolve", 304);
  const [first, second] = world.players.filter((player) => player.ai !== "null");
  first.x = 5; first.y = 5; first.direction = "east";
  second.x = 6; second.y = 5;
  applyShotAction(world, first.id, "^Right");
  assert.equal(first.x, 5, "occupied cell must block movement");
  first.hits = 4;
  second.misses = 4;
  let evolutionNotes: string[] = [];
  while (world.tick < 500) evolutionNotes = stepShotWorld(world).notes;
  assert.equal(world.players.length, 5, "static target plus two original NARS and two clones");
  assert.equal(world.evolutionEvents, 1);
  assert.ok(evolutionNotes.some((note) => note.startsWith("EVOLVE:CLONE:")));
});

test("Shot evolution ranks by rounded hit ratio and recency, then preserves clone statistics", () => {
  const world = createShotWorld("shot-evolve2", 304);
  world.tick = 100;
  const [best, slow, worst, untouched] = world.players.filter((player) => player.ai !== "null");
  best.hits = 4;
  best.lastHitTick = 99;
  slow.hits = 3;
  slow.misses = 1;
  slow.lastHitTick = 99;
  worst.misses = 4;
  untouched.hits = 1;
  untouched.lastHitTick = 0;

  const ranking = rankShotPlayers(world);
  assert.deepEqual(ranking.map((entry) => entry.playerId), [worst.id, untouched.id, slow.id, best.id]);
  assert.equal(ranking[2].score, 3750);

  world.tick = 499;
  const result = stepShotWorld(world);
  const clone = world.players.find((player) => player.id.startsWith("clone-"));
  assert.ok(clone);
  assert.equal(clone.hits, best.hits);
  assert.equal(clone.misses, best.misses);
  assert.equal(clone.lastHitTick, best.lastHitTick);
  assert.equal(result.rankings.at(-1)?.playerId, best.id);
  assert.ok(result.notes.some((note) => note.startsWith("EVOLVE:RANK:")));
});

test("Shot fixed-seed 1000-tick run keeps all modes bounded and evolves twice", () => {
  for (const mode of SHOT_MODES) {
    const world = createShotWorld(mode.id, 3040304);
    const evolutionNotes: string[] = [];
    for (let tick = 0; tick < 1000; tick += 1) {
      const active = world.players.filter((player) => player.ai !== "null");
      if (tick % 10 === 0) {
        active.forEach((player, index) => {
          player.x = 4 + index * 5;
          player.y = 10;
          player.direction = index % 2 === 0 ? "east" : "west";
          applyShotAction(world, player.id, "^Shoot");
        });
      }
      const result = stepShotWorld(world);
      evolutionNotes.push(...result.notes.filter((note) => note.startsWith("EVOLVE:")));
    }
    assert.ok(world.players.length >= mode.players, `${mode.id} must retain its initial player population`);
    assert.ok(world.players.length <= mode.maxPlayers + 1, `${mode.id} must remain bounded`);
    if (mode.evolution) {
      assert.equal(world.evolutionEvents, 2, `${mode.id} must evolve at ticks 500 and 1000`);
      assert.ok(evolutionNotes.filter((note) => note.startsWith("EVOLVE:RANK:")).length >= 2);
      assert.ok(evolutionNotes.some((note) => note.startsWith("EVOLVE:EVICT:")));
    } else {
      assert.equal(world.evolutionEvents, 0, `${mode.id} must not evolve`);
    }
  }
});

test("Shot fixed-seed 10000-tick world run keeps evolution bounded over a long horizon", () => {
  for (const mode of SHOT_MODES) {
    const world = createShotWorld(mode.id, 3040304);
    for (let tick = 0; tick < 10_000; tick += 1) {
      const active = world.players.filter((player) => player.ai !== "null");
      if (tick % 10 === 0) {
        active.forEach((player, index) => {
          player.x = 4 + index * 5;
          player.y = 10;
          player.direction = index % 2 === 0 ? "east" : "west";
          applyShotAction(world, player.id, "^Shoot");
        });
      }
      stepShotWorld(world);
      assert.ok(world.players.length >= mode.players, `${mode.id} lost its initial role population at tick ${world.tick}`);
      assert.ok(world.players.length <= mode.maxPlayers + 1, `${mode.id} exceeded its bounded role population at tick ${world.tick}`);
    }
    assert.equal(world.evolutionEvents, mode.evolution ? 20 : 0, `${mode.id} evolution cadence must remain one event per 500 ticks`);
  }
});

test("Shot chooses the first matching player in source order, like NARust-o", () => {
  const world = createShotWorld("shot-2p", 304);
  const shooter = world.players[0];
  const firstTarget = world.players[1];
  const laterTarget = { ...world.players[1], id: "p3", name: "P3" };
  shooter.x = 5; shooter.y = 5; shooter.direction = "east";
  firstTarget.x = 8; firstTarget.y = 5;
  laterTarget.x = 6; laterTarget.y = 5;
  world.players.push(laterTarget);
  assert.deepEqual(applyShotAction(world, shooter.id, "^shoot"), []);
  stepShotWorld(world);
  assert.equal(firstTarget.alive, true, "the first player is not necessarily the nearest one");
  assert.equal(laterTarget.alive, true, "the target is respawned after the hit");
  assert.equal(shooter.hits, 1);
});

test("Shot movement applies on the following world tick, after the operation sets velocity", () => {
  const world = createShotWorld("shot-test", 304);
  const shooter = world.players.find((player) => player.ai !== "null")!;
  shooter.x = 10;
  shooter.y = 10;
  shooter.direction = "east";
  assert.deepEqual(applyShotAction(world, shooter.id, "^right"), []);
  assert.equal(shooter.x, 10);
  stepShotWorld(world);
  assert.equal(shooter.x, 11);
});
