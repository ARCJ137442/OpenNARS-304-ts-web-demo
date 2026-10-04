export type Direction = "up" | "down" | "left" | "right";
export type Board = number[];
export type Game2048 = { board: Board; score: number; round: number; highest: number; seed: number; randomState: number; gameOver: boolean; moves: number; merges: number; lastEvent: string };

const SIZE = 4;
const index = (row: number, col: number): number => row * SIZE + col;
const random = (game: Game2048): number => { let state = game.randomState; state ^= state << 13; state ^= state >>> 17; state ^= state << 5; game.randomState = state >>> 0; return game.randomState / 0x1_0000_0000; };
const lines = (direction: Direction): number[][] => direction === "left" || direction === "right"
  ? Array.from({ length: SIZE }, (_, row) => Array.from({ length: SIZE }, (_, col) => index(row, direction === "left" ? col : SIZE - 1 - col)))
  : Array.from({ length: SIZE }, (_, col) => Array.from({ length: SIZE }, (_, row) => index(direction === "up" ? row : SIZE - 1 - row, col)));

export function spawnTile(game: Game2048): number {
  const empty = game.board.flatMap((value, position) => value === 0 ? [position] : []);
  if (empty.length === 0) return -1;
  const position = empty[Math.floor(random(game) * empty.length)];
  game.board[position] = random(game) < .9 ? 2 : 4;
  game.highest = Math.max(game.highest, game.board[position]);
  return position;
}

export function createGame(seed = 3040304): Game2048 {
  const game: Game2048 = { board: new Array(16).fill(0), score: 0, round: 1, highest: 0, seed: seed >>> 0, randomState: (seed >>> 0) || 0x6d2b79f5, gameOver: false, moves: 0, merges: 0, lastEvent: "新局" };
  spawnTile(game); spawnTile(game); return game;
}

export function canMove(game: Game2048): boolean { return game.board.some((value, position) => value === 0 || (position % SIZE < SIZE - 1 && value === game.board[position + 1]) || (position < 12 && value === game.board[position + SIZE])); }

export function move(game: Game2048, direction: Direction): { changed: boolean; merged: number; gained: number; gameOver: boolean } {
  if (game.gameOver) return { changed: false, merged: 0, gained: 0, gameOver: true };
  let changed = false, merged = 0, gained = 0;
  for (const line of lines(direction)) {
    const values = line.map((position) => game.board[position]).filter(Boolean);
    const compact: number[] = [];
    for (let cursor = 0; cursor < values.length; cursor += 1) {
      if (values[cursor] === values[cursor + 1]) { const value = values[cursor] * 2; compact.push(value); gained += value; merged += 1; cursor += 1; }
      else compact.push(values[cursor]);
    }
    line.forEach((position, offset) => { const next = compact[offset] ?? 0; if (game.board[position] !== next) changed = true; game.board[position] = next; });
  }
  if (changed) { game.moves += 1; game.merges += merged; game.score += gained; game.lastEvent = merged > 0 ? `合并 ${merged} 次 · +${gained}` : "移动"; spawnTile(game); }
  game.gameOver = !canMove(game); if (game.gameOver) game.lastEvent = "终局 · 自动重开";
  return { changed, merged, gained, gameOver: game.gameOver };
}

export function buildNarsInput(game: Game2048): { beliefs: string[]; goals: string[]; feedback: string[]; cycles: number } {
  const max = Math.max(...game.board); const empty = game.board.filter((value) => value === 0).length;
  const edge = game.board.slice(0, 4).reduce((sum, value) => sum + value, 0);
  return { beliefs: [`<{SELF} --> [empty_${empty}]>. :|:`, `<{SELF} --> [max_${max}]>. :|:`, `<{SELF} --> [edge_${edge}]>. :|:`], goals: ["<(&/, ^left, ^right) --> [survive] >! :|:"], feedback: game.lastEvent === "新局" ? [] : [`<{SELF} --> [${game.lastEvent.replace(/[^a-z0-9]+/gi, "_")}]>. :|:`], cycles: 10 };
}
