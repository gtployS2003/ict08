let allTasks = [];
let filteredTasks = [];
let calendar = null;

document.addEventListener('DOMContentLoaded', () => {
    const mainEl = document.querySelector('.schedule-main');
    if (!mainEl) return;

    initSidebarTasks();
    setupAddTaskModal();
});

function initSidebarTasks() {
    const todayLabelEl = document.getElementById('sidebar-today-label');
    const todayListEl = document.getElementById('today-task-list');
    const pendingListEl = document.getElementById('pending-task-list');

    if (!todayListEl || !pendingListEl) return;

    const today = new Date();
    todayLabelEl.textContent = formatThaiDate(today);

    fetch('/assets/js/data-ex/tasks_with_time.json')
        .then(res => res.json())
        .then(tasks => {
            allTasks = tasks;
            filteredTasks = tasks.slice();

            renderTodayTasks(tasks, todayListEl, today);
            renderPendingTasks(tasks, pendingListEl);
            initCalendar(filteredTasks);
            initSearchAndFilter();
        })

        .catch(err => {
            console.error('โหลด tasks_with_time.json ไม่ได้:', err);
            todayListEl.innerHTML = '<p style="font-size:13px;color:#999;">ไม่สามารถโหลดข้อมูลงานได้</p>';
            pendingListEl.innerHTML = '<p style="font-size:13px;color:#999;">ไม่สามารถโหลดข้อมูลงานได้</p>';
        });
}

function renderTodayTasks(tasks, containerEl, todayDate) {
    containerEl.innerHTML = '';
    const todayStr = todayDate.toISOString().slice(0, 10);
    const todaysTasks = tasks.filter(t => {
        const start = t['วันที่เริ่มต้น'];
        const end = t['วันที่สิ้นสุด'] || start;
        if (!start) return false;
        return todayStr >= start && todayStr <= end;
    });
    document.getElementById('today-count').textContent = todaysTasks.length;
    if (todaysTasks.length === 0) {
        containerEl.innerHTML = '<p style="font-size:13px;color:#999;">วันนี้ยังไม่มีงานในระบบ</p>';
        return;
    }

    // เรียงตามเวลาเริ่มต้น
    todaysTasks.sort((a, b) => {
        const aStart = a['เวลาเริ่มต้น'] || a['เวลาเข้ารับคำร้อง'] || '';
        const bStart = b['เวลาเริ่มต้น'] || b['เวลาเข้ารับคำร้อง'] || '';
        return aStart.localeCompare(bStart);
    });

    todaysTasks.forEach(task => {
        const startTime = task['เวลาเริ่มต้น'] || task['เวลาเข้ารับคำร้อง'];
        const endTime = task['เวลาสิ้นสุด'];

        const timeText = startTime
            ? (endTime ? `${startTime} - ${endTime}` : startTime)
            : 'ไม่ระบุเวลา';

        const metaTextParts = [];
        if (task.ประเภท) {
            metaTextParts.push(
                task.ประเภท +
                (task['ประเภทย่อย'] && task['ประเภทย่อย'] !== '-' ? ` · ${task['ประเภทย่อย']}` : '')
            );
        }
        if (task.จังหวัด) metaTextParts.push(`จังหวัด${task.จังหวัด}`);
        if (task['ผู้ร้องขอ']) metaTextParts.push(`ผู้ร้องขอ: ${task['ผู้ร้องขอ']}`);

        const item = document.createElement('div');
        item.className = 'sidebar-task';

        const typeClass = getTaskTypeClass(task.ประเภท);
        if (typeClass) {
            item.classList.add(typeClass);
        }

        item.innerHTML = `
      <div class="sidebar-task-time">${timeText}</div>
      <div class="sidebar-task-title">${task['ชื่อ'] || 'ไม่ระบุชื่องาน'}</div>
      <div class="sidebar-task-meta">${metaTextParts.join(' · ')}</div>
    `;

        item.addEventListener('click', () => {
            openTaskModal(task);
        });
        containerEl.appendChild(item);
    });
}

