/*
 * GPL-3.0-or-later adaptation of the active 2D SimNAR Microworld behavior.
 * Original OpenNARS lab authors; commented reference by Tessergon.
 * See COPYING-GPL-3.0.txt and docs/microworld-demo-implementation-plan.md.
 */

export const WORLD_WIDTH = 800;
export const WORLD_HEIGHT = 600;
export const WORLD_PADDING = 80;
export const SENSOR_SECTORS_PER_TYPE = 3;
export const SENSOR_COUNT = SENSOR_SECTORS_PER_TYPE * 2;
export const VIEW_ANGLE = Math.PI / 3;
export const DEFAULT_VIEW_DISTANCE = WORLD_WIDTH / 5;
export const AGENT_TYPE = 0;
export const GOOD_FOOD_TYPE = 1;
export const BAD_FOOD_TYPE = 2;
export const ACTION = Object.freeze({ NONE: 0, RIGHT: 1, LEFT: 2, FORWARD: 3 });

export function createRandom(seed: number): () => number {
  let state = Number(seed) >>> 0;
  if (state === 0) state = 0x6d2b79f5;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
}

export function wrapAngle(angle: number): number {
  const fullTurn = Math.PI * 2;
  return ((angle + Math.PI) % fullTurn + fullTurn) % fullTurn - Math.PI;
}

function randomWorldPosition(random: () => number): { x: number; y: number } {
  return {
    x: WORLD_PADDING + random() * (WORLD_WIDTH - WORLD_PADDING),
    y: WORLD_PADDING + random() * (WORLD_HEIGHT - WORLD_PADDING),
  };
}

function createFood(id: string, type: Food["type"], random: () => number): Food {
  const position = randomWorldPosition(random);
  return {
    id,
    type,
    ...position,
    angle: random() * Math.PI * 2,
    speed: 0,
    radius: 12.5,
  };
}

export type Food = { id: string; type: typeof GOOD_FOOD_TYPE | typeof BAD_FOOD_TYPE; x: number; y: number; angle: number; speed: number; radius: number };
export type WorldObject = { id: string; type: typeof AGENT_TYPE; x: number; y: number; angle: number; speed: number; driftX: number; driftY: number; radius: number; reward: number; lastAction: number; selected: boolean };
export type WorldState = { seed: number; tick: number; width: number; height: number; padding: number; viewDistance: number; viewAngle: number; agent: WorldObject; foods: Food[]; sensors: number[]; selectedObjectId: string | null; counters: { good: number; bad: number; ateGood: number; ateBad: number }; lastReward: number; lastRewardType: string | null };
export type WorldOptions = { foodCount?: number; viewDistance?: number };

export function createWorld(seed = 3040304, options: WorldOptions = {}): WorldState {
  const random = createRandom(seed);
  const foodCount = options.foodCount ?? 5;
  const agentPosition = randomWorldPosition(random);
  const foods = [];
  for (let index = 0; index < foodCount; index += 1) {
    foods.push(createFood(`good-${index + 1}`, GOOD_FOOD_TYPE, random));
  }
  for (let index = 0; index < foodCount; index += 1) {
    foods.push(createFood(`bad-${index + 1}`, BAD_FOOD_TYPE, random));
  }

  return {
    seed: Number(seed) >>> 0,
    tick: 0,
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    padding: WORLD_PADDING,
    viewDistance: options.viewDistance ?? DEFAULT_VIEW_DISTANCE,
    viewAngle: VIEW_ANGLE,
    agent: {
      id: "agent",
      type: AGENT_TYPE,
      ...agentPosition,
      angle: random() * Math.PI * 2 - Math.PI,
      speed: random(),
      driftX: 0,
      driftY: 0,
      radius: 12.5,
      reward: 0,
      lastAction: ACTION.NONE,
      selected: true,
    },
    foods,
    sensors: new Array(SENSOR_COUNT).fill(0),
    selectedObjectId: "agent",
    counters: { good: 1, bad: 1, ateGood: 0, ateBad: 0 },
    lastReward: 0,
    lastRewardType: null,
  };
}

function sensorIndex(agent: WorldObject, target: Food, sectorCount: number, viewDistance: number, viewAngle: number): { sector: number; strength: number; distance: number } | null {
  const dx = target.x - agent.x;
  const dy = target.y - agent.y;
  const distance = Math.hypot(dx, dy);
  if (distance >= viewDistance) return null;

  const targetAngle = Math.atan2(dy, dx);
  const relativeAngle = wrapAngle(targetAngle - agent.angle);
  if (Math.abs(relativeAngle) > viewAngle) return null;

  const normalized = (relativeAngle + viewAngle) / (viewAngle * 2);
  const sector = Math.min(sectorCount - 1, Math.max(0, Math.floor(normalized * sectorCount)));
  return { sector, strength: Math.max(0, 1 - distance / viewDistance), distance };
}

