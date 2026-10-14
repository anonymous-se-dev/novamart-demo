/* ==========================================================================
   NovaMart — front-end behaviour
   --------------------------------------------------------------------------
   Cookie consent is owned by the SECURITI Cookie Consent SDK (loaded in
   <head>
<script type="text/javascript" src="https://cdn-prod.securiti.ai/consent/auto_blocking/6922dabb-aab2-4f98-b911-e35595c14ff3/0b83568e-b1d6-4200-a827-0d678939b333.js"></script>). Securiti renders the banner + preference center and drives Google
   Consent Mode. The footer links call Securiti's global
   showConsentPreferencesPopup() to re-open the preference center.

   The small shim below only provides a friendly fallback if a visitor clicks
   before the Securiti SDK has finished loading (or when viewing fully offline).
   It never overrides Securiti's function once that is defined.
   ========================================================================== */
(function () {
  "use strict";

  if (typeof window.showConsentPreferencesPopup !== "function") {
    window.showConsentPreferencesPopup = function () {
      if (typeof window.initCmp === "function") { try { window.initCmp(); } catch (e) {} }
      // If Securiti defined the real popup in the meantime, defer to it.
      if (window.showConsentPreferencesPopup.__isFallback && typeof window.__cmpReady === "undefined") {
        alert("Loading cookie preferences… please try again in a moment.");
      }
      return false;
    };
    window.showConsentPreferencesPopup.__isFallback = true;
  }

  window.NovaMart = window.NovaMart || {};
  window.NovaMart.subscribe = function (e) {
    e.preventDefault();
    var optIn = document.getElementById("marketingOptIn");
    alert(optIn && optIn.checked
      ? "Thanks for joining! Your $10 reward is on its way. (Marketing consent recorded.)"
      : "You're subscribed to order updates only. Enable marketing consent to receive offers.");
    e.target.reset();
    return false;
  };

  // Run immediately if the DOM is already parsed (scripts can execute after
  // DOMContentLoaded when cached); otherwise wait for it.
  function initGrids() { renderCategories(); renderProducts(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initGrids);
  else initGrids();

  /* ---- Categories ------------------------------------------------------- */
  function renderCategories() {
    var grid = document.getElementById("catGrid");
    if (!grid) return;
    var cats = [
      { name: "Electronics", note: "Save up to 40%", color: "#4f46e5", icon: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>' },
      { name: "Home", note: "New arrivals", color: "#0E9F6E", icon: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>' },
      { name: "Fashion", note: "Trending now", color: "#E4002B", icon: '<path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/>' },
      { name: "Beauty", note: "Top rated", color: "#DB2777", icon: '<path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 6v6l4 2"/>' },
      { name: "Grocery", note: "Same-day", color: "#00A6A6", icon: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/>' },
      { name: "Toys", note: "Best sellers", color: "#FFB100", icon: '<path d="m12 2 3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/>' }
    ];
    grid.innerHTML = cats.map(function (c) {
      return '<a href="#products" class="group border border-slate-200 rounded-2xl p-5 text-center bg-white transition hover:-translate-y-1 hover:shadow-card hover:border-transparent">' +
        '<div class="w-13 h-13 mx-auto mb-3 rounded-2xl grid place-items-center text-white" style="width:54px;height:54px;background:' + c.color + '">' +
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' + c.icon + '</svg></div>' +
        '<h3 class="font-bold text-[15px]">' + c.name + '</h3>' +
        '<p class="text-xs text-slate-500 mt-1">' + c.note + '</p></a>';
    }).join("");
  }

  /* ---- Product catalogue (shared catalog.js) ---------------------------- */
  function renderProducts() {
    var grid = document.getElementById("prodGrid");
    if (!grid || !window.NM_CATALOG) return;
    grid.innerHTML = window.NM_CATALOG.map(function (p) {
      var tagHtml = p.tag === "sale"
        ? '<span class="absolute top-3 left-3 bg-brand text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wide">Sale</span>'
        : '<span class="absolute top-3 left-3 bg-grass text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wide">New</span>';
      var oldHtml = p.old ? '<span class="text-slate-400 line-through text-sm">$' + p.old.toFixed(2) + '</span>' : '';
      return '<a href="product.html?id=' + p.id + '" class="group border border-slate-200 rounded-2xl bg-white overflow-hidden flex flex-col transition hover:-translate-y-1 hover:shadow-hi">' +
        '<div class="relative aspect-[4/3] grid place-items-center" style="background:linear-gradient(160deg,' + p.color + '18,' + p.color + '05)">' +
          tagHtml +
          (window.NM_HEART_HTML ? window.NM_HEART_HTML(p.id, "icon") : "") +
          '<svg viewBox="0 0 24 24" fill="none" stroke="' + p.color + '" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="width:46%;height:46%">' + window.NM_ICONS[p.icon] + '</svg>' +
        '</div>' +
        '<div class="p-4 flex flex-col gap-1.5 flex-1">' +
          '<span class="text-xs text-slate-500 font-semibold">' + p.brand + '</span>' +
          '<h3 class="font-bold leading-snug">' + p.name + '</h3>' +
          '<div class="text-[13px]">' + window.NM_STARS(p.rating) + '</div>' +
          '<div class="mt-auto flex items-center gap-2.5 pt-2"><span class="text-xl font-extrabold">$' + p.price.toFixed(2) + '</span>' + oldHtml + '</div>' +
          '<span class="w-full mt-2.5 inline-flex justify-center items-center gap-2 font-bold px-5 py-2.5 rounded-full bg-brand-ink text-white group-hover:bg-black transition">View product →</span>' +
        '</div>' +
      '</a>';
    }).join("");
  }
})();
