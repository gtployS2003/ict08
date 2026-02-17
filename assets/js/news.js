const PAGE_SIZE = 9;

let allNews = [];
let filteredNews = [];
let currentPage = 1;
let latestYearOnly = false;
let filterStartDate = null;
let filterEndDate   = null;
let dateOrder = 'desc';

const gridEl = document.querySelector('.news-grid');
const paginationEl = document.querySelector('.news-pagination');
const searchInput = document.querySelector('.news-search input');
const clearBtn = document.querySelector('.news-search-clear');
const filterBtn = document.querySelector('.news-filter-btn');
const filterPopupOverlay = document.querySelector('.news-filter-popup-overlay');
const filterStartInput   = document.getElementById('filter-start');
const filterEndInput     = document.getElementById('filter-end');

if (gridEl) {
  initNewsPage();
}

function initNewsPage() {
  fetch('/ict8/assets/js/data-ex/news.json')
    .then((res) => res.json())
    .then((data) => {
      allNews = data;
      filteredNews = [...allNews];

      renderNewsList(1);
      renderPagination();
      setupSearch();
      setupFilter();
    })
    .catch((err) => console.error('โหลดข้อมูลข่าวไม่สำเร็จ', err));
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
    <a href="news-detail.html?id=${item.id}" target="_blank" rel="noopener noreferrer" class="news-card" >
      <h3 class="news-cards-title">${item.title}</h3>
      <p class="news-cards-date">${item.date}</p>
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

// ----------------- Search + Filter -----------------

function setupSearch() {
  if (!searchInput) return;

  searchInput.addEventListener('input', () => {
    applyFilterAndSearch();
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      applyFilterAndSearch();
    });
  }
}

function setupFilter() {
  if (!filterBtn || !filterPopupOverlay) return;

  // กดปุ่มกรอง → เปิด popup
  filterBtn.addEventListener('click', () => {
    filterPopupOverlay.classList.add('open');
  });

  // ปุ่มใช้ตัวกรอง
  const applyBtn = filterPopupOverlay.querySelector('.filter-apply');
  const clearBtnPopup = filterPopupOverlay.querySelector('.filter-clear');

  applyBtn.addEventListener('click', () => {
    // อ่านค่าวันที่จาก input type="date" (เป็น ค.ศ.)
    const startVal = filterStartInput.value; // yyyy-mm-dd หรือ ''
    const endVal   = filterEndInput.value;

    filterStartDate = startVal ? new Date(startVal) : null;
    filterEndDate   = endVal   ? new Date(endVal)   : null;

    // อ่านตัวเลือกเรียงลำดับ
    const orderEl = filterPopupOverlay.querySelector('input[name="dateOrder"]:checked');
    dateOrder = orderEl ? orderEl.value : 'desc';

    applyFilterAndSearch();
    filterPopupOverlay.classList.remove('open');
  });

  // ปุ่มล้างตัวกรอง
  clearBtnPopup.addEventListener('click', () => {
    filterStartInput.value = '';
    filterEndInput.value = '';
    filterStartDate = null;
    filterEndDate = null;
    dateOrder = 'desc';

    applyFilterAndSearch();
    filterPopupOverlay.classList.remove('open');
  });

  // คลิกพื้นหลังเพื่อปิด popup
  filterPopupOverlay.addEventListener('click', (e) => {
    if (e.target === filterPopupOverlay) {
      filterPopupOverlay.classList.remove('open');
    }
  });
}


function applyFilterAndSearch() {
  const term = (searchInput?.value || '').trim().toLowerCase();

  let result = [...allNews];

  // ---- 1) search text จาก title / content / writer / date (เหมือนเดิม) ----
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

  // ---- 2) filter ด้วยช่วงวันที่ จาก popup ----
  if (filterStartDate || filterEndDate) {
    result = result.filter((n) => {
      const d = parseThaiDateToAD(n.date); // Date (ค.ศ.) จากข้อความ "29 เม.ย. 2568"
      if (!d) return false;

      if (filterStartDate && d < filterStartDate) return false;
      if (filterEndDate   && d > filterEndDate)   return false;
      return true;
    });
  }

  // ---- 3) sort ตามวันที่ (ใหม่→เก่า หรือ เก่า→ใหม่) ----
  result.sort((a, b) => {
    const da = parseThaiDateToAD(a.date);
    const db = parseThaiDateToAD(b.date);
    if (!da || !db) return 0;
    return dateOrder === 'desc' ? db - da : da - db;
  });

  filteredNews = result;
  renderNewsList(1);
  renderPagination();
}


// helper: ดึงปี พ.ศ. จากข้อความวันที่ เช่น "29 เม.ย. 2568"
function getThaiYearFromDateString(dateStr) {
  if (!dateStr) return null;
  const match = dateStr.match(/(\d{4})$/);
  return match ? Number(match[1]) : null;
}

function parseThaiDateToAD(dateStr) {
  // ตัวอย่าง dateStr: "29 เม.ย. 2568"
  if (!dateStr) return null;

  const monthMap = {
    'ม.ค.': 0, 'ก.พ.': 1, 'มี.ค.': 2, 'เม.ย.': 3,
    'พ.ค.': 4, 'มิ.ย.': 5, 'ก.ค.': 6, 'ส.ค.': 7,
    'ก.ย.': 8, 'ต.ค.': 9, 'พ.ย.': 10, 'ธ.ค.': 11
  };

  const m = dateStr.match(/(\d{1,2})\s+([^\s]+)\s+(\d{4})/); // เลข วัน / ชื่อเดือน / ปี
  if (!m) return null;

  const day = Number(m[1]);
  const monthName = m[2];
  const yearBE = Number(m[3]);

  const month = monthMap[monthName];
  if (month === undefined) return null;

  const yearAD = yearBE - 543;  // แปลง พ.ศ. → ค.ศ.
  return new Date(yearAD, month, day);
}

