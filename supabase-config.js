const SUPABASE_URL = 'https://jspvbmkdycfeesxtmtgw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzcHZibWtkeWNmZWVzeHRtdGd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3MzA4MjksImV4cCI6MjEwMjMwNjgyOX0.6_191HV_Iz-ItsWEbcwmazGPP6O6Ijdkss2QntRwZxI';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// แปลงค่า timestamp ให้เป็น Date ตามเวลาท้องถิ่นอย่างถูกต้อง
// ค่าที่ไม่มี timezone/offset (เช่น "2026-10-08T21:05:00") แอปบันทึกด้วย toISOString() เป็น UTC
// จึงเติม Z แล้วแปลงเป็นเวลาท้องถิ่น (ไทย +7) เพื่อไม่ให้วัน/เวลาเพี้ยน
function parseDT(iso) {
  if (!iso) return null;
  if (iso instanceof Date) return iso;
  const s = String(iso).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/);
  if (m) {
    const d = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] || '00'}Z`);
    return isNaN(d) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

function fmtDT(iso) {
  if (!iso) return '-';
  const d = parseDT(iso);
  if (!d) return iso;
  return `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function nowISO() {
  return new Date().toISOString();
}

function dueISO() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString();
}

// แปลงจำนวนที่พิมพ์อิสระ เช่น "2+1" → 3 (คืนค่า fallback ถ้าพิมพ์อะไรที่อ่านไม่ได้)
function parseQty(v, fallback) {
  const parts = String(v == null ? '' : v).split('+')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !isNaN(n) && n > 0);
  if (parts.length) return parts.reduce((a, b) => a + b, 0);
  const n = parseInt(v, 10);
  return (!isNaN(n) && n > 0) ? n : (fallback || 1);
}

function currentAdmin() {
  try { return JSON.parse(localStorage.getItem('adminUser') || 'null'); } catch (e) { return null; }
}

// ===== ระบบเดิมก่อนเชื่อม database (localStorage) =====
function localBorrows() { return JSON.parse(localStorage.getItem('borrows') || '[]'); }
function saveLocalBorrows(a) { localStorage.setItem('borrows', JSON.stringify(a)); }
function localInventory() { return JSON.parse(localStorage.getItem('inventory') || '[]'); }
function saveLocalInventory(a) { localStorage.setItem('inventory', JSON.stringify(a)); }
function localUsers() { return JSON.parse(localStorage.getItem('users') || '[]'); }
function saveLocalUsers(a) { localStorage.setItem('users', JSON.stringify(a)); }

// แปลงข้อมูลผู้ยืมให้เป็นรูปแบบเดียวกันไม่ว่าจะมาจาก DB หรือ localStorage
function toStudentRows(rows) {
  return (rows || []).map(u => ({
    student_id: u.student_id !== undefined ? u.student_id : u.studentId,
    citizen_id: u.citizen_id !== undefined ? u.citizen_id : u.citizenId,
    name: u.name,
    phone: u.phone,
    status: u.status || 'ปกติ'
  }));
}

// แปลงข้อมูลอุปกรณ์ให้เป็นรูปแบบเดียวกัน
function toItemRows(rows) {
  return (rows || []).map(i => i.item_id !== undefined ? i : {
    item_id: i.id,
    itemname: i.name,
    availablequantity: i.qty,
    totalquantity: i.qty,
    status: i.qty > 0 ? 'พร้อมใช้งาน' : 'ของหมด'
  });
}

// ข้อมูลผู้ยืม = localStorage + คนที่เคยยืมในตาราง borrow + ตาราง student ใน database
async function fetchStudents() {
  const map = new Map();

  // 1) คนที่เคยยืมในตาราง borrow
  try {
    const { data, error } = await sb.from('borrow').select('student_id, national_id, borrowname');
    if (!error && Array.isArray(data)) {
      const seen = new Set();
      for (const b of data) {
        if (!b.student_id || seen.has(b.student_id)) continue;
        seen.add(b.student_id);
        map.set(String(b.student_id), { student_id: b.student_id, citizen_id: b.national_id || '', name: b.borrowname, phone: '', status: 'ปกติ' });
      }
    }
  } catch (e) { }

  // 2) โปรไฟล์ที่สมัครไว้ใน localStorage (ระบบเดิม/สำรอง)
  for (const s of toStudentRows(localUsers())) {
    if (!s.student_id) continue;
    map.set(String(s.student_id), { ...(map.get(String(s.student_id)) || {}), ...s });
  }

  // 3) ตาราง student ใน database (ข้อมูลล่าสุด ให้ทับรายการเดิม)
  try {
    const { data, error } = await sb.from('student').select('*');
    if (!error && Array.isArray(data)) {
      for (const s of data) {
        if (!s.student_id) continue;
        map.set(String(s.student_id), {
          student_id: s.student_id,
          citizen_id: s.citizen_id || '',
          name: s.name,
          phone: s.phone || '',
          status: s.status || 'ปกติ'
        });
      }
    }
  } catch (e) { }

  return Array.from(map.values());
}

// อ่านตารางจาก Supabase ถ้าไม่มีข้อมูล/อ่านไม่ได้ ให้ใช้ข้อมูล localStorage เดิม
async function fetchRows(table, localKey) {
  try {
    const { data, error } = await sb.from(table).select('*');
    if (!error && Array.isArray(data) && data.length > 0) {
      return { rows: data, remote: true };
    }
    const local = JSON.parse(localStorage.getItem(localKey) || '[]');
    if (local.length > 0) return { rows: local, remote: false };
    return { rows: Array.isArray(data) ? data : [], remote: !error };
  } catch (e) {
    const local = JSON.parse(localStorage.getItem(localKey) || '[]');
    return { rows: local, remote: false };
  }
}

// ข้อมูลการยืม-คืนทั้งชุด (DB หรือระบบเดิม)
async function getBorrowBundle() {
  try {
    const [rb, rbi, rit, rret] = await Promise.all([
      sb.from('borrow').select('*'),
      sb.from('borrowitem').select('*'),
      sb.from('item').select('*'),
      sb.from('return').select('*')
    ]);
    const borrowOk = !rb.error && Array.isArray(rb.data);
    if (borrowOk && !((rb.data || []).length === 0 && localBorrows().length > 0)) {
      return {
        remote: true,
        borrows: (rb.data || []).map(b => ({ ...b, citizen_id: b.national_id || b.citizen_id || '' })),
        borrowitems: rbi.data || [],
        items: rit.error ? [] : (rit.data || []),
        returns: rret.error ? [] : (rret.data || [])
      };
    }
  } catch (e) { }

  const lb = localBorrows(), li = localInventory();
  return {
    remote: false,
    borrows: lb.map(x => ({
      borrow_id: x.id,
      borrowdatetime: x.borrowTime,
      student_id: x.studentId,
      borrowname: x.name,
      status: x.status,
      citizen_id: x.citizenId || ''
    })),
    borrowitems: lb.map(x => ({
      borrowitem_id: x.id,
      borrow_id: x.id,
      quantity: parseQty(x.qty, 1),
      status: x.status,
      item_id: null,
      itemname: x.item
    })),
    items: toItemRows(li),
    returns: []
  };
}
