export type GridTopology = "square" | "triangle" | "hexagon";
export type GridCell = { col: number; row: number; face: 0 | 1 };
export type GridFood = { id: string; kind: "good" | "bad"; cell: GridCell };
export type GridAction = 0 | 1 | 2 | 3; // idle, right, left, forward — Microworld Worker protocol
export type GridWorld = {
  topology: GridTopology;
  cols: number;
  rows: number;
  seed: number;
  randomState: number;
  tick: number;
  agent: { cell: GridCell; heading: number };
  foods: GridFood[];
  sensors: number[];
  reward: number;
  eaten: { good: number; bad: number };
};

const SQRT3 = Math.sqrt(3);
const wrap = (value: number, size: number): number => ((value % size) + size) % size;
const cellKey = (cell: GridCell): string => `${cell.col}:${cell.row}:${cell.face}`;
const equalCell = (a: GridCell, b: GridCell): boolean => cellKey(a) === cellKey(b);

function random(world: GridWorld): number {
  let state = world.randomState;
  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  world.randomState = state >>> 0;
  return world.randomState / 0x1_0000_0000;
}

export function headingCount(topology: GridTopology): number {
  return topology === "square" ? 4 : topology === "hexagon" ? 6 : 3;
}

export function normalizeCell(topology: GridTopology, cols: number, rows: number, cell: GridCell): GridCell {
  return { col: wrap(cell.col, cols), row: wrap(cell.row, rows), face: topology === "triangle" ? cell.face : 0 };
}

export function forwardCell(topology: GridTopology, cols: number, rows: number, cell: GridCell, heading: number): GridCell {
  const direction = wrap(heading, headingCount(topology));
  let next: GridCell;
  if (topology === "square") {
    const steps = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    next = { col: cell.col + steps[direction][0], row: cell.row + steps[direction][1], face: 0 };
  } else if (topology === "hexagon") {
    const steps = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
    next = { col: cell.col + steps[direction][0], row: cell.row + steps[direction][1], face: 0 };
  } else if (cell.face === 0) {
    // Up triangles: each edge leads to a distinct down triangle.
    const steps = [[0, 0], [-1, 0], [0, -1]];
    next = { col: cell.col + steps[direction][0], row: cell.row + steps[direction][1], face: 1 };
  } else {
    const steps = [[1, 0], [0, 1], [0, 0]];
    next = { col: cell.col + steps[direction][0], row: cell.row + steps[direction][1], face: 0 };
  }
  return normalizeCell(topology, cols, rows, next);
}

export function cellCenter(topology: GridTopology, cell: GridCell): { x: number; y: number } {
  const { col, row, face } = cell;
  if (topology === "square") return { x: col + .5, y: row + .5 };
  if (topology === "hexagon") return { x: 1.5 * col + 1, y: SQRT3 * (row + col / 2) + 1 };
  return {
    x: col + row / 2 + (face === 0 ? .5 : 1),
    y: SQRT3 * (row + (face === 0 ? 1 / 3 : 2 / 3)) / 2,
  };
}

export function headingAngle(topology: GridTopology, cell: GridCell, heading: number): number {
  const direction = wrap(heading, headingCount(topology));
  if (topology === "square") return direction * Math.PI / 2;
  if (topology === "hexagon") return Math.PI / 6 + direction * Math.PI / 3;
  return (cell.face === 0 ? Math.PI / 6 : -Math.PI / 6) + direction * 2 * Math.PI / 3;
}

export function allCells(topology: GridTopology, cols: number, rows: number): GridCell[] {
  const cells: GridCell[] = [];
  for (let row = 0; row < rows; row += 1) for (let col = 0; col < cols; col += 1) {
    cells.push({ col, row, face: 0 });
    if (topology === "triangle") cells.push({ col, row, face: 1 });
  }
  return cells;
}

function respawnFood(world: GridWorld, food: GridFood): void {
  const occupied = new Set(world.foods.filter((candidate) => candidate !== food).map((candidate) => cellKey(candidate.cell)));
  occupied.add(cellKey(world.agent.cell));
  const available = allCells(world.topology, world.cols, world.rows).filter((cell) => !occupied.has(cellKey(cell)));
  if (available.length > 0) food.cell = available[Math.floor(random(world) * available.length)];
}

