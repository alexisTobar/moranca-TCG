import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
export const runtime="nodejs";
export const size={width:64,height:64};
export const contentType="image/png";
export default async function Icon(){
 const data=await readFile(join(process.cwd(),"public/tcg-cardeck-logo.png"));
 return new ImageResponse(<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:"#080b16",borderRadius:12}}><div style={{display:"flex",position:"relative",width:60,height:42,overflow:"hidden"}}><img alt="" src={`data:image/png;base64,${data.toString("base64")}`} width={69} height={69} style={{position:"absolute",left:-5,top:-13}}/></div></div>,size);
}
