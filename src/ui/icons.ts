import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Boxes,
  Brain,
  ChevronDown,
  Dices,
  Download,
  Hand,
  Info,
  Eye,
  Lightbulb,
  MemoryStick,
  Map,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Radio,
  StepForward,
  Trash2,
  createIcons,
} from "lucide";

const ICONS = {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Boxes,
  Brain,
  ChevronDown,
  Dices,
  Download,
  Hand,
  Info,
  Eye,
  Lightbulb,
  MemoryStick,
  Map,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Radio,
  StepForward,
  Trash2,
};
const DYNAMIC_ICONS = { pause: Pause, play: Play };

type DynamicIconName = keyof typeof DYNAMIC_ICONS;

export function mountIcons(root: Element | Document = document): void {
  createIcons({
    icons: ICONS,
    root,
    attrs: { "aria-hidden": "true", focusable: "false", strokeWidth: 1.8 },
  });
}

export function setIcon(host: HTMLElement, iconName: DynamicIconName): void {
  const icon = document.createElement("i");
  icon.dataset.lucide = iconName;
  host.replaceChildren(icon);
  mountIcons(host);
}
