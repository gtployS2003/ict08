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
      <div class="link-card">
        <h2 class="link-name">${escapeHtml(link.name)}</h2>
        <a class="link-url"
           href="${escapeHtml(link.url)}"
           target="_blank"
           rel="noopener noreferrer">
          ${escapeHtml(link.url)}
        </a>
        ${link.description ? `<p class="link-desc">${escapeHtml(link.description)}</p>` : ''}
      </div>
    `)
    .join('');
}
