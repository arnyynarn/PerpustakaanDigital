"use strict";

/* ================================================================
   LibraVerse — script.js
   Client-side Logic with Real-time Sync & Firebase Support
================================================================ */

/* ================================================================
   STATE
================================================================ */
var katalogBuku = [];
var daftarPinjam = [];
var currentUser = null;
var batasPinjam = 14;
var isFirebaseReady = false;

var katClass = {
  "Teknologi": "g-tek", "Fiksi": "g-fik", "Sains": "g-sa",
  "Sejarah": "g-sej", "Bisnis": "g-bis", "Filsafat": "g-fil"
};

var katColors = {
  "Teknologi": "#6366f1", "Fiksi": "#a78bfa", "Sains": "#60a5fa",
  "Sejarah": "#f59e0b", "Bisnis": "#22c55e", "Filsafat": "#fb7185"
};

/* ================================================================
   LOCAL STORAGE SYNC HELPERS
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
    // Trigger local storage event for same-window updates if needed
  } catch (e) {
    console.error("Storage error:", e);
  }
}

/* ================================================================
   INIT
================================================================ */
window.addEventListener("load", function () {
  setTimeout(function () {
    var loader = document.getElementById("loader");
    if (loader) loader.classList.add("gone");
  }, 1000);

  setDefaultDate();
  pasangEvents();
  setupScrollEffects();
  checkConnectionAndInit();

  // Listen to cross-tab updates (e.g. Admin changes book stock or borrows)
  window.addEventListener("storage", function (e) {
    if (e.key === "LV_BOOKS" || e.key === "LV_BORROWS") {
      if (!isFirebaseReady) {
        syncFromLocalStorage();
      }
    }
  });
});

/* ================================================================
   CONNECTION & DATA INITIALIZATION
================================================================ */
function checkConnectionAndInit() {
  if (isFirebaseConfigured() && db && auth) {
    // Attempt Firestore connection
    db.collection("books").limit(1).get().then(function () {
      isFirebaseReady = true;
      updateConnectionStatus("cloud");
      setupFirebaseListeners();
      setupAuthListener();
    }).catch(function (err) {
      console.warn("Firestore unreachable, falling back to Local Mode:", err.message);
      initLocalMode();
    });
  } else {
    // Local Mode with full realtime cross-tab storage sync
    initLocalMode();
  }
}

function initLocalMode() {
  isFirebaseReady = false;
  updateConnectionStatus("local");

  // Load books
  var storedBooks = getStorage("LV_BOOKS", null);
  if (!storedBooks || storedBooks.length === 0) {
    storedBooks = (typeof SEED_BOOKS !== "undefined") ? SEED_BOOKS.slice() : [];
    setStorage("LV_BOOKS", storedBooks);
  }
  katalogBuku = storedBooks;

  // Load borrows
  var storedBorrows = getStorage("LV_BORROWS", null);
  if (!storedBorrows) {
    storedBorrows = (typeof SEED_BORROWS !== "undefined") ? SEED_BORROWS.slice() : [];
    setStorage("LV_BORROWS", storedBorrows);
  }
  daftarPinjam = storedBorrows;

  // Load members if not existing
  var storedMembers = getStorage("LV_MEMBERS", null);
  if (!storedMembers) {
    storedMembers = (typeof SEED_MEMBERS !== "undefined") ? SEED_MEMBERS.slice() : [];
    setStorage("LV_MEMBERS", storedMembers);
  }

  // Restore logged in user
  var sessionUser = getStorage("LV_AUTH_USER", null);
  if (sessionUser) {
    currentUser = sessionUser;
  }

  updateNavUser();
  renderBuku(katalogBuku);
  populateDropdown();
  populateGenreFilter();
  renderTable();
  updateHeroStats();
}

function syncFromLocalStorage() {
  var b = getStorage("LV_BOOKS", katalogBuku);
  var br = getStorage("LV_BORROWS", daftarPinjam);
  katalogBuku = b;
  daftarPinjam = br;
  renderBuku(katalogBuku);
  populateDropdown();
  populateGenreFilter();
  renderTable();
  updateHeroStats();
}

