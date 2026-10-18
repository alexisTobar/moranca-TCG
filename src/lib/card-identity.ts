import { Prisma } from "@prisma/client";

/** Provider IDs distinguish printings. Manual cards match only name + edition + number. */
export const CARD_IDENTITY_SQL = Prisma.sql`COALESCE(NULLIF(l."externalId", ''),
  'manual:' || md5(jsonb_build_array(lower(trim(l.title)), lower(trim(COALESCE(l."setName", ''))), lower(trim(COALESCE(l."cardNumber", ''))))::text))`;

export function cardMarketHref(game: string, identity: string) {
  return `/carta/${encodeURIComponent(game)}/${encodeURIComponent(identity)}`;
}

export function effectivePrice(price: number, offer: number | null) {
  return offer !== null && offer < price ? offer : price;
}
