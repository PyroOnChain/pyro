/**
 * Outbound links. Anything left empty simply is not rendered, so the live site
 * never shows a dead placeholder. Fill these in as they exist.
 *
 * Cleared at the Brawlz rebrand: the old handle and domain belonged to Stock
 * Wars, and a site called Brawlz linking to @StockWarsRH reads as a mistake.
 */
type Links = { x: string; handle: string; website: string };

export const LINKS: Links = {
  x: '',
  handle: '',
  website: 'brawlzz.com',
};
