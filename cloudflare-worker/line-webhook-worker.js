/**
 * Cloudflare Worker: LINE Webhook (standalone)
 *
 * Why: If your origin webhook is only reachable inside VPN/intranet, a proxy Worker will fail (often shows origin_http=522).
 * This Worker handles the webhook directly and replies with the 3 “ขอสนับสนุน” buttons without calling any origin.
 *
 * Required Worker secrets/vars:
 * - LINE_CHANNEL_SECRET (secret)
 * - LINE_CHANNEL_ACCESS_TOKEN (secret)
 * - SUPPORT_URL_CONFERENCE (var)  e.g. https://<public>/ict8/gcms/request-conference.html
 * - SUPPORT_URL_REPAIR (var)      e.g. https://<public>/ict8/gcms/request-repair.html
 * - SUPPORT_URL_OTHER (var)       e.g. https://<public>/ict8/gcms/request-other.html
 *
 * Optional:
 * - DEBUG_KEY (secret/var) set any random string; GET /?debug=1&key=... shows basic config.
 */

const textEncoder = new TextEncoder();

function normalizeThaiText(s) {
  return (s || '')
    .toString()
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width
    .replace(/\s+/g, ' ')
    .trim();
}

function safeEqual(a, b) {
  // Basic constant-time-ish compare (good enough for signature check here)
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function base64FromArrayBuffer(buf) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  // chunk to avoid call stack limits
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function computeLineSignatureBase64(channelSecret, bodyArrayBuffer) {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(channelSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign('HMAC', key, bodyArrayBuffer);
  return base64FromArrayBuffer(sig);
}

function buildSupportFlex(env) {
  const urlConference = env.SUPPORT_URL_CONFERENCE || '';
  const urlRepair = env.SUPPORT_URL_REPAIR || '';
  const urlOther = env.SUPPORT_URL_OTHER || '';

  // If URLs are missing, still show buttons but link to a placeholder.
  // Better: set the env vars above.
  const fallback = 'https://example.com';

  const buttons = [
    { label: 'ขอสนับสนุนประชุม', uri: urlConference || fallback },
    { label: 'ขอสนับสนุนซ่อม', uri: urlRepair || fallback },
    { label: 'ขอสนับสนุนอื่นๆ', uri: urlOther || fallback },
  ];

  return {
    type: 'flex',
    altText: 'ขอสนับสนุน: เลือกประเภท',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: 'ขอสนับสนุน',
            weight: 'bold',
            size: 'lg',
            color: '#532274',
          },
          {
            type: 'text',
            text: 'โปรดเลือกประเภทคำขอ',
            size: 'sm',
            color: '#6B7280',
            wrap: true,
          },
          ...buttons.map((b, idx) => ({
            type: 'button',
            style: 'secondary',
            height: 'md',
            margin: idx === 0 ? 'lg' : 'md',
            action: {
              type: 'uri',
              label: b.label.length > 20 ? b.label.slice(0, 19) + '…' : b.label,
              uri: b.uri,
            },
          })),
        ],
      },
    },
  };
}

async function replyToLine(accessToken, replyToken, messages) {
  const resp = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ replyToken, messages }),
  });

  const text = await resp.text();
  return { ok: resp.ok, status: resp.status, text };
}

export default {
  async fetch(request, env, ctx) {
    // Basic GET health/debug
    const url = new URL(request.url);
    if (request.method === 'GET') {
      const debug = url.searchParams.get('debug') === '1';
      if (!debug) return new Response('OK', { status: 200 });

      const key = url.searchParams.get('key') || '';
      const expected = env.DEBUG_KEY || '';
      if (expected && !safeEqual(key, expected)) {
        return new Response('Unauthorized', { status: 401 });
      }

      const info = {
        ok: true,
        note: 'This Worker handles LINE webhook directly (no origin proxy).',
        haveSecret: Boolean(env.LINE_CHANNEL_SECRET),
        haveToken: Boolean(env.LINE_CHANNEL_ACCESS_TOKEN),
        urls: {
          conference: Boolean(env.SUPPORT_URL_CONFERENCE),
          repair: Boolean(env.SUPPORT_URL_REPAIR),
          other: Boolean(env.SUPPORT_URL_OTHER),
        },
      };
      return new Response(JSON.stringify(info, null, 2), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // 1) Read raw body as bytes (must be raw for signature validation)
    const bodyArrayBuffer = await request.arrayBuffer();

    // 2) Verify signature
    const sig = request.headers.get('x-line-signature') || '';
    const secret = env.LINE_CHANNEL_SECRET || '';
    if (!secret) return new Response('Missing LINE_CHANNEL_SECRET', { status: 500 });

    const computed = await computeLineSignatureBase64(secret, bodyArrayBuffer);
    if (!safeEqual(sig, computed)) {
      return new Response('Invalid signature', { status: 401 });
    }

    // 3) Parse JSON
    let payload;
    try {
      payload = JSON.parse(new TextDecoder().decode(bodyArrayBuffer));
    } catch {
      return new Response('Bad JSON', { status: 400 });
    }

    const events = Array.isArray(payload?.events) ? payload.events : [];

    // 4) Process events
    const accessToken = env.LINE_CHANNEL_ACCESS_TOKEN || '';
    if (!accessToken) return new Response('Missing LINE_CHANNEL_ACCESS_TOKEN', { status: 500 });

    // Reply asynchronously but still within request lifetime
    const work = (async () => {
      for (const ev of events) {
        const replyToken = ev?.replyToken;
        if (!replyToken) continue;

        let shouldShowSupport = false;

        if (ev?.type === 'postback') {
          const data = ev?.postback?.data || '';
          if (normalizeThaiText(data) === 'ext:support') shouldShowSupport = true;
        }

        if (ev?.type === 'message' && ev?.message?.type === 'text') {
          const text = normalizeThaiText(ev?.message?.text || '');
          // Flexible match: “ขอสนับสนุน”, “ขอสนับสนุนครับ”, etc.
          if (/ขอ\s*สนับสนุน/i.test(text)) shouldShowSupport = true;
        }

        if (!shouldShowSupport) continue;

        const flex = buildSupportFlex(env);
        const result = await replyToLine(accessToken, replyToken, [flex]);
        if (!result.ok) {
          // Visible in Cloudflare logs
          console.log('reply_failed', { status: result.status, text: result.text?.slice(0, 1000) });
        }
      }
    })();

    ctx.waitUntil(work);

    // Always ACK quickly
    return new Response('OK', { status: 200 });
  },
};
