import { GAMES } from "@/lib/games";

export const NEWS_CATEGORIES = ["POKEMON", "ONEPIECE", "GENERAL", "MAGIC", "MYL"] as const;
export type NewsCategoryId = (typeof NEWS_CATEGORIES)[number];

function gameMeta(category: string) {
  return GAMES[category.toLowerCase() as keyof typeof GAMES];
}

export function newsCategoryLabel(category: string): string {
  if (category === "GENERAL") return "Comunidad TCG";
  return gameMeta(category)?.short ?? category;
}
