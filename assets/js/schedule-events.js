// =============== ตัวแปรหลัก ===============
let allItems = [];
let tbodyEl = null;

document.addEventListener('DOMContentLoaded', () => {
    tbodyEl = document.querySelector('#event-list-table-body');
    if (!tbodyEl) return;

    const DATA_URL = '/assets/js/data-ex/tasks_with_time.json';

    fetch(DATA_URL)
        .then(res => res.json())
        .then(items => {
            allItems = items || [];
            applyFilters();      // แสดงทั้งหมดรอบแรก
            setupFilters();      // ผูก event กับปุ่ม/ตัวกรอง
            setupAddTaskForm();
            setupTaskModalBase();
        })
        .catch(err => {
            console.error('โหลดข้อมูลงานไม่สำเร็จ', err);
            tbodyEl.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align:center; color:#b91c1c;">
                        ไม่สามารถโหลดข้อมูลงานได้ กรุณาลองใหม่อีกครั้ง
                    </td>
                </tr>
            `;
        });
});


// =============== การกรอง + ค้นหา ===============
function setupFilters() {
    const searchInput = document.getElementById('schedule-search-input');
    const searchClear = document.getElementById('schedule-search-clear');
    const filterToggle = document.getElementById('schedule-filter-toggle');
    const filterOverlay = document.getElementById('schedule-filter-overlay');
    const filterApply = document.querySelector('.schedule-filter-apply');
    const filterClear = document.querySelector('.schedule-filter-clear');

    // ค้นหาแบบพิมพ์แล้วกรองทันที
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            applyFilters();
        });
    }

    // ปุ่มล้างช่องค้นหา
    if (searchClear && searchInput) {
        searchClear.addEventListener('click', () => {
            searchInput.value = '';
            applyFilters();
        });
    }

    // เปิด/ปิด popup ตัวกรอง
    if (filterToggle && filterOverlay) {
        filterToggle.addEventListener('click', () => {
            filterOverlay.classList.toggle('open');
        });

        // คลิกพื้นหลัง overlay เพื่อปิด
        filterOverlay.addEventListener('click', (e) => {
            if (e.target === filterOverlay) {
                filterOverlay.classList.remove('open');
            }
        });
    }

    // ปุ่ม "ใช้ตัวกรอง"
    if (filterApply && filterOverlay) {
        filterApply.addEventListener('click', () => {
            applyFilters();
            filterOverlay.classList.remove('open');
        });
    }

    // ปุ่ม "ล้างตัวกรอง"
    if (filterClear) {
        filterClear.addEventListener('click', () => {
            resetFilters();
            applyFilters();
        });
    }

    // ============ จัดการ checkbox "ทั้งหมด" ในแต่ละกลุ่ม ============
    setupFilterGroup('schedule-type-all', '.schedule-filter-type');
    setupFilterGroup('schedule-subtype-all', '.schedule-filter-subtype');
    setupFilterGroup('schedule-province-all', '.schedule-filter-province');
    setupFilterGroup('schedule-status-all', '.schedule-filter-status');
}

// กด "ทั้งหมด" = เช็คทั้งหมดตัวนี้ตัวเดียว / กดตัวอื่น = ยกเลิก "ทั้งหมด"
function setupFilterGroup(allId, selector) {
    const allCheckbox = document.getElementById(allId);
    const boxes = Array.from(document.querySelectorAll(selector));

    if (!allCheckbox || boxes.length === 0) return;

    // กด "ทั้งหมด"
    allCheckbox.addEventListener('change', () => {
        if (allCheckbox.checked) {
            boxes.forEach(cb => {
                if (cb !== allCheckbox) cb.checked = false;
            });
            applyFilters();
        }
    });

    // กด checkbox ย่อย
    boxes.forEach(cb => {
        if (cb === allCheckbox) return;
        cb.addEventListener('change', () => {
            if (cb.checked) {
                allCheckbox.checked = false;
            } else {
                // ถ้าไม่มีอันไหนถูกเลย → กลับไปที่ "ทั้งหมด"
                const anyChecked = boxes.some(b => b !== allCheckbox && b.checked);
                if (!anyChecked) allCheckbox.checked = true;
            }
            applyFilters();
        });
    });
}

// รีเซ็ตตัวกรองทั้งหมดกลับเป็น "ทั้งหมด"
function resetFilters() {
    const groups = [
        { allId: 'schedule-type-all', selector: '.schedule-filter-type' },
        { allId: 'schedule-subtype-all', selector: '.schedule-filter-subtype' },
        { allId: 'schedule-province-all', selector: '.schedule-filter-province' },
        { allId: 'schedule-status-all', selector: '.schedule-filter-status' },
    ];

    groups.forEach(g => {
        const allCheckbox = document.getElementById(g.allId);
        const boxes = Array.from(document.querySelectorAll(g.selector));
        if (!allCheckbox || boxes.length === 0) return;

        allCheckbox.checked = true;
        boxes.forEach(cb => {
            if (cb !== allCheckbox) cb.checked = false;
        });
    });

    const searchInput = document.getElementById('schedule-search-input');
    if (searchInput) searchInput.value = '';
}

// ใช้ตัวกรองทั้งหมดกับ allItems แล้ว render ใหม่
function applyFilters() {
    if (!tbodyEl) return;
    if (!Array.isArray(allItems) || allItems.length === 0) {
        renderTable([], tbodyEl);
        return;
    }

    const searchInput = document.getElementById('schedule-search-input');
    const searchText = (searchInput ? searchInput.value : '').trim().toLowerCase();

    const selectedTypes = getCheckedValues('.schedule-filter-type', 'schedule-type-all');
    const selectedSubtypes = getCheckedValues('.schedule-filter-subtype', 'schedule-subtype-all');
    const selectedProvinces = getCheckedValues('.schedule-filter-province', 'schedule-province-all');
    const selectedStatuses = getCheckedValues('.schedule-filter-status', 'schedule-status-all');

    const filtered = allItems.filter(item => {
        // ประเภทหลัก
        if (selectedTypes.length && !selectedTypes.includes(item['ประเภท'])) {
            return false;
        }

        // ประเภทย่อย
        const subtype = item['ประเภทย่อย'] || '-';
        if (selectedSubtypes.length && !selectedSubtypes.includes(subtype)) {
            return false;
        }

        // จังหวัด
        const province = item['จังหวัด'] || '';
        if (selectedProvinces.length && !selectedProvinces.includes(province)) {
            return false;
        }

        // สถานะ (ใช้ค่าในฟิลด์ "สถานะ" ตรง ๆ)
        const status = item['สถานะ'] || '';
        if (selectedStatuses.length && !selectedStatuses.includes(status)) {
            return false;
        }

        // ค้นหาข้อความ
        if (searchText) {
            const participants = formatParticipants(item['คนเข้าร่วม']);
            const haystack = (
                (item['ชื่อ'] || '') + ' ' +
                (item['รายละเอียด'] || '') + ' ' +
                (item['ผู้ร้องขอ'] || '') + ' ' +
                participants + ' ' +
                (item['จังหวัด'] || '')
            ).toLowerCase();

            if (!haystack.includes(searchText)) {
                return false;
            }
        }

        return true;
    });

    renderTable(filtered, tbodyEl);
}

// ดึงค่าที่ถูกเลือกจาก checkbox กลุ่มหนึ่ง (ถ้า "ทั้งหมด" ถูกเลือก → return [])
function getCheckedValues(selector, allId) {
    const allCheckbox = document.getElementById(allId);
    const boxes = Array.from(document.querySelectorAll(selector));
    if (!boxes.length) return [];

    if (allCheckbox && allCheckbox.checked) {
        return []; // หมายถึงไม่กรอง (ทั้งหมด)
    }

    return boxes
        .filter(cb => cb.checked && cb.id !== allId)
        .map(cb => cb.value);
}


// =============== การแสดงผลตาราง ===============
function renderTable(items, tbody) {
    tbody.innerHTML = '';

    if (!Array.isArray(items) || items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align:center; color:#6b7280;">
                    ยังไม่มีข้อมูลงานในระบบ
                </td>
            </tr>
        `;
        return;
    }

    items.forEach((item, index) => {
        const tr = document.createElement('tr');

        const participants = formatParticipants(item['คนเข้าร่วม']);
        const startDate = formatDateTime(item['วันที่เริ่มต้น'], item['เวลาเริ่มต้น']);
        const endDate = formatDateTime(item['วันที่สิ้นสุด'], item['เวลาสิ้นสุด']);

        tr.innerHTML = `
            <td>${index + 1}</td>

            <td>
                ${`<span class="job-title-link">${escapeHtml(item['ชื่อ'] || '-')}</span>`
            }
            </td>

            <td>
                <span class="task-type-pill ${getTaskTypeClass(item['ประเภท'])}">
                    ${escapeHtml(item['ประเภท'] || '-')}
                </span>
                ${item['ประเภทย่อย'] && item['ประเภทย่อย'] !== '-'
                ? '<span class="task-type-sub">' + escapeHtml(item['ประเภทย่อย']) + '</span>'
                : ''
            }
            </td>

            <td>${escapeHtml(item['ผู้ร้องขอ'] || '-')}</td>
            <td>${escapeHtml(participants)}</td>
            <td>${escapeHtml(item['จังหวัด'] || '-')}</td>
            <td>${escapeHtml(startDate)}</td>
            <td>${escapeHtml(endDate)}</td>
            <td>${renderStatusFlow(item)}</td>
        `;

        if (item.id != null) {
            tr.dataset.taskId = String(item.id);
        }

        // คลิกทั้งแถวเพื่อเปิด popup (ยกเว้นถ้าคลิกปุ่ม/ลิงก์อื่นในอนาคต)
        tr.addEventListener('click', (e) => {
            // กันกรณีอนาคต ถ้ามีปุ่มในแถวไม่อยากให้เปิด popup
            if (e.target.closest('button') || e.target.closest('a')) return;

            openTaskModal(item);
        });

        tbody.appendChild(tr);
    });
}

// =============== helper เล็ก ๆ ===============
function formatParticipants(value) {
    if (!value) return '-';
    if (Array.isArray(value)) {
        if (value.length === 0) return '-';
        return value.join(', ');
    }
    return value;
}

function formatDateTime(dateStr, timeStr) {
    if (!dateStr && !timeStr) return '-';
    if (!dateStr) return timeStr || '-';
    if (!timeStr) return dateStr;
    return `${dateStr} ${timeStr}`;
}

// ป้องกัน XSS เวลาแสดงข้อความจาก JSON
function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// สีประเภทงาน
function getTaskTypeClass(taskType) {
    switch (taskType) {
        case 'เชื่อมโยงเครือข่าย':
            return 'event-list-type-network';
        case 'ประสานข้อมูล':
            return 'event-list-type-database';
        case 'แนะแนวด้านเทคโนโลยี':
            return 'event-list-type-guidance';
        case 'ติดตามและประเมินผล':
            return 'event-list-type-monitoring';
        case 'สนับสนุนอุปกรณ์':
            return 'event-list-type-support';
        case 'ถวายความปลอดภัย':
            return 'event-list-type-security';
        case 'ธุรการ/พัสดุ':
            return 'event-list-type-administration';
        case 'ความปลอดภัยเครือข่าย':
            return 'event-list-type-cybersecurity';
        case 'วิดีทัศน์ทางไกล':
            return 'event-list-type-videoconference';
        case 'ดาวเทียมวิทยุ':
            return 'event-list-type-satellite';
        case 'CCTV':
            return 'event-list-type-cctv';
        case 'งานอื่นๆ':
            return 'event-list-type-other';
        default:
            return '';
    }
}

// =============== Status Flow UI ===============
function renderStatusFlow(item) {
    const type = item['ประเภท'];
    const nowStatus = item['สถานะ'];

    let steps = [];

    // วิดีทัศน์ทางไกล
    if (type === 'วิดีทัศน์ทางไกล') {
        steps = [
            'รอการตรวจสอบ',
            'อนุมัติโดยเจ้าหน้าที่',
            'ได้รับลิงก์การประชุม',
            'กำลังดำเนินการ',
            'เสร็จสิ้น',
            'ยกเลิก'
        ];
    } else {
        // งานทั่วไป
        steps = [
            'รอการตรวจสอบ',
            'กำลังดำเนินการ',
            'เสร็จสิ้น',
            'ยกเลิก'
        ];
    }

    let html = `<div class="status-flow">`;
    const nowIndex = steps.indexOf(nowStatus);

    steps.forEach((step, i) => {
        if (nowIndex === -1) {
            // ถ้าไม่รู้จักสถานะ → ให้เป็น pending หมด
            html += `<div class="status-step">${step}</div>`;
            return;
        }

        if (i < nowIndex) {
            html += `<div class="status-step completed">${step}</div>`;
        } else if (i === nowIndex) {
            html += `<div class="status-step active">${step}</div>`;
        } else {
            html += `<div class="status-step">${step}</div>`;
        }
    });

    html += `</div>`;
    return html;
}

// ==========================
// เพิ่มงานใหม่จาก popup
// ==========================
function setupAddTaskForm() {
    const overlay = document.getElementById('task-add-overlay');
    const openBtn = document.getElementById('schedule-add-task-toggle');
    const closeTopBtn = document.getElementById('task-add-close-top');
    const closeBtns = document.querySelectorAll('.task-add-close, .task-add-cancel');
    const saveBtn = document.querySelector('.task-add-save');
    const form = document.getElementById('task-add-form');

    if (!overlay || !openBtn || !form || !saveBtn) return;

    // เปิด popup
    openBtn.addEventListener('click', () => {
        resetAddTaskForm(form);
        overlay.classList.add('open');
    });

    // ปิด popup
    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            overlay.classList.remove('open');
        });
    });

    // คลิกพื้นหลัง overlay เพื่อปิด
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('open');
        }
    });

    // กดปุ่มบันทึก
    saveBtn.addEventListener('click', (e) => {
        e.preventDefault(); // กัน submit แบบเดิม
        handleAddTaskSubmit(form, overlay);
    });
}

