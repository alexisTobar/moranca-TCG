import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin, ShieldCheck, Truck, Wallet } from "lucide-react";
import { GAME_LIST } from "@/lib/games";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { HomeShowcase } from "@/components/HomeShowcase";
import { CampaignMotion } from "@/components/CampaignMotion";
import { GameBrand } from "@/components/GameBrand";
import { StoreShowcase } from "@/components/store/StoreShowcase";
import { FaqList, faqJsonLd, type FaqItem } from "@/components/FaqList";
import { JsonLd } from "@/components/JsonLd";
import { NewsImage } from "@/components/news/NewsImage";
import type { NewsRow } from "@/lib/news/query";
import { CHILE_AGENDA } from "@/lib/news/sources";
import { newsCategoryLabel } from "@/lib/news/category";
import { SITE_NAME, siteUrl } from "@/lib/seo";

export interface HomeLandingProps {
  latest:ListingCardData[]; byGame:ListingCardData[][]; news:NewsRow[]; unavailable:boolean; paymentWindowHours:number;
  sellers:Array<{id:string;name:string;slug:string;city:string|null;_count:{listings:number}}>;
}

const CATEGORIES=[
  {title:"Cartas individuales",description:"Busca la carta que te falta y compara ofertas de distintos vendedores.",href:"/cartas",short:"Cartas"},
  {title:"Productos sellados",description:"Sobres, cajas y mazos de fábrica sin abrir, tal como vienen de origen.",href:"/cartas?type=SEALED",short:"Sellados"},
  {title:"Mazos armados",description:"Decks construidos por vendedores, con su lista de cartas y cantidades.",href:"/cartas?type=DECK",short:"Mazos"},
  {title:"Accesorios",description:"Protectores, portamazos, tapetes y carpetas para cuidar tu colección.",href:"/cartas?type=ACCESSORY",short:"Accesorios"},
];
const STEPS=[
  {title:"Encuentra y compara",body:"Revisa precio, estado, idioma, fotos y vendedor antes de agregar un producto al carrito."},
  {title:"Confirma tu pedido",body:"El stock se reserva al comprar. Recibes los datos del vendedor y la referencia de tu orden para realizar el pago."},
  {title:"Coordina la entrega",body:"Sube el comprobante y sigue tu pedido. Elige envío o retiro según las opciones del vendedor."},
];

