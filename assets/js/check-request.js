// assets/js/check-request.js

document.addEventListener('DOMContentLoaded', () => {
  const main = document.querySelector('.check-request-main');
  if (!main) return;

  const els = {
    subtitle: document.getElementById('cr-subtitle'),
    error: document.getElementById('cr-error'),
    form: document.getElementById('cr-form'),

    requestId: document.getElementById('cr-request-id'),
    requestType: document.getElementById('cr-request-type'),
    requestSubType: document.getElementById('cr-request-sub-type'),
    subject: document.getElementById('cr-subject'),
    deviceId: document.getElementById('cr-device-id'),
    detail: document.getElementById('cr-detail'),
    requester: document.getElementById('cr-requester'),
    province: document.getElementById('cr-province'),
    location: document.getElementById('cr-location'),
    hasAttachment: document.getElementById('cr-has-attachment'),
    headOfRequest: document.getElementById('cr-head-of-request'),
    urgency: document.getElementById('cr-urgency'),
    start: document.getElementById('cr-start'),
    end: document.getElementById('cr-end'),
    status: document.getElementById('cr-status'),
    requestAt: document.getElementById('cr-request-at'),
    attachments: document.getElementById('cr-attachments'),

    newAttachments: document.getElementById('cr-new-attachments'),
    newAttachmentsPreview: document.getElementById('cr-new-attachments-preview'),

    btnSave: document.getElementById('cr-save'),
    actionHint: document.getElementById('cr-action-hint'),
  };

  const apiFetch = window.apiFetch;
  if (typeof apiFetch !== 'function') {
    showError(els, 'ไม่พบ apiFetch (assets/js/api/http.js)');
    return;
  }

  const { requestId } = parseQuery();
  if (!requestId) {
    showError(els, 'ไม่พบ request_id ใน URL');
    return;
  }

  initPage({ apiFetch, els, requestId });
});

function parseQuery() {
  const qs = new URLSearchParams(window.location.search);
  const raw = qs.get('request_id') || qs.get('id') || '';
  const id = Number(raw);
  return { requestId: Number.isFinite(id) && id > 0 ? id : 0 };
}

async function initPage({ apiFetch, els, requestId }) {
  setLoading(els, true);

  try {
    const token = getToken();
    const skipAuth = !token;

    // 1) load request details first
    const res = await apiFetch(`/requests/${encodeURIComponent(requestId)}`, {
      method: 'GET',
      skipAuth,
    });

    const req = res?.data?.request || null;
    const atts = Array.isArray(res?.data?.attachments) ? res.data.attachments : [];
    if (!req) {
      showError(els, 'ไม่พบข้อมูลคำขอ');
      return;
    }

    hideError(els);
    if (els.form) els.form.style.display = 'block';

    // 2) load dropdown data
    const [urgRes, statusRes, headRes] = await Promise.all([
      apiFetch('/urgency?limit=200', { method: 'GET', skipAuth }),
      apiFetch(`/request-status?request_type_id=${encodeURIComponent(req.request_type || '')}&limit=200`, { method: 'GET', skipAuth }),
      (req.request_sub_type
        ? apiFetch(`/head-of-request/staff/${encodeURIComponent(req.request_sub_type)}`, { method: 'GET', skipAuth })
        : Promise.resolve({ error: false, data: [] })),
    ]);

    const urgItems = Array.isArray(urgRes?.data) ? urgRes.data : [];
    const statusItems = Array.isArray(statusRes?.data) ? statusRes.data : [];
    const headItems = Array.isArray(headRes?.data) ? headRes.data : [];

    populateUrgencySelect(els.urgency, urgItems);
    populateStatusSelect(els.status, statusItems);
    populateHeadOfRequestSelect(els.headOfRequest, headItems);

    renderForm({ els, req, atts });
    wireEvents({ apiFetch, els, req, atts });

    setLoading(els, false);
  } catch (e) {
    console.error(e);
    showError(els, e?.message || 'โหลดข้อมูลไม่สำเร็จ');
  }
}

