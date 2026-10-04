import { DEMO_DEFINITIONS, type DemoId } from "../games/models.ts";
import { EXPANSION_DEFINITIONS } from "../games/expansion-models.ts";
import { isDemoId } from "../games/shared.ts";

export type DemoCatalogEntry = {
  id: "microworld" | "gridworld" | "nars2048" | "terminal" | DemoId;
  title: string;
  summary: string;
  family: string;
  href: string;
  preview: "microworld" | "gridworld" | "nars2048" | "terminal" | DemoId;
  artwork: string;
  sourceLabel: string;
  featured?: boolean;
};
type DemoCatalogDraft = Omit<DemoCatalogEntry, "family"> & { familyLabel: string };

const artworkClasses: Record<"microworld" | "gridworld" | "nars2048" | "terminal" | DemoId, string> = {
  microworld: "art-microworld",
  gridworld: "art-gridworld",
  nars2048: "art-nars2048",
  terminal: "art-terminal",
  pong: "art-pong",
  alien: "art-alien",
  bandrobot: "art-robot",
  cartpole: "art-pole",
  hunt: "art-hunt",
  tictactoe: "art-tictactoe",
  shot: "art-shot",
  testchamber: "art-testchamber",
  fighterplane: "art-fighterplane",
  "echo-relay": "art-echo-relay",
};

const games: readonly DemoCatalogDraft[] = [
  {
    id: "pong",
    title: DEMO_DEFINITIONS.pong.title,
    summary: "球的位置感知 · 左右操作 · 击球反馈",
    familyLabel: "CLASSIC",
    href: "./pong.html",
    preview: "pong",
    artwork: artworkClasses.pong,
    sourceLabel: "SENSORIMOTOR / 2 ACTIONS",
  },
  {
    id: "alien",
    title: DEMO_DEFINITIONS.alien.title,
    summary: "左右移动 · 瞄准 · 射击命中",
    familyLabel: "DISCRETE CONTROL",
    href: "./demo.html?game=alien",
    preview: "alien",
    artwork: artworkClasses.alien,
    sourceLabel: "PERCEPTION / TARGET / HIT",
  },
  {
    id: "bandrobot",
    title: DEMO_DEFINITIONS.bandrobot.title,
    summary: "多步搬运实验 · 自主完整交付尚未验证",
    familyLabel: "MULTI-STEP TASK",
    href: "./demo.html?game=bandrobot",
    preview: "bandrobot",
    artwork: artworkClasses.bandrobot,
    sourceLabel: "EXPERIMENTAL / PICK / DELIVER",
  },
  {
    id: "cartpole",
    title: DEMO_DEFINITIONS.cartpole.title,
    summary: "离散方向输入 · 角度状态 · 稳定时间",
    familyLabel: "BALANCE",
    href: "./demo.html?game=cartpole",
    preview: "cartpole",
    artwork: artworkClasses.cartpole,
    sourceLabel: "CONTINUOUS STATE / DISCRETE ACTION",
  },
  {
    id: "hunt",
    title: DEMO_DEFINITIONS.hunt.title,
    summary: "四方向追逐 · 差分感知 · 捕获反馈",
    familyLabel: "PURSUIT",
    href: "./demo.html?game=hunt",
    preview: "hunt",
    artwork: artworkClasses.hunt,
    sourceLabel: "GRID / FOUR DIRECTIONS / CAPTURE",
  },
  ...(["tictactoe", "shot", "testchamber", "fighterplane"] as const).map((id): DemoCatalogDraft => ({
    id,
    title: EXPANSION_DEFINITIONS[id].title,
    summary: EXPANSION_DEFINITIONS[id].subtitle,
    familyLabel: "EXPANSION",
    href: id === "shot" ? "./shot.html" : `./demo.html?game=${id}`,
    preview: id,
    artwork: artworkClasses[id],
    sourceLabel: "OPENNARS ADAPTATION / COMPOSITE NARSESE",
  })),
  {
    id: "echo-relay",
    title: "Echo Relay",
    summary: "回声探测 · 部分可观测迷宫 · 信标导航",
    familyLabel: "PARTIAL OBSERVABILITY",
    href: "./demo.html?game=echo-relay",
    preview: "echo-relay",
    artwork: artworkClasses["echo-relay"],
    sourceLabel: "ORIGINAL / ECHO-BASED EXPLORATION",
  },
];

const catalogDrafts: readonly DemoCatalogDraft[] = [
  {
    id: "microworld",
    title: "虫脑 Microworld",
    summary: "六路离散视觉 · 好坏食物 · 感知—操作闭环",
    familyLabel: "PERCEPTION & FEEDBACK",
    href: "./microworld.html?seed=19&knowledge=starter",
    preview: "microworld",
    artwork: artworkClasses.microworld,
    sourceLabel: "SimNAR / OpenNARS Lab 3.0.4",
    featured: true,
  },
  {
    id: "gridworld",
    title: "Grid Microworld 格中虫脑",
    summary: "方格 · 三角格 · 六角格 · 环面感知运动",
    familyLabel: "DISCRETE TOPOLOGIES",
    href: "./gridworld.html",
    preview: "gridworld",
    artwork: artworkClasses.gridworld,
    sourceLabel: "GRID / SIX SENSORS / TORUS",
  },
  {
    id: "nars2048",
    title: "NARS × 2048",
    summary: "自动重开棋盘 · 跨局保留推理记忆",
    familyLabel: "LEARNING LAB",
    href: "./nars2048.html",
    preview: "nars2048",
    artwork: artworkClasses.nars2048,
    sourceLabel: "PERSISTENT MEMORY / TILE MERGE",
  },
  ...games,
];

export const DEMO_CATALOG: readonly DemoCatalogEntry[] = Object.freeze(
  catalogDrafts.map(({ familyLabel, ...entry }, index) => ({
    ...entry,
    family: `${String(index + 1).padStart(2, "0")} / ${familyLabel}`,
  })),
);

export const GAME_DEMOS: readonly DemoCatalogEntry[] = Object.freeze(DEMO_CATALOG.filter((entry) => isDemoId(entry.id)));

export { isDemoId };
