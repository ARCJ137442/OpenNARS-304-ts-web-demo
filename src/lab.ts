type PreviewName = "microworld" | "gridworld" | "terminal" | "pong" | "alien" | "bandrobot" | "cartpole" | "hunt" | "echo-relay" | "tictactoe" | "shot" | "testchamber" | "fighterplane";
type PreviewRenderer = (context: CanvasRenderingContext2D, width: number, height: number, time: number) => void;

const canvases = [...document.querySelectorAll<HTMLCanvasElement>("canvas[data-preview]")];
const assets = {
  agent: sprite("./assets/agent.png"),
  food: sprite("./assets/food.png"),
  fire: sprite("./assets/fire.png"),
  ball: sprite("./assets/ball.png"),
  bar: sprite("./assets/bar.png"),
};

function sprite(source: string): HTMLImageElement {
  const image = new Image();
  image.src = source;
  image.addEventListener("load", () => drawAll(performance.now()));
  return image;
}

function image(context: CanvasRenderingContext2D, spriteValue: HTMLImageElement, x: number, y: number, width: number, height: number, rotation = 0): void {
  if (!spriteValue.complete || !spriteValue.naturalWidth) return;
  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  context.imageSmoothingEnabled = false;
  context.drawImage(spriteValue, -width / 2, -height / 2, width, height);
  context.restore();
}

function drawMicroworld(context: CanvasRenderingContext2D, width: number, height: number, time: number): void {
  context.fillStyle = "#898b82";
  context.fillRect(0, 0, width, height);
  const cx = width * 0.48;
  const cy = height * 0.55;
  context.strokeStyle = "rgba(42,55,43,.16)";
  context.lineWidth = 1;
  for (let x = 25; x < width; x += 25) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke(); }
  for (let y = 25; y < height; y += 25) { context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke(); }
  context.strokeStyle = "rgba(236,239,221,.42)";
  context.setLineDash([4, 5]);
  context.beginPath(); context.arc(cx, cy, height * .34, -Math.PI / 3, Math.PI / 3); context.stroke();
  context.setLineDash([]);
  image(context, assets.agent, cx + Math.sin(time / 1200) * 8, cy, 28, 28, Math.PI + Math.sin(time / 900) * .2);
  image(context, assets.food, width * .7, height * .34, 24, 24, 0);
  image(context, assets.fire, width * .72, height * .75, 26, 26, time / 1000);
}

function drawTerminal(context: CanvasRenderingContext2D, width: number, height: number, time: number): void {
  context.fillStyle = "#071013";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "rgba(98,255,227,.1)";
  context.lineWidth = 1;
  for (let x = 24; x < width; x += 24) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke(); }
  for (let y = 24; y < height; y += 24) { context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke(); }
  context.fillStyle = "#62ffe3";
  context.fillRect(34, 38, 9, 9);
  context.fillStyle = "#dce9e7";
  context.font = "600 13px monospace";
  context.fillText("nars> <bird --> animal>.", 54, 48);
  context.strokeStyle = "#426e62";
  context.lineWidth = 2;
  context.beginPath(); context.moveTo(42, 100); context.lineTo(width - 42, 100); context.stroke();
  const progress = (Math.sin(time / 650) + 1) / 2;
  const pulseX = 42 + (width - 84) * progress;
  context.fillStyle = "#b7e66e";
  context.beginPath(); context.arc(pulseX, 100, 5, 0, Math.PI * 2); context.fill();
  context.strokeStyle = "#ffc56c";
  context.beginPath(); context.arc(width / 2, 100, 20, 0, Math.PI * 2); context.stroke();
  context.fillStyle = "#ffc56c";
  context.font = "600 12px monospace";
  context.fillText("INFERENCE", width / 2 - 31, 105);
  context.fillStyle = "#62ffe3";
  context.fillRect(34, 158, 9, 9);
  context.fillText("OUT: <bird --> animal>.", 54, 168);
  context.fillStyle = "#789b94";
  context.font = "10px monospace";
  context.fillText("INPUT", 34, 216);
  context.fillText("REASON", width / 2 - 20, 216);
  context.fillText("OUTPUT", width - 75, 216);
}

