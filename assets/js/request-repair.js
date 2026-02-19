// assets/js/request-repair.js

document.addEventListener("DOMContentLoaded", () => {
	initRepairRequestForm();
});

function initRepairRequestForm() {
	const form = document.querySelector("#request-repair-form");
	if (!form) {
		console.warn("[request-repair] form not found");
		return;
	}

	const provinceSelect = form.querySelector("#province_id");
	const orgSelect = form.querySelector("#organization_id");
	const deviceSelect = form.querySelector("#device_id");

	const typeEl = form.querySelector("#type_of_device_title");
	const ipEl = form.querySelector("#ip_address");
	const locationEl = form.querySelector("#location");

	const submitBtn = form.querySelector("button[type=submit]");
	const fileInput = form.querySelector("#attachments");
	const previewEl = document.querySelector("#attachments-preview");
	const msgEl = document.querySelector("#request-form-message");

	/** @type {Map<string, any>} */
	const orgById = new Map();
	/** @type {Map<string, any>} */
	const deviceById = new Map();

	// initial states
	setSelectOptions(orgSelect, [{ value: "", label: "-- กรุณาเลือกจังหวัดก่อน --" }], true);
	setSelectOptions(deviceSelect, [{ value: "", label: "-- กรุณาเลือกหน่วยงานก่อน --" }], true);
	clearAutoFields();

	// load provinces
	loadProvinces(provinceSelect);

	// province -> organizations
	provinceSelect?.addEventListener("change", async () => {
		showMsg(msgEl, "", false, false);

		const provinceId = String(provinceSelect.value || "").trim();
		orgById.clear();
		deviceById.clear();
		clearAutoFields();

		setSelectOptions(deviceSelect, [{ value: "", label: "-- กรุณาเลือกหน่วยงานก่อน --" }], true);

		if (!provinceId) {
			setSelectOptions(orgSelect, [{ value: "", label: "-- กรุณาเลือกจังหวัดก่อน --" }], true);
			return;
		}

		await loadOrganizations(orgSelect, orgById, provinceId);
	});

	// organization -> devices + location
	orgSelect?.addEventListener("change", async () => {
		showMsg(msgEl, "", false, false);

		const orgId = String(orgSelect.value || "").trim();
		deviceById.clear();

		setSelectOptions(deviceSelect, [{ value: "", label: "กำลังโหลด..." }], true);
		clearDeviceFields();

		const org = orgById.get(orgId);
		locationEl.value = org?.location || "";

		if (!orgId) {
			setSelectOptions(deviceSelect, [{ value: "", label: "-- กรุณาเลือกหน่วยงานก่อน --" }], true);
			return;
		}

		await loadDevices(deviceSelect, deviceById, orgId);
	});

	// device -> type/ip
	deviceSelect?.addEventListener("change", () => {
		showMsg(msgEl, "", false, false);

		const deviceId = String(deviceSelect.value || "").trim();
		const d = deviceById.get(deviceId);

		typeEl.value = d?.type_of_device_title || "";
		ipEl.value = d?.ip || "";
	});

	// preview files
	if (fileInput && previewEl) {
		fileInput.addEventListener("change", () => {
			previewEl.innerHTML = "";
			const files = Array.from(fileInput.files || []);
			for (const f of files) {
				const li = document.createElement("li");
				li.textContent = `${f.name} (${Math.round(f.size / 1024)} KB)`;
				previewEl.appendChild(li);
			}
		});
	}

	// submit
	form.addEventListener("submit", async (e) => {
		e.preventDefault();
		showMsg(msgEl, "", false, false);

		try {
			submitBtn.disabled = true;

			const provinceId = String(provinceSelect?.value || "").trim();
			const orgId = String(orgSelect?.value || "").trim();
			const deviceId = String(deviceSelect?.value || "").trim();

			if (!provinceId) {
				showMsg(msgEl, "❌ กรุณาเลือกจังหวัด", true, true);
				return;
			}
			if (!orgId) {
				showMsg(msgEl, "❌ กรุณาเลือกหน่วยงาน", true, true);
				return;
			}
			if (!deviceId) {
				showMsg(msgEl, "❌ กรุณาเลือกชื่ออุปกรณ์", true, true);
				return;
			}

			const fd = new FormData(form);

			// บังคับ type=3 (repair)
			fd.set("request_type", "3");
			fd.set("province_id", provinceId);

			// backend ต้องการ device_id (ไม่ใช่ device_name)
			fd.set("device_id", deviceId);

			// request_sub_type: repair = NULL (ไม่ต้องส่ง)
			fd.delete("request_sub_type");

			// ไม่ต้องส่ง organization_id (เก็บไว้ใช้ UI)
			// แต่ส่งไปก็ไม่เป็นไร—ลบให้ชัวร์
			fd.delete("organization_id");

			const res = await window.apiFetch("/requests", {
				method: "POST",
				body: fd,
			});

			alert("✅ ส่งแจ้งซ่อมเรียบร้อยแล้ว");
			console.log("[request-repair] created:", res);

			form.reset();
			if (previewEl) previewEl.innerHTML = "";

			// reset dependent selects
			orgById.clear();
			deviceById.clear();
			clearAutoFields();
			setSelectOptions(orgSelect, [{ value: "", label: "-- กรุณาเลือกจังหวัดก่อน --" }], true);
			setSelectOptions(deviceSelect, [{ value: "", label: "-- กรุณาเลือกหน่วยงานก่อน --" }], true);

			// reload provinces (ให้กลับมาสะอาด)
			await loadProvinces(provinceSelect);
		} catch (err) {
			console.error("[request-repair] submit error:", err);
			const msg = err?.payload?.message || err?.message || "เกิดข้อผิดพลาดในการส่งแจ้งซ่อม";
			showMsg(msgEl, "❌ " + msg, true, true);
		} finally {
			submitBtn.disabled = false;
		}
	});

	function clearDeviceFields() {
		typeEl.value = "";
		ipEl.value = "";
	}

	function clearAutoFields() {
		if (typeEl) typeEl.value = "";
		if (ipEl) ipEl.value = "";
		if (locationEl) locationEl.value = "";
	}
}

