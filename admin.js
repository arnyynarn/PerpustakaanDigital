"use strict";

/* ================================================================
   LibraVerse — admin.js
   Admin Panel Logic with Dual Mode (Local Sync & Firestore Cloud)
================================================================ */

/* ================================================================
   STATE
================================================================ */
var adminBooks = [];
var adminBorrows = [];
var adminMembers = [];
var adminUser = null;
var isAdminFirebaseReady = false;
var currentBorrowFilter = "all";

var katColors = {
  "Teknologi": "#6366f1", "Fiksi": "#a78bfa", "Sains": "#60a5fa",
  "Sejarah": "#f59e0b", "Bisnis": "#22c55e", "Filsafat": "#fb7185"
};

var katClass = {
  "Teknologi": "g-tek", "Fiksi": "g-fik", "Sains": "g-sa",
  "Sejarah": "g-sej", "Bisnis": "g-bis", "Filsafat": "g-fil"
};

/* ================================================================
   LOCAL STORAGE HELPERS
================================================================ */
function getStorage(key, fallback) {
  try {
    var raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function setStorage(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error("Storage error:", e);
  }
}

/* ================================================================
   INIT
================================================================ */
window.addEventListener("load", function () {
  checkAdminGateState();
  checkAdminConnectionAndInit();
  pasangAdminEvents();

  // Listen to cross-tab updates (e.g. User borrows book in index.html)
  window.addEventListener("storage", function (e) {
    if (e.key === "LV_BOOKS" || e.key === "LV_BORROWS" || e.key === "LV_MEMBERS") {
      if (!isAdminFirebaseReady) {
        syncAdminFromStorage();
      }
    }
  });
});

/* ================================================================
   ADMIN AUTH GATE (PROTECTION)
================================================================ */
function checkAdminGateState() {
  var gate = document.getElementById("adminAuthGate");
  if (!gate) return;
  var isLogged = sessionStorage.getItem("LV_ADMIN_LOGGED_IN") === "true";
  if (isLogged) {
    gate.classList.add("hidden");
  } else {
    gate.classList.remove("hidden");
  }
}

function showAdminGate() {
  var gate = document.getElementById("adminAuthGate");
  if (gate) gate.classList.remove("hidden");
}

function hideAdminGate() {
  var gate = document.getElementById("adminAuthGate");
  if (gate) gate.classList.add("hidden");
}

/* ================================================================
   CONNECTION CHECK & INIT
================================================================ */
function checkAdminConnectionAndInit() {
  if (isFirebaseConfigured() && db && auth) {
    db.collection("books").limit(1).get().then(function () {
      isAdminFirebaseReady = true;
      updateAdminConnection("cloud");
      setupAdminListeners();
      setupAdminAuth();
    }).catch(function (err) {
      console.warn("Firestore unreachable, using Local Mode:", err.message);
      initAdminLocalMode();
    });
  } else {
    initAdminLocalMode();
  }
}

function initAdminLocalMode() {
  isAdminFirebaseReady = false;
  updateAdminConnection("local");

  syncAdminFromStorage();

  // Admin user display
  var adminName = document.getElementById("adminName");
  if (adminName) adminName.textContent = "Admin Demo";
}

function syncAdminFromStorage() {
  adminBooks = getStorage("LV_BOOKS", typeof SEED_BOOKS !== "undefined" ? SEED_BOOKS.slice() : []);
  adminBorrows = getStorage("LV_BORROWS", typeof SEED_BORROWS !== "undefined" ? SEED_BORROWS.slice() : []);
  adminMembers = getStorage("LV_MEMBERS", typeof SEED_MEMBERS !== "undefined" ? SEED_MEMBERS.slice() : []);

  renderDashboard();
  renderAdminBooks();
  renderAdminBorrows();
  renderAdminMembers();
}

function updateAdminConnection(mode) {
  var dot = document.getElementById("adminDot");
  var label = document.getElementById("adminStatus");
  if (!dot || !label) return;

  if (mode === "cloud") {
    dot.style.background = "#22c55e";
    dot.style.animation = "statusPulse 2s infinite";
    label.textContent = "Cloud Firestore";
    label.style.color = "#22c55e";
  } else {
    dot.style.background = "#38bdf8";
    dot.style.animation = "statusPulse 2.5s infinite";
    label.textContent = "Mode Lokal (Aktif)";
    label.style.color = "#38bdf8";
  }
}

function setupAdminAuth() {
  auth.onAuthStateChanged(function (user) {
    adminUser = user;
    if (user) {
      var nameEl = document.getElementById("adminName");
      if (nameEl) nameEl.textContent = user.displayName || user.email;
      var avatarEl = document.querySelector(".sidebar-user .user-avatar");
      if (avatarEl) avatarEl.textContent = (user.displayName || user.email).charAt(0).toUpperCase();
    }
  });
}

function setupAdminListeners() {
  // Books
  try {
    db.collection("books").onSnapshot(function (snap) {
      adminBooks = [];
      snap.forEach(function (doc) {
        adminBooks.push(Object.assign({ id: doc.id }, doc.data()));
      });
      adminBooks.sort(function (a, b) { return (a.judul || "").localeCompare(b.judul || ""); });
      setStorage("LV_BOOKS", adminBooks);
      renderAdminBooks();
      renderDashboard();
    }, function (err) {
      console.warn("Admin books listener error:", err);
    });
  } catch (e) {
    console.warn("Error setting admin books listener:", e);
  }

  // Borrows
  try {
    db.collection("borrows").onSnapshot(function (snap) {
      adminBorrows = [];
      snap.forEach(function (doc) {
        adminBorrows.push(Object.assign({ id: doc.id }, doc.data()));
      });
      setStorage("LV_BORROWS", adminBorrows);
      renderAdminBorrows();
      renderDashboard();
    }, function (err) {
      console.warn("Admin borrows listener error:", err);
    });
  } catch (e) {
    console.warn("Error setting admin borrows listener:", e);
  }

  // Members
  try {
    db.collection("users").onSnapshot(function (snap) {
      adminMembers = [];
      snap.forEach(function (doc) {
        adminMembers.push(Object.assign({ id: doc.id }, doc.data()));
      });
      setStorage("LV_MEMBERS", adminMembers);
      renderAdminMembers();
      renderDashboard();
    }, function (err) {
      console.warn("Admin members listener error:", err);
    });
  } catch (e) {
    console.warn("Error setting admin members listener:", e);
  }
}

/* ================================================================
   EVENTS
================================================================ */
function pasangAdminEvents() {
  // Sidebar navigation
  document.querySelectorAll(".sidebar-link").forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      var page = this.dataset.page;
      navigateTo(page);
    });
  });

  // Sidebar toggle for mobile/responsive
  var toggle = document.getElementById("sidebarToggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      document.getElementById("sidebar").classList.toggle("open");
      document.getElementById("sidebar").classList.toggle("collapsed");
    });
  }

  // Admin Login Gate Form
  var adminLoginForm = document.getElementById("adminLoginForm");
  if (adminLoginForm) {
    adminLoginForm.addEventListener("submit", handleAdminLogin);
  }

  // Quick fill admin credentials button
  var btnFillAdmin = document.getElementById("btnFillAdmin");
  if (btnFillAdmin) {
    btnFillAdmin.addEventListener("click", function () {
      var eInput = document.getElementById("adminEmail");
      var pInput = document.getElementById("adminPassword");
      if (eInput) eInput.value = "admin@libraverse.id";
      if (pInput) pInput.value = "admin123";
      if (adminLoginForm) {
        adminLoginForm.requestSubmit();
      }
    });
  }

  // Admin logout
  var logout = document.getElementById("adminLogout");
  if (logout) {
    logout.addEventListener("click", function () {
      sessionStorage.removeItem("LV_ADMIN_LOGGED_IN");
      if (isAdminFirebaseReady && auth) {
        auth.signOut();
      }
      showAdminGate();
      showAdminToast("Sesi Admin telah berakhir.", "ok");
    });
  }

  // Add book button
  var btnAdd = document.getElementById("btnAddBook");
  if (btnAdd) {
    btnAdd.addEventListener("click", function () {
      openBookForm();
    });
  }

  // Book form submit
  var bookForm = document.getElementById("adminBookForm");
  if (bookForm) bookForm.addEventListener("submit", handleBookFormSubmit);

  // Close book form
  var bookFormClose = document.getElementById("bookFormClose");
  if (bookFormClose) bookFormClose.addEventListener("click", closeBookForm);
  var bookFormCancel = document.getElementById("bookFormCancel");
  if (bookFormCancel) bookFormCancel.addEventListener("click", closeBookForm);

  // Confirm modal cancel
  var confirmCancel = document.getElementById("confirmCancel");
  if (confirmCancel) {
    confirmCancel.addEventListener("click", function () {
      document.getElementById("confirmModal").classList.remove("active");
    });
  }

  // Close modals on overlay click
  document.querySelectorAll(".modal-overlay").forEach(function (overlay) {
    overlay.addEventListener("click", function (e) {
      if (e.target === this) this.classList.remove("active");
    });
  });

  // Borrow filter chips
  document.querySelectorAll(".filter-chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      document.querySelectorAll(".filter-chip").forEach(function (c) { c.classList.remove("active"); });
      this.classList.add("active");
      currentBorrowFilter = this.dataset.filter;
      renderAdminBorrows();
    });
  });

  // Search books
  var bookSearch = document.getElementById("adminBookSearch");
  if (bookSearch) {
    bookSearch.addEventListener("input", function () {
      var q = this.value.toLowerCase().trim();
      var filtered = adminBooks.filter(function (b) {
        return (b.judul || "").toLowerCase().includes(q) || (b.penulis || "").toLowerCase().includes(q);
      });
      renderAdminBooks(filtered);
    });
  }

  // Search members
  var memberSearch = document.getElementById("adminMemberSearch");
  if (memberSearch) {
    memberSearch.addEventListener("input", function () {
      var q = this.value.toLowerCase().trim();
      var filtered = adminMembers.filter(function (m) {
        return (m.nama || "").toLowerCase().includes(q) ||
               (m.email || "").toLowerCase().includes(q) ||
               (m.nim || "").toLowerCase().includes(q);
      });
      renderAdminMembers(filtered);
    });
  }

  // Dashboard refresh
  var refreshBtn = document.getElementById("refreshDashboard");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", function () {
      if (!isAdminFirebaseReady) syncAdminFromStorage();
      else renderDashboard();
      showAdminToast("Data diperbarui.", "ok");
    });
  }
}

