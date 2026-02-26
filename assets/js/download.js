const downloadGridEl = document.querySelector('.download-grid');
const searchFormEl = document.querySelector('.download-search');
const searchInputEl = searchFormEl ? searchFormEl.querySelector('input') : null;
const searchClearBtn = document.querySelector('.download-search-clear');
const filterBtn = document.querySelector('.download-filter-btn');
const filterOverlay = document.querySelector('.download-filter-popup-overlay');
const filterStartInput = document.getElementById('filter-start');
const filterEndInput = document.getElementById('filter-end');
const filterClearBtn = document.querySelector('.filter-clear');
const filterApplyBtn = document.querySelector('.filter-apply');
const catAllCheckbox = document.getElementById('filter-cat-all');
const catCheckboxes = document.querySelectorAll('.filter-cat');
const dateOrderRadios = document.querySelectorAll('input[name="dateOrder"]');

let allDocs = [];
let filteredDocs = [];
let currentDateOrder = 'desc';
let filterStartDate = null;
let filterEndDate = null;
let activeCategories = new Set(); // ว่าง = ทั้งหมด
let currentSearch = '';
let supportsCategories = true;
let supportsDates = true;

const THAI_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

document.addEventListener('DOMContentLoaded', () => {
  if (!downloadGridEl) return;

  loadDocumentsFromApi();
});

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function toPublicFileUrl(fp) {
  const s = String(fp || '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  // ไฟล์ upload มักเก็บเป็น /uploads/... ที่เสิร์ฟจาก backend/public
  if (s.startsWith('/uploads/')) return `/ict8/backend/public${s}`;
  if (s.startsWith('uploads/')) return `/ict8/backend/public/${s}`;
  if (s.startsWith('./uploads/')) return `/ict8/backend/public/${s.replace(/^\.\//, '')}`;
  return s;
}

function formatBytes(bytes) {
  const n = Number(bytes || 0);
  if (!Number.isFinite(n) || n <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  const val = n / Math.pow(1024, i);
  return `${val.toFixed(val >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function setFilterControlsEnabled({ categories, dates }) {
  supportsCategories = !!categories;
  supportsDates = !!dates;

  // categories
  if (!supportsCategories) {
    if (catAllCheckbox) catAllCheckbox.checked = true;
    catCheckboxes.forEach(cb => {
      cb.checked = false;
      cb.disabled = true;
    });
    if (catAllCheckbox) catAllCheckbox.disabled = true;
    activeCategories = new Set();
  } else {
    catCheckboxes.forEach(cb => (cb.disabled = false));
    if (catAllCheckbox) catAllCheckbox.disabled = false;
  }

  // dates
  if (filterStartInput) filterStartInput.disabled = !supportsDates;
  if (filterEndInput) filterEndInput.disabled = !supportsDates;
  dateOrderRadios.forEach(r => (r.disabled = !supportsDates));

  if (!supportsDates) {
    if (filterStartInput) filterStartInput.value = '';
    if (filterEndInput) filterEndInput.value = '';
    filterStartDate = null;
    filterEndDate = null;
    currentDateOrder = 'desc';
    dateOrderRadios.forEach(r => {
      r.checked = (r.value === 'desc');
    });
  }
}

async function loadDocumentsFromApi() {
  try {
    // public list: ไม่ต้องใช้ auth
    const qs = new URLSearchParams({ public: '1', page: '1', limit: '200' });
    const res = await fetch(`/ict8/backend/public/documents?${qs.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const items = json?.data?.items || [];

    // map to UI shape
    allDocs = items.map((row) => {
      const dateObj = row.date ? new Date(row.date) : null;
      return {
        id: row.document_id,
        title: row.original_filename || row.stored_filename || `เอกสาร #${row.document_id}`,
        category: row.category || '',
        description: row.description || '',
        file: row.filepath || '',
        size: row.file_size ? formatBytes(row.file_size) : '',
        dateObj,
        displayDate: dateObj ? formatThaiDate(dateObj) : '',
      };
    });

    const hasCats = allDocs.some(d => !!d.category);
    const hasDates = allDocs.some(d => !!d.dateObj);
    setFilterControlsEnabled({ categories: hasCats, dates: hasDates });

    filteredDocs = [...allDocs];
    sortDocs();
    renderDownloads();

    setupSearch();
    setupFilterPopup();
    setupCategoryLogic();
  } catch (err) {
    console.error('Error loading documents from API:', err);
    downloadGridEl.innerHTML = `<p>ไม่สามารถโหลดข้อมูลเอกสารได้</p>`;
  }
}

// ===== Helper: แปลงเป็นวันที่ไทย =====
function formatThaiDate(dateObj) {
  const d = dateObj.getDate();
  const m = dateObj.getMonth(); // 0-11
  const y = dateObj.getFullYear() + 543;
  return `${d} ${THAI_MONTHS[m]} ${y}`;
}

// ===== Search / Filter / Sort Logic =====
function applyFilters() {
  filteredDocs = allDocs.filter(doc => {
    // 1) คำค้น
    if (currentSearch) {
      const haystack = (
        (doc.title || '') + ' ' +
        (doc.category || '') + ' ' +
        (doc.displayDate || '') + ' ' +
        (doc.description || '') + ' ' +
        (doc.file || '') + ' ' +
        (doc.size || '')
      ).toLowerCase();

      if (!haystack.includes(currentSearch)) {
        return false;
      }
    }

    // 2) filter วันที่ (ถ้าไม่มีข้อมูลวันที่ จะไม่บังคับ)
    if (supportsDates && doc.dateObj) {
      if (filterStartDate && doc.dateObj < filterStartDate) return false;
      if (filterEndDate && doc.dateObj > filterEndDate) return false;
    }

    // 3) filter หมวดหมู่ (ถ้าไม่มีหมวดหมู่ในระบบ จะไม่บังคับ)
    if (supportsCategories && activeCategories.size > 0) {
      if (!activeCategories.has(doc.category)) return false;
    }

    return true;
  });

  sortDocs();
  renderDownloads();
}

function sortDocs() {
  if (!supportsDates) return;
  filteredDocs.sort((a, b) => {
    if (!a.dateObj || !b.dateObj) return 0;
    if (currentDateOrder === 'desc') {
      return b.dateObj - a.dateObj; // ล่าสุด -> เก่าสุด
    } else {
      return a.dateObj - b.dateObj; // เก่าสุด -> ล่าสุด
    }
  });
}

// ===== Render =====
function renderDownloads() {
  if (!downloadGridEl) return;

  if (filteredDocs.length === 0) {
    downloadGridEl.innerHTML = `<p>ไม่พบเอกสารตามเงื่อนไขที่เลือก</p>`;
    return;
  }

  downloadGridEl.innerHTML = filteredDocs.map(doc => {
    const title = escapeHtml(doc.title);
    const desc = escapeHtml(doc.description || '');
    const cat = escapeHtml(doc.category || '');
    const date = escapeHtml(doc.displayDate || '');
    const size = escapeHtml(doc.size || '');
    const fileRaw = String(doc.file || '').trim();
    const file = toPublicFileUrl(fileRaw);

    return `
    <div class="download-card">
      <div class="download-main-info">
        <h3 class="download-file-title">${title}</h3>
        <div class="download-meta">
          ${cat ? `<span class="download-category">${cat}</span>` : ''}
          ${date ? `<span class="download-date">${date}</span>` : ''}
          ${size ? `<span class="download-size">${size}</span>` : ''}
        </div>
        ${desc ? `<p class="download-desc">${desc}</p>` : ''}
      </div>
      <div class="download-actions">
        ${file
          ? `<a href="${escapeHtml(file)}" class="btn-download" target="_blank" rel="noopener noreferrer">ดาวน์โหลด</a>`
          : `<span class="muted">ไม่มีไฟล์แนบ</span>`
        }
      </div>
    </div>
  `;
  }).join('');
}

// ===== Search =====
function setupSearch() {
  if (!searchInputEl) return;

  searchInputEl.addEventListener('input', () => {
    currentSearch = searchInputEl.value.trim().toLowerCase();
    applyFilters();
  });

  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', () => {
      searchInputEl.value = '';
      currentSearch = '';
      applyFilters();
    });
  }
}

