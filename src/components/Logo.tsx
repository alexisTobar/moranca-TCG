import Image from "next/image";

/** User-supplied TCG Cardeck artwork, with transparent margins excluded by the viewport. */
export function Logo({variant="full",height,tone="dark"}:{variant?:"mark"|"full";height?:number;tone?:"dark"|"light"}) {
  const h=height??(variant==="full"?96:44);
  const width=h*1752/1226;
  const imageSize=h*2000/1226;
  return <span className="cardeck-logo" style={{display:"inline-block",position:"relative",overflow:"hidden",height:h,width,verticalAlign:"middle",flexShrink:0}}>
    <Image src="/tcg-cardeck-logo.png" alt="TCG Cardeck" width={2000} height={2000} sizes={`${Math.ceil(imageSize)}px`} priority style={{position:"absolute",height:imageSize,width:imageSize,maxWidth:"none",top:-h*390/1226,left:-h*147/1226}}/>
  </span>;
}