/* ================================================================
   NAVIGATION
================================================================ */
function navigateTo(page) {
  document.querySelectorAll(".sidebar-link").forEach(function (link) {
    link.classList.toggle("active", link.dataset.page === page);
  });

  document.querySelectorAll(".admin-page").forEach(function (p) { p.classList.remove("active"); });
  var pageMap = {
    "dashboard": "pageDashboard",
    "books": "pageBooks",
    "borrows": "pageBorrows",
    "members": "pageMembers"
  };
  var target = document.getElementById(pageMap[page]);
  if (target) target.classList.add("active");

  if (window.innerWidth <= 768) {
    var sidebar = document.getElementById("sidebar");
    if (sidebar) sidebar.classList.remove("open");
  }
}

/* ================================================================
   DASHBOARD
================================================================ */
function renderDashboard() {
  var totalBooks = adminBooks.length;
  var totalStock = 0;
  adminBooks.forEach(function (b) { totalStock += (parseInt(b.stok) || 0); });
  var activeBorrows = adminBorrows.filter(function (b) { return b.status === "active"; }).length;
  var totalMembers = adminMembers.length;

  var dsTotalBooks = document.getElementById("dsTotalBooks");
  var dsTotalStock = document.getElementById("dsTotalStock");
  var dsActiveBorrows = document.getElementById("dsActiveBorrows");
  var dsTotalMembers = document.getElementById("dsTotalMembers");

  if (dsTotalBooks) dsTotalBooks.textContent = totalBooks;
  if (dsTotalStock) dsTotalStock.textContent = totalStock;
  if (dsActiveBorrows) dsActiveBorrows.textContent = activeBorrows;
  if (dsTotalMembers) dsTotalMembers.textContent = totalMembers;

  renderGenreChart();
  renderRecentBorrows();
  renderLowStock();
}

