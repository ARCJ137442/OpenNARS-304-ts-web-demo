import { allCells, cellCenter, headingAngle, type GridCell, type GridTopology, type GridWorld } from "./model.ts";

type Point = { x: number; y: number };
type RenderGeometry = { key: string; toScreen: (point: Point) => Point; cells: GridCell[]; polygons: Point[][] };
let geometryCache: RenderGeometry | null = null;
export type GridRenderAssets = {
  agent?: HTMLImageElement;
  food?: HTMLImageElement;
  fire?: HTMLImageElement;
};

function polygon(topology: GridTopology, cell: GridCell): Point[] {
  if (topology === "square") {
    const { col: x, row: y } = cell;
    return [{ x, y }, { x: x + 1, y }, { x: x + 1, y: y + 1 }, { x, y: y + 1 }];
  }
  if (topology === "hexagon") {
    const center = cellCenter(topology, cell);
    return Array.from({ length: 6 }, (_, index) => ({
      x: center.x + Math.cos(index * Math.PI / 3),
      y: center.y + Math.sin(index * Math.PI / 3),
    }));
  }
  const height = Math.sqrt(3) / 2;
  const x = cell.col + cell.row / 2;
  const y = cell.row * height;
  return cell.face === 0
    ? [{ x, y }, { x: x + 1, y }, { x: x + .5, y: y + height }]
    : [{ x: x + 1, y }, { x: x + 1.5, y: y + height }, { x: x + .5, y: y + height }];
}

function fit(world: GridWorld, width: number, height: number): (point: Point) => Point {
  const points = allCells(world.topology, world.cols, world.rows).flatMap((cell) => polygon(world.topology, cell));
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  const scale = Math.min((width - 64) / (maxX - minX), (height - 64) / (maxY - minY));
  const left = (width - (maxX - minX) * scale) / 2;
  const top = (height - (maxY - minY) * scale) / 2;
  return (point) => ({ x: left + (point.x - minX) * scale, y: top + (point.y - minY) * scale });
}

export function gridCellAtPoint(world: GridWorld, width: number, height: number, x: number, y: number): GridCell {
  const toScreen = fit(world, width, height);
  return allCells(world.topology, world.cols, world.rows).reduce((closest, cell) => {
    const point = toScreen(cellCenter(world.topology, cell));
    const distance = Math.hypot(point.x - x, point.y - y);
    return distance < closest.distance ? { cell, distance } : closest;
  }, { cell: { col: 0, row: 0, face: 0 as 0 | 1 }, distance: Infinity }).cell;
}

export function drawGridWorld(context: CanvasRenderingContext2D, world: GridWorld, assets: GridRenderAssets = {}): void {
  const { width, height } = context.canvas;
  context.fillStyle = "#101713";
  context.fillRect(0, 0, width, height);
  const key = `${world.topology}:${world.cols}:${world.rows}:${width}:${height}`;
  if (geometryCache?.key !== key) {
    const toScreen = fit(world, width, height);
    const cells = allCells(world.topology, world.cols, world.rows);
    geometryCache = { key, toScreen, cells, polygons: cells.map((cell) => polygon(world.topology, cell).map(toScreen)) };
  }
  const { toScreen, cells, polygons } = geometryCache;

  for (let index = 0; index < cells.length; index += 1) {
    const cell = cells[index];
    const vertices = polygons[index];
    context.beginPath();
    context.moveTo(vertices[0].x, vertices[0].y);
    for (const point of vertices.slice(1)) context.lineTo(point.x, point.y);
    context.closePath();
    context.fillStyle = (cell.col + cell.row + cell.face) % 2 === 0 ? "#202b23" : "#263228";
    context.fill();
    context.strokeStyle = "#3d5141";
    context.lineWidth = 1;
    context.stroke();
  }

  const center = toScreen(cellCenter(world.topology, world.agent.cell));
  const adjacent = toScreen(cellCenter(world.topology, {
    ...world.agent.cell, col: world.agent.cell.col + 1,
  }));
  const unit = Math.min(23, Math.max(9, Math.abs(adjacent.x - center.x) * .25));
  for (const food of world.foods) {
    const point = toScreen(cellCenter(world.topology, food.cell));
    const radius = unit * (food.kind === "good" ? .68 : .75);
    const sprite = food.kind === "good" ? assets.food : assets.fire;
    if (sprite?.complete && sprite.naturalWidth > 0) {
      context.save();
      context.translate(point.x, point.y);
      context.rotate(food.angle);
      context.imageSmoothingEnabled = false;
      context.drawImage(sprite, -radius, -radius, radius * 2, radius * 2);
      context.restore();
      continue;
    }
    context.fillStyle = food.kind === "good" ? "#b7e66e" : "#ff7661";
    context.beginPath();
    if (food.kind === "good") {
      context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    } else {
      context.moveTo(point.x, point.y - radius);
      context.lineTo(point.x + radius, point.y);
      context.lineTo(point.x, point.y + radius);
      context.lineTo(point.x - radius, point.y);
      context.closePath();
    }
    context.fill();
    context.strokeStyle = "#111713";
    context.lineWidth = 2;
    context.stroke();
  }

  const angle = headingAngle(world.topology, world.agent.cell, world.agent.heading);
  context.save();
  context.translate(center.x, center.y);
  // Classic Microworld sprites face the opposite direction of the world
  // heading convention, so keep the same half-turn correction here.
  context.rotate(angle + Math.PI);
  if (assets.agent?.complete && assets.agent.naturalWidth > 0) {
    const size = unit * 2.4;
    context.drawImage(assets.agent, -size / 2, -size / 2, size, size);
    context.restore();
  } else {
  context.fillStyle = "#b7e66e";
  context.beginPath(); context.ellipse(-unit * .15, 0, unit * .72, unit * .5, 0, 0, Math.PI * 2); context.fill();
  context.fillStyle = "#73d8c7";
  context.beginPath(); context.arc(unit * .45, 0, unit * .36, 0, Math.PI * 2); context.fill();
  context.fillStyle = "#12231d";
  context.beginPath(); context.arc(unit * .58, -unit * .12, unit * .08, 0, Math.PI * 2); context.fill();
  context.beginPath(); context.arc(unit * .58, unit * .12, unit * .08, 0, Math.PI * 2); context.fill();
  context.strokeStyle = "#d9ecab";
  context.lineWidth = 2;
  for (const side of [-1, 1]) for (const offset of [-.35, .05, .4]) {
    context.beginPath();
    context.moveTo(offset * unit, side * unit * .4);
    context.lineTo((offset - .15) * unit, side * unit * .82);
    context.stroke();
  }
  context.strokeStyle = "#73d8c7";
  context.beginPath(); context.moveTo(unit * .7, 0); context.lineTo(unit * 1.55, 0); context.stroke();
  context.restore();
  }

  // Match the classic Microworld's visual-field boundary: two red rays with
  // the same narrow stroke, while the grid topology controls their length.
  context.save();
  context.strokeStyle = "rgba(204, 57, 55, 0.9)";
  context.lineWidth = Math.max(1, Math.min(1.6, unit * 0.12));
  const viewDistance = unit * (world.topology === "triangle" ? 3 : world.topology === "hexagon" ? 3.8 : 3.4);
  for (const side of [-1, 1]) {
    const rayAngle = angle + side * Math.PI / 3;
    context.beginPath();
    context.moveTo(center.x, center.y);
    context.lineTo(center.x + Math.cos(rayAngle) * viewDistance, center.y + Math.sin(rayAngle) * viewDistance);
    context.stroke();
  }
  context.restore();
}
