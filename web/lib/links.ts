/**
 * Outbound links. Anything left empty is simply not rendered, so the live site never
 * shows a dead placeholder. Fill these in as they exist.
 */
type Links = { x: string; website: string };

export const LINKS: Links = {
  x: 'https://x.com/VaultTubeClubz',
  website: 'vaulttube.fun',
};

const bare = (u: string) => u.replace(/^https?:\/\//, '');

export function footerLinks(): { label: string; href: string }[] {
  const out: { label: string; href: string }[] = [];
  if (LINKS.website) out.push({ label: bare(LINKS.website), href: `https://${bare(LINKS.website)}` });
  if (LINKS.x) out.push({ label: 'X', href: LINKS.x });
  return out;
}
