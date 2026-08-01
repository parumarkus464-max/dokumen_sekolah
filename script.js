// ============ FIREBASE SETUP ============
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ⚠️ GANTI DENGAN KONFIGURASI FIREBASE ANDA SENDIRI
const firebaseConfig = {
  apiKey: "GANTI_DENGAN_API_KEY_ANDA",
  authDomain: "PROJECT_ID_ANDA.firebaseapp.com",
  projectId: "PROJECT_ID_ANDA",
  storageBucket: "PROJECT_ID_ANDA.appspot.com",
  messagingSenderId: "SENDER_ID_ANDA",
  appId: "APP_ID_ANDA"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ============ DATA SEKOLAH (TETAP SAMA) ============
const RAW_DATA = `KB ARARA	70027792	KB	Ende
// ... (SALIN SEMUA DATA RAW_DATA DARI KODE LAMA ANDA KE SINI) ...
TKS WOLOOJA	50305517	TK	Wolowaru`;

const schools = RAW_DATA.split('\n').filter(l => l.trim()).map((line, idx) => {
  const parts = line.split('\t');
  return {
    id: idx + 1,
    nama: (parts[0] || '').trim(),
    npsn: (parts[1] || '').trim(),
    bentuk: (parts[2] || '').trim(),
    kecamatan: (parts[3] || '').trim()
  };
});

// ============ DAFTAR JUDUL OTOMATIS ============
const PREDEFINED_TITLES = {
  foto: ["Upacara Bendera", "Kegiatan Belajar Mengajar", "Perpustakaan Sekolah", "Laboratorium Komputer", "Kantin Sekolah", "Lapangan Olahraga", "Musholla / Ruang Ibadah", "Ruang Guru", "Ruang Kepala Sekolah", "Ruang UKS", "Ekstrakurikuler", "Kunjungan Edukatif", "Peringatan Hari Besar", "Lomba Antar Kelas", "Wisuda / Pelepasan Siswa", "Rapat Dewan Guru", "Kegiatan Pramuka", "Gotong Royong Sekolah", "Fasilitas Sekolah", "Prestasi Siswa", "Lainnya (Ketik Manual)"],
  video: ["Video Profil Sekolah", "Video Kegiatan Upacara", "Video Pembelajaran di Kelas", "Video Kegiatan Ekstrakurikuler", "Video Peringatan Hari Besar", "Video Lomba / Kompetisi", "Video Kunjungan Edukatif", "Video Tutorial / Edukasi", "Video Dokumentasi Kegiatan", "Video Wawancara / Testimoni", "Video Pengumuman Sekolah", "Lainnya (Ketik Manual)"],
  dokumen: ["Kurikulum Sekolah", "Data Siswa", "Data Guru dan Tenaga Kependidikan", "Laporan Keuangan", "Rencana Kerja Sekolah (RKS)", "Program Kerja Tahunan", "Laporan Evaluasi", "Surat Keputusan (SK)", "Notulen Rapat", "Dokumen Akreditasi", "Dokumen BOS", "Panduan / Pedoman", "Formulir Pendaftaran", "Kalender Pendidikan", "Struktur Organisasi", "Lainnya (Ketik Manual)"]
};

// ============ FIREBASE DATABASE FUNCTIONS (PENGGANTI LOCALSTORAGE) ============
const AUTH_KEY = 'sisfo_auth';

window.getPasswords = async function() {
  const docRef = doc(db, "sisfo_data", "passwords");
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : {};
};

window.savePasswords = async function(p) {
  const docRef = doc(db, "sisfo_data", "passwords");
  await setDoc(docRef, p);
};

window.getSchoolPassword = async function(npsn) {
  const p = await window.getPasswords();
  return p[npsn] || 'sekolah123';
};

window.setSchoolPassword = async function(npsn, pass) {
  const p = await window.getPasswords();
  p[npsn] = pass;
  await window.savePasswords(p);
};

window.getMedia = async function() {
  const docRef = doc(db, "sisfo_data", "media_global");
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : {};
};

window.saveMedia = async function(mediaData) {
  const docRef = doc(db, "sisfo_data", "media_global");
  await setDoc(docRef, mediaData);
};

let currentUser = null;

// ============ LOGIN / LOGOUT ============
window.handleLogin = async function(e) {
  e.preventDefault();
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginError');
  
  if (user.toLowerCase() === 'admin') {
    const p = await window.getPasswords();
    const adminPass = p['_admin'] || 'admin2026';
    if (pass === adminPass) {
      currentUser = { type: 'admin' };
      localStorage.setItem(AUTH_KEY, JSON.stringify(currentUser));
      await window.showApp();
      return;
    }
  }
  
  const school = schools.find(s => s.npsn === user);
  if (school) {
    const correctPass = await window.getSchoolPassword(school.npsn);
    if (pass === correctPass) {
      currentUser = { type: 'sekolah', schoolId: school.id, school };
      localStorage.setItem(AUTH_KEY, JSON.stringify(currentUser));
      await window.showApp();
      return;
    }
  }
  
  errEl.classList.add('show');
  setTimeout(() => errEl.classList.remove('show'), 3000);
};

window.handleLogout = function() {
  if (!confirm('Yakin ingin logout?')) return;
  currentUser = null;
  localStorage.removeItem(AUTH_KEY);
  document.getElementById('mainApp').classList.remove('active');
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
};

window.showApp = async function() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('mainApp').classList.add('active');
  
  if (currentUser.type === 'admin') {
    document.getElementById('userRole').textContent = 'ADMIN DINAS';
    document.getElementById('userName').textContent = 'Administrator';
    document.getElementById('adminSchoolList').style.display = 'block';
    document.getElementById('sekolahMediaSection').style.display = 'none';
  } else {
    document.getElementById('userRole').textContent = 'SEKOLAH';
    document.getElementById('userName').textContent = currentUser.school.nama;
    document.getElementById('adminSchoolList').style.display = 'none';
    document.getElementById('sekolahMediaSection').style.display = 'block';
  }
  
  await window.renderDashboard();
  if (currentUser.type === 'admin') await window.renderSchoolTable();
  else await window.renderMyMedia();
};

