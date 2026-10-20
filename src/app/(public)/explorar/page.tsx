import type { Metadata } from "next";
import { getStoreDirectory } from "@/lib/store-directory";
import { StoreDirectory } from "@/components/store/StoreDirectory";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Tiendas TCG por región y comuna de Chile",description:"Encuentra tiendas y vendedores de cartas TCG cerca de ti. Filtra por región, comuna y juego, compara disponibilidad y visita sus publicaciones.",alternates:{canonical:"/explorar"}};
export default async function ExplorePage({searchParams}:{searchParams:Promise<{region?:string}>}) {
  const [{rows,unavailable},params]=await Promise.all([getStoreDirectory(),searchParams]);
  return <div className="directory-page mx-auto max-w-7xl"><header><h1>Tu próxima tienda está más cerca.</h1><p>Explora Chile, encuentra tu comunidad y descubre dónde conseguir tus cartas.</p></header><StoreDirectory sellers={rows} unavailable={unavailable} initialRegion={params.region}/></div>;
}