function renderPendingTasks(tasks, containerEl) {
    containerEl.innerHTML = '';

    const pendingTasks = tasks.filter(t => t['สถานะ'] === 'รอการตรวจสอบ');

    const pendingCountEl = document.getElementById('pending-count');
    if (pendingCountEl) {
        pendingCountEl.textContent = pendingTasks.length;
    }

    if (pendingTasks.length === 0) {
        containerEl.innerHTML = '<p style="font-size:13px;color:#999;">ไม่มีงานที่รอการอนุมัติ</p>';
        return;
    }

    // เรียงตาม วันที่ร้องขอ + เวลาเข้ารับคำร้อง
    pendingTasks.sort((a, b) => {
        const aDate = a['วันที่ร้องขอ'] || '';
        const bDate = b['วันที่ร้องขอ'] || '';
        if (aDate !== bDate) return aDate.localeCompare(bDate);

        const aTime = a['เวลาเข้ารับคำร้อง'] || '';
        const bTime = b['เวลาเข้ารับคำร้อง'] || '';
        return aTime.localeCompare(bTime);
    });

    pendingTasks.forEach(task => {
        const reqDate = task['วันที่ร้องขอ'] || '';
        const reqTime = task['เวลาเข้ารับคำร้อง'] || '';

        // ใช้ "วันที่ร้องขอ + เวลาเข้ารับคำร้อง" เป็นบรรทัดเวลา
        let timeText = 'ไม่ระบุเวลา';
        if (reqDate && reqTime) {
            timeText = `${formatThaiDateString(reqDate)} ${reqTime}`;
        } else if (reqDate) {
            timeText = formatThaiDateString(reqDate);
        } else if (reqTime) {
            timeText = reqTime;
        }

        const startDate = task['วันที่เริ่มต้น'] || '';
        const endDate = task['วันที่สิ้นสุด'] || '';

        let betweenText = '';
        const startThai = startDate ? formatThaiDateString(startDate) : '';
        const endThai = endDate ? formatThaiDateString(endDate) : '';

        // ===== เงื่อนไขใหม่: ถ้าวันเดียวกัน ให้แสดงแค่วันเดียว =====
        if (startThai && endThai) {
            if (startDate === endDate) {
                // วันเดียวกัน
                betweenText = `ในวันที่ ${startThai}`;
            } else {
                // ต่างวัน
                betweenText = `ในวันที่ ${startThai} - ${endThai}`;
            }
        }
        else if (startThai) {
            betweenText = `เริ่ม ${startThai}`;
        }
        else if (endThai) {
            betweenText = `สิ้นสุด ${endThai}`;
        }

        const metaTextParts = [];
        if (task.ประเภท) metaTextParts.push(task.ประเภท);
        if (task.จังหวัด) metaTextParts.push(`จังหวัด${task.จังหวัด}`);
        if (task['ผู้ร้องขอ']) metaTextParts.push(`ผู้ร้องขอ: ${task['ผู้ร้องขอ']}`);

        const item = document.createElement('div');
        item.className = 'sidebar-task pending';
        const typeClass = getTaskTypeClass(task.ประเภท);
        if (typeClass) {
            item.classList.add(typeClass);
            item.innerHTML = `
      <div class="sidebar-task-time">${timeText}</div>
      <div class="sidebar-task-title">${task['ชื่อ'] || 'ไม่ระบุชื่องาน'}</div>
      ${betweenText ? `<div class="sidebar-task-between">${betweenText}</div>` : ''}
      <div class="sidebar-task-meta">${metaTextParts.join(' · ')}</div>
    `;
            item.addEventListener('click', () => {
                openTaskModal(task);
            });
            containerEl.appendChild(item);
        }
    });

}

function formatThaiDate(date) {
    const thMonths = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    const d = date.getDate();
    const m = thMonths[date.getMonth()];
    const y = date.getFullYear() + 543;
    return `${d} ${m} ${y}`;
}

function formatThaiDateString(dateStr) {
    if (!dateStr) return ''; // กัน null/undefined

    const months = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];

    // แปลง "2025-11-24" → Date object
    const d = new Date(dateStr + "T00:00:00");

    if (isNaN(d)) return dateStr; // กรณีวันที่ผิดรูปแบบ

    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear() + 543;

    return `${day} ${month} ${year}`;
}