// ============ DASHBOARD ============
window.renderDashboard = async function() {
  const grid = document.getElementById('dashboardGrid');
  const media = await window.getMedia();
  
  if (currentUser.type === 'admin') {
    const totalSchools = schools.length;
    const schoolsWithMedia = Object.keys(media).filter(id => {
      const m = media[id];
      return (m.foto?.length || 0) + (m.video?.length || 0) + (m.dokumen?.length || 0) > 0;
    }).length;
    const totalMedia = Object.values(media).reduce((sum, m) => 
      sum + (m.foto?.length || 0) + (m.video?.length || 0) + (m.dokumen?.length || 0), 0);
    const totalFoto = Object.values(media).reduce((sum, m) => sum + (m.foto?.length || 0), 0);
    
    grid.innerHTML = `
      <div class="dash-card"><div class="dash-label">🏫 Total Sekolah</div><div class="dash-value">${totalSchools}</div><div class="dash-sub">Seluruh satuan pendidikan</div></div>
      <div class="dash-card accent"><div class="dash-label">📁 Sekolah dengan Media</div><div class="dash-value">${schoolsWithMedia}</div><div class="dash-sub">${((schoolsWithMedia/totalSchools)*100).toFixed(1)}% dari total</div></div>
      <div class="dash-card success"><div class="dash-label">📊 Total Media</div><div class="dash-value">${totalMedia}</div><div class="dash-sub">Foto, video, dan dokumen</div></div>
      <div class="dash-card warning"><div class="dash-label">📸 Total Foto</div><div class="dash-value">${totalFoto}</div><div class="dash-sub">Dari seluruh sekolah</div></div>
    `;
  } else {
    const m = media[currentUser.schoolId] || { foto: [], video: [], dokumen: [] };
    const total = (m.foto?.length || 0) + (m.video?.length || 0) + (m.dokumen?.length || 0);
    grid.innerHTML = `
      <div class="dash-card"><div class="dash-label">📸 Foto</div><div class="dash-value">${m.foto?.length || 0}</div></div>
      <div class="dash-card accent"><div class="dash-label">🎬 Video</div><div class="dash-value">${m.video?.length || 0}</div></div>
      <div class="dash-card success"><div class="dash-label">📄 Dokumen</div><div class="dash-value">${m.dokumen?.length || 0}</div></div>
      <div class="dash-card warning"><div class="dash-label">📊 Total Media</div><div class="dash-value">${total}</div></div>
    `;
  }
};

// ============ ADMIN: SCHOOL TABLE ============
let filteredSchools = [...schools];
let currentPage = 1;
const perPage = 25;

