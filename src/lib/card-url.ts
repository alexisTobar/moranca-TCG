/** Dirección de la página de una carta con todos sus vendedores. */
export function cardHref(game: string, externalId: string): string {
  return `/carta/${game}/${encodeURIComponent(externalId)}`;
}
