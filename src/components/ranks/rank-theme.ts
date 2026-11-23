import type {Rank} from "@/lib/ranks";

/** Background and accent per rank (soft, so text stays readable). */
export const RANK_THEME: Record<Rank | "none", {background: string; title: string; line: string}> = {
  silver: {background: "radial-gradient(120% 70% at 50% 35%, #ffffff 0%, rgba(255,255,255,0) 60%), linear-gradient(180deg, #f6f7f9 0%, #e4e8ed 100%)", title: "#4a515b", line: "#a9b1bb"},
  gold: {background: "radial-gradient(120% 70% at 50% 35%, #fffaf0 0%, rgba(255,250,240,0) 60%), linear-gradient(180deg, #fdf7ea 0%, #f2e1b6 100%)", title: "#7a5410", line: "#d4a849"},
  platinum: {background: "radial-gradient(120% 70% at 50% 35%, #ffffff 0%, rgba(255,255,255,0) 60%), linear-gradient(180deg, #f1f7fb 0%, #d3e3ee 100%)", title: "#3c586d", line: "#8fadc2"},
  crystal: {
    background:
      "radial-gradient(90% 55% at 70% 30%, rgba(143,240,247,0.35) 0%, rgba(143,240,247,0) 70%), radial-gradient(120% 70% at 50% 35%, #ffffff 0%, rgba(255,255,255,0) 60%), linear-gradient(180deg, #f3feff 0%, #d0f2f6 100%)",
    title: "#17707f",
    line: "#5cc8d6",
  },
  none: {background: "linear-gradient(180deg, #faf8f5 0%, #eee8e0 100%)", title: "#7a6d6f", line: "#d9ccc1"},
};
