'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * Pick an image from the device and turn it into something we can hand to the
 * launchpad without any backend.
 *
 * The launchpad caps the logo field at 512 characters - measured against the
 * live contract, which reverts MetadataTooLong beyond it - so the image cannot
 * be embedded in the launch. It has to be hosted and referenced by a short URL.
 *
 * The picture is squared and compressed here so the upload is tiny, then sent
 * to /api/upload, which stores it and returns a link. If that endpoint is not
 * configured the component says so and the hosted-URL field still works.
 */

const BUDGET = 60_000; // upload size ceiling; the launch only ever carries the URL
const ATTEMPTS: { size: number; quality: number }[] = [
  { size: 256, quality: 0.82 },
  { size: 224, quality: 0.75 },
  { size: 192, quality: 0.7 },
  { size: 160, quality: 0.65 },
  { size: 128, quality: 0.6 },
];

async function encode(file: File): Promise<{ blob: Blob; type: string; bytes: number; px: number }> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not available in this browser.');

  // Prefer webp; Safari before 14 and a few others only do jpeg.
  const probe = document.createElement('canvas');
  probe.width = probe.height = 1;
  const type = probe.toDataURL('image/webp').startsWith('data:image/webp')
    ? 'image/webp'
    : 'image/jpeg';

  for (const { size, quality } of ATTEMPTS) {
    canvas.width = canvas.height = size;
    // Square crop from the centre so nothing is squashed.
    const side = Math.min(bitmap.width, bitmap.height);
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(
      bitmap,
      (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side,
      0, 0, size, size
    );
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, type, quality));
    if (blob && blob.size <= BUDGET) return { blob, type, bytes: blob.size, px: size };
  }
  throw new Error('Could not compress that image far enough. Try a simpler one.');
}

export function ImagePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const input = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  const take = useCallback(async (file?: File | null) => {
    if (!file) return;
    setErr(null); setInfo(null);
    if (!file.type.startsWith('image/')) { setErr('That file is not an image.'); return; }
    setBusy(true);
    try {
      const { blob, type, bytes, px } = await encode(file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'content-type': type },
        body: blob,
      });

      if (res.status === 501) {
        throw new Error(
          'Uploads are not switched on for this site yet. Paste a hosted image URL below instead.'
        );
      }
      if (!res.ok) throw new Error('Upload failed. Paste a hosted image URL below instead.');

      const { url } = (await res.json()) as { url: string };
      if (!url || url.length > 480) throw new Error('That upload produced an unusable link.');
      onChange(url);
      setInfo(`${px}x${px}, ${(bytes / 1024).toFixed(1)} KB uploaded`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not read that image.');
    } finally {
      setBusy(false);
    }
  }, [onChange]);

  const isUrl = /^(https?|ipfs):\/\/\S+$/i.test(value.trim());
  const preview = isUrl ? value.trim() : '';

  return (
    <div>
      <div className="row" style={{ gap: 12, alignItems: 'stretch' }}>
        <div
          className="chip"
          style={{
            width: 76, height: 76, flexShrink: 0, border: '1px solid var(--stroke)',
            background: preview ? `center / cover no-repeat url("${preview}")` : 'var(--band)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {!preview && <span className="mono" style={{ fontSize: 9.5, color: 'var(--dim)' }}>IMG</span>}
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); take(e.dataTransfer.files?.[0]); }}
          onClick={() => input.current?.click()}
          className="chip"
          style={{
            flexGrow: 1, cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', textAlign: 'center', padding: '14px 16px',
            border: `1px dashed ${drag ? 'var(--ember)' : 'var(--stroke)'}`,
            background: drag ? '#FFF7F3' : 'var(--bg)',
            transition: 'border-color 0.18s linear, background 0.18s linear',
          }}
        >
          <span style={{ fontSize: 13.5, color: busy ? 'var(--dim)' : 'var(--body)' }}>
            {busy ? 'Compressing and uploading…' : 'Drop an image here, or click to choose one'}
          </span>
        </div>
      </div>

      <input
        ref={input}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => take(e.target.files?.[0])}
      />

      <div style={{ marginTop: 10 }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', color: 'var(--dim)', marginBottom: 6 }}>
          OR PASTE A HOSTED URL
        </div>
        <input
          className="field chip"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://... or ipfs://..."
        />
      </div>

      {err && <div style={{ fontSize: 12.5, color: 'var(--loss)', marginTop: 9, lineHeight: 1.5 }}>{err}</div>}
      {info && !err && (
        <div style={{ fontSize: 12.5, color: 'var(--gain)', marginTop: 9 }}>{info}.</div>
      )}
      {value.length > 480 && (
        <div style={{ fontSize: 12.5, color: 'var(--loss)', marginTop: 9, lineHeight: 1.5 }}>
          That link is too long. The launchpad rejects anything over 512 characters.
        </div>
      )}
    </div>
  );
}