function torusDisplacement(world: GridWorld, from: GridCell, to: GridCell): { x: number; y: number; distance: number } {
  const origin = cellCenter(world.topology, from);
  const target = cellCenter(world.topology, to);
  const periodCol = world.topology === "square"
    ? { x: world.cols, y: 0 }
    : world.topology === "hexagon"
      ? { x: 1.5 * world.cols, y: SQRT3 * world.cols / 2 }
      : { x: world.cols, y: 0 };
  const periodRow = world.topology === "square"
    ? { x: 0, y: world.rows }
    : world.topology === "hexagon"
      ? { x: 0, y: SQRT3 * world.rows }
      : { x: world.rows / 2, y: SQRT3 * world.rows / 2 };
  let closest = { x: 0, y: 0, distance: Infinity };
  for (let a = -1; a <= 1; a += 1) for (let b = -1; b <= 1; b += 1) {
    const x = target.x - origin.x + a * periodCol.x + b * periodRow.x;
    const y = target.y - origin.y + a * periodCol.y + b * periodRow.y;
    const distance = Math.hypot(x, y);
    if (distance < closest.distance) closest = { x, y, distance };
  }
  return closest;
}

export function collectGridSensors(world: GridWorld): number[] {
  const sensors = new Array<number>(6).fill(0);
  const direction = headingAngle(world.topology, world.agent.cell, world.agent.heading);
  const viewDistance = world.topology === "triangle" ? 2.7 : world.topology === "hexagon" ? 6.5 : 4;
  for (const food of world.foods) {
    const delta = torusDisplacement(world, world.agent.cell, food.cell);
    if (delta.distance <= 0 || delta.distance >= viewDistance) continue;
    const relative = Math.atan2(Math.sin(Math.atan2(delta.y, delta.x) - direction), Math.cos(Math.atan2(delta.y, delta.x) - direction));
    if (Math.abs(relative) > Math.PI / 3) continue;
    const sector = Math.min(2, Math.max(0, Math.floor((relative + Math.PI / 3) / (2 * Math.PI / 9))));
    const index = (food.kind === "bad" ? 3 : 0) + sector;
    sensors[index] = Math.max(sensors[index], 1 - delta.distance / viewDistance);
  }
  world.sensors = sensors;
  return [...sensors];
}

export function createGridWorld(topology: GridTopology, cols: number, rows: number, seed: number, foodPerKind = 5): GridWorld {
  if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 4 || rows < 4 || cols > 20 || rows > 20) {
    throw new RangeError("grid dimensions must be integers from 4 to 20");
  }
  const world: GridWorld = {
    topology, cols, rows, seed: seed >>> 0, randomState: (seed >>> 0) || 0x6d2b79f5, tick: 0,
    agent: { cell: { col: Math.floor(cols / 2), row: Math.floor(rows / 2), face: 0 }, heading: topology === "triangle" ? 0 : 0 },
    foods: [], sensors: Array(6).fill(0), reward: 0, eaten: { good: 0, bad: 0 },
  };
  const capacity = allCells(topology, cols, rows).length - 1;
  const count = Math.min(Math.max(0, Math.floor(foodPerKind)), Math.floor(capacity / 2));
  for (const kind of ["good", "bad"] as const) for (let index = 0; index < count; index += 1) {
    const food: GridFood = { id: `${kind}-${index + 1}`, kind, cell: world.agent.cell };
    respawnFood(world, food);
    world.foods.push(food);
  }
  collectGridSensors(world);
  return world;
}

export function advanceGridWorld(world: GridWorld, action: GridAction): { moved: boolean; eaten: "good" | "bad" | null } {
  const previous = world.agent.cell;
  const count = headingCount(world.topology);
  if (action === 1) world.agent.heading = (world.agent.heading + 1) % count;
  if (action === 2) world.agent.heading = (world.agent.heading + count - 1) % count;
  if (action === 3) world.agent.cell = forwardCell(world.topology, world.cols, world.rows, previous, world.agent.heading);
  const eaten = world.foods.find((food) => equalCell(food.cell, world.agent.cell));
  world.reward = eaten?.kind === "good" ? 1 : eaten?.kind === "bad" ? -1 : 0;
  if (eaten) {
    world.eaten[eaten.kind] += 1;
    respawnFood(world, eaten);
  }
  world.tick += 1;
  collectGridSensors(world);
  return { moved: !equalCell(previous, world.agent.cell), eaten: eaten?.kind ?? null };
}