function renderForm({ els, req, atts }) {
  const id = Number(req.request_id || 0);

  setText(els.subtitle, `คำขอ #${id}`);

  if (els.requestId) els.requestId.value = String(id || '');
  if (els.subject) els.subject.value = String(req.subject || '');
  if (els.requestType) {
    const typeName = req.request_type_name || req.request_type || '-';
    const typeId = req.request_type || '';
    els.requestType.value = typeId ? `${typeName} (#${typeId})` : String(typeName);
  }

  const subtypeName = req.request_sub_type_name || '-';
  const subtypeId = req.request_sub_type || '';
  if (els.requestSubType) {
    els.requestSubType.value = subtypeId ? `${subtypeName} (#${subtypeId})` : String(subtypeName);
  }

  if (els.deviceId) els.deviceId.value = req.device_id ? String(req.device_id) : '-';
  if (els.detail) els.detail.value = req.detail ? String(req.detail) : '';
  if (els.requester) els.requester.value = req.requester_name ? String(req.requester_name) : (req.requester_id ? String(req.requester_id) : '-');
  if (els.province) els.province.value = req.province_name_th ? String(req.province_name_th) : (req.province_id ? String(req.province_id) : '-');
  if (els.location) els.location.value = req.location ? String(req.location) : '-';

  const hasAtt = Number(req.hasAttachment || 0) === 1 || (Array.isArray(atts) && atts.length > 0);
  if (els.hasAttachment) els.hasAttachment.value = hasAtt ? 'มี' : 'ไม่มี';

  if (els.headOfRequest) els.headOfRequest.value = req.head_of_request_id ? String(req.head_of_request_id) : '';
  if (els.urgency) els.urgency.value = req.urgency_id ? String(req.urgency_id) : '';

  if (els.start) els.start.value = toDateTimeLocal(req.start_date_time);
  if (els.end) els.end.value = toDateTimeLocal(req.end_date_time);
  if (els.status) els.status.value = req.current_status_id ? String(req.current_status_id) : '';
  if (els.requestAt) els.requestAt.value = req.request_at ? String(req.request_at) : '-';

  renderAttachments({ els, atts });

  const isPending = String(req.status_code || '').toLowerCase() === 'pending';
  if (els.btnApprove) els.btnApprove.disabled = !isPending;
  if (els.btnReject) els.btnReject.disabled = !isPending;
  if (els.actionHint) {
    els.actionHint.textContent = isPending
      ? '* แก้ไขข้อมูลได้ แล้วกด “บันทึก”'
      : '* แก้ไขข้อมูลได้ แล้วกด “บันทึก”';
  }
}

function renderAttachments({ els, atts }) {
  if (!els.attachments) return;

  if (!atts.length) {
    els.attachments.textContent = '-';
    return;
  }

  const wrap = document.createElement('div');
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.gap = '6px';

  atts.forEach((a) => {
    const fp = String(a.filepath || '').trim();
    const name = String(a.original_filename || a.stored_filename || fp || 'ไฟล์แนบ');

    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '8px';
    row.style.flexWrap = 'wrap';

    if (fp) {
      const link = document.createElement('a');
      link.href = buildFileUrl(fp);
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = name;
      link.style.textDecoration = 'underline';
      row.appendChild(link);
    } else {
      const span = document.createElement('span');
      span.textContent = name;
      row.appendChild(span);
    }

    const meta = [];
    const sz = Number(a.file_size || 0);
    if (Number.isFinite(sz) && sz > 0) meta.push(formatBytes(sz));

    if (meta.length) {
      const m = document.createElement('span');
      m.style.color = '#6b7280';
      m.style.fontSize = '12px';
      m.textContent = `(${meta.join(' · ')})`;
      row.appendChild(m);
    }

    wrap.appendChild(row);
  });

  els.attachments.innerHTML = '';
  els.attachments.appendChild(wrap);
}

function wireEvents({ apiFetch, els, req }) {
  const id = Number(req.request_id || 0);
  if (!id) return;

  if (els.newAttachments) {
    els.newAttachments.addEventListener('change', () => {
      renderNewAttachmentsPreview(els);
    });
  }

  if (els.btnSave) {
    els.btnSave.addEventListener('click', async () => {
      await saveChanges({ apiFetch, els, id });
    });
  }
}