function drawGridworld(context: CanvasRenderingContext2D, width: number, height: number, time: number): void {
  context.fillStyle = "#151e18"; context.fillRect(0, 0, width, height);
  const cols = 10, rows = 6, cell = Math.min(width / cols, height / rows);
  for (let row = 0; row < rows; row += 1) for (let col = 0; col < cols; col += 1) {
    context.fillStyle = (row + col) % 2 ? "#26352a" : "#202d24";
    context.fillRect(col * cell + 1, row * cell + 1, cell - 2, cell - 2);
    context.strokeStyle = "#3b5541"; context.strokeRect(col * cell + 1, row * cell + 1, cell - 2, cell - 2);
  }
  const x = width * (.5 + Math.sin(time / 1300) * .16), y = height * (.5 + Math.cos(time / 1100) * .18);
  context.fillStyle = "#b7e66e"; context.beginPath(); context.arc(x, y, 12, 0, Math.PI * 2); context.fill();
  context.strokeStyle = "#73d8c7"; context.beginPath(); context.arc(x, y, 34, -Math.PI / 3, Math.PI / 3); context.stroke();
  context.fillStyle = "#ff7661"; context.fillRect(width * .72, height * .3, 11, 11);
  context.fillStyle = "#ffc56c"; context.beginPath(); context.arc(width * .27, height * .7, 7, 0, Math.PI * 2); context.fill();
}

function drawPong(context: CanvasRenderingContext2D, width: number, height: number, time: number): void {
  context.fillStyle = "#131a18";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "#435248";
  context.setLineDash([5, 7]);
  context.beginPath(); context.moveTo(width * .5, 0); context.lineTo(width * .5, height); context.stroke(); context.setLineDash([]);
  const y = height * .5 + Math.sin(time / 700) * height * .2;
  context.fillStyle = "#b7e66e";
  context.fillRect(width * .09, y - 28, 7, 56);
  context.fillStyle = "#ffc56c";
  context.fillRect(width * .9, height * .5 - 24, 7, 48);
  image(context, assets.ball, width * (.5 + Math.sin(time / 500) * .25), height * (.5 + Math.cos(time / 800) * .24), 16, 16, 0);
}

function drawAlien(context: CanvasRenderingContext2D, width: number, height: number, time: number): void {
  context.fillStyle = "#252d29";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "rgba(190,207,174,.16)";
  for (let y = 25; y < height; y += 25) { context.beginPath(); context.moveTo(0,y); context.lineTo(width,y); context.stroke(); }
  const target = width * (.5 + Math.sin(time / 900) * .31);
  context.fillStyle = "#ff7661";
  context.fillRect(target - 13, height * .25, 26, 14);
  context.fillStyle = "#ffc56c";
  context.fillRect(width * .5 - 20, height * .77, 40, 8);
  context.fillStyle = "#f0eee3";
  context.fillRect(width * .5 - 2, height * .32, 4, height * .42);
}

function drawBandRobot(context: CanvasRenderingContext2D, width: number, height: number, time: number): void {
  context.fillStyle = "#2e322a";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "#858b78";
  context.lineWidth = 2;
  context.beginPath(); context.moveTo(20,height*.75); context.lineTo(width-20,height*.75); context.stroke();
  for (let i = 0; i < 21; i += 1) {
    const x = 20 + i * (width - 40) / 20;
    context.strokeStyle = i === 12 ? "#ffc56c" : "#5d665b";
    context.beginPath(); context.moveTo(x,height*.73); context.lineTo(x,height*.79); context.stroke();
  }
  const robotX = width * (.18 + ((time / 5000) % .58));
  image(context, assets.bar, robotX, height * .63, 22, 38, 0);
  image(context, assets.ball, width * .7, height * .72, 17, 17, 0);
  context.fillStyle = "#b7e66e";
  context.beginPath(); context.moveTo(width*.84,height*.82); context.lineTo(width*.9,height*.68); context.lineTo(width*.96,height*.82); context.closePath(); context.fill();
}

