import { DEMO_DEFINITIONS, type DemoId } from "../games/models.ts";
import { EXPANSION_DEFINITIONS } from "../games/expansion-models.ts";
import { isDemoId } from "../games/shared.ts";

export type DemoCatalogEntry = {
  id: "microworld" | DemoId;
  title: string;
  summary: string;
  family: string;
  href: string;
  preview: "microworld" | DemoId;
  artwork: string;
  sourceLabel: string;
  featured?: boolean;
};

const artworkClasses: Record<"microworld" | DemoId, string> = {
  microworld: "art-microworld",
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

const games: readonly DemoCatalogEntry[] = [
  {
    id: "pong",
    title: DEMO_DEFINITIONS.pong.title,
    summary: "球的位置感知 · 左右操作 · 击球反馈",
    family: "02 / CLASSIC",
    href: "./demo.html?game=pong",
    preview: "pong",
    artwork: artworkClasses.pong,
    sourceLabel: "SENSORIMOTOR / 2 ACTIONS",
  },
  {
    id: "alien",
    title: DEMO_DEFINITIONS.alien.title,
    summary: "左右移动 · 瞄准 · 射击命中",
    family: "03 / DISCRETE CONTROL",
    href: "./demo.html?game=alien",
    preview: "alien",
    artwork: artworkClasses.alien,
    sourceLabel: "PERCEPTION / TARGET / HIT",
  },
  {
    id: "bandrobot",
    title: DEMO_DEFINITIONS.bandrobot.title,
    summary: "移动 · 拾取 · 运输 · 放置",
    family: "04 / MULTI-STEP TASK",
    href: "./demo.html?game=bandrobot",
    preview: "bandrobot",
    artwork: artworkClasses.bandrobot,
    sourceLabel: "SEQUENCE / PICK / DELIVER",
  },
  {
    id: "cartpole",
    title: DEMO_DEFINITIONS.cartpole.title,
    summary: "离散方向输入 · 角度状态 · 稳定时间",
    family: "05 / BALANCE",
    href: "./demo.html?game=cartpole",
    preview: "cartpole",
    artwork: artworkClasses.cartpole,
    sourceLabel: "CONTINUOUS STATE / DISCRETE ACTION",
  },
  {
    id: "hunt",
    title: DEMO_DEFINITIONS.hunt.title,
    summary: "四方向追逐 · 差分感知 · 捕获反馈",
    family: "06 / PURSUIT",
    href: "./demo.html?game=hunt",
    preview: "hunt",
    artwork: artworkClasses.hunt,
    sourceLabel: "GRID / FOUR DIRECTIONS / CAPTURE",
  },
  ...(["tictactoe", "shot", "testchamber", "fighterplane"] as const).map((id, index): DemoCatalogEntry => ({
    id,
    title: EXPANSION_DEFINITIONS[id].title,
    summary: EXPANSION_DEFINITIONS[id].subtitle,
    family: `${String(index + 7).padStart(2, "0")} / EXPANSION`,
    href: `./demo.html?game=${id}`,
    preview: id,
    artwork: artworkClasses[id],
    sourceLabel: "OPENNARS ADAPTATION / COMPOSITE NARSESE",
  })),
  {
    id: "echo-relay",
    title: "Echo Relay",
    summary: "回声探测 · 部分可观测迷宫 · 信标导航",
    family: "11 / PARTIAL OBSERVABILITY",
    href: "./demo.html?game=echo-relay",
    preview: "echo-relay",
    artwork: artworkClasses["echo-relay"],
    sourceLabel: "ORIGINAL / ECHO-BASED EXPLORATION",
  },
];

export const DEMO_CATALOG: readonly DemoCatalogEntry[] = Object.freeze([
  {
    id: "microworld",
    title: "虫脑 Microworld",
    summary: "六路离散视觉 · 好坏食物 · 感知—操作闭环",
    family: "01 / PERCEPTION & FEEDBACK",
    href: "./microworld.html?seed=19&knowledge=starter",
    preview: "microworld",
    artwork: artworkClasses.microworld,
    sourceLabel: "SimNAR / OpenNARS Lab 3.0.4",
    featured: true,
  },
  ...games,
]);

export const GAME_DEMOS: readonly DemoCatalogEntry[] = Object.freeze(games);

export { isDemoId };
