/**
 * Outbound links. Anything left empty simply is not rendered, so the live site
 * never shows a dead placeholder. Fill these in as they exist.
 */
type Links = { x: string; handle: string; website: string };

export const LINKS: Links = {
  x: 'https://x.com/StockWarsRH',
  handle: '@StockWarsRH',
  website: 'stockswars.com',
};
