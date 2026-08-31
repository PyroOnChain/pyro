/**
 * Outbound links. Anything left empty is simply not rendered, so the live site never
 * shows a dead placeholder. Fill these in as they exist.
 */
type Links = { github: string; docs: string; x: string; website: string };

export const LINKS: Links = {
  github: 'https://github.com/PyroOnChain/pyro',
  docs: 'https://github.com/PyroOnChain/pyro#readme',
  x: '',        // e.g. 'https://x.com/yourhandle'
  website: '',  // e.g. 'pyro.xyz'
};

const bare = (u: string) => u.replace(/^https?:\/\//, '');

export function footerLinks(): { label: string; href: string }[] {
  const out: { label: string; href: string }[] = [];
  if (LINKS.website) out.push({ label: bare(LINKS.website), href: `https://${bare(LINKS.website)}` });
  if (LINKS.x) out.push({ label: 'X', href: LINKS.x });
  if (LINKS.docs) out.push({ label: 'Docs', href: LINKS.docs });
  if (LINKS.github) out.push({ label: 'GitHub', href: LINKS.github });
  return out;
}