function renderGenreChart() {
  var container = document.getElementById("genreChart");
  if (!container) return;

  var genreCounts = {};

  // Count distribution across all catalog books
  adminBooks.forEach(function (b) {
    var g = b.kat || "Lainnya";
    genreCounts[g] = (genreCounts[g] || 0) + 1;
  });

  if (Object.keys(genreCounts).length === 0) {
    container.innerHTML = '<p class="text-muted" style="padding:30px 0;text-align:center;">Belum ada data koleksi.</p>';
    return;
  }

  var maxCount = Math.max.apply(null, Object.values(genreCounts));
  container.innerHTML = "";

  Object.keys(genreCounts).sort(function (a, b) {
    return genreCounts[b] - genreCounts[a];
  }).forEach(function (genre) {
    var count = genreCounts[genre];
    var pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
    var color = katColors[genre] || "#6366f1";

    var row = document.createElement("div");
    row.className = "chart-bar-row";
    row.innerHTML =
      '<span class="chart-bar-label">' + genre + '</span>' +
      '<div class="chart-bar-track">' +
        '<div class="chart-bar-fill" style="width:' + Math.max(pct, 12) + '%;background:' + color + ';">' + count + ' judul</div>' +
      '</div>';
    container.appendChild(row);
  });
}

function renderRecentBorrows() {
  var container = document.getElementById("recentBorrows");
  if (!container) return;

  var recent = adminBorrows.slice(0, 5);
  if (recent.length === 0) {
    container.innerHTML = '<p class="text-muted" style="padding:30px 0;text-align:center;">Belum ada peminjaman.</p>';
    return;
  }

  container.innerHTML = "";
  recent.forEach(function (b) {
    var fmtD = function (s) {
      if (!s) return "-";
      return new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    };
    var isOverdue = b.status === "active" && new Date(b.tglKembali) < new Date();
    var statusCls = b.status === "returned" ? "color:var(--success)" : isOverdue ? "color:var(--danger)" : "color:var(--warning)";
    var statusText = b.status === "returned" ? "Dikembalikan" : isOverdue ? "Terlambat" : "Aktif";

    var item = document.createElement("div");
    item.className = "recent-item";
    item.innerHTML =
      '<div class="recent-item-icon"><i class="fa-solid fa-book"></i></div>' +
      '<div class="recent-item-text">' +
        '<p class="recent-item-title">' + (b.judul || "Buku") + '</p>' +
        '<p class="recent-item-sub">' + (b.userName || "Anggota") + ' · ' + fmtD(b.tglPinjam) + '</p>' +
      '</div>' +
      '<span class="recent-item-badge" style="' + statusCls + '">' + statusText + '</span>';
    container.appendChild(item);
  });
}

