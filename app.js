/* KTY App v2.0 : โค้ดหน้าแอป (แยกจาก index.html เพื่อความปลอดภัยและความเสถียร) */
'use strict';
/* =========================================================
   KTY 1994 ระบบเบิก–จ่ายวัสดุ : หน้าแอป (PWA) v1.0
   ========================================================= */
const CFG = self.KTY_CONFIG || window.KTY_CONFIG || {};
/* ธีม: B = Emerald Noir (ค่าเริ่มต้น), A = Ivory Emerald */
const THEME = () => (localStorage.getItem('kty_theme') === 'A' ? 'A' : 'B');
function applyTheme() {
  document.documentElement.dataset.theme = THEME();
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.setAttribute('content', THEME() === 'A' ? '#0B110E' : '#08100C');
}
applyTheme();
/* รูปที่โหลดไม่ได้: ถ้ามี data-fb ใช้ข้อความนั้นแทน (อักษรย่อ) ไม่มีก็ซ่อนรูป ให้เห็นภาพประกอบด้านหลัง */
document.addEventListener('error', e => {
  const t = e.target;
  if (t && t.tagName === 'IMG' && t.hasAttribute('data-fb')) { const f = t.getAttribute('data-fb'); if (f && t.parentNode) t.parentNode.textContent = f; else t.remove(); }
}, true);
const BRAND = '<div class="brand"><span>KTY</span><i></i><span class="y">1994</span></div>';
const $app = document.getElementById('app');
const S = { token: null, user: null, boot: null, reg: null, regOpts: null, forgot: null, timers: [], projectId: null, seq: 0, cache: {}, pulse: null };
const stale = my => my !== S.seq; // หน้าที่ถูกเปลี่ยนไปแล้ว ห้ามวาดทับหน้าใหม่

/* ---------- utils ---------- */
const esc = s => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtN = n => Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 });
const fmtB = n => '฿' + Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const TH_MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
function fmtD(iso, time = true) {
  if (!iso) return '-';
  const d = new Date(iso); if (isNaN(d)) return '-';
  const s = d.getDate() + ' ' + TH_MON[d.getMonth()] + ' ' + String(d.getFullYear() + 543).slice(-2);
  return time ? s + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') : s;
}
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)).replace(/[^A-Za-z0-9-]/g, '');
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
function initials(u) { // ข้ามสระนำหน้า (เ แ โ ใ ไ) และสัญลักษณ์ เพื่อให้ได้พยัญชนะ/ตัวอักษรตัวแรกจริง
  const first = s => { const m = String(s || '').match(/[\u0E01-\u0E2EA-Za-z0-9]/); return m ? m[0] : ''; };
  const parts = String(u.name || '').trim().split(/\s+/);
  const a = first(u.first_name || parts[0] || u.username), b = first(u.last_name || parts[1] || '');
  return ((a || '?') + b).toUpperCase();
}
const ROLE_TH = { REQUESTER: 'ผู้ขอเบิก', APPROVER: 'ผู้อนุมัติ', STORE: 'สโตร์', ADMIN: 'แอดมิน' };
const USTAT_TH = { PENDING_VERIFY: 'รอยืนยัน OTP', PENDING_APPROVAL: 'รออนุมัติ', ACTIVE: 'ใช้งาน', REJECTED: 'ไม่อนุมัติ', INACTIVE: 'ปิดใช้งาน' };
const DOCTYPE_TH = { REQ: 'ใบเบิก', RCV: 'รับเข้า', RTN: 'คืนของ', TRF: 'โอนคลัง', BRW: 'ยืมเครื่องมือ', ADJ: 'ปรับยอด' };

/* ---------- icons ---------- */
const IC = {
  back: '<path d="m15 18-6-6 6-6"/>', home: '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>', plus: '<path d="M12 5v14M5 12h14"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  check: '<path d="M20 6 9 17l-5-5"/>', eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>', mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10"/>',
  doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M12 12v6M9 15h6"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
  users: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 9M22 21a7 7 0 0 0-4-6.3"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7z"/>',
  cam: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  stock: '<path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/>', tool: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>', grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', tbl: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16"/>', cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L22 7H6"/>', minus: '<path d="M5 12h14"/>', chev: '<path d="m6 9 6 6 6-6"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>', logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'
};
const CAT_IC = {
  ALL: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  ST: '<path d="M4 7h16M4 12h16M4 17h16"/>', CM: '<path d="M6 4h12l2 16H4z"/><path d="M9 10h6"/>', AG: '<path d="M3 19q9-14 18 0z"/>',
  BR: '<rect x="3" y="5" width="8" height="5"/><rect x="13" y="5" width="8" height="5"/><rect x="8" y="14" width="8" height="5"/>',
  WD: '<path d="M3 7h18v4H3zM3 13h18v4H3z"/>', EL: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>', PL: '<rect x="2" y="9" width="20" height="6" rx="3"/><path d="M18 9v6"/>',
  PT: '<path d="M7 3h10v4H7zM5 7h14v14H5z"/>', MS: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  TL: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>'
};
const catIco = (c, size = 22, sw = 1.7) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${CAT_IC[c] || CAT_IC.MS}</svg>`;
function matImg(m, size) { // รูปจริงจากแอดมิน/สโตร์ ถ้าไม่มีหรือโหลดไม่ได้ ใช้ภาพประกอบตามหมวด
  return catIco(m.category_code, size, 1.4) + (m.image_url && /^https:\/\//.test(m.image_url) ? `<img src="${esc(m.image_url)}" alt="" loading="lazy" referrerpolicy="no-referrer" data-fb="">` : '');
}
const ico = (n, size = 20, sw = 2) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]}</svg>`;
const GHOST = s => `<div class="av ghost" style="width:${s}px;height:${s}px"><svg width="${s * 0.8}" height="${s * 0.8}" viewBox="0 0 64 64" role="img" aria-label="รูปบุคคลทั่วไป"><circle cx="32" cy="24" r="12" fill="var(--m2)"/><path d="M8 64c0-14 11-24 24-24s24 10 24 24z" fill="var(--m2)"/></svg></div>`;
function avatar(u, s = 44) {
  if (u && u.photo_url && /^https:\/\//.test(u.photo_url)) return `<div class="av" style="width:${s}px;height:${s}px"><img src="${esc(u.photo_url)}" alt="" referrerpolicy="no-referrer" data-fb="${esc(initials(u))}"></div>`;
  if (!u || !(u.first_name || u.name)) return GHOST(s);
  return `<div class="av" style="width:${s}px;height:${s}px;font-size:${Math.round(s * 0.38)}px">${esc(initials(u))}</div>`;
}

/* ---------- toast / loading / modal ---------- */
let toastT;
function toast(msg, bad = false) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = 'show' + (bad ? ' bad' : ''); t.onclick = null;
  clearTimeout(toastT); toastT = setTimeout(() => (t.className = ''), bad ? 5000 : 3000);
}
let loadingEl = null, loadingN = 0;
function busy(on) {
  loadingN = Math.max(0, loadingN + (on ? 1 : -1));
  if (loadingN && !loadingEl) { loadingEl = document.createElement('div'); loadingEl.className = 'loading'; loadingEl.innerHTML = '<div class="spin" role="progressbar" aria-label="กำลังโหลด"></div>'; document.body.appendChild(loadingEl); }
  if (!loadingN && loadingEl) { loadingEl.remove(); loadingEl = null; }
}
function modal(html, onMount) {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(bg);
  const close = () => bg.remove();
  bg.addEventListener('click', e => { if (e.target === bg) close(); });
  $$('[data-close]', bg).forEach(b => b.addEventListener('click', close));
  if (onMount) onMount(bg, close);
  return close;
}

/* ---------- API ---------- */
class ApiError extends Error { constructor(code, msg) { super(msg); this.code = code; } }
async function api(action, data = {}, opt = {}) {
  if (!CFG.API_URL) throw new ApiError('NO_CONFIG', 'ยังไม่ได้ตั้งค่า API_URL ในไฟล์ config.js');
  if (!opt.quiet) busy(true);
  try {
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 45000);
    let res;
    try {
      res = await fetch(CFG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, signal: ctl.signal, redirect: 'follow',
        body: JSON.stringify({ action, token: S.token, data, device: navigator.userAgent.slice(0, 110) }) });
    } catch (e) {
      throw new ApiError('NETWORK', e.name === 'AbortError' ? 'ระบบตอบช้าเกินไป กรุณาลองใหม่' : 'เชื่อมต่อไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่');
    } finally { clearTimeout(tm); }
    let j;
    try { j = await res.json(); } catch (e) { throw new ApiError('BAD_RESPONSE', 'ระบบตอบกลับผิดรูปแบบ กรุณาลองใหม่'); }
    if (!j.ok) {
      if (['UNAUTHORIZED', 'SESSION_EXPIRED'].includes(j.error.code) && S.token) { logout(true); }
      throw new ApiError(j.error.code, j.error.message);
    }
    return j.data;
  } finally { if (!opt.quiet) busy(false); }
}
const WRITE_ACTIONS = ['createReq', 'cancelReq', 'approveDoc', 'rejectDoc', 'issueDoc', 'receive', 'adminApproveUser', 'adminRejectUser', 'adminUpdateUser', 'adminSaveProject', 'adminAddListItem'];
const _api = api;
api = async function (action, data, opt) { const r = await _api(action, data, opt); if (WRITE_ACTIONS.includes(action)) markStale(); return r; };

/* ---------- อ่านแบบมีแคช: แสดงของเดิมทันที แล้วอัปเดตเมื่อข้อมูลใหม่มาถึง ---------- */
async function cached(key, action, data, paint) {
  const my = S.seq, hit = S.cache[key];
  if (hit) paint(hit, true);
  try {
    const fresh = await api(action, data, { quiet: true });
    S.cache[key] = fresh;
    if (!stale(my) && JSON.stringify(fresh) !== JSON.stringify(hit)) paint(fresh, false);
    return fresh;
  } catch (e) { if (!hit && !stale(my)) throw e; }
}

/* ---------- session ---------- */
function saveSession(token, user, remember) {
  S.token = token; S.user = user;
  const st = remember ? localStorage : sessionStorage;
  try { (remember ? sessionStorage : localStorage).removeItem('kty_s'); st.setItem('kty_s', JSON.stringify({ token, user })); } catch (e) { }
}
function loadSession() {
  try {
    const raw = sessionStorage.getItem('kty_s') || localStorage.getItem('kty_s');
    if (raw) { const s = JSON.parse(raw); S.token = s.token; S.user = s.user; }
  } catch (e) { }
}
function logout(expired) {
  S.cart = null;
  const tt = document.getElementById('toast'); if (tt) tt.className = '';
  try { localStorage.removeItem(bootKey()); localStorage.removeItem('kty_s'); sessionStorage.removeItem('kty_s'); } catch (e) { }
  S.token = null; S.user = null; S.boot = null; S.cache = {}; S.pulse = null;
  if (expired) toast('หมดเวลาการใช้งาน กรุณาเข้าสู่ระบบใหม่', true);
  go('/login');
}
/* ข้อมูลตั้งต้น: ใช้ของที่จำไว้ในเครื่องทันที แล้วอัปเดตเบื้องหลัง (เปลี่ยนหน้าได้ทันที ไม่ต้องรอ) */
function setBoot(b) {
  S.boot = b; S.user = b.user;
  const ids = b.projects.map(p => p.project_id);
  if (!ids.includes(S.projectId)) S.projectId = (b.projects.find(p => p.mine) || b.projects[0] || {}).project_id || null;
  try { localStorage.setItem(bootKey(), JSON.stringify(b)); } catch (e) { }
}
let bootReq = null;
function fetchBoot() {
  if (!bootReq) bootReq = api('bootstrap', {}, { quiet: true }).then(b => { setBoot(b); S.bootAt = Date.now(); return b; }).finally(() => { bootReq = null; });
  return bootReq;
}
async function loadBoot(force) {
  if (!S.boot) {
    try { const c = JSON.parse(localStorage.getItem(bootKey()) || 'null'); if (c && c.user && S.user && c.user.user_id === S.user.user_id) S.boot = c; } catch (e) { }
  }
  if (S.boot && !force) {
    if (!S.bootAt || Date.now() - S.bootAt > 60000) fetchBoot().then(() => softRefresh()).catch(() => { });
    return S.boot;
  }
  if (S.boot && force) { fetchBoot().then(() => softRefresh()).catch(() => { }); return S.boot; }
  return fetchBoot();
}
/* วาดหน้าใหม่เงียบ ๆ เมื่อข้อมูลเบื้องหลังมาถึง (เฉพาะหน้าที่ไม่มีการพิมพ์ค้าง) */
function softRefresh() {
  const p = (location.hash || '').slice(1);
  if (/^\/(home|stock)$/.test(p) && !document.querySelector('.modal-bg')) render(true);
}
const markStale = () => { S.bootAt = 0; S.cache = {}; };
const role = () => (S.user ? S.user.role : '');
const money = () => !!(S.boot && S.boot.user && S.boot.user.can_see_money);
const bootKey = () => 'kty_boot_' + ((S.user && S.user.user_id) || '');
const isRole = (...r) => r.includes(role());

/* ---------- แจ้งเตือนในแอป: เช็กงานใหม่เป็นระยะ ---------- */
let audioCtx = null;
document.addEventListener('pointerdown', () => { if (!audioCtx && window.AudioContext) { try { audioCtx = new AudioContext(); } catch (e) { } } }, { once: true });
function ding() {
  if (localStorage.getItem('kty_sound') === 'off') return;
  try { if (navigator.vibrate) navigator.vibrate([120, 60, 120]); } catch (e) { }
  try { if (!audioCtx) return; const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.frequency.value = 880; g.gain.setValueAtTime(0.0001, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.25, audioCtx.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35); o.connect(g).connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 0.36); } catch (e) { }
}
function updateBadges(t) {
  const total = inboxCount(t);
  const a = document.querySelector('nav.bn a[href="#/inbox"]');
  if (a) { let b = a.querySelector('.badge'); if (total) { if (!b) { b = document.createElement('span'); b.className = 'badge'; b.style.cssText = 'top:0;right:calc(50% - 24px)'; a.appendChild(b); } b.textContent = total; } else if (b) b.remove(); }
  try { if (navigator.setAppBadge) total ? navigator.setAppBadge(total) : navigator.clearAppBadge(); } catch (e) { }
}
async function pulse() {
  if (!S.token || document.hidden) return;
  let r; try { r = await api('pulse', {}, { quiet: true }); } catch (e) { return; }
  const prev = S.pulse; S.pulse = r;
  if (S.boot) S.boot.tasks = r.tasks;
  updateBadges(r.tasks);
  if (!prev) return; // ครั้งแรกใช้เป็นจุดอ้างอิง
  const msgs = [];
  if (isRole('APPROVER', 'ADMIN') && r.tasks.to_approve > prev.tasks.to_approve) msgs.push(['มีใบเบิกใหม่รออนุมัติ ' + (r.tasks.to_approve - prev.tasks.to_approve) + ' ใบ', '/docs/PENDING']);
  if (isRole('STORE', 'ADMIN') && r.tasks.to_issue > prev.tasks.to_issue) msgs.push(['มีใบเบิกรอจ่ายของ', '/docs/APPROVED,PARTIAL']);
  if (r.tasks.applicants > prev.tasks.applicants) msgs.push(['มีผู้สมัครใหม่รออนุมัติ', '/admin/users']);
  if (isRole('ADMIN') && (r.tasks.diff_review || 0) > (prev.tasks.diff_review || 0)) msgs.push(['ผู้เบิกนับของไม่ตรงกับที่ส่ง รอคุณตรวจส่วนต่าง', '/inbox']);
  if ((r.tasks.to_confirm || 0) > (prev.tasks.to_confirm || 0)) msgs.push(['สโตร์ส่งของถึงคุณแล้ว กรุณานับและยืนยันรับ', '/inbox']);
  const old = {}; prev.my_docs.forEach(d => (old[d.doc_no] = d.status));
  r.my_docs.forEach(d => { if (old[d.doc_no] && old[d.doc_no] !== d.status) msgs.push(['ใบเบิก ' + d.doc_no + ': ' + d.status_name, '/doc/' + encodeURIComponent(d.doc_no)]); });
  if (msgs.length) { markStale(); notifyInApp(msgs[0][0] + (msgs.length > 1 ? ' และอีก ' + (msgs.length - 1) + ' เรื่อง' : ''), msgs[0][1]); softRefresh(); }
}
function notifyInApp(text, path) {
  ding();
  const t = document.getElementById('toast');
  t.innerHTML = esc(text) + (path ? ' <u style="font-weight:600">เปิดดู</u>' : ''); t.className = 'show';
  t.onclick = () => { t.className = ''; if (path) go(path); };
  clearTimeout(toastT); toastT = setTimeout(() => (t.className = ''), 8000);
}
let pulseTimer = null;
function startPulse() {
  if (pulseTimer) return;
  const sec = Math.max(5, Number(CFG.POLL_SECONDS || (S.boot && S.boot.settings.poll_seconds) || 30));
  pulseTimer = setInterval(pulse, sec * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) pulse(); });
  setTimeout(pulse, 1500);
  if (localStorage.getItem('kty_push') && pushSupport().ok && window.Notification && Notification.permission === 'granted') fbMessaging().catch(() => { });
}

/* ---------- router ---------- */
const ROUTES = [];
const route = (pattern, fn, auth = true) => ROUTES.push({ re: new RegExp('^' + pattern.replace(/:(\w+)/g, '([^/]+)') + '$'), fn, auth });
const go = (path) => { if (location.hash === '#' + path) render(); else location.hash = path; };
function clearTimers() { S.timers.forEach(clearInterval); S.timers = []; }
async function render(soft) {
  clearTimers();
  S.soft = !!soft;
  const path = decodeURIComponent((location.hash || '#/').slice(1)) || '/';
  if (path === '/' || path === '') return go(S.token ? '/home' : '/login');
  const r = ROUTES.find(x => x.re.test(path));
  if (!r) return go(S.token ? '/home' : '/login');
  if (r.auth && !S.token) return go('/login');
  if (!r.auth && S.token && ['/login'].includes(path)) return go('/home');
  const args = path.match(r.re).slice(1);
  const my = ++S.seq;
  try {
    if (r.auth) { await loadBoot(); startPulse(); }
    if (stale(my)) return;
    await r.fn(...args);
    if (!S.soft) window.scrollTo(0, 0);
    const h = $('main h1, main h2, .top b'); if (h) h.setAttribute('tabindex', '-1');
  } catch (e) {
    if (e.code === 'UNAUTHORIZED' || e.code === 'SESSION_EXPIRED') return;
    $app.innerHTML = topbar('เกิดข้อผิดพลาด', '', '/home') + `<main><div class="note bad">${esc(e.message)}</div><button class="btn" id="rl">ลองใหม่</button></main>`;
    $('#rl').onclick = () => location.reload();
  }
}
window.addEventListener('hashchange', render);

