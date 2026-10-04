import assert from "node:assert/strict";
import test from "node:test";

import { SHOT_MODES, applyShotAction, buildShotNarsStep, createShotWorld, rankShotPlayers, senseFor, stepShotWorld } from "../src/shot-lab-model.ts";

test("Shot exposes the six NARust-o source modes", () => {
  assert.deepEqual(SHOT_MODES.map((mode) => mode.id), ["shot-test", "shot-test2", "shot-2p", "shot-2p-2ai", "shot-evolve", "shot-evolve2"]);
  assert.equal(SHOT_MODES[0].players, 1);
  assert.equal(SHOT_MODES[2].players, 2);
  assert.equal(SHOT_MODES[4].evolution, true);
});

test("Shot uses a 50x20 bounded world and emits composite OpenNARS perception", () => {
  const world = createShotWorld("shot-test", 304);
  assert.equal(world.width, 50);
  assert.equal(world.height, 20);
  const input = buildShotNarsStep(world, "p1");
  assert.ok(input.goals.every((goal) => goal.startsWith("<{SELF} --> [") && goal.endsWith(">! :|:")));
  assert.ok(input.beliefs.every((belief) => belief.includes("<{SELF} --> [")));
  assert.ok(senseFor(world, "p1").length > 0);
});

test("Shot resolves the first collinear target, records hit feedback, and respawns it", () => {
  const world = createShotWorld("shot-test", 304);
  const shooter = world.players.find((player) => player.id === "p1")!;
  const target = world.players.find((player) => player.id === "target")!;
  shooter.x = 5; shooter.y = 5; shooter.direction = "east";
  target.x = 7; target.y = 5;
  const notes = applyShotAction(world, "p1", "^Shoot");
  assert.deepEqual(notes, ["HIT"]);
  assert.equal(shooter.hits, 1);
  assert.equal(target.alive, true);
  assert.equal(world.rays.length, 1);
  assert.ok(buildShotNarsStep(world, "p1").feedback.some((belief) => belief.includes("hit")));
});

test("Shot blocks occupied movement and evolves by cloning the best player at tick 500", () => {
  const world = createShotWorld("shot-evolve", 304);
  const first = world.players[0];
  const second = world.players[1];
  first.x = 5; first.y = 5; first.direction = "east";
  second.x = 6; second.y = 5;
  applyShotAction(world, first.id, "^Right");
  assert.equal(first.x, 5, "occupied cell must block movement");
  first.hits = 4;
  second.misses = 4;
  world.players[2].hits = 2;
  world.players[3].misses = 2;
  let evolutionNotes: string[] = [];
  while (world.tick < 500) evolutionNotes = stepShotWorld(world).notes;
  assert.equal(world.players.length, 5);
  assert.equal(world.evolutionEvents, 1);
  assert.ok(evolutionNotes.some((note) => note.startsWith("EVOLVE:EVICT:")));
});

test("Shot evolution ranks by rounded hit ratio and recency, then preserves clone statistics", () => {
  const world = createShotWorld("shot-evolve", 304);
  world.tick = 100;
  const [best, slow, worst, untouched] = world.players;
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