function updateConnectionStatus(mode) {
  var dot = document.getElementById("sysDot");
  var label = document.getElementById("sysLabel");
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

/* ================================================================
   FIREBASE LISTENERS (CLOUD MODE)
================================================================ */
function setupFirebaseListeners() {
  // Books listener
  try {
    db.collection("books").onSnapshot(function (snap) {
      katalogBuku = [];
      snap.forEach(function (doc) {
        katalogBuku.push(Object.assign({ id: doc.id }, doc.data()));
      });
      katalogBuku.sort(function (a, b) { return (a.judul || "").localeCompare(b.judul || ""); });
      setStorage("LV_BOOKS", katalogBuku);
      renderBuku(katalogBuku);
      populateDropdown();
      populateGenreFilter();
      updateHeroStats();
    }, function (err) {
      console.warn("Books listener error:", err);
    });
  } catch (e) {
    console.warn("Error setting books listener:", e);
  }

  // Borrows listener
  try {
    db.collection("borrows").onSnapshot(function (snap) {
      daftarPinjam = [];
      snap.forEach(function (doc) {
        daftarPinjam.push(Object.assign({ id: doc.id }, doc.data()));
      });
      setStorage("LV_BORROWS", daftarPinjam);
      renderTable();
      updateHeroStats();
    }, function (err) {
      console.warn("Borrows listener error:", err);
    });
  } catch (e) {
    console.warn("Error setting borrows listener:", e);
  }
}

function setupAuthListener() {
  auth.onAuthStateChanged(function (user) {
    if (user) {
      currentUser = {
        uid: user.uid,
        displayName: user.displayName || user.email.split("@")[0],
        email: user.email
      };
      setStorage("LV_AUTH_USER", currentUser);
    } else {
      currentUser = null;
      setStorage("LV_AUTH_USER", null);
    }
    updateNavUser();
    renderTable();
  });
}

/* ================================================================
   NAV USER & AUTH UI
================================================================ */
function updateNavUser() {
  var navUser = document.getElementById("navUser");
  var btnLogin = document.getElementById("btnLoginNav");
  var avatar = document.getElementById("userAvatar");
  var dName = document.getElementById("dropdownName");
  var dEmail = document.getElementById("dropdownEmail");

  if (!navUser || !btnLogin) return;

  if (currentUser) {
    navUser.style.display = "block";
    btnLogin.style.display = "none";
    var name = currentUser.displayName || (currentUser.email ? currentUser.email.split("@")[0] : "Anggota");
    if (avatar) avatar.textContent = name.charAt(0).toUpperCase();
    if (dName) dName.textContent = name;
    if (dEmail) dEmail.textContent = currentUser.email || (currentUser.nim ? "NIM: " + currentUser.nim : "Anggota");
  } else {
    navUser.style.display = "none";
    btnLogin.style.display = "inline-flex";
  }
}

/* ================================================================
   UTILITIES
================================================================ */
function setDefaultDate() {
  var hari = new Date().toISOString().split("T")[0];
  var el = document.getElementById("inputTgl");
  if (el) {
    el.value = hari;
    el.min = hari;
  }
}

function updateHeroStats() {
  var totalBooks = katalogBuku.length;
  var activeCount = daftarPinjam.filter(function (p) { return p.status === "active"; }).length;
  animateCounter("heroTotalBooks", totalBooks);
  animateCounter("heroActiveBorrows", activeCount);

  // Members count
  if (isFirebaseReady && db) {
    db.collection("users").get().then(function (snap) {
      animateCounter("heroTotalMembers", snap.size);
    }).catch(function () {
      var members = getStorage("LV_MEMBERS", []);
      animateCounter("heroTotalMembers", members.length);
    });
  } else {
    var members = getStorage("LV_MEMBERS", []);
    animateCounter("heroTotalMembers", members.length || 4);
  }
}

function animateCounter(elId, target) {
  var el = document.getElementById(elId);
  if (!el) return;
  var start = parseInt(el.textContent) || 0;
  if (start === target) return;
  var dur = 700;
  var startTime = null;

  function step(now) {
    if (!startTime) startTime = now;
    var progress = Math.min((now - startTime) / dur, 1);
    var eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (target - start) * eased);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target;
  }
  requestAnimationFrame(step);
}

/* ================================================================
   SCROLL EFFECTS
================================================================ */
function setupScrollEffects() {
  window.addEventListener("scroll", function () {
    var nav = document.getElementById("nav");
    if (nav) nav.classList.toggle("solid", window.scrollY > 40);
    updateActiveNavLink();
  });
}

function updateActiveNavLink() {
  var sections = ["hero", "catalog", "pinjam", "riwayat"];
  var links = document.querySelectorAll(".nav-link");
  var current = "";
  sections.forEach(function (id) {
    var el = document.getElementById(id);
    if (el && el.getBoundingClientRect().top <= 140) current = id;
  });
  links.forEach(function (link) {
    var href = link.getAttribute("href");
    if (href && href.startsWith("#")) {
      link.classList.toggle("active", href === "#" + current);
    }
  });
}

