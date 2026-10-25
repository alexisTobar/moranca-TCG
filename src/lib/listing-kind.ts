import type { ListingType, Prisma } from "@prisma/client";

/** The seller's selected category is authoritative; names never change it. */
export function publicListingType(type: string, _title?: string): ListingType {
  return type as ListingType;
}

export function listingTypeWhere(type: string): Prisma.ListingWhereInput {
  return {type:type as ListingType};
}

export function publicListingTypeCounts(rows:Array<{type:string;title:string}>) {
  const counts=new Map<string,number>();
  for(const row of rows){const type=publicListingType(row.type,row.title);counts.set(type,(counts.get(type)??0)+1);}
  return [...counts].map(([type,count])=>({type,_count:{_all:count}}));
}