export function collectPerceptionAndReward(world: WorldState, random: () => number = createRandom(world.seed ^ (world.tick + 1))): { sensors: number[]; reward: number; rewardType: string | null; movedFood: string[] } {
  const { agent } = world;
  const sensorReadings = new Array(SENSOR_COUNT).fill(0);
  let reward = 0;
  let rewardType = null;
  const movedFood = [];

  for (const food of world.foods) {
    const reading = sensorIndex(agent, food, SENSOR_SECTORS_PER_TYPE, world.viewDistance, world.viewAngle);
    if (reading !== null) {
      const offset = food.type === BAD_FOOD_TYPE ? SENSOR_SECTORS_PER_TYPE : 0;
      sensorReadings[offset + reading.sector] = reading.strength;
    }

    const collisionDistance = agent.radius + food.radius;
    if (Math.hypot(food.x - agent.x, food.y - agent.y) < collisionDistance) {
      reward = food.type === GOOD_FOOD_TYPE ? 1 : -1;
      rewardType = food.type === GOOD_FOOD_TYPE ? "good" : "bad";
      if (reward > 0) world.counters.ateGood += 1;
      else world.counters.ateBad += 1;
      if (food.type === GOOD_FOOD_TYPE) world.counters.good += 1;
      else world.counters.bad += 1;

      Object.assign(food, randomWorldPosition(random));
      movedFood.push(food.id);
    }
  }

  world.sensors = sensorReadings;
  world.lastReward = reward;
  world.lastRewardType = rewardType;
  agent.reward = reward;

  return { sensors: [...sensorReadings], reward, rewardType, movedFood };
}

export function applyActionAndAdvance(world: WorldState, action: number = ACTION.NONE): WorldState {
  const agent = world.agent;
  const normalizedAction: number = Number.isInteger(action) && action >= ACTION.NONE && action <= ACTION.FORWARD
    ? action
    : ACTION.NONE;

  for (const food of world.foods) {
    if (food.type === BAD_FOOD_TYPE) food.angle = wrapAngle(food.angle + 0.05);
  }

  agent.speed *= 0.9;
  // Canvas Y points downward: a smaller angle is counterclockwise on screen.
  if (normalizedAction === ACTION.FORWARD) {
    agent.speed = Math.min(15, agent.speed + 10);
  } else if (normalizedAction === ACTION.LEFT) {
    agent.angle = wrapAngle(agent.angle - 0.5);
  } else if (normalizedAction === ACTION.RIGHT) {
    agent.angle = wrapAngle(agent.angle + 0.5);
  }

  agent.x += Math.cos(agent.angle) * agent.speed + agent.driftX;
  agent.y += Math.sin(agent.angle) * agent.speed + agent.driftY;
  agent.x = ((agent.x % world.width) + world.width) % world.width;
  agent.y = ((agent.y % world.height) + world.height) % world.height;
  agent.lastAction = normalizedAction;
  agent.reward = 0;
  world.tick += 1;

  return world;
}

export function selectObject(world: WorldState, x: number, y: number, tolerance = 16): WorldObject | Food | null {
  let closest = null;
  let closestDistance = Infinity;
  for (const object of [world.agent, ...world.foods]) {
    const distance = Math.hypot(object.x - x, object.y - y);
    if (distance <= object.radius + tolerance && distance < closestDistance) {
      closest = object;
      closestDistance = distance;
    }
  }

  if (world.agent.id !== closest?.id) world.agent.selected = false;
  else world.agent.selected = true;
  world.selectedObjectId = closest?.id ?? null;
  return closest;
}

export function moveObjectTo(world: WorldState, objectId: string, x: number, y: number): boolean {
  const object = objectId === world.agent.id ? world.agent : world.foods.find((item) => item.id === objectId);
  if (!object) return false;
  object.x = Math.min(world.width, Math.max(0, Number(x)));
  object.y = Math.min(world.height, Math.max(0, Number(y)));
  object.speed = 0;
  if ("driftX" in object) {
    object.driftX = 0;
    (object as WorldObject).driftY = 0;
  }
  return true;
}

export function applyManualControl(world: WorldState, control: string): boolean {
  const agent = world.agent;
  if (control === "t" || control === "forward") agent.speed = Math.min(15, agent.speed + 1);
  else if (control === "g" || control === "backward") agent.speed = Math.max(-15, agent.speed - 1);
  else if (control === "f" || control === "turn-right") agent.angle = wrapAngle(agent.angle + 0.2);
  else if (control === "h" || control === "turn-left") agent.angle = wrapAngle(agent.angle - 0.2);
  else return false;
  return true;
}

export function addFood(world: WorldState, type: Food["type"], x: number, y: number, id = `food-${world.tick}-${world.foods.length}`): Food {
  if (type !== GOOD_FOOD_TYPE && type !== BAD_FOOD_TYPE) throw new RangeError("food type must be good or bad");
  world.foods.push({ id, type, x, y, angle: 0, speed: 0, radius: 12.5 });
  const inserted = world.foods.at(-1);
  if (!inserted) throw new Error("Food insertion did not produce an item");
  return inserted;
}