/* ================================================================
   RENDER BOOKS
================================================================ */
function renderBuku(list) {
  var grid = document.getElementById("bookGrid");
  if (!grid) return;
  grid.innerHTML = "";

  var count = document.getElementById("catalogCount");
  if (count) count.textContent = list.length + " buku ditemukan";

  if (list.length === 0) {
    grid.innerHTML = '<div class="empty-grid"><i class="fa-solid fa-book-open" style="font-size:2rem;opacity:0.3;margin-bottom:12px;display:block;"></i>Tidak ada buku yang sesuai pencarian.</div>';
    return;
  }

  list.forEach(function (b) {
    var ada = b.stok > 0;
    var sKls = b.stok === 0 ? "stok-nil" : b.stok <= 2 ? "stok-low" : "stok-ok";
    var sTxt = b.stok === 0 ? "Stok Habis" : b.stok + " tersisa";
    var gKls = katClass[b.kat] || "";

    var card = document.createElement("div");
    card.className = "book-card";
    card.dataset.kat = b.kat;
    card.dataset.id = b.id;

    var thumbContent = b.gambar
      ? '<img src="' + b.gambar + '" alt="' + b.judul + '" loading="lazy" onerror="this.onerror=null;this.parentElement.innerHTML=\'<i class=\\\'fa-solid fa-book\\\' style=\\\'font-size:2.5rem;color:var(--text3);\\\'></i>\'">'
      : '<i class="fa-solid fa-book" style="font-size:2.5rem;color:var(--text3);"></i>';

    card.innerHTML =
      '<div class="book-thumb">' + thumbContent + '</div>' +
      '<div class="book-body">' +
        '<p class="book-genre ' + gKls + '">' + b.kat + '</p>' +
        '<h3 class="book-judul">' + b.judul + '</h3>' +
        '<p class="book-penulis">' + b.penulis + '</p>' +
        '<p class="book-rating">★ ' + (b.rating || "N/A") + '</p>' +
      '</div>' +
      '<div class="book-foot">' +
        '<span class="' + sKls + '">' + sTxt + '</span>' +
        '<button class="btn-card ' + (ada ? "avail" : "full") + '" data-id="' + b.id + '"' +
        (!ada ? " disabled" : "") + '>' + (ada ? '<i class="fa-solid fa-hand-holding-heart"></i> Pinjam' : 'Habis') + '</button>' +
      '</div>';

    // Click card to show detail
    card.addEventListener("click", function (e) {
      if (e.target.closest(".btn-card")) return;
      showBookDetail(b);
    });

    grid.appendChild(card);
  });

  // Borrow button in card
  grid.querySelectorAll(".btn-card.avail").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var id = e.currentTarget.dataset.id;
      var sel = document.getElementById("inputBuku");
      if (sel) sel.value = id;
      var target = document.getElementById("pinjam");
      if (target) target.scrollIntoView({ behavior: "smooth" });
      var panel = document.querySelector(".form-box");
      if (panel) {
        panel.style.borderColor = "rgba(99,102,241,0.5)";
        panel.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.15)";
        setTimeout(function () {
          panel.style.borderColor = "";
          panel.style.boxShadow = "";
        }, 1800);
      }
    });
  });
}

/* ================================================================
   BOOK DETAIL MODAL
================================================================ */
function showBookDetail(b) {
  var modal = document.getElementById("bookModal");
  var content = document.getElementById("bookModalContent");
  if (!modal || !content) return;

  var coverHtml = b.gambar
    ? '<img src="' + b.gambar + '" alt="' + b.judul + '" onerror="this.onerror=null;this.parentElement.innerHTML=\'<i class=\\\'fa-solid fa-book\\\' style=\\\'font-size:3rem;color:var(--text3);\\\'></i>\'">'
    : '<div style="display:flex;align-items:center;justify-content:center;height:100%;"><i class="fa-solid fa-book" style="font-size:3rem;color:var(--text3);"></i></div>';

  var gKls = katClass[b.kat] || "";
  var ada = b.stok > 0;

  content.innerHTML =
    '<div class="bdm-cover">' + coverHtml + '</div>' +
    '<div class="bdm-body">' +
      '<p class="bdm-genre book-genre ' + gKls + '">' + b.kat + '</p>' +
      '<h3 class="bdm-title">' + b.judul + '</h3>' +
      '<p class="bdm-author">oleh ' + b.penulis + '</p>' +
      (b.deskripsi ? '<p class="bdm-desc">' + b.deskripsi + '</p>' : '') +
      '<div class="bdm-meta">' +
        '<div class="bdm-meta-item"><p class="bdm-meta-label">Rating</p><p class="bdm-meta-value">★ ' + (b.rating || "N/A") + '</p></div>' +
        '<div class="bdm-meta-item"><p class="bdm-meta-label">Stok</p><p class="bdm-meta-value" style="color:' + (ada ? "var(--success)" : "var(--danger)") + '">' + b.stok + ' eksemplar</p></div>' +
      '</div>' +
      (ada ? '<button class="btn btn-primary btn-full btn-borrow-detail" data-id="' + b.id + '"><i class="fa-solid fa-hand-holding-heart"></i> Pinjam Buku Ini</button>' :
        '<button class="btn btn-ghost btn-full" disabled>Stok Habis</button>') +
    '</div>';

  modal.classList.add("active");

  var borrowBtn = content.querySelector(".btn-borrow-detail");
  if (borrowBtn) {
    borrowBtn.addEventListener("click", function () {
      modal.classList.remove("active");
      var sel = document.getElementById("inputBuku");
      if (sel) sel.value = b.id;
      var target = document.getElementById("pinjam");
      if (target) target.scrollIntoView({ behavior: "smooth" });
    });
  }
}