window.renderSchoolTable = async function() {
  const q = document.getElementById('searchSchool').value.toLowerCase();
  const bentuk = document.getElementById('filterBentuk').value;
  const kec = document.getElementById('filterKec').value;
  
  filteredSchools = schools.filter(s => {
    const matchQ = !q || s.nama.toLowerCase().includes(q) || s.npsn.includes(q) || s.kecamatan.toLowerCase().includes(q);
    const matchB = !bentuk || s.bentuk === bentuk;
    const matchK = !kec || s.kecamatan === kec;
    return matchQ && matchB && matchK;
  });
  
  const tbody = document.getElementById('schoolTableBody');
  const totalPages = Math.ceil(filteredSchools.length / perPage) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * perPage;
  const pageData = filteredSchools.slice(start, start + perPage);
  const media = await window.getMedia();
  
  if (!pageData.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty">Tidak ada data</td></tr>';
  } else {
    tbody.innerHTML = pageData.map(s => {
      const m = media[s.id] || { foto: [], video: [], dokumen: [] };
      const count = (m.foto?.length || 0) + (m.video?.length || 0) + (m.dokumen?.length || 0);
      return `
        <tr onclick="window.viewSchoolMedia(${s.id})">
          <td><strong>${escapeHtml(s.nama)}</strong></td>
          <td><code>${s.npsn}</code></td>
          <td><span class="badge badge-${s.bentuk}">${s.bentuk}</span></td>
          <td>${escapeHtml(s.kecamatan)}</td>
          <td>${count > 0 ? `<span class="badge badge-SD">${count} media</span>` : '<span style="color:var(--muted); font-size:0.8rem;">Belum ada</span>'}</td>
        </tr>
      `;
    }).join('');
  }
  
  const pag = document.getElementById('pagination');
  if (totalPages <= 1) { pag.innerHTML = ''; }
  else {
    let html = `<button class="page-btn" onclick="window.goPage(${currentPage-1})" ${currentPage===1?'disabled':''}>‹</button>`;
    for (let i = Math.max(1, currentPage-2); i <= Math.min(totalPages, currentPage+2); i++) {
      html += `<button class="page-btn ${i===currentPage?'active':''}" onclick="window.goPage(${i})">${i}</button>`;
    }
    html += `<button class="page-btn" onclick="window.goPage(${currentPage+1})" ${currentPage===totalPages?'disabled':''}>›</button>`;
    pag.innerHTML = html;
  }
};

window.goPage = function(p) {
  const totalPages = Math.ceil(filteredSchools.length / perPage);
  if (p < 1 || p > totalPages) return;
  currentPage = p;
  window.renderSchoolTable();
};

window.viewSchoolMedia = async function(schoolId) {
  const school = schools.find(s => s.id === schoolId);
  if (!school) return;

  document.getElementById('adminSchoolList').style.display = 'none';
  document.getElementById('sekolahMediaSection').style.display = 'block';

  const origUser = currentUser;
  currentUser = { type: 'sekolah', schoolId, school };
  
  await window.renderMyMedia();
  window.showSection('dashboard');

  const section = document.getElementById('sekolahMediaSection');
  if (!document.getElementById('backBtn')) {
    const btn = document.createElement('button');
    btn.id = 'backBtn';
    btn.className = 'btn btn-outline btn-sm';
    btn.style.marginBottom = '1rem';
    btn.textContent = '← Kembali ke Daftar Sekolah';
    btn.onclick = async () => {
      currentUser = origUser;
      document.getElementById('adminSchoolList').style.display = 'block';
      document.getElementById('sekolahMediaSection').style.display = 'none';
      btn.remove();
      await window.renderDashboard();
      await window.renderSchoolTable(); 
    };
    section.insertBefore(btn, section.firstChild);
  }
};

// ============ SEKOLAH: MY MEDIA ============
let currentMediaTab = 'foto';
let currentFormType = null;

window.renderMyMedia = async function() {
  if (!currentUser || currentUser.type !== 'sekolah') return;
  const allMedia = await window.getMedia();
  const m = allMedia[currentUser.schoolId] || { foto: [], video: [], dokumen: [] };
  
  document.getElementById('countFoto').textContent = m.foto?.length || 0;
  document.getElementById('countVideo').textContent = m.video?.length || 0;
  document.getElementById('countDokumen').textContent = m.dokumen?.length || 0;
  
  window.renderFoto(m.foto || []);
  window.renderVideo(m.video || []);
  window.renderDokumen(m.dokumen || []);
};

