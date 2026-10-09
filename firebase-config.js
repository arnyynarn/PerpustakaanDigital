/* ================================================================
   LibraVerse — firebase-config.js
   Konfigurasi Firebase & Seed Data
================================================================ */

/* 
 * GANTI DENGAN KREDENSIAL FIREBASE ANDA
 * Jika dibiarkan "YOUR_API_KEY", sistem otomatis berjalan dalam
 * "Mode Lokal Realtime" (localStorage + Storage Event Sync).
 * Setelah diisi kredensial asli, sistem otomatis beralih ke
 * Cloud Firestore & Firebase Auth secara realtime!
 */
const firebaseConfig = {
  apiKey: "AIzaSyCcvhNRGRWC3HC9iKV3PWFm55jl6uA3yCg",
  authDomain: "perpustakaandigital-59002.firebaseapp.com",
  projectId: "perpustakaandigital-59002",
  storageBucket: "perpustakaandigital-59002.firebasestorage.app",
  messagingSenderId: "1050832380331",
  appId: "1:1050832380331:web:cd9667cf99205a23cdf2ee"
};

/**
 * Cek apakah konfigurasi Firebase valid (bukan placeholder)
 */
function isFirebaseConfigured() {
  return typeof firebase !== "undefined" &&
    Boolean(firebaseConfig) &&
    Boolean(firebaseConfig.apiKey) &&
    firebaseConfig.apiKey !== "YOUR_API_KEY" &&
    !firebaseConfig.apiKey.includes("YOUR_");
}

// Inisialisasi Firebase hanya jika sudah dikonfigurasi
var db = null;
var auth = null;

if (isFirebaseConfigured()) {
  try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    auth = firebase.auth();
    window.db = db;
    window.auth = auth;
    console.log("✓ Firebase initialized successfully:", firebaseConfig.projectId);
  } catch (err) {
    console.warn("Firebase initialization failed:", err.message);
  }
} else {
  console.info("ℹ LibraVerse berjalan dalam Mode Lokal (localStorage Sync).");
}

/* ================================================================
   SEED DATA BUKU
================================================================ */
const SEED_BOOKS = [
  { id: "buku_1", judul: "Clean Code", penulis: "Robert C. Martin", kat: "Teknologi", stok: 5, rating: 4.8, gambar: "images/image7.jpg", deskripsi: "Panduan menulis kode yang bersih, mudah dibaca, dan mudah dipelihara oleh pengembang perangkat lunak." },
  { id: "buku_2", judul: "Sapiens", penulis: "Yuval Noah Harari", kat: "Sejarah", stok: 3, rating: 4.9, gambar: "images/buku2.jpg", deskripsi: "Sejarah singkat umat manusia dari era prasejarah hingga revolusi ilmiah dan teknologi modern." },
  { id: "buku_3", judul: "Atomic Habits", penulis: "James Clear", kat: "Bisnis", stok: 4, rating: 4.7, gambar: "images/buku3.jpg", deskripsi: "Cara membangun kebiasaan baik dan menghilangkan kebiasaan buruk melalui perubahan kecil yang bertambah." },
  { id: "buku_4", judul: "The Great Gatsby", penulis: "F. Scott Fitzgerald", kat: "Fiksi", stok: 7, rating: 4.5, gambar: "images/buku4.jpg", deskripsi: "Novel klasik yang menceritakan kehidupan mewah dan tragis Jay Gatsby di era Jazz Age Amerika." },
  { id: "buku_5", judul: "A Brief History of Time", penulis: "Stephen Hawking", kat: "Sains", stok: 2, rating: 4.8, gambar: "images/buku5.jpg", deskripsi: "Penjelasan tentang kosmologi, lubang hitam, dan teori relativitas dalam bahasa yang mudah dipahami." },
  { id: "buku_6", judul: "Meditations", penulis: "Marcus Aurelius", kat: "Filsafat", stok: 4, rating: 4.6, gambar: "images/buku6.jpg", deskripsi: "Catatan pribadi kaisar Romawi tentang filosofi Stoikisme dan refleksi kehidupan." },
  { id: "buku_7", judul: "JavaScript: The Good Parts", penulis: "Douglas Crockford", kat: "Teknologi", stok: 6, rating: 4.4, gambar: "images/buku7.jpg", deskripsi: "Panduan ringkas tentang fitur-fitur terbaik JavaScript yang layak dipelajari oleh setiap developer." },
  { id: "buku_8", judul: "Harry Potter & Sorcerer's Stone", penulis: "J.K. Rowling", kat: "Fiksi", stok: 8, rating: 4.9, gambar: "images/buku8.jpg", deskripsi: "Petualangan ajaib Harry Potter di Hogwarts, sekolah sihir dan ilmu gaib." },
  { id: "buku_9", judul: "The Lean Startup", penulis: "Eric Ries", kat: "Bisnis", stok: 1, rating: 4.5, gambar: "images/buku9.jpg", deskripsi: "Metode untuk membangun bisnis startup yang efisien melalui pembelajaran tervalidasi." },
  { id: "buku_10", judul: "Cosmos", penulis: "Carl Sagan", kat: "Sains", stok: 3, rating: 4.9, gambar: "images/buku10.jpg", deskripsi: "Penjelajahan alam semesta yang memukau dari atom hingga galaksi, oleh astronom legendaris." },
  { id: "buku_11", judul: "Homo Deus", penulis: "Yuval Noah Harari", kat: "Sejarah", stok: 2, rating: 4.6, gambar: "images/buku11.jpg", deskripsi: "Visi masa depan umat manusia di era kecerdasan buatan dan bioteknologi." },
  { id: "buku_12", judul: "The Art of War", penulis: "Sun Tzu", kat: "Filsafat", stok: 5, rating: 4.7, gambar: "images/buku12.jpg", deskripsi: "Strategi militer klasik yang telah menjadi panduan kepemimpinan dan bisnis selama berabad-abad." }
];