/* ================================================================
   POPULATE DROPDOWNS
================================================================ */
function populateDropdown() {
  var sel = document.getElementById("inputBuku");
  if (!sel) return;
  var currentVal = sel.value;
  sel.innerHTML = '<option value="">-- Pilih buku --</option>';
  katalogBuku.forEach(function (b) {
    if (b.stok > 0) {
      var opt = document.createElement("option");
      opt.value = b.id;
      opt.textContent = b.judul + " (" + b.stok + " tersisa)";
      sel.appendChild(opt);
    }
  });
  if (currentVal) sel.value = currentVal;
}

function populateGenreFilter() {
  var sel = document.getElementById("catFilter");
  if (!sel) return;
  var currentVal = sel.value;
  var genres = new Set();
  katalogBuku.forEach(function (b) { genres.add(b.kat); });
  sel.innerHTML = '<option value="">Semua Genre</option>';
  genres.forEach(function (g) {
    var opt = document.createElement("option");
    opt.value = g;
    opt.textContent = g;
    sel.appendChild(opt);
  });
  if (currentVal) sel.value = currentVal;
}

/* ================================================================
   EVENTS
================================================================ */
function pasangEvents() {
  // Search & filter
  var searchInput = document.getElementById("searchInput");
  var catFilter = document.getElementById("catFilter");
  if (searchInput) searchInput.addEventListener("input", filterBuku);
  if (catFilter) catFilter.addEventListener("change", filterBuku);

  // Form submit
  var form = document.getElementById("borrowForm");
  if (form) form.addEventListener("submit", handleSubmit);

  // Hamburger menu
  var burger = document.getElementById("navBurger");
  if (burger) burger.addEventListener("click", toggleMenu);

  // Auth Modal Open/Close
  var btnLoginNav = document.getElementById("btnLoginNav");
  if (btnLoginNav) {
    btnLoginNav.addEventListener("click", function () {
      document.getElementById("authModal").classList.add("active");
    });
  }

  var authClose = document.getElementById("authClose");
  if (authClose) {
    authClose.addEventListener("click", function () {
      document.getElementById("authModal").classList.remove("active");
    });
  }

  // Auth Tabs (Masuk vs Daftar)
  document.querySelectorAll(".auth-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      var target = this.dataset.tab;
      document.querySelectorAll(".auth-tab").forEach(function (t) { t.classList.remove("active"); });
      this.classList.add("active");
      document.querySelectorAll(".auth-form").forEach(function (f) { f.classList.remove("active"); });
      var targetForm = document.getElementById(target === "login" ? "loginForm" : "registerForm");
      if (targetForm) targetForm.classList.add("active");
    });
  });

  // Auth switch links
  document.querySelectorAll("[data-switch]").forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      var target = this.dataset.switch;
      document.querySelectorAll(".auth-tab").forEach(function (t) {
        t.classList.toggle("active", t.dataset.tab === target);
      });
      document.querySelectorAll(".auth-form").forEach(function (f) { f.classList.remove("active"); });
      var targetForm = document.getElementById(target === "login" ? "loginForm" : "registerForm");
      if (targetForm) targetForm.classList.add("active");
    });
  });

  // Login form submit
  var loginForm = document.getElementById("loginForm");
  if (loginForm) loginForm.addEventListener("submit", handleLogin);

  // Register form submit
  var registerForm = document.getElementById("registerForm");
  if (registerForm) registerForm.addEventListener("submit", handleRegister);

  // Logout button
  var btnLogout = document.getElementById("btnLogout");
  if (btnLogout) btnLogout.addEventListener("click", handleLogout);

  // User avatar dropdown toggle
  var navUser = document.getElementById("navUser");
  var userAvatar = document.getElementById("userAvatar");
  if (userAvatar && navUser) {
    userAvatar.addEventListener("click", function (e) {
      e.stopPropagation();
      var dropdown = document.getElementById("userDropdown");
      if (dropdown) {
        var isVisible = dropdown.style.display === "block";
        dropdown.style.display = isVisible ? "none" : "block";
      }
    });
  }

  // Close dropdown on click outside
  document.addEventListener("click", function (e) {
    var dropdown = document.getElementById("userDropdown");
    if (dropdown && !e.target.closest("#navUser")) {
      dropdown.style.display = "none";
    }
  });

  // Book detail modal close
  var bookClose = document.getElementById("bookModalClose");
  if (bookClose) {
    bookClose.addEventListener("click", function () {
      document.getElementById("bookModal").classList.remove("active");
    });
  }

  // Close modals on backdrop click
  document.querySelectorAll(".modal-overlay").forEach(function (overlay) {
    overlay.addEventListener("click", function (e) {
      if (e.target === this) this.classList.remove("active");
    });
  });

  // Footer login link
  var footerLogin = document.getElementById("footerLogin");
  if (footerLogin) {
    footerLogin.addEventListener("click", function (e) {
      e.preventDefault();
      document.getElementById("authModal").classList.add("active");
    });
  }

  // View toggle (Grid vs List)
  var viewGrid = document.getElementById("viewGrid");
  var viewList = document.getElementById("viewList");
  var bookGrid = document.getElementById("bookGrid");
  if (viewGrid && viewList && bookGrid) {
    viewGrid.addEventListener("click", function () {
      viewGrid.classList.add("active");
      viewList.classList.remove("active");
      bookGrid.classList.remove("list-view");
    });
    viewList.addEventListener("click", function () {
      viewList.classList.add("active");
      viewGrid.classList.remove("active");
      bookGrid.classList.add("list-view");
    });
  }
}

