/* MagicShelf web app. Plain JS, no build step. */
(function () {
  "use strict";

  // ---------- storage (every access guarded: it can throw or come back empty) ----------
  var LS = {
    get: function (k, fb) { try { var v = localStorage.getItem(k); return v === null ? fb : JSON.parse(v); } catch (e) { return fb; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  var K_LOG = "ms-pick-log-v1", K_SET = "ms-settings-v1", K_SORT = "ms-sort-v1", K_BOOKS = "ms-books-v1";

  // ---------- state ----------
  var books = LS.get(K_BOOKS, null) || window.MS_BOOKS.slice();
  var settings = Object.assign({ mode: "test", apiBase: "" }, LS.get(K_SET, {}));
  var sortBy = LS.get(K_SORT, "title");               // default: ตามชื่อ
  var log = LS.get(K_LOG, null);                       // [{id, t}]
  var demo = false;
  if (!Array.isArray(log)) {                           // first run: seed example numbers
    log = [];
    Object.keys(window.MS_DEMO_PICKS).forEach(function (id) {
      for (var i = 0; i < window.MS_DEMO_PICKS[id]; i++) log.push({ id: +id, t: 0 });
    });
    demo = true;
    LS.set(K_LOG, log);
    LS.set("ms-demo-v1", true);
  } else demo = LS.get("ms-demo-v1", false);

  var busy = null;                                     // {kind:'pick'|'scan', id?}
  var statusMsg = null;                                // {text, err, spin}
  var dashTab = "books", groupBy = "genre", selectedGroup = null;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var byId = function (id) { return books.filter(function (b) { return b.id === id; })[0]; };
  var cmp = function (a, b) { return String(a).localeCompare(String(b), "th"); };

  // ---------- cover colours by type ----------
  var COVER = { "นวนิยาย": "#8c4a3b", "วรรณกรรมเยาวชน": "#3f7a78", "สารคดี": "#5b5f86", "พัฒนาตนเอง": "#a8742f", "วิทยาศาสตร์": "#2f6a8c", "ตำราอาหาร": "#6b7d3a" };
  var coverColor = function (b) { return COVER[b.type] || "#7b5232"; };

  // ---------- book data in / out ----------
  // Accepts an array of books; drops rows without a title and fills missing fields. Returns [] if nothing usable.
  function normalizeBooks(arr) {
    if (!Array.isArray(arr)) return [];
    var seen = {}, out = [];
    arr.forEach(function (r, i) {
      if (!r || typeof r !== "object" || !String(r.title || "").trim()) return;
      var id = Number(r.id); if (!isFinite(id) || seen[id]) id = null;
      out.push({
        id: id, slot: Number(r.slot) > 0 ? Number(r.slot) : i + 1,
        title: String(r.title).trim(), author: String(r.author || "ไม่ระบุผู้แต่ง").trim(),
        type: String(r.type || "ไม่ระบุประเภท").trim(), genre: String(r.genre || "ไม่ระบุแนว").trim(),
        cover: /^(https?:|data:image\/)/.test(r.cover || "") ? r.cover : ""
      });
      if (id !== null) seen[id] = 1;
    });
    var next = 1;                                  // give every row without a usable id a fresh one
    out.forEach(function (b) { if (b.id === null) { while (seen[next]) next++; b.id = next; seen[next] = 1; } });
    return out;
  }

  function exportData() {
    var payload = { app: "MagicShelf", version: 1, exportedAt: new Date().toISOString(), books: books, log: log };
    var url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    var a = document.createElement("a");
    a.href = url; a.download = "magicshelf-data.json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    statusMsg = { text: "ส่งออกข้อมูลแล้ว: " + books.length + " เล่ม, สถิติ " + log.length + " ครั้ง" };
    renderShelf();
  }

  function importData(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var d = JSON.parse(reader.result);
        var list = normalizeBooks(Array.isArray(d) ? d : d.books);     // a bare array of books also works
        if (!list.length) throw new Error("ไม่พบรายการหนังสือในไฟล์");
        books = list; LS.set(K_BOOKS, books);
        if (d && Array.isArray(d.log)) {
          var ids = {}; books.forEach(function (b) { ids[b.id] = 1; });
          log = d.log.filter(function (e) { return e && ids[e.id]; }).map(function (e) { return { id: e.id, t: Number(e.t) || 0 }; });
          LS.set(K_LOG, log);
        }
        demo = false; LS.set("ms-demo-v1", false);
        statusMsg = { text: "นำเข้าข้อมูลแล้ว: หนังสือ " + books.length + " เล่ม" };
      } catch (e) {
        statusMsg = { err: true, text: "นำเข้าไม่สำเร็จ: " + (e && e.message ? e.message : "ไฟล์ไม่ถูกต้อง") };
      }
      renderShelf();
    };
    reader.onerror = function () { statusMsg = { err: true, text: "อ่านไฟล์ไม่สำเร็จ" }; renderShelf(); };
    reader.readAsText(file);
  }

  // ---------- shelf API: this is the only place that talks to the real shelf ----------
  // Test mode waits 2 s. Real mode POSTs and waits until the shelf replies that it has finished.
  var api = {
    send: function (path, payload) {
      if (settings.mode === "test") return sleep(2000).then(function () { return {}; });
      if (!settings.apiBase) return Promise.reject(new Error("ยังไม่ได้ตั้งที่อยู่ API ของชั้น (ปุ่มตั้งค่า)"));
      return fetch(settings.apiBase.replace(/\/$/, "") + path, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload || {})
      }).then(function (r) {
        if (!r.ok) throw new Error("ชั้นตอบกลับผิดพลาด (" + r.status + ")");
        return r.json().catch(function () { return {}; });
      });
    },
    pick: function (b) { return api.send("/pick", { id: b.id, slot: b.slot }); },
    scan: function () { return api.send("/scan", {}); }
  };

  // ---------- sorting ----------
  function sortedBooks() {
    var a = books.slice();
    if (sortBy === "slot") a.sort(function (x, y) { return x.slot - y.slot; });
    else if (sortBy === "category") a.sort(function (x, y) { return cmp(x.type, y.type) || cmp(x.genre, y.genre) || cmp(x.title, y.title); });
    else a.sort(function (x, y) { return cmp(x.title, y.title); });
    return a;
  }

  // ---------- home ----------
  function coverHtml(b) {
    var img = b.cover ? '<img src="' + esc(b.cover) + '" alt="" loading="lazy">' : "";
    return '<div class="cover" style="background:linear-gradient(160deg,' + coverColor(b) + ',' + coverColor(b) + 'cc)">' + img +
      (b.cover ? "" : '<div class="ct clamp2">' + esc(b.title) + '</div><div class="ca clamp2">' + esc(b.author) + "</div>") + "</div>";
  }

  function bookHtml(b) {
    var active = busy && busy.kind === "pick" && busy.id === b.id;
    var label = active ? '<span class="spin" style="border-color:#fff;border-right-color:transparent"></span>กำลังทำงาน' : "เลือกเล่มนี้";
    return '<article class="book' + (active ? " active" : "") + '">' +
      '<div class="cover-wrap"><span class="slot" title="ตำแหน่งบนชั้นจากซ้าย">ช่อง ' + b.slot + "</span>" + coverHtml(b) + "</div>" +
      '<div class="info"><div class="t clamp2" title="' + esc(b.title) + '">' + esc(b.title) + '</div><div class="a clamp2" title="' + esc(b.author) + '">' + esc(b.author) + "</div>" +
      '<div class="tags"><span class="tag" title="' + esc(b.type) + '">' + esc(b.type) + '</span><span class="tag genre" title="' + esc(b.genre) + '">' + esc(b.genre) + "</span></div></div>" +
      '<button class="pick" data-id="' + b.id + '"' + (busy ? " disabled" : "") + ' aria-label="เลือกหนังสือ ' + esc(b.title) + '">' + label + "</button></article>";
  }

  function renderShelf() {
    var list = sortedBooks(), html = "", last = null;
    list.forEach(function (b) {
      if (sortBy === "category" && b.type !== last) {
        last = b.type;
        var n = list.filter(function (x) { return x.type === last; }).length;
        html += '<div class="group"><h2>' + esc(last) + "</h2><span>" + n + " เล่ม</span></div>";
      }
      html += bookHtml(b);
    });
    $("#shelf").innerHTML = html || '<p class="empty">ไม่พบหนังสือบนชั้น ลองกดแสกน</p>';
    $$("[data-sort]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.sort === sortBy); });
    $("#scan-btn").disabled = !!busy;
    var scanLabel = $("#scan-btn span");
    scanLabel.textContent = busy && busy.kind === "scan" ? "กำลังแสกน…" : "แสกน";
    var st = $("#status");
    st.hidden = !statusMsg;
    if (statusMsg) {
      st.className = "status" + (statusMsg.err ? " err" : "");
      st.innerHTML = (statusMsg.spin ? '<span class="spin"></span>' : "") + "<span>" + esc(statusMsg.text) + "</span>";
    }
  }

  function run(kind, book) {
    if (busy) return;                                  // only one job at a time
    busy = { kind: kind, id: book && book.id };
    statusMsg = { spin: true, text: kind === "scan" ? "กำลังสั่งให้ชั้นแสกนหนังสือ…" : "ชั้นกำลังนำเล่ม “" + book.title + "” ออกมา (ช่อง " + book.slot + ")" };
    renderShelf();
    var job = kind === "scan" ? api.scan() : api.pick(book);
    job.then(function (res) {
      if (kind === "pick") {
        log.push({ id: book.id, t: Date.now() });
        LS.set(K_LOG, log);
        statusMsg = { text: "เสร็จแล้ว: นำเล่ม “" + book.title + "” ออกมาแล้ว" };
      } else {
        var scanned = normalizeBooks(res && res.books);
        if (scanned.length) { books = scanned; LS.set(K_BOOKS, books); }
        statusMsg = { text: "แสกนเสร็จแล้ว พบหนังสือ " + books.length + " เล่ม" };
      }
    }).catch(function (e) {
      statusMsg = { err: true, text: "ทำงานไม่สำเร็จ: " + (e && e.message ? e.message : "ไม่ทราบสาเหตุ") };
    }).then(function () {
      busy = null;
      renderShelf();
    });
  }

  // ---------- dashboard ----------
  function counts() {
    var c = {};
    log.forEach(function (e) { if (byId(e.id)) c[e.id] = (c[e.id] || 0) + 1; });
    return c;
  }

  function renderDash() {
    var c = counts(), total = Object.keys(c).reduce(function (s, k) { return s + c[k]; }, 0);
    var ranked = books.filter(function (b) { return c[b.id]; }).sort(function (a, b) { return c[b.id] - c[a.id] || cmp(a.title, b.title); });
    var top = ranked[0];
    var gc = {};
    ranked.forEach(function (b) { gc[b.genre] = (gc[b.genre] || 0) + c[b.id]; });
    var topGenre = Object.keys(gc).sort(function (a, b) { return gc[b] - gc[a]; })[0];

    $("#summary").innerHTML =
      card("เลือกทั้งหมด", total + " ครั้ง", "จาก " + ranked.length + " เล่ม") +
      card("เล่มที่เลือกมากที่สุด", top ? esc(top.title) : "ยังไม่มีข้อมูล", top ? c[top.id] + " ครั้ง · " + esc(top.author) : "") +
      card("แนวที่อ่านมากที่สุด", topGenre ? esc(topGenre) : "ยังไม่มีข้อมูล", topGenre ? gc[topGenre] + " ครั้ง" : "");

    $$("[data-tab]").forEach(function (b) { b.setAttribute("aria-selected", b.dataset.tab === dashTab); });
    $("#tab-books").hidden = dashTab !== "books";
    $("#tab-genres").hidden = dashTab !== "genres";

    // tab 1: most picked books
    var max = top ? c[top.id] : 1;
    $("#tab-books").innerHTML = ranked.length ? '<ol class="rank">' + ranked.map(function (b, i) {
      return '<li><span class="n">' + (i + 1) + '</span><span class="mini" style="background:' + coverColor(b) + '"></span>' +
        '<div><div class="t">' + esc(b.title) + '</div><div class="m">' + esc(b.author) + " · " + esc(b.type) + " / " + esc(b.genre) + "</div>" +
        '<div class="bar"><b style="width:' + Math.round(c[b.id] / max * 100) + '%"></b></div></div><span class="v">' + c[b.id] + "</span></li>";
    }).join("") + "</ol>" : '<p class="empty">ยังไม่มีสถิติ กดเลือกหนังสือที่หน้าชั้นหนังสือได้เลย</p>';

    // tab 2: genres read
    var key = groupBy === "genre" ? "genre" : "type", g = {}, items = {};
    ranked.forEach(function (b) { g[b[key]] = (g[b[key]] || 0) + c[b.id]; (items[b[key]] = items[b[key]] || []).push(b); });
    var names = Object.keys(g).sort(function (a, b) { return g[b] - g[a] || cmp(a, b); });
    if (!selectedGroup || !g[selectedGroup]) selectedGroup = names[0] || null;
    var gmax = names.length ? g[names[0]] : 1;
    var html = '<div class="gtools"><span class="ctl-label">ดูตาม</span><div class="seg" role="group" aria-label="จัดกลุ่ม">' +
      '<button data-group="genre" aria-pressed="' + (groupBy === "genre") + '">แนว</button>' +
      '<button data-group="type" aria-pressed="' + (groupBy === "type") + '">ประเภทหนังสือ</button></div></div>';
    if (names.length) {
      html += '<ul class="gbars">' + names.map(function (n) {
        return '<li class="' + (n === selectedGroup ? "on" : "") + '"><button data-gname="' + esc(n) + '" aria-pressed="' + (n === selectedGroup) + '"><span class="gn">' + esc(n) +
          '</span><span class="bar"><b style="width:' + Math.round(g[n] / gmax * 100) + '%"></b></span><span class="v">' + g[n] + "</span></button></li>";
      }).join("") + "</ul>";
      html += '<div class="gdetail"><h3>หนังสือที่เลือกใน' + (groupBy === "genre" ? "แนว" : "ประเภท") + " “" + esc(selectedGroup) + "”</h3><ul>" +
        items[selectedGroup].map(function (b) { return "<li><span>" + esc(b.title) + " <small>" + esc(b.author) + "</small></span><span>" + c[b.id] + " ครั้ง</span></li>"; }).join("") + "</ul></div>";
    } else html += '<p class="empty">ยังไม่มีสถิติ</p>';
    $("#tab-genres").innerHTML = html;

    $("#demo-note").innerHTML = (demo ? "<span>ตัวเลขเริ่มต้นเป็นข้อมูลตัวอย่าง</span>" : "") +
      '<button class="link" id="clear-stats">' + (demo ? "ล้างข้อมูลตัวอย่าง" : "ล้างสถิติทั้งหมด") + "</button>";
  }

  function card(label, val, sub) {
    return '<div class="card"><div class="lbl">' + label + '</div><div class="val">' + val + '</div><div class="sub">' + (sub || "&nbsp;") + "</div></div>";
  }

  // ---------- routing ----------
  function route() {
    var p = location.hash === "#dashboard" ? "dashboard" : "home";
    $("#page-home").hidden = p !== "home";
    $("#page-dashboard").hidden = p !== "dashboard";
    $("#nav-home").setAttribute("aria-current", p === "home" ? "page" : "false");
    $("#nav-dashboard").setAttribute("aria-current", p === "dashboard" ? "page" : "false");
    if (p === "dashboard") renderDash(); else renderShelf();
  }

  // ---------- events ----------
  document.addEventListener("click", function (e) {
    var t = e.target;
    var sort = t.closest("[data-sort]");
    if (sort) { sortBy = sort.dataset.sort; LS.set(K_SORT, sortBy); renderShelf(); return; }
    var pick = t.closest(".pick");
    if (pick) { run("pick", byId(+pick.dataset.id)); return; }
    if (t.closest("#scan-btn")) { run("scan"); return; }
    if (t.closest("#export-btn")) { exportData(); return; }
    if (t.closest("#import-btn")) { $("#import-file").click(); return; }
    if (t.closest("#settings-btn")) {
      var s = $("#settings"); s.hidden = !s.hidden; $("#settings-btn").setAttribute("aria-expanded", String(!s.hidden)); return;
    }
    var tab = t.closest("[data-tab]");
    if (tab) { dashTab = tab.dataset.tab; renderDash(); return; }
    var grp = t.closest("[data-group]");
    if (grp) { groupBy = grp.dataset.group; selectedGroup = null; renderDash(); return; }
    var gn = t.closest("[data-gname]");
    if (gn) { selectedGroup = gn.dataset.gname; renderDash(); return; }
    if (t.closest("#clear-stats")) {
      log = []; demo = false; LS.set(K_LOG, log); LS.set("ms-demo-v1", false); renderDash();
    }
  });
  $$('input[name="mode"]').forEach(function (r) {
    r.checked = r.value === settings.mode;
    r.addEventListener("change", function () { settings.mode = r.value; LS.set(K_SET, settings); });
  });
  var apiInput = $("#api-base");
  apiInput.value = settings.apiBase;
  apiInput.addEventListener("change", function () { settings.apiBase = apiInput.value.trim(); LS.set(K_SET, settings); });
  $("#import-file").addEventListener("change", function (e) {
    if (e.target.files[0]) importData(e.target.files[0]);
    e.target.value = "";                            // allow importing the same file again
  });
  window.addEventListener("hashchange", route);

  route();
})();