function renderLowStock() {
  var container = document.getElementById("lowStockList");
  if (!container) return;

  var lowStock = adminBooks.filter(function (b) { return (b.stok || 0) <= 2; }).sort(function (a, b) { return a.stok - b.stok; });

  if (lowStock.length === 0) {
    container.innerHTML = '<p class="text-muted" style="padding:24px 0;text-align:center;">Semua buku memiliki stok mencukupi. 👍</p>';
    return;
  }

  container.innerHTML = "";
  lowStock.forEach(function (b) {
    var item = document.createElement("div");
    item.className = "low-stock-item";
    item.innerHTML =
      '<div class="low-stock-info">' +
        '<div class="low-stock-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>' +
        '<div>' +
          '<p class="low-stock-title">' + b.judul + '</p>' +
          '<p class="text-muted" style="font-size:0.78rem;">' + b.penulis + ' (' + b.kat + ')</p>' +
        '</div>' +
      '</div>' +
      '<span class="low-stock-stok">' + b.stok + ' sisa</span>';
    container.appendChild(item);
  });
}

/* ================================================================
   ADMIN BOOKS TABLE
================================================================ */
function renderAdminBooks(list) {
  var books = list || adminBooks;
  var tbody = document.getElementById("adminBookTable");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (books.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="t-empty">Tidak ada buku ditemukan.</td></tr>';
    return;
  }

  books.forEach(function (b, i) {
    var tr = document.createElement("tr");
    tr.innerHTML =
      '<td>' + (i + 1) + '</td>' +
      '<td><span class="t-name">' + b.judul + '</span></td>' +
      '<td>' + b.penulis + '</td>' +
      '<td><span class="book-genre ' + (katClass[b.kat] || "") + '" style="font-size:0.7rem;">' + b.kat + '</span></td>' +
      '<td><span style="color:' + (b.stok === 0 ? "var(--danger)" : b.stok <= 2 ? "var(--warning)" : "var(--success)") + ';font-weight:700;">' + b.stok + '</span></td>' +
      '<td>★ ' + (b.rating || "N/A") + '</td>' +
      '<td><div class="action-btns">' +
        '<button class="btn-edit" data-id="' + b.id + '" title="Edit"><i class="fa-solid fa-pen"></i></button>' +
        '<button class="btn-delete" data-id="' + b.id + '" title="Hapus"><i class="fa-solid fa-trash"></i></button>' +
      '</div></td>';
    tbody.appendChild(tr);
  });

  // Edit buttons
  tbody.querySelectorAll(".btn-edit").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var book = adminBooks.find(function (b) { return b.id === btn.dataset.id; });
      if (book) openBookForm(book);
    });
  });

  // Delete buttons
  tbody.querySelectorAll(".btn-delete").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var book = adminBooks.find(function (b) { return b.id === btn.dataset.id; });
      if (book) showDeleteConfirm(book);
    });
  });
}

