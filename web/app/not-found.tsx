import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function NotFound() {
  return (
    <>
      <Header />
      <div className="shell" style={{ padding: '110px 40px 130px', textAlign: 'center' }}>
        <div className="mono" style={{ fontSize: 12, letterSpacing: '0.18em', color: 'var(--dim)', marginBottom: 18 }}>
          404
        </div>
        <h1 className="display h-1" style={{ margin: '0 0 16px', lineHeight: 1.05 }}>
          NOTHING IN THIS VAULT.
        </h1>
        <p style={{ fontSize: 17, color: 'var(--muted)', margin: '0 auto 34px', maxWidth: 420 }}>
          That page does not exist. The clubs that do are one click away.
        </p>
        <div className="row" style={{ justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/clubs" className="btn btn-primary" style={{ display: 'inline-block' }}>BROWSE CLUBS</Link>
          <Link href="/" className="btn btn-ghost" style={{ display: 'inline-block', color: 'var(--ink)' }}>HOME</Link>
        </div>
      </div>
      <Footer />
    </>
  );
}
