/**
 * Filtro de groserías para el chat comprador-vendedor. Bloquea el envío en
 * vez de censurar: es más simple y no deja dudas sobre qué vio la otra
 * persona. Lista base en español/chilenismos — se puede ampliar acá mismo.
 */
const ROOTS = [
  "puta",
  "puto",
  "put[ae]",
  "mierda",
  "pendej",
  "cabron",
  "cabr[oó]n",
  "gilipollas",
  "verga",
  "concha ?tu ?madre",
  "conchetumadre",
  "culiao",
  "culiado",
  "culia",
  "maric[oó]n",
  "marica",
  "weon de mierda",
  "hijo de puta",
  "hijueputa",
  "malparido",
  "imbecil",
  "imb[eé]cil",
  "tarado",
  "estupido de mierda",
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[@]/g, "a")
    .replace(/[04]/g, "o")
    .replace(/[1!]/g, "i")
    .replace(/[3]/g, "e")
    .replace(/[$5]/g, "s")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const PATTERN = new RegExp(`\\b(${ROOTS.join("|")})\\w*`, "i");

/** true si el texto contiene groserías o lenguaje ofensivo conocido. */
export function containsProfanity(text: string): boolean {
  return PATTERN.test(normalize(text));
}