/* ================================================================
   ADMIN LOGIN HANDLER
================================================================ */
async function handleAdminLogin(e) {
  e.preventDefault();
  var email = document.getElementById("adminEmail").value.trim().toLowerCase();
  var password = document.getElementById("adminPassword").value.trim();
  var btn = document.getElementById("btnAdminLogin");

  if (btn) { btn.classList.add("loading"); btn.disabled = true; }

  try {
    var loginSuccess = false;
    var adminDisplayName = "Administrator";

    if (isAdminFirebaseReady && auth) {
      try {
        var cred = await auth.signInWithEmailAndPassword(email, password);
        var isAdmin = false;

        // Allow master admin or check role in Firestore users collection
        if (email === "admin@libraverse.id") {
          isAdmin = true;
        } else {
          try {
            var userDoc = await db.collection("users").doc(cred.user.uid).get();
            if (userDoc.exists && userDoc.data().role === "admin") {
              isAdmin = true;
            }
          } catch (dbErr) {
            console.warn("Role check error:", dbErr);
          }
        }

        if (!isAdmin) {
          await auth.signOut();
          showAdminToast("Akses Ditolak: Akun Anda adalah anggota biasa, bukan administrator perpustakaan.", "err");
          return;
        }

        loginSuccess = true;
        adminDisplayName = cred.user.displayName || email;
      } catch (authErr) {
        console.warn("Firebase Auth signIn attempt:", authErr.code);
        // Master fallback for default credentials
        if (email === "admin@libraverse.id" && (password === "admin123" || password === "admin")) {
          loginSuccess = true;
          adminDisplayName = "Administrator Perpustakaan";
        } else {
          throw authErr;
        }
      }
    } else {
      // Local mode verification
      if (email === "admin@libraverse.id" || email.includes("admin")) {
        loginSuccess = true;
        adminDisplayName = "Administrator";
      } else {
        showAdminToast("Akses Ditolak: Hanya akun Administrator yang dapat mengakses panel ini.", "err");
        return;
      }
    }

    if (loginSuccess) {
      sessionStorage.setItem("LV_ADMIN_LOGGED_IN", "true");
      hideAdminGate();
      showAdminToast("Selamat datang di Panel Administrator!", "ok");

      var nameEl = document.getElementById("adminName");
      if (nameEl) nameEl.textContent = adminDisplayName;
    }
  } catch (err) {
    var msg = "Gagal login admin.";
    if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
      msg = "Email atau password administrator salah.";
    } else if (err.code === "auth/user-not-found") {
      msg = "Akun administrator tidak ditemukan.";
    } else if (err.code === "auth/invalid-email") {
      msg = "Format email tidak valid.";
    } else {
      msg = "Error: " + err.message;
    }
    showAdminToast(msg, "err");
  } finally {
    if (btn) { btn.classList.remove("loading"); btn.disabled = false; }
  }
}

