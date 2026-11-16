import QRCode from 'qrcode';
import jsQR from 'jsqr';

/**
 * Builds the scannable URL encoded in a parent's QR code.
 * When scanned with Zalo on a mobile phone, Zalo opens this link directly
 * and triggers automatic QR login via ?parent_qr=...
 */
export function buildParentQrUrl(qrToken: string, qrSessionId?: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const base = `${origin}/?parent_qr=${encodeURIComponent(qrToken)}`;
  return qrSessionId ? `${base}&qr_session=${encodeURIComponent(qrSessionId)}` : base;
}

/**
 * Generates a crisp PNG Data URL for a given QR payload.
 */
export async function generateQrDataUrl(payload: string, width = 260): Promise<string> {
  return QRCode.toDataURL(payload, {
    width,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });
}

/**
 * Extracts the QR token or phone string from any decoded QR payload.
 */
export function extractQrCredential(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const url = new URL(trimmed);
      const token = url.searchParams.get('parent_qr');
      if (token) return token.trim();
    }
  } catch {
    // fallback below
  }

  const queryMatch = trimmed.match(/parent_qr=([^&\s]+)/i);
  if (queryMatch?.[1]) {
    return decodeURIComponent(queryMatch[1]).trim();
  }

  return trimmed;
}

function scanCanvasRegion(
  img: HTMLImageElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  targetWidth: number,
  targetHeight: number,
  highContrast = false
): string | null {
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);

  const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  if (highContrast) {
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const v = lum < 145 ? 0 : 255;
      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;
    }
  }

  const result = jsQR(imageData.data, targetWidth, targetHeight, {
    inversionAttempts: 'attemptBoth',
  });
  return result?.data || null;
}

/**
 * Multi-pass QR decoder designed to reliably decode Zalo personal QR cards,
 * phone screenshots, and direct QR PNG images.
 */
export async function decodeQrFromImageFile(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Không thể đọc tệp ảnh đã chọn.'));
      el.src = objectUrl;
    });

    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) {
      throw new Error('Ảnh không hợp lệ hoặc bị hỏng.');
    }

    // Pass 1: Full image at capped sizes
    const maxTargets = [Math.min(Math.max(w, h), 1400), 1000, 750, 1800];
    for (const maxDim of maxTargets) {
      const scale = Math.min(1, maxDim / Math.max(w, h));
      const tw = Math.max(100, Math.round(w * scale));
      const th = Math.max(100, Math.round(h * scale));
      const hit = scanCanvasRegion(img, 0, 0, w, h, tw, th, false);
      if (hit) return hit;
    }

    // Pass 2: Center crops & vertical bands (handles Zalo "Mã QR của tôi" cards & tall screenshots)
    const regions = [
      { x: w * 0.1, y: h * 0.15, rw: w * 0.8, rh: h * 0.7 },
      { x: w * 0.15, y: h * 0.25, rw: w * 0.7, rh: h * 0.55 },
      { x: w * 0.2, y: h * 0.22, rw: w * 0.6, rh: h * 0.5 },
      { x: 0, y: h * 0.2, rw: w, rh: h * 0.5 },
      { x: 0, y: h * 0.4, rw: w, rh: h * 0.55 },
    ];

    for (const r of regions) {
      const scale = Math.min(1, 900 / Math.max(r.rw, r.rh));
      const tw = Math.max(100, Math.round(r.rw * scale));
      const th = Math.max(100, Math.round(r.rh * scale));
      const hit = scanCanvasRegion(img, r.x, r.y, r.rw, r.rh, tw, th, false);
      if (hit) return hit;
    }

    // Pass 3: High-contrast fallback for tinted/patterned QR cards
    for (const r of [{ x: 0, y: 0, rw: w, rh: h }, ...regions.slice(0, 3)]) {
      const scale = Math.min(1, 1000 / Math.max(r.rw, r.rh));
      const tw = Math.max(100, Math.round(r.rw * scale));
      const th = Math.max(100, Math.round(r.rh * scale));
      const hit = scanCanvasRegion(img, r.x, r.y, r.rw, r.rh, tw, th, true);
      if (hit) return hit;
    }

    throw new Error(
      'Không tìm thấy mã QR hợp lệ trong ảnh. Vui lòng chọn ảnh rõ mã QR Zalo cá nhân.'
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
