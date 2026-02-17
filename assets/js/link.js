// assets/js/link.js

document.addEventListener('DOMContentLoaded', () => {
  const gridEl = document.querySelector('.link-grid');
  if (!gridEl) return;

  fetch('/ict8/assets/js/data-ex/link.json')
    .then(res => res.json())
    .then(data => {
      renderLinks(gridEl, data);
    })
    .catch(err => {
      console.error('Error loading links.json:', err);
      gridEl.innerHTML = '<p>ไม่สามารถโหลดข้อมูลเว็บไซต์ที่เกี่ยวข้องได้</p>';
    });
});

function renderLinks(container, items) {
  if (!items || items.length === 0) {
    container.innerHTML = '<p>ขณะนี้ยังไม่มีข้อมูลเว็บไซต์ที่เกี่ยวข้อง</p>';
    return;
  }

  container.innerHTML = items
    .map(link => `
      <div class="link-card">
        <h2 class="link-name">${link.name}</h2>
        <a class="link-url"
           href="${link.url}"
           target="_blank"
           rel="noopener noreferrer">
          ${link.url}
        </a>
        <p class="link-desc">${link.description || ''}</p>
      </div>
    `)
    .join('');
}