/* ================================================================
   BOOK FORM MODAL (ADD & EDIT)
================================================================ */
function openBookForm(book) {
  var modal = document.getElementById("bookFormModal");
  var title = document.getElementById("bookFormTitle");
  var form = document.getElementById("adminBookForm");

  if (book) {
    title.textContent = "Edit Buku";
    document.getElementById("editBookId").value = book.id;
    document.getElementById("abJudul").value = book.judul || "";
    document.getElementById("abPenulis").value = book.penulis || "";
    document.getElementById("abKategori").value = book.kat || "Teknologi";
    document.getElementById("abStok").value = book.stok || 0;
    document.getElementById("abRating").value = book.rating || "";
    document.getElementById("abGambar").value = book.gambar || "";
    document.getElementById("abDeskripsi").value = book.deskripsi || "";
  } else {
    title.textContent = "Tambah Buku Baru";
    form.reset();
    document.getElementById("editBookId").value = "";
    document.getElementById("abRating").value = "4.8";
    document.getElementById("abStok").value = "5";
  }

  modal.classList.add("active");
}

function closeBookForm() {
  var modal = document.getElementById("bookFormModal");
  if (modal) modal.classList.remove("active");
}

async function handleBookFormSubmit(e) {
  e.preventDefault();

  var btn = document.getElementById("bookFormSubmit");
  if (btn) { btn.classList.add("loading"); btn.disabled = true; }

  var bookId = document.getElementById("editBookId").value;
  var data = {
    judul: document.getElementById("abJudul").value.trim(),
    penulis: document.getElementById("abPenulis").value.trim(),
    kat: document.getElementById("abKategori").value,
    stok: parseInt(document.getElementById("abStok").value) || 0,
    rating: parseFloat(document.getElementById("abRating").value) || 4.5,
    gambar: document.getElementById("abGambar").value.trim(),
    deskripsi: document.getElementById("abDeskripsi").value.trim()
  };

  try {
    if (isAdminFirebaseReady && db) {
      if (bookId) {
        await db.collection("books").doc(bookId).update(data);
        showAdminToast("Buku berhasil diperbarui di Cloud.", "ok");
      } else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection("books").add(data);
        showAdminToast("Buku berhasil ditambahkan ke Cloud.", "ok");
      }
    } else {
      // Local Mode
      if (bookId) {
        var idx = adminBooks.findIndex(function (b) { return b.id === bookId; });
        if (idx !== -1) {
          adminBooks[idx] = Object.assign({}, adminBooks[idx], data);
        }
        showAdminToast("Buku berhasil diperbarui.", "ok");
      } else {
        var newId = "buku_" + Date.now();
        var newBook = Object.assign({ id: newId }, data);
        adminBooks.unshift(newBook);
        showAdminToast("Buku baru berhasil ditambahkan.", "ok");
      }

      setStorage("LV_BOOKS", adminBooks);
      renderAdminBooks();
      renderDashboard();
    }

    closeBookForm();
  } catch (err) {
    showAdminToast("Error: " + err.message, "err");
  } finally {
    if (btn) { btn.classList.remove("loading"); btn.disabled = false; }
  }
}

/* ================================================================
   DELETE CONFIRMATION
================================================================ */
var pendingDeleteId = null;

