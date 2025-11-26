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

const THAI_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

document.addEventListener('DOMContentLoaded', () => {
  if (!downloadGridEl) return;

  fetch('/assets/js/data-ex/form.json')
    .then(res => res.json())
    .then(data => {
      // map data ให้มี dateObj + displayDate
      allDocs = data.map(item => {
        const dateObj = item.date ? new Date(item.date) : null;
        return {
          ...item,
          dateObj,
          displayDate: dateObj ? formatThaiDate(dateObj) : ''
        };
      });

      filteredDocs = [...allDocs];
      sortDocs();
      renderDownloads();

      setupSearch();
      setupFilterPopup();
      setupCategoryLogic();
    })
    .catch(err => {
      console.error('Error loading form.json:', err);
    });
});

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
        (doc.description || '')
      ).toLowerCase();

      if (!haystack.includes(currentSearch)) {
        return false;
      }
    }

    // 2) filter วันที่
    if (filterStartDate && doc.dateObj && doc.dateObj < filterStartDate) {
      return false;
    }
    if (filterEndDate && doc.dateObj && doc.dateObj > filterEndDate) {
      return false;
    }

    // 3) filter หมวดหมู่
    if (activeCategories.size > 0) {
      if (!activeCategories.has(doc.category)) return false;
    }

    return true;
  });

  sortDocs();
  renderDownloads();
}

function sortDocs() {
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

  downloadGridEl.innerHTML = filteredDocs.map(doc => `
    <div class="download-card">
      <div class="download-main-info">
        <h3 class="download-file-title">${doc.title}</h3>
        <div class="download-meta">
          <span class="download-category">${doc.category}</span>
          ${doc.displayDate ? `<span class="download-date">${doc.displayDate}</span>` : ''}
          ${doc.size ? `<span class="download-size">${doc.size}</span>` : ''}
        </div>
        <p class="download-desc">${doc.description || ''}</p>
      </div>
      <div class="download-actions">
        <a href="#" class="btn-download" data-file="${doc.file}">
          ดาวน์โหลด
        </a>
      </div>
    </div>
  `).join('');
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