window.switchMediaTab = function(tab, btn) {
  currentMediaTab = tab;
  document.querySelectorAll('#sekolahMediaSection .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('#sekolahMediaSection .section').forEach(s => s.classList.remove('active'));
  document.getElementById('media-' + tab).classList.add('active');
};

window.renderFoto = function(items) {
  const grid = document.getElementById('gridFoto');
  if (!items.length) {
    grid.innerHTML = '<div class="empty" style="grid-column:1/-1;"><div class="empty-icon">📷</div>Belum ada foto</div>';
    return;
  }
  grid.innerHTML = items.map(i => `
    <div class="media-card">
      <div class="media-thumb" onclick="window.previewMedia('foto',${i.id})">
        <img src="${i.url}" alt="${escapeHtml(i.title)}" onerror="this.src='https://via.placeholder.com/400x250?text=Foto'">
      </div>
      <div class="media-body">
        <div class="media-title">${escapeHtml(i.title)}</div>
        <div class="media-desc">${escapeHtml(i.desc || '')}</div>
      </div>
      <div class="media-actions">
        <button class="btn btn-sm btn-outline" onclick="window.previewMedia('foto',${i.id})">Lihat</button>
        <button class="btn btn-sm btn-danger" onclick="window.hapusMedia('foto',${i.id})">Hapus</button>
      </div>
    </div>
  `).join('');
};

window.renderVideo = function(items) {
  const grid = document.getElementById('gridVideo');
  if (!items.length) {
    grid.innerHTML = '<div class="empty" style="grid-column:1/-1;"><div class="empty-icon">🎬</div>Belum ada video</div>';
    return;
  }
  grid.innerHTML = items.map(i => {
    const ytId = extractYoutubeId(i.url);
    const embedUrl = ytId ? `https://www.youtube.com/embed/${ytId}` : i.url;
    return `
      <div class="media-card">
        <div class="media-thumb">
          <div class="video-wrap"><iframe src="${embedUrl}" allowfullscreen></iframe></div>
        </div>
        <div class="media-body">
          <div class="media-title">${escapeHtml(i.title)}</div>
          <div class="media-desc">${escapeHtml(i.desc || '')}</div>
        </div>
        <div class="media-actions">
          <button class="btn btn-sm btn-outline" onclick="window.previewMedia('video',${i.id})">Perbesar</button>
          <button class="btn btn-sm btn-danger" onclick="window.hapusMedia('video',${i.id})">Hapus</button>
        </div>
      </div>
    `;
  }).join('');
};

window.renderDokumen = function(items) {
  const grid = document.getElementById('gridDokumen');
  if (!items.length) {
    grid.innerHTML = '<div class="empty" style="grid-column:1/-1;"><div class="empty-icon">📄</div>Belum ada dokumen</div>';
    return;
  }
  grid.innerHTML = items.map(i => `
    <div class="media-card">
      <div class="media-thumb"><div class="doc-icon">📄</div></div>
      <div class="media-body">
        <div class="media-title">${escapeHtml(i.title)}</div>
        <div class="media-desc">${escapeHtml(i.desc || '')}</div>
      </div>
      <div class="media-actions">
        <button class="btn btn-sm btn-outline" onclick="window.previewMedia('dokumen',${i.id})">Buka</button>
        <a href="${i.url}" target="_blank" class="btn btn-sm" style="text-decoration:none;">↗</a>
        <button class="btn btn-sm btn-danger" onclick="window.hapusMedia('dokumen',${i.id})">Hapus</button>
      </div>
    </div>
  `).join('');
};

// ============ HANDLE TITLE SELECT ============
window.handleTitleSelect = function() {
  const select = document.getElementById('fTitleSelect');
  const customGroup = document.getElementById('fTitleCustomGroup');
  const customInput = document.getElementById('fTitleCustom');
  
  if (select.value === 'Lainnya (Ketik Manual)') {
    customGroup.style.display = 'block';
    customInput.required = true;
  } else {
    customGroup.style.display = 'none';
    customInput.required = false;
    customInput.value = '';
  }
};

// ============ MEDIA FORM ============
window.openMediaForm = function(type) {
  currentFormType = type;
  const titles = { foto: 'Tambah Foto', video: 'Tambah Video', dokumen: 'Tambah Dokumen' };
  document.getElementById('formTitle').textContent = titles[type];
  
  document.getElementById('fDesc').value = '';
  document.getElementById('fUrl').value = '';
  document.getElementById('fFile').value = '';
  document.getElementById('fTitleCustom').value = '';
  document.getElementById('fTitleCustomGroup').style.display = 'none';
  
  const select = document.getElementById('fTitleSelect');
  select.innerHTML = '<option value="">-- Pilih Judul --</option>';
  PREDEFINED_TITLES[type].forEach(title => {
    const option = document.createElement('option');
    option.value = title;
    option.textContent = title;
    select.appendChild(option);
  });
  
  document.getElementById('fFileGroup').style.display = type === 'foto' ? 'block' : 'none';
  const hints = {
    foto: 'Disarankan gunakan URL gambar (misal dari Google Drive/Imgur) untuk menghemat kuota database.',
    video: 'URL YouTube (contoh: https://www.youtube.com/watch?v=...)',
    dokumen: 'URL embed Google Drive'
  };
  document.getElementById('fUrlHint').textContent = hints[type];
  document.getElementById('fUrlLabel').textContent = type === 'foto' ? 'URL Gambar (atau Upload)' : (type === 'video' ? 'URL YouTube' : 'URL Dokumen');
  
  document.getElementById('formModal').classList.add('active');
};

window.closeForm = function() {
  document.getElementById('formModal').classList.remove('active');
};

window.submitMedia = async function(e) {
  e.preventDefault();
  
  const titleSelect = document.getElementById('fTitleSelect').value;
  const titleCustom = document.getElementById('fTitleCustom').value;
  const title = titleSelect === 'Lainnya (Ketik Manual)' ? titleCustom : titleSelect;
  
  const desc = document.getElementById('fDesc').value;
  const fileInput = document.getElementById('fFile');
  let url = document.getElementById('fUrl').value;
  
  const finish = async (finalUrl) => {
    const media = await window.getMedia();
    if (!media[currentUser.schoolId]) media[currentUser.schoolId] = { foto: [], video: [], dokumen: [] };
    media[currentUser.schoolId][currentFormType].push({
      id: Date.now(),
      title, desc,
      url: finalUrl
    });
    await window.saveMedia(media);
    await window.renderMyMedia();
    await window.renderDashboard();
    window.closeForm();
  };
  
  if (currentFormType === 'foto' && fileInput.files[0] && !url) {
    const file = fileInput.files[0];
    // ⚠️ PERINGATAN: Firestore memiliki batas 1MB per dokumen. 
    // Kami batasi upload file lokal maksimal ~300KB agar aman.
    if (file.size > 300000) {
      alert('Ukuran file terlalu besar (Maks 300KB). Silakan kompres foto atau gunakan URL gambar dari internet/Google Drive.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      await finish(ev.target.result);
    };
    reader.readAsDataURL(file);
  } else if (currentFormType === 'video') {
    const ytId = extractYoutubeId(url);
    finish(ytId ? `https://www.youtube.com/embed/${ytId}` : url);
  } else {
    finish(url);
  }
};

window.hapusMedia = async function(type, id) {
  if (!confirm('Hapus item ini?')) return;
  const media = await window.getMedia();
  if (!media[currentUser.schoolId]) return;
  media[currentUser.schoolId][type] = media[currentUser.schoolId][type].filter(i => i.id !== id);
  await window.saveMedia(media);
  await window.renderMyMedia();
  await window.renderDashboard();
};

window.previewMedia = async function(type, id) {
  const media = await window.getMedia();
  const schoolMedia = media[currentUser.schoolId];
  if (!schoolMedia) return;
  const item = schoolMedia[type].find(i => i.id === id);
  if (!item) return;
  
  let html = '';
  if (type === 'foto') {
    html = `<img src="${item.url}" style="width:100%; display:block;"><div style="padding:1rem;"><h3>${escapeHtml(item.title)}</h3><p style="color:var(--muted);">${escapeHtml(item.desc || '')}</p></div>`;
  } else if (type === 'video') {
    const ytId = extractYoutubeId(item.url);
    const embedUrl = ytId ? `https://www.youtube.com/embed/${ytId}` : item.url;
    html = `<div style="position:relative; padding-bottom:56.25%;"><iframe src="${embedUrl}" style="position:absolute; inset:0; width:100%; height:100%; border:0;" allowfullscreen></iframe></div><div style="padding:1rem;"><h3>${escapeHtml(item.title)}</h3></div>`;
  } else {
    html = `<iframe src="${item.url}" style="width:100%; height:70vh; border:0;"></iframe><div style="padding:1rem;"><h3>${escapeHtml(item.title)}</h3></div>`;
  }
  document.getElementById('previewContent').innerHTML = html;
  document.getElementById('previewModal').classList.add('active');
};

window.closePreview = function() {
  document.getElementById('previewModal').classList.remove('active');
};

function extractYoutubeId(url) {
  const m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

// ============ PROFILE & PASSWORD ============
window.showSection = function(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('section-' + name).classList.add('active');
  
  if (name === 'profile' && currentUser.type === 'sekolah') {
    document.getElementById('profileSchoolName').textContent = currentUser.school.nama;
    document.getElementById('profileNpsn').textContent = currentUser.school.npsn;
    document.getElementById('profileBentuk').textContent = currentUser.school.bentuk;
    document.getElementById('profileKec').textContent = currentUser.school.kecamatan;
    document.getElementById('profileRole').textContent = 'Sekolah';
  } else if (name === 'profile' && currentUser.type === 'admin') {
    document.getElementById('profileSchoolName').textContent = 'Administrator Dinas Pendidikan';
    document.getElementById('profileNpsn').textContent = '-';
    document.getElementById('profileBentuk').textContent = '-';
    document.getElementById('profileKec').textContent = 'Kabupaten Ende';
    document.getElementById('profileRole').textContent = 'Admin Dinas';
  }
};

window.changePassword = async function() {
  const oldPass = document.getElementById('oldPass').value;
  const newPass = document.getElementById('newPass').value;
  const confirmPass = document.getElementById('confirmPass').value;
  const msgEl = document.getElementById('passMsg');
  
  if (currentUser.type === 'admin') {
    const p = await window.getPasswords();
    const currentAdminPass = p['_admin'] || 'admin2026';
    if (oldPass !== currentAdminPass) {
      msgEl.innerHTML = '<div class="alert alert-warning">Password lama salah!</div>';
      return;
    }
    p['_admin'] = newPass;
    await window.savePasswords(p);
    msgEl.innerHTML = '<div class="alert" style="background:#d1fae5; color:#065f46;">✓ Password admin berhasil diubah!</div>';
  } else {
    const currentSchoolPass = await window.getSchoolPassword(currentUser.school.npsn);
    if (oldPass !== currentSchoolPass) {
      msgEl.innerHTML = '<div class="alert alert-warning">Password lama salah!</div>';
      return;
    }
    if (newPass.length < 6) {
      msgEl.innerHTML = '<div class="alert alert-warning">Password minimal 6 karakter!</div>';
      return;
    }
    if (newPass !== confirmPass) {
      msgEl.innerHTML = '<div class="alert alert-warning">Konfirmasi password tidak cocok!</div>';
      return;
    }
    await window.setSchoolPassword(currentUser.school.npsn, newPass);
    msgEl.innerHTML = '<div class="alert" style="background:#d1fae5; color:#065f46;">✓ Password berhasil diubah!</div>';
  }
  
  document.getElementById('oldPass').value = '';
  document.getElementById('newPass').value = '';
  document.getElementById('confirmPass').value = '';
};

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ============ FILTER EVENTS ============
document.getElementById('searchSchool').addEventListener('input', () => { currentPage = 1; window.renderSchoolTable(); });
document.getElementById('filterBentuk').addEventListener('change', () => { currentPage = 1; window.renderSchoolTable(); });
document.getElementById('filterKec').addEventListener('change', () => { currentPage = 1; window.renderSchoolTable(); });

const bentukSet = new Set(schools.map(s => s.bentuk));
const kecSet = new Set(schools.map(s => s.kecamatan));
const bentukSelect = document.getElementById('filterBentuk');
const kecSelect = document.getElementById('filterKec');
[...bentukSet].sort().forEach(b => {
  const opt = document.createElement('option');
  opt.value = b; opt.textContent = b;
  bentukSelect.appendChild(opt);
});
[...kecSet].sort().forEach(k => {
  const opt = document.createElement('option');
  opt.value = k; opt.textContent = k;
  kecSelect.appendChild(opt);
});

document.querySelectorAll('.modal').forEach(m => {
  m.addEventListener('click', e => {
    if (e.target === m) m.classList.remove('active');
  });
});

// ============ AUTO LOGIN ============
const savedAuth = localStorage.getItem(AUTH_KEY);
if (savedAuth) {
  try {
    currentUser = JSON.parse(savedAuth);
    if (currentUser.type === 'sekolah') {
      currentUser.school = schools.find(s => s.id === currentUser.schoolId);
    }
    if (currentUser && (currentUser.type === 'admin' || currentUser.school)) {
      window.showApp();
    }
  } catch(e) {}
}