// ===== Filter Popup =====
function setupFilterPopup() {
  if (!filterBtn || !filterOverlay) return;

  filterBtn.addEventListener('click', () => {
    const isOpen = filterOverlay.classList.contains('open');
    if (isOpen) {
      filterOverlay.classList.remove('open');
      filterBtn.classList.remove('is-active');
    } else {
      filterOverlay.classList.add('open');
      filterBtn.classList.add('is-active');
    }
  });

  // คลิกพื้นหลังเพื่อปิด
  filterOverlay.addEventListener('click', (e) => {
    if (e.target === filterOverlay) {
      filterOverlay.classList.remove('open');
      filterBtn.classList.remove('is-active');
    }
  });

  // ปุ่มล้างตัวกรอง
  if (filterClearBtn) {
    filterClearBtn.addEventListener('click', () => {
      filterStartInput.value = '';
      filterEndInput.value = '';
      filterStartDate = null;
      filterEndDate = null;

      // reset category = ทั้งหมด
      catAllCheckbox.checked = true;
      catCheckboxes.forEach(cb => cb.checked = false);
      activeCategories = new Set();

      // reset sort = desc
      dateOrderRadios.forEach(r => {
        r.checked = (r.value === 'desc');
      });
      currentDateOrder = 'desc';

      applyFilters();
    });
  }

  // ปุ่มใช้ตัวกรอง
  if (filterApplyBtn) {
    filterApplyBtn.addEventListener('click', () => {
      // วันที่
      const startVal = filterStartInput.value;
      const endVal = filterEndInput.value;

      filterStartDate = startVal ? new Date(startVal) : null;
      filterEndDate = endVal ? new Date(endVal) : null;

      // หมวดหมู่
      if (catAllCheckbox.checked) {
        activeCategories = new Set(); // ว่าง = ทั้งหมด
      } else {
        const selected = [];
        catCheckboxes.forEach(cb => {
          if (cb.checked) selected.push(cb.value);
        });
        activeCategories = new Set(selected);
      }

      // sort
      dateOrderRadios.forEach(r => {
        if (r.checked) {
          currentDateOrder = r.value;
        }
      });

      applyFilters();

      // ปิด popup
      filterOverlay.classList.remove('open');
      filterBtn.classList.remove('is-active');
    });
  }
}

// ===== Category checkbox logic =====
function setupCategoryLogic() {
  if (!catAllCheckbox) return;

  catAllCheckbox.addEventListener('change', () => {
    if (catAllCheckbox.checked) {
      // ถ้าเลือก "ทั้งหมด" ให้เอา tick ของหมวดอื่นออก
      catCheckboxes.forEach(cb => cb.checked = false);
    }
  });

  catCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) {
        // ถ้าเลือกหมวดใดหมวดหนึ่ง ให้เอา tick "ทั้งหมด" ออก
        catAllCheckbox.checked = false;
      }

      // ถ้าไม่มีหมวดไหนถูกเลือกเลย -> ให้กลับไปเป็น "ทั้งหมด"
      const anyChecked = Array.from(catCheckboxes).some(x => x.checked);
      if (!anyChecked) {
        catAllCheckbox.checked = true;
      }
    });
  });
}
