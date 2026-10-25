import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
export const runtime="nodejs";
export const alt="TCG Cardeck — Cartas, mazos y tiendas de Chile";
export const size={width:1200,height:630};
export const contentType="image/png";
export default async function OgImage(){
 const data=await readFile(join(process.cwd(),"public/tcg-cardeck-logo.png"));
 return new ImageResponse(<div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#080b16",color:"#fff",padding:48}}><div style={{display:"flex",position:"relative",width:470,height:330,overflow:"hidden"}}><img alt="" src={`data:image/png;base64,${data.toString("base64")}`} width={537} height={537} style={{position:"absolute",left:-39,top:-104}}/></div><div style={{fontSize:52,fontWeight:700,marginTop:24}}>Cartas, mazos, sellados y accesorios</div><div style={{fontSize:28,color:"#f4c35b",marginTop:18}}>Tiendas y vendedores de Chile</div></div>,size);
}
