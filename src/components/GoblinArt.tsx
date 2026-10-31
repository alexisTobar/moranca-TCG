import type { SVGProps } from "react";

/** Duende de TCG Cardeck de cuerpo completo, dibujado en vectores. Generado con scripts/svg-to-jsx.mjs desde public/goblin-full.svg. */
export function GoblinArt(props: SVGProps<SVGSVGElement>) {
  return (
    <svg role="img" aria-label="El duende de TCG Cardeck" {...props} viewBox="-24 0 348 400" fill="none" strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx="150" cy="392" rx="82" ry="9" fill="#000" opacity=".28"/>
    
      {/*  piernas y botas  */}
      <g stroke="#17110d" strokeWidth="5">
        <path d="M120 282 L117 356 L146 356 L148 282 Z" fill="#6b4a2f"/>
        <path d="M154 282 L154 356 L183 356 L180 282 Z" fill="#6b4a2f"/>
        <path d="M113 352 Q97 356 83 372 Q81 384 97 385 L147 385 Q151 364 147 352 Z" fill="#3b2a1d"/>
        <path d="M187 352 Q203 356 217 372 Q219 384 203 385 L153 385 Q149 364 153 352 Z" fill="#3b2a1d"/>
      </g>
    
      {/*  brazo izquierdo con carta  */}
      <g className="gob-card-arm">
        <path d="M112 186 Q86 214 78 256" stroke="#17110d" strokeWidth="27"/>
        <path d="M112 186 Q86 214 78 256" stroke="#6fae3c" strokeWidth="17"/>
        <g transform="rotate(-14 62 262)">
          <rect x="32" y="206" width="64" height="90" rx="7" fill="#f1e2bd" stroke="#17110d" strokeWidth="5"/>
          <rect x="40" y="214" width="48" height="52" rx="4" fill="#8b5fbf" stroke="#17110d" strokeWidth="3"/>
          <path d="M64 224 L69 237 L83 238 L72 247 L76 260 L64 252 L52 260 L56 247 L45 238 L59 237 Z" fill="#f4c35b" stroke="#17110d" strokeWidth="2"/>
          <rect x="40" y="272" width="30" height="5" rx="2" fill="#a08a5d"/>
          <rect x="40" y="281" width="20" height="5" rx="2" fill="#a08a5d"/>
        </g>
        <circle cx="80" cy="262" r="12" fill="#6fae3c" stroke="#17110d" strokeWidth="5"/>
        <path d="M76 255 Q84 252 90 258" stroke="#17110d" strokeWidth="3"/>
      </g>
    
      {/*  torso: túnica, chaleco y cinturón  */}
      <g stroke="#17110d" strokeWidth="5">
        <path d="M104 168 Q150 152 196 168 L194 288 Q150 298 106 288 Z" fill="#a0653f"/>
        <path d="M104 168 L132 172 L138 286 L106 288 Z" fill="#2b3441"/>
        <path d="M196 168 L168 172 L162 286 L194 288 Z" fill="#2b3441"/>
        <rect x="104" y="268" width="92" height="16" rx="3" fill="#5a3a22"/>
        <rect x="140" y="266" width="20" height="20" rx="3" fill="#f4c35b"/>
        <path d="M146 276 h8" strokeWidth="3"/>
      </g>
    
      {/*  brazo derecho saludando  */}
      <g className="gob-arm" style={{ transformOrigin: "196px 188px" }}>
        <path d="M196 188 Q250 196 262 150" stroke="#17110d" strokeWidth="27"/>
        <path d="M196 188 Q250 196 262 150" stroke="#6fae3c" strokeWidth="17"/>
        <g stroke="#17110d" strokeWidth="4">
          <ellipse cx="250" cy="114" rx="6" ry="13" fill="#6fae3c" transform="rotate(-22 250 114)"/>
          <ellipse cx="264" cy="108" rx="6" ry="14" fill="#6fae3c"/>
          <ellipse cx="278" cy="114" rx="6" ry="13" fill="#6fae3c" transform="rotate(22 278 114)"/>
          <ellipse cx="286" cy="134" rx="5.5" ry="10" fill="#6fae3c" transform="rotate(58 286 134)"/>
          <circle cx="266" cy="140" r="17" fill="#6fae3c" strokeWidth="5"/>
        </g>
        <circle cx="266" cy="141" r="12" fill="#6fae3c"/>
      </g>
    
      {/*  cabeza  */}
      <g transform="translate(150 176) scale(1.16) translate(-150 -168)"><g className="gob-head" style={{ transformOrigin: "150px 168px" }}>
        {/*  orejas  */}
        <g stroke="#17110d" strokeWidth="5">
          <path d="M96 112 Q60 96 20 78 Q44 116 100 142 Z" fill="#6fae3c"/>
          <path d="M204 112 Q240 96 280 78 Q256 116 200 142 Z" fill="#6fae3c"/>
        </g>
        <path d="M90 112 Q64 104 42 94" stroke="#4d8a28" strokeWidth="3"/>
        <path d="M210 112 Q236 104 258 94" stroke="#4d8a28" strokeWidth="3"/>
        {/*  cara  */}
        <ellipse cx="150" cy="118" rx="62" ry="54" fill="#6fae3c" stroke="#17110d" strokeWidth="5"/>
        
        {/*  cejas  */}
        <path d="M110 90 Q127 94 138 104" stroke="#17110d" strokeWidth="7"/>
        <path d="M190 90 Q173 94 162 104" stroke="#17110d" strokeWidth="7"/>
        {/*  ojos  */}
        <g className="gob-eye" style={{ transformOrigin: "128px 112px" }}>
          <ellipse cx="128" cy="112" rx="15" ry="13" fill="#fff" stroke="#17110d" strokeWidth="4"/>
          <circle cx="131" cy="114" r="6" fill="#17110d"/><circle cx="133" cy="111" r="2" fill="#fff"/>
        </g>
        <g className="gob-eye" style={{ transformOrigin: "172px 112px" }}>
          <ellipse cx="172" cy="112" rx="15" ry="13" fill="#fff" stroke="#17110d" strokeWidth="4"/>
          <circle cx="175" cy="114" r="6" fill="#17110d"/><circle cx="177" cy="111" r="2" fill="#fff"/>
        </g>
        {/*  nariz  */}
        <path d="M143 126 Q150 142 160 134 Q156 126 150 120" fill="#5a9a30" stroke="#17110d" strokeWidth="4"/>
        {/*  sonrisa  */}
        <path d="M110 142 Q150 188 190 142 Q150 152 110 142 Z" fill="#7a1d1d" stroke="#17110d" strokeWidth="5"/>
        <path d="M117 146 L124 160 L132 150 L141 164 L150 152 L159 164 L168 150 L176 160 L183 146 Q150 154 117 146 Z" fill="#fff" stroke="#17110d" strokeWidth="2.5"/>
        {/*  sombrero de paja  */}
        <g stroke="#17110d" strokeWidth="5">
          <path d="M96 78 Q100 24 150 20 Q200 24 204 78 Z" fill="#e8b64a"/>
          <path d="M97 70 Q150 82 203 70 L204 82 Q150 96 96 82 Z" fill="#c23a2b"/>
          <ellipse cx="150" cy="82" rx="86" ry="21" fill="none"/>
          <path d="M64 84 Q70 62 150 60 Q230 62 236 84 Q234 104 150 106 Q66 104 64 84 Z" fill="#f0c25a"/>
          <path d="M98 76 Q150 90 202 76 L204 88 Q150 102 96 88 Z" fill="#c23a2b"/>
        </g>
        <g stroke="#b88a2e" strokeWidth="2.5" opacity=".8">
          <path d="M80 82 Q120 96 150 96"/><path d="M220 82 Q180 96 150 96"/>
          <path d="M112 36 Q150 30 188 36"/><path d="M104 50 Q150 42 196 50"/>
        </g>
      </g></g>
    </svg>
  );
}
