# 📚 LibraVerse — Sistem Perpustakaan Digital Modern

**LibraVerse** adalah sistem informasi perpustakaan digital interaktif dengan arsitektur dua sisi (**Client / Anggota** dan **Admin / Pengelola**), tampilan modern bernuansa *dark glassmorphism*, serta dukungan **penyimpanan data real-time** ganda (Mode Sinkronisasi Lokal Lintas Tab & Cloud Database via Firebase Firestore).

<img width="1535" height="775" alt="image" src="https://github.com/user-attachments/assets/af6f46da-4ab9-4079-b86c-01381059b8d9" />


---

## 🌟 Fitur Utama

### 1. Sisi Klien (Client / Anggota) — `index.html`
* **Beranda Dinamis (Hero Section):**
  * Animasi penghitung angka (*animated counters*) untuk jumlah koleksi, anggota terdaftar, dan peminjaman aktif.
  * Kartu ilustrasi interaktif dengan efek *floating* dan *glow*.
* **Katalog Koleksi Buku:**
  * Pencarian instan (*live search*) berdasarkan judul atau penulis.
  * Penyaringan kategori genre (*Teknologi, Fiksi, Sains, Sejarah, Bisnis, Filsafat*).
  * *Toggle* tampilan antara mode **Grid Kartu** dan mode **Daftar (List View)**.
  * *Modal Pop-up* Detail Buku lengkap dengan sampul asli, sinopsis, rating, dan status ketersediaan stok.
* **Formulir Peminjaman & Tiket Resi:**
  * Pemilihan buku otomatis terhubung dengan dropdown formulir.
  * Validasi rentang tanggal dan batas durasi (1 – 14 hari) serta pengecekan stok otomatis.
  * Pembuatan bukti peminjaman digital (tiket resi) secara langsung setelah konfirmasi.
* **Riwayat Peminjaman:**
  * Daftar buku yang sedang dipinjam dengan badge status dinamis (*Aktif, Terlambat, Dikembalikan*).
  * Tombol aksi **"Kembalikan"** yang secara otomatis mengembalikan stok buku ke perpustakaan.
* **Autentikasi Pengguna:**
  * Fitur Masuk (*Login*) dan Pendaftaran (*Register*) akun anggota.
  * Avatar profil pengguna di bilah navigasi dengan menu dropdown sesi.

---

### 2. Sisi Admin (Administrator Panel) — `admin.html`
* **Dashboard Analitik:**
  * Ringkasan indikator utama: Total Buku, Total Stok Fisik, Peminjaman Aktif, dan Anggota Terdaftar.
  * **Grafik Batang Distribusi Genre:** Visualisasi persentase koleksi per kategori.
  * **Aktivitas Terbaru:** Pemantauan real-time transaksi peminjaman mutakhir.
  * **Peringatan Stok Menipis (*Low Stock Alert*):** Deteksi otomatis buku dengan sisa stok $\le 2$ eksemplar.
* **Manajemen Koleksi Buku (CRUD):**
  * **Tambah Buku Baru:** Modal form penambahan judul, penulis, genre, rating, stok, gambar, dan deskripsi.
  * **Edit Buku:** Memperbarui data buku atau menambah jumlah stok.
  * **Hapus Buku:** Konfirmasi modal aman sebelum menghapus data koleksi.
* **Manajemen Peminjaman:**
  * Tabel peminjaman dengan filter chip (*Semua, Aktif, Terlambat, Selesai*).
  * Tombol aksi **"Kembalikan"** dari sisi admin yang otomatis menyinkronkan stok buku.
* **Manajemen Anggota:**
  * Daftar anggota terdaftar, nomor identitas (NIM/ID), email, tanggal registrasi, serta jumlah buku yang sedang dipinjam.
  * Kemampuan menghapus akun anggota dari database.

---

## ⚡ Arsitektur Database & Real-Time Sync

LibraVerse dirancang dengan arsitektur **Dual-Engine Persistence**:

| Mode | Cara Kerja | Kebutuhan Setup |
| :--- | :--- | :--- |
| **1. Mode Lokal Real-Time** *(Default)* | Menggunakan `localStorage` dengan penanganan event `window.addEventListener('storage')`. Perubahan data di tab Klien (misal: user meminjam buku) langsung ter-update di tab Admin secara real-time tanpa reload! | **Nol Konfigurasi** (Langsung jalan di browser) |
| **2. Mode Cloud Firestore** *(Opsional)* | Menggunakan Google Cloud Firestore & Firebase Auth untuk sinkronisasi antar perangkat dan database cloud online. | Masukkan kredensial di `firebase-config.js` |

---

## 📁 Struktur Berkas

```
Perpustakaan/
├── index.html            # Antarmuka Klien / Anggota Perpustakaan
├── admin.html            # Antarmuka Dashboard & Admin Panel
├── style.css             # Desain utama, variabel warna HSL, tipografi & animasi
├── admin.css             # Gaya spesifik panel admin (sidebar, stat card, charts)
├── script.js             # Logika interaktif sisi klien & sinkronisasi data
├── admin.js              # Logika dashboard, CRUD buku, peminjaman & anggota
├── firebase-config.js    # Konfigurasi database & data awal (Seed Books, Members, Borrows)
├── images/               # Sampul kover buku asli beresolusi optimal
└── README.md             # Dokumentasi sistem
```

---

## 🚀 Cara Menjalankan

### Cara 1: Langsung di Browser (Offline / Standalone)
1. Cukup klik ganda atau buka berkas [index.html](file:///d:/Perpustakaan/index.html) pada peramban web modern (Google Chrome, Microsoft Edge, Firefox).
2. Untuk membuka panel admin, klik menu **Admin** di bilah atas atau buka berkas [admin.html](file:///d:/Perpustakaan/admin.html).
3. Anda dapat membuka `index.html` dan `admin.html` berdampingan di dua tab berbeda untuk menguji sinkronisasi instan!

### Cara 2: Menjalankan dengan Local Web Server (Direkomendasikan)
Jika Anda memiliki Python, Node.js, atau ekstensi *Live Server* di editor kode:
```bash
# Menggunakan Python:
python -m http.server 8080

# Buka di browser:
# Klien : http://localhost:8080/index.html
# Admin : http://localhost:8080/admin.html
```

---

## ☁️ Menghubungkan ke Firebase Cloud (Opsional)

Jika ingin mengaktifkan database online di cloud:
1. Buka [Firebase Console](https://console.firebase.google.com/) dan buat proyek baru.
2. Aktifkan **Cloud Firestore** di menu *Build > Firestore Database* (mulai dalam test mode).
3. Aktifkan **Authentication** di menu *Build > Authentication* (pilih metode *Email/Password*).
4. Buat Web App di menu *Project Settings*, lalu salin konfigurasi kunci Firebase Anda.
5. Buka berkas [firebase-config.js](file:///d:/Perpustakaan/firebase-config.js) dan ganti isi `firebaseConfig`:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "project-id.firebaseapp.com",
     projectId: "project-id",
     storageBucket: "project-id.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef..."
   };
   ```
6. Simpan berkas. Sistem secara otomatis beralih dari **Mode Lokal** ke **Cloud Firestore** dan mengunggah *seed data* awal.

---

## 💡 Akun Uji Coba & Hak Akses (Role-Based Access)

Sistem menerapkan pemisahan hak akses (**Role-Based Access Control**):
* **Akun Anggota / Mahasiswa (Peminjam Buku):**
  * **Email:** `arni@kampus.ac.id` (atau daftar akun baru di halaman depan).
  * **Hak Akses:** Hanya dapat mencari buku, meminjam buku, melihat riwayat peminjaman pribadi, dan mencetak resi. Tidak memiliki akses ke panel admin.
* **Akun Administrator (Pengelola Perpustakaan):**
  * **Email:** `admin@libraverse.id` | **Password:** Password akun admin Anda (atau `admin123` pada mode lokal).
  * **Hak Akses:** Masuk melalui gerbang keamanan [admin.html](file:///d:/Perpustakaan/admin.html) untuk mengakses dashboard analitik, menambah/mengedit/menghapus koleksi buku, mengelola data seluruh peminjaman, dan mengelola daftar anggota.
