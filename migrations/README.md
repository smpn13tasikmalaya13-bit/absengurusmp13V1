Migrasi: Menambahkan dukungan multi-sekolah (fundasi)

Tujuan
- Ini adalah langkah pertama: menambahkan tabel/collection `schools`, menambahkan kolom `school_id` pada `users` dan tabel/collection akademik, dan menambahkan role `master`.
- Semua perubahan dirancang agar backward-compatible: tidak menghapus tabel/collection lama, tidak mengubah flow, dan pengguna lama otomatis menjadi bagian dari "Sekolah Utama".

File yang disertakan
- 001_add_schools_and_school_id_postgres.sql  (Postgres migration)
- 001_add_schools_and_school_id_firestore.ts (Firestore migration script using Admin SDK)

Catatan keamanan & cara menjalankan
- Selalu buat backup sebelum menjalankan migrasi di production.
- Untuk Postgres: jalankan file SQL di lingkungan PG (psql) dengan user yang memiliki hak DDL/DML.
  - Contoh: psql -d mydb -f migrations/001_add_schools_and_school_id_postgres.sql
- Untuk Firestore: siapkan service account dengan akses write dan jalankan script (node).
  - Contoh: export GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json" && node migrations/001_add_schools_and_school_id_firestore.js

Kenapa langkah ini aman (ringkasan)
1) Idempotent checks - script memeriksa keberadaan kolom/tabel sebelum membuatnya, sehingga aman di-run berulang.
2) Tidak menghapus data - tidak ada operasi DROP/DELETE yang menghilangkan data lama.
3) Backfill default school - semua baris yang sudah ada diberi nilai school_id default sehingga aplikasi lama tetap bekerja.
4) Role `master` disediakan tanpa memaksa semua user menjadi master: `master` tidak boleh punya `school_id` (ditambahkan check constraint) sehingga pemisahan wewenang bisa dilakukan nanti.

Catatan implementasi
- Karena repo saat ini menggunakan Firestore, saya sertakan script Firestore yang melakukan langkah sama (create "default" school doc dan backfill schoolId di koleksi penting).
- Jika ingin, langkah selanjutnya (LANGKAH 2) bisa meliputi: memodifikasi API/DAO untuk selalu menuliskan/menanyakan school_id, menambahkan scope berdasarkan school_id, membuat middleware otorisasi untuk `master` vs `school-admin`, dll.

Jika Anda mau, saya bisa:
- Buat pull request otomatis dengan file migrasi ini dan catatan deploy
- Jalankan/menguji script Firestore di lingkungan staging (jika kredensial tersedia)
- Membuat panduan langkah-langkah implementasi di aplikasi (update queries & security rules)