// ล้างฟอร์ม + reset ค่าเริ่มต้น
function resetAddTaskForm(form) {
    form.reset();

    // สถานะเริ่มต้น
    const statusInput = document.getElementById('add-status');
    if (statusInput) statusInput.value = 'รอการตรวจสอบ';

    // เคลียร์ checkbox ผู้เข้าร่วม
    document.querySelectorAll('.add-participant').forEach(cb => {
        cb.checked = false;
    });

    // ถ้าอยาก preset วันที่วันนี้ / จังหวัด default ก็เซ็ตเพิ่มได้
}

// อ่านค่าจากฟอร์ม แล้วสร้าง object งานใหม่
function handleAddTaskSubmit(form, overlay) {
    const title = document.getElementById('add-title').value.trim();
    const desc = document.getElementById('add-desc').value.trim();
    const type = document.getElementById('add-type').value;
    const subtype = document.getElementById('add-subtype').value || '-';
    const createdBy = document.getElementById('add-created-by').value || 'ศูนย์เขต 8';
    const startDate = document.getElementById('add-start-date').value;
    const startTime = document.getElementById('add-start-time').value;
    const endDate = document.getElementById('add-end-date').value;
    const endTime = document.getElementById('add-end-time').value;
    const location = document.getElementById('add-location').value.trim();
    const province = document.getElementById('add-province').value;
    const link = document.getElementById('add-link').value.trim();
    const status = document.getElementById('add-status').value || 'รอการตรวจสอบ';

    // ผู้เข้าร่วม (array)
    const participants = Array.from(document.querySelectorAll('.add-participant:checked'))
        .map(cb => cb.value);

    // ตรวจ validate ขั้นพื้นฐาน
    if (!title || !type) {
        alert('กรุณากรอก "ชื่องาน" และ "ประเภทงาน"');
        return;
    }

    // สร้าง id ใหม่จาก max id เดิม + 1
    const newId = getNextTaskId();

    const newTask = {
        id: newId,
        'ชื่อ': title,
        'รายละเอียด': desc,
        'ประเภท': type,
        'ประเภทย่อย': subtype || '-',
        'ผู้ร้องขอ': createdBy,     // ใช้ "สร้างโดย" เป็นผู้ร้องขอไปก่อน
        'คนเข้าร่วม': participants,
        'จังหวัด': province || '',
        'สถานที่': location,
        'วันที่เริ่มต้น': startDate || '',
        'เวลาเริ่มต้น': startTime || '',
        'วันที่สิ้นสุด': endDate || '',
        'เวลาสิ้นสุด': endTime || '',
        'ลิงก์แนบ': link,
        'สถานะ': status
    };

    // เพิ่มเข้า allItems (ด้านบนสุดของรายการ)
    allItems.unshift(newTask);

    // รีเฟรชตารางด้วย filter ปัจจุบัน
    if (typeof applyFilters === 'function') {
        applyFilters();
    } else if (tbodyEl) {
        renderTable(allItems, tbodyEl);
    }

    // ปิด popup + ล้างฟอร์ม
    overlay.classList.remove('open');
    form.reset();
}

