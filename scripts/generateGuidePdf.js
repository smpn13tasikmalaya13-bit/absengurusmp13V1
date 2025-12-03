import fs from 'fs';
import PDFDocument from 'pdfkit';

const outPath = './public/panduan.pdf';

function generate() {
  const doc = new PDFDocument({ autoFirstPage: false });
  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  // Cover
  doc.addPage({ size: 'A4', margin: 72 });
  doc.fontSize(28).fillColor('#0f172a').text('Panduan Penggunaan Aplikasi', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(20).fillColor('#0f172a').text('HadirKu', { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(12).fillColor('#334155').text(`Versi: 1.0\nTanggal: ${new Date().toLocaleDateString('id-ID')}`, { align: 'center' });

  // Table of Contents
  doc.addPage();
  doc.fontSize(16).fillColor('#0f172a').text('Daftar Isi', { underline: true });
  doc.moveDown(0.5);
  const toc = [
    '1. Ringkasan Aplikasi',
    '2. Instalasi & Menjalankan',
    '3. Peran Pengguna',
    '4. Fitur Utama',
    '5. Cara Penggunaan Admin',
    '6. Cara Penggunaan Guru/Pembina/Tendik',
    '7. Troubleshooting',
    '8. Mengganti Panduan PDF',
  ];
  doc.fontSize(12);
  toc.forEach((line, idx) => {
    doc.text(`${line}`, { continued: false });
  });

  // Content pages
  const addSection = (title, paragraphs) => {
    doc.addPage();
    doc.fontSize(14).fillColor('#0f172a').text(title, { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#0f172a');
    paragraphs.forEach(p => {
      doc.text(p, { align: 'justify' });
      doc.moveDown(0.5);
    });
  };

  addSection('1. Ringkasan Aplikasi', [
    'HadirKu adalah aplikasi absensi berbasis QR yang dirancang untuk memudahkan proses absen bagi Guru, Pembina (Coach), dan Tenaga Administrasi (Tendik). Admin dapat mengelola pengguna, laporan, dan pengaturan scan QR (global, per-role, per-user).'
  ]);

  addSection('2. Instalasi & Menjalankan', [
    'Langkah singkat untuk developer:',
    '1) Install dependencies: npm install',
    '2) Menjalankan dev server: npm run dev',
    '3) Build produksi: npm run build',
    'File project utama berada di folder root dan komponen di folder components/.',
  ]);

  addSection('3. Peran Pengguna', [
    '- Admin: akses penuh (Dashboard, Manage Users, Settings, Panduan).',
    '- Guru: scan QR untuk absensi per pelajaran.',
    '- Pembina: scan QR untuk eskul.',
    '- Tendik: scan QR untuk absensi staf administrasi.'
  ]);

  addSection('4. Fitur Utama', [
    '- Scan QR dengan verifikasi lokasi (GPS).',
    '- Kontrol Scan: global on/off, per-role, dan per-user override.',
    '- Manajemen pengguna, laporan, pengumuman, dan panduan PDF.'
  ]);

  addSection('5. Cara Penggunaan Admin', [
    '1) Login sebagai Admin.',
    '2) Buka Dasbor -> Pengaturan Scan QR (Admin).',
    '3) Ubah toggle global atau per-role, lalu klik "Simpan Pengaturan".',
    '4) Untuk per-user: buka Manajemen Pengguna dan klik "Nonaktifkan Scan" / "Aktifkan Scan" pada baris user.'
  ]);

  addSection('6. Cara Penggunaan Guru/Pembina/Tendik', [
    '1) Login dengan akun terdaftar.',
    '2) Buka halaman QR Scanner dan izinkan akses kamera.',
    '3) Sistem memeriksa hak scan (per-user/global/role), izin kamera, dan lokasi dalam radius sekolah.',
    '4) Jika semua valid, arahkan kamera ke QR untuk melakukan absensi.'
  ]);

  addSection('7. Troubleshooting', [
    '- Kamera tidak terbuka: periksa izin browser dan tab lain yang menggunakan kamera.',
    '- Scan diblokir: periksa pengaturan Scan admin (global/role/per-user).',
    '- Perubahan tidak tersimpan: pastikan akun admin punya permission write pada settings/qrScan dan users/{id}.'
  ]);

  addSection('8. Mengganti Panduan PDF', [
    'Anda dapat mengganti file panduan dengan versi final: letakkan file PDF bernama panduan.pdf di folder public/ lalu commit & push ke repo.',
  ]);

  doc.end();

  stream.on('finish', () => {
    console.log('Generated', outPath);
  });
}

generate();
