// assets/js/link.js

document.addEventListener('DOMContentLoaded', () => {
  const gridEl = document.querySelector('.link-grid');
  if (!gridEl) return;

  loadLinksFromApi(gridEl);
});

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function toPublicImageUrl(path) {
  const p = String(path || '').trim();
  if (!p) return '';
  if (/^https?:\/\//i.test(p)) return p;
  const apiBase = String(window.__API_BASE__ || window.API_BASE_URL || '/ict8/backend/public').replace(/\/+$/, '');
  if (p.startsWith('/uploads/')) return `${apiBase}${p}`;
  if (p.startsWith('uploads/')) return `${apiBase}/${p}`;
  if (p.startsWith('/')) return p;
  return `/${p}`;
}

async function loadLinksFromApi(gridEl) {
  try {
    const qs = new URLSearchParams({ public: '1', page: '1', limit: '200' });
    const res = await fetch(`/ict8/backend/public/link-urls?${qs.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const items = json?.data?.items || [];

    // map to old UI shape
    const mapped = items.map((r) => ({
      name: r.title || `ลิงก์ #${r.url_id}`,
      url: r.link_url || '',
      description: r.content || '',
      img: r.img || '',
    }));

    renderLinks(gridEl, mapped);
  } catch (err) {
    console.error('Error loading links from API:', err);
    gridEl.innerHTML = '<p>ไม่สามารถโหลดข้อมูลเว็บไซต์ที่เกี่ยวข้องได้</p>';
  }
}

function renderLinks(container, items) {
  if (!items || items.length === 0) {
    container.innerHTML = '<p>ขณะนี้ยังไม่มีข้อมูลเว็บไซต์ที่เกี่ยวข้อง</p>';
    return;
  }

  container.innerHTML = items
    .map(link => `
      <a class="link-card"
         href="${escapeHtml(link.url)}"
         target="_blank"
         rel="noopener noreferrer"
         aria-label="${escapeHtml(link.name)}">
        ${
          link.img
            ? `<img class="link-image" src="${escapeHtml(toPublicImageUrl(link.img))}" alt="${escapeHtml(link.name)}" loading="lazy">`
            : `<span class="link-image link-image--empty">${escapeHtml(link.name)}</span>`
        }
      </a>
    `)
    .join('');
}