function initCalendar(tasks) {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl || typeof FullCalendar === 'undefined') return;

    // ถ้ามี calendar เดิมอยู่แล้วให้ destroy ก่อน
    if (calendar) {
        calendar.destroy();
    }

    const events = mapTasksToEvents(tasks);

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'th',
        height: 650,
        with: '100%',
        expandRows: true,
        handleWindowResize: true,
        events,

        // ไม่ให้ FullCalendar สร้าง header เอง
        headerToolbar: false,

        // อัปเดตชื่อเดือนทุกครั้งที่เปลี่ยนเดือน
        datesSet(info) {
            const titleEl = document.getElementById('calendar-month');
            if (!titleEl) return;

            const thMonths = [
                'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
            ];

            // ใช้วันที่อ้างอิงของ view (ไม่ใช่วันเริ่ม grid)
            const viewDate = info.view.currentStart || info.start;
            const monthName = thMonths[viewDate.getMonth()];
            const yearBE = viewDate.getFullYear() + 543;

            titleEl.textContent = `${monthName} ${yearBE}`;
        },

        eventClick(info) {
            const task = info.event.extendedProps;
            task.id = info.event.id;
            openTaskModal(task);
        },

        eventDidMount(info) {
            const task_type = info.event.extendedProps['ประเภท'];
            const cls = getTaskTypeClass(task_type);
            if (cls) {
                info.el.classList.add(cls);
            }
        },

    });

    calendar.render();

    setupCalendarToolbar();
}

function setupCalendarToolbar() {
    const btnToday = document.getElementById('calendar-today');
    const btnPrev = document.getElementById('calendar-prev');
    const btnNext = document.getElementById('calendar-next');

    if (!btnToday || !btnPrev || !btnNext || !calendar) return;

    btnToday.onclick = () => calendar.today();
    btnPrev.onclick = () => calendar.prev();
    btnNext.onclick = () => calendar.next();
}

function mapTasksToEvents(tasks) {
    return tasks.map(task => {
        const startDate = task['วันที่เริ่มต้น'] || task['วันที่ร้องขอ'];
        const endDate = task['วันที่สิ้นสุด'] || startDate;
        const endForCalendar = endDate ? addOneDay(endDate) : undefined;

        return {
            id: String(task.id),
            title: task['ชื่อ'] || 'ไม่ระบุชื่องาน',
            start: startDate,        // วันที่เริ่มต้นจริง
            end: endForCalendar,     // วันถัดจาก "วันที่สิ้นสุด"
            allDay: true,
            extendedProps: task
        };
    });
}

function addOneDay(dateStr) {
    // dateStr รูปแบบ "YYYY-MM-DD"
    const [y, m, d] = dateStr.split('-').map(Number);

    const date = new Date(y, m - 1, d);  // ใช้ local time
    date.setDate(date.getDate() + 1);    // +1 วัน

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;    // คืนค่าเป็นสตริง ISO เดิม
}

function initSearchAndFilter() {
    const searchInput = document.getElementById('schedule-search-input');
    const searchClear = document.getElementById('schedule-search-clear');
    const filterToggle = document.getElementById('schedule-filter-toggle');
    const filterOverlay = document.getElementById('schedule-filter-overlay');
    const applyBtn = document.querySelector('.schedule-filter-apply');
    const resetBtn = document.querySelector('.schedule-filter-clear');

    if (!searchInput) return;

    filterToggle?.addEventListener('click', () => {
        filterOverlay.classList.add('open');
    });

    filterOverlay?.addEventListener('click', (e) => {
        if (e.target === filterOverlay) {
            filterOverlay.classList.remove('open');
        }
    });

    searchInput.addEventListener('input', () => applySearchAndFilter());
    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        applySearchAndFilter();
    });

    setupAllCheckboxGroup('schedule-type-all', '.schedule-filter-type');
    setupAllCheckboxGroup('schedule-subtype-all', '.schedule-filter-subtype');
    setupAllCheckboxGroup('schedule-province-all', '.schedule-filter-province');
    setupAllCheckboxGroup('schedule-status-all', '.schedule-filter-status');

    applyBtn?.addEventListener('click', () => {
        applySearchAndFilter();
        filterOverlay.classList.remove('open');
    });

    resetBtn?.addEventListener('click', () => {

        document
            .querySelectorAll('.schedule-filter-type, .schedule-filter-subtype, .schedule-filter-province, .schedule-filter-status')
            .forEach(cb => cb.checked = false);

        ['schedule-type-all', 'schedule-subtype-all', 'schedule-province-all', 'schedule-status-all']
            .forEach(id => document.getElementById(id).checked = true);

        applySearchAndFilter();
    });

    function applySearchAndFilter() {
        const q = searchInput.value.trim().toLowerCase();
        const typesSelected = getCheckedValues('.schedule-filter-type', 'schedule-type-all');
        const subtypesSelected = getCheckedValues('.schedule-filter-subtype', 'schedule-subtype-all');
        const provincesSelected = getCheckedValues('.schedule-filter-province', 'schedule-province-all');
        const statusSelected = getCheckedValues('.schedule-filter-status', 'schedule-status-all');

        filteredTasks = allTasks.filter(task => {

            // ----- SEARCH -----
            if (q) {
                const fields = [
                    task['ชื่อ'],
                    task['รายละเอียด'],
                    task['ผู้ร้องขอ'],
                    task['วันที่เริ่มต้น'],
                    task['วันที่ร้องขอ'],
                    (task['คนเข้าร่วม'] || []).join(' ')
                ];

                const match = fields.some(v => String(v || '').toLowerCase().includes(q));
                if (!match) return false;
            }

            // ----- ประเภท -----
            if (typesSelected.length && !typesSelected.includes(task['ประเภท'])) return false;

            // ----- ประเภทย่อย -----
            if (subtypesSelected.length && !subtypesSelected.includes(task['ประเภทย่อย'])) return false;

            // ----- จังหวัด -----
            if (provincesSelected.length && !provincesSelected.includes(task['จังหวัด'])) return false;

            // ----- สถานะ -----
            if (statusSelected.length && !statusSelected.includes(task['สถานะ'])) return false;

            return true;
        });

        if (calendar) {
            calendar.removeAllEvents();
            calendar.addEventSource(mapTasksToEvents(filteredTasks));
        }
    }
}