async function loadProvinces(selectEl) {
	if (!selectEl) return;
	selectEl.innerHTML = `<option value="">กำลังโหลด...</option>`;

	try {
		const res = await window.apiFetch("/provinces?limit=200", { method: "GET" });
		const items = normalizeList(res);

		if (!items.length) {
			selectEl.innerHTML = `<option value="">-- ไม่มีข้อมูลจังหวัด --</option>`;
			return;
		}

		selectEl.innerHTML = `<option value="">-- กรุณาเลือก --</option>`;
		for (const p of items) {
			const opt = document.createElement("option");
			opt.value = p.province_id ?? p.id ?? "";
			opt.textContent = p.nameTH ?? p.name_th ?? p.nameEN ?? p.name_en ?? "-";
			selectEl.appendChild(opt);
		}
	} catch (err) {
		console.error("[request-repair] load provinces failed:", err);
		selectEl.innerHTML = `<option value="">โหลดจังหวัดไม่สำเร็จ</option>`;
	}
}

async function loadOrganizations(selectEl, cache, provinceId) {
	if (!selectEl) return;

	selectEl.innerHTML = `<option value="">กำลังโหลด...</option>`;
	selectEl.disabled = true;

	try {
		const res = await window.apiFetch(
			`/organizations?province_id=${encodeURIComponent(provinceId)}&limit=200`,
			{ method: "GET" }
		);
		const items = normalizeList(res);

		if (!items.length) {
			selectEl.innerHTML = `<option value="">-- ไม่มีหน่วยงานในจังหวัดนี้ --</option>`;
			selectEl.disabled = true;
			return;
		}

		selectEl.innerHTML = `<option value="">-- กรุณาเลือก --</option>`;
		for (const org of items) {
			const id = String(org.organization_id ?? org.id ?? "");
			if (!id) continue;
			cache.set(id, org);

			const opt = document.createElement("option");
			opt.value = id;
			opt.textContent = org.name ?? org.organization_name ?? "-";
			selectEl.appendChild(opt);
		}

		selectEl.disabled = false;
	} catch (err) {
		console.error("[request-repair] load organizations failed:", err);
		selectEl.innerHTML = `<option value="">โหลดหน่วยงานไม่สำเร็จ</option>`;
		selectEl.disabled = true;
	}
}

async function loadDevices(selectEl, cache, organizationId) {
	if (!selectEl) return;

	selectEl.innerHTML = `<option value="">กำลังโหลด...</option>`;
	selectEl.disabled = true;

	try {
		const res = await window.apiFetch(
			`/devices?organization_id=${encodeURIComponent(organizationId)}&page=1&limit=200`,
			{ method: "GET" }
		);
		const items = normalizeList(res);

		if (!items.length) {
			selectEl.innerHTML = `<option value="">-- ไม่มีอุปกรณ์ในหน่วยงานนี้ --</option>`;
			selectEl.disabled = true;
			return;
		}

		selectEl.innerHTML = `<option value="">-- กรุณาเลือก --</option>`;
		for (const d of items) {
			const id = String(d.device_id ?? d.id ?? "");
			if (!id) continue;
			cache.set(id, d);

			const opt = document.createElement("option");
			opt.value = id;
			opt.textContent = d.device_name ?? "-";
			selectEl.appendChild(opt);
		}

		selectEl.disabled = false;
	} catch (err) {
		console.error("[request-repair] load devices failed:", err);
		selectEl.innerHTML = `<option value="">โหลดรายการอุปกรณ์ไม่สำเร็จ</option>`;
		selectEl.disabled = true;
	}
}

function normalizeList(res) {
	const d = res?.data;
	if (Array.isArray(d)) return d;
	if (Array.isArray(d?.items)) return d.items;
	if (Array.isArray(d?.rows)) return d.rows;
	if (Array.isArray(res?.items)) return res.items;
	if (Array.isArray(res?.rows)) return res.rows;
	return [];
}

function setSelectOptions(selectEl, options, disabled) {
	if (!selectEl) return;
	selectEl.innerHTML = "";
	for (const o of options) {
		const opt = document.createElement("option");
		opt.value = o.value;
		opt.textContent = o.label;
		selectEl.appendChild(opt);
	}
	selectEl.disabled = !!disabled;
}

function showMsg(el, text, isError, show) {
	if (!el) return;
	el.style.display = show ? "block" : "none";
	el.textContent = text || "";
	el.className =
		"request-form-footer-note " +
		(isError ? "request-form-footer-error" : "request-form-footer-success");
}

