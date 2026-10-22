'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { MediaImage, ErrorMessage } from './ui';
import { Icon } from './icon';
export function Uploads({
  ids,
  onChange,
  max = 5,
  maxBytes = 5242880,
  advertiserId,
  onBusy,
}: {
  ids: string[];
  onChange: (ids: string[]) => void;
  max?: number;
  maxBytes?: number;
  advertiserId?: string;
  onBusy?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [failures, setFailures] = useState<{ file: File; message: string }[]>([]);
  const [progress, setProgress] = useState('');
  async function upload(files: File[]) {
    setBusy(true);
    onBusy?.(true);
    setFailures([]);
    let completed = [...ids];
    const failed: { file: File; message: string }[] = [];
    try {
      for (const file of files) {
        if (completed.length >= max) {
          failed.push({ file, message: `Maximum ${max} photos reached.` });
          continue;
        }
        setProgress(`Uploading ${file.name}…`);
        try {
          if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
            throw new Error('Use a JPEG, PNG or WebP image.');
          if (file.size > maxBytes || file.size === 0)
            throw new Error(`Choose an image up to ${(maxBytes / 1048576).toFixed(1)} MB.`);
          const signed = await api<{ mediaId: string; uploadUrl: string }>('uploads/sign', 'POST', {
            contentType: file.type,
            bytes: file.size,
            ...(advertiserId ? { advertiserId } : {}),
          });
          const put = await fetch(signed.uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type },
            body: file,
          });
          if (!put.ok) throw new Error('The upload was interrupted. Please retry.');
          await api('uploads/complete', 'POST', { mediaId: signed.mediaId });
          completed = [...completed, signed.mediaId];
          onChange(completed);
        } catch (e) {
          failed.push({ file, message: e instanceof Error ? e.message : 'Upload failed.' });
        }
      }
      setFailures(failed);
    } finally {
      setBusy(false);
      onBusy?.(false);
      setProgress('');
    }
  }
  return (
    <div>
      <div className="upload-grid">
        {ids.map((id, i) => (
          <div className="uploaded-photo" key={id}>
            <MediaImage id={id} alt={`Advert photograph ${i + 1}`} />
            <span className="upload-cover">{i === 0 ? 'Cover' : `Photo ${i + 1}`}</span>
            <div className="upload-controls">
              <button
                type="button"
                disabled={busy || i === 0}
                aria-label={`Move photo ${i + 1} earlier`}
                onClick={() => {
                  const next = [...ids];
                  [next[i - 1], next[i]] = [next[i], next[i - 1]];
                  onChange(next);
                }}
              >
                ←
              </button>
              <button
                type="button"
                disabled={busy || i === ids.length - 1}
                aria-label={`Move photo ${i + 1} later`}
                onClick={() => {
                  const next = [...ids];
                  [next[i + 1], next[i]] = [next[i], next[i + 1]];
                  onChange(next);
                }}
              >
                →
              </button>
              <button
                type="button"
                disabled={busy}
                aria-label={`Remove photo ${i + 1}`}
                onClick={() => onChange(ids.filter((x) => x !== id))}
              >
                ×
              </button>
            </div>
          </div>
        ))}
        {ids.length < max ? (
          <label className="upload-tile">
            <Icon name="upload" />
            <span>{busy ? 'Uploading…' : 'Add photos'}</span>
            <input
              type="file"
              multiple={max > 1}
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              aria-label="Select photographs"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = '';
                void upload(files);
              }}
            />
          </label>
        ) : null}
      </div>
      <p className="helper">
        Cover photo first. Up to {max} photos · JPEG, PNG or WebP ·{' '}
        {(maxBytes / 1048576).toFixed(1)} MB each.
      </p>
      {progress ? (
        <p className="inline-notice" role="status">
          {progress}
        </p>
      ) : null}
      {failures.map((f, i) => (
        <div key={`${f.file.name}-${i}`}>
          <ErrorMessage message={`${f.file.name}: ${f.message}`} />
          <button
            type="button"
            className="text-link btn quiet"
            disabled={busy}
            onClick={() => void upload([f.file])}
          >
            Retry this photo
          </button>
        </div>
      ))}
    </div>
  );
}