function setupAllCheckboxGroup(allId, itemSelector) {
    const allBox = document.getElementById(allId);
    const items = document.querySelectorAll(itemSelector);
    if (!allBox || !items.length) return;

    // ถ้าเลือก "ทั้งหมด" → ยกเลิก checkbox อื่น
    allBox.addEventListener('change', () => {
        if (allBox.checked) {
            items.forEach(cb => {
                if (cb !== allBox) cb.checked = false;
            });
        }
    });

    // ถ้าเลือก checkbox อื่น → ยกเลิก "ทั้งหมด"
    items.forEach(cb => {
        if (cb === allBox) return;
        cb.addEventListener('change', () => {
            if (cb.checked) {
                allBox.checked = false;
            }
        });
    });
}

function getCheckedValues(selector, allId) {
    const allBox = document.getElementById(allId);
    const allChecked = allBox && allBox.checked;

    // ถ้ายังเป็น "ทั้งหมด" → ไม่ filter กลุ่มนั้น
    if (allChecked) return [];

    const boxes = Array.from(document.querySelectorAll(selector))
        .filter(cb => cb.id !== allId && cb.checked);

    // ถ้าไม่มีอันไหนเลือกเลย → ถือว่าไม่ filter
    if (!boxes.length) return [];

    return boxes.map(cb => cb.value);
}

function getTaskTypeClass(taskType) {
    switch (taskType) {
        case 'เชื่อมโยงเครือข่าย':
            return 'event-type-network';
        case 'ประสานข้อมูล':
            return 'event-type-database';
        case 'แนะแนวด้านเทคโนโลยี':
            return 'event-type-guidance';
        case 'ติดตามและประเมินผล':
            return 'event-type-monitoring';
        case 'สนับสนุนอุปกรณ์':
            return 'event-type-support';
        case 'ถวายความปลอดภัย':
            return 'event-type-security';
        case 'ธุรการ/พัสดุ':
            return 'event-type-administration';
        case 'ความปลอดภัยเครือข่าย':
            return 'event-type-cybersecurity';
        case 'วิดีทัศน์ทางไกล':
            return 'event-type-videoconference';
        case 'ดาวเทียมวิทยุ':
            return 'event-type-satellite';
        case 'CCTV':
            return 'event-type-cctv';
        case 'งานอื่นๆ':
            return 'event-type-other';
        default:
            return '';
    }
}