// หา id ถัดไปจาก allItems (max + 1)
function getNextTaskId() {
    if (!Array.isArray(allItems) || allItems.length === 0) return 1;
    const maxId = allItems.reduce((max, item) => {
        const v = typeof item.id === 'number' ? item.id : parseInt(item.id, 10);
        return isNaN(v) ? max : Math.max(max, v);
    }, 0);
    return maxId + 1;
}

function setupTaskModalBase() {
    const overlay = document.getElementById('task-modal-overlay');
    const closeTop = document.getElementById('task-modal-close');
    const closeFooter = document.getElementById('task-modal-close-footer');
    const editBtn = document.getElementById('task-modal-edit');

    if (!overlay) return;

    const close = () => overlay.classList.remove('open');

    if (closeTop) closeTop.addEventListener('click', close);
    if (closeFooter) closeFooter.addEventListener('click', close);

    // ปิดเมื่อคลิกที่พื้นหลังดำ
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            close();
        }
    });

    if (editBtn) {
        editBtn.addEventListener('click', () => {
            const taskId = overlay.dataset.currentTaskId;
            if (!taskId) {
                alert('ไม่พบรหัสงานที่จะใช้แก้ไข');
                return;
            }
            window.location.href = `edit.html?id=${encodeURIComponent(taskId)}`;
        });
    }


}