/* ================================================================
   AUTH HANDLERS
================================================================ */
function handleLogin(e) {
  e.preventDefault();
  var email = document.getElementById("loginEmail").value.trim();
  var password = document.getElementById("loginPassword").value;

  var btn = e.target.querySelector("button[type=submit]");
  if (btn) { btn.classList.add("loading"); btn.disabled = true; }

  if (isFirebaseReady && auth) {
    auth.signInWithEmailAndPassword(email, password)
      .then(function () {
        showToast("Berhasil masuk!", "ok");
        document.getElementById("authModal").classList.remove("active");
        e.target.reset();
      })
      .catch(function (err) {
        var msg = "Gagal masuk.";
        if (err.code === "auth/user-not-found") msg = "Akun tidak ditemukan.";
        if (err.code === "auth/wrong-password") msg = "Password salah.";
        if (err.code === "auth/invalid-email") msg = "Format email tidak valid.";
        if (err.code === "auth/invalid-credential") msg = "Email atau password salah.";
        showToast(msg, "err");
      })
      .finally(function () {
        if (btn) { btn.classList.remove("loading"); btn.disabled = false; }
      });
  } else {
    // Local Auth Mode
    setTimeout(function () {
      var members = getStorage("LV_MEMBERS", []);
      var found = members.find(function (m) { return m.email.toLowerCase() === email.toLowerCase(); });

      currentUser = {
        uid: found ? found.id : "usr_" + Date.now(),
        displayName: found ? found.nama : email.split("@")[0],
        email: email,
        nim: found ? found.nim : "202401999"
      };

      setStorage("LV_AUTH_USER", currentUser);
      updateNavUser();
      renderTable();
      showToast("Selamat datang, " + currentUser.displayName + "!", "ok");
      document.getElementById("authModal").classList.remove("active");
      e.target.reset();

      if (btn) { btn.classList.remove("loading"); btn.disabled = false; }
    }, 400);
  }
}