function getStatusStepsForTask(task) {
    const type = task['ประเภท'];
    const status = task['สถานะ'] || '';

    // วิดีทัศน์ทางไกล: ใช้ชุดสถานะพิเศษ
    if (type === 'วิดีทัศน์ทางไกล') {
        return [
            { key: 'รอการตรวจสอบ', label: 'รอการตรวจสอบ' },
            { key: 'อนุมัติ', label: 'อนุมัติโดยเจ้าหน้าที่' },
            { key: 'ได้รับลิงก์การประชุม', label: 'ได้รับลิงก์การประชุม' },
            { key: 'กำลังดำเนินการ', label: 'กำลังดำเนินการ' },
            { key: 'เสร็จสิ้น', label: 'เสร็จสิ้น' },
            { key: 'ยกเลิก', label: 'ยกเลิก' },
        ];
    }

    // งานอื่น ๆ ทั่วไป
    return [
        { key: 'รอการตรวจสอบ', label: 'รอการตรวจสอบ' },
        { key: 'กำลังดำเนินการ', label: 'กำลังดำเนินการ' },
        { key: 'เสร็จสิ้น', label: 'เสร็จสิ้น' },
        { key: 'ยกเลิก', label: 'ยกเลิก' },
    ];
}

function renderStatusSteps(container, task) {
    const allSteps = getStatusStepsForTask(task);
    const currentStatus = task['สถานะ'] || '';
    container.innerHTML = '';

    // หาตำแหน่ง step ปัจจุบัน
    let currentIndex = allSteps.findIndex(s => currentStatus.includes(s.key));
    if (currentIndex === -1) currentIndex = 0;

    allSteps.forEach((step, index) => {
        const stepEl = document.createElement('div');
        stepEl.className = 'status-step';

        let stateClass = 'status-step--future';
        if (index < currentIndex) stateClass = 'status-step--done';
        else if (index === currentIndex) stateClass = 'status-step--current';

        stepEl.classList.add(stateClass);

        stepEl.innerHTML = `
          <div class="status-step-indicator">
            <div class="status-step-circle"></div>
            ${index < allSteps.length - 1 ? '<div class="status-step-line"></div>' : ''}
          </div>
          <div class="status-step-text">
            <div class="status-step-label">${step.label}</div>
          </div>
        `;

        container.appendChild(stepEl);
    });
}

function openTaskModal(task) {
    currentTask = task;
    const overlay = document.getElementById('task-modal-overlay');
    if (!overlay) return;

    // เติมข้อมูลพื้นฐาน
    document.getElementById('task-modal-title').textContent =
        task['ชื่อ'] || 'ไม่ระบุชื่องาน';

    document.getElementById('task-modal-desc').textContent =
        task['รายละเอียด'] || '-';

    const typeText = task['ประเภท']
        ? task['ประเภท'] + (task['ประเภทย่อย'] && task['ประเภทย่อย'] !== '-'
            ? ` / ${task['ประเภทย่อย']}`
            : '')
        : '-';
    document.getElementById('task-modal-type').textContent = typeText;

    document.getElementById('task-modal-requester').textContent =
        task['ผู้ร้องขอ'] || '-';

    const part = Array.isArray(task['คนเข้าร่วม'])
        ? task['คนเข้าร่วม'].join(', ')
        : (task['คนเข้าร่วม'] || '-');
    document.getElementById('task-modal-participants').textContent = part;

    document.getElementById('task-modal-province').textContent =
        task['จังหวัด'] || '-';

    const reqDate = task['วันที่ร้องขอ']
        ? formatThaiDateString(task['วันที่ร้องขอ'])
        : '-';
    document.getElementById('task-modal-request-date').textContent = reqDate;

    const startDate = task['วันที่เริ่มต้น'];
    const endDate = task['วันที่สิ้นสุด'] || startDate;

    let rangeText = '-';
    if (startDate && endDate) {
        if (startDate === endDate) {
            rangeText = formatThaiDateString(startDate);
        } else {
            rangeText = `${formatThaiDateString(startDate)} - ${formatThaiDateString(endDate)}`;
        }
    } else if (startDate) {
        rangeText = formatThaiDateString(startDate);
    }

    document.getElementById('task-modal-work-range').textContent = rangeText;

    // เวลา
    const tStart = task['เวลาเริ่มต้น'] || task['เวลาเข้ารับคำร้อง'];
    const tEnd = task['เวลาสิ้นสุด'];

    let timeRange = '-';
    if (tStart && tEnd) {
        timeRange = `${tStart} - ${tEnd}`;
    } else if (tStart) {
        timeRange = tStart;
    }
    document.getElementById('task-modal-time-range').textContent = timeRange;

    document.getElementById('task-modal-status').textContent =
        task['สถานะ'] || '-';

    // สถานะแบบขั้นตอน
    const statusContainer = document.getElementById('task-status-steps');
    renderStatusSteps(statusContainer, task);

    // เก็บ id เผื่อใช้ตอน edit/delete (ตอนนี้ prototype: ยังไม่เชื่อม backend)
    overlay.dataset.taskId = task.id;

    overlay.classList.add('open');
}