function openTaskModal(item) {
    const overlay = document.getElementById('task-modal-overlay');
    if (!overlay) return;

    // ดึง element ต่าง ๆ ใน popup
    const titleEl = document.getElementById('task-modal-title');
    const descEl = document.getElementById('task-modal-desc');
    const typeEl = document.getElementById('task-modal-type');
    const requesterEl = document.getElementById('task-modal-requester');
    const participantsEl = document.getElementById('task-modal-participants');
    const provinceEl = document.getElementById('task-modal-province');
    const requestDateEl = document.getElementById('task-modal-request-date');
    const workRangeEl = document.getElementById('task-modal-work-range');
    const timeRangeEl = document.getElementById('task-modal-time-range');
    const statusEl = document.getElementById('task-modal-status');
    const statusStepsEl = document.getElementById('task-status-steps');

    const title = item['ชื่อ'] || '-';
    const desc = item['รายละเอียด'] || '-';
    const type = item['ประเภท'] || '-';
    const subtype = item['ประเภทย่อย'] && item['ประเภทย่อย'] !== '-' ? ` / ${item['ประเภทย่อย']}` : '';
    const requester = item['ผู้ร้องขอ'] || '-';
    const province = item['จังหวัด'] || '-';
    const requestDate = item['วันที่ร้องขอ'] || '-';

    const workStart = item['วันที่เริ่มต้น'] || '';
    const workEnd = item['วันที่สิ้นสุด'] || '';
    const timeStart = item['เวลาเริ่มต้น'] || '';
    const timeEnd = item['เวลาสิ้นสุด'] || '';
    const status = item['สถานะ'] || '-';

    // ข้อมูลผู้เข้าร่วม
    const participants = formatParticipants(item['คนเข้าร่วม']);

    // ช่วงวันที่ปฏิบัติงาน
    let workRangeText = '-';
    if (workStart && workEnd) {
        workRangeText = (workStart === workEnd)
            ? workStart
            : `${workStart} - ${workEnd}`;
    } else if (workStart) {
        workRangeText = workStart;
    } else if (workEnd) {
        workRangeText = workEnd;
    }

    // ช่วงเวลา
    let timeRangeText = '-';
    if (timeStart && timeEnd) {
        timeRangeText = `${timeStart} - ${timeEnd}`;
    } else if (timeStart) {
        timeRangeText = timeStart;
    } else if (timeEnd) {
        timeRangeText = timeEnd;
    }

    // ใส่ค่าลง popup
    if (titleEl) titleEl.textContent = title;
    if (descEl) descEl.textContent = desc;
    if (typeEl) typeEl.textContent = type + subtype;
    if (requesterEl) requesterEl.textContent = requester;
    if (participantsEl) participantsEl.textContent = participants;
    if (provinceEl) provinceEl.textContent = province;
    if (requestDateEl) requestDateEl.textContent = requestDate;
    if (workRangeEl) workRangeEl.textContent = workRangeText;
    if (timeRangeEl) timeRangeEl.textContent = timeRangeText;
    if (statusEl) statusEl.textContent = status;

    // สถานะ process แนวตั้ง (ใช้ renderStatusFlow เดิมที่คุณมี)
    if (statusStepsEl) {
        statusStepsEl.innerHTML = renderStatusFlow(item);
    }

    // เก็บ id ปัจจุบันเผื่อใช้กับปุ่มแก้ไข/ลบ
    overlay.dataset.currentTaskId = item.id != null ? String(item.id) : '';

    // เปิด popup
    overlay.classList.add('open');
}