function showDeleteConfirm(book) {
  pendingDeleteId = book.id;
  document.getElementById("confirmTitle").textContent = "Hapus Buku";
  document.getElementById("confirmMsg").textContent = 'Yakin ingin menghapus koleksi "' + book.judul + '"?';
  document.getElementById("confirmModal").classList.add("active");

  var okBtn = document.getElementById("confirmOk");
  okBtn.onclick = async function () {
    try {
      if (isAdminFirebaseReady && db) {
        await db.collection("books").doc(pendingDeleteId).delete();
        showAdminToast("Buku berhasil dihapus dari Cloud.", "ok");
      } else {
        adminBooks = adminBooks.filter(function (b) { return b.id !== pendingDeleteId; });
        setStorage("LV_BOOKS", adminBooks);
        renderAdminBooks();
        renderDashboard();
        showAdminToast("Buku berhasil dihapus.", "ok");
      }
    } catch (err) {
      showAdminToast("Gagal menghapus: " + err.message, "err");
    }
    document.getElementById("confirmModal").classList.remove("active");
  };
}

function showDeleteMemberConfirm(member) {
  pendingDeleteId = member.id;
  document.getElementById("confirmTitle").textContent = "Hapus Anggota";
  document.getElementById("confirmMsg").textContent = 'Yakin ingin menghapus anggota "' + (member.nama || member.email) + '"?';
  document.getElementById("confirmModal").classList.add("active");

  var okBtn = document.getElementById("confirmOk");
  okBtn.onclick = async function () {
    try {
      if (isAdminFirebaseReady && db) {
        await db.collection("users").doc(pendingDeleteId).delete();
        showAdminToast("Anggota berhasil dihapus dari Cloud.", "ok");
      } else {
        adminMembers = adminMembers.filter(function (m) { return m.id !== pendingDeleteId; });
        setStorage("LV_MEMBERS", adminMembers);
        renderAdminMembers();
        renderDashboard();
        showAdminToast("Anggota berhasil dihapus.", "ok");
      }
    } catch (err) {
      showAdminToast("Gagal menghapus: " + err.message, "err");
    }
    document.getElementById("confirmModal").classList.remove("active");
  };
}

