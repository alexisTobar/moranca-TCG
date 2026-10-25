import type { ListingType, Prisma } from "@prisma/client";

/** Preconstructed decks were historically published as sealed products. */
const DECK_PREFIXES = ["mazo", "deck", "starter deck", "structure deck", "commander deck", "battle deck", "league battle deck"];
export const PRECONSTRUCTED_DECK_PATTERN = "^[[:space:]]*(mazo|deck|starter deck|structure deck|commander deck|battle deck|league battle deck)([[:space:]:-]|$)";
export const DECK_BOX_PATTERN = "^[[:space:]]*deck[[:space:]-]*(box|protector)";

export function publicListingType(type: string, title: string): ListingType {
  const name = title.trim().toLowerCase();
  const deck = DECK_PREFIXES.some(prefix => name === prefix || name.startsWith(`${prefix} `) || name.startsWith(`${prefix}:`) || name.startsWith(`${prefix}-`));
  return type === "SEALED" && deck && !/^deck[\s-]*(box|protector)/i.test(name) ? "DECK" : type as ListingType;
}

export function listingTypeWhere(type: string): Prisma.ListingWhereInput {
  const legacyDeck: Prisma.ListingWhereInput = {
    type: "SEALED",
    OR: DECK_PREFIXES.flatMap(prefix => [
      {title:{equals:prefix,mode:"insensitive" as const}},
      ...[" ",":","-"].map(separator => ({title:{startsWith:prefix+separator,mode:"insensitive" as const}})),
    ]),
    NOT: {OR:[{title:{startsWith:"deck box",mode:"insensitive"}},{title:{startsWith:"deck-box",mode:"insensitive"}},{title:{startsWith:"deck protector",mode:"insensitive"}},{title:{startsWith:"deck-protector",mode:"insensitive"}}]},
  };
  if (type === "DECK") return {OR:[{type:"DECK"},legacyDeck]};
  if (type === "SEALED") return {type:"SEALED",NOT:legacyDeck};
  return {type:type as ListingType};
}

export function publicListingTypeCounts(rows:Array<{type:string;title:string}>) {
  const counts=new Map<string,number>();
  for(const row of rows){const type=publicListingType(row.type,row.title);counts.set(type,(counts.get(type)??0)+1);}
  return [...counts].map(([type,count])=>({type,_count:{_all:count}}));
}
