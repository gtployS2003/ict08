/*
 * schedule-calendar.js
 * Calendar page logic (schedule/calendar.html)
 * - Loads events from backend by visible date range
 * - Allows creating internal events (staff) via modal
 * - Search-only (no filters)
 */

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

function escapeHtml(s) {
    return String(s ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
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
    if (!dateStr) return '-';
    const d = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(d.getTime())) return String(dateStr);
    return formatThaiDate(d);
}

function normalizeDateTimeToIsoLike(dtStr) {
    if (!dtStr) return '';
    const s = String(dtStr).trim();
    if (!s) return '';
    return s.includes('T') ? s : s.replace(' ', 'T');
}

function formatThaiDateTimeString(dtStr) {
    const isoLike = normalizeDateTimeToIsoLike(dtStr);
    if (!isoLike) return '';

    const d = new Date(isoLike);
    if (!Number.isNaN(d.getTime())) {
        const date = d.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        const time = d.toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit'
        });
        return `${date} ${time} น.`;
    }

    const [datePart, timePart] = String(dtStr).split(' ');
    const dateText = datePart ? formatThaiDateString(datePart) : String(dtStr);
    const timeText = timePart ? timePart.slice(0, 5) : '';
    return timeText ? `${dateText} ${timeText}` : dateText;
}

function buildBetweenTextFromDateTimes(start, end) {
    const startStr = normalizeDateTimeToIsoLike(start);
    const endStr = normalizeDateTimeToIsoLike(end);

    if (!startStr && !endStr) return '';

    const startDate = startStr ? startStr.slice(0, 10) : '';
    const endDate = endStr ? endStr.slice(0, 10) : '';

    const startThai = startDate ? formatThaiDateString(startDate) : '';
    const endThai = endDate ? formatThaiDateString(endDate) : '';

    if (startThai && endThai) {
        if (startDate === endDate) return `ในวันที่ ${startThai}`;
        return `ในวันที่ ${startThai} - ${endThai}`;
    }
    if (startThai) return `เริ่ม ${startThai}`;
    if (endThai) return `สิ้นสุด ${endThai}`;
    return '';
}

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

function mapApiEventToTask(ev) {
    const start = (ev?.start_datetime ? String(ev.start_datetime) : '').trim();
    const end = (ev?.end_datetime ? String(ev.end_datetime) : '').trim();

    const startDate = start ? start.slice(0, 10) : '';
    const endDate = end ? end.slice(0, 10) : (startDate || '');

    const participantNames = (ev?.participant_names ? String(ev.participant_names) : '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

    return {
        id: String(ev?.event_id ?? ''),
        'ชื่อ': ev?.title ?? '',
        'รายละเอียด': ev?.detail ?? '',
        'ตำแหน่งที่ตั้ง': ev?.location ?? '',
        'จังหวัด': ev?.province_name_th ?? '',
        'ลิงค์เข้าประชุม': ev?.meeting_link ?? '',
        'หมายเหตุ': ev?.note ?? '',
        'คนเข้าร่วม': participantNames,
        'วันที่เริ่มต้น': startDate,
        'วันที่สิ้นสุด': endDate,
        __raw: ev,
    };
}

async function fetchEventsForRange(fromDate, toDate) {
    const apiFetch = window.apiFetch;
    if (typeof apiFetch !== 'function') throw new Error('missing apiFetch');

    const res = await apiFetch(
        `/events?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`,
        { method: 'GET' }
    );

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

    // sidebar today
    const today = new Date();
    renderTodayTasks(allTasks, document.getElementById('today-task-list'), today);

    // calendar events
    if (typeof window.__scheduleApplySearchOnly === 'function') {
        window.__scheduleApplySearchOnly();
    } else {
        calendar.removeAllEvents();
        calendar.addEventSource(mapTasksToEvents(filteredTasks));
    }
}

function initSidebarTasks() {
    const todayLabelEl = document.getElementById('sidebar-today-label');
    const todayListEl = document.getElementById('today-task-list');
    const pendingListEl = document.getElementById('pending-task-list');

    if (!todayListEl || !pendingListEl) return;

    const today = new Date();
    if (todayLabelEl) todayLabelEl.textContent = formatThaiDate(today);

    loadPendingRequests(pendingListEl);

    // init empty calendar; datesSet will load range
    allTasks = [];
    filteredTasks = [];
    renderTodayTasks([], todayListEl, today);
    initCalendar([]);
    initSearchOnly();
}

function renderTodayTasks(tasks, containerEl, todayDate) {
    if (!containerEl) return;

    containerEl.innerHTML = '';
    const todayStr = todayDate.toISOString().slice(0, 10);

    const todaysTasks = (Array.isArray(tasks) ? tasks : []).filter(t => {
        const start = t['วันที่เริ่มต้น'];
        const end = t['วันที่สิ้นสุด'] || start;
        if (!start) return false;
        return todayStr >= start && todayStr <= end;
    });

    const countEl = document.getElementById('today-count');
    if (countEl) countEl.textContent = String(todaysTasks.length);

    if (todaysTasks.length === 0) {
        containerEl.innerHTML = '<p style="font-size:13px;color:#999;">วันนี้ยังไม่มีงานในระบบ</p>';
        return;
    }

    // sort by start date
    todaysTasks.sort((a, b) => String(a['วันที่เริ่มต้น'] || '').localeCompare(String(b['วันที่เริ่มต้น'] || '')));

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
            <div class="sidebar-task-title">${escapeHtml(task['ชื่อ'] || 'ไม่ระบุชื่องาน')}</div>
            <div class="sidebar-task-meta">${escapeHtml(metaTextParts.join(' · '))}</div>
        `;

        item.addEventListener('click', () => openTaskModal(task));
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
    const basePath = basePathRaw.trim().replace(/\/+$/, '');

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

        const betweenText = buildBetweenTextFromDateTimes(r.start_date_time || '', r.end_date_time || '');

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
            <div class="sidebar-task-time">${escapeHtml(timeText)}</div>
            <div class="sidebar-task-title">${escapeHtml(subject)}</div>
            ${betweenText ? `<div class="sidebar-task-between">${escapeHtml(betweenText)}</div>` : ''}
            <div class="sidebar-task-meta">${escapeHtml(metaTextParts.join(' · '))}</div>
        `;

        containerEl.appendChild(a);
    });
}