/* ================================================================
   ADMIN BORROWS TABLE
================================================================ */
function renderAdminBorrows() {
  var tbody = document.getElementById("adminBorrowTable");
  if (!tbody) return;
  tbody.innerHTML = "";

  var filtered = adminBorrows;
  if (currentBorrowFilter !== "all") {
    filtered = adminBorrows.filter(function (b) {
      if (currentBorrowFilter === "active") return b.status === "active" && new Date(b.tglKembali) >= new Date();
      if (currentBorrowFilter === "returned") return b.status === "returned";
      if (currentBorrowFilter === "overdue") return b.status === "active" && new Date(b.tglKembali) < new Date();
      return true;
    });
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="t-empty">Tidak ada data peminjaman yang cocok.</td></tr>';
    return;
  }

  filtered.forEach(function (b) {
    var fmtD = function (s) {
      if (!s) return "-";
      return new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    };
    var isOverdue = b.status === "active" && new Date(b.tglKembali) < new Date();
    var statusClass = b.status === "returned" ? "status-returned" : isOverdue ? "status-overdue" : "status-active";
    var statusText = b.status === "returned" ? "Dikembalikan" : isOverdue ? "Terlambat" : "Aktif";

    var tr = document.createElement("tr");
    tr.innerHTML =
      '<td style="font-family:monospace;font-size:0.78rem;color:var(--text3);">' + (b.idTrans || (b.id ? b.id.slice(0, 8) : "—")) + '</td>' +
      '<td><span class="t-name">' + (b.userName || "-") + '</span><br><span class="t-sub">' + (b.userEmail || "") + '</span></td>' +
      '<td>' + (b.judul || "-") + '</td>' +
      '<td class="t-date">' + fmtD(b.tglPinjam) + '</td>' +
      '<td class="t-date">' + fmtD(b.tglKembali) + '</td>' +
      '<td><span class="status-badge ' + statusClass + '">' + statusText + '</span></td>' +
      '<td>' + (b.status !== "returned"
        ? '<button class="btn-return" data-id="' + b.id + '" data-trans="' + (b.idTrans || "") + '" data-buku-id="' + b.bukuId + '">Kembalikan</button>'
        : '<span style="color:var(--text3);font-size:0.82rem;">—</span>') + '</td>';
    tbody.appendChild(tr);
  });

  // Return book handler
  tbody.querySelectorAll(".btn-return").forEach(function (btn) {
    btn.addEventListener("click", async function () {
      var borrowId = btn.dataset.id;
      var idTrans = btn.dataset.trans;
      var bukuId = btn.dataset.bukuId;

      try {
        if (isAdminFirebaseReady && db) {
          await db.collection("borrows").doc(borrowId).update({
            status: "returned",
            returnedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          if (bukuId) {
            await db.collection("books").doc(bukuId).update({
              stok: firebase.firestore.FieldValue.increment(1)
            });
          }
        } else {
          // Local Mode
          var found = adminBorrows.find(function (x) { return x.id === borrowId || (idTrans && x.idTrans === idTrans); });
          if (found) {
            found.status = "returned";
            found.returnedAt = new Date().toISOString();
          }

          var bIdx = adminBooks.findIndex(function (x) { return x.id === (bukuId || (found && found.bukuId)); });
          if (bIdx !== -1) {
            adminBooks[bIdx].stok = (parseInt(adminBooks[bIdx].stok) || 0) + 1;
          }

          setStorage("LV_BOOKS", adminBooks);
          setStorage("LV_BORROWS", adminBorrows);

          renderAdminBorrows();
          renderAdminBooks();
          renderDashboard();
        }
        showAdminToast("Buku berhasil ditandai telah dikembalikan.", "ok");
      } catch (err) {
        showAdminToast("Error: " + err.message, "err");
      }
    });
  });
}

/* ================================================================
   ADMIN MEMBERS TABLE
================================================================ */
function renderAdminMembers(list) {
  var members = list || adminMembers;
  var tbody = document.getElementById("adminMemberTable");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (members.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="t-empty">Tidak ada data anggota.</td></tr>';
    return;
  }

  members.forEach(function (m, i) {
    var fmtD = function (ts) {
      if (!ts) return "-";
      var d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    };

    var borrowCount = adminBorrows.filter(function (b) {
      return b.userId === m.id || (m.email && b.userEmail === m.email);
    }).length;

    var tr = document.createElement("tr");
    tr.innerHTML =
      '<td>' + (i + 1) + '</td>' +
      '<td><span class="t-name">' + (m.nama || "-") + '</span></td>' +
      '<td style="font-family:monospace;font-size:0.84rem;">' + (m.nim || "-") + '</td>' +
      '<td>' + (m.email || "-") + '</td>' +
      '<td class="t-date">' + fmtD(m.createdAt) + '</td>' +
      '<td><span class="badge-borrow-count">' + borrowCount + ' buku</span></td>' +
      '<td><div class="action-btns">' +
        '<button class="btn-delete" data-id="' + m.id + '" title="Hapus"><i class="fa-solid fa-trash"></i></button>' +
      '</div></td>';
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".btn-delete").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var member = adminMembers.find(function (m) { return m.id === btn.dataset.id; });
      if (member) showDeleteMemberConfirm(member);
    });
  });
}

/* ================================================================
   ADMIN TOAST
================================================================ */
function showAdminToast(msg, tipe) {
  var container = document.getElementById("toastContainer");
  if (!container) return;

  var div = document.createElement("div");
  var iconMap = { ok: "fa-check", warn: "fa-triangle-exclamation", err: "fa-xmark" };
  var cls = tipe === "ok" ? "toast-ok" : tipe === "warn" ? "toast-warn" : "toast-err";

  div.className = "toast " + cls;
  div.innerHTML =
    '<div class="toast-icon"><i class="fa-solid ' + (iconMap[tipe] || "fa-info") + '"></i></div>' +
    '<span class="toast-text">' + msg + '</span>';

  container.appendChild(div);

  setTimeout(function () {
    div.classList.add("removing");
    setTimeout(function () { if (div.parentNode) div.remove(); }, 300);
  }, 4000);
}
