'use client';

import { useState } from 'react';
import { parseUnits, parseSignature, maxUint256, type Address } from 'viem';
import { useAccount, useChainId, useSignTypedData, useWriteContract, useWaitForTransactionReceipt, useReadContracts } from 'wagmi';
import { clubvaultAbi, stockTokenAbi } from '@/lib/abis';
import { fmt, STOCK_DECIMALS } from '@/lib/format';
import { explorerTx } from '@/lib/chain';
import { useCorrectChain } from '@/lib/useCorrectChain';

type Props = {
  vault: Address;
  asset: Address;
  symbol: string;
  walletBalance?: bigint;
  shares?: bigint;
  redeemable?: bigint;
  exitFeeBps?: number;
  shareDecimals?: number;
  assetPaused?: boolean;
  onDone: () => void;
};

export function DepositPanel(p: Props) {
  const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const { address } = useAccount();
  const chainId = useChainId();
  const { wrongChain, switching, switchToPyro } = useCorrectChain();
  const { signTypedDataAsync } = useSignTypedData();
  const { writeContractAsync, data: hash, reset } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  // ERC-2612 inputs. The stock token exposes permit/nonces/eip712Domain (verified on mainnet).
  const meta = useReadContracts({
    contracts: address
      ? [
          { address: p.asset, abi: stockTokenAbi, functionName: 'nonces', args: [address] },
          { address: p.asset, abi: stockTokenAbi, functionName: 'eip712Domain' },
        ]
      : [],
    query: { enabled: Boolean(address) },
  });

  const max = tab === 'deposit' ? p.walletBalance : p.redeemable;
  let parsed = 0n;
  try { parsed = amount ? parseUnits(amount, STOCK_DECIMALS) : 0n; } catch { parsed = 0n; }
  const overMax = max !== undefined && parsed > max;
  const disabled = !address || parsed === 0n || overMax || Boolean(busy) || p.assetPaused;

  async function depositWithPermit() {
    if (!address) return;
    const nonce = meta.data?.[0]?.status === 'success' ? (meta.data[0].result as bigint) : undefined;
    const dom = meta.data?.[1]?.status === 'success' ? (meta.data[1].result as readonly unknown[]) : undefined;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

    if (nonce !== undefined && dom) {
      try {
        setBusy('Sign the permit in your wallet');
        const signature = await signTypedDataAsync({
          domain: {
            name: dom[1] as string,
            version: dom[2] as string,
            chainId,
            verifyingContract: p.asset,
          },
          types: {
            Permit: [
              { name: 'owner', type: 'address' },
              { name: 'spender', type: 'address' },
              { name: 'value', type: 'uint256' },
              { name: 'nonce', type: 'uint256' },
              { name: 'deadline', type: 'uint256' },
            ],
          },
          primaryType: 'Permit',
          message: { owner: address, spender: p.vault, value: parsed, nonce, deadline },
        });
        const { r, s, v } = parseSignature(signature);
        setBusy('Depositing');
        await writeContractAsync({
          address: p.vault, abi: clubvaultAbi, functionName: 'depositWithPermit',
          args: [parsed, address, deadline, Number(v), r, s],
        });
        return;
      } catch {
        // Wallet refused typed-data signing, or the token's domain is not what we expect.
        // Fall through to the two-transaction path rather than dead-ending the user.
      }
    }

    setBusy('Approving');
    await writeContractAsync({ address: p.asset, abi: stockTokenAbi, functionName: 'approve', args: [p.vault, maxUint256] });
    setBusy('Depositing');
    await writeContractAsync({ address: p.vault, abi: clubvaultAbi, functionName: 'deposit', args: [parsed, address] });
  }

  async function submit() {
    setErr(null); reset();
    try {
      if (tab === 'deposit') await depositWithPermit();
      else {
        setBusy('Withdrawing');
        // redeem by shares so the user can always exit their whole position exactly
        const sharesToBurn = p.shares !== undefined && parsed === p.redeemable ? p.shares : undefined;
        if (sharesToBurn !== undefined) {
          await writeContractAsync({ address: p.vault, abi: clubvaultAbi, functionName: 'redeem', args: [sharesToBurn, address!, address!] });
        } else {
          await writeContractAsync({ address: p.vault, abi: clubvaultAbi, functionName: 'withdraw', args: [parsed, address!, address!] });
        }
      }
      setAmount('');
      p.onDone();
    } catch (e) {
      const m = e instanceof Error ? e.message : 'Transaction failed';
      setErr(m.split('\n')[0].slice(0, 160));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="slab card" style={{ padding: 24 }}>
      <div className="row" style={{ marginBottom: 22, borderBottom: '1px solid var(--line)' }}>
        {(['deposit', 'withdraw'] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); setAmount(''); }}
            className="display"
            style={{
              background: 'none', border: 'none', fontSize: 15, letterSpacing: '0.04em',
              padding: '0 0 11px', marginRight: 24,
              color: tab === t ? 'var(--ink)' : 'var(--dim)',
              borderBottom: tab === t ? '2px solid var(--ember)' : '2px solid transparent',
            }}>
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="between mono" style={{ fontSize: 11.5, color: 'var(--dim)', marginBottom: 9 }}>
        <span>AMOUNT</span>
        <span>{tab === 'deposit' ? 'Balance' : 'Redeemable'} {fmt(max)} {p.symbol}</span>
      </div>

      <div className="chip between" style={{ border: '1px solid var(--stroke)', background: 'var(--bg)', padding: '15px 16px', marginBottom: 10 }}>
        <input className="field-amount" inputMode="decimal" placeholder="0.00"
          value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} />
        <div className="row" style={{ gap: 10 }}>
          <button className="chip mono" onClick={() => max !== undefined && setAmount(fmt(max, STOCK_DECIMALS, 6).replace(/,/g, ''))}
            style={{ fontSize: 10.5, padding: '4px 8px', border: '1px solid var(--line)', color: 'var(--ember-ink)', background: 'none' }}>
            MAX
          </button>
          <span className="display" style={{ fontSize: 15 }}>{p.symbol}</span>
        </div>
      </div>

      <div className="stack" style={{ gap: 9, padding: '14px 0 18px', fontSize: 13 }}>
        <div className="between"><span style={{ color: 'var(--muted)' }}>Exit fee if you leave</span>
          <span className="mono">{p.exitFeeBps !== undefined ? `${(p.exitFeeBps / 100).toFixed(2)}%` : '—'}</span></div>
        <div className="between"><span style={{ color: 'var(--muted)' }}>Your shares</span>
          <span className="mono">{fmt(p.shares, p.shareDecimals)}</span></div>
      </div>

      {p.assetPaused && (
        <div className="chip" style={{ background: '#FFF4F3', border: '1px solid #F3C8C4', padding: '12px 14px', fontSize: 12.5, color: 'var(--loss)', marginBottom: 12 }}>
          The issuer has paused {p.symbol} transfers. Deposits and withdrawals will revert until that lifts.
        </div>
      )}

      {wrongChain ? (
        <button className="btn btn-primary" style={{ width: '100%', padding: 16, textAlign: 'center' }}
          disabled={switching} onClick={switchToPyro}>
          {switching ? 'CHECK YOUR WALLET…' : 'SWITCH TO ROBINHOOD CHAIN'}
        </button>
      ) : (
        <button className="btn btn-primary" style={{ width: '100%', padding: 16, textAlign: 'center' }}
          disabled={disabled} onClick={submit}>
          {busy ? busy.toUpperCase() + '…'
            : overMax ? 'NOT ENOUGH ' + p.symbol
            : tab === 'deposit' ? `DEPOSIT ${amount || '0'} ${p.symbol}` : `WITHDRAW ${amount || '0'} ${p.symbol}`}
        </button>
      )}
      {wrongChain && (
        <div style={{ fontSize: 12, color: 'var(--loss)', marginTop: 10, lineHeight: 1.5 }}>
          Your wallet is on another network. Pyro only exists on Robinhood Chain.
        </div>
      )}

      {err && <div style={{ fontSize: 12, color: 'var(--loss)', marginTop: 10, lineHeight: 1.5 }}>{err}</div>}

      {hash && (
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>
          {receipt.isLoading ? 'Waiting for confirmation… ' : 'Confirmed. '}
          <a href={explorerTx(hash)} target="_blank" rel="noreferrer">View transaction</a>
        </div>
      )}

      {tab === 'deposit' && !err && (
        <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 12, lineHeight: 1.55 }}>
          One signature. Pyro uses the token&apos;s permit, so there is no separate approval transaction.
        </div>
      )}
    </div>
  );
}
