export function NotDeployed() {
  return (
    <div className="shell" style={{ padding: '80px 40px' }}>
      <div className="slab-lg card" style={{ padding: '40px 38px', maxWidth: 700 }}>
        <div className="label" style={{ marginBottom: 14 }}>NOT DEPLOYED YET</div>
        <h1 className="display" style={{ fontSize: 30, margin: '0 0 16px' }}>No factory address configured.</h1>
        <p style={{ fontSize: 15.5, lineHeight: 1.65, color: 'var(--muted)', margin: '0 0 20px' }}>
          The contracts are written and tested but the factory has not been deployed to Robinhood Chain yet, so there
          are no clubs to read. Deploy it, then set the address and restart.
        </p>
        <div className="chip mono" style={{ background: 'var(--band)', border: '1px solid var(--line)', padding: '16px 18px', fontSize: 12.5, lineHeight: 1.8, color: 'var(--body)' }}>
          TREASURY=0x… GUARDIAN=0x… OWNER=0x… \<br />
          &nbsp;&nbsp;forge script script/Deploy.s.sol --rpc-url rh_mainnet --broadcast<br />
          <span style={{ color: 'var(--dim)' }}># then, in web/.env.local</span><br />
          NEXT_PUBLIC_CLUB_FACTORY=0x…
        </div>
      </div>
    </div>
  );
}