function handleRegister(e) {
  e.preventDefault();
  var nama = document.getElementById("regNama").value.trim();
  var nim = document.getElementById("regNIM").value.trim();
  var email = document.getElementById("regEmail").value.trim();
  var password = document.getElementById("regPassword").value;

  if (nama.length < 3) { showToast("Nama minimal 3 karakter.", "warn"); return; }
  if (!nim) { showToast("NIM harus diisi.", "warn"); return; }
  if (password.length < 6) { showToast("Password minimal 6 karakter.", "warn"); return; }

  var btn = e.target.querySelector("button[type=submit]");
  if (btn) { btn.classList.add("loading"); btn.disabled = true; }

  if (isFirebaseReady && auth) {
    auth.createUserWithEmailAndPassword(email, password)
      .then(function (cred) {
        return cred.user.updateProfile({ displayName: nama }).then(function () {
          return db.collection("users").doc(cred.user.uid).set({
            nama: nama,
            nim: nim,
            email: email,
            role: "member",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        });
      })
      .then(function () {
        showToast("Akun berhasil dibuat! Selamat datang, " + nama + ".", "ok");
        document.getElementById("authModal").classList.remove("active");
        e.target.reset();
      })
      .catch(function (err) {
        var msg = "Gagal mendaftar: " + err.message;
        if (err.code === "auth/email-already-in-use") msg = "Email sudah digunakan.";
        if (err.code === "auth/weak-password") msg = "Password terlalu lemah (min 6 karakter).";
        showToast(msg, "err");
      })
      .finally(function () {
        if (btn) { btn.classList.remove("loading"); btn.disabled = false; }
      });
  } else {
    // Local Register Mode
    setTimeout(function () {
      var members = getStorage("LV_MEMBERS", []);
      var newMember = {
        id: "usr_" + Date.now(),
        nama: nama,
        nim: nim,
        email: email,
        role: "member",
        createdAt: new Date().toISOString()
      };
      members.unshift(newMember);
      setStorage("LV_MEMBERS", members);

      currentUser = {
        uid: newMember.id,
        displayName: nama,
        email: email,
        nim: nim
      };
      setStorage("LV_AUTH_USER", currentUser);

      updateNavUser();
      updateHeroStats();
      renderTable();
      showToast("Pendaftaran berhasil! Selamat datang, " + nama + ".", "ok");
      document.getElementById("authModal").classList.remove("active");
      e.target.reset();

      if (btn) { btn.classList.remove("loading"); btn.disabled = false; }
    }, 400);
  }
}

function handleLogout() {
  if (isFirebaseReady && auth) {
    auth.signOut().then(function () {
      currentUser = null;
      setStorage("LV_AUTH_USER", null);
      updateNavUser();
      renderTable();
      showToast("Berhasil keluar.", "ok");
    });
  } else {
    currentUser = null;
    setStorage("LV_AUTH_USER", null);
    updateNavUser();
    renderTable();
    showToast("Berhasil keluar.", "ok");
  }
}

/* ================================================================
   FILTER
================================================================ */
function filterBuku() {
  var q = document.getElementById("searchInput").value.toLowerCase().trim();
  var kat = document.getElementById("catFilter").value;

  var hasil = katalogBuku.filter(function (b) {
    var cocokQ = b.judul.toLowerCase().includes(q) || b.penulis.toLowerCase().includes(q);
    var cocokK = !kat || b.kat === kat;
    return cocokQ && cocokK;
  });

  renderBuku(hasil);
}

/* ================================================================
   VALIDATION & SUBMIT
================================================================ */
function validasi() {
  var ok = true;

  ["eBuku", "eDurasi", "eTgl"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove("show");
  });
  ["inputBuku", "inputDurasi", "inputTgl"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove("err");
  });

  var bukuId = document.getElementById("inputBuku").value;
  var durasi = parseInt(document.getElementById("inputDurasi").value);
  var tgl = document.getElementById("inputTgl").value;

  if (!bukuId) {
    document.getElementById("eBuku").classList.add("show");
    document.getElementById("inputBuku").classList.add("err");
    ok = false;
  }
  if (!durasi || durasi < 1 || durasi > batasPinjam) {
    document.getElementById("eDurasi").classList.add("show");
    document.getElementById("inputDurasi").classList.add("err");
    ok = false;
  }
  if (!tgl) {
    document.getElementById("eTgl").classList.add("show");
    document.getElementById("inputTgl").classList.add("err");
    ok = false;
  }

  // Check stock
  if (bukuId) {
    var buku = katalogBuku.find(function (b) { return b.id === bukuId; });
    if (buku && buku.stok <= 0) {
      showToast("Stok buku ini sudah habis.", "warn");
      ok = false;
    }
  }

  return ok;
}

