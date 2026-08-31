/**
 * Outbound links. Anything left empty is simply not rendered, so the live site never
 * shows a dead placeholder. Fill these in as they exist.
 */
type Links = { github: string; docs: string; x: string; website: string; token: string };

export const LINKS: Links = {
  github: 'https://github.com/PyroOnChain/pyro',
  docs: 'https://github.com/PyroOnChain/pyro#readme',
  x: 'https://x.com/PyroClubz',
  website: 'pyroclubz.com',
  token: '0x6273CCD6187ec2C0100F37ad71775aE0Ac7E2D3E',
};

/** Pyro Clubz ($PYRO), the project's own coin. */
export const PYRO_TOKEN = LINKS.token;

const bare = (u: string) => u.replace(/^https?:\/\//, '');

export function footerLinks(): { label: string; href: string }[] {
  const out: { label: string; href: string }[] = [];
  if (LINKS.website) out.push({ label: bare(LINKS.website), href: `https://${bare(LINKS.website)}` });
  if (LINKS.x) out.push({ label: 'X', href: LINKS.x });
  if (LINKS.docs) out.push({ label: 'Docs', href: LINKS.docs });
  if (LINKS.github) out.push({ label: 'GitHub', href: LINKS.github });
  if (LINKS.token) out.push({ label: '$PYRO', href: `https://www.ponsfamily.com/launchpad/${LINKS.token}` });
  return out;
}
