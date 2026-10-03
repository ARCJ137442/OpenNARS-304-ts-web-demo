import { allCells, cellCenter, headingAngle, type GridCell, type GridTopology, type GridWorld } from "./model.ts";

type Point = { x: number; y: number };

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

export function drawGridWorld(context: CanvasRenderingContext2D, world: GridWorld): void {
  const { width, height } = context.canvas;
  context.fillStyle = "#101713";
  context.fillRect(0, 0, width, height);
  const toScreen = fit(world, width, height);
  const cells = allCells(world.topology, world.cols, world.rows);

  for (const cell of cells) {
    const vertices = polygon(world.topology, cell).map(toScreen);
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
  context.rotate(angle);
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

  const good = Math.max(...world.sensors.slice(0, 3));
  const bad = Math.max(...world.sensors.slice(3, 6));
  context.strokeStyle = good >= bad ? `rgba(183,230,110,${.15 + good * .5})` : `rgba(255,118,97,${.15 + bad * .5})`;
  context.lineWidth = 2;
  context.beginPath(); context.arc(center.x, center.y, unit * 2.1, angle - Math.PI / 3, angle + Math.PI / 3); context.stroke();
}
