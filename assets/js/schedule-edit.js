document.addEventListener('DOMContentLoaded', () => {
    // ทำเฉพาะหน้าที่มีคลาสนี้
    const main = document.querySelector('.schedule-edit-main');
    if (!main) return;

    // 1) ดึง id จาก URL ?id=60
    const taskId = getQueryParam('id');
    if (!taskId) {
        alert('ไม่พบรหัสงาน (id) ใน URL');
        return;
    }

    // 2) โหลด JSON แล้ว fill ฟอร์ม
    loadTaskAndFillForm(taskId);

    // 3) ตั้งค่า event ปุ่มบันทึก / ย้อนกลับ
    setupEditFormHandlers();
});

function getQueryParam(key) {
    const url = new URL(window.location.href);
    return url.searchParams.get(key);
}

function loadTaskAndFillForm(taskId) {
    // path ต้องตรงกับที่ใช้ใน calendar
    fetch('/assets/js/data-ex/tasks_with_time.json')
        .then(res => res.json())
        .then(tasks => {
            const task = tasks.find(t => String(t.id) === String(taskId));
            if (!task) {
                alert('ไม่พบข้อมูลงานที่ต้องการแก้ไข');
                return;
            }

            // เก็บไว้ใช้ตอน submit
            window.__currentEditTask = task;

            fillEditForm(task);
        })
        .catch(err => {
            console.error('โหลด tasks_with_time.json ไม่ได้:', err);
            alert('ไม่สามารถโหลดข้อมูลงานได้');
        });
}

function fillEditForm(task) {
    // ช่องข้อความ/ select ปกติ
    document.getElementById('edit-title').value = task['ชื่อ'] || '';
    document.getElementById('edit-desc').value = task['รายละเอียด'] || '';
    document.getElementById('edit-type').value = task['ประเภท'] || '';
    document.getElementById('edit-subtype').value = task['ประเภทย่อย'] || '-';
    document.getElementById('edit-requester').value = task['ผู้ร้องขอ'] || '';
    document.getElementById('edit-request-date').value = task['วันที่ร้องขอ'] || '';
    document.getElementById('edit-request-time').value = task['เวลาเข้ารับคำร้อง'] || '';
    document.getElementById('edit-start-date').value = task['วันที่เริ่มต้น'] || '';
    document.getElementById('edit-end-date').value = task['วันที่สิ้นสุด'] || '';
    document.getElementById('edit-start-time').value = task['เวลาเริ่มต้น'] || '';
    document.getElementById('edit-end-time').value = task['เวลาสิ้นสุด'] || '';
    document.getElementById('edit-province').value = task['จังหวัด'] || '';
    document.getElementById('edit-location').value = task['สถานที่'] || '';
    document.getElementById('edit-link').value = task['ลิงก์แนบ'] || '';
    document.getElementById('edit-status').value = task['สถานะ'] || 'รอการตรวจสอบ';

    // เอกสารแนบเดิม (ถ้ามี)
    const fileInfoEl = document.getElementById('edit-current-file');
    if (fileInfoEl) {
        const fileName = task['เอกสารแนบ'];
        fileInfoEl.textContent = fileName
            ? `ไฟล์ปัจจุบัน: ${fileName} (หากไม่เลือกไฟล์ใหม่ จะยังใช้ไฟล์เดิม)`
            : 'ยังไม่มีไฟล์แนบเดิม';
    }

    // คนเข้าร่วม (เป็น array)
    const participants = Array.isArray(task['คนเข้าร่วม']) ? task['คนเข้าร่วม'] : [];
    const boxes = document.querySelectorAll('.edit-participant');
    boxes.forEach(cb => {
        cb.checked = participants.includes(cb.value);
    });
}

function setupEditFormHandlers() {
    const form = document.getElementById('schedule-edit-form');
    const cancelBtn = document.getElementById('edit-cancel-btn');

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            // กลับหน้าปฏิทิน
            window.location.href = '/schedule/calendar.html';
        });
    }

    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const fd = new FormData(form);
        const data = Object.fromEntries(fd.entries());

        // เก็บคนเข้าร่วมที่เลือกทั้งหมด
        const checked = document.querySelectorAll('.edit-participant:checked');
        data['คนเข้าร่วม'] = Array.from(checked).map(cb => cb.value);

        // คง id เดิม
        if (window.__currentEditTask) {
            data.id = window.__currentEditTask.id;
        }

        // ถ้าไม่มีวันที่เริ่ม แต่มีวันที่สิ้นสุด ให้เซ็ตให้
        if (!data['วันที่เริ่มต้น'] && data['วันที่สิ้นสุด']) {
            data['วันที่เริ่มต้น'] = data['วันที่สิ้นสุด'];
        }

        // ไฟล์แนบใหม่ (ตัวอย่างยังไม่อัปโหลดจริง)
        const fileInput = document.getElementById('edit-file');
        if (fileInput && fileInput.files[0]) {
            data['เอกสารแนบ'] = fileInput.files[0].name;
        } else if (window.__currentEditTask && window.__currentEditTask['เอกสารแนบ']) {
            data['เอกสารแนบ'] = window.__currentEditTask['เอกสารแนบ'];
        }

        console.log('UPDATED TASK DATA (prototype):', data);
        alert('บันทึกการแก้ไข (ยังไม่เชื่อม backend จริง)');

        if (document.referrer) {
            window.location.href = document.referrer;
        } else {
            window.history.back();
        }

    });
}