function initCalendar(tasks) {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl || typeof FullCalendar === 'undefined') return;

    if (calendar) {
        calendar.destroy();
    }

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'th',
        height: 650,
        expandRows: true,
        handleWindowResize: true,
        events: mapTasksToEvents(tasks),
        headerToolbar: false,

        datesSet(info) {
            const titleEl = document.getElementById('calendar-month');
            if (titleEl) {
                const thMonths = [
                    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
                ];

                const viewDate = info.view.currentStart || info.start;
                const monthName = thMonths[viewDate.getMonth()];
                const yearBE = viewDate.getFullYear() + 543;
                titleEl.textContent = `${monthName} ${yearBE}`;
            }

            // load events for visible range
            refreshEventsForCurrentView().catch(err => console.error('refreshEventsForCurrentView failed:', err));
        },

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
    return (Array.isArray(tasks) ? tasks : []).map(task => {
        const startDate = task['วันที่เริ่มต้น'];
        const endDate = task['วันที่สิ้นสุด'] || startDate;
        const endForCalendar = endDate ? addOneDay(endDate) : undefined;

        return {
            id: String(task.id),
            title: task['ชื่อ'] || 'ไม่ระบุชื่องาน',
            start: startDate,
            end: endForCalendar,
            allDay: true,
            extendedProps: task,
        };
    });
}

function addOneDay(dateStr) {
    const [y, m, d] = String(dateStr).split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + 1);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function initSearchOnly() {
    const searchInput = document.getElementById('schedule-search-input');
    const searchClear = document.getElementById('schedule-search-clear');
    if (!searchInput) return;

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
                (task['คนเข้าร่วม'] || []).join(' '),
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

    window.__scheduleApplySearchOnly = applySearchOnly;
}

