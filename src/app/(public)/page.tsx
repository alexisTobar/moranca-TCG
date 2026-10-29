import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { GAME_LIST } from "@/lib/games";
import { LISTING_CARD_SELECT, safeQuery } from "@/lib/catalog";
import { getCachedSiteSettings } from "@/lib/site-settings";
import type { ListingCardData } from "@/components/ListingCard";
import { HomeLanding } from "@/components/HomeLanding";
import { homeNews } from "@/lib/news/query";
import { SITE_NAME } from "@/lib/seo";
import { homeCardMarket } from "@/lib/catalog-market";

export const revalidate = 60;
export const metadata: Metadata = {
  title: {absolute:"TCG Cardeck | Cartas, mazos y accesorios TCG en Chile"},
  description:"Compra y vende cartas Pokémon, One Piece, Magic y Mitos y Leyendas en Chile. Compara vendedores, descubre sellados y accesorios, arma tu mazo y encuentra tiendas por región.",
  alternates:{canonical:"/"},
  openGraph:{type:"website",locale:"es_CL",siteName:SITE_NAME,title:"TCG Cardeck | Tu comunidad de cartas TCG en Chile",description:"Cartas, sellados, mazos armados y accesorios. Explora productos, tiendas y torneos de Chile.",url:"/",images:[{url:"/opengraph-image",width:1200,height:630,alt:"TCG Cardeck, marketplace de cartas coleccionables en Chile"}]},
  twitter:{card:"summary_large_image",title:"TCG Cardeck | Cartas TCG en Chile",description:"Encuentra cartas, compara vendedores y construye tu próximo mazo."},
};

export default async function HomePage(){
  const seller:Prisma.UserWhereInput={active:true,role:{in:["SELLER","ADMIN"]}};
  const active:Prisma.ListingWhereInput={status:"ACTIVE",stock:{gt:0},seller};
  let unavailable=false;
  const [cards,otherProducts,sellers,news,settings]=await Promise.all([
    homeCardMarket().catch(()=>{unavailable=true;return [] as ListingCardData[];}),
    Promise.all((["SEALED","DECK","ACCESSORY"] as const).map(type=>prisma.listing.findMany({where:{...active,type},select:LISTING_CARD_SELECT,orderBy:[{featured:"desc"},{createdAt:"desc"}],take:6}).catch(()=>{unavailable=true;return [] as ListingCardData[];}))).then(groups=>groups.flat()),
    safeQuery(()=>prisma.user.findMany({where:{...seller,listings:{some:{status:"ACTIVE",stock:{gt:0}}}},select:{id:true,name:true,slug:true,city:true,_count:{select:{listings:{where:{status:"ACTIVE",stock:{gt:0}}}}}},orderBy:{name:"asc"},take:4}),[]),
    homeNews().catch(()=>[]),getCachedSiteSettings(),
  ]);
  const latest=[...cards.slice(0,6),...otherProducts];
  const byGame=GAME_LIST.map(game=>cards.filter(card=>card.game===game.id).slice(0,4));
  return <HomeLanding latest={latest} byGame={byGame} sellers={sellers} news={news} unavailable={unavailable} paymentWindowHours={settings.paymentWindowHours}/>;
}