/* ---------- shared UI ---------- */
function topbar(title, sub = '', back = null, right = '') {
  return `<header class="top">${back !== null ? `<button class="iconbtn" data-go="${esc(back)}" aria-label="กลับ">${ico('back', 22)}</button>` : '<span style="width:6px"></span>'}
  <div class="t"><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div>${right || BRAND}</header>`;
}
function steps(cur, labels) {
  return `<div class="steps" style="grid-template-columns:repeat(${labels.length},1fr)">${labels.map((l, i) =>
    `<div class="${i + 1 < cur ? 'done' : i + 1 === cur ? 'cur' : ''}"><i></i><span>${i + 1}. ${esc(l)}${i + 1 < cur ? ' ✓' : ''}</span></div>`).join('')}</div>`;
}
function field(id, label, opt = {}) {
  const t = opt.type || 'text';
  return `<div class="fld"><label for="${id}">${esc(label)}</label><div class="inp" id="${id}-box"><input id="${id}" type="${t}" ${opt.value !== undefined ? `value="${esc(opt.value)}"` : ''} ${opt.ph ? `placeholder="${esc(opt.ph)}"` : ''} ${opt.attrs || ''} ${opt.mono ? 'class="mono"' : ''}>${opt.right || ''}</div><div class="hint" id="${id}-hint">${esc(opt.hint || '')}</div></div>`;
}
function setHint(id, msg, state) {
  const h = document.getElementById(id + '-hint'), b = document.getElementById(id + '-box');
  if (h) { h.className = 'hint' + (state === true ? ' ok' : state === false ? ' bad' : ''); h.innerHTML = (state === true ? ico('check', 14, 2.5) : '') + '<span>' + esc(msg) + '</span>'; }
  if (b) { b.classList.toggle('err', state === false); b.classList.toggle('ok', state === true); }
}
const eyeBtn = id => `<button type="button" class="iconbtn" style="width:36px;height:36px;color:var(--m2)" data-eye="${id}" aria-label="แสดงหรือซ่อนรหัสผ่าน">${ico('eye')}</button>`;
function inboxCount(t) { t = t || {}; return (isRole('APPROVER', 'ADMIN') ? t.to_approve || 0 : 0) + (isRole('STORE', 'ADMIN') ? t.to_issue || 0 : 0) + (t.applicants || 0) + (t.to_confirm || 0) + (isRole('ADMIN') ? t.diff_review || 0 : 0); }
function bottomNav(cur) {
  const n = inboxCount(S.boot && S.boot.tasks);
  const it = (k, path, icon, label, badge) => `<a href="#${path}" class="${cur === k ? 'on' : ''}">${ico(icon, 22, 1.8)}${label}${badge ? `<span class="badge" style="top:0;right:calc(50% - 24px)">${badge}</span>` : ''}</a>`;
  return `<nav class="bn">${it('home', '/home', 'home', 'หน้าแรก')}${it('docs', '/docs', 'list', 'เอกสาร')}<button class="fab" id="navscan" aria-label="สแกน QR">${ico('scan', 24, 2)}</button>${it('inbox', '/inbox', 'inbox', 'งานรอ', n)}${it('me', '/profile', 'user', 'ฉัน')}</nav>`;
}
function bindCommon(root = $app) {
  $$('[data-go]', root).forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
  const sc = $('#navscan', root); if (sc) sc.onclick = () => toast('การสแกน QR จะเปิดใช้พร้อมโมดูลยืม-คืนอุปกรณ์');
  $$('[data-eye]', root).forEach(b => b.addEventListener('click', () => { const i = document.getElementById(b.dataset.eye); i.type = i.type === 'password' ? 'text' : 'password'; }));
}
const stChip = (code, name) => `<span class="st st-${esc(code)}">${esc(name || (S.boot && S.boot.status_names[code]) || code)}</span>`;
function showErr(e, boxId) {
  const el = boxId && document.getElementById(boxId);
  if (el) { el.innerHTML = `<div class="note bad">${esc(e.message)}</div>`; el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  else toast(e.message, true);
}

/* ---------- validators (ตรงกับฝั่งเซิร์ฟเวอร์) ---------- */
const V = {
  username: v => /^[a-z0-9][a-z0-9_.]{3,19}$/.test(String(v).trim().toLowerCase()),
  pwRules(pw, user, min = 8) {
    return { len: pw.length >= min && pw.length <= 64, mix: /[A-Za-z]/.test(pw) && /\d/.test(pw), nouser: !user || !pw.toLowerCase().includes(String(user).toLowerCase()), nospace: !/\s/.test(pw) };
  },
  pwScore(pw) { let s = 0; if (pw.length >= 8) s++; if (pw.length >= 12) s++; if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++; if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++; else if (/\d/.test(pw) && /[A-Za-z]/.test(pw)) s = Math.max(s, 2); return Math.min(4, s); },
  nid(v) { const d = String(v).replace(/\D/g, ''); if (!/^[1-8]\d{12}$/.test(d)) return false; let s = 0; for (let i = 0; i < 12; i++) s += +d[i] * (13 - i); return (11 - (s % 11)) % 10 === +d[12]; },
  phone: v => /^0[689]\d{8}$/.test(String(v).replace(/\D/g, '')),
  email: v => /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/.test(String(v).trim().toLowerCase()),
  name: v => /^[\u0E00-\u0E7FA-Za-z .'\-]+$/.test(String(v).trim())
};
const fmtNid = v => { const d = String(v).replace(/\D/g, '').slice(0, 13); const p = [d.slice(0, 1), d.slice(1, 5), d.slice(5, 10), d.slice(10, 12), d.slice(12)]; return p.filter(Boolean).join('-'); };
const fmtPhone = v => { const d = String(v).replace(/\D/g, '').slice(0, 10); return [d.slice(0, 3), d.slice(3, 6), d.slice(6)].filter(Boolean).join('-'); };

/* ---------- signature pad ---------- */
function sigPad(el) {
  const cv = document.createElement('canvas'); el.appendChild(cv);
  const ph = document.createElement('div'); ph.className = 'ph'; ph.textContent = 'เซ็นชื่อในกรอบนี้'; el.appendChild(ph);
  const ctx = cv.getContext('2d'); let drawing = false, empty = true, last = null;
  const resize = () => { const r = el.getBoundingClientRect(), dpr = window.devicePixelRatio || 1; cv.width = r.width * dpr; cv.height = r.height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0E1311'; empty = true; ph.style.display = ''; };
  resize();
  const pos = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  cv.addEventListener('pointerdown', e => { drawing = true; last = pos(e); cv.setPointerCapture(e.pointerId); e.preventDefault(); });
  cv.addEventListener('pointermove', e => { if (!drawing) return; const p = pos(e); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; if (empty) { empty = false; ph.style.display = 'none'; } });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => cv.addEventListener(t, () => (drawing = false)));
  return {
    clear: resize, isEmpty: () => empty,
    dataUrl() { // ย่อเป็น 600x250 ให้ไฟล์เล็ก
      const o = document.createElement('canvas'); o.width = 600; o.height = 250;
      const c = o.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, 600, 250); c.drawImage(cv, 0, 0, 600, 250);
      return o.toDataURL('image/png');
    }
  };
}
function sigBlock(id, label) {
  return `<div class="fld"><div class="row"><span class="lbl grow">${esc(label)}</span><button type="button" class="link" data-sigclear="${id}">ล้าง</button></div><div class="sig" id="${id}"></div></div>`;
}

/* ---------- image resize (รูปโปรไฟล์) ---------- */
function resizeImage(file, max = 320, q = 0.82) {
  return new Promise((res, rej) => {
    if (!/^image\//.test(file.type)) return rej(new Error('กรุณาเลือกไฟล์รูปภาพ'));
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', q));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('เปิดไฟล์รูปนี้ไม่ได้')); };
    img.src = url;
  });
}

/* ---------- แนบรูปนับจำนวน: อัปโหลดทีละรูปเบื้องหลัง ลองใหม่เองเมื่อสัญญาณหลุด ---------- */
const sleep = ms => new Promise(r => setTimeout(r, ms));
function photoState() { return { items: [], batch: 'b' + uuid().replace(/-/g, '').slice(0, 20) }; }
function uploader(elId, st, opt) {
  const counts = () => ({ ok: st.items.filter(i => i.status === 'ok').length, all: st.items.length, err: st.items.filter(i => i.status === 'err').length });
  const draw = () => {
    const el = document.getElementById(elId); if (!el) return;
    const c = counts();
    el.innerHTML = `<div class="card" style="padding:12px 14px;gap:8px">
      <div class="line"><span class="lbl">${esc(opt.label)} <span style="color:var(--bad)">*</span></span><span class="small" style="color:${c.err ? 'var(--bad)' : 'var(--m2)'}">${c.all ? c.ok + '/' + c.all + ' รูป' + (c.err ? ' · ส่งไม่สำเร็จ ' + c.err : c.ok < c.all ? ' · กำลังส่ง' : ' ✓') : 'ยังไม่มีรูป'}</span></div>
      <div class="hscroll" style="margin:0;padding:0">${st.items.map((it, i) => `<div class="pt" data-i="${i}"><img src="${it.data}" alt="รูปที่ ${i + 1}">
        ${it.status === 'ok' ? `<span class="pok">${ico('check', 11, 3)}</span>` : it.status === 'err' ? `<button class="perr" data-retry="${i}" aria-label="ส่งใหม่">!</button>` : '<span class="pup"><i class="spin" style="width:18px;height:18px;border-width:2px"></i></span>'}
        <button class="pdel" data-del="${i}" aria-label="ลบรูป">${ico('x', 12, 2.6)}</button></div>`).join('')}
        <label class="padd">${ico('cam', 22, 1.7)}<span>ถ่ายรูป</span><input type="file" accept="image/*" capture="environment" class="sr" data-cap></label>
        <label class="padd">${ico('inbox', 22, 1.7)}<span>เลือกรูป</span><input type="file" accept="image/*" multiple class="sr" data-pick></label></div>
      <div class="small" style="color:var(--m2)">${esc(opt.hint || 'ถ่ายให้เห็นจำนวนชัด ๆ · แนบได้ไม่จำกัด · สัญญาณหลุดระบบส่งใหม่ให้เอง')}</div></div>`;
    $$('[data-cap],[data-pick]', el).forEach(inp => inp.onchange = e => add(e.target.files));
    $$('[data-del]', el).forEach(b => b.onclick = () => del(+b.dataset.del));
    $$('[data-retry]', el).forEach(b => b.onclick = () => { st.items[+b.dataset.retry].status = 'wait'; pump(); });
    $$('.pt img', el).forEach((im, i) => im.onclick = () => viewer(st.items.map(x => ({ url: x.data, label: opt.label })), i));
    if (opt.onChange) opt.onChange(c);
  };
  const add = async files => {
    for (const f of Array.from(files || [])) {
      try { st.items.push({ data: await resizeImage(f, 1280, 0.78), status: 'wait' }); draw(); } catch (e) { toast(e.message, true); }
    }
    pump();
  };
  const del = async i => {
    const it = st.items[i]; if (!it) return;
    if (it.status === 'ok' && it.att_id) { try { await api('attachDelete', { att_id: it.att_id }, { quiet: true }); } catch (e) { return toast(e.message, true); } }
    if (it.status === 'up') return toast('รอให้รูปนี้ส่งเสร็จก่อนจึงลบได้');
    st.items.splice(i, 1); draw();
  };
  const pump = async () => {
    if (st.busy) return; st.busy = true;
    let it;
    while ((it = st.items.find(x => x.status === 'wait'))) {
      it.status = 'up'; draw();
      for (let t = 0; t < 4; t++) {
        try { const r = await api('attachPhoto', { stage: opt.stage, batch_id: st.batch, doc_no: opt.docNo || '', photo: it.data }, { quiet: true }); it.att_id = r.att_id; it.status = 'ok'; break; }
        catch (e) { if (['BAD_INPUT', 'FORBIDDEN', 'NOT_FOUND', 'UNAUTHORIZED'].includes(e.code) || t === 3) { it.status = 'err'; if (t === 3 || e.code !== 'NETWORK') toast(e.message, true); break; } await sleep(1500 * (t + 1)); }
      }
      draw();
    }
    st.busy = false;
  };
  draw(); pump();
  return { ready: () => { const c = counts(); return c.all > 0 && c.ok === c.all; }, counts, redraw: draw };
}
function gateBtn(btn, up, label) {
  const c = up.counts();
  btn.disabled = !up.ready();
  btn.textContent = up.ready() ? label : c.all ? `รอรูปอัปโหลดครบ (${c.ok}/${c.all})` : 'แนบรูปอย่างน้อย 1 รูปก่อน';
}

/* ---------- ดูรูปเต็มจอ ---------- */
const STAGE_TH = { ISSUE: 'สโตร์ส่งของ', CONFIRM: 'ผู้เบิกรับของ', RCV: 'รับเข้าคลัง' };
function photoSrc(u, big) { return /^https:\/\//.test(u) ? u.replace(/sz=w\d+/, 'sz=' + (big ? 'w1600' : 'w400')) : (/^data:image\//.test(u) ? u : ''); }
function viewer(list, idx) {
  let i = idx;
  const bg = document.createElement('div'); bg.className = 'viewer';
  const draw = () => {
    const p = list[i], src = photoSrc(p.url, true);
    bg.innerHTML = `<div class="vtop"><span>${i + 1} / ${list.length}${p.label ? ' · ' + esc(p.label) : ''}${p.by ? ' · ' + esc(p.by) : ''}${p.at ? ' · ' + fmtD(p.at) : ''}</span><button class="iconbtn" data-x aria-label="ปิด">${ico('x', 22)}</button></div>
      <div class="vimg" id="vimg">${src ? `<img src="${esc(src)}" alt="รูปที่ ${i + 1}" referrerpolicy="no-referrer">` : `<div class="empty">ตัวอย่างรูป (โหมดทดสอบ)</div>`}</div>
      <div class="vnav"><button class="btn sec sm" data-p ${i ? '' : 'disabled'}>‹ ก่อนหน้า</button><span class="small" style="color:#B6A98E">แตะรูปเพื่อซูม</span><button class="btn sec sm" data-n ${i < list.length - 1 ? '' : 'disabled'}>ถัดไป ›</button></div>`;
    $('[data-x]', bg).onclick = () => bg.remove();
    $('[data-p]', bg).onclick = () => { if (i) { i--; draw(); } };
    $('[data-n]', bg).onclick = () => { if (i < list.length - 1) { i++; draw(); } };
    const im = $('#vimg img', bg); if (im) im.onclick = () => im.classList.toggle('z');
  };
  document.body.appendChild(bg); draw();
}

/* ---------- สลับมุมมอง การ์ด / รายการ / ตาราง ---------- */
const VIEW_IC = { card: 'grid', list: 'list', table: 'tbl' };
const getView = (k, d) => { const v = localStorage.getItem('kty_view_' + k); return ['card', 'list', 'table'].includes(v) ? v : d; };
function viewToggle(k, cur, dark) {
  return `<div class="vt${dark ? ' dk' : ''}" role="group" aria-label="มุมมอง">${['card', 'list', 'table'].map(v => `<button type="button" data-view="${v}" class="${v === cur ? 'on' : ''}" aria-label="${{ card: 'การ์ด', list: 'รายการ', table: 'ตาราง' }[v]}">${ico(VIEW_IC[v], 16, 1.8)}</button>`).join('')}</div>`;
}
function bindView(k, root, redraw) { $$('[data-view]', root).forEach(b => b.onclick = () => { localStorage.setItem('kty_view_' + k, b.dataset.view); $$('[data-view]', root).forEach(x => x.classList.toggle('on', x === b)); redraw(b.dataset.view); }); }
function sortRows(rows, sort, getters) {
  const g = getters[sort.k]; if (!g) return rows;
  return rows.slice().sort((a, b) => { const x = g(a), y = g(b); const c = typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'th'); return sort.dir * c; });
}
function thSort(label, k, sort, cls) { return `<th class="${cls || ''}" data-sort="${k}" style="cursor:pointer;white-space:nowrap">${label}${sort.k === k ? (sort.dir > 0 ? ' ↑' : ' ↓') : ''}</th>`; }
function bindSort(root, sort, redraw) { $$('[data-sort]', root).forEach(th => th.onclick = () => { if (sort.k === th.dataset.sort) sort.dir = -sort.dir; else { sort.k = th.dataset.sort; sort.dir = 1; } redraw(); }); }

/* ---------- share (ส่งต่อทาง LINE/แอปอื่น) ---------- */
async function shareDoc(doc, extra) {
  const link = location.origin + location.pathname + '#/doc/' + encodeURIComponent(doc.doc_no);
  const text = `${DOCTYPE_TH[doc.doc_type] || ''} ${doc.doc_no}\nสถานะ: ${doc.status_name || doc.status}${extra ? '\n' + extra : ''}\nเปิดดู: ${link}`;
  if (navigator.share) { try { await navigator.share({ title: doc.doc_no, text }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  modal(`<h2>ส่งต่อเอกสาร</h2><div class="card" style="white-space:pre-wrap;font-size:13px">${esc(text)}</div>
    <a class="btn" style="background:#06C755;color:#fff" href="https://line.me/R/share?text=${encodeURIComponent(text)}" target="_blank" rel="noopener">ส่งทาง LINE</a>
    <button class="btn sec" id="cp">คัดลอกข้อความ</button><button class="btn sec" data-close>ปิด</button>`, (bg, close) => {
    $('#cp', bg).onclick = async () => { try { await navigator.clipboard.writeText(text); toast('คัดลอกแล้ว'); close(); } catch (e) { toast('คัดลอกไม่ได้', true); } };
  });
}

/* =========================================================
   หน้าเข้าสู่ระบบ / สมัคร / OTP / ลืมรหัส
   ========================================================= */
route('/login', () => {
  $app.innerHTML = `<div class="hero"><div style="font-size:13px;letter-spacing:.08em;color:var(--ac)">หจก.กิตติยาก่อสร้าง 1994</div>
    <div class="row" style="align-items:flex-end;gap:12px"><div class="disp" style="font-weight:700;font-size:72px;line-height:.85;letter-spacing:-.02em">KTY</div><div class="disp" style="font-weight:700;font-size:17px;background:var(--metal);color:#0B110E;padding:4px 10px;border-radius:4px;margin-bottom:4px">1994</div></div>
    <div style="height:2px;width:64px;background:var(--ac)"></div><h1 class="disp" style="font-size:22px;margin:0;font-weight:600">ระบบเบิก–จ่ายวัสดุ</h1></div>
  <main style="padding:24px 24px 32px">
    <form id="f" class="fld" style="gap:14px" novalidate>
      ${field('u', 'Username', { attrs: 'autocomplete="username" autocapitalize="none" spellcheck="false"' })}
      ${field('p', 'รหัสผ่าน', { type: 'password', attrs: 'autocomplete="current-password"', right: eyeBtn('p') })}
      <div class="row" style="justify-content:space-between;font-size:14px"><label class="row" style="gap:8px;color:var(--mu)"><input type="checkbox" id="rm" checked style="width:20px;height:20px;accent-color:var(--ac)">จดจำฉันในเครื่องนี้</label><a href="#/forgot">ลืมรหัสผ่าน?</a></div>
      <div id="err"></div>
      <button class="btn" type="submit">เข้าสู่ระบบ</button>
    </form>
    <div class="row muted" style="gap:10px"><div class="grow" style="height:1px;background:var(--line)"></div>ยังไม่มีบัญชี?<div class="grow" style="height:1px;background:var(--line)"></div></div>
    <a class="btn sec" href="#/register/1">สมัครสมาชิกใหม่</a>
    ${CFG.API_URL ? '' : '<div class="note bad">ยังไม่ได้ตั้งค่า API_URL ในไฟล์ config.js</div>'}
  </main>`;
  bindCommon();
  $('#f').addEventListener('submit', async e => {
    e.preventDefault(); $('#err').innerHTML = '';
    const username = $('#u').value.trim(), password = $('#p').value;
    if (!username || !password) return showErr(new Error('กรุณากรอก Username และรหัสผ่าน'), 'err');
    try {
      const r = await api('login', { username, password });
      saveSession(r.token, r.user, $('#rm').checked); S.boot = null;
      go('/home');
    } catch (er) { showErr(er, 'err'); }
  });
}, false);

/* ---------- สมัครสมาชิก ---------- */
function regState() { if (!S.reg) S.reg = { title: '', otp_channel: 'EMAIL' }; return S.reg; }
async function regOpts() { if (!S.regOpts) S.regOpts = await api('registerOptions'); return S.regOpts; }
const REG_STEPS = ['บัญชี', 'ข้อมูลส่วนตัว', 'ติดต่อ+ยืนยัน'];

route('/register/1', async () => {
  const my = S.seq, R = regState(), O = await regOpts(); if (stale(my)) return;
  $app.innerHTML = topbar('สมัครสมาชิก', 'ขั้นที่ 1 จาก 3', '/login') + steps(1, REG_STEPS) + `<main>
    <div class="row" style="gap:16px"><div style="position:relative">
      <div id="avbox">${R.photo ? `<div class="av" style="width:84px;height:84px"><img src="${esc(R.photo)}" alt="รูปโปรไฟล์"></div>` : GHOST(84)}</div>
      <label class="iconbtn" style="position:absolute;right:-4px;bottom:-4px;width:34px;height:34px;background:var(--acbtn);color:var(--acbtn-tx);border:2px solid var(--bg)" aria-label="เลือกรูปโปรไฟล์">${ico('cam', 16)}<input type="file" id="ph" accept="image/*" class="sr"></label></div>
      <div><div style="font-weight:600">รูปโปรไฟล์</div><div class="muted small" style="line-height:1.5">ไม่บังคับ · ถ่ายรูปหรือเลือกจากเครื่อง<br>ถ้าไม่ใส่ ระบบแสดงภาพบุคคลทั่วไปแทน</div>${R.photo ? '<button class="link small" id="rmph" type="button">ลบรูป</button>' : ''}</div></div>
    ${field('u', 'Username', { value: R.username || '', attrs: 'autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="20"', hint: 'a-z 0-9 _ . ยาว 4–20 ตัว' })}
    ${field('p1', 'รหัสผ่าน', { type: 'password', value: R.password || '', attrs: 'autocomplete="new-password" maxlength="64"', right: eyeBtn('p1') })}
    <div><div class="pw-meter" id="pm"><i></i><i></i><i></i><i></i></div><div class="hint" id="pr" style="flex-wrap:wrap;gap:10px;margin-top:6px"></div></div>
    ${field('p2', 'ยืนยันรหัสผ่าน', { type: 'password', value: R.password || '', attrs: 'autocomplete="new-password" maxlength="64"' })}
    <div id="err"></div></main><div class="foot"><button class="btn full" id="nx">ถัดไป</button></div>`;
  bindCommon();
  const chk = () => {
    const u = $('#u').value.trim().toLowerCase(), p = $('#p1').value, p2 = $('#p2').value;
    if (u) setHint('u', V.username(u) ? 'รูปแบบใช้ได้ (ระบบตรวจซ้ำตอนส่งใบสมัคร)' : 'ใช้ a-z 0-9 _ . ยาว 4–20 ตัว ขึ้นต้นด้วยตัวอักษรหรือตัวเลข', V.username(u));
    const r = V.pwRules(p, u, O.password_min_length), sc = p ? V.pwScore(p) : 0;
    $$('#pm i').forEach((i, k) => i.classList.toggle('on', k < sc));
    const it = (ok, t) => `<span style="color:${ok ? 'var(--ok)' : 'var(--m2)'}">${ok ? '✓' : '○'} ${t}</span>`;
    $('#pr').innerHTML = it(r.len, O.password_min_length + ' ตัวขึ้นไป') + it(r.mix, 'ตัวอักษร+ตัวเลข') + it(r.nouser && p, 'ไม่มี Username') + it(r.nospace, 'ไม่มีช่องว่าง');
    if (p2) setHint('p2', p === p2 ? 'รหัสผ่านตรงกัน' : 'รหัสผ่านไม่ตรงกัน', p === p2);
    return V.username(u) && r.len && r.mix && r.nouser && r.nospace && p === p2;
  };
  ['u', 'p1', 'p2'].forEach(id => $('#' + id).addEventListener('input', chk)); chk();
  $('#ph').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try { R.photo = await resizeImage(f); R.username = $('#u').value; R.password = $('#p1').value; render(); } catch (er) { toast(er.message, true); }
  });
  if ($('#rmph')) $('#rmph').onclick = () => { R.photo = ''; R.username = $('#u').value; R.password = $('#p1').value; render(); };
  $('#nx').onclick = () => {
    if (!chk()) return showErr(new Error('กรุณาตรวจ Username และรหัสผ่านให้ครบตามเงื่อนไข'), 'err');
    R.username = $('#u').value.trim().toLowerCase(); R.password = $('#p1').value; go('/register/2');
  };
}, false);

route('/register/2', async () => {
  const my = S.seq, R = regState(), O = await regOpts(); if (stale(my)) return;
  if (!R.username) return go('/register/1');
  const by = new Date().getFullYear() + 543;
  const years = []; for (let y = by - O.min_age; y >= by - 80; y--) years.push(y);
  const opt = (v, t, sel) => `<option value="${esc(v)}" ${String(sel) === String(v) ? 'selected' : ''}>${esc(t)}</option>`;
  $app.innerHTML = topbar('สมัครสมาชิก', 'ขั้นที่ 2 จาก 3', '/register/1') + steps(2, REG_STEPS) + `<main>
    <div class="fld"><span class="lbl">คำนำหน้า</span><div class="chips" id="tt">${O.titles.map(t => `<button type="button" class="chip ${R.title === t ? 'on' : ''}" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div></div>
    <div class="g2">${field('fn', 'ชื่อจริง', { value: R.first_name || '', attrs: 'autocomplete="given-name" maxlength="50"' })}${field('ln', 'นามสกุล', { value: R.last_name || '', attrs: 'autocomplete="family-name" maxlength="50"' })}</div>
    ${field('nk', 'ชื่อเล่น (ไม่บังคับ)', { value: R.nickname || '', attrs: 'maxlength="30"' })}
    ${field('nid', 'เลขบัตรประชาชน', { value: R.national_id ? fmtNid(R.national_id) : '', mono: true, attrs: 'inputmode="numeric" maxlength="17" autocomplete="off"', right: `<span style="color:var(--m2)">${ico('lock', 18)}</span>`, hint: 'ระบบเข้ารหัสก่อนบันทึก' })}
    <div class="fld"><div class="row"><span class="lbl grow">วัน/เดือน/ปีเกิด (พ.ศ.)</span><span class="muted small" id="age"></span></div>
      <div class="g3" style="grid-template-columns:1fr 1.3fr 1.3fr">
        <div class="inp"><select id="bd" aria-label="วันเกิด"><option value="">วัน</option>${Array.from({ length: 31 }, (_, i) => opt(i + 1, i + 1, R.birth_day)).join('')}</select></div>
        <div class="inp"><select id="bm" aria-label="เดือนเกิด"><option value="">เดือน</option>${TH_MON.map((m, i) => opt(i + 1, m, R.birth_month)).join('')}</select></div>
        <div class="inp"><select id="by" aria-label="ปีเกิด พ.ศ."><option value="">ปี พ.ศ.</option>${years.map(y => opt(y, y, R.birth_year_be)).join('')}</select></div></div>
      <div class="hint" id="bd-hint"></div></div>
    <div class="fld"><label for="pos">ตำแหน่ง</label><div class="inp"><select id="pos"><option value="">เลือกตำแหน่ง</option>${O.positions.map(p => opt(p, p, R.position)).join('')}</select></div></div>
    <div id="err"></div></main><div class="foot"><button class="btn sec" data-go="/register/1">ย้อนกลับ</button><button class="btn full" id="nx">ถัดไป</button></div>`;
  bindCommon();
  $$('#tt .chip').forEach(b => b.onclick = () => { R.title = b.dataset.t; $$('#tt .chip').forEach(x => x.classList.toggle('on', x === b)); });
  const nid = $('#nid');
  const chkNid = () => {
    const d = nid.value.replace(/\D/g, ''); nid.value = fmtNid(d);
    if (d.length === 13) setHint('nid', V.nid(d) ? 'เลขบัตรถูกต้อง · ระบบเข้ารหัสก่อนบันทึก' : 'เลขบัตรไม่ถูกต้อง กรุณาตรวจสอบ', V.nid(d));
    else setHint('nid', d.length ? `กรอกแล้ว ${d.length}/13 หลัก` : 'ระบบเข้ารหัสก่อนบันทึก', null);
    return V.nid(d);
  };
  nid.addEventListener('input', chkNid); if (nid.value) chkNid();
  const chkBirth = () => {
    const d = +$('#bd').value, m = +$('#bm').value, y = +$('#by').value;
    if (!d || !m || !y) { $('#age').textContent = ''; return false; }
    const b = new Date(y - 543, m - 1, d);
    if (b.getDate() !== d) { setHint('bd', 'วันที่นี้ไม่มีจริง', false); $('#age').textContent = ''; return false; }
    const n = new Date(); let age = n.getFullYear() - b.getFullYear(); if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) age--;
    $('#age').textContent = 'อายุ ' + age + ' ปี';
    const ok = age >= O.min_age; setHint('bd', ok ? '' : `ผู้สมัครต้องอายุอย่างน้อย ${O.min_age} ปี`, ok ? null : false); return ok;
  };
  ['bd', 'bm', 'by'].forEach(id => $('#' + id).addEventListener('change', chkBirth)); chkBirth();
  $('#nx').onclick = () => {
    const fn = $('#fn').value.trim(), ln = $('#ln').value.trim(), nk = $('#nk').value.trim();
    const errs = [];
    if (!R.title) errs.push('เลือกคำนำหน้า');
    if (!fn || !V.name(fn)) errs.push('ชื่อจริง (ตัวอักษรไทย/อังกฤษ)');
    if (!ln || !V.name(ln)) errs.push('นามสกุล (ตัวอักษรไทย/อังกฤษ)');
    if (nk && !V.name(nk)) errs.push('ชื่อเล่น (ตัวอักษรไทย/อังกฤษ)');
    if (!chkNid()) errs.push('เลขบัตรประชาชนให้ถูกต้อง');
    if (!chkBirth()) errs.push('วันเกิดให้ถูกต้อง');
    if (!$('#pos').value) errs.push('เลือกตำแหน่ง');
    Object.assign(R, { first_name: fn, last_name: ln, nickname: nk, national_id: nid.value.replace(/\D/g, ''), birth_day: $('#bd').value, birth_month: $('#bm').value, birth_year_be: $('#by').value, position: $('#pos').value });
    if (errs.length) return showErr(new Error('กรุณากรอก: ' + errs.join(', ')), 'err');
    go('/register/3');
  };
}, false);

route('/register/3', async () => {
  const my = S.seq, R = regState(), O = await regOpts(); if (stale(my)) return;
  if (!R.first_name) return go('/register/2');
  const card = c => {
    const on = R.otp_channel === c.code;
    return `<button type="button" class="card ${on ? 'hl' : ''}" data-ch="${c.code}" ${c.enabled ? '' : 'disabled'} style="${on ? 'background:var(--ok-bg);' : ''}${c.enabled ? '' : 'border-style:dashed;background:var(--soft);'}text-align:left;gap:6px">
      <span class="row" style="justify-content:space-between;color:${c.enabled ? 'var(--ac)' : 'var(--m2)'}">${ico(c.code === 'EMAIL' ? 'mail' : 'phone', 22)}<span style="width:20px;height:20px;border-radius:10px;border:2px solid ${on ? 'var(--ac)' : 'var(--m2)'};display:flex;align-items:center;justify-content:center">${on ? '<span style="width:9px;height:9px;border-radius:5px;background:var(--ac)"></span>' : ''}</span></span>
      <b>${esc(c.name)}</b><span class="small" style="color:var(--m2)">${c.enabled ? (c.code === 'EMAIL' ? 'ส่งรหัสไปที่อีเมล' : 'ส่งรหัสไปที่เบอร์มือถือ') : 'เร็ว ๆ นี้'}</span></button>`;
  };
  $app.innerHTML = topbar('สมัครสมาชิก', 'ขั้นที่ 3 จาก 3', '/register/2') + steps(3, REG_STEPS) + `<main>
    ${field('ph', 'เบอร์มือถือ', { type: 'tel', value: R.phone ? fmtPhone(R.phone) : '', attrs: 'inputmode="tel" autocomplete="tel" maxlength="12"', hint: '10 หลัก ขึ้นต้นด้วย 06 08 09' })}
    ${field('em', 'อีเมล', { type: 'email', value: R.email || '', attrs: 'autocomplete="email" autocapitalize="none" maxlength="120"', hint: 'ใช้รับรหัส OTP และแจ้งผลการสมัคร' })}
    <div class="fld"><span class="lbl">รับรหัส OTP ทาง</span><div class="g2" id="chs">${O.otp_channels.map(card).join('')}</div></div>
    <label class="check"><input type="checkbox" id="cs" ${R.consent ? 'checked' : ''}><span>ข้าพเจ้ายินยอมให้ ${esc(O.company || 'บริษัท')} เก็บและใช้ข้อมูลส่วนบุคคล รวมถึงเลขบัตรประชาชน เพื่อ${esc(O.pdpa_purpose || 'ยืนยันตัวตน')}</span></label>
    <div id="err"></div></main><div class="foot"><button class="btn sec" data-go="/register/2">ย้อนกลับ</button><button class="btn full" id="nx">ส่งรหัส OTP</button></div>`;
  bindCommon();
  $('#ph').addEventListener('input', e => { e.target.value = fmtPhone(e.target.value); const v = V.phone(e.target.value); if (e.target.value.replace(/\D/g, '').length === 10) setHint('ph', v ? 'เบอร์ถูกต้อง' : 'ต้องขึ้นต้นด้วย 06 08 หรือ 09', v); });
  $('#em').addEventListener('change', e => { const v = V.email(e.target.value); setHint('em', v ? 'รูปแบบอีเมลถูกต้อง' : 'รูปแบบอีเมลไม่ถูกต้อง', v); });
  $$('#chs [data-ch]').forEach(b => b.onclick = () => { R.otp_channel = b.dataset.ch; R.phone = $('#ph').value; R.email = $('#em').value; R.consent = $('#cs').checked; render(); });
  $('#nx').onclick = async () => {
    R.phone = $('#ph').value.replace(/\D/g, ''); R.email = $('#em').value.trim().toLowerCase(); R.consent = $('#cs').checked;
    const errs = [];
    if (!V.phone(R.phone)) errs.push('เบอร์มือถือให้ถูกต้อง');
    if (!V.email(R.email)) errs.push('อีเมลให้ถูกต้อง');
    if (!R.consent) errs.push('ติ๊กยินยอมให้เก็บข้อมูล');
    if (errs.length) return showErr(new Error('กรุณากรอก: ' + errs.join(', ')), 'err');
    try {
      const r = await api('registerStart', { username: R.username, password: R.password, password_confirm: R.password, title: R.title, first_name: R.first_name, last_name: R.last_name,
        nickname: R.nickname, national_id: R.national_id, birth_day: +R.birth_day, birth_month: +R.birth_month, birth_year_be: +R.birth_year_be, position: R.position,
        phone: R.phone, email: R.email, otp_channel: R.otp_channel, consent: true, photo: R.photo || '' });
      R.reg_id = r.reg_id; R.sent_to = r.sent_to; R.resend_at = Date.now() + r.resend_after * 1000; R.expire_at = Date.now() + r.expires_in * 1000;
      go('/otp');
    } catch (er) {
      showErr(er, 'err');
      if (er.code === 'DUPLICATE' && /Username/.test(er.message)) setTimeout(() => go('/register/1'), 2500);
    }
  };
}, false);

/* ---------- OTP ---------- */
function otpInputs(container, onFull) {
  container.innerHTML = Array.from({ length: 6 }, (_, i) => `<input inputmode="numeric" pattern="[0-9]*" aria-label="รหัสหลักที่ ${i + 1}" ${i === 0 ? 'autocomplete="one-time-code"' : 'autocomplete="off"'}>`).join('');
  const ins = $$('input', container);
  const val = () => ins.map(i => i.value).join('');
  ins.forEach((inp, i) => {
    inp.addEventListener('input', () => {
      const d = inp.value.replace(/\D/g, '');
      if (d.length > 1) { const t = d.length >= 6 ? d.slice(-6) : d; const st = t.length === 6 ? 0 : i; t.slice(0, 6 - st).split('').forEach((c, k) => (ins[st + k].value = c)); ins[Math.min(5, st + t.length)].focus(); }
      else { inp.value = d; if (d && i < 5) ins[i + 1].focus(); }
      if (val().length === 6 && onFull) onFull(val());
    });
    inp.addEventListener('keydown', e => { if (e.key === 'Backspace' && !inp.value && i > 0) ins[i - 1].focus(); });
    inp.addEventListener('paste', e => { const t = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6); if (t) { e.preventDefault(); t.split('').forEach((c, k) => { if (ins[k]) ins[k].value = c; }); ins[Math.min(5, t.length - 1)].focus(); if (t.length === 6 && onFull) onFull(t); } });
  });
  setTimeout(() => ins[0].focus(), 50);
  return { value: val, clear: () => { ins.forEach(i => (i.value = '')); ins[0].focus(); } };
}
function countdown(el, until, done, prefix) {
  const tick = () => { const s = Math.max(0, Math.round((until - Date.now()) / 1000)); el.textContent = prefix + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); if (!s && done) done(); return s; };
  if (tick()) S.timers.push(setInterval(() => { if (!tick()) clearTimers(); }, 1000));
}
route('/otp', () => {
  const R = S.reg;
  if (!R || !R.reg_id) return go('/register/1');
  $app.innerHTML = topbar('ยืนยันรหัส OTP', 'สมัครสมาชิก', '/register/3') + `<main style="gap:16px">
    <div style="display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;padding-top:8px">
      <div style="width:72px;height:72px;border-radius:36px;background:var(--ok-bg);color:var(--ac);display:flex;align-items:center;justify-content:center">${ico('mail', 34, 1.8)}</div>
      <h2 style="margin:0">กรอกรหัส 6 หลัก</h2><div class="muted" style="font-size:14px;line-height:1.5">ส่งรหัสไปที่ <b style="color:var(--tx)">${esc(R.sent_to)}</b> แล้ว<br><a href="#/register/3">แก้ไขข้อมูลติดต่อ</a></div></div>
    <div class="otp" id="otp"></div>
    <div class="row" style="justify-content:space-between;font-size:13px"><span class="row muted" style="gap:6px">${ico('clock', 16)}<span id="exp"></span></span><button class="link" id="rs" disabled></button></div>
    <div class="note warn"><b>ไม่เห็นอีเมล?</b> ลองดูในกล่อง <b>สแปม</b> หรือ <b>โปรโมชัน</b> แล้วกด "ไม่ใช่สแปม"</div>
    <div id="err"></div></main><div class="foot"><button class="btn full" id="ok">ยืนยันรหัส</button></div>`;
  bindCommon();
  const verify = async code => {
    $('#err').innerHTML = '';
    if (!/^\d{6}$/.test(code)) return showErr(new Error('กรุณากรอกรหัสให้ครบ 6 หลัก'), 'err');
    try { await api('registerVerify', { reg_id: R.reg_id, code }); R.done = true; R.password = ''; go('/pending'); }
    catch (er) { showErr(er, 'err'); o.clear(); }
  };
  const o = otpInputs($('#otp'), verify);
  const startTimers = () => {
    countdown($('#exp'), R.expire_at, null, 'รหัสหมดอายุใน ');
    const rs = $('#rs');
    if (R.resend_at > Date.now()) { rs.disabled = true; countdown(rs, R.resend_at, () => { rs.disabled = false; rs.textContent = 'ขอรหัสใหม่'; }, 'ขอรหัสใหม่ได้ใน '); }
    else { rs.disabled = false; rs.textContent = 'ขอรหัสใหม่'; }
  };
  startTimers();
  $('#rs').onclick = async () => {
    try { const r = await api('registerResend', { reg_id: R.reg_id }); R.sent_to = r.sent_to; R.resend_at = Date.now() + r.resend_after * 1000; R.expire_at = Date.now() + r.expires_in * 1000; toast('ส่งรหัสใหม่แล้ว'); clearTimers(); startTimers(); o.clear(); }
    catch (er) { showErr(er, 'err'); }
  };
  $('#ok').onclick = () => verify(o.value());
}, false);

route('/pending', () => {
  const R = S.reg || {};
  const tl = (t, s, st) => `<div class="row" style="align-items:flex-start;gap:12px"><span style="width:26px;height:26px;flex-shrink:0;border-radius:13px;display:flex;align-items:center;justify-content:center;color:${st === 'done' ? 'var(--acbtn-tx)' : 'var(--warn)'};background:${st === 'done' ? 'var(--acbtn)' : st === 'now' ? 'var(--warn-bg)' : 'var(--soft)'}">${st === 'done' ? ico('check', 14, 3) : st === 'now' ? ico('clock', 14, 2.5) : ''}</span><div><div style="font-weight:600">${t}</div><div class="muted small">${s}</div></div></div>`;
  $app.innerHTML = `<main style="gap:16px;padding-top:calc(32px + var(--sat))">
    <div style="display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center">
      <div style="width:92px;height:92px;border-radius:46px;background:var(--acbtn);color:var(--acbtn-tx);display:flex;align-items:center;justify-content:center">${ico('check', 48, 2.6)}</div>
      <h2 style="font-size:24px;margin:0">ส่งใบสมัครเรียบร้อย</h2><div class="muted" style="font-size:14px;line-height:1.55">ใบสมัครอยู่ระหว่างรอแอดมินอนุมัติ<br>เราจะแจ้งผลไปที่อีเมลของคุณ</div></div>
    <div class="card" style="gap:14px">${tl('กรอกใบสมัคร', 'เรียบร้อย', 'done')}${tl('ยืนยันรหัส OTP', 'เรียบร้อย', 'done')}${tl('แอดมินอนุมัติ', 'แอดมินกำหนดบทบาทและโครงการให้', 'now')}${tl('เข้าใช้งาน', 'ล็อกอินด้วย Username และรหัสผ่านที่ตั้งไว้', '')}</div>
    ${R.first_name ? `<div class="row card" style="flex-direction:row;padding:14px;gap:12px">${avatar({ first_name: R.first_name, last_name: R.last_name, photo_url: '' }, 48)}<div><div style="font-weight:600">${esc(R.title + R.first_name + ' ' + R.last_name)}${R.nickname ? ' (' + esc(R.nickname) + ')' : ''}</div><div class="small" style="color:var(--m2)">${esc(R.position)} · ${esc(R.username)}</div></div></div>` : ''}
  </main><div class="foot"><button class="btn sec full" id="bk">กลับหน้าเข้าสู่ระบบ</button></div>`;
  $('#bk').onclick = () => { S.reg = null; go('/login'); };
}, false);

/* ---------- ลืมรหัสผ่าน ---------- */
route('/forgot', () => {
  const F = S.forgot;
  const st = F && F.request_id ? 2 : 1;
  $app.innerHTML = topbar('ลืมรหัสผ่าน', '', '/login') + steps(st, ['กรอกข้อมูล', 'OTP + รหัสใหม่', 'เสร็จ']) + (st === 1 ? `<main>
    <div class="muted" style="font-size:14px;line-height:1.55">กรอก Username หรืออีเมลที่ใช้สมัคร ระบบจะส่งรหัส OTP ไปที่อีเมลของบัญชี</div>
    ${field('id', 'Username หรืออีเมล', { attrs: 'autocapitalize="none" autocomplete="username" maxlength="120"' })}
    <div id="err"></div></main><div class="foot"><button class="btn full" id="nx">ส่งรหัส OTP</button></div>` : `<main>
    <div class="note ok">${esc(F.message)}</div>
    <div class="fld"><div class="row"><span class="lbl grow">รหัส OTP จากอีเมล</span><span class="muted small" id="exp"></span></div><div class="otp" id="otp"></div></div>
    ${field('np', 'รหัสผ่านใหม่', { type: 'password', attrs: 'autocomplete="new-password" maxlength="64"', right: eyeBtn('np') })}
    <div class="pw-meter" id="pm" style="margin-top:-6px"><i></i><i></i><i></i><i></i></div>
    ${field('np2', 'ยืนยันรหัสผ่านใหม่', { type: 'password', attrs: 'autocomplete="new-password" maxlength="64"' })}
    <div class="muted small">ตั้งรหัสใหม่แล้ว ทุกเครื่องที่ล็อกอินอยู่จะถูกออกจากระบบ · <button class="link small" id="again">ขอรหัสใหม่</button></div>
    <div id="err"></div></main><div class="foot"><button class="btn full" id="ok">ตั้งรหัสผ่านใหม่</button></div>`);
  bindCommon();
  if (st === 1) {
    $('#nx').onclick = async () => {
      const id = $('#id').value.trim(); if (!id) return showErr(new Error('กรุณากรอก Username หรืออีเมล'), 'err');
      try { const r = await api('forgotStart', { identifier: id }); S.forgot = { request_id: r.request_id, message: r.message, expire_at: Date.now() + 600000 }; render(); }
      catch (er) { showErr(er, 'err'); }
    };
    return;
  }
  const o = otpInputs($('#otp'));
  countdown($('#exp'), F.expire_at, null, 'หมดอายุใน ');
  $('#np').addEventListener('input', e => { const sc = V.pwScore(e.target.value); $$('#pm i').forEach((i, k) => i.classList.toggle('on', k < sc)); });
  $('#again').onclick = () => { S.forgot = null; render(); };
  $('#ok').onclick = async () => {
    const p = $('#np').value, p2 = $('#np2').value, r = V.pwRules(p, '');
    if (o.value().length !== 6) return showErr(new Error('กรุณากรอกรหัส OTP ให้ครบ 6 หลัก'), 'err');
    if (!r.len || !r.mix || !r.nospace) return showErr(new Error('รหัสผ่านต้องยาว 8 ตัวขึ้นไป มีตัวอักษรและตัวเลข และไม่มีช่องว่าง'), 'err');
    if (p !== p2) return showErr(new Error('ยืนยันรหัสผ่านไม่ตรงกัน'), 'err');
    try { await api('forgotVerify', { request_id: F.request_id, code: o.value(), new_password: p }); S.forgot = null; toast('ตั้งรหัสผ่านใหม่เรียบร้อย กรุณาเข้าสู่ระบบ'); go('/login'); }
    catch (er) { showErr(er, 'err'); if (['OTP_LOCKED', 'OTP_EXPIRED', 'OTP_USED', 'OTP_REPLACED', 'OTP_INVALID'].includes(er.code)) { S.forgot = null; setTimeout(render, 2500); } }
  };
}, false);

/* =========================================================
   หน้าหลักของแอป
   ========================================================= */
const projOf = id => (S.boot.projects.find(p => p.project_id === id) || {});
const locOf = id => (S.boot.locations.find(l => l.location_id === id) || {});
const matOf = id => (S.boot.materials.find(m => m.mat_id === id) || {});
const stockAt = (loc, mat) => ((S.boot.stock[loc] || {})[mat] || 0);
function docCard(d) {
  return `<a class="card" href="#/doc/${encodeURIComponent(d.doc_no)}" style="gap:6px">
    <div class="line"><span class="disp" style="font-weight:600">${esc(d.doc_no)}</span>${stChip(d.status, d.status_name)}</div>
    <div class="muted">${esc(DOCTYPE_TH[d.doc_type] || d.doc_type)} · ${esc(d.line_count || 0)} รายการ${d.work_category ? ' · ' + esc(d.work_category) : ''}</div>
    <div class="small" style="color:var(--m2)">${esc(d.requested_by_name || '')} · ${fmtD(d.requested_at)}${money() && d.total_amount ? ' · ' + fmtB(d.total_amount) : ''}</div></a>`;
}

/* =========================================================
   KTY App: หน้าแรก (ศูนย์รวมโมดูล)
   ========================================================= */
function lowStockCount() {
  const B = S.boot; let n = 0;
  B.locations.filter(l => l.mine).forEach(l => B.materials.forEach(m => { const q = stockAt(l.location_id, m.mat_id); if (m.item_type !== 'TOOL' && m.min_stock > 0 && q <= m.min_stock && q > 0) n++; }));
  return n;
}
route('/home', async () => {
  const my = S.seq, B = S.boot, u = B.user, t = B.tasks;
  const h = new Date().getHours(), greet = h < 12 ? 'สวัสดีตอนเช้า' : h < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น';
  const stats = [];
  if (isRole('APPROVER', 'ADMIN')) stats.push([t.to_approve, 'รออนุมัติ', '/inbox', true]);
  if (isRole('STORE', 'ADMIN')) stats.push([t.to_issue, 'รอจ่ายของ', '/inbox', !stats.length]);
  if (t.to_confirm) stats.unshift([t.to_confirm, 'รอยืนยันรับ', '/inbox', true]);
  if (isRole('ADMIN') && t.diff_review) stats.unshift([t.diff_review, 'ส่วนต่างรอตรวจ', '/inbox', true]);
  stats.push([t.my_open, 'ใบเบิกของฉัน', '/docs', !stats.length]);
  if (isRole('STORE', 'ADMIN', 'APPROVER') && stats.length < 3) stats.push([lowStockCount(), 'ของใกล้หมด', '/stock', false]);
  if (stats.length < 3) stats.push([B.kits.length, 'ชุดสำเร็จรูป', '/shop', false]);
  const cartN = cart().items.length;
  const svc = [];
  const add = (label, sub, icon, path, opt = {}) => svc.push({ label, sub, icon, path, ...opt });
  add('เบิกวัสดุ', 'เลือกจากแค็ตตาล็อก', 'box', '/shop', { badge: cartN ? 'ตะกร้า ' + cartN : '' });
  if (isRole('STORE', 'ADMIN')) add('รับของเข้าคลัง', 'บันทึกของที่ส่งมาถึง', 'inbox', '/receive');
  add('สต็อกคงเหลือ', 'ทุกคลัง ทุกหน้างาน', 'stock', '/stock');
  add('เอกสารของฉัน', 'ใบเบิก ประวัติ เบิกซ้ำ', 'list', '/docs');
  if (isRole('STORE', 'ADMIN')) add('จัดการวัสดุ', 'เพิ่ม แก้ ถ่ายรูปวัสดุ', 'cam', '/admin/materials');
  if (isRole('APPROVER', 'ADMIN')) add('ชุดสำเร็จรูป', 'ตั้งชุดเบิกสำหรับทีม', 'grid', '/kits');
  if (isRole('ADMIN')) add('ผู้สมัคร / ผู้ใช้', 'อนุมัติ กำหนดสิทธิ์', 'users', '/admin/users', { badge: t.applicants || '' });
  if (isRole('ADMIN')) add('โครงการ', 'หน้างานที่เปิดให้เบิก', 'home', '/admin/projects');
  add('ยืม-คืนอุปกรณ์', 'สว่าน เครื่องตบดิน', 'tool', '', { soon: true });
  add('เบิกเงิน', 'เงินทดรอง · เคลียร์เงิน', 'cash', '', { soon: true });
  add('รายงานประจำวัน', 'ความคืบหน้าหน้างาน', 'doc', '', { soon: true });
  $app.innerHTML = `<header class="hubhd"><div class="line">${BRAND}<div class="row" style="gap:10px">
      <a class="iconbtn" href="#/inbox" aria-label="งานรอ" style="border:1px solid rgba(255,255,255,.14);width:40px;height:40px;color:var(--on-dk)">${ico('bell', 19, 1.8)}${inboxCount(t) ? `<span class="badge" style="top:-4px;right:-4px">${inboxCount(t)}</span>` : ''}</a>
      <a href="#/profile" aria-label="โปรไฟล์" style="text-decoration:none">${avatar(u, 40)}</a></div></div>
    <div style="margin-top:24px;font-size:13px;letter-spacing:.04em;color:var(--dk-mu)">${greet} · ${esc(u.position || ROLE_TH[u.role] || '')}</div>
    <div class="disp" style="font-weight:600;font-size:28px;margin-top:2px">คุณ${esc(u.nickname || u.first_name || u.name)}</div></header>
    <div class="sum" style="grid-template-columns:repeat(${Math.min(3, stats.length)},1fr)">${stats.slice(0, 3).map(x => `<a href="#${x[2]}" style="text-decoration:none"><b class="${x[3] ? 'g' : ''}">${fmtN(x[0] || 0)}</b><span>${x[1]}</span></a>`).join('')}</div>
    <main style="padding-top:20px">
      <div class="line"><h2>บริการทั้งหมด</h2><span class="muted small">KTY App</span></div>
      <div class="svcgrid">${svc.map(x => x.soon
        ? `<div class="svc soon" aria-disabled="true"><div class="ic">${ico(x.icon, 24, 1.7)}</div><div><b>${x.label}</b><small>${x.sub}</small></div><span class="sn">เร็ว ๆ นี้</span></div>`
        : `<a class="svc" href="#${x.path}"><div class="ic">${ico(x.icon, 24, 1.7)}</div><div><b>${x.label}</b><small>${x.sub}</small></div>${x.badge ? `<span class="bd">${esc(x.badge)}</span>` : ''}</a>`).join('')}</div>
      <div class="line" style="margin-top:6px"><h2>${isRole('REQUESTER') ? 'ใบเบิกล่าสุดของฉัน' : 'เอกสารล่าสุด'}</h2><a href="#/docs" class="small">ดูทั้งหมด</a></div>
      <div id="recent"><div class="empty">กำลังโหลด…</div></div>
    </main>${bottomNav('home')}`;
  bindCommon();
  $$('.svc.soon').forEach(x => x.onclick = () => toast('โมดูลนี้กำลังพัฒนา จะเปิดในรอบถัดไป'));
  try {
    await cached('home', 'listDocs', { limit: 3, mine: isRole('REQUESTER') }, r => {
      if (stale(my) || !$('#recent')) return;
      $('#recent').innerHTML = r.items.length ? `<div class="fld" style="gap:10px">${r.items.map(docCard).join('')}</div>` : '<div class="empty">ยังไม่มีเอกสาร · เริ่มจาก "เบิกวัสดุ"</div>';
    });
  } catch (e) { if (!stale(my) && $('#recent')) $('#recent').innerHTML = `<div class="note bad">${esc(e.message)}</div>`; }
  updateBadges(t);
});

/* ---------- รายการเอกสาร ---------- */
async function docsPage(status) {
  const my = S.seq;
  const tabs = [['', 'ทั้งหมด'], ['PENDING', 'รออนุมัติ'], ['APPROVED,PARTIAL', 'รอจ่าย'], ['DELIVERED', 'รอยืนยันรับ'], ['DIFF_REVIEW', 'รอตรวจส่วนต่าง'], ['CLOSED', 'ปิดแล้ว'], ['REJECTED,CANCELLED', 'ไม่อนุมัติ/ยกเลิก']];
  $app.innerHTML = topbar('เอกสาร', isRole('REQUESTER') ? 'เฉพาะใบเบิกของฉัน' : '', null) + `<main>
    <div class="tabs">${tabs.map(([k, n]) => `<a class="chip ${k === (status || '') ? 'on' : ''}" style="display:flex;align-items:center;text-decoration:none;white-space:nowrap" href="#/docs${k ? '/' + k : ''}">${n}</a>`).join('')}</div>
    <div id="lst"><div class="empty">กำลังโหลด…</div></div></main>${bottomNav('docs')}`;
  bindCommon();
  await cached('docs:' + (status || ''), 'listDocs', { status: status || '', limit: 100 }, r => {
  if (stale(my) || !$('#lst')) return;
  $('#lst').innerHTML = r.items.length ? `<div class="muted small" style="margin-bottom:8px">${r.total} รายการ</div><div class="fld" style="gap:10px">${r.items.map(docCard).join('')}</div>` : '<div class="empty">ไม่มีเอกสารในหมวดนี้</div>';
  });
}
route('/docs', () => docsPage(''));
route('/docs/:status', s => docsPage(s));

/* ---------- รายละเอียดเอกสาร ---------- */
route('/doc/:no', async no => {
  let painted = false; // วาดครั้งแรกเสมอ ครั้งต่อไปข้ามถ้ามีหน้าต่างค้าง (เช่น กำลังพิมพ์เหตุผล)
  await cached('doc:' + no, 'getDoc', { doc_no: no }, r => { if (painted && document.querySelector('.modal-bg')) return; painted = true; docPage(r); });
});
function docPage(r) {
  const d = r.doc, u = S.user, L = r.lines;
  const DV = r.deliveries || [], AT = r.attachments || [];
  const recv = {}; DV.forEach(v => (v.received || []).forEach(x => (recv[x.line_no] = (recv[x.line_no] || 0) + x.qty)));
  const hasRecv = DV.some(v => ['CONFIRMED', 'DIFF', 'RESOLVED'].includes(v.status));
  const DVST = { WAIT_CONFIRM: ['WARN', 'รอผู้เบิกยืนยัน'], CONFIRMED: ['OK', 'ยืนยันแล้ว'], CLOSED_BY_ADMIN: ['PARTIAL', 'แอดมินปิดแทน'], DIFF: ['WARN', 'นับไม่ตรง · รอแอดมินตรวจ'], RESOLVED: ['OK', 'ตรวจส่วนต่างแล้ว'] };
  const RESN = { RETURNED: 'คืนยอดเข้าคลังแล้ว', LOST: 'บันทึกสูญหาย' };
  const mine = d.requested_by === u.user_id;
  const canApprove = d.doc_type === 'REQ' && d.status === 'PENDING' && isRole('APPROVER', 'ADMIN') && !mine;
  const canIssue = d.doc_type === 'REQ' && ['APPROVED', 'PARTIAL'].includes(d.status) && isRole('STORE', 'ADMIN');
  const canCancel = d.status === 'PENDING' && (mine || isRole('ADMIN'));
  const loc = locOf(d.from_location_id || d.to_location_id);
  const tl = [['สร้าง/ขอ', d.requested_by_name, d.requested_at, true],
    d.doc_type === 'REQ' ? [d.status === 'REJECTED' ? 'ไม่อนุมัติ' : 'อนุมัติ', d.approved_by_name, d.approved_at, !!d.approved_at] : null,
    ['จ่าย/รับของ', d.issued_by_name, d.issued_at, !!d.issued_at], ['ปิด', '', d.closed_at, !!d.closed_at]].filter(Boolean);
  const boqLv = { OK: 'ปกติ', WARN: 'ใกล้ครบ', OVER: 'เกินงบ', NO_BOQ: 'ไม่มีใน BOQ' };
  $app.innerHTML = topbar(d.doc_no, `${DOCTYPE_TH[d.doc_type] || ''} · ${projOf(d.project_id).project_code || 'คลังกลาง'}`, '/docs',
    `<button class="iconbtn" id="sh" aria-label="ส่งต่อ">${ico('share', 20)}</button>`) + `<main>
    <div class="line">${stChip(d.status, d.status_name)}<span class="muted small">${esc(loc.name || '')}</span></div>
    <div class="card" style="gap:10px">${tl.map(x => `<div class="row" style="gap:10px"><span style="width:10px;height:10px;border-radius:5px;background:${x[3] ? 'var(--ac)' : 'var(--inp-b)'}"></span><span class="grow">${x[0]}${x[1] ? ' · ' + esc(x[1]) : ''}</span><span class="muted small">${x[3] ? fmtD(x[2]) : '-'}</span></div>`).join('')}</div>
    ${d.reject_reason ? `<div class="note bad"><b>เหตุผลที่ไม่อนุมัติ:</b> ${esc(d.reject_reason)}</div>` : ''}
    ${r.receipt_diff ? '<div class="note warn"><b>ผู้เบิกนับของได้ไม่ตรงกับที่สโตร์ส่ง</b> ดูส่วนต่างในรอบส่งของด้านล่าง และรูปถ่ายประกอบ</div>' : ''}
    ${d.work_category ? `<div class="muted">หมวดงาน: <b style="color:var(--tx)">${esc(d.work_category)}</b></div>` : ''}
    <div class="card" style="padding:0;overflow-x:auto"><table class="tb"><thead><tr><th>รายการ</th><th class="r">ขอ</th><th class="r">อนุมัติ</th><th class="r">จ่าย</th>${hasRecv ? '<th class="r">รับจริง</th>' : ''}</tr></thead><tbody>
      ${L.map(l => `<tr><td><div style="font-weight:600">${esc(l.mat_name)}</div><div class="small" style="color:var(--m2)">${esc(l.mat_id)} · ${esc(l.unit)} · คงเหลือ ${fmtN(l.stock_at_location)}</div>${l.boq && d.status === 'PENDING' ? `<div style="margin-top:4px">${stChip(l.boq.level, boqLv[l.boq.level] + (l.boq.pct_after !== undefined ? ' ' + l.boq.pct_after + '%' : ''))}</div>` : ''}</td>
        <td class="r">${fmtN(l.qty_requested)}</td><td class="r">${l.qty_approved === null ? '-' : fmtN(l.qty_approved)}</td><td class="r">${fmtN(l.qty_issued)}</td>${hasRecv ? `<td class="r" style="${recv[l.line_no] !== undefined && recv[l.line_no] !== l.qty_issued ? 'color:var(--warn);font-weight:700' : 'color:var(--ok)'}">${recv[l.line_no] === undefined ? '-' : fmtN(recv[l.line_no])}</td>` : ''}</tr>`).join('')}
    </tbody></table></div>
    ${money() && d.total_amount !== null ? `<div class="line"><span class="muted">มูลค่ารวม</span><b class="disp" style="font-size:18px">${fmtB(d.total_amount)}</b></div>` : ''}
    ${d.note ? `<div class="muted">หมายเหตุ: ${esc(d.note)}</div>` : ''}
    ${DV.length ? `<h2>รอบส่งของ (${DV.length})</h2>${DV.map(v => `<div class="card" style="gap:6px">
      <div class="line"><b class="disp">รอบที่ ${v.round}</b>${stChip(DVST[v.status][0], DVST[v.status][1])}</div>
      <div class="small" style="color:var(--m2)">ส่งโดย ${esc(v.issued_by_name)} · ${fmtD(v.issued_at)}${v.confirmed_at ? ' · ' + (v.status === 'CLOSED_BY_ADMIN' ? 'ปิดโดย ' : 'ยืนยันโดย ') + esc(v.confirmed_by_name) + ' ' + fmtD(v.confirmed_at) : ''}</div>
      ${v.lines.map(x => { const rc = (v.received || []).find(y => y.line_no === x.line_no); const m = L.find(l => l.line_no === x.line_no) || {}; return `<div class="line small"><span>${esc(m.mat_name || x.mat_id)}</span><span>ส่ง ${fmtN(x.qty)}${rc ? ` · รับ <b style="color:${rc.diff ? 'var(--warn)' : 'var(--ok)'}">${fmtN(rc.qty)}</b>${rc.diff ? ' (' + (rc.diff > 0 ? '+' : '') + fmtN(rc.diff) + ')' : ''}` : ''} ${esc(m.unit || '')}</span></div>`; }).join('')}
      ${v.note ? `<div class="small" style="color:var(--m2)">หมายเหตุ: ${esc(v.note)}</div>` : ''}
      ${v.status === 'RESOLVED' ? `<div class="small" style="color:var(--ok)">ผลตรวจ: ${RESN[v.resolution] || v.resolution} · โดย ${esc(v.resolved_by_name)} ${fmtD(v.resolved_at)}</div>` : ''}
      ${v.status === 'DIFF' && isRole('ADMIN') ? `<div class="g2"><button class="btn sm" data-res="RETURNED" data-dv="${esc(v.delivery_id)}">คืนยอดเข้าคลัง</button><button class="btn sm danger" data-res="LOST" data-dv="${esc(v.delivery_id)}">บันทึกสูญหาย</button></div>` : ''}
      ${v.status === 'WAIT_CONFIRM' && d.requested_by === u.user_id ? `<button class="btn" data-go="/confirm/${encodeURIComponent(d.doc_no)}/${esc(v.delivery_id)}">นับและยืนยันรับของ</button>` : ''}
      ${v.status === 'WAIT_CONFIRM' && isRole('ADMIN') && d.requested_by !== u.user_id ? `<button class="btn sm sec" data-close-dv="${esc(v.delivery_id)}">ปิดรอบนี้แทนผู้เบิก</button>` : ''}
    </div>`).join('')}` : ''}
    ${AT.length ? `<div class="card" style="gap:10px"><div class="line"><b class="disp">รูปถ่าย (${AT.length})</b></div>
      <div class="chips" id="gf">${['ALL'].concat(['ISSUE', 'CONFIRM', 'RCV'].filter(k => AT.some(a => a.stage === k))).map((k, i) => `<button class="chip ${i ? '' : 'on'}" data-g="${k}" style="height:32px;font-size:13px">${k === 'ALL' ? 'ทั้งหมด' : STAGE_TH[k]} ${k === 'ALL' ? '' : AT.filter(a => a.stage === k).length}</button>`).join('')}</div>
      <div class="gal" id="gal"></div><div class="small" style="color:var(--m2)">แตะรูปเพื่อดูเต็มจอและซูมนับ</div></div>` : ''}
    ${d.doc_type === 'REQ' ? '<button class="btn sec" id="reo">' + ico('cart', 18) + 'เบิกซ้ำ (ใส่ตะกร้า)</button>' : ''}
    <div class="muted small">ลายเซ็น: อนุมัติ ${r.signatures.approve ? '✓' : '–'} · สโตร์ ${r.signatures.issue ? '✓' : '–'} · ผู้รับ ${r.signatures.receive ? '✓' : '–'}</div>
  </main>${canApprove || canIssue || canCancel ? `<div class="foot">
    ${canCancel ? '<button class="btn sec" id="cn">ยกเลิก</button>' : ''}
    ${canApprove ? '<button class="btn danger" id="rj">ไม่อนุมัติ</button><button class="btn full" data-go="/approve/' + encodeURIComponent(d.doc_no) + '">อนุมัติ</button>' : ''}
    ${canIssue ? '<button class="btn full" data-go="/issue/' + encodeURIComponent(d.doc_no) + '">จ่ายของ</button>' : ''}</div>` : bottomNav('docs')}`;
  bindCommon();
  if ($('#gal')) {
    let gf = 'ALL';
    const drawG = () => {
      const list = AT.filter(a => gf === 'ALL' || a.stage === gf).map(a => ({ url: a.url, label: STAGE_TH[a.stage], by: a.by, at: a.at }));
      $('#gal').innerHTML = list.map((p, i) => `<button data-v="${i}" aria-label="รูปที่ ${i + 1}">${ico('cam', 22, 1.5)}${photoSrc(p.url) ? `<img src="${esc(photoSrc(p.url))}" alt="" loading="lazy" referrerpolicy="no-referrer" data-fb="">` : ''}</button>`).join('');
      $$('#gal [data-v]').forEach(b => b.onclick = () => viewer(list, +b.dataset.v));
    };
    $$('#gf [data-g]').forEach(b => b.onclick = () => { gf = b.dataset.g; $$('#gf .chip').forEach(x => x.classList.toggle('on', x === b)); drawG(); });
    drawG();
  }
  $$('[data-res]').forEach(b => b.onclick = () => {
    const act = b.dataset.res, ret = act === 'RETURNED';
    modal(`<h2>${ret ? 'คืนยอดเข้าคลัง' : 'บันทึกสูญหาย'}</h2>
      <div class="note ${ret ? 'info' : 'warn'}">${ret ? 'ใช้เมื่อสโตร์นับผิดและของยังอยู่ในคลัง ระบบจะเพิ่มสต็อกคืนตามจำนวนที่ผู้เบิกได้รับขาด และหักยอดเบิกสะสม BOQ คืน' : 'ใช้เมื่อของหายระหว่างทาง สต็อกไม่เปลี่ยน แต่บันทึกไว้ตรวจสอบย้อนหลัง'}<br>ถ้ามีรายการที่นับได้เกิน ระบบตัดสต็อกส่วนเกินตามของจริงให้</div>
      <div class="fld"><label for="why">${ret ? 'หมายเหตุ (ไม่บังคับ)' : 'รายละเอียดของที่สูญหาย'}</label><textarea class="ta" id="why" maxlength="300"></textarea></div><div id="merr"></div>
      <div class="row"><button class="btn sec full" data-close>ยกเลิก</button><button class="btn full ${ret ? '' : 'danger'}" id="y">ยืนยัน</button></div>`, (bg, close) => {
      $('#y', bg).onclick = async () => {
        const why = $('#why', bg).value.trim();
        if (!ret && why.length < 3) return showErr(new Error('กรุณาระบุรายละเอียดของที่สูญหาย'), 'merr');
        try { const x = await api('resolveDiff', { doc_no: d.doc_no, delivery_id: b.dataset.dv, action: act, note: why }); close(); toast(x.doc.status === 'CLOSED' ? 'ตรวจส่วนต่างแล้ว ใบเบิกปิด' : 'บันทึกผลตรวจแล้ว'); S.cache = {}; render(); }
        catch (e) { showErr(e, 'merr'); }
      };
    });
  });
  $$('[data-close-dv]').forEach(b => b.onclick = () => modal(`<h2>ปิดรอบส่งแทนผู้เบิก</h2><div class="muted">ใช้เมื่อผู้เบิกไม่สามารถยืนยันได้ ระบบบันทึกชื่อคุณและเหตุผลไว้</div><div class="fld"><label for="why">เหตุผล</label><textarea class="ta" id="why" maxlength="200"></textarea></div><div id="merr"></div><div class="row"><button class="btn sec full" data-close>กลับ</button><button class="btn full" id="y">ปิดรอบนี้</button></div>`, (bg, close) => {
    $('#y', bg).onclick = async () => { const why = $('#why', bg).value.trim(); if (why.length < 3) return showErr(new Error('กรุณาระบุเหตุผล'), 'merr'); try { await api('adminCloseDelivery', { doc_no: d.doc_no, delivery_id: b.dataset.closeDv, note: why }); close(); toast('ปิดรอบส่งแล้ว'); S.cache = {}; render(); } catch (e) { showErr(e, 'merr'); } };
  }));
  if ($('#reo')) $('#reo').onclick = () => {
    const c = cart(); let n = 0;
    L.forEach(l => { if (matOf(l.mat_id).mat_id) { setQty(l.mat_id, cartQty(l.mat_id) + l.qty_requested); n++; } });
    if (S.boot.projects.some(p => p.project_id === d.project_id)) { c.pid = d.project_id; c.loc = d.from_location_id; }
    c.work = d.work_category || c.work; saveCart();
    toast(n ? 'ใส่ ' + n + ' รายการลงตะกร้าแล้ว' : 'วัสดุในใบนี้ไม่เปิดใช้งานแล้ว', !n); if (n) go('/cart');
  };
  $('#sh').onclick = () => shareDoc(d, canApprove ? 'รอการอนุมัติ' : canIssue ? 'อนุมัติแล้ว รอสโตร์จ่ายของ' : '');
  if ($('#cn')) $('#cn').onclick = () => modal(`<h2>ยกเลิกใบเบิก?</h2><div class="muted">ใบเบิก ${esc(d.doc_no)} จะถูกยกเลิกและแก้ไขไม่ได้อีก</div><div class="row"><button class="btn sec full" data-close>ไม่ยกเลิก</button><button class="btn danger full" id="y">ยกเลิกใบเบิก</button></div>`, (bg, close) => {
    $('#y', bg).onclick = async () => { try { await api('cancelReq', { doc_no: d.doc_no }); close(); toast('ยกเลิกแล้ว'); render(); } catch (e) { toast(e.message, true); } };
  });
  if ($('#rj')) $('#rj').onclick = () => modal(`<h2>ไม่อนุมัติ ${esc(d.doc_no)}</h2><div class="fld"><label for="why">เหตุผล (ผู้ขอจะเห็นข้อความนี้)</label><textarea class="ta" id="why" maxlength="300"></textarea></div><div id="merr"></div><div class="row"><button class="btn sec full" data-close>กลับ</button><button class="btn danger full" id="y">ยืนยันไม่อนุมัติ</button></div>`, (bg, close) => {
    $('#y', bg).onclick = async () => {
      const why = $('#why', bg).value.trim(); if (why.length < 3) return showErr(new Error('กรุณาระบุเหตุผลให้ชัดเจน'), 'merr');
      try { const x = await api('rejectDoc', { doc_no: d.doc_no, reason: why }); close(); toast('บันทึกไม่อนุมัติแล้ว'); shareDoc(x.doc, 'ไม่อนุมัติ: ' + why); render(); } catch (e) { showErr(e, 'merr'); }
    };
  });
}

/* ---------- อนุมัติ ---------- */
route('/approve/:no', async no => {
  const my = S.seq; const r = await api('getDoc', { doc_no: no }); if (stale(my)) return; const d = r.doc;
  if (d.status !== 'PENDING') { toast('ใบนี้ไม่อยู่ในสถานะรออนุมัติแล้ว', true); return go('/doc/' + encodeURIComponent(no)); }
  const boqLv = { OK: 'ปกติ', WARN: 'ใกล้ครบ', OVER: 'เกินงบ', NO_BOQ: 'ไม่มีใน BOQ' };
  $app.innerHTML = topbar('อนุมัติ ' + d.doc_no, `โดย ${d.requested_by_name} · ${fmtD(d.requested_at)}`, '/doc/' + encodeURIComponent(no)) + `<main>
    <div class="muted">${esc(d.work_category)} — แก้ลดจำนวนได้ ใส่ 0 ถ้าไม่อนุมัติรายการนั้น</div>
    <div class="fld" style="gap:10px">${r.lines.map(l => `<div class="card" style="gap:8px">
      <div class="line"><div class="grow"><div style="font-weight:600">${esc(l.mat_name)}</div><div class="small" style="color:var(--m2)">ขอ ${fmtN(l.qty_requested)} ${esc(l.unit)} · คงเหลือในคลัง ${fmtN(l.stock_at_location)}</div></div>
        <input class="mono" type="number" inputmode="decimal" min="0" max="${l.qty_requested}" step="any" value="${l.qty_requested}" data-ln="${l.line_no}" aria-label="จำนวนอนุมัติ ${esc(l.mat_name)}" style="width:84px;height:44px;border:1px solid var(--inp-b);border-radius:11px;background:var(--inp);color:var(--tx);text-align:right;padding:0 10px;font-size:16px"></div>
      ${l.boq ? `<div class="row small" style="gap:8px">${stChip(l.boq.level, boqLv[l.boq.level])}<span style="color:var(--m2)">${l.boq.boq_qty ? `เบิกแล้ว ${fmtN(l.boq.used)} / BOQ ${fmtN(l.boq.boq_qty)} → หลังอนุมัติ ${l.boq.pct_after}%` : 'ไม่พบรายการนี้ใน BOQ ของหมวดงาน'}</span></div>` : ''}</div>`).join('')}</div>
    ${r.lines.some(l => l.boq && l.boq.level === 'OVER') && !isRole('ADMIN') ? '<div class="note warn">มีรายการที่เกินงบ BOQ ต้องให้แอดมินอนุมัติ หรือลดจำนวนลง</div>' : ''}
    ${sigBlock('sg', 'ลายเซ็นผู้อนุมัติ')}
    <div id="err"></div></main><div class="foot"><button class="btn full" id="ok">อนุมัติและเซ็น</button></div>`;
  bindCommon();
  const pad = sigPad($('#sg')); $('[data-sigclear="sg"]').onclick = () => pad.clear();
  $('#ok').onclick = async () => {
    const lines = $$('[data-ln]').map(i => ({ line_no: +i.dataset.ln, qty_approved: i.value === '' ? 0 : +i.value }));
    if (lines.some(x => x.qty_approved < 0 || isNaN(x.qty_approved))) return showErr(new Error('จำนวนไม่ถูกต้อง'), 'err');
    if (!lines.some(x => x.qty_approved > 0)) return showErr(new Error('ถ้าไม่อนุมัติทุกรายการ ให้กลับไปกดปุ่ม "ไม่อนุมัติ"'), 'err');
    if (pad.isEmpty()) return showErr(new Error('กรุณาเซ็นชื่อก่อนอนุมัติ'), 'err');
    try { const x = await api('approveDoc', { doc_no: no, lines, signature: pad.dataUrl() }); toast('อนุมัติแล้ว'); S.boot = null; await shareDoc(x.doc, 'อนุมัติแล้ว รอสโตร์จ่ายของ'); go('/doc/' + encodeURIComponent(no)); }
    catch (e) { showErr(e, 'err'); }
  };
});

/* ---------- จ่ายของ ---------- */
route('/issue/:no', async no => {
  const my = S.seq; const r = await api('getDoc', { doc_no: no }); if (stale(my)) return; const d = r.doc;
  if (!['APPROVED', 'PARTIAL'].includes(d.status)) { toast('ใบนี้ยังไม่พร้อมจ่าย', true); return go('/doc/' + encodeURIComponent(no)); }
  $app.innerHTML = topbar('จ่ายของ ' + d.doc_no, `${locOf(d.from_location_id).name || ''} · ผู้ขอ ${d.requested_by_name}`, '/doc/' + encodeURIComponent(no)) + `<main>
    <div class="fld" style="gap:10px">${r.lines.map(l => { const rem = Math.max(0, (l.qty_approved || 0) - l.qty_issued); return `<div class="card" style="gap:6px">
      <div class="line"><div class="grow"><div style="font-weight:600">${esc(l.mat_name)}</div><div class="small" style="color:var(--m2)">อนุมัติ ${fmtN(l.qty_approved)} · จ่ายแล้ว ${fmtN(l.qty_issued)} · คงค้าง ${fmtN(rem)} ${esc(l.unit)}</div>
        <div class="small" style="color:${l.stock_at_location < rem ? 'var(--bad)' : 'var(--m2)'}">คงเหลือในคลัง ${fmtN(l.stock_at_location)} ${esc(l.unit)}</div></div>
        <input class="mono" type="number" inputmode="decimal" min="0" max="${rem}" step="any" value="${Math.min(rem, Math.max(0, l.stock_at_location))}" data-ln="${l.line_no}" ${rem ? '' : 'disabled'} aria-label="จำนวนจ่าย ${esc(l.mat_name)}" style="width:84px;height:44px;border:1px solid var(--inp-b);border-radius:11px;background:var(--inp);color:var(--tx);text-align:right;padding:0 10px;font-size:16px"></div></div>`; }).join('')}</div>
    <div id="upl"></div>
    ${sigBlock('sg', 'ลายเซ็นผู้จ่าย (สโตร์)')}
    <label class="check"><input type="checkbox" id="rcv"><span>ให้ผู้รับของเซ็นรับด้วย</span></label>
    <div id="rcvbox" style="display:none">${sigBlock('sg2', 'ลายเซ็นผู้รับของ')}</div>
    <div id="err"></div></main><div class="foot"><button class="btn full" id="ok">ยืนยันจ่ายของ</button></div>`;
  bindCommon();
  const pad = sigPad($('#sg')); $('[data-sigclear="sg"]').onclick = () => pad.clear();
  if (!S.issueSt || S.issueSt.doc !== no) S.issueSt = Object.assign(photoState(), { doc: no });
  let up = null;
  up = uploader('upl', S.issueSt, { stage: 'ISSUE', docNo: no, label: 'รูปของที่จัดเตรียม (นับจำนวนได้)', onChange: () => up && gateBtn($('#ok'), up, 'ยืนยันจ่ายของ') });
  gateBtn($('#ok'), up, 'ยืนยันจ่ายของ');
  let pad2 = null;
  $('#rcv').onchange = e => { $('#rcvbox').style.display = e.target.checked ? '' : 'none'; if (e.target.checked && !pad2) { pad2 = sigPad($('#sg2')); $('[data-sigclear="sg2"]').onclick = () => pad2.clear(); } };
  $('#ok').onclick = async () => {
    const lines = $$('[data-ln]:not([disabled])').map(i => ({ line_no: +i.dataset.ln, qty: i.value === '' ? 0 : +i.value }));
    if (!lines.some(x => x.qty > 0)) return showErr(new Error('ไม่มีรายการที่จะจ่าย'), 'err');
    if (!up.ready()) return showErr(new Error('กรุณาแนบรูปและรอให้อัปโหลดครบก่อน'), 'err');
    if (pad.isEmpty()) return showErr(new Error('กรุณาเซ็นชื่อผู้จ่าย'), 'err');
    if ($('#rcv').checked && (!pad2 || pad2.isEmpty())) return showErr(new Error('กรุณาให้ผู้รับเซ็นชื่อ หรือเอาเครื่องหมายออก'), 'err');
    try {
      const x = await api('issueDoc', { doc_no: no, lines, signature: pad.dataUrl(), received_signature: $('#rcv').checked ? pad2.dataUrl() : '', batch_id: S.issueSt.batch });
      S.issueSt = null;
      toast(x.doc.status === 'DELIVERED' ? 'ส่งของครบแล้ว รอผู้เบิกนับและยืนยันรับ' : 'ส่งของบางส่วนแล้ว'); S.boot = null;
      await shareDoc(x.doc, 'ส่งของแล้ว กรุณานับและยืนยันรับในแอป');
      go('/doc/' + encodeURIComponent(no));
    } catch (e) { showErr(e, 'err'); }
  };
});

/* ---------- ผู้เบิกนับและยืนยันรับของ ---------- */
route('/confirm/:no/:did', async (no, did) => {
  const my = S.seq; const r = await api('getDoc', { doc_no: no }); if (stale(my)) return;
  const v = (r.deliveries || []).find(x => x.delivery_id === did);
  if (!v || v.status !== 'WAIT_CONFIRM') { toast('รอบนี้ยืนยันแล้ว หรือไม่พบรอบส่ง', true); return go('/doc/' + encodeURIComponent(no)); }
  const lineOf = n => r.lines.find(l => l.line_no === n) || {};
  const storePhotos = r.attachments.filter(a => a.stage === 'ISSUE' && a.delivery_id === did).map(a => ({ url: a.url, label: 'สโตร์ส่งของ', by: a.by, at: a.at }));
  $app.innerHTML = topbar('ยืนยันรับของ', `${r.doc.doc_no} · รอบส่งที่ ${v.round}`, '/doc/' + encodeURIComponent(no)) + `<main>
    <div class="note ok">${esc(v.issued_by_name)} ส่งของเมื่อ ${fmtD(v.issued_at)} · นับของที่ได้รับจริง แล้วกรอกจำนวนให้ตรง</div>
    <div class="card" style="gap:0">
      <div class="line" style="padding-bottom:6px"><b class="disp">นับของที่ได้รับ</b>${storePhotos.length ? `<button class="link small" id="sp" style="color:var(--gold)">ดูรูปจากสโตร์ (${storePhotos.length})</button>` : ''}</div>
      ${v.lines.map(s => { const l = lineOf(s.line_no), m = matOf(s.mat_id); return `<div class="row" style="gap:10px;padding:10px 0;border-top:1px solid var(--line)">
        <div class="thumb" style="width:46px;height:46px">${matImg(m.mat_id ? m : { category_code: (s.mat_id || '').slice(0, 2) }, 22)}</div>
        <div class="grow"><b style="font-size:14px">${esc(l.mat_name || m.name || s.mat_id)}</b><div class="small" id="df${s.line_no}" style="color:var(--m2)">สโตร์ส่ง ${fmtN(s.qty)} ${esc(l.unit || m.unit || '')}</div></div>
        <div style="text-align:right"><div class="small" style="color:var(--m2)">นับได้จริง</div><input class="mono" type="number" inputmode="decimal" min="0" step="any" value="${s.qty}" data-ln="${s.line_no}" data-sent="${s.qty}" data-unit="${esc(l.unit || m.unit || '')}" aria-label="จำนวนที่นับได้" style="width:80px;height:42px;border:1px solid var(--inp-b);border-radius:11px;background:var(--inp);color:var(--tx);text-align:right;padding:0 10px;font-size:16px"></div></div>`; }).join('')}
    </div>
    <div id="dnote"></div>
    <div id="upl"></div>
    ${field('cn', 'หมายเหตุ (ไม่บังคับ)', { attrs: 'maxlength="200"', ph: 'เช่น ถุงปูนแตก 1 ถุง' })}
    <div id="err"></div></main><div class="foot"><button class="btn full" id="ok">ยืนยันรับของ</button></div>`;
  bindCommon();
  if ($('#sp')) $('#sp').onclick = () => viewer(storePhotos, 0);
  const diffCheck = () => {
    let n = 0;
    $$('[data-ln]').forEach(i => { const sent = +i.dataset.sent, q = +i.value || 0, d = Math.round((q - sent) * 1000) / 1000, el = $('#df' + i.dataset.ln);
      if (d) n++;
      el.innerHTML = `สโตร์ส่ง ${fmtN(sent)} ${esc(i.dataset.unit)}` + (d ? ` · <b style="color:var(--warn)">${d < 0 ? 'ขาด ' + fmtN(-d) : 'เกิน ' + fmtN(d)}</b>` : ' · ครบ');
      i.style.borderColor = d ? 'var(--warn)' : ''; });
    $('#dnote').innerHTML = n ? `<div class="note warn">จำนวนไม่ตรง ${n} รายการ · ระบบจะแจ้งแอดมินและสโตร์ทันทีเมื่อยืนยัน</div>` : '';
  };
  $$('[data-ln]').forEach(i => i.addEventListener('input', diffCheck)); diffCheck();
  if (!S.confSt || S.confSt.key !== did) S.confSt = Object.assign(photoState(), { key: did });
  let up = null;
  up = uploader('upl', S.confSt, { stage: 'CONFIRM', docNo: no, label: 'รูปของที่ได้รับ', onChange: () => up && gateBtn($('#ok'), up, 'ยืนยันรับของ') });
  gateBtn($('#ok'), up, 'ยืนยันรับของ');
  $('#ok').onclick = async () => {
    if (!up.ready()) return showErr(new Error('กรุณาแนบรูปและรอให้อัปโหลดครบก่อน'), 'err');
    const lines = $$('[data-ln]').map(i => ({ line_no: +i.dataset.ln, qty: i.value === '' ? 0 : +i.value }));
    if (lines.some(x => x.qty < 0 || isNaN(x.qty))) return showErr(new Error('จำนวนไม่ถูกต้อง'), 'err');
    try {
      const x = await api('confirmReceipt', { doc_no: no, delivery_id: did, lines, batch_id: S.confSt.batch, note: $('#cn').value.trim() });
      S.confSt = null; S.cache = {};
      toast(x.has_diff ? 'ยืนยันแล้ว · บันทึกส่วนต่างและแจ้งแอดมินแล้ว' : 'ยืนยันรับของครบแล้ว', x.has_diff); go('/doc/' + encodeURIComponent(no));
    } catch (e) { showErr(e, 'err'); }
  };
});

/* ---------- เลือกวัสดุ (ใช้ทั้งใบเบิกและรับเข้า) ---------- */
function matPicker(onPick, locId) {
  const list = S.boot.materials;
  modal(`<div class="line"><h2>เลือกวัสดุ</h2><button class="iconbtn" data-close aria-label="ปิด">${ico('x')}</button></div>
    <div class="inp"><input id="q" placeholder="ค้นหาชื่อหรือรหัสวัสดุ" autocomplete="off"></div><div id="res" class="fld" style="gap:8px"></div>`, (bg, close) => {
    const show = () => {
      const q = $('#q', bg).value.trim().toLowerCase();
      const hit = list.filter(m => !q || m.name.toLowerCase().includes(q) || m.mat_id.toLowerCase().includes(q) || String(m.spec || '').toLowerCase().includes(q)).slice(0, 40);
      $('#res', bg).innerHTML = hit.length ? hit.map(m => `<button class="card" data-m="${esc(m.mat_id)}" style="text-align:left;gap:2px"><b>${esc(m.name)}</b><span class="small" style="color:var(--m2)">${esc(m.mat_id)}${m.spec ? ' · ' + esc(m.spec) : ''} · ${esc(m.unit)}${locId ? ' · คงเหลือ ' + fmtN(stockAt(locId, m.mat_id)) : ''}</span></button>`).join('') : '<div class="empty">ไม่พบวัสดุ</div>';
      $$('[data-m]', bg).forEach(b => b.onclick = () => { onPick(b.dataset.m); close(); });
    };
    $('#q', bg).addEventListener('input', show); show(); setTimeout(() => $('#q', bg).focus(), 50);
  });
}
function lineEditor(items, opt) {
  return items.length ? items.map((it, i) => { const m = matOf(it.mat_id); return `<div class="card" style="gap:8px">
    <div class="line"><div class="grow"><div style="font-weight:600">${esc(m.name)}</div><div class="small" style="color:var(--m2)">${esc(m.mat_id)} · ${esc(m.unit)}${opt.locId ? ' · คงเหลือ ' + fmtN(stockAt(opt.locId, m.mat_id)) : ''}</div></div>
      <button class="iconbtn" data-del="${i}" aria-label="ลบรายการ" style="color:var(--m2);width:36px;height:36px">${ico('x', 18)}</button></div>
    <div class="line"><div class="qty"><button type="button" data-dec="${i}" aria-label="ลด">−</button><input type="number" inputmode="decimal" min="0" step="any" value="${it.qty}" data-q="${i}" aria-label="จำนวน ${esc(m.name)}"><button type="button" class="p" data-inc="${i}" aria-label="เพิ่ม">+</button></div>
      ${opt.price && money() ? `<div class="row small" style="gap:6px">฿<input type="number" inputmode="decimal" min="0" step="any" value="${it.unit_price}" data-pr="${i}" aria-label="ราคาต่อหน่วย" style="width:90px;height:38px;border:1px solid var(--inp-b);border-radius:11px;background:var(--inp);color:var(--tx);text-align:right;padding:0 8px;font-size:15px">/${esc(m.unit)}</div>` : `<span class="small" style="color:${opt.locId && stockAt(opt.locId, m.mat_id) < it.qty ? 'var(--bad)' : 'var(--m2)'}">${opt.locId && stockAt(opt.locId, m.mat_id) < it.qty ? 'สต็อกไม่พอ' : ''}${money() && !opt.price ? ' ' + fmtB(it.qty * (m.unit_price || 0)) : ''}</span>`}</div></div>`; }).join('')
    : '<div class="empty">ยังไม่มีรายการ กด "เพิ่มวัสดุ"</div>';
}
function bindLines(items, rerender) {
  $$('[data-del]').forEach(b => b.onclick = () => { items.splice(+b.dataset.del, 1); rerender(); });
  $$('[data-inc]').forEach(b => b.onclick = () => { items[+b.dataset.inc].qty = +(Number(items[+b.dataset.inc].qty) + 1).toFixed(4); rerender(); });
  $$('[data-dec]').forEach(b => b.onclick = () => { const it = items[+b.dataset.dec]; it.qty = Math.max(0, +(Number(it.qty) - 1).toFixed(4)); rerender(); });
  $$('[data-q]').forEach(i => i.onchange = () => { items[+i.dataset.q].qty = Math.max(0, +i.value || 0); rerender(); });
  $$('[data-pr]').forEach(i => i.onchange = () => { items[+i.dataset.pr].unit_price = Math.max(0, +i.value || 0); });
}

/* =========================================================
   เบิกวัสดุแบบแค็ตตาล็อก: เลือกหมวด/ค้นหา → ใส่ตะกร้า → ตะกร้า → พรีวิว → ส่ง
   ========================================================= */
const cartKey = () => 'kty_cart_' + ((S.user && S.user.user_id) || '');
function cart() {
  if (!S.cart) { try { S.cart = JSON.parse(localStorage.getItem(cartKey()) || 'null'); } catch (e) { } }
  if (!S.cart || !Array.isArray(S.cart.items)) S.cart = { items: [], uuid: uuid(), pid: '', loc: '', work: '', note: '' };
  return S.cart;
}
function saveCart() { try { localStorage.setItem(cartKey(), JSON.stringify(S.cart)); } catch (e) { } }
function clearCart() { S.cart = { items: [], uuid: uuid(), pid: S.cart ? S.cart.pid : '', loc: '', work: '', note: '' }; saveCart(); }
const cartQty = id => { const it = cart().items.find(x => x.mat_id === id); return it ? it.qty : 0; };
function setQty(id, q) {
  const c = cart(), it = c.items.find(x => x.mat_id === id); q = Math.max(0, Math.round((+q || 0) * 1000) / 1000);
  if (it) { if (q) it.qty = q; else c.items = c.items.filter(x => x !== it); } else if (q) c.items.push({ mat_id: id, qty: q });
  saveCart();
}
function cartSite() {
  const c = cart(), B = S.boot;
  if (!B.projects.some(p => p.project_id === c.pid)) c.pid = (B.projects.find(p => p.mine) || B.projects[0] || {}).project_id || '';
  const st = B.locations.filter(l => l.project_id === c.pid);
  if (!st.some(l => l.location_id === c.loc)) c.loc = (st[0] || {}).location_id || '';
  c.items = c.items.filter(it => matOf(it.mat_id).mat_id); // ตัดวัสดุที่ถูกปิดใช้ออก
  saveCart(); return c;
}
function stockBadge(m, loc) {
  const q = stockAt(loc, m.mat_id);
  return q <= 0 ? `<span class="sb" style="background:var(--bad-bg);color:var(--bad)">หมด</span>` : (m.min_stock && q <= m.min_stock) ? `<span class="sb" style="background:var(--warn-bg);color:var(--warn)">ใกล้หมด ${fmtN(q)}</span>` : `<span class="sb" style="background:var(--ok-bg);color:var(--ok)">มี ${fmtN(q)}</span>`;
}
function qtyCtl(id) {
  const q = cartQty(id);
  return q ? `<div class="step"><button data-dec="${esc(id)}" aria-label="ลด">${ico('minus', 16, 2.4)}</button><b>${fmtN(q)}</b><button data-inc="${esc(id)}" aria-label="เพิ่ม">${ico('plus', 16, 2.4)}</button></div>`
    : `<button class="addb" data-inc="${esc(id)}" aria-label="เพิ่มลงตะกร้า">${ico('plus', 18, 2.4)}</button>`;
}
function cartBar() {
  const c = cart(); let el = document.getElementById('cartbar');
  if (!c.items.length) { if (el) el.remove(); return; }
  const names = c.items.slice(0, 2).map(it => { const m = matOf(it.mat_id); return esc(m.name || it.mat_id) + ' ' + fmtN(it.qty) + ' ' + esc(m.unit || ''); }).join(' · ') + (c.items.length > 2 ? ' · +' + (c.items.length - 2) : '');
  const html = `<span style="position:relative;display:flex">${ico('cart', 24, 1.8)}<span class="cnt">${c.items.length}</span></span><span class="grow" style="min-width:0"><b class="disp" style="display:block;font-size:15px">ตะกร้า ${c.items.length} รายการ</b><span class="small" style="opacity:.75;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${names}</span></span><span class="go">ดูตะกร้า</span>`;
  if (!el) { el = document.createElement('button'); el.id = 'cartbar'; el.className = 'cartbar'; el.onclick = () => go('/cart'); $app.appendChild(el); }
  el.innerHTML = html;
}
route('/req/new', () => go('/shop'));
route('/shop', () => {
  const B = S.boot, c = cartSite(), P = projOf(c.pid);
  S.shop = S.shop || { cat: 'ALL', q: '' };
  S.shop.sort = S.shop.sort || { k: 'name', dir: 1 };
  const shopMats = B.materials.filter(m => m.item_type !== 'TOOL');
  const cats = B.lists.category_names.filter(x => shopMats.some(m => m.category_code === x.code));
  if (S.shop.cat !== 'ALL' && !cats.some(x => x.code === S.shop.cat)) S.shop.cat = 'ALL';
  $app.innerHTML = `<header class="top" style="flex-direction:column;align-items:stretch;gap:12px;padding-bottom:16px">
      <div class="row" style="gap:4px"><button class="iconbtn" data-go="/home" aria-label="กลับ">${ico('back', 22)}</button>
        <div class="t"><b>เบิกวัสดุ</b><button id="pjb" style="border:none;background:none;padding:0;color:var(--dk-mu);font-size:12px;display:flex;align-items:center;gap:4px">หน้างาน <span style="color:var(--metal);font-weight:600">${esc(P.project_code || 'เลือกหน้างาน')} ${esc(P.name || '')}</span>${ico('chev', 14)}</button></div>${viewToggle('shop', getView('shop', 'card'), true)}</div>
      <label class="search">${ico('search', 18)}<input id="q" placeholder="ค้นหาวัสดุ เช่น ปูน, DB12" value="${esc(S.shop.q)}" autocomplete="off" enterkeyhint="search"><button type="button" id="qx" class="iconbtn" style="width:28px;height:28px;color:var(--dk-mu);${S.shop.q ? '' : 'display:none'}" aria-label="ล้างคำค้น">${ico('x', 16)}</button></label></header>
    <div class="cats" id="cats" role="tablist">${[{ code: 'ALL', name: 'ทั้งหมด' }].concat(cats).map(x => `<button class="cat ${S.shop.cat === x.code ? 'on' : ''}" data-cat="${esc(x.code)}" role="tab"><span class="ci">${catIco(x.code)}</span>${esc(x.name.replace(/\s*\(.*\)/, ''))}</button>`).join('')}</div>
    <main id="sm" style="padding-top:10px;padding-bottom:110px"></main>`;
  bindCommon();
  const draw = () => {
    const q = S.shop.q.trim().toLowerCase(), home = !q && S.shop.cat === 'ALL';
    const list = shopMats.filter(m => (S.shop.cat === 'ALL' || m.category_code === S.shop.cat) && (!q || m.name.toLowerCase().includes(q) || m.mat_id.toLowerCase().includes(q) || String(m.spec || '').toLowerCase().includes(q)));
    const freq = home ? B.frequent.map(matOf).filter(m => m.mat_id && m.item_type !== 'TOOL') : [];
    const card = m => `<div class="mcard"><div class="mimg">${matImg(m, 46)}${stockBadge(m, c.loc)}</div><div class="mname">${esc(m.name)}</div><div class="mspec">${esc(m.spec || m.mat_id)}</div><div class="mfoot"><span class="small" style="color:var(--mu)">ต่อ ${esc(m.unit)}</span>${qtyCtl(m.mat_id)}</div></div>`;
    $('#sm').innerHTML = `
      ${freq.length ? `<div class="line"><h2>เบิกบ่อย</h2><span class="muted small">จากประวัติของคุณ</span></div><div class="hscroll">${freq.map(m => `<div class="fq"><div class="mimg">${matImg(m, 30)}</div><div class="mname" style="font-size:13px;padding-top:6px">${esc(m.name)}</div><div class="mfoot">${qtyCtl(m.mat_id)}</div></div>`).join('')}</div>` : ''}
      ${home && B.kits.length ? `<div class="line"><h2>ชุดสำเร็จรูป</h2><span class="muted small">กดเพื่อใส่ทั้งชุด</span></div><div class="hscroll">${B.kits.map(k => `<button class="kit" data-kit="${esc(k.kit_id)}"><em>${esc(k.work_category || 'ชุดวัสดุ')}</em><div class="disp" style="font-weight:600;font-size:15px;margin-top:2px">${esc(k.name)}</div><div class="small" style="color:var(--m2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${k.items.map(it => esc(matOf(it.mat_id).name || it.mat_id)).join(' · ')}</div></button>`).join('')}</div>` : ''}
      <div class="line"><h2>${home ? 'วัสดุทั้งหมด' : q ? 'ผลการค้นหา' : esc((cats.find(x => x.code === S.shop.cat) || {}).name || '')}</h2><span class="muted small">${list.length} รายการ</span></div>
      ${list.length ? matView(getView('shop', 'card'), list, card, c.loc, S.shop.sort) : `<div class="empty">ไม่พบวัสดุ${q ? ' "' + esc(S.shop.q) + '"' : ''}<br><span class="small">ลองคำค้นอื่น หรือแจ้งสโตร์ให้เพิ่มรายการ</span></div>`}`;
    cartBar();
    bindSort($('#sm'), S.shop.sort, draw);
  };
  draw();
  bindView('shop', $app, () => draw());
  $('#sm').addEventListener('click', e => {
    const inc = e.target.closest('[data-inc]'), dec = e.target.closest('[data-dec]'), kit = e.target.closest('[data-kit]');
    if (inc) { setQty(inc.dataset.inc, cartQty(inc.dataset.inc) + 1); draw(); }
    else if (dec) { setQty(dec.dataset.dec, cartQty(dec.dataset.dec) - 1); draw(); }
    else if (kit) kitSheet(B.kits.find(k => k.kit_id === kit.dataset.kit), () => { draw(); });
  });
  $$('#cats [data-cat]').forEach(b => b.onclick = () => { S.shop.cat = b.dataset.cat; $$('#cats .cat').forEach(x => x.classList.toggle('on', x === b)); draw(); window.scrollTo(0, 0); });
  let qt; $('#q').addEventListener('input', e => { clearTimeout(qt); qt = setTimeout(() => { S.shop.q = e.target.value; $('#qx').style.display = S.shop.q ? '' : 'none'; draw(); }, 120); });
  $('#qx').onclick = () => { S.shop.q = ''; $('#q').value = ''; $('#qx').style.display = 'none'; draw(); $('#q').focus(); };
  $('#pjb').onclick = () => projectSheet(() => render());
});
/* แสดงรายการวัสดุตามมุมมองที่เลือก (ใช้ร่วมกับแค็ตตาล็อก) */
function matView(mode, list, card, loc, sort) {
  if (mode === 'card') return `<div class="mgrid">${list.map(card).join('')}</div>`;
  const qtyOf = m => stockAt(loc, m.mat_id);
  if (mode === 'list') return `<div class="card" style="padding:4px 14px">${list.map(m => `<div class="mrow"><div class="thumb" style="width:50px;height:50px">${matImg(m, 24)}</div>
    <div class="grow"><b style="font-size:14px">${esc(m.name)}</b><div class="small" style="color:var(--m2)">${esc(m.spec || m.mat_id)} · ต่อ ${esc(m.unit)}</div><div class="sbw">${stockBadge(m, loc)}</div></div>${qtyCtl(m.mat_id)}</div>`).join('')}</div>`;
  const rows = sortRows(list, sort, { code: m => m.mat_id, name: m => m.name, stock: qtyOf });
  return `<div class="card" style="padding:0;overflow-x:auto"><table class="mt"><thead><tr>${thSort('รหัส', 'code', sort)}${thSort('ชื่อ / สเปค', 'name', sort)}<th>หน่วย</th>${thSort('คงเหลือ', 'stock', sort, 'r')}<th class="r">เบิก</th></tr></thead><tbody>
    ${rows.map(m => { const q = qtyOf(m); return `<tr><td class="c">${esc(m.mat_id)}</td><td><b>${esc(m.name)}</b><div class="small" style="color:var(--m2)">${esc(m.spec || '')}</div></td><td style="color:var(--mu)">${esc(m.unit)}</td><td class="r" style="font-weight:600;color:${q <= 0 ? 'var(--bad)' : m.min_stock && q <= m.min_stock ? 'var(--warn)' : 'var(--ok)'}">${fmtN(q)}</td><td class="r">${qtyCtl(m.mat_id)}</td></tr>`; }).join('')}
  </tbody></table></div>`;
}
function projectSheet(done) {
  const B = S.boot, c = cart();
  modal(`<div class="line"><h2>เลือกหน้างาน</h2><button class="iconbtn" data-close aria-label="ปิด">${ico('x')}</button></div>
    <div class="fld" style="gap:8px">${B.projects.map(p => `<button class="card ${p.project_id === c.pid ? 'hl' : ''}" data-p="${esc(p.project_id)}" style="gap:2px"><b class="disp">${esc(p.project_code)} · ${esc(p.name)}</b><span class="small" style="color:var(--m2)">${esc(p.location || '')}${p.mine ? ' · โครงการของคุณ' : ''}</span></button>`).join('') || '<div class="empty">ยังไม่มีโครงการที่เปิดอยู่</div>'}</div>`, (bg, close) => {
    $$('[data-p]', bg).forEach(b => b.onclick = () => { c.pid = b.dataset.p; c.loc = ''; cartSite(); close(); done(); });
  });
}
function kitSheet(k, done) {
  if (!k) return;
  let mult = 1;
  const drawK = bg => { $('#kl', bg).innerHTML = k.items.map(it => { const m = matOf(it.mat_id); return `<div class="row" style="gap:12px;padding:8px 0;border-top:1px solid var(--line)"><div class="thumb">${matImg(m, 26)}</div><div class="grow"><b style="font-size:14px">${esc(m.name)}</b><div class="small" style="color:var(--m2)">${esc(m.spec || m.mat_id)}</div></div><b class="disp">${fmtN(it.qty * mult)} <span class="small" style="font-weight:400">${esc(m.unit)}</span></b></div>`; }).join(''); $('#km', bg).textContent = '× ' + mult; };
  modal(`<div class="line"><div><span class="small" style="color:var(--gold);letter-spacing:.06em">${esc(k.work_category || 'ชุดวัสดุ')}</span><h2 style="margin:0">${esc(k.name)}</h2></div><button class="iconbtn" data-close aria-label="ปิด">${ico('x')}</button></div>
    <div id="kl"></div>
    <div class="line"><span class="lbl">จำนวนชุด</span><div class="qty"><button id="kd" aria-label="ลด">−</button><b class="disp" id="km" style="min-width:44px;text-align:center"></b><button class="p" id="ki" aria-label="เพิ่ม">+</button></div></div>
    <button class="btn" id="kadd">${ico('cart', 18)}ใส่ทั้งชุดลงตะกร้า</button>`, (bg, close) => {
    drawK(bg);
    $('#kd', bg).onclick = () => { mult = Math.max(1, mult - 1); drawK(bg); };
    $('#ki', bg).onclick = () => { mult++; drawK(bg); };
    $('#kadd', bg).onclick = () => { k.items.forEach(it => setQty(it.mat_id, cartQty(it.mat_id) + it.qty * mult)); const c = cart(); if (!c.work && k.work_category) c.work = k.work_category; saveCart(); close(); toast('ใส่ "' + k.name + '" ลงตะกร้าแล้ว'); done(); };
  });
}

/* ---------- ตะกร้า → พรีวิว → ส่ง ---------- */
route('/cart', () => {
  const B = S.boot;
  const draw = () => {
    const c = cartSite(), P = projOf(c.pid), sites = B.locations.filter(l => l.project_id === c.pid);
    if (S.cartPreview) return preview(c, P);
    $app.innerHTML = topbar('ตะกร้าเบิกวัสดุ', 'ตรวจสอบก่อนส่งขออนุมัติ', '/shop') + `<main style="padding-bottom:24px">
      <div class="card" style="padding:14px 16px 6px;gap:0">
        <div class="line" style="padding-bottom:6px"><b class="disp">รายการ (${c.items.length})</b><a href="#/shop" class="small" style="color:var(--gold);text-decoration:none">+ เพิ่มวัสดุ</a></div>
        ${c.items.length ? c.items.map(it => { const m = matOf(it.mat_id), q = stockAt(c.loc, it.mat_id), lack = q < it.qty; return `<div class="row" style="gap:12px;padding:12px 0;border-top:1px solid var(--line)">
          <div class="thumb">${matImg(m, 26)}</div>
          <div class="grow"><div style="font-weight:600;font-size:14px">${esc(m.name)}</div><div class="small" style="color:${lack ? 'var(--warn)' : 'var(--m2)'}">${esc(m.spec || m.mat_id)} · คงเหลือ ${fmtN(q)} ${esc(m.unit)}${lack ? ' · ไม่พอ' : ''}</div>${money() ? `<div class="small" style="color:var(--m2)">${fmtB(it.qty * (m.unit_price || 0))}</div>` : ''}</div>
          <div class="qty"><button data-dec="${esc(it.mat_id)}" aria-label="ลด">−</button><input type="number" inputmode="decimal" min="0" step="any" value="${it.qty}" data-q="${esc(it.mat_id)}" aria-label="จำนวน ${esc(m.name)}" style="width:54px"><button class="p" data-inc="${esc(it.mat_id)}" aria-label="เพิ่ม">+</button></div></div>`; }).join('')
          : '<div class="empty">ตะกร้าว่าง · กลับไปเลือกวัสดุ</div>'}
      </div>
      <div class="fld"><label for="pj">หน้างาน</label><div class="inp"><select id="pj">${B.projects.map(p => `<option value="${esc(p.project_id)}" ${p.project_id === c.pid ? 'selected' : ''}>${esc(p.project_code)} · ${esc(p.name)}</option>`).join('')}</select></div>
        <div class="hint">${sites.length === 1 ? 'เบิกจาก ' + esc(sites[0].name) : ''}</div></div>
      ${sites.length > 1 ? `<div class="fld"><label for="lc">เบิกจากคลัง</label><div class="inp"><select id="lc">${sites.map(x => `<option value="${esc(x.location_id)}" ${x.location_id === c.loc ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div></div>` : ''}
      ${c.pid && !sites.length ? '<div class="note warn">หน้างานนี้ยังไม่มีคลัง กรุณาแจ้งแอดมิน</div>' : ''}
      <div class="fld"><label for="wc">หมวดงาน / จุดใช้งาน</label><div class="inp"><select id="wc"><option value="">เลือกหมวดงาน</option>${B.lists.work_categories.map(w => `<option ${w === c.work ? 'selected' : ''}>${esc(w)}</option>`).join('')}</select></div></div>
      <div class="fld"><label for="nt">หมายเหตุ (ไม่บังคับ)</label><textarea class="ta" id="nt" maxlength="300">${esc(c.note || '')}</textarea></div>
      ${money() && c.items.length ? `<div class="line"><span class="muted">มูลค่าประมาณ</span><b class="disp" style="font-size:18px">${fmtB(c.items.reduce((t, it) => t + it.qty * (matOf(it.mat_id).unit_price || 0), 0))}</b></div>` : ''}
      <div id="err"></div></main>
      <div class="foot"><button class="btn sec" data-go="/shop">เลือกต่อ</button><button class="btn full" id="ok" ${c.items.length && c.loc ? '' : 'disabled'}>ตรวจสอบและส่ง</button></div>`;
    bindCommon();
    const keep = () => { c.work = $('#wc').value; c.note = $('#nt').value; if ($('#lc')) c.loc = $('#lc').value; saveCart(); };
    $('#pj').onchange = e => { keep(); c.pid = e.target.value; c.loc = ''; draw(); };
    if ($('#lc')) $('#lc').onchange = () => { keep(); draw(); };
    $$('[data-inc]').forEach(b => b.onclick = () => { keep(); setQty(b.dataset.inc, cartQty(b.dataset.inc) + 1); draw(); });
    $$('[data-dec]').forEach(b => b.onclick = () => { keep(); setQty(b.dataset.dec, cartQty(b.dataset.dec) - 1); draw(); });
    $$('[data-q]').forEach(i => i.onchange = () => { keep(); setQty(i.dataset.q, i.value); draw(); });
    ['wc', 'nt'].forEach(id => $('#' + id).addEventListener('change', keep));
    $('#ok').onclick = () => {
      keep();
      if (!c.work) return showErr(new Error('กรุณาเลือกหมวดงาน'), 'err');
      if (!c.items.length) return showErr(new Error('ตะกร้าว่าง'), 'err');
      S.cartPreview = true; draw();
    };
  };
  const preview = (c, P) => {
    const loc = locOf(c.loc), short = c.items.filter(it => stockAt(c.loc, it.mat_id) < it.qty);
    $app.innerHTML = topbar('ตรวจสอบใบเบิก', 'ขั้นสุดท้ายก่อนส่ง', null) + `<main>
      <div class="card" style="gap:0">
        <div class="kv" style="border:none"><span>หน้างาน</span><b>${esc(P.project_code)} · ${esc(P.name)}</b></div>
        <div class="kv"><span>เบิกจากคลัง</span><span>${esc(loc.name || '-')}</span></div>
        <div class="kv"><span>หมวดงาน</span><span>${esc(c.work)}</span></div>
        <div class="kv"><span>ผู้ขอเบิก</span><span>${esc(S.user.name)}</span></div></div>
      <div class="card" style="padding:0;overflow-x:auto"><table class="tb"><thead><tr><th>#</th><th>รายการ</th><th class="r">จำนวน</th>${money() ? '<th class="r">มูลค่า</th>' : ''}</tr></thead><tbody>
        ${c.items.map((it, i) => { const m = matOf(it.mat_id), lack = stockAt(c.loc, it.mat_id) < it.qty; return `<tr><td>${i + 1}</td><td><div style="font-weight:600">${esc(m.name)}</div><div class="small" style="color:${lack ? 'var(--warn)' : 'var(--m2)'}">${esc(m.mat_id)} · คงเหลือ ${fmtN(stockAt(c.loc, it.mat_id))}${lack ? ' (ไม่พอ)' : ''}</div></td><td class="r"><b>${fmtN(it.qty)}</b> ${esc(m.unit)}</td>${money() ? `<td class="r">${fmtB(it.qty * (m.unit_price || 0))}</td>` : ''}</tr>`; }).join('')}
      </tbody></table></div>
      ${short.length ? `<div class="note warn">มี ${short.length} รายการที่สต็อกในคลังไม่พอ ส่งได้ แต่สโตร์อาจจ่ายได้ไม่ครบ</div>` : ''}
      ${c.note ? `<div class="muted">หมายเหตุ: ${esc(c.note)}</div>` : ''}
      <div class="note info">เมื่อส่งแล้ว ผู้อนุมัติของหน้างานนี้จะได้รับแจ้งเตือนทันที</div>
      <div id="err"></div></main>
      <div class="foot"><button class="btn sec" id="back">กลับไปแก้ไข</button><button class="btn full" id="send">ยืนยันส่งใบเบิก</button></div>`;
    $('#back').onclick = () => { S.cartPreview = false; draw(); };
    $('#send').onclick = async () => {
      try {
        const x = await api('createReq', { client_uuid: c.uuid, project_id: c.pid, from_location_id: c.loc, work_category: c.work, note: c.note, lines: c.items.map(it => ({ mat_id: it.mat_id, qty: it.qty })) });
        S.cartPreview = false; clearCart(); reqDone(x);
      } catch (e) { showErr(e, 'err'); }
    };
  };
  S.cartPreview = false;
  draw();
});
function reqDone(x) {
  const w = x.warnings || [];
  $app.innerHTML = topbar('ส่งใบเบิกแล้ว', '', '/home') + `<main style="gap:16px">
    <div style="display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;padding-top:12px">
      <div style="width:80px;height:80px;border-radius:40px;background:var(--acbtn);color:var(--acbtn-tx);display:flex;align-items:center;justify-content:center">${ico('check', 42, 2.6)}</div>
      <h2 style="margin:0">${esc(x.doc.doc_no)}</h2><div class="muted">${x.duplicate ? 'ใบนี้ส่งไปแล้วก่อนหน้า (ระบบกันส่งซ้ำ)' : 'ส่งขออนุมัติเรียบร้อย'}</div></div>
    ${w.length ? `<div class="fld" style="gap:8px"><span class="lbl">ข้อควรทราบ</span>${w.map(z => `<div class="note ${z.type === 'BOQ_OVER' || z.type === 'STOCK' ? 'bad' : 'warn'}">${esc(z.message)}</div>`).join('')}</div>` : ''}
    <div class="note info">ระบบแจ้งเตือนผู้อนุมัติแล้ว ถ้าต้องการเร่ง กด "ส่งต่อทาง LINE" ได้อีกทาง</div>
  </main><div class="foot"><button class="btn sec" data-go="/doc/${encodeURIComponent(x.doc.doc_no)}">ดูใบเบิก</button><button class="btn full" id="sh">${ico('share', 18)}ส่งต่อทาง LINE</button></div>`;
  bindCommon();
  $('#sh').onclick = () => shareDoc(x.doc, 'ขออนุมัติใบเบิก');
}

/* ---------- รับเข้า ---------- */
route('/receive', () => {
  if (!isRole('STORE', 'ADMIN')) return go('/home');
  const B = S.boot;
  const D = S.rcv = S.rcv || { items: [], uuid: uuid(), loc: (B.locations[0] || {}).location_id || '', ref: '', note: '' };
  const draw = () => {
    $app.innerHTML = topbar('รับของเข้าคลัง', 'บันทึกของที่ส่งมาถึง', '/home') + `<main>
      <div class="fld"><label for="lc">รับเข้าคลัง</label><div class="inp"><select id="lc">${B.locations.map(s => `<option value="${esc(s.location_id)}" ${s.location_id === D.loc ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div></div>
      ${field('rf', 'เลขที่ใบส่งของ / ผู้ขาย (ไม่บังคับ)', { value: D.ref, attrs: 'maxlength="80"' })}
      <div class="line"><span class="lbl">รายการ (${D.items.length})</span><button class="btn sm dark" id="add">${ico('plus', 18)}เพิ่มวัสดุ</button></div>
      <div class="fld" style="gap:10px">${lineEditor(D.items, { price: true })}</div>
      <div class="fld"><label for="nt">หมายเหตุ</label><textarea class="ta" id="nt" maxlength="200">${esc(D.note)}</textarea></div>
      <div id="upl"></div>
      ${sigBlock('sg', 'ลายเซ็นผู้รับของ (ไม่บังคับ)')}
      <div id="err"></div></main><div class="foot"><button class="btn full" id="ok">บันทึกรับเข้า</button></div>`;
    bindCommon();
    const pad = sigPad($('#sg')); $('[data-sigclear="sg"]').onclick = () => pad.clear();
    D.photos = D.photos || photoState();
    let up = null;
    up = uploader('upl', D.photos, { stage: 'RCV', label: 'รูปของที่ได้รับ / ใบส่งของ', onChange: () => up && gateBtn($('#ok'), up, 'บันทึกรับเข้า') });
    gateBtn($('#ok'), up, 'บันทึกรับเข้า');
    const keep = () => { D.loc = $('#lc').value; D.ref = $('#rf').value; D.note = $('#nt').value; };
    $('#lc').onchange = keep;
    $('#add').onclick = () => { keep(); matPicker(id => { const ex = D.items.find(x => x.mat_id === id); if (ex) ex.qty++; else D.items.push({ mat_id: id, qty: 1, unit_price: matOf(id).unit_price || 0 }); draw(); }); };
    bindLines(D.items, () => { keep(); draw(); });
    $('#ok').onclick = async () => {
      keep(); const items = D.items.filter(x => x.qty > 0);
      if (!items.length) return showErr(new Error('กรุณาเพิ่มวัสดุอย่างน้อย 1 รายการ'), 'err');
      if (!up.ready()) return showErr(new Error('กรุณาแนบรูปและรอให้อัปโหลดครบก่อน'), 'err');
      try {
        const x = await api('receive', { client_uuid: D.uuid, location_id: D.loc, supplier_ref: D.ref, note: D.note, signature: pad.isEmpty() ? '' : pad.dataUrl(), batch_id: D.photos.batch, lines: items.map(it => money() ? { mat_id: it.mat_id, qty: it.qty, unit_price: it.unit_price } : { mat_id: it.mat_id, qty: it.qty }) });
        S.rcv = null; S.boot = null; toast('บันทึกรับเข้า ' + x.doc.doc_no + ' แล้ว'); go('/doc/' + encodeURIComponent(x.doc.doc_no));
      } catch (e) { showErr(e, 'err'); }
    };
  };
  draw();
});

/* ---------- สต็อก (การ์ด / รายการ / ตาราง) ---------- */
route('/stock', async () => {
  const B = S.boot;
  if (!S.soft) loadBoot(true);
  S.stockLoc = B.locations.some(l => l.location_id === S.stockLoc) ? S.stockLoc : ((B.locations.find(l => l.mine) || B.locations[0]) || {}).location_id;
  S.stockF = S.stockF || { f: 'all', q: '', sort: { k: 'name', dir: 1 } };
  const F = S.stockF;
  $app.innerHTML = topbar('สต็อกคงเหลือ', '', null) + `<main>
    <div class="row"><div class="inp grow"><select id="lc" aria-label="เลือกคลัง">${B.locations.map(l => `<option value="${esc(l.location_id)}" ${l.location_id === S.stockLoc ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select></div>${viewToggle('stock', getView('stock', 'list'))}</div>
    <div class="inp"><input id="q" placeholder="ค้นหาวัสดุ" autocomplete="off" value="${esc(F.q)}"></div>
    <div class="row chips">${[['all', 'ทั้งหมด'], ['has', 'มีของ'], ['low', 'ใกล้หมด/หมด']].map(([k, n]) => `<button class="chip ${F.f === k ? 'on' : ''}" data-f="${k}">${n}</button>`).join('')}</div>
    <div id="lst"></div></main>${bottomNav('stock')}`;
  bindCommon();
  const lv = (m, q) => q < 0 ? ['OVER', 'ติดลบ'] : q === 0 ? ['REJECTED', 'หมด'] : (m.min_stock && q <= m.min_stock ? ['WARN', 'ต่ำ'] : ['OK', 'ปกติ']);
  const show = () => {
    const q = F.q.trim().toLowerCase(), loc = S.stockLoc, mode = getView('stock', 'list');
    const rows = B.materials.map(m => ({ m, q: stockAt(loc, m.mat_id) })).filter(x => (!q || x.m.name.toLowerCase().includes(q) || x.m.mat_id.toLowerCase().includes(q))
      && (F.f === 'all' || (F.f === 'has' && x.q > 0) || (F.f === 'low' && x.m.item_type !== 'TOOL' && x.q <= x.m.min_stock)));
    if (!rows.length) { $('#lst').innerHTML = '<div class="empty">ไม่มีรายการ</div>'; return; }
    if (mode === 'card') $('#lst').innerHTML = `<div class="mgrid">${rows.map(x => { const v = lv(x.m, x.q); return `<div class="mcard"><div class="mimg">${matImg(x.m, 44)}</div><div class="mname">${esc(x.m.name)}</div><div class="mspec">${esc(x.m.spec || x.m.mat_id)}</div><div class="mfoot"><b class="disp" style="font-size:18px">${fmtN(x.q)} <span class="small" style="font-weight:400">${esc(x.m.unit)}</span></b>${stChip(v[0], v[1])}</div></div>`; }).join('')}</div>`;
    else if (mode === 'list') $('#lst').innerHTML = `<div class="card" style="padding:4px 14px">${rows.map(x => { const v = lv(x.m, x.q); return `<div class="mrow"><div class="thumb" style="width:46px;height:46px">${matImg(x.m, 22)}</div><div class="grow"><div style="font-weight:600">${esc(x.m.name)}</div><div class="small" style="color:var(--m2)">${esc(x.m.mat_id)}${x.m.spec ? ' · ' + esc(x.m.spec) : ''}</div></div><div style="text-align:right"><div class="disp" style="font-weight:700;font-size:17px">${fmtN(x.q)} <span class="small" style="font-weight:400">${esc(x.m.unit)}</span></div>${stChip(v[0], v[1])}</div></div>`; }).join('')}</div>`;
    else {
      const rs = sortRows(rows, F.sort, { code: x => x.m.mat_id, name: x => x.m.name, stock: x => x.q });
      $('#lst').innerHTML = `<div class="card" style="padding:0;overflow-x:auto"><table class="mt"><thead><tr>${thSort('รหัส', 'code', F.sort)}${thSort('ชื่อ / สเปค', 'name', F.sort)}<th>หน่วย</th>${thSort('คงเหลือ', 'stock', F.sort, 'r')}<th>สถานะ</th></tr></thead><tbody>${rs.map(x => { const v = lv(x.m, x.q); return `<tr><td class="c">${esc(x.m.mat_id)}</td><td><b>${esc(x.m.name)}</b><div class="small" style="color:var(--m2)">${esc(x.m.spec || '')}</div></td><td style="color:var(--mu)">${esc(x.m.unit)}</td><td class="r" style="font-weight:700">${fmtN(x.q)}</td><td>${stChip(v[0], v[1])}</td></tr>`; }).join('')}</tbody></table></div>`;
      bindSort($('#lst'), F.sort, show);
    }
  };
  $('#lc').onchange = e => { S.stockLoc = e.target.value; show(); };
  $('#q').addEventListener('input', e => { F.q = e.target.value; show(); });
  $$('[data-f]').forEach(b => b.onclick = () => { F.f = b.dataset.f; $$('[data-f]').forEach(x => x.classList.toggle('on', x === b)); show(); });
  bindView('stock', $app, show);
  show();
});

/* ---------- แอดมิน: ผู้สมัครและผู้ใช้ ---------- */
route('/admin/users', () => adminUsers('PENDING_APPROVAL'));
route('/admin/users/:tab', t => adminUsers(t));
async function adminUsers(tab) {
  if (!isRole('ADMIN')) return go('/home');
  const my = S.seq;
  const B = S.boot;
  const tabs = [['PENDING_APPROVAL', 'รออนุมัติ'], ['ACTIVE,INACTIVE', 'ผู้ใช้ทั้งหมด'], ['REJECTED,PENDING_VERIFY', 'อื่น ๆ']];
  $app.innerHTML = topbar('ผู้สมัครและผู้ใช้', 'แอดมิน', '/home') + `<main>
    <div class="tabs">${tabs.map(([k, n]) => `<a class="chip ${k === tab ? 'on' : ''}" style="display:flex;align-items:center;text-decoration:none;white-space:nowrap" href="#/admin/users/${k}">${n}</a>`).join('')}</div>
    <div id="lst" class="fld" style="gap:12px"><div class="empty">กำลังโหลด…</div></div>
    <div class="card"><span class="lbl">เพิ่มรายการตำแหน่ง</span><div class="row"><div class="inp grow"><input id="np" placeholder="เช่น ช่างไฟฟ้า" maxlength="40"></div><button class="btn sm dark" id="addp">เพิ่ม</button></div>
      <div class="small" style="color:var(--m2)">ตอนนี้มี: ${B.lists.positions.map(esc).join(', ')}</div></div></main>`;
  bindCommon();
  $('#addp').onclick = async () => { const v = $('#np').value.trim(); if (!v) return; try { await api('adminAddListItem', { list: 'POSITION', value: v }); S.boot = null; S.regOpts = null; toast('เพิ่มตำแหน่งแล้ว'); render(); } catch (e) { toast(e.message, true); } };
  const users = await api('adminListUsers', { status: tab }, { quiet: true });
  if (stale(my) || !$('#lst')) return;
  const projChips = (sel, id) => `<div class="chips" data-pj="${id}">${B.projects.map(p => `<button type="button" class="chip ${sel.includes(p.project_id) ? 'on' : ''}" data-p="${esc(p.project_id)}">${esc(p.project_code)}</button>`).join('')}<button type="button" class="chip ${sel.includes('ALL') ? 'on' : ''}" data-p="ALL">ทุกโครงการ</button></div>`;
  const roleSeg = (sel, id) => `<div class="seg" style="grid-template-columns:repeat(4,1fr)" data-rl="${id}">${Object.keys(ROLE_TH).map(r => `<button type="button" class="${sel === r ? 'on' : ''}" data-r="${r}">${ROLE_TH[r]}</button>`).join('')}</div>`;
  const card = u => {
    const pend = u.status === 'PENDING_APPROVAL', act = ['ACTIVE', 'INACTIVE'].includes(u.status);
    const sel = String(u.project_ids || '').split(',').map(s => s.trim()).filter(Boolean);
    return `<div class="card ${pend ? 'hl' : ''}" data-u="${esc(u.user_id)}" style="gap:10px">
      <div class="row" style="gap:12px">${avatar(u, 52)}<div class="grow"><div style="font-weight:600">${esc((u.title || '') + u.name)}${u.nickname ? ' (' + esc(u.nickname) + ')' : ''}</div><div class="small" style="color:var(--m2)">${esc(u.position || '-')} · ${esc(u.user_id)} · สมัคร ${fmtD(u.applied_at, false)}</div></div>${stChip(u.status === 'PENDING_APPROVAL' ? 'PENDING' : u.status, USTAT_TH[u.status])}</div>
      <div>
        <div class="kv"><span>Username</span><span>${esc(u.username)}</span></div>
        <div class="kv"><span>มือถือ</span><span>${esc(fmtPhone(u.phone))}</span></div>
        <div class="kv"><span>อีเมล</span><span style="word-break:break-all">${esc(u.email)}${u.email_verified ? ' ✓' : ''}</span></div>
        <div class="kv"><span>วันเกิด</span><span>${fmtD(u.birth_date, false)}</span></div>
        <div class="kv"><span>เลขบัตร</span><span class="row" style="gap:8px"><span class="mono" data-nid>${esc(u.national_id_mask || '-')}</span>${u.national_id_mask ? '<button class="btn sm sec" style="height:30px;font-size:12px" data-view>ดูเลขเต็ม</button>' : ''}</span></div>
        ${u.reject_reason ? `<div class="kv"><span>เหตุผล</span><span>${esc(u.reject_reason)}</span></div>` : ''}
      </div>
      ${pend || act ? `<div class="fld"><span class="lbl">บทบาทในระบบ</span>${roleSeg(u.role || 'REQUESTER', u.user_id)}</div><div class="fld"><span class="lbl">โครงการ</span>${projChips(sel.length ? sel : (B.projects[0] ? [B.projects[0].project_id] : []), u.user_id)}</div>` : ''}
      ${pend ? `<div class="g2" style="grid-template-columns:1fr 1.6fr"><button class="btn danger" data-rej>ไม่อนุมัติ</button><button class="btn" data-ok>อนุมัติ</button></div>` : ''}
      ${act ? `<div class="row" style="flex-wrap:wrap"><button class="btn sm" data-save>บันทึกสิทธิ์</button><button class="btn sm sec" data-tog>${u.status === 'ACTIVE' ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}</button><button class="btn sm sec" data-kick>เตะออกทุกเครื่อง</button></div>` : ''}
    </div>`;
  };
  $('#lst').innerHTML = users.length ? users.map(card).join('') : '<div class="empty">ไม่มีรายการ</div>';
  $$('#lst [data-u]').forEach(c => {
    const id = c.dataset.u, u = users.find(x => x.user_id === id);
    $$('[data-rl] button', c).forEach(b => b.onclick = () => $$('[data-rl] button', c).forEach(x => x.classList.toggle('on', x === b)));
    $$('[data-pj] .chip', c).forEach(b => b.onclick = () => {
      if (b.dataset.p === 'ALL') { $$('[data-pj] .chip', c).forEach(x => x.classList.toggle('on', x === b)); return; }
      $$('[data-pj] [data-p="ALL"]', c).forEach(x => x.classList.remove('on')); b.classList.toggle('on');
    });
    const picked = () => ({ role: ($('[data-rl] .on', c) || {}).dataset.r || 'REQUESTER', project_ids: $$('[data-pj] .chip.on', c).map(x => x.dataset.p).join(',') });
    const v = $('[data-view]', c);
    if (v) v.onclick = () => modal(`<h2>ดูเลขบัตรประชาชนเต็ม</h2><div class="note warn">การดูเลขเต็มจะถูกบันทึกใน AuditLog ว่าใครดูเมื่อไร</div><div class="row"><button class="btn sec full" data-close>ยกเลิก</button><button class="btn full" id="y">ดูเลขเต็ม</button></div>`, (bg, close) => {
      $('#y', bg).onclick = async () => { try { const r = await api('adminViewNationalId', { user_id: id }); $('[data-nid]', c).textContent = r.national_id; close(); setTimeout(() => { const el = $('[data-nid]', c); if (el) el.textContent = u.national_id_mask; }, 30000); } catch (e) { toast(e.message, true); } };
    });
    const ok = $('[data-ok]', c);
    if (ok) ok.onclick = async () => { const p = picked(); if (!p.project_ids && p.role !== 'ADMIN') return toast('กรุณาเลือกโครงการ', true); try { await api('adminApproveUser', { user_id: id, ...p }); toast('อนุมัติ ' + u.name + ' แล้ว'); S.boot = null; render(); } catch (e) { toast(e.message, true); } };
    const rj = $('[data-rej]', c);
    if (rj) rj.onclick = () => modal(`<h2>ไม่อนุมัติ ${esc(u.name)}</h2><div class="fld"><label for="why">เหตุผล (ส่งให้ผู้สมัครทางอีเมล)</label><textarea class="ta" id="why" maxlength="300"></textarea></div><div id="merr"></div><div class="row"><button class="btn sec full" data-close>กลับ</button><button class="btn danger full" id="y">ยืนยัน</button></div>`, (bg, close) => {
      $('#y', bg).onclick = async () => { const why = $('#why', bg).value.trim(); if (why.length < 3) return showErr(new Error('กรุณาระบุเหตุผล'), 'merr'); try { await api('adminRejectUser', { user_id: id, reason: why }); close(); toast('บันทึกแล้ว'); S.boot = null; render(); } catch (e) { showErr(e, 'merr'); } };
    });
    const sv = $('[data-save]', c);
    if (sv) sv.onclick = async () => { const p = picked(); try { await api('adminUpdateUser', { user_id: id, ...p, status: u.status, position: u.position }); toast('บันทึกสิทธิ์แล้ว'); } catch (e) { toast(e.message, true); } };
    const tg = $('[data-tog]', c);
    if (tg) tg.onclick = async () => { const p = picked(); try { await api('adminUpdateUser', { user_id: id, ...p, status: u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE', position: u.position }); toast('บันทึกแล้ว'); render(); } catch (e) { toast(e.message, true); } };
    const kk = $('[data-kick]', c);
    if (kk) kk.onclick = async () => { try { await api('adminRevoke', { user_id: id }); toast('ผู้ใช้ต้องเข้าสู่ระบบใหม่ทุกเครื่อง'); } catch (e) { toast(e.message, true); } };
  });
}

/* ---------- แอดมิน: จัดการโครงการ (หน้างาน) ---------- */
route('/admin/projects', async () => {
  if (!isRole('ADMIN')) return go('/home');
  const my = S.seq;
  $app.innerHTML = topbar('จัดการโครงการ', 'หน้างานที่ให้เลือกตอนเบิก', '/home') + `<main>
    <button class="btn" id="add">${ico('plus', 18)}เพิ่มโครงการใหม่</button>
    <div id="lst" class="fld" style="gap:10px"><div class="empty">กำลังโหลด…</div></div></main>`;
  bindCommon();
  const stTh = { ACTIVE: ['OK', 'เปิดอยู่'], ON_HOLD: ['WARN', 'พักไว้'], CLOSED: ['REJECTED', 'ปิดแล้ว'] };
  let list = [];
  const paint = r => {
    list = r; if (stale(my) || !$('#lst')) return;
    $('#lst').innerHTML = r.length ? r.map(p => `<button class="card" data-p="${esc(p.project_id)}" style="text-align:left;gap:4px">
      <div class="line"><b class="disp" style="font-size:17px">${esc(p.project_code)}</b>${stChip(stTh[p.status][0], stTh[p.status][1])}</div>
      <div style="font-weight:600">${esc(p.name)}</div><div class="small" style="color:var(--m2)">${esc(p.location || '-')} · ${esc(p.site_name || 'ไม่มีคลัง')}${p.manager_name ? ' · หัวหน้า ' + esc(p.manager_name) : ''}</div></button>`).join('') : '<div class="empty">ยังไม่มีโครงการ</div>';
    $$('#lst [data-p]').forEach(b => b.onclick = () => editProject(list.find(x => x.project_id === b.dataset.p)));
  };
  $('#add').onclick = () => editProject(null);
  await cached('projects', 'adminListProjects', {}, paint);
});
async function editProject(p) {
  let users = [];
  try { users = await api('adminListUsers', { status: 'ACTIVE' }); } catch (e) { }
  const isNew = !p; p = p || { status: 'ACTIVE' };
  modal(`<div class="line"><h2>${isNew ? 'เพิ่มโครงการใหม่' : 'แก้ไข ' + esc(p.project_code)}</h2><button class="iconbtn" data-close aria-label="ปิด">${ico('x')}</button></div>
    ${field('pc', 'รหัสโครงการ (ใช้ในเลขเอกสาร แก้ภายหลังไม่ได้)', { value: p.project_code || '', mono: true, attrs: `maxlength="10" autocapitalize="characters" ${isNew ? '' : 'disabled'}`, hint: 'A-Z และ 0-9 ยาว 2–10 ตัว เช่น SB02' })}
    ${field('pn', 'ชื่อโครงการ / หน้างาน', { value: p.name || '', attrs: 'maxlength="100"' })}
    ${field('pl', 'ที่ตั้ง (ไม่บังคับ)', { value: p.location || '', attrs: 'maxlength="100"' })}
    <div class="fld"><label for="pm">หัวหน้าโครงการ (ไม่บังคับ)</label><div class="inp"><select id="pm"><option value="">-</option>${users.map(u => `<option value="${esc(u.user_id)}" ${u.user_id === p.manager_user_id ? 'selected' : ''}>${esc(u.name)} (${esc(ROLE_TH[u.role] || u.role)})</option>`).join('')}</select></div></div>
    <div class="fld"><span class="lbl">สถานะ</span><div class="seg" id="ps" style="grid-template-columns:repeat(3,1fr)">${[['ACTIVE', 'เปิดอยู่'], ['ON_HOLD', 'พักไว้'], ['CLOSED', 'ปิดแล้ว']].map(([k, n]) => `<button type="button" class="${p.status === k ? 'on' : ''}" data-s="${k}">${n}</button>`).join('')}</div>
      <div class="hint">เฉพาะ "เปิดอยู่" ที่แสดงให้เลือกตอนเบิก · สร้างใหม่ระบบสร้างคลังไซต์ให้อัตโนมัติ</div></div>
    <div class="muted small">ผู้อนุมัติและสโตร์ของโครงการ กำหนดได้ที่หน้า "ผู้สมัคร/ผู้ใช้"</div>
    <div id="merr"></div><button class="btn" id="sv">${isNew ? 'สร้างโครงการ' : 'บันทึก'}</button>`, (bg, close) => {
    $$('#ps button', bg).forEach(b => b.onclick = () => $$('#ps button', bg).forEach(x => x.classList.toggle('on', x === b)));
    $('#sv', bg).onclick = async () => {
      const code = $('#pc', bg).value.trim().toUpperCase(), name = $('#pn', bg).value.trim();
      if (isNew && !/^[A-Z0-9]{2,10}$/.test(code)) return showErr(new Error('รหัสโครงการใช้ A-Z และ 0-9 ยาว 2–10 ตัว'), 'merr');
      if (!name) return showErr(new Error('กรุณากรอกชื่อโครงการ'), 'merr');
      try {
        await api('adminSaveProject', { project_id: p.project_id || '', project_code: code, name, location: $('#pl', bg).value.trim(), manager_user_id: $('#pm', bg).value, status: ($('#ps .on', bg) || {}).dataset.s || 'ACTIVE' });
        close(); toast(isNew ? 'สร้างโครงการ ' + code + ' แล้ว' : 'บันทึกแล้ว'); await fetchBoot().catch(() => { }); render();
      } catch (e) { showErr(e, 'merr'); }
    };
  });
}

/* ---------- Push (Firebase Cloud Messaging) ---------- */
const FB_VER = '10.14.1';
const loadScript = src => new Promise((res, rej) => { if (document.querySelector(`script[src="${src}"]`)) return res(); const x = document.createElement('script'); x.src = src; x.onload = res; x.onerror = () => rej(new Error('โหลดระบบแจ้งเตือนไม่สำเร็จ ตรวจสอบอินเทอร์เน็ต')); document.head.appendChild(x); });
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
function pushSupport() {
  if (!CFG.FIREBASE || !CFG.FIREBASE_VAPID_KEY) return { ok: false, why: 'ยังไม่ได้ใส่ค่าตั้ง Firebase ในไฟล์ config.js (แจ้งแอดมิน)' };
  if (S.boot && !S.boot.settings.push_configured) return { ok: false, why: 'แอดมินยังไม่ได้ตั้งค่า Push ฝั่งระบบ (เมนู KTY 1994 ข้อ 4)' };
  if (isIOS() && !isStandalone()) return { ok: false, why: 'บน iPhone/iPad ต้องติดตั้งแอปลงหน้าจอโฮมก่อน (Safari → แชร์ → เพิ่มไปยังหน้าจอโฮม) แล้วเปิดจากไอคอน' };
  if (!('serviceWorker' in navigator) || !('Notification' in window) || !('PushManager' in window)) return { ok: false, why: 'เบราว์เซอร์นี้ไม่รองรับแจ้งเตือน Push (ยังได้รับแจ้งเตือนในแอปและอีเมล)' };
  if (location.protocol !== 'https:') return { ok: false, why: 'ต้องเปิดแอปผ่าน https (GitHub Pages)' };
  return { ok: true };
}
async function fbMessaging() {
  await loadScript(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-app-compat.js`);
  await loadScript(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-messaging-compat.js`);
  if (!firebase.apps.length) firebase.initializeApp(CFG.FIREBASE);
  const m = firebase.messaging();
  if (!S.fbFg) { S.fbFg = true; m.onMessage(p => { const n = p.notification || p.data || {}; const link = (p.data && p.data.link) || ''; const h = link.indexOf('#') >= 0 ? link.slice(link.indexOf('#') + 1) : ''; markStale(); notifyInApp((n.title || 'แจ้งเตือน') + (n.body ? ': ' + n.body : ''), h); }); }
  return m;
}
async function enablePush() {
  const sp = pushSupport(); if (!sp.ok) throw new Error(sp.why);
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('ยังไม่ได้อนุญาตการแจ้งเตือน เปิดได้ที่การตั้งค่าเบราว์เซอร์/มือถือ');
  busy(true);
  try {
    const m = await fbMessaging();
    const token = await m.getToken({ vapidKey: CFG.FIREBASE_VAPID_KEY, serviceWorkerRegistration: await navigator.serviceWorker.ready });
    if (!token) throw new Error('ขอโทเคนแจ้งเตือนไม่สำเร็จ');
    await api('pushRegister', { token, device: (isIOS() ? 'iOS' : /Android/.test(navigator.userAgent) ? 'Android' : 'Desktop') + ' ' + navigator.userAgent.slice(0, 60) });
    localStorage.setItem('kty_push', token);
  } finally { busy(false); }
}
async function disablePush() {
  const t = localStorage.getItem('kty_push');
  await api('pushUnregister', { token: t || '' });
  localStorage.removeItem('kty_push');
  try { const m = await fbMessaging(); await m.deleteToken(); } catch (e) { }
}

/* ---------- กล่องงานรอ (รวมทุกโมดูล) ---------- */
route('/inbox', async () => {
  const my = S.seq;
  $app.innerHTML = topbar('งานรอ', 'รวมทุกโมดูล', null) + `<main id="ib"><div class="empty">กำลังโหลด…</div></main>${bottomNav('inbox')}`;
  bindCommon();
  await cached('inbox', 'inbox', {}, r => {
    if (stale(my) || !$('#ib')) return;
    const sec = (title, sub, list, empty) => `<div class="line"><h2>${title}</h2><span class="muted small">${sub}</span></div>${list.length ? `<div class="fld" style="gap:10px">${list.map(docCard).join('')}</div>` : `<div class="empty" style="padding:14px">${empty}</div>`}`;
    const parts = [];
    if (isRole('APPROVER', 'ADMIN')) parts.push(sec('รออนุมัติ', r.to_approve.length + ' ใบ', r.to_approve, 'ไม่มีใบเบิกรออนุมัติ'));
    if (isRole('STORE', 'ADMIN')) parts.push(sec('รอจ่ายของ', r.to_issue.length + ' ใบ', r.to_issue, 'ไม่มีใบเบิกรอจ่าย'));
    if (r.applicants) parts.push(`<a class="card hl" href="#/admin/users" style="flex-direction:row;align-items:center;gap:12px"><span class="svc" style="all:unset"><span class="ic" style="width:44px;height:44px;border-radius:14px;background:var(--ok-bg);display:flex;align-items:center;justify-content:center;color:var(--gold)">${ico('users', 22)}</span></span><span class="grow"><b class="disp">ผู้สมัครรออนุมัติ ${r.applicants} คน</b><br><span class="small" style="color:var(--m2)">แตะเพื่อตรวจสอบและกำหนดสิทธิ์</span></span></a>`);
    if ((r.diff_review || []).length) parts.unshift(`<div class="line"><h2>ส่วนต่างรอตรวจ</h2><span class="muted small">${r.diff_review.length} รอบ</span></div><div class="fld" style="gap:10px">${r.diff_review.map(x => `<a class="card hl" href="#/doc/${encodeURIComponent(x.doc_no)}" style="gap:4px"><div class="line"><b class="disp">${esc(x.doc_no)}</b>${stChip('WARN', 'รอบที่ ' + x.round)}</div><div class="small" style="color:var(--m2)">ผู้เบิกนับของไม่ตรง · แตะเพื่อตัดสินคืนยอดหรือบันทึกสูญหาย</div></a>`).join('')}</div>`);
    if ((r.to_confirm || []).length) parts.unshift(`<div class="line"><h2>รอยืนยันรับของ</h2><span class="muted small">${r.to_confirm.length} รอบ</span></div><div class="fld" style="gap:10px">${r.to_confirm.map(x => `<a class="card hl" href="#/confirm/${encodeURIComponent(x.doc_no)}/${esc(x.delivery_id)}" style="gap:4px"><div class="line"><b class="disp">${esc(x.doc_no)}</b>${stChip('WARN', 'รอบที่ ' + x.round)}</div><div class="small" style="color:var(--m2)">แตะเพื่อนับของและยืนยันรับ · ${esc(x.work_category || '')}</div></a>`).join('')}</div>`);
    parts.push(sec('ใบเบิกของฉันที่ยังไม่ปิด', r.my_open.length + ' ใบ', r.my_open, 'ไม่มีใบค้าง'));
    $('#ib').innerHTML = parts.join('');
    S.boot.tasks.to_confirm = (r.to_confirm || []).length; S.boot.tasks.diff_review = (r.diff_review || []).length; S.boot.tasks.to_approve = r.to_approve.length; S.boot.tasks.to_issue = r.to_issue.length; S.boot.tasks.applicants = r.applicants; updateBadges(S.boot.tasks);
  });
});

/* ---------- จัดการวัสดุ + ถ่ายรูป (แอดมิน/สโตร์) ---------- */
route('/admin/materials', async () => {
  if (!isRole('ADMIN', 'STORE')) return go('/home');
  const my = S.seq, B = S.boot; let list = [], f = { q: '', cat: 'ALL' };
  $app.innerHTML = topbar('จัดการวัสดุ', 'เพิ่ม แก้ไข ถ่ายรูป', '/home') + `<main>
    <button class="btn" id="add">${ico('plus', 18)}เพิ่มวัสดุใหม่</button>
    <div class="row"><div class="inp grow"><input id="q" placeholder="ค้นหาชื่อหรือรหัส" autocomplete="off"></div>${viewToggle('mats', getView('mats', 'list'))}</div>
    <div class="tabs" id="mc">${[{ code: 'ALL', name: 'ทั้งหมด' }].concat(B.lists.category_names).map(x => `<button class="chip ${x.code === 'ALL' ? 'on' : ''}" data-c="${esc(x.code)}" style="white-space:nowrap">${esc(x.name.replace(/\s*\(.*\)/, ''))}</button>`).join('')}</div>
    <div id="ml" class="fld" style="gap:10px"><div class="empty">กำลังโหลด…</div></div></main>`;
  bindCommon();
  const draw = () => {
    if (stale(my) || !$('#ml')) return;
    const q = f.q.toLowerCase(), rows = list.filter(m => (f.cat === 'ALL' || m.category_code === f.cat) && (!q || m.name.toLowerCase().includes(q) || m.mat_id.toLowerCase().includes(q)));
    const mode = getView('mats', 'list');
    if (rows.length && mode === 'card') {
      $('#ml').innerHTML = `<div class="mgrid">${rows.map(m => `<button class="mcard" data-m="${esc(m.mat_id)}" style="text-align:left;color:inherit;font:inherit;${m.status !== 'ACTIVE' ? 'opacity:.55' : ''}"><div class="mimg">${matImg(m, 40)}${m.image_url ? '' : '<span class="sb" style="background:var(--warn-bg);color:var(--warn)">ไม่มีรูป</span>'}</div><div class="mname">${esc(m.name)}</div><div class="mspec">${esc(m.mat_id)} · ${esc(m.unit)}${money() ? ' · ' + (m.unit_price ? fmtB(m.unit_price) : 'ไม่มีราคา') : ''}</div></button>`).join('')}</div>`;
    } else if (rows.length && mode === 'table') {
      f.sort = f.sort || { k: 'code', dir: 1 };
      const rs = sortRows(rows, f.sort, { code: m => m.mat_id, name: m => m.name, price: m => m.unit_price || 0 });
      $('#ml').innerHTML = `<div class="card" style="padding:0;overflow-x:auto"><table class="mt"><thead><tr>${thSort('รหัส', 'code', f.sort)}${thSort('ชื่อ / สเปค', 'name', f.sort)}<th>หน่วย</th>${money() ? thSort('ราคา', 'price', f.sort, 'r') : ''}<th>รูป</th><th>สถานะ</th></tr></thead><tbody>${rs.map(m => `<tr data-m="${esc(m.mat_id)}" style="cursor:pointer;${m.status !== 'ACTIVE' ? 'opacity:.55' : ''}"><td class="c">${esc(m.mat_id)}</td><td><b>${esc(m.name)}</b><div class="small" style="color:var(--m2)">${esc(m.spec || '')}</div></td><td style="color:var(--mu)">${esc(m.unit)}</td>${money() ? `<td class="r">${m.unit_price ? fmtN(m.unit_price) : '<span style="color:var(--warn)">-</span>'}</td>` : ''}<td>${m.image_url ? '✓' : '<span style="color:var(--warn)">-</span>'}</td><td>${m.status === 'ACTIVE' ? 'ใช้งาน' : 'ปิด'}</td></tr>`).join('')}</tbody></table></div>`;
      bindSort($('#ml'), f.sort, draw);
    } else $('#ml').innerHTML = rows.length ? rows.map(m => `<button class="card" data-m="${esc(m.mat_id)}" style="flex-direction:row;align-items:center;gap:12px;${m.status !== 'ACTIVE' ? 'opacity:.55;' : ''}">
      <div class="thumb">${matImg(m, 26)}</div><div class="grow"><b style="font-size:14px">${esc(m.name)}</b><div class="small" style="color:var(--m2)">${esc(m.mat_id)} · ${esc(m.spec || '-')} · ${esc(m.unit)}</div>
      <div class="small" style="color:var(--m2)">${m.image_url ? 'มีรูป' : '<span style="color:var(--warn)">ยังไม่มีรูป</span>'}${money() ? ' · ' + (m.unit_price ? fmtB(m.unit_price) : '<span style="color:var(--warn)">ยังไม่มีราคา</span>') : ''}${m.status !== 'ACTIVE' ? ' · ปิดใช้งาน' : ''}</div></div>${ico('chev', 18)}</button>`).join('') : '<div class="empty">ไม่พบวัสดุ</div>';
    $$('#ml [data-m]').forEach(b => b.onclick = () => editMaterial(list.find(m => m.mat_id === b.dataset.m), () => { S.cache.mats = null; render(); }));
  };
  bindView('mats', $app, () => draw());
  $('#add').onclick = () => editMaterial(null, () => { S.cache.mats = null; render(); });
  $('#q').addEventListener('input', e => { f.q = e.target.value; draw(); });
  $$('#mc [data-c]').forEach(b => b.onclick = () => { f.cat = b.dataset.c; $$('#mc .chip').forEach(x => x.classList.toggle('on', x === b)); draw(); });
  await cached('mats', 'materialList', {}, r => { list = r.sort((a, b) => a.mat_id.localeCompare(b.mat_id)); draw(); });
});
function editMaterial(m, done) {
  const B = S.boot, isNew = !m; m = m || { category_code: (B.lists.categories[0] || ''), unit: B.lists.units[0], item_type: 'CONSUMABLE', status: 'ACTIVE', min_stock: 0 };
  let photo = '';
  const sel = (id, items, val, dis) => `<div class="inp"><select id="${id}" ${dis ? 'disabled' : ''}>${items.map(x => `<option value="${esc(x.v)}" ${String(x.v) === String(val) ? 'selected' : ''}>${esc(x.t)}</option>`).join('')}</select></div>`;
  modal(`<div class="line"><h2>${isNew ? 'เพิ่มวัสดุใหม่' : esc(m.mat_id)}</h2><button class="iconbtn" data-close aria-label="ปิด">${ico('x')}</button></div>
    <div class="mimg" id="pv" style="height:170px">${matImg(m, 56)}</div>
    <div class="g2"><label class="btn sm sec" style="cursor:pointer">${ico('cam', 18)}ถ่ายรูป<input type="file" accept="image/*" capture="environment" class="sr" id="cap"></label><label class="btn sm sec" style="cursor:pointer">${ico('inbox', 18)}เลือกรูป<input type="file" accept="image/*" class="sr" id="pick"></label></div>
    ${field('mn', 'ชื่อวัสดุ', { value: m.name || '', attrs: 'maxlength="100"' })}
    <div class="g2"><div class="fld"><label for="mcat">หมวด${isNew ? '' : ' (แก้ไม่ได้)'}</label>${sel('mcat', B.lists.category_names.map(x => ({ v: x.code, t: x.name })), m.category_code, !isNew)}</div><div class="fld"><label for="mu">หน่วย</label>${sel('mu', B.lists.units.map(x => ({ v: x, t: x })), m.unit)}</div></div>
    ${field('ms', 'สเปค / ขนาด (ไม่บังคับ)', { value: m.spec || '', attrs: 'maxlength="100"' })}
    <div class="g2">${money() ? field('mp', 'ราคาต่อหน่วย (บาท)', { type: 'number', value: m.unit_price || '', attrs: 'inputmode="decimal" min="0" step="any"' }) : '<div class="fld"><span class="lbl">ราคา</span><div class="small" style="color:var(--m2);padding-top:12px">แอดมินเป็นผู้ใส่ราคา</div></div>'}${field('mmin', 'จุดเตือนสต็อกต่ำ', { type: 'number', value: m.min_stock || 0, attrs: 'inputmode="decimal" min="0" step="any"' })}</div>
    <div class="fld"><span class="lbl">ประเภท</span><div class="seg" id="mt" style="grid-template-columns:1fr 1fr"><button type="button" data-v="CONSUMABLE" class="${m.item_type !== 'TOOL' ? 'on' : ''}">วัสดุสิ้นเปลือง</button><button type="button" data-v="TOOL" class="${m.item_type === 'TOOL' ? 'on' : ''}">เครื่องมือ (ยืม-คืน)</button></div></div>
    <div class="fld"><span class="lbl">สถานะ</span><div class="seg" id="mst" style="grid-template-columns:1fr 1fr"><button type="button" data-v="ACTIVE" class="${m.status === 'ACTIVE' ? 'on' : ''}">เปิดใช้งาน</button><button type="button" data-v="INACTIVE" class="${m.status !== 'ACTIVE' ? 'on' : ''}">ปิดใช้งาน</button></div></div>
    <div id="merr"></div><button class="btn" id="sv">${isNew ? 'บันทึกวัสดุ' : 'บันทึกการแก้ไข'}</button>`, (bg, close) => {
    ['mt', 'mst'].forEach(id => $$('#' + id + ' button', bg).forEach(b => b.onclick = () => $$('#' + id + ' button', bg).forEach(x => x.classList.toggle('on', x === b))));
    const onFile = async e => { const file = e.target.files[0]; if (!file) return; try { photo = await resizeImage(file, 640); $('#pv', bg).innerHTML = `<img src="${photo}" alt="ตัวอย่างรูป">`; } catch (er) { showErr(er, 'merr'); } };
    $('#cap', bg).onchange = onFile; $('#pick', bg).onchange = onFile;
    $('#sv', bg).onclick = async () => {
      const name = $('#mn', bg).value.trim(); if (!name) return showErr(new Error('กรุณากรอกชื่อวัสดุ'), 'merr');
      const data = { mat_id: isNew ? '' : m.mat_id, name, category_code: $('#mcat', bg).value, unit: $('#mu', bg).value, spec: $('#ms', bg).value.trim(),
        min_stock: $('#mmin', bg).value || 0, item_type: $('#mt .on', bg).dataset.v, status: $('#mst .on', bg).dataset.v };
      if (money() && $('#mp', bg) && $('#mp', bg).value !== '') data.unit_price = $('#mp', bg).value;
      try {
        const r = await api('materialSave', data);
        if (photo) await api('materialPhoto', { mat_id: r.material.mat_id, photo });
        close(); toast((isNew ? 'เพิ่ม ' : 'บันทึก ') + r.material.mat_id + ' แล้ว' + (photo ? ' พร้อมรูป' : ''));
        await fetchBoot().catch(() => { }); done();
      } catch (er) { showErr(er, 'merr'); }
    };
  });
}

/* ---------- ชุดสำเร็จรูป (แอดมิน/หัวหน้าโครงการ) ---------- */
route('/kits', () => {
  if (!isRole('ADMIN', 'APPROVER')) return go('/home');
  const B = S.boot;
  $app.innerHTML = topbar('ชุดสำเร็จรูป', 'ชุดเบิกที่ทีมกดใส่ตะกร้าได้ทันที', '/home') + `<main>
    <button class="btn" id="add">${ico('plus', 18)}สร้างชุดใหม่</button>
    ${B.kits.length ? B.kits.map(k => { const can = isRole('ADMIN') || k.created_by === S.user.user_id; return `<div class="card">
      <div class="line"><div><span class="small" style="color:var(--gold);letter-spacing:.06em">${esc(k.work_category || 'ชุดวัสดุ')}</span><div class="disp" style="font-weight:600;font-size:16px">${esc(k.name)}</div></div>${can ? `<button class="btn sm sec" data-k="${esc(k.kit_id)}">แก้ไข</button>` : ''}</div>
      <div class="small" style="color:var(--m2);line-height:1.6">${k.items.map(it => { const m = matOf(it.mat_id); return esc(m.name || it.mat_id) + ' ' + fmtN(it.qty) + ' ' + esc(m.unit || ''); }).join(' · ')}</div>
      <div class="small" style="color:var(--m2)">สร้างโดย ${esc(k.created_by_name || '-')}</div></div>`; }).join('') : '<div class="empty">ยังไม่มีชุดสำเร็จรูป</div>'}</main>`;
  bindCommon();
  $('#add').onclick = () => editKit(null);
  $$('[data-k]').forEach(b => b.onclick = () => editKit(B.kits.find(k => k.kit_id === b.dataset.k)));
});
function editKit(k) {
  const B = S.boot, isNew = !k; const K = k ? JSON.parse(JSON.stringify(k)) : { name: '', work_category: '', items: [] };
  modal(`<div class="line"><h2>${isNew ? 'สร้างชุดสำเร็จรูป' : 'แก้ไขชุด'}</h2><button class="iconbtn" data-close aria-label="ปิด">${ico('x')}</button></div>
    ${field('kn', 'ชื่อชุด', { value: K.name, attrs: 'maxlength="60"', ph: 'เช่น ชุดเทพื้น 1 ห้อง' })}
    <div class="fld"><label for="kw">หมวดงาน (ไม่บังคับ)</label><div class="inp"><select id="kw"><option value="">-</option>${B.lists.work_categories.map(w => `<option ${w === K.work_category ? 'selected' : ''}>${esc(w)}</option>`).join('')}</select></div></div>
    <div class="line"><span class="lbl">รายการในชุด</span><button class="btn sm dark" id="ka">${ico('plus', 16)}เพิ่มวัสดุ</button></div>
    <div id="ki" class="fld" style="gap:8px"></div>
    <div id="merr"></div><div class="row">${isNew ? '' : '<button class="btn danger" id="kdel">ลบชุด</button>'}<button class="btn full" id="ksv">บันทึกชุด</button></div>`, (bg, close) => {
    const drawI = () => { $('#ki', bg).innerHTML = K.items.length ? K.items.map((it, i) => { const m = matOf(it.mat_id); return `<div class="row" style="gap:10px"><div class="thumb" style="width:44px;height:44px">${matImg(m, 20)}</div><div class="grow"><b style="font-size:14px">${esc(m.name || it.mat_id)}</b><div class="small" style="color:var(--m2)">${esc(m.unit || '')}</div></div><div class="qty"><input type="number" inputmode="decimal" min="0" step="any" value="${it.qty}" data-i="${i}" aria-label="จำนวน" style="width:64px"></div><button class="iconbtn" data-d="${i}" aria-label="ลบ" style="width:34px;height:34px;color:var(--m2)">${ico('x', 16)}</button></div>`; }).join('') : '<div class="empty" style="padding:10px">ยังไม่มีรายการ</div>';
      $$('[data-i]', bg).forEach(x => x.onchange = () => { K.items[+x.dataset.i].qty = Math.max(0, +x.value || 0); });
      $$('[data-d]', bg).forEach(x => x.onclick = () => { K.items.splice(+x.dataset.d, 1); drawI(); }); };
    drawI();
    $('#ka', bg).onclick = () => matPicker(id => { const ex = K.items.find(x => x.mat_id === id); if (ex) ex.qty++; else K.items.push({ mat_id: id, qty: 1 }); drawI(); });
    const save = async status => {
      K.name = $('#kn', bg).value.trim(); K.work_category = $('#kw', bg).value;
      const items = K.items.filter(x => x.qty > 0);
      if (!K.name) return showErr(new Error('กรุณาตั้งชื่อชุด'), 'merr');
      if (!items.length) return showErr(new Error('กรุณาเพิ่มวัสดุอย่างน้อย 1 รายการ'), 'merr');
      try { await api('kitSave', { kit_id: K.kit_id || '', name: K.name, work_category: K.work_category, items, status }); close(); toast(status === 'INACTIVE' ? 'ลบชุดแล้ว' : 'บันทึกชุดแล้ว'); await fetchBoot().catch(() => { }); render(); }
      catch (e) { showErr(e, 'merr'); }
    };
    $('#ksv', bg).onclick = () => save('ACTIVE');
    if ($('#kdel', bg)) $('#kdel', bg).onclick = () => save('INACTIVE');
  });
}

/* ---------- โปรไฟล์ ---------- */
route('/profile', () => {
  const u = S.user;
  $app.innerHTML = topbar('โปรไฟล์ของฉัน', '', null) + `<main>
    <div class="row" style="gap:14px">${avatar(u, 72)}<div><div class="disp" style="font-weight:700;font-size:20px">${esc((u.title || '') + u.name)}</div><div class="muted">${esc(u.position || '')} · ${esc(ROLE_TH[u.role] || u.role)}</div></div></div>
    <div class="card"><div class="kv" style="border:none"><span>Username</span><span>${esc(u.username)}</span></div><div class="kv"><span>อีเมล</span><span style="word-break:break-all">${esc(u.email)}</span></div><div class="kv"><span>มือถือ</span><span>${esc(fmtPhone(u.phone))}</span></div><div class="kv"><span>โครงการ</span><span>${esc(u.project_ids === 'ALL' ? 'ทุกโครงการ' : S.boot.projects.map(p => p.project_code).join(', '))}</span></div></div>
    <h2>ธีมแอป</h2>
    <div class="seg" id="thm" style="grid-template-columns:1fr 1fr"><button type="button" data-t="B" class="${THEME() === 'B' ? 'on' : ''}">Emerald Noir · มืด</button><button type="button" data-t="A" class="${THEME() === 'A' ? 'on' : ''}">Ivory Emerald · สว่าง</button></div>
    <div class="muted small" style="margin-top:-6px">ธีมสว่างอ่านง่ายกว่าเมื่อใช้งานกลางแดด</div>
    <h2>การแจ้งเตือน</h2>
    <div class="card" style="gap:10px">
      <div class="line"><div><div style="font-weight:600">แจ้งเตือนในแอป</div><div class="small" style="color:var(--m2)">เช็กงานใหม่อัตโนมัติขณะเปิดแอป มีเสียงและสั่น</div></div><label class="row" style="gap:6px"><input type="checkbox" id="snd" ${localStorage.getItem('kty_sound') === 'off' ? '' : 'checked'} style="width:22px;height:22px;accent-color:var(--ac)">เสียง</label></div>
      <div class="kv" style="flex-direction:column;align-items:stretch;gap:8px"><div class="line"><div><div style="font-weight:600;color:var(--tx)">แจ้งเตือน Push</div><div class="small" id="pst">${localStorage.getItem('kty_push') ? 'เปิดอยู่ในเครื่องนี้' : 'ยังไม่ได้เปิดในเครื่องนี้'}</div></div>${localStorage.getItem('kty_push') ? '<button class="btn sm sec" id="poff">ปิด</button>' : '<button class="btn sm" id="pon">เปิด</button>'}</div>
        <div class="small" id="pwhy" style="color:var(--m2)">${pushSupport().ok ? 'เด้งเตือนแม้ปิดแอปอยู่ เช่น มีใบเบิกใหม่ อนุมัติแล้ว จ่ายของแล้ว' : esc(pushSupport().why)}</div>
        ${localStorage.getItem('kty_push') ? '<button class="btn sm sec" id="ptest">ส่งแจ้งเตือนทดสอบ</button>' : ''}</div>
    </div>
    <h2>เปลี่ยนรหัสผ่าน</h2>
    ${field('op', 'รหัสผ่านเดิม', { type: 'password', attrs: 'autocomplete="current-password"' })}
    ${field('np', 'รหัสผ่านใหม่', { type: 'password', attrs: 'autocomplete="new-password" maxlength="64"', right: eyeBtn('np'), hint: '8 ตัวขึ้นไป มีตัวอักษรและตัวเลข' })}
    ${field('np2', 'ยืนยันรหัสผ่านใหม่', { type: 'password', attrs: 'autocomplete="new-password" maxlength="64"' })}
    <div id="err"></div><button class="btn" id="cp">เปลี่ยนรหัสผ่าน</button>
    <button class="btn danger" id="lo">${ico('logout', 18)}ออกจากระบบ</button>
    <div class="muted small" style="text-align:center">${esc(CFG.APP_NAME || '')} · KTY App v2.1</div>
  </main>${bottomNav('me')}`;
  bindCommon();
  $('#lo').onclick = async () => { if (localStorage.getItem('kty_push')) { try { await disablePush(); } catch (e) { } } logout(); };
  $$('#thm button').forEach(b => b.onclick = () => { localStorage.setItem('kty_theme', b.dataset.t); applyTheme(); $$('#thm button').forEach(x => x.classList.toggle('on', x === b)); });
  $('#snd').onchange = e => localStorage.setItem('kty_sound', e.target.checked ? 'on' : 'off');
  if ($('#pon')) $('#pon').onclick = async () => { try { await enablePush(); toast('เปิดแจ้งเตือน Push แล้ว'); render(); } catch (e) { $('#pwhy').innerHTML = `<span style="color:var(--bad)">${esc(e.message)}</span>`; } };
  if ($('#poff')) $('#poff').onclick = async () => { try { await disablePush(); toast('ปิดแจ้งเตือน Push แล้ว'); render(); } catch (e) { toast(e.message, true); } };
  if ($('#ptest')) $('#ptest').onclick = async () => { try { const r = await api('pushTest'); toast(r.sent ? 'ส่งแล้ว รอสักครู่ (ถ้าเปิดแอปอยู่จะขึ้นในแอป)' : 'ไม่พบอุปกรณ์ที่เปิดรับ ลองปิดแล้วเปิดใหม่', !r.sent); } catch (e) { toast(e.message, true); } };
  $('#cp').onclick = async () => {
    const o = $('#op').value, p = $('#np').value, p2 = $('#np2').value, r = V.pwRules(p, u.username);
    if (!o) return showErr(new Error('กรุณากรอกรหัสผ่านเดิม'), 'err');
    if (!r.len || !r.mix || !r.nouser || !r.nospace) return showErr(new Error('รหัสผ่านใหม่ต้องยาว 8 ตัวขึ้นไป มีตัวอักษรและตัวเลข และไม่มี Username'), 'err');
    if (p !== p2) return showErr(new Error('ยืนยันรหัสผ่านไม่ตรงกัน'), 'err');
    try { const t = await api('changePassword', { old_password: o, new_password: p }); const remember = !!localStorage.getItem('kty_s'); saveSession(t.token, u, remember); toast('เปลี่ยนรหัสผ่านแล้ว เครื่องอื่นจะถูกออกจากระบบ'); render(); }
    catch (e) { showErr(e, 'err'); }
  };
});

/* ---------- เริ่มแอป ---------- */
loadSession();
render();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
