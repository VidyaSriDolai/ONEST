import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { cn } from '@/lib/cn';

export interface QrCodeProps {
  /** The URL encoded into the code. */
  value: string;
  size?: number;
  className?: string;
  /** Description for assistive technology. */
  label?: string;
}

/**
 * Renders the QR code as an inline SVG data URL.
 *
 * SVG rather than canvas so it stays crisp when the certificate is printed —
 * which is the main way this code gets used, since a printed certificate is
 * often what an employer is handed.
 */
export function QrCode({ value, size = 128, className, label }: QrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);

    QRCode.toString(value, {
      type: 'svg',
      margin: 0,
      // High correction: a printed certificate picks up creases and smudges.
      errorCorrectionLevel: 'H',
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((svg) => {
        if (cancelled) return;
        setDataUrl('data:image/svg+xml;utf8,' + encodeURIComponent(svg));
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [value]);

  if (failed) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-lg bg-ink-100 p-2 text-center text-[10px] text-ink-500',
          className,
        )}
        style={{ width: size, height: size }}
      >
        QR unavailable
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div
        className={cn('animate-pulse rounded-lg bg-ink-100', className)}
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
    );
  }

  return (
    <img
      src={dataUrl}
      width={size}
      height={size}
      alt={label ?? 'QR code linking to the online verification page'}
      className={cn('rounded-lg bg-surface', className)}
    />
  );
}