export function HomeLanding({latest,byGame,sellers,news,paymentWindowHours,unavailable}:HomeLandingProps){
  const faqs:FaqItem[]=[
    {q:"¿Qué es TCG Cardeck?",a:"TCG Cardeck es un marketplace chileno de cartas coleccionables. Reúne publicaciones de tiendas y vendedores de Pokémon TCG, One Piece Card Game, Magic: The Gathering y Mitos y Leyendas, además de accesorios."},
    {q:"¿Cuál es la diferencia entre Sellados y Mazos?",a:"Sellados reúne productos de fábrica sin abrir, incluidos mazos preconstruidos. En Mazos, cada vendedor construye un deck, agrega su lista de cartas y cantidades y publica el conjunto para venderlo."},
    {q:"¿Cómo pago mi compra?",a:`El pago se realiza directamente al vendedor. Al confirmar la orden, el stock queda reservado por ${paymentWindowHours} horas. Para una transferencia, usa la referencia de tu pedido y adjunta el comprobante privado. Revisa las opciones de pago y entrega antes de comprar.`},
    {q:"¿Puedo comprar a una tienda de mi región?",a:"Sí. El directorio permite explorar tiendas y vendedores por región y comuna. Revisa en cada perfil si ofrece envío, retiro o ambas opciones."},
    {q:"¿Cómo publico mis cartas o un mazo?",a:"Crea una cuenta y solicita acceso de vendedor. Desde tu panel puedes buscar cartas en el catálogo, agregar fotos propias, fijar precio y stock o construir un mazo con sus cartas y cantidades para venderlo completo."},
  ];
  const base=siteUrl();
  return <div className="cardeck-home">
    <JsonLd data={[
      {"@context":"https://schema.org","@type":"Organization","@id":`${base}/#organization`,name:SITE_NAME,url:base,logo:`${base}/tcg-cardeck-logo.png`,description:"Marketplace chileno de cartas coleccionables, mazos y accesorios TCG.",areaServed:{"@type":"Country",name:"Chile"}},
      {"@context":"https://schema.org","@type":"WebSite","@id":`${base}/#website`,name:SITE_NAME,url:base,inLanguage:"es-CL",publisher:{"@id":`${base}/#organization`},potentialAction:{"@type":"SearchAction",target:{"@type":"EntryPoint",urlTemplate:`${base}/cartas?q={search_term_string}`},"query-input":"required name=search_term_string"}},
      ...(latest.some(item=>item.stock>0)?[{"@context":"https://schema.org","@type":"ItemList",name:"Recién publicados en TCG Cardeck",itemListElement:latest.filter(item=>item.stock>0).slice(0,10).map((item,index)=>({"@type":"ListItem",position:index+1,item:{"@type":"Product",name:item.title,...(item.imageUrl?.startsWith("https://")?{image:item.imageUrl}:{}),url:`${base}/producto/${item.slug}`,offers:{"@type":"Offer",priceCurrency:"CLP",price:item.offerPrice!=null&&item.offerPrice<item.price?item.offerPrice:item.price,availability:"https://schema.org/InStock",itemCondition:item.condition==="NEW"?"https://schema.org/NewCondition":"https://schema.org/UsedCondition"}}}))}]:[]),
      {"@context":"https://schema.org","@type":"CollectionPage",name:"Cartas y productos TCG en Chile",url:base,inLanguage:"es-CL",isPartOf:{"@id":`${base}/#website`},about:GAME_LIST.map(game=>({"@type":"Thing",name:game.name})),mainEntity:{"@type":"ItemList",itemListElement:CATEGORIES.map((category,index)=>({"@type":"ListItem",position:index+1,name:category.title,url:`${base}${category.href}`}))}},
      faqJsonLd(faqs),
    ]}/>
    <section className="cardeck-campaign max-w-7xl" aria-labelledby="home-title">
      <CampaignMotion>
        <Image src="/cardeck-tabletop.webp" alt="" fill priority sizes="(max-width:1440px) 100vw, 1440px" className="cardeck-campaign-art"/>
        <div className="cardeck-campaign-shade"/>
        <div className="cardeck-campaign-copy">
          <h1 id="home-title">Tu próxima jugada<br/>empieza aquí.</h1>
          <p>Compra, vende y colecciona cartas TCG en Chile.<br className="hidden sm:block"/> Encuentra tu juego, tu vendedor y las cartas que te faltan.</p>
          <div><Link href="/cartas" className="btn btn-gold btn-lg">Explorar cartas <ArrowRight size={18}/></Link><Link href="/explorar" className="campaign-stores-link">Conocer las tiendas</Link></div>
        </div>
      </CampaignMotion>
      <nav className="cardeck-category-index" aria-label="Qué puedes comprar en TCG Cardeck">
        {CATEGORIES.map(category=><Link key={category.href} href={category.href}><strong>{category.title}<ArrowRight size={17} aria-hidden="true"/></strong><span>{category.description}</span></Link>)}
      </nav>
    </section>

    <section className="cardeck-games max-w-7xl" aria-labelledby="games-title">
      <div><h2 id="games-title">Cada juego, su comunidad.</h2><p>Encuentra singles de tu TCG favorito.</p></div>
      <nav aria-label="Catálogo por juego">{GAME_LIST.map(game=><Link key={game.id} href={`/cartas?game=${game.id}`}>
        <GameBrand game={game.id} decorative/><span>{game.short}</span>
      </Link>)}</nav>
    </section>

    <HomeShowcase items={latest} unavailable={unavailable}/>
    <div className="cardeck-buying-strip max-w-7xl"><span><ShieldCheck size={19}/> Reserva de stock al comprar</span><span><Wallet size={19}/> Pago directo al vendedor</span><span><Truck size={19}/> Envío o retiro según el perfil</span></div>

    {byGame.some(items=>items.length>0)&&<section className="cardeck-game-collections max-w-7xl" aria-labelledby="collections-title">
      <header className="cardeck-section-heading"><div><h2 id="collections-title">De la colección a tu próximo mazo</h2><p>Cartas disponibles para jugar, completar tu lista o coleccionar.</p></div><Link href="/cartas">Ver el catálogo <ArrowRight size={17}/></Link></header>
      <div className="cardeck-collection-grid">{GAME_LIST.map((game,index)=>byGame[index].length>0&&<section key={game.id} className="cardeck-collection" aria-label={`Cartas ${game.name}`}>
        <header><h3>{game.name}</h3><Link href={`/cartas?game=${game.id}`}>Ver cartas <ArrowRight size={16}/></Link></header>
        <div>{byGame[index].map(listing=><ListingCard key={listing.id} listing={listing}/>)}</div>
      </section>)}</div>
    </section>}

    <section className="cardeck-news max-w-7xl" aria-labelledby="news-title">
      <header className="cardeck-section-heading"><div><h2 id="news-title">Lo que pasa dentro y fuera de la mesa</h2><p>Torneos en Chile, noticias y lanzamientos. Pokémon y One Piece al frente.</p></div><Link href="/noticias">Noticias y torneos <ArrowRight size={17}/></Link></header>
      {news.length>0?<div className="cardeck-news-grid">{news.slice(0,3).map(item=><article key={item.id}><Link href={item.sourceUrl??`/noticias/${item.id}`}>
        <div className="cardeck-news-art">{item.eventAt&&!item.imageUrl?<div className="cardeck-event-art"><time dateTime={item.eventAt.toISOString()}><strong>{item.eventAt.toLocaleDateString("es-CL",{day:"numeric",timeZone:"America/Santiago"})}</strong><span>{item.eventAt.toLocaleDateString("es-CL",{month:"long",timeZone:"America/Santiago"})}</span></time><span>{item.country==="CL"?"Torneo en Chile":"Próximo torneo"}</span></div>:<NewsImage src={item.imageUrl} title={item.title} category={item.category} kind={item.kind}/>}</div>
        <div className="cardeck-news-copy"><span>{item.country==="CL"?"Torneos en Chile":newsCategoryLabel(item.category)}</span><h3>{item.title}</h3><p>{item.excerpt}</p><small>{item.sourceName} · {item.eventAt?"Evento: ":""}{(item.eventAt??item.publishedAt).toLocaleDateString("es-CL",{timeZone:"America/Santiago"})}</small></div>
      </Link></article>)}</div>:<p className="cardeck-news-status" role="status">Estamos actualizando las noticias. Mientras tanto, consulta las fechas e inscripciones directamente con los organizadores.</p>}
      <div className="cardeck-agenda"><h3>Consulta la agenda oficial</h3><div>{CHILE_AGENDA.map(source=><a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer"><strong>{source.name}</strong><span>{source.text}</span><ArrowRight size={17} aria-hidden="true"/></a>)}</div><p>La selección de noticias se actualiza cada 3 días. Confirma las fechas y cupos con cada organizador.</p></div>
    </section>

    <section className="cardeck-community" aria-labelledby="community-title"><div className="max-w-7xl">
      <header className="cardeck-section-heading"><div><h2 id="community-title">Detrás de cada carta hay un vendedor.</h2><p>Conoce su catálogo, dónde está y cómo entrega. Compra con contexto.</p></div><Link href="/explorar">Explorar por región <MapPin size={17}/></Link></header>
      {sellers.length>0?<div className="cardeck-seller-list">{sellers.map(person=><Link key={person.id} href={`/vendedor/${person.slug}`}><span className="cardeck-seller-initial" aria-hidden="true">{person.name.charAt(0)}</span><div><h3>{person.name}</h3><p>{person.city??"Vendedor en Chile"} · {person._count.listings} publicaciones con stock</p></div><ArrowRight size={19}/></Link>)}</div>:<p className="cardeck-community-note">Usa el directorio para encontrar perfiles por región y comuna, y revisar las opciones de envío o retiro.</p>}
      <div className="cardeck-community-links"><Link href="/explorar">Buscar tiendas y vendedores</Link><Link href="/tiendas">Conoce cómo abrir tu tienda</Link></div>
    </div></section>
    <StoreShowcase/>

    <section className="cardeck-deck-builder max-w-7xl" aria-labelledby="deck-builder-title"><div><h2 id="deck-builder-title">Lo armas tú.<br/>Lo juega alguien más.</h2><p>Tu lista merece salir del cuaderno. Construye tu deck con cartas del catálogo, indica las copias y publícalo como un mazo completo desde tu perfil de vendedor.</p><Link href="/panel/publicar?type=DECK" className="btn btn-gold">Construir y vender un mazo <ArrowRight size={18}/></Link></div><ol><li><strong>Busca tus cartas</strong><span>Elige el juego y agrega cada carta a la lista.</span></li><li><strong>Ajusta las cantidades</strong><span>Revisa las copias, fotos, descripción y precio del conjunto.</span></li><li><strong>Publica el deck completo</strong><span>Los compradores podrán consultar su composición antes de comprar.</span></li></ol></section>

    <section className="cardeck-how max-w-7xl" aria-labelledby="how-title"><header className="cardeck-section-heading"><div><h2 id="how-title">De encontrarla a tenerla en tus manos</h2><p>Así funciona una compra en TCG Cardeck.</p></div><Link href="/ayuda">Guía para comprar <ArrowRight size={17}/></Link></header><ol>{STEPS.map((step,index)=><li key={step.title}><span>{index+1}</span><h3>{step.title}</h3><p>{step.body}</p></li>)}</ol></section>

    <section className="cardeck-about max-w-7xl" aria-labelledby="about-title"><h2 id="about-title">Tu marketplace de cartas TCG en Chile</h2><div><p>En TCG Cardeck puedes encontrar <Link href="/cartas?game=pokemon">cartas Pokémon</Link>, <Link href="/cartas?game=onepiece">singles de One Piece</Link>, <Link href="/cartas?game=magic">Magic: The Gathering</Link> y <Link href="/cartas?game=myl">Mitos y Leyendas</Link>. Cada publicación pertenece a un vendedor: revisa el estado, idioma, fotos, stock y opciones de entrega antes de elegir.</p><p>Además de cartas individuales, explora <Link href="/cartas?type=SEALED">productos sellados</Link>, <Link href="/cartas?type=DECK">mazos construidos por la comunidad</Link> y <Link href="/cartas?type=ACCESSORY">accesorios para tu colección</Link>. Si vendes, puedes publicar desde tu perfil y conocer las opciones de <Link href="/tiendas">tienda con tu propia marca</Link>.</p></div></section>
    <section className="cardeck-faq max-w-7xl" aria-labelledby="faq-title"><h2 id="faq-title">Antes de tu próxima jugada</h2><FaqList items={faqs}/></section>
  </div>;
}