function drawCartpole(context: CanvasRenderingContext2D, width: number, height: number, time: number): void {
  context.fillStyle = "#26302a";
  context.fillRect(0, 0, width, height);
  const angle = Math.sin(time / 420) * .26;
  const cartX = width * .5 + Math.sin(time / 900) * width * .2;
  const pivotY = height * .65;
  context.strokeStyle = "#d6d9ce";
  context.lineWidth = 5;
  context.beginPath(); context.moveTo(cartX,pivotY); context.lineTo(cartX + Math.sin(angle)*height*.43,pivotY - Math.cos(angle)*height*.43); context.stroke();
  context.fillStyle = "#b7e66e";
  context.fillRect(cartX-24,pivotY,48,21);
  context.fillStyle = "#f7bd64";
  context.beginPath(); context.arc(cartX + Math.sin(angle)*height*.43,pivotY - Math.cos(angle)*height*.43,7,0,Math.PI*2); context.fill();
  context.strokeStyle = "#697469";
  context.beginPath(); context.moveTo(15,pivotY+22); context.lineTo(width-15,pivotY+22); context.stroke();
}

function drawHunt(context: CanvasRenderingContext2D, width: number, height: number, time: number): void {
  context.fillStyle = "#222921";
  context.fillRect(0, 0, width, height);
  const cellWidth = width / 10;
  const cellHeight = height / 6;
  context.strokeStyle = "rgba(185,200,174,.14)";
  for (let x = 0; x <= 10; x += 1) { context.beginPath(); context.moveTo(x * cellWidth, 0); context.lineTo(x * cellWidth, height); context.stroke(); }
  for (let y = 0; y <= 6; y += 1) { context.beginPath(); context.moveTo(0, y * cellHeight); context.lineTo(width, y * cellHeight); context.stroke(); }
  const targetX = 5 + Math.round(Math.sin(time / 800) * 3);
  const targetY = 3 + Math.round(Math.cos(time / 1100) * 2);
  context.fillStyle = "#ffc56c";
  context.beginPath(); context.arc((targetX + .5) * cellWidth, (targetY + .5) * cellHeight, 7, 0, Math.PI * 2); context.fill();
  context.fillStyle = "#b7e66e";
  context.fillRect(cellWidth * 2.2, cellHeight * 2.2, cellWidth * .6, cellHeight * .6);
}