async function saveChanges({ apiFetch, els, id }) {
  try {
    const token = getToken();

    const payload = {
      subject: String(els.subject?.value || '').trim(),
      detail: (els.detail ? String(els.detail.value || '') : ''),
      head_of_request_id: els.headOfRequest?.value ? Number(els.headOfRequest.value) : null,
      urgency_id: els.urgency?.value ? Number(els.urgency.value) : null,
      start_date_time: toApiDateTime(els.start?.value || ''),
      end_date_time: toApiDateTime(els.end?.value || ''),
      current_status_id: els.status?.value ? Number(els.status.value) : null,
    };

    setButtonsDisabled(els, true);
    setText(els.actionHint, 'กำลังบันทึก...');

    // 1) update fields
    let res = await apiFetch(`/requests/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: payload,
      skipAuth: !token,
    });

    // 2) upload new attachments (if any)
    const files = (els.newAttachments && els.newAttachments.files) ? Array.from(els.newAttachments.files) : [];
    if (files.length) {
      const fd = new FormData();
      files.forEach((f) => fd.append('attachments[]', f));

      setText(els.actionHint, 'กำลังอัปโหลดไฟล์แนบ...');
      res = await apiFetch(`/requests/${encodeURIComponent(id)}/attachments`, {
        method: 'POST',
        body: fd,
        skipAuth: !token,
      });
    }

    const req = res?.data?.request || null;
    const atts = Array.isArray(res?.data?.attachments) ? res.data.attachments : [];
    if (req) {
      alert('บันทึกเรียบร้อย');
      renderForm({ els, req, atts });

      // clear chosen files
      if (els.newAttachments) els.newAttachments.value = '';
      if (els.newAttachmentsPreview) {
        els.newAttachmentsPreview.innerHTML = '';
        els.newAttachmentsPreview.style.display = 'none';
      }
    } else {
      alert('บันทึกแล้ว แต่ไม่พบข้อมูลตอบกลับ');
    }

    setButtonsDisabled(els, false);
  } catch (e) {
    console.error(e);
    alert(e?.message || 'บันทึกไม่สำเร็จ');
    setButtonsDisabled(els, false);
    setText(els.actionHint, '* ลองใหม่อีกครั้ง');
  }
}

function renderNewAttachmentsPreview(els) {
  if (!els.newAttachmentsPreview || !els.newAttachments) return;
  const files = els.newAttachments.files ? Array.from(els.newAttachments.files) : [];

  if (!files.length) {
    els.newAttachmentsPreview.innerHTML = '';
    els.newAttachmentsPreview.style.display = 'none';
    return;
  }

  els.newAttachmentsPreview.innerHTML = '';
  els.newAttachmentsPreview.style.display = 'block';

  files.forEach((f) => {
    const li = document.createElement('li');

    const isImg = /^image\//i.test(f.type);
    if (isImg) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(f);
      img.alt = f.name;
      img.style.display = 'block';
      img.style.maxWidth = '220px';
      img.style.borderRadius = '10px';
      img.style.border = '1px solid #e5e7eb';
      img.style.margin = '6px 0';
      li.appendChild(img);
    }

    const name = document.createElement('div');
    name.textContent = `${f.name} (${formatBytes(f.size)})`;
    li.appendChild(name);

    els.newAttachmentsPreview.appendChild(li);
  });
}

function populateUrgencySelect(selectEl, items) {
  if (!selectEl) return;
  const opts = (Array.isArray(items) ? items : []).map((u) => {
    const lvl = (u.urgency_level !== undefined && u.urgency_level !== null) ? `L${u.urgency_level}` : '';
    const code = u.urgency_code ? String(u.urgency_code) : '';
    const title = u.urgency_title ? String(u.urgency_title) : '';
    const label = [lvl, code, title].filter(Boolean).join(' · ') || String(u.urgency_id ?? '-');
    return { value: String(u.urgency_id ?? ''), label };
  }).filter((o) => o.value);
  setSelectOptions(selectEl, opts, '- ไม่ระบุ -');
}

function populateStatusSelect(selectEl, items) {
  if (!selectEl) return;
  const opts = (Array.isArray(items) ? items : []).map((s) => ({
    value: String(s.status_id ?? ''),
    label: String(s.status_name ?? s.status_code ?? s.status_id ?? '-'),
  })).filter((o) => o.value);
  setSelectOptions(selectEl, opts, '- เลือกสถานะ -');
}

function populateHeadOfRequestSelect(selectEl, items) {
  if (!selectEl) return;
  const opts = (Array.isArray(items) ? items : []).map((u) => ({
    value: String(u.id ?? ''),
    label: String(u.display_name ?? u.line_user_name ?? u.staff_id ?? u.id ?? '-'),
  })).filter((o) => o.value);
  setSelectOptions(selectEl, opts, '- ไม่ระบุ -');
}

function setSelectOptions(selectEl, options, placeholder) {
  if (!selectEl) return;
  const cur = String(selectEl.value || '');
  selectEl.innerHTML = '';

  const ph = document.createElement('option');
  ph.value = '';
  ph.textContent = placeholder || '-';
  selectEl.appendChild(ph);

  (Array.isArray(options) ? options : []).forEach((o) => {
    const opt = document.createElement('option');
    opt.value = String(o.value);
    opt.textContent = String(o.label);
    selectEl.appendChild(opt);
  });

  if (cur) selectEl.value = cur;
}

function getToken() {
  return (
    localStorage.getItem('auth_token') ||
    sessionStorage.getItem('auth_token') ||
    localStorage.getItem('token') ||
    sessionStorage.getItem('token') ||
    localStorage.getItem('access_token') ||
    sessionStorage.getItem('access_token')
  );
}

function toDateTimeLocal(apiDt) {
  if (!apiDt) return '';
  const s = String(apiDt).trim();
  if (!s) return '';
  // "YYYY-MM-DD HH:MM:SS" -> "YYYY-MM-DDTHH:MM"
  const iso = s.includes('T') ? s : s.replace(' ', 'T');
  // keep minutes for input
  return iso.slice(0, 16);
}

function toApiDateTime(dtLocal) {
  const s = String(dtLocal || '').trim();
  if (!s) return null;
  // "YYYY-MM-DDTHH:MM" -> "YYYY-MM-DD HH:MM:SS"
  const parts = s.split('T');
  if (parts.length !== 2) return null;
  const date = parts[0];
  const time = parts[1];
  const hhmmss = time.length === 5 ? `${time}:00` : time;
  return `${date} ${hhmmss}`;
}

function getBasePath() {
  const raw = (window.__APP_CONFIG__ && window.__APP_CONFIG__.BASE_PATH) ? String(window.__APP_CONFIG__.BASE_PATH) : '/ict8';
  const s = raw.trim();
  if (!s) return '';
  const withSlash = s.startsWith('/') ? s : `/${s}`;
  return withSlash.replace(/\/+$/, '');
}

function getApiBase() {
  const raw = (
    (typeof window.API_BASE_URL === 'string' && window.API_BASE_URL) ||
    (window.__APP_CONFIG__ && window.__APP_CONFIG__.API_BASE) ||
    ''
  );
  return String(raw || '').trim().replace(/\/+$/, '');
}

function buildFileUrl(filepath) {
  const fp = String(filepath || '').trim().replace(/^\/+/, '');
  if (!fp) return '#';

  const apiBase = getApiBase();
  if (apiBase) return `${apiBase}/${fp}`;

  // fallback: assume backend is hosted under BASE_PATH on same origin
  return `${getBasePath()}/backend/public/${fp}`;
}

function setButtonsDisabled(els, disabled) {
  if (els.btnSave) els.btnSave.disabled = !!disabled;
}

function setLoading(els, loading) {
  if (els.subtitle) {
    els.subtitle.textContent = loading ? 'กำลังโหลด...' : (els.subtitle.textContent || '');
  }
}

function showError(els, msg) {
  if (els.form) els.form.style.display = 'none';
  if (els.error) {
    els.error.style.display = 'block';
    els.error.textContent = msg;
  }
  if (els.subtitle) els.subtitle.textContent = 'เกิดข้อผิดพลาด';
}

function hideError(els) {
  if (els.error) {
    els.error.style.display = 'none';
    els.error.textContent = '';
  }
}

function setText(el, v) {
  if (!el) return;
  el.textContent = v === undefined || v === null || v === '' ? '-' : String(v);
}

function formatBytes(bytes) {
  const b = Number(bytes || 0);
  if (!Number.isFinite(b) || b <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(b) / Math.log(1024)));
  const v = b / Math.pow(1024, i);
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}
