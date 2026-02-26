const PAGE_SIZE = 9;

const API_BASE = (window.__APP_CONFIG__ && window.__APP_CONFIG__.API_BASE) || "/ict8/backend/public";

let allNews = [];
let filteredNews = [];
let currentPage = 1;

const gridEl = document.querySelector('.news-grid');
const paginationEl = document.querySelector('.news-pagination');
const searchInput = document.querySelector('.news-search input');
const clearBtn = document.querySelector('.news-search-clear');

if (gridEl) initNewsPage();

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatThaiDate(mysqlDateTime) {
  const s = String(mysqlDateTime || '').trim();
  if (!s) return '-';
  const dt = new Date(s.replace(' ', 'T'));
  if (isNaN(dt.getTime())) return s;

  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const d = dt.getDate();
  const m = months[dt.getMonth()] || '';
  const y = dt.getFullYear() + 543;
  return `${d} ${m} ${y}`;
}

function normalizeNewsRow(row) {
  const id = row?.news_id ?? row?.id;
  return {
    id,
    title: row?.title ?? '',
    content: row?.content ?? '',
    writer: row?.writer_name ?? row?.writer ?? '',
    date: formatThaiDate(row?.create_at ?? row?.date ?? ''),
  };
}

async function initNewsPage() {
  try {
    const res = await fetch(`${API_BASE}/news?limit=500`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const rows = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];

    allNews = rows.map(normalizeNewsRow);
    filteredNews = [...allNews];

    renderNewsList(1);
    renderPagination();
    setupSearch();
  } catch (err) {
    console.error('โหลดข้อมูลข่าวไม่สำเร็จ', err);
    if (gridEl) gridEl.innerHTML = `<p>โหลดข้อมูลประชาสัมพันธ์ไม่สำเร็จ</p>`;
  }
}

function renderNewsList(page = 1) {
  if (!gridEl) return;

  currentPage = page;

  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const items = filteredNews.slice(start, end);

  if (items.length === 0) {
    gridEl.innerHTML = `<p>ไม่พบข้อมูลประชาสัมพันธ์</p>`;
    return;
  }

  gridEl.innerHTML = items
    .map(
      (item) => `
    <a href="news-detail.html?id=${encodeURIComponent(String(item.id ?? ''))}" target="_blank" rel="noopener noreferrer" class="news-card" >
      <h3 class="news-cards-title">${escapeHtml(item.title)}</h3>
      <p class="news-cards-date">${escapeHtml(item.date)}</p>
      <p class="news-cards-link">
        รายละเอียดเพิ่มเติม
      </p>
    </a>
      `
    )
    .join('');
}

function renderPagination() {
  if (!paginationEl) return;

  const totalPages = Math.ceil(filteredNews.length / PAGE_SIZE);
  if (totalPages <= 1) {
    paginationEl.innerHTML = '';
    return;
  }

  let html = '';

  // prev
  html += `<button class="page-btn page-prev" ${
    currentPage === 1 ? 'disabled' : ''
  }>&larr;</button>`;

  const items = [];

  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) {
      items.push({ type: 'page', page: i });
    }
  } else {
    const first = 1;
    const last = totalPages;

    if (currentPage <= 3) {
      // 1 2 3 4 ... last
      items.push({ type: 'page', page: 1 });
      items.push({ type: 'page', page: 2 });
      items.push({ type: 'page', page: 3 });
      items.push({ type: 'page', page: 4 });
      items.push({ type: 'dots' });
      items.push({ type: 'page', page: last });
    } else if (currentPage >= totalPages - 2) {
      // first ... last-3 last-2 last-1 last
      items.push({ type: 'page', page: first });
      items.push({ type: 'dots' });
      items.push({ type: 'page', page: last - 3 });
      items.push({ type: 'page', page: last - 2 });
      items.push({ type: 'page', page: last - 1 });
      items.push({ type: 'page', page: last });
    } else {
      // 1 ... current-1 current current+1 ... last
      items.push({ type: 'page', page: first });
      items.push({ type: 'dots' });
      items.push({ type: 'page', page: currentPage - 1 });
      items.push({ type: 'page', page: currentPage });
      items.push({ type: 'page', page: currentPage + 1 });
      items.push({ type: 'dots' });
      items.push({ type: 'page', page: last });
    }
  }

  items.forEach((item) => {
    if (item.type === 'dots') {
      html += `<span class="page-dots">...</span>`;
    } else {
      const i = item.page;
      html += `<button class="page-number ${
        i === currentPage ? 'active' : ''
      }" data-page="${i}">${i}</button>`;
    }
  });

  // next
  html += `<button class="page-btn page-next" ${
    currentPage === totalPages ? 'disabled' : ''
  }>&rarr;</button>`;

  paginationEl.innerHTML = html;

  // events
  paginationEl.querySelectorAll('.page-number').forEach((btn) => {
    btn.addEventListener('click', () => {
      const page = Number(btn.dataset.page);
      renderNewsList(page);
      renderPagination();
      scrollToTop();
    });
  });

  const prevBtn = paginationEl.querySelector('.page-prev');
  const nextBtn = paginationEl.querySelector('.page-next');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        renderNewsList(currentPage - 1);
        renderPagination();
        scrollToTop();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const total = Math.ceil(filteredNews.length / PAGE_SIZE);
      if (currentPage < total) {
        renderNewsList(currentPage + 1);
        renderPagination();
        scrollToTop();
      }
    });
  }
}

function scrollToTop() {
  const section = document.querySelector('.news-page');
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ----------------- Search -----------------

function setupSearch() {
  if (!searchInput) return;

  searchInput.addEventListener('input', () => {
    applySearch();
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      applySearch();
    });
  }
}

function applySearch() {
  const term = (searchInput?.value || '').trim().toLowerCase();

  let result = [...allNews];

  // search text จาก title / content / writer / date
  if (term) {
    result = result.filter((n) => {
      const title   = n.title?.toLowerCase()   || '';
      const content = n.content?.toLowerCase() || '';
      const writer  = n.writer?.toLowerCase()  || '';
      const dateStr = n.date?.toLowerCase()    || '';
      return (
        title.includes(term)   ||
        content.includes(term) ||
        writer.includes(term)  ||
        dateStr.includes(term)
      );
    });
  }

  filteredNews = result;
  renderNewsList(1);
  renderPagination();
}

