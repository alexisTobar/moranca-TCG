import "server-only";
import { prisma } from "./db";
import { isStoreActive } from "./store";
import { sellerRegion } from "./location";

export async function getStoreDirectory() {
  try {
    const [sellers, inventory] = await Promise.all([
      prisma.user.findMany({where:{active:true,role:{in:["SELLER","ADMIN"]}},select:{id:true,name:true,slug:true,city:true,region:true,avatarUrl:true,offersShipping:true,offersPickup:true,store:{select:{status:true,planId:true,activeUntil:true,displayName:true,logoUrl:true}}},orderBy:{name:"asc"}}),
      prisma.listing.groupBy({by:["sellerId","game"],where:{status:"ACTIVE",stock:{gt:0}},_sum:{stock:true},_count:{_all:true}}),
    ]);
    const inventoryBySeller=new Map<string,typeof inventory>();
    for (const item of inventory) { const group=inventoryBySeller.get(item.sellerId)??[];group.push(item);inventoryBySeller.set(item.sellerId,group); }
    const rows=sellers.map(s=>({id:s.id,name:isStoreActive(s.store)?s.store?.displayName||s.name:s.name,slug:s.slug,city:s.city,region:sellerRegion(s),image:isStoreActive(s.store)?s.store?.logoUrl||s.avatarUrl:s.avatarUrl,store:isStoreActive(s.store),shipping:s.offersShipping,pickup:s.offersPickup,games:(inventoryBySeller.get(s.id)??[]).map(i=>({game:i.game,stock:i._sum.stock||0,listings:i._count._all}))})).filter(s=>s.store||s.games.length>0);
    return {rows,unavailable:false};
  } catch {return {rows:[],unavailable:true};}
}