function drawExpansionPreview(context: CanvasRenderingContext2D, width: number, height: number, time: number, game: PreviewName): void {
  context.fillStyle = "#202720"; context.fillRect(0, 0, width, height);
  if (game === "echo-relay") {
    const cell = Math.min(width / 9, height / 7), ox = (width - cell * 9) / 2, oy = (height - cell * 7) / 2;
    const walls = ["#########", "#.......#", "#.#.###.#", "#.#.....#", "#.#####.#", "#.......#", "#########"];
    context.fillStyle = "#65736b"; walls.forEach((row, y) => [...row].forEach((value, x) => { if (value === "#") context.fillRect(ox + x * cell + 1, oy + y * cell + 1, cell - 2, cell - 2); }));
    context.strokeStyle = "#71d9c8"; context.lineWidth = 2; context.beginPath(); context.moveTo(ox + cell * 1.5, oy + cell * 1.5); context.lineTo(ox + cell * 2.5, oy + cell * 1.5); context.lineTo(ox + cell * 2.5, oy + cell * 2.5); context.lineTo(ox + cell * 3.5, oy + cell * 2.5); context.stroke();
    context.fillStyle = "#b7e66e"; context.beginPath(); context.arc(ox + cell * 1.5, oy + cell * 1.5, 4, 0, Math.PI * 2); context.fill();
    context.fillStyle = "#ffc56c"; context.beginPath(); context.arc(ox + cell * 7.5, oy + cell * 5.5, 4, 0, Math.PI * 2); context.fill();
    const pulseX = ox + cell * 3.5, pulseY = oy + cell * 2.5 + Math.sin(time / 180) * 2; context.fillStyle = "#e7f4c5"; context.beginPath(); context.arc(pulseX, pulseY, 2.5, 0, Math.PI * 2); context.fill(); return;
  }
  if (game === "tictactoe") { context.strokeStyle = "#84927f"; context.lineWidth = 2; for (let i = 1; i < 3; i++) { context.beginPath(); context.moveTo(width * i / 3, 18); context.lineTo(width * i / 3, height - 18); context.stroke(); context.beginPath(); context.moveTo(18, height * i / 3); context.lineTo(width - 18, height * i / 3); context.stroke(); } context.fillStyle = "#b7e66e"; context.font = "bold 36px system-ui"; context.fillText("X", width * .5 - 12, height * .5 + 12); context.fillStyle = "#ffc56c"; context.fillText("O", width * .75 - 12, height * .25 + 12); return; }
  if (game === "testchamber") { context.strokeStyle = "rgba(185,200,174,.2)"; for (let x = 0; x <= 8; x++) { context.beginPath(); context.moveTo(x * width / 8, 0); context.lineTo(x * width / 8, height); context.stroke(); } for (let y = 0; y <= 6; y++) { context.beginPath(); context.moveTo(0, y * height / 6); context.lineTo(width, y * height / 6); context.stroke(); } context.fillStyle = "#b7e66e"; context.fillRect(width * .2, height * .2, 9, 9); context.fillStyle = "#ffc56c"; context.fillRect(width * .38, height * .48, 9, 9); return; }
  if (game === "shot") { context.fillStyle = "#ffc56c"; context.beginPath(); context.arc(width * (.5 + Math.sin(time / 600) * .28), height * .3, 7, 0, Math.PI * 2); context.fill(); context.fillStyle = "#b7e66e"; context.fillRect(width * .5 - 14, height * .78, 28, 7); return; }
  context.fillStyle = "#ff7661"; context.beginPath(); context.arc(width * (.58 + Math.sin(time / 700) * .2), height * .3, 9, 0, Math.PI * 2); context.fill(); context.fillStyle = "#b7e66e"; context.beginPath(); context.moveTo(width * .48, height * .78); context.lineTo(width * .45, height * .89); context.lineTo(width * .51, height * .89); context.closePath(); context.fill();
}

function drawAll(now: number): void {
  for (const canvas of canvases) {
    const bounds = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(bounds.width * ratio));
    const height = Math.max(1, Math.round(bounds.height * ratio));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    const context = canvas.getContext("2d");
    if (!context) continue;
    context.setTransform(width / 420, 0, 0, height / 240, 0, 0);
    const draw: Record<PreviewName, PreviewRenderer> = {
      microworld: drawMicroworld,
      gridworld: drawGridworld,
      terminal: drawTerminal,
      pong: drawPong,
      alien: drawAlien,
      bandrobot: drawBandRobot,
      cartpole: drawCartpole,
      hunt: drawHunt,
      "echo-relay": (context, width, height, time) => drawExpansionPreview(context, width, height, time, "echo-relay"),
      tictactoe: (context, width, height, time) => drawExpansionPreview(context, width, height, time, "tictactoe"),
      shot: (context, width, height, time) => drawExpansionPreview(context, width, height, time, "shot"),
      testchamber: (context, width, height, time) => drawExpansionPreview(context, width, height, time, "testchamber"),
      fighterplane: (context, width, height, time) => drawExpansionPreview(context, width, height, time, "fighterplane"),
    };
    const preview = canvas.dataset.preview as PreviewName;
    draw[preview]?.(context, 420, 240, now);
  }
  requestAnimationFrame(drawAll);
}

drawAll(performance.now());
