const NOTIF_DATA_URL = '/ict8/assets/js/data-ex/notifications.json';

let allNotifications = [];
let filteredNotifications = [];

document.addEventListener('DOMContentLoaded', () => {
    const main = document.querySelector('.main-notifications');
    if (!main) return;

    initNotificationsPage();
});

function initNotificationsPage() {
    const listEl       = document.querySelector('.notifications-list');
    const emptyEl      = document.querySelector('.notifications-empty');
    const searchInput  = document.getElementById('notif-search');
    const clearBtn     = document.getElementById('notif-search-clear');
    const readFilter   = document.getElementById('notif-read-filter');
    const typeFilter   = document.getElementById('notif-type-filter');

    if (!listEl) return;

    fetch(NOTIF_DATA_URL)
        .then(res => res.json())
        .then(data => {
            allNotifications = data;
            filteredNotifications = [...allNotifications];
            renderNotifications(listEl, emptyEl);

            // ========== ค้นหา ==========
            if (searchInput) {
                searchInput.addEventListener('input', () => {
                    applyFilters(searchInput, readFilter, typeFilter, listEl, emptyEl);
                });
            }

            if (clearBtn && searchInput) {
                clearBtn.addEventListener('click', () => {
                    searchInput.value = '';
                    applyFilters(searchInput, readFilter, typeFilter, listEl, emptyEl);
                });
            }

            // ========== ตัวกรองสถานะอ่าน/ยังไม่อ่าน ==========
            if (readFilter) {
                readFilter.addEventListener('change', () => {
                    applyFilters(searchInput, readFilter, typeFilter, listEl, emptyEl);
                });
            }

            // ========== ตัวกรองประเภท ==========
            if (typeFilter) {
                typeFilter.addEventListener('change', () => {
                    applyFilters(searchInput, readFilter, typeFilter, listEl, emptyEl);
                });
            }
        })
        .catch(err => {
            console.error('โหลดข้อมูลแจ้งเตือนผิดพลาด:', err);
            if (emptyEl) {
                emptyEl.style.display = 'block';
                emptyEl.textContent   = 'ไม่สามารถโหลดข้อมูลแจ้งเตือนได้';
            }
        });
}

function applyFilters(searchInput, readFilter, typeFilter, listEl, emptyEl) {
    let keyword = searchInput ? searchInput.value.trim().toLowerCase() : '';
    let readVal = readFilter ? readFilter.value : 'all';
    let typeVal = typeFilter ? typeFilter.value : 'all';

    filteredNotifications = allNotifications.filter(n => {
        // 1) filter by read status
        if (readVal === 'unread' && n['สถานะการอ่าน'] !== 'ยังไม่อ่าน') return false;
        if (readVal === 'read'   && n['สถานะการอ่าน'] !== 'อ่านแล้ว') return false;

        // 2) filter by type
        if (typeVal !== 'all') {
            if (typeVal === 'เตือนล่วงหน้า') {
                if (n['ประเภทแจ้งเตือน'] !== 'เตือนล่วงหน้า') return false;
            } else {
                if (n['ประเภทแจ้งเตือน'] !== typeVal) return false;
            }
        }

        // 3) filter by keyword (หัวข้อ + ข้อความ)
        if (keyword) {
            const text = `${n['หัวข้อ'] || ''} ${n['ข้อความ'] || ''}`.toLowerCase();
            if (!text.includes(keyword)) return false;
        }

        return true;
    });

    renderNotifications(listEl, emptyEl);
}

function renderNotifications(listEl, emptyEl) {
    listEl.innerHTML = '';

    if (!filteredNotifications.length) {
        if (emptyEl) emptyEl.style.display = 'block';
        return;
    } else {
        if (emptyEl) emptyEl.style.display = 'none';
    }

    // เรียงตามเวลาแจ้งเตือน ล่าสุดอยู่บน
    const sorted = [...filteredNotifications].sort((a, b) => {
        const ta = a['เวลาแจ้งเตือน'] || '';
        const tb = b['เวลาแจ้งเตือน'] || '';
        return new Date(tb) - new Date(ta);
    });

    sorted.forEach(n => {
        const card = document.createElement('article');
        card.className = 'notification-card';
        if (n['สถานะการอ่าน'] === 'ยังไม่อ่าน') {
            card.classList.add('unread');
        }

        const typeBadge = getNotificationBadge(n);
        const readText  = n['สถานะการอ่าน'] === 'ยังไม่อ่าน' ? 'ยังไม่อ่าน' : 'อ่านแล้ว';

        const timeText   = formatDateTimeThai(n['เวลาแจ้งเตือน']);
        const eventTime  = n['เวลางานเริ่ม'] ? formatDateTimeThai(n['เวลางานเริ่ม']) : '-';

        card.innerHTML = `
            <div class="notification-card-header">
                <div>
                    <h2 class="notification-title">${n['หัวข้อ'] || '-'}</h2>
                    <div class="notification-meta">
                        <span class="badge badge-type">${typeBadge}</span>
                        <span class="badge badge-read">${readText}</span>
                        ${n['ชนิดเตือน'] ? `<span class="badge badge-subtype">${n['ชนิดเตือน']}</span>` : ''}
                    </div>
                </div>
                <div class="notification-time">
                    <p><strong>แจ้งเตือน:</strong> ${timeText}</p>
                    ${n['เวลางานเริ่ม'] ? `<p><strong>งานเริ่ม:</strong> ${eventTime}</p>` : ''}
                </div>
            </div>

            <p class="notification-message">${n['ข้อความ'] || ''}</p>

            <div class="notification-footer">
                <div class="notification-role">
                    <span>เป้าหมาย: ${n['ผู้ใช้เป้าหมาย'] || '-'}</span>
                    <span>บทบาท: ${n['บทบาทผู้ใช้'] || '-'}</span>
                </div>
                <div class="notification-actions">
                    ${
                        n.eventId
                        ? `<a href="/schedule/events.html?eventId=${n.eventId}" class="btn-link">ดูรายละเอียดงาน</a>`
                        : ''
                    }
                    ${
                        // ✅ รองรับ notification จาก backend ที่มี request_id หรือ link_url
                        (n.request_id || n.requestId || n['request_id'] || n.link_url)
                        ? (() => {
                            const rid = n.request_id || n.requestId || n['request_id'];
                            const url = n.link_url || (rid ? `/ict8/check_request.html?request_id=${encodeURIComponent(rid)}` : '');
                            return url
                              ? `<a href="${url}" class="btn-link">ตรวจสอบคำขอ</a>`
                              : '';
                          })()
                        : ''
                    }
                </div>
            </div>
        `;

        listEl.appendChild(card);
    });
}

function getNotificationBadge(n) {
    const type = n['ประเภทแจ้งเตือน'] || '';
    if (type === 'คำร้องใหม่') return 'คำร้องใหม่';
    if (type === 'คำร้องแก้ไข') return 'คำร้องแก้ไข';
    if (type === 'สร้างงานใหม่ที่เกี่ยวข้องกับผู้ใช้') return 'งานใหม่ที่เกี่ยวข้อง';
    if (type === 'เตือนล่วงหน้า') return 'เตือนล่วงหน้า';
    if (type === 'อัปเดตสถานะคำร้อง') return 'อัปเดตคำร้อง';
    if (type === 'ขอข้อมูลเพิ่มเติม') return 'ขอข้อมูลเพิ่ม';
    if (type === 'สรุปคำร้องค้าง') return 'สรุปคำร้องค้าง';
    return type || 'อื่นๆ';
}

function formatDateTimeThai(isoStr) {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;

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