function openTaskModal(task) {
    currentTask = task;
    const overlay = document.getElementById('task-modal-overlay');
    if (!overlay) return;

    const titleEl = document.getElementById('task-modal-title');
    const descEl = document.getElementById('task-modal-desc');
    const locationEl = document.getElementById('task-modal-location');
    const provinceEl = document.getElementById('task-modal-province');
    const participantsEl = document.getElementById('task-modal-participants');
    const rangeEl = document.getElementById('task-modal-work-range');
    const meetingEl = document.getElementById('task-modal-meeting-link');
    const noteEl = document.getElementById('task-modal-note');

    if (titleEl) titleEl.textContent = task['ชื่อ'] || 'ไม่ระบุชื่องาน';
    if (descEl) descEl.textContent = task['รายละเอียด'] || '-';
    if (locationEl) locationEl.textContent = task['ตำแหน่งที่ตั้ง'] || '-';
    if (provinceEl) provinceEl.textContent = task['จังหวัด'] || '-';

    const part = Array.isArray(task['คนเข้าร่วม']) ? task['คนเข้าร่วม'].join(', ') : (task['คนเข้าร่วม'] || '-');
    if (participantsEl) participantsEl.textContent = part || '-';

    const startDate = task['วันที่เริ่มต้น'];
    const endDate = task['วันที่สิ้นสุด'] || startDate;
    let rangeText = '-';
    if (startDate && endDate) {
        rangeText = (startDate === endDate)
            ? formatThaiDateString(startDate)
            : `${formatThaiDateString(startDate)} - ${formatThaiDateString(endDate)}`;
    } else if (startDate) {
        rangeText = formatThaiDateString(startDate);
    }
    if (rangeEl) rangeEl.textContent = rangeText;

    const meeting = task['ลิงค์เข้าประชุม'] || '-';
    if (meetingEl) meetingEl.textContent = meeting;

    const note = task['หมายเหตุ'] || '-';
    if (noteEl) noteEl.textContent = note;

    overlay.dataset.taskId = String(task.id || '');
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

async function ensureProvincesLoaded() {
    if (__provincesLoaded) return;

    const apiFetch = window.apiFetch;
    if (typeof apiFetch !== 'function') throw new Error('missing apiFetch');

    const select = document.getElementById('add-province');
    if (!select) return;

    const res = await apiFetch('/provinces?limit=200', { method: 'GET' });
    const items = Array.isArray(res?.data?.items) ? res.data.items : (Array.isArray(res?.data) ? res.data : []);

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

function resetAddTaskFormDefaults() {
    const todayStr = new Date().toISOString().slice(0, 10);

    const start = document.getElementById('add-start-date');
    const end = document.getElementById('add-end-date');

    if (start && !start.value) start.value = todayStr;
    if (end && !end.value) end.value = todayStr;
}

function setupAddTaskModal() {
    const overlay = document.getElementById('task-add-overlay');
    const openBtn = document.getElementById('schedule-add-task-toggle');
    const form = document.getElementById('task-add-form');

    if (!overlay || !openBtn || !form) return;

    const closeBtns = overlay.querySelectorAll('.task-add-close');

    openBtn.addEventListener('click', async () => {
        try {
            form.reset();
            overlay.querySelectorAll('.add-participant').forEach(cb => (cb.checked = false));

            await ensureProvincesLoaded();
            await ensureParticipantsLoaded();

            resetAddTaskFormDefaults();

            overlay.classList.add('open');
            syncBodyModalOpenState();
        } catch (err) {
            console.error(err);
            alert('ไม่สามารถเปิดฟอร์มเพิ่มงานได้');
        }
    });

    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            overlay.classList.remove('open');
            syncBodyModalOpenState();
        });
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('open');
            syncBodyModalOpenState();
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        try {
            const title = String(document.getElementById('add-title')?.value ?? '').trim();
            const detail = String(document.getElementById('add-desc')?.value ?? '');
            const location = String(document.getElementById('add-location')?.value ?? '');
            const provinceId = String(document.getElementById('add-province')?.value ?? '').trim();
            const meetingLink = String(document.getElementById('add-meeting-link')?.value ?? '').trim();
            const note = String(document.getElementById('add-note')?.value ?? '');
            const startDate = String(document.getElementById('add-start-date')?.value ?? '').trim();
            const endDate = String(document.getElementById('add-end-date')?.value ?? '').trim();

            const participantIds = Array.from(document.querySelectorAll('.add-participant:checked')).map(cb => Number(cb.value));

            if (!title) {
                alert('กรุณากรอกชื่องาน');
                return;
            }
            if (!provinceId) {
                alert('กรุณาเลือกจังหวัด');
                return;
            }
            if (!startDate || !endDate) {
                alert('กรุณาเลือกวันที่เริ่มต้นและวันที่สิ้นสุด');
                return;
            }

            const apiFetch = window.apiFetch;
            if (typeof apiFetch !== 'function') throw new Error('missing apiFetch');

            const body = {
                title,
                detail,
                location,
                province_id: Number(provinceId),
                meeting_link: meetingLink,
                note,
                start_date: startDate,
                end_date: endDate,
                participant_user_ids: participantIds,
            };

            const res = await apiFetch('/events/internal', { method: 'POST', body });
            if (res?.error) {
                alert(res?.message || 'บันทึกงานไม่สำเร็จ');
                return;
            }

            overlay.classList.remove('open');
            syncBodyModalOpenState();

            await refreshEventsForCurrentView();

            alert('บันทึกงานเรียบร้อย');
        } catch (err) {
            console.error(err);
            alert('บันทึกงานไม่สำเร็จ');
        }
    });
}

// DOM ready
document.addEventListener('DOMContentLoaded', () => {
    const mainEl = document.querySelector('.schedule-main');
    if (!mainEl) return;

    initSidebarTasks();
    setupAddTaskModal();

    // Task modal controls
    const overlay = document.getElementById('task-modal-overlay');
    const btnClose = document.getElementById('task-modal-close');
    const btnCloseFooter = document.getElementById('task-modal-close-footer');
    const btnDelete = document.getElementById('task-modal-delete');
    const btnEdit = document.getElementById('task-modal-edit');
    const addOverlay = document.getElementById('task-add-overlay');

    overlay?.addEventListener('click', (e) => {
        if (e.target === overlay) closeTaskModal();
    });

    btnClose?.addEventListener('click', closeTaskModal);
    btnCloseFooter?.addEventListener('click', closeTaskModal);

    btnDelete?.addEventListener('click', () => {
        const taskId = overlay?.dataset.taskId;
        alert(`(Prototype) ลบงาน id = ${taskId}`);
    });

    btnEdit?.addEventListener('click', () => {
        const taskId = overlay?.dataset.taskId;
        const editUrl = `/schedule/edit.html?id=${encodeURIComponent(taskId || '')}`;
        window.location.href = editUrl;
    });

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
