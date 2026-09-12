import { GAMES } from "@/lib/games";

export const NEWS_CATEGORIES = ["MAGIC", "POKEMON", "ONEPIECE", "MYL", "GENERAL"] as const;
export type NewsCategoryId = (typeof NEWS_CATEGORIES)[number];

function gameMeta(category: string) {
  return GAMES[category.toLowerCase() as keyof typeof GAMES];
}

export function newsCategoryLabel(category: string): string {
  if (category === "GENERAL") return "Torneos";
  return gameMeta(category)?.short ?? category;
}

export function newsCategoryColor(category: string): string {
  if (category === "GENERAL") return "#d9a441";
  return gameMeta(category)?.accent ?? "#d9a441";
}
