/**
 * Cloudflare Worker: LINE Webhook (STANDALONE MODE)
 * 
 * This worker DOES NOT proxy to PHP backend.
 * It handles webhook completely independently in Cloudflare Edge.
 *
 * Why standalone?
 * - PHP backend has connectivity issues (origin_http=522 or 500 errors)
 * - Worker responds IMMEDIATELY from edge (no PHP latency)
 * - LINE gets ACK in <100ms ✅
 * - Fetches dynamic button data from PHP API
 *
 * ===== SETUP IN CLOUDFLARE DASHBOARD =====
 * 
 * 1) Create these Environment Variables:
 *    
 *    SECRETS (do not show in logs):
 *    - LINE_CHANNEL_SECRET = [from LINE Developers Console]
 *    - LINE_CHANNEL_ACCESS_TOKEN = [from LINE Developers Console]
 *    
 *    VARIABLES (regular):
 *    - API_BASE = https://ict8.moi.go.th/ict8/backend/public
 *      (Worker will call {API_BASE}/api-support-types.php to fetch buttons)
 *
 * 2) Deploy this worker as the webhook handler
 * 
 * 3) In LINE Developers Console:
 *    Webhook URL = https://[your-worker].workers.dev
 *    Click "Verify" → should show ✅ Success
 *
 * 4) Test by sending "ขอสนับสนุน" in LINE
 *    → Should fetch buttons from DB and show 3 buttons immediately ✅
 */

const textEncoder = new TextEncoder();

function normalizeThaiText(s) {
  return (s || '')
    .toString()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function base64FromArrayBuffer(buf) {
  const bytes = new Uint8Array(buf);
  let binary = '';
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

function buildSupportFlex(items) {
  // items = array of { id, label, url }
  
  const buttons = (items || [])
    .filter(item => item?.label && item?.url)
    .slice(0, 3)  // limit to 3 buttons
    .map((item, idx) => ({
      type: 'button',
      style: 'secondary',
      height: 'md',
      margin: idx === 0 ? 'lg' : 'md',
      action: {
        type: 'uri',
        label: item.label.length > 20 ? item.label.slice(0, 19) + '…' : item.label,
        uri: item.url,
      },
    }));

  return {
    type: 'flex',
    altText: 'เมนูการขอสนับสนุน',
    contents: {
      type: 'bubble',
      size: 'mega',
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        paddingAll: '20px',
        backgroundColor: '#FFFFFF',
        contents: [
          {
            type: 'text',
            text: 'การขอสนับสนุน',
            weight: 'bold',
            size: 'xl',
            color: '#532274',
          },
          {
            type: 'separator',
            margin: 'lg',
            color: '#E5E7EB',
          },
          ...buttons,
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

async function getSupportTypes(apiBase) {
  /**
   * Fetch support request types from PHP API
   * Returns: { ok, items: [{ id, label, url }] }
   */
  try {
    const url = `${apiBase}/api-support-types.php`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!resp.ok) {
      console.warn('getSupportTypes failed', { status: resp.status });
      return { ok: false, items: [] };
    }

    const data = await resp.json();
    return {
      ok: data?.ok === true,
      items: data?.items || [],
    };
  } catch (e) {
    console.error('getSupportTypes error', e);
    return { ok: false, items: [] };
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ===== DEBUG ENDPOINT =====
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
        mode: 'STANDALONE (no PHP proxy)',
        configuration: {
          haveSecret: Boolean(env.LINE_CHANNEL_SECRET),
          haveToken: Boolean(env.LINE_CHANNEL_ACCESS_TOKEN),
          urls: {
            conference: Boolean(env.SUPPORT_URL_CONFERENCE),
            repair: Boolean(env.SUPPORT_URL_REPAIR),
            other: Boolean(env.SUPPORT_URL_OTHER),
          },
        },
        timestamp: new Date().toISOString(),
      };
      return new Response(JSON.stringify(info, null, 2), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // ===== WEBHOOK HANDLING =====

    // Step 1: Read raw body as bytes
    const bodyArrayBuffer = await request.arrayBuffer();
    const sig = request.headers.get('x-line-signature') || '';
    const secret = env.LINE_CHANNEL_SECRET || '';

    if (!secret) {
      console.error('Missing LINE_CHANNEL_SECRET');
      return new Response('Missing LINE_CHANNEL_SECRET', { status: 500 });
    }

    // Step 2: Verify signature
    const computed = await computeLineSignatureBase64(secret, bodyArrayBuffer);
    if (!safeEqual(sig, computed)) {
      console.warn('Invalid signature');
      return new Response('Invalid signature', { status: 401 });
    }

    // Step 3: Parse JSON
    let payload;
    try {
      payload = JSON.parse(new TextDecoder().decode(bodyArrayBuffer));
    } catch (e) {
      console.error('JSON parse failed', e);
      return new Response('Bad JSON', { status: 400 });
    }

    const events = Array.isArray(payload?.events) ? payload.events : [];
    const accessToken = env.LINE_CHANNEL_ACCESS_TOKEN || '';

    if (!accessToken) {
      console.error('Missing LINE_CHANNEL_ACCESS_TOKEN');
      return new Response('Missing LINE_CHANNEL_ACCESS_TOKEN', { status: 500 });
    }

    // Step 4: Process events in background
    const work = (async () => {
      for (const ev of events) {
        const replyToken = ev?.replyToken;
        if (!replyToken) continue;

        let shouldShowSupport = false;
        const eventType = ev?.type || '';

        // Check postback with "ext:support"
        if (eventType === 'postback') {
          const data = normalizeThaiText(ev?.postback?.data || '');
          if (data === 'ext:support') shouldShowSupport = true;
        }

        // Check text message containing "ขอสนับสนุน"
        if (eventType === 'message' && ev?.message?.type === 'text') {
          const text = normalizeThaiText(ev?.message?.text || '');
          // Match: "ขอสนับสนุน", "ขอสนับสนุนครับ", "ขอรับสนับสนุน", etc.
          if (/ขอ\s*(?:รับ\s*)?(?:การ\s*)?สนับสนุน/u.test(text)) {
            shouldShowSupport = true;
          }
        }

        if (!shouldShowSupport) continue;

        // Fetch support types from PHP API
        const apiBase = env.API_BASE || 'https://ict8.moi.go.th/ict8/backend/public';
        const supportData = await getSupportTypes(apiBase);

        // Build flex message: use data from API, or empty array if failed
        const items = supportData?.ok && supportData?.items?.length > 0
          ? supportData.items
          : [];

        const flex = buildSupportFlex(items);
        const result = await replyToLine(accessToken, replyToken, [flex]);

        if (!result.ok) {
          console.error('replyToLine failed', {
            status: result.status,
            text: result.text?.slice(0, 500),
          });
        } else {
          console.log('replyToLine success', { replyToken: replyToken.slice(0, 20) + '...' });
        }
      }
    })();

    ctx.waitUntil(work);

    // Step 5: Return 200 ACK immediately to LINE
    // (processing continues in background via ctx.waitUntil)
    return new Response('OK', { status: 200 });
  },
};