function handleSubmit(e) {
  e.preventDefault();

  if (!currentUser) {
    showToast("Silakan masuk atau daftar akun terlebih dahulu untuk meminjam buku.", "warn");
    document.getElementById("authModal").classList.add("active");
    return;
  }

  if (!validasi()) return;

  var btn = document.getElementById("btnSubmit");
  if (btn) {
    btn.classList.add("loading");
    btn.disabled = true;
  }

  setTimeout(function () {
    prosesPinjam().finally(function () {
      if (btn) {
        btn.classList.remove("loading");
        btn.disabled = false;
      }
    });
  }, 600);
}

/* ================================================================
   PROCESS BORROW
================================================================ */
async function prosesPinjam() {
  var bukuId = document.getElementById("inputBuku").value;
  var durasi = parseInt(document.getElementById("inputDurasi").value);
  var tgl = document.getElementById("inputTgl").value;

  var buku = katalogBuku.find(function (b) { return b.id === bukuId; });
  if (!buku) { showToast("Buku tidak ditemukan.", "err"); return; }

  var tPinjam = new Date(tgl);
  var tKembali = new Date(tPinjam);
  tKembali.setDate(tKembali.getDate() + durasi);

  var fmt = function (d) {
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  };

  var idTrans = "LV" + Date.now().toString().slice(-6);
  var catatan = durasi <= 7
    ? "Durasi peminjaman normal (1 minggu). Tidak ada potensi denda."
    : "Durasi peminjaman maksimal (2 minggu). Mohon kembalikan tepat waktu!";

  var borrowData = {
    userId: currentUser ? (currentUser.uid || currentUser.id) : "guest",
    userName: currentUser ? currentUser.displayName : "Tamu",
    userEmail: currentUser ? currentUser.email : "",
    bukuId: bukuId,
    judul: buku.judul,
    durasi: durasi,
    tglPinjam: tgl,
    tglKembali: tKembali.toISOString().split("T")[0],
    status: "active",
    idTrans: idTrans,
    createdAt: isFirebaseReady ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString()
  };

  try {
    if (isFirebaseReady && db) {
      // Cloud Firestore
      await db.collection("borrows").add(borrowData);
      await db.collection("books").doc(bukuId).update({
        stok: firebase.firestore.FieldValue.increment(-1)
      });
    } else {
      // Local Mode
      buku.stok = Math.max(0, buku.stok - 1);
      daftarPinjam.unshift(Object.assign({ id: idTrans }, borrowData));
      setStorage("LV_BOOKS", katalogBuku);
      setStorage("LV_BORROWS", daftarPinjam);

      renderBuku(katalogBuku);
      populateDropdown();
      renderTable();
      updateHeroStats();
    }

    // Show receipt ticket
    showStruk({
      idTrans: idTrans,
      nama: borrowData.userName,
      judul: buku.judul,
      kat: buku.kat,
      durasi: durasi,
      tglPinjam: fmt(tPinjam),
      tglKembali: fmt(tKembali),
      stokSisa: buku.stok,
      catatan: catatan
    });

    // Reset form
    document.getElementById("borrowForm").reset();
    setDefaultDate();
    showToast('Peminjaman berhasil! "' + buku.judul + '" telah dicatat.', "ok");

  } catch (err) {
    console.error("Borrow error:", err);
    showToast("Gagal memproses peminjaman: " + err.message, "err");
  }
}

/* ================================================================
   RECEIPT
================================================================ */
function showStruk(d) {
  var wrap = document.getElementById("outputWrap");
  if (!wrap) return;
  var ph = document.getElementById("outputPH");
  if (ph) ph.remove();

  var div = document.createElement("div");
  div.className = "receipt";
  div.innerHTML =
    '<div class="receipt-top"></div>' +
    '<div class="receipt-body">' +
      '<div class="receipt-head">' +
        '<div class="receipt-icon"><i class="fa-solid fa-check"></i></div>' +
        '<div>' +
          '<p class="receipt-title">Peminjaman Dikonfirmasi</p>' +
          '<p class="receipt-id">ID: ' + d.idTrans + '</p>' +
        '</div>' +
      '</div>' +
      '<hr class="receipt-divider"/>' +
      '<div class="receipt-row"><span class="receipt-key">Peminjam</span><span class="receipt-val">' + d.nama + '</span></div>' +
      '<div class="receipt-row"><span class="receipt-key">Buku</span><span class="receipt-val">' + d.judul + '</span></div>' +
      '<div class="receipt-row"><span class="receipt-key">Genre</span><span class="receipt-val">' + d.kat + '</span></div>' +
      '<div class="receipt-row"><span class="receipt-key">Tgl. Pinjam</span><span class="receipt-val">' + d.tglPinjam + '</span></div>' +
      '<div class="receipt-row"><span class="receipt-key">Tgl. Kembali</span><span class="receipt-val hi">' + d.tglKembali + '</span></div>' +
      '<div class="receipt-row"><span class="receipt-key">Durasi</span><span class="receipt-val">' + d.durasi + ' hari</span></div>' +
      '<div class="receipt-row"><span class="receipt-key">Sisa Stok</span><span class="receipt-val">' + d.stokSisa + ' buku</span></div>' +
      '<div class="receipt-note">' + d.catatan + '</div>' +
    '</div>';

  wrap.insertBefore(div, wrap.firstChild);

  var all = wrap.querySelectorAll(".receipt");
  if (all.length > 3) all[all.length - 1].remove();
}

