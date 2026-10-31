// Convierte public/goblin-full.svg en el componente React src/components/GoblinArt.tsx (SVG en línea, con partes animables).
// Uso: node scripts/svg-to-jsx.mjs
import fs from "node:fs";

const svg = fs.readFileSync("public/goblin-full.svg", "utf8")
  .replace(/<\?xml[^>]*>/, "")
  .replace(/<!--(.*?)-->/g, "{/* $1 */}")
  .replace(/viewBox="0 0 300 400"/, 'viewBox="-24 0 348 400"')
  .replace(/\sxmlns="[^"]*"/, "");

const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
let out = svg
  // style="a:b;c:d" -> style={{ a: "b", c: "d" }}
  .replace(/style="([^"]*)"/g, (_, css) => {
    const props = css.split(";").filter(Boolean).map((d) => {
      const [k, ...v] = d.split(":");
      return `${camel(k.trim())}: "${v.join(":").trim()}"`;
    });
    return `style={{ ${props.join(", ")} }}`;
  })
  // atributos con guion (stroke-width...) -> camelCase
  .replace(/\s([a-z]+(?:-[a-z]+)+)=/g, (_, a) => ` ${camel(a)}=`)
  // ids de las partes que se animan -> clases
  .replace(/\sid="arm-wave"/, ' className="gob-arm"')
  .replace(/\sid="arm-card"/, ' className="gob-card-arm"')
  .replace(/\sid="head"/, ' className="gob-head"')
  .replace(/\sid="eye-l"/, ' className="gob-eye"')
  .replace(/\sid="eye-r"/, ' className="gob-eye"');

out = out.replace("<svg", '<svg role="img" aria-label="El duende de TCG Cardeck" {...props}');

const file = `import type { SVGProps } from "react";

/** Duende de TCG Cardeck de cuerpo completo, dibujado en vectores. Generado con scripts/svg-to-jsx.mjs desde public/goblin-full.svg. */
export function GoblinArt(props: SVGProps<SVGSVGElement>) {
  return (
    ${out.trim().replace(/\n/g, "\n    ")}
  );
}
`;
fs.writeFileSync("src/components/GoblinArt.tsx", file);
console.log("GoblinArt.tsx generado:", file.length, "caracteres");