/* ================================================================
   SEED DATA ANGGOTA (MEMBERS)
================================================================ */
const SEED_MEMBERS = [
  { id: "usr_1", nama: "Dimas Arya Pratama", nim: "202401001", email: "dimas@kampus.ac.id", role: "member", createdAt: "2025-01-15T08:30:00Z" },
  { id: "usr_2", nama: "Siti Rahmawati", nim: "202401002", email: "siti.rahma@kampus.ac.id", role: "member", createdAt: "2025-01-18T10:15:00Z" },
  { id: "usr_3", nama: "Budi Santoso", nim: "202401003", email: "budi.s@kampus.ac.id", role: "member", createdAt: "2025-02-01T09:00:00Z" },
  { id: "usr_admin", nama: "Administrator", nim: "ADM001", email: "admin@libraverse.id", role: "admin", createdAt: "2025-01-01T00:00:00Z" }
];

/* ================================================================
   SEED DATA PEMINJAMAN (BORROWS)
================================================================ */
const SEED_BORROWS = [
  {
    id: "bor_1",
    idTrans: "LV908211",
    userId: "usr_1",
    userName: "Dimas Arya Pratama",
    userEmail: "dimas@kampus.ac.id",
    bukuId: "buku_1",
    judul: "Clean Code",
    durasi: 7,
    tglPinjam: "2025-02-10",
    tglKembali: "2025-02-17",
    status: "active",
    createdAt: "2025-02-10T09:00:00Z"
  },
  {
    id: "bor_2",
    idTrans: "LV908212",
    userId: "usr_2",
    userName: "Siti Rahmawati",
    userEmail: "siti.rahma@kampus.ac.id",
    bukuId: "buku_3",
    judul: "Atomic Habits",
    durasi: 14,
    tglPinjam: "2025-01-20",
    tglKembali: "2025-02-03",
    status: "returned",
    returnedAt: "2025-02-02T14:20:00Z",
    createdAt: "2025-01-20T11:00:00Z"
  },
  {
    id: "bor_3",
    idTrans: "LV908213",
    userId: "usr_3",
    userName: "Budi Santoso",
    userEmail: "budi.s@kampus.ac.id",
    bukuId: "buku_2",
    judul: "Sapiens",
    durasi: 7,
    tglPinjam: "2025-02-01",
    tglKembali: "2025-02-08",
    status: "active",
    createdAt: "2025-02-01T10:30:00Z"
  }
];

/* ================================================================
   SEED KE FIRESTORE (Jika terhubung dan masih kosong)
================================================================ */
async function seedBooksIfEmpty() {
  if (!db) return;
  try {
    const snap = await db.collection("books").limit(1).get();
    if (snap.empty) {
      console.log("Seeding initial books to Firestore...");
      const batch = db.batch();
      SEED_BOOKS.forEach(function (book) {
        const ref = db.collection("books").doc(book.id);
        const { id, ...data } = book;
        batch.set(ref, Object.assign({}, data, { createdAt: firebase.firestore.FieldValue.serverTimestamp() }));
      });
      await batch.commit();
      console.log("✓ Seeding books berhasil.");
    }
  } catch (err) {
    console.warn("Seed error:", err.message);
  }
}

if (isFirebaseConfigured()) {
  seedBooksIfEmpty();
}
