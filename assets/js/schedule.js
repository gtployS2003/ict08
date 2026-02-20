/*
 * DEPRECATED
 * This file is no longer used by `schedule/calendar.html`.
 * The calendar page now uses `/ict8/assets/js/schedule-calendar.js` (search-only).
 *
 * The old contents of this file are intentionally commented out to prevent
 * syntax/runtime issues if it remains in the workspace.
 *

let allTasks = [];
let filteredTasks = [];
let calendar = null;
let currentTask = null;

let __provincesLoaded = false;
let __participantsLoaded = false;

function toIsoDate(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function mapApiEventToTask(ev) {
    const start = (ev?.start_datetime ? String(ev.start_datetime) : '').trim();
    const end = (ev?.end_datetime ? String(ev.end_datetime) : '').trim();

    const startDate = start ? start.slice(0, 10) : '';
    const endDate = end ? end.slice(0, 10) : (startDate || '');

    const participantNames = (ev?.participant_names ? String(ev.participant_names) : '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

    // request-derived fields (may be empty for internal events created by staff)
    const requestTypeName = (ev?.request_type_name ? String(ev.request_type_name) : '').trim();
    const requestSubTypeName = (ev?.request_sub_type_name ? String(ev.request_sub_type_name) : '').trim();
    const eventStatusName = (ev?.event_status_name ? String(ev.event_status_name) : '').trim();

    // Fallback for internal events (no request linkage)
    // NOTE: We map them to "งานอื่นๆ" so they can still be filtered using existing UI options.
    const isInternal = !ev?.request_id;
    const mainTypeForFilter = requestTypeName || (isInternal ? 'งานอื่นๆ' : '');
    const subTypeForFilter = requestSubTypeName || (isInternal ? '-' : '');
    const statusForFilter = eventStatusName || '';

    return {
        id: String(ev?.event_id ?? ''),
        'ชื่อ': ev?.title ?? '',
        'รายละเอียด': ev?.detail ?? '',
        'ตำแหน่งที่ตั้ง': ev?.location ?? '',
        'จังหวัด': ev?.province_name_th ?? '',
        'ประเภทงานหลัก': mainTypeForFilter,
        'ประเภทย่อย': subTypeForFilter,
        'สถานะ': statusForFilter,
        'ลิงค์เข้าประชุม': ev?.meeting_link ?? '',
        'หมายเหตุ': ev?.note ?? '',
        'คนเข้าร่วม': participantNames,
        'วันที่เริ่มต้น': startDate,
        'วันที่สิ้นสุด': endDate,
        __raw: ev,
        __isInternal: isInternal,
    };
}

async function fetchEventsForRange(fromDate, toDate) {
    const apiFetch = window.apiFetch;
    if (typeof apiFetch !== 'function') {
        throw new Error('missing apiFetch');
    }
    const res = await apiFetch(`/events?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`, { method: 'GET' });
    const rows = Array.isArray(res?.data) ? res.data : [];
    return rows.map(mapApiEventToTask);
}

async function refreshEventsForCurrentView() {
    if (!calendar) return;

    const view = calendar.view;
    const fromDate = toIsoDate(view.activeStart);
    // FullCalendar activeEnd is exclusive
    const toDate = toIsoDate(addDays(view.activeEnd, -1));

    const tasks = await fetchEventsForRange(fromDate, toDate);
    allTasks = tasks;
    filteredTasks = tasks.slice();

    // refresh sidebar today
    const today = new Date();
    renderTodayTasks(allTasks, document.getElementById('today-task-list'), today);

    // refresh calendar
    calendar.removeAllEvents();
    calendar.addEventSource(mapTasksToEvents(filteredTasks));

    // keep search/filter state if initialized
    if (typeof window.__scheduleApplySearchAndFilter === 'function') {
        window.__scheduleApplySearchAndFilter();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const mainEl = document.querySelector('.schedule-main');
    if (!mainEl) return;

    initSidebarTasks();
    setupAddTaskModal();
});

function setBodyModalOpen(isOpen) {
    document.body.classList.toggle('modal-open', Boolean(isOpen));
}

function syncBodyModalOpenState() {
    const anyOpen = Boolean(
        document.getElementById('task-add-overlay')?.classList.contains('open') ||
        document.getElementById('task-modal-overlay')?.classList.contains('open')
    );
    setBodyModalOpen(anyOpen);
}

function initSidebarTasks() {
    const todayLabelEl = document.getElementById('sidebar-today-label');
    const todayListEl = document.getElementById('today-task-list');
    const pendingListEl = document.getElementById('pending-task-list');

    if (!todayListEl || !pendingListEl) return;

    const today = new Date();
    todayLabelEl.textContent = formatThaiDate(today);

    // ✅ pending approvals: ดึงจาก DB (request ที่ status_code=pending)
    loadPendingRequests(pendingListEl);

    // init empty calendar first, then datesSet hook will load events
    allTasks = [];
    filteredTasks = [];
    renderTodayTasks([], todayListEl, today);
    initCalendar([]);
    initSearchAndFilter();
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

    // เรียงตามวันที่เริ่มต้น
    todaysTasks.sort((a, b) => {
        const aStart = a['วันที่เริ่มต้น'] || '';
        const bStart = b['วันที่เริ่มต้น'] || '';
        return aStart.localeCompare(bStart);
    });

    todaysTasks.forEach(task => {
        const metaTextParts = [];
        if (task['ตำแหน่งที่ตั้ง']) metaTextParts.push(task['ตำแหน่งที่ตั้ง']);
        if (task['จังหวัด']) metaTextParts.push(`จังหวัด${task['จังหวัด']}`);
        const parts = Array.isArray(task['คนเข้าร่วม']) ? task['คนเข้าร่วม'] : [];
        if (parts.length) metaTextParts.push(`ผู้เข้าร่วม: ${parts.slice(0, 3).join(', ')}${parts.length > 3 ? '…' : ''}`);

        const item = document.createElement('div');
        item.className = 'sidebar-task';

        item.innerHTML = `
            <div class="sidebar-task-time">ทั้งวัน</div>
      <div class="sidebar-task-title">${task['ชื่อ'] || 'ไม่ระบุชื่องาน'}</div>
      <div class="sidebar-task-meta">${metaTextParts.join(' · ')}</div>
    `;

        item.addEventListener('click', () => {
            openTaskModal(task);
        });
        containerEl.appendChild(item);
    });
}

function loadPendingRequests(containerEl) {
    if (!containerEl) return;

    containerEl.innerHTML = '<p style="font-size:13px;color:#999;">กำลังโหลดรายการรอการอนุมัติ...</p>';

    const apiFetch = window.apiFetch;
    if (typeof apiFetch !== 'function') {
        containerEl.innerHTML = '<p style="font-size:13px;color:#999;">ไม่สามารถโหลดได้ (missing apiFetch)</p>';
        return;
    }

    const token = (
        localStorage.getItem('auth_token') ||
        sessionStorage.getItem('auth_token') ||
        localStorage.getItem('token') ||
        sessionStorage.getItem('token') ||
        localStorage.getItem('access_token') ||
        sessionStorage.getItem('access_token')
    );

    apiFetch('/requests/pending?limit=50', { method: 'GET', skipAuth: !token })
        .then(res => {
            const items = Array.isArray(res?.data) ? res.data : [];
            renderPendingRequests(items, containerEl);
        })
        .catch(err => {
            console.error('โหลด pending requests ไม่ได้:', err);
            containerEl.innerHTML = '<p style="font-size:13px;color:#999;">ไม่สามารถโหลดรายการรอการอนุมัติได้</p>';
            const pendingCountEl = document.getElementById('pending-count');
            if (pendingCountEl) pendingCountEl.textContent = '0';
        });
}

function renderPendingRequests(items, containerEl) {
    containerEl.innerHTML = '';

    const basePathRaw = (window.__APP_CONFIG__ && window.__APP_CONFIG__.BASE_PATH)
        ? String(window.__APP_CONFIG__.BASE_PATH)
        : '/ict8';
    const basePathTrim = basePathRaw.trim();
    const basePath = (basePathTrim ? (basePathTrim.startsWith('/') ? basePathTrim : `/${basePathTrim}`) : '')
        .replace(/\/+$/, '');

    const pendingCountEl = document.getElementById('pending-count');
    if (pendingCountEl) pendingCountEl.textContent = String(items.length);

    if (!items.length) {
        containerEl.innerHTML = '<p style="font-size:13px;color:#999;">ไม่มีงานที่รอการอนุมัติ</p>';
        return;
    }

    items.forEach(r => {
        const requestId = r.request_id;
        const subject = r.subject || 'ไม่ระบุหัวข้อคำขอ';

        const reqAt = r.request_at || '';
        const timeText = reqAt ? formatThaiDateTimeString(reqAt) : 'ไม่ระบุเวลา';

        const start = r.start_date_time || '';
        const end = r.end_date_time || '';
        const betweenText = buildBetweenTextFromDateTimes(start, end);

        const metaTextParts = [];
        if (r.request_type_name) metaTextParts.push(r.request_type_name);
        if (r.province_name_th) metaTextParts.push(`จังหวัด${r.province_name_th}`);
        if (r.requester_name) metaTextParts.push(`ผู้ร้องขอ: ${r.requester_name}`);

        const a = document.createElement('a');
        a.className = 'sidebar-task pending';
    a.href = `${basePath}/check_request.html?request_id=${encodeURIComponent(requestId)}`;
        a.style.textDecoration = 'none';
        a.style.color = 'inherit';

        a.innerHTML = `
            <div class="sidebar-task-time">${timeText}</div>
            <div class="sidebar-task-title">${escapeHtml(subject)}</div>
            ${betweenText ? `<div class="sidebar-task-between">${betweenText}</div>` : ''}
            <div class="sidebar-task-meta">${escapeHtml(metaTextParts.join(' · '))}</div>
}


                function applySearchOnly() {
                    const q = searchInput.value.trim().toLowerCase();

                    filteredTasks = allTasks.filter(task => {
                        if (!q) return true;

                        const fields = [
                            task['ชื่อ'],
                            task['รายละเอียด'],
                            task['วันที่เริ่มต้น'],
                            task['วันที่สิ้นสุด'],
                            task['ตำแหน่งที่ตั้ง'],
                            task['จังหวัด'],
                            task['ลิงค์เข้าประชุม'],
                            task['หมายเหตุ'],
                            (task['คนเข้าร่วม'] || []).join(' ')
                        ];

                        return fields.some(v => String(v || '').toLowerCase().includes(q));
                    });

                    if (calendar) {
                        calendar.removeAllEvents();
                        calendar.addEventSource(mapTasksToEvents(filteredTasks));
                    }
                }

                searchInput.addEventListener('input', applySearchOnly);
                searchClear?.addEventListener('click', () => {
                    searchInput.value = '';
                    applySearchOnly();
                });

                // expose to refreshEventsForCurrentView
                window.__scheduleApplySearchAndFilter = applySearchOnly;
        calendar.destroy();
        eventClick(info) {
            const task = info.event.extendedProps;
            task.id = info.event.id;
            openTaskModal(task);
        },

        eventDidMount(info) {
            // reserved for custom styling
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
        if (!filterOverlay) return;
        filterOverlay.classList.toggle('open');
        syncBodyModalOpenState();
    });

    filterOverlay?.addEventListener('click', (e) => {
        if (e.target === filterOverlay) {
            filterOverlay.classList.remove('open');
            syncBodyModalOpenState();
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
        syncBodyModalOpenState();
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
                    task['วันที่เริ่มต้น'],
                    task['ตำแหน่งที่ตั้ง'],
                    task['หมายเหตุ'],
                    (task['คนเข้าร่วม'] || []).join(' ')
                ];

                const match = fields.some(v => String(v || '').toLowerCase().includes(q));
                if (!match) return false;
            }

            // ----- จังหวัด -----
            if (provincesSelected.length && !provincesSelected.includes(task['จังหวัด'])) return false;

            // ----- ประเภทงานหลัก (request_type) -----
            if (typesSelected.length) {
                const t = String(task['ประเภทงานหลัก'] || '').trim();
                if (!t) return false;
                if (!typesSelected.includes(t)) return false;
            }

            // ----- ประเภทย่อย (request_sub_type) -----
            if (subtypesSelected.length) {
                const st = String(task['ประเภทย่อย'] || '').trim();
                if (!st) return false;
                if (!subtypesSelected.includes(st)) return false;
            }

            // ----- สถานะ (event_status; varies by request_type) -----
            if (statusSelected.length) {
                const s = String(task['สถานะ'] || '').trim();
                if (!s) return false;
                if (!statusSelected.includes(s)) return false;
            }

            return true;
        });

        if (calendar) {
            calendar.removeAllEvents();
            calendar.addEventSource(mapTasksToEvents(filteredTasks));
        }
    }

    // expose to refreshEventsForCurrentView
    window.__scheduleApplySearchAndFilter = applySearchAndFilter;
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
    // legacy mapping reserved
    return '';
}

function getStatusStepsForTask(task) {
    return [];
}

function renderStatusFlow(item) {
    return '';
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

    const locationEl = document.getElementById('task-modal-location');
    if (locationEl) {
        locationEl.textContent = task['ตำแหน่งที่ตั้ง'] || '-';
    }

    const part = Array.isArray(task['คนเข้าร่วม'])
        ? task['คนเข้าร่วม'].join(', ')
        : (task['คนเข้าร่วม'] || '-');
    document.getElementById('task-modal-participants').textContent = part;

    document.getElementById('task-modal-province').textContent =
        task['จังหวัด'] || '-';

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

    const meetingLinkEl = document.getElementById('task-modal-meeting-link');
    if (meetingLinkEl) {
        const link = task['ลิงค์เข้าประชุม'] || '-';
        meetingLinkEl.textContent = link;
    }

    const noteEl = document.getElementById('task-modal-note');
    if (noteEl) {
        noteEl.textContent = task['หมายเหตุ'] || '-';
    }


    // เก็บ id เผื่อใช้ตอน edit/delete (ตอนนี้ prototype: ยังไม่เชื่อม backend)
    overlay.dataset.taskId = task.id;

    overlay.classList.add('open');
    syncBodyModalOpenState();
}

function closeTaskModal() {
    const overlay = document.getElementById('task-modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    overlay.dataset.taskId = '';
    syncBodyModalOpenState();
}

function setupAddTaskModal() {
    const overlay = document.getElementById('task-add-overlay');
    const openBtn = document.getElementById('schedule-add-task-toggle');
    const closeBtns = overlay ? overlay.querySelectorAll('.task-add-close') : [];

    if (!overlay || !openBtn) return;

    // เปิด popup
    openBtn.addEventListener('click', async () => {
        try {
            await ensureProvincesLoaded();
            await ensureParticipantsLoaded();
        } catch (e) {
            console.error(e);
            alert('ไม่สามารถโหลดข้อมูลจังหวัด/ผู้เข้าร่วมได้');
        }
        resetAddTaskForm();
        overlay.classList.add('open');
        syncBodyModalOpenState();
    });

    // ปิด popup
    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            overlay.classList.remove('open');
            syncBodyModalOpenState();
        });
    });

    // ปิดเมื่อคลิกนอกกล่อง
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('open');
            syncBodyModalOpenState();
        }
    });

    const form = document.getElementById('task-add-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const apiFetch = window.apiFetch;
        if (typeof apiFetch !== 'function') {
            alert('ไม่สามารถบันทึกได้ (missing apiFetch)');
            return;
        }

        const title = String(document.getElementById('add-title')?.value ?? '').trim();
        const detail = String(document.getElementById('add-desc')?.value ?? '').trim();
        const location = String(document.getElementById('add-location')?.value ?? '').trim();
        const provinceIdRaw = String(document.getElementById('add-province')?.value ?? '').trim();
        const meetingLink = String(document.getElementById('add-meeting-link')?.value ?? '').trim();
        const note = String(document.getElementById('add-note')?.value ?? '').trim();
        const startDate = String(document.getElementById('add-start-date')?.value ?? '').trim();
        const endDate = String(document.getElementById('add-end-date')?.value ?? '').trim();

        if (!title) {
            alert('กรุณากรอกชื่องาน');
            return;
        }
        if (!provinceIdRaw) {
            alert('กรุณาเลือกจังหวัด');
            return;
        }
        if (!startDate || !endDate) {
            alert('กรุณาเลือกวันที่เริ่มต้นและวันที่สิ้นสุด');
            return;
        }

        const participantBoxes = document.querySelectorAll('.add-participant:checked');
        const participantUserIds = Array.from(participantBoxes)
            .map(cb => parseInt(cb.value, 10))
            .filter(n => Number.isFinite(n) && n > 0);

        const body = {
            title,
            detail,
            location,
            province_id: parseInt(provinceIdRaw, 10),
            meeting_link: meetingLink,
            note,
            start_date: startDate,
            end_date: endDate,
            participant_user_ids: participantUserIds,
        };

        apiFetch('/events/internal', { method: 'POST', body })
            .then(() => refreshEventsForCurrentView())
            .then(() => {
                form.reset();
                participantBoxes.forEach(cb => (cb.checked = false));
                overlay.classList.remove('open');
                syncBodyModalOpenState();
                alert('บันทึกงานเรียบร้อย');
            })
            .catch(err => {
                console.error(err);
                alert(err?.message || 'บันทึกงานไม่สำเร็จ');
            });
    });
}

function resetAddTaskForm() {
    const form = document.getElementById('task-add-form');
    if (!form) return;

    form.reset();

    // ตั้งค่า default วันที่เป็นวันนี้
    const todayStr = new Date().toISOString().slice(0, 10);
    const start = document.getElementById('add-start-date');
    const end = document.getElementById('add-end-date');
    if (start && !start.value) start.value = todayStr;
    if (end && !end.value) end.value = todayStr;
}

async function ensureProvincesLoaded() {
    if (__provincesLoaded) return;
    const apiFetch = window.apiFetch;
    if (typeof apiFetch !== 'function') throw new Error('missing apiFetch');

    const select = document.getElementById('add-province');
    if (!select) return;

    const res = await apiFetch('/provinces?limit=200', { method: 'GET', skipAuth: true });
    const items = Array.isArray(res?.data?.items) ? res.data.items : (Array.isArray(res?.items) ? res.items : []);

    // clear existing except placeholder
    select.querySelectorAll('option:not([value=""])').forEach(o => o.remove());

    items.forEach(p => {
        const opt = document.createElement('option');
        opt.value = String(p.province_id);
        opt.textContent = String(p.nameTH ?? p.nameEN ?? p.province_id);
        select.appendChild(opt);
    });

    __provincesLoaded = true;
}

async function ensureParticipantsLoaded() {
    if (__participantsLoaded) return;
    const apiFetch = window.apiFetch;
    if (typeof apiFetch !== 'function') throw new Error('missing apiFetch');

    const grid = document.getElementById('add-participant-grid');
    if (!grid) return;

    const res = await apiFetch('/users/participants', { method: 'GET' });
    const items = Array.isArray(res?.data) ? res.data : [];

    grid.innerHTML = '';
    items.forEach(u => {
        const name = (u?.line_user_name && String(u.line_user_name).trim() !== '')
            ? String(u.line_user_name)
            : `user#${u?.user_id}`;

        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.className = 'add-participant';
        input.value = String(u.user_id);
        label.appendChild(input);
        label.appendChild(document.createTextNode(' ' + name));
        grid.appendChild(label);
    });

    __participantsLoaded = true;
}


// เรียกตอน DOM พร้อม
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('task-modal-overlay');
    const btnClose = document.getElementById('task-modal-close');
    const btnCloseFooter = document.getElementById('task-modal-close-footer');
    const btnDelete = document.getElementById('task-modal-delete');
    const btnEdit = document.getElementById('task-modal-edit');
    const addOverlay = document.getElementById('task-add-overlay');

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
        const editUrl = `/schedule/event-edit.html?id=${encodeURIComponent(taskId)}`;
        window.location.href = editUrl;
    });

    // ESC to close any open overlay
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;

        if (addOverlay?.classList.contains('open')) {
            addOverlay.classList.remove('open');
        }
        if (overlay?.classList.contains('open')) {
            closeTaskModal();
        }

        syncBodyModalOpenState();
    });
});

*/

// eslint-disable-next-line no-console
console.warn('[ict8] assets/js/schedule.js is deprecated. Use schedule-calendar.js instead.');