/* ================================================================
   TOAST
================================================================ */
function showToast(msg, tipe) {
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

/* ================================================================
   TABLE (RIWAYAT PEMINJAMAN)
================================================================ */
function renderTable() {
  var tbody = document.getElementById("tblBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  var userBorrows = daftarPinjam;
  if (currentUser) {
    var uid = currentUser.uid || currentUser.id;
    userBorrows = daftarPinjam.filter(function (p) {
      return p.userId === uid || (p.userEmail && p.userEmail === currentUser.email);
    });
  }

  if (userBorrows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="t-empty"><i class="fa-solid fa-inbox" style="font-size:1.5rem;opacity:0.3;display:block;margin-bottom:8px;"></i>' +
      (currentUser ? 'Anda belum memiliki riwayat peminjaman.' : 'Silakan login untuk melihat riwayat peminjaman Anda.') +
      '</td></tr>';
    return;
  }

  userBorrows.forEach(function (p, i) {
    var fmtD = function (s) {
      if (!s) return "-";
      return new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    };
    var isOverdue = p.status === "active" && new Date(p.tglKembali) < new Date();
    var statusClass = p.status === "returned" ? "status-returned" : isOverdue ? "status-overdue" : "status-active";
    var statusText = p.status === "returned" ? "Dikembalikan" : isOverdue ? "Terlambat" : "Aktif";

    var tr = document.createElement("tr");
    tr.innerHTML =
      '<td>' + (i + 1) + '</td>' +
      '<td class="t-name">' + p.judul + '</td>' +
      '<td class="t-date">' + fmtD(p.tglPinjam) + '</td>' +
      '<td class="t-date">' + fmtD(p.tglKembali) + '</td>' +
      '<td>' + p.durasi + ' hari</td>' +
      '<td><span class="status-badge ' + statusClass + '">' + statusText + '</span></td>' +
      '<td>' + (p.status !== "returned" ? '<button class="btn-return" data-id="' + (p.id || p.idTrans) + '">Kembalikan</button>' : '<span style="color:var(--text3);font-size:0.82rem;">—</span>') + '</td>';
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".btn-return").forEach(function (btn) {
    btn.addEventListener("click", handleKembali);
  });
}

/* ================================================================
   RETURN BOOK
================================================================ */
async function handleKembali(e) {
  var borrowId = e.currentTarget.dataset.id;
  var p = daftarPinjam.find(function (x) { return x.id === borrowId || x.idTrans === borrowId; });
  if (!p) return;

  try {
    if (isFirebaseReady && db) {
      await db.collection("borrows").doc(p.id).update({
        status: "returned",
        returnedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await db.collection("books").doc(p.bukuId).update({
        stok: firebase.firestore.FieldValue.increment(1)
      });
    } else {
      p.status = "returned";
      p.returnedAt = new Date().toISOString();
      var buku = katalogBuku.find(function (b) { return b.id === p.bukuId; });
      if (buku) buku.stok = buku.stok + 1;

      setStorage("LV_BOOKS", katalogBuku);
      setStorage("LV_BORROWS", daftarPinjam);

      renderBuku(katalogBuku);
      populateDropdown();
      renderTable();
      updateHeroStats();
    }
    showToast('"' + p.judul + '" berhasil dikembalikan.', "ok");
  } catch (err) {
    showToast("Gagal mengembalikan buku: " + err.message, "err");
  }
}

/* ================================================================
   MOBILE MENU
================================================================ */
function toggleMenu() {
  var menu = document.getElementById("mobileNav");
  var burger = document.getElementById("navBurger");
  if (!menu || !burger) return;
  var open = menu.classList.toggle("show");
  burger.classList.toggle("open", open);
}

function tutupMenu() {
  var menu = document.getElementById("mobileNav");
  var burger = document.getElementById("navBurger");
  if (menu) menu.classList.remove("show");
  if (burger) burger.classList.remove("open");
}