function closeTaskModal() {
    const overlay = document.getElementById('task-modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    overlay.dataset.taskId = '';
}

function setupAddTaskModal() {
  const overlay   = document.getElementById('task-add-overlay');
  const openBtn   = document.getElementById('schedule-add-task-toggle');
  const closeBtns = overlay ? overlay.querySelectorAll('.task-add-close') : [];

  if (!overlay || !openBtn) return;

  // เปิด popup
  openBtn.addEventListener('click', () => {
    // default: สร้างโดย = user ปัจจุบัน (ถ้ามีจาก auth.js)
    const createdByInput = document.getElementById('add-created-by');
    if (createdByInput) {
      if (window.currentUserName) {
        createdByInput.value = window.currentUserName;
      }
    }

    overlay.classList.add('open');
  });

  // ปิด popup
  closeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.classList.remove('open');
    });
  });

  // ปิดเมื่อคลิกนอกกล่อง
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('open');
    }
  });

  const form = document.getElementById('task-add-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());

    // ผู้เข้าร่วม (checkbox หลายตัว)
    const participantBoxes = document.querySelectorAll('.add-participant:checked');
    data['คนเข้าร่วม'] = Array.from(participantBoxes).map(cb => cb.value);

    // สถานะเริ่มต้นบังคับ = รอการตรวจสอบ
    data['สถานะ'] = 'รอการตรวจสอบ';

    // id ชั่วคราว (Prototype)
    data.id = Date.now();

    // แปลงไฟล์แนบเป็นชื่อไฟล์ (prototype)
    const fileInput = document.getElementById('add-file');
    if (fileInput && fileInput.files[0]) {
      data['เอกสารแนบ'] = fileInput.files[0].name;
    }

    // เพิ่มเข้า allTasks / filteredTasks แล้ว refresh UI
    allTasks.push(data);
    filteredTasks = allTasks.slice();

    // รีเฟรช sidebar + calendar
    const today = new Date();
    renderTodayTasks(allTasks, document.getElementById('today-task-list'), today);
    renderPendingTasks(allTasks, document.getElementById('pending-task-list'));
    initCalendar(filteredTasks);

    // ปิด popup + ล้างฟอร์ม
    form.reset();
    participantBoxes.forEach(cb => (cb.checked = false));
    overlay.classList.remove('open');

    alert('บันทึกงานสำหรับบุคคลในหน่วยงาน (ตัวอย่าง prototype)');
  });
}

function resetAddTaskForm() {
    const form = document.getElementById('task-add-form');
    if (!form) return;

    form.reset();

    // ตั้งค่า default วันที่เป็นวันนี้
    const todayStr = new Date().toISOString().slice(0, 10);
    const req = document.getElementById('add-request-date');
    const start = document.getElementById('add-start-date');
    const end = document.getElementById('add-end-date');

    if (req && !req.value) req.value = todayStr;
    if (start && !start.value) start.value = todayStr;
    if (end && !end.value) end.value = todayStr;
}


// เรียกตอน DOM พร้อม
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('task-modal-overlay');
    const btnClose = document.getElementById('task-modal-close');
    const btnCloseFooter = document.getElementById('task-modal-close-footer');
    const btnDelete = document.getElementById('task-modal-delete');
    const btnEdit = document.getElementById('task-modal-edit');

    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeTaskModal();
            }
        });
    }

    btnClose?.addEventListener('click', closeTaskModal);
    btnCloseFooter?.addEventListener('click', closeTaskModal);

    btnDelete?.addEventListener('click', () => {
        const taskId = overlay?.dataset.taskId;
        alert(`(Prototype) ลบงาน id = ${taskId}`);
        // ภายหลังค่อยเชื่อมกับ backend เพื่อลบจริง
    });

    btnEdit?.addEventListener('click', () => {
        const taskId = overlay?.dataset.taskId;
        const editUrl = `/schedule/edit.html?id=${encodeURIComponent(taskId)}`;
        window.location.href = editUrl;
    });
});



