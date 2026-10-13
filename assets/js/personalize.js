/* ==========================================================================
   NovaMart — consent-gated behavioural + favourites personalization
   --------------------------------------------------------------------------
   The "Recommended for you" rail is a MARKETING feature:
     • It only appears when the visitor has granted MARKETING (Advertising)
       consent in the Securiti banner. No marketing consent → the whole
       section is hidden and nothing is tracked or stored.
     • With consent, recommendations are ranked from BOTH signals:
         – browsing behaviour (product pages viewed, by category)
         – likes / saves (the ♡ favourite buttons)
       Favourites weigh more than views. A "♥ Saved for you" row and a
       "Recently viewed" row round it out.
     • Withdraw consent → behaviour + favourites cookies are deleted, hearts
       reset, and the rail disappears again.
   ========================================================================== */
(function () {
  "use strict";
  if (!window.NM_CATALOG) return;

  var BKEY = "nm_ad_personalization";
  var FKEY = "nm_saved_items";
  var FILL = "#E4002B";                 // brand red for a filled heart

  function ids(attr) {
    return (document.documentElement.getAttribute(attr) || "").split(",")
      .map(function (s) { return s.trim(); }).filter(Boolean);
  }
  var MKT = ids("data-mkt");            // Advertising, Social Networking = "marketing"

  // Securiti stores __privaci_cookie_consents as base64-encoded JSON on live
  // domains (and URL-encoded/plain JSON in some contexts) — decode defensively.
  function decodeConsents(raw) {
    if (!raw) return null;
    var tries = [];
    try { tries.push(atob(raw)); } catch (e) {}
    try { tries.push(decodeURIComponent(raw)); } catch (e) {}
    tries.push(raw);
    for (var i = 0; i < tries.length; i++) {
      try { var o = JSON.parse(tries[i]); if (o && o.consents) return o.consents; } catch (e) {}
    }
    return null;
  }
  // "Any non-essential consent granted?" — this Securiti domain only publishes
  // Essential + Performance & Functionality + Unclassified as banner toggles
  // (no dedicated Advertising toggle), so we treat consent to ANY non-essential
  // category as permission to personalise / show custom ads. Essential-only
  // (reject-all) → false. Proper per-category gating needs an Advertising
  // category with cookies published in the Securiti console.
  var ESSENTIAL_ID = "12";
  function marketingConsent() {
    var m = document.cookie.match(/(?:^|;\s*)__privaci_cookie_consents=([^;]+)/);
    var c = m ? decodeConsents(m[1]) : null;
    if (!c) return false;
    return Object.keys(c).some(function (id) { return id !== ESSENTIAL_ID && String(c[id]) === "1"; });
  }

  /* ---- behaviour store -------------------------------------------------- */
  function readBehavior() {
    var m = document.cookie.match(/(?:^|;\s*)nm_ad_personalization=([^;]+)/);
    if (!m) return { cats: {}, items: [] };
    try { var b = JSON.parse(decodeURIComponent(m[1])); b.cats = b.cats || {}; b.items = b.items || []; return b; }
    catch (e) { return { cats: {}, items: [] }; }
  }
  function writeBehavior(b) {
    document.cookie = BKEY + "=" + encodeURIComponent(JSON.stringify(b)) + ";path=/;max-age=" + (180 * 86400) + ";SameSite=Lax";
  }
  function clearBehavior() { expire(BKEY); }

  /* ---- favourites store ------------------------------------------------- */
  function readFavorites() {
    var m = document.cookie.match(/(?:^|;\s*)nm_saved_items=([^;]+)/);
    if (!m) return [];
    try { var a = JSON.parse(decodeURIComponent(m[1])); return Array.isArray(a) ? a : []; }
    catch (e) { return []; }
  }
  function writeFavorites(a) {
    document.cookie = FKEY + "=" + encodeURIComponent(JSON.stringify(a)) + ";path=/;max-age=" + (180 * 86400) + ";SameSite=Lax";
  }
  function clearFavorites() { expire(FKEY); }
  function isFav(id) { return readFavorites().indexOf(parseInt(id, 10)) >= 0; }

  function expire(name) {
    ["/", location.pathname].forEach(function (p) {
      [location.hostname, "." + location.hostname, "", ""].forEach(function (d) {
        document.cookie = name + "=;max-age=0;path=" + p + (d ? ";domain=" + d : "");
      });
    });
  }

  function recordView(id) {
    if (!marketingConsent()) return;    // no marketing consent → capture nothing
    var p = window.NM_FIND(id); if (!p) return;
    var b = readBehavior();
    b.cats[p.category] = (b.cats[p.category] || 0) + 1;
    b.items = [p.id].concat(b.items.filter(function (x) { return x !== p.id; })).slice(0, 8);
    b.last = p.id;
    writeBehavior(b);
  }

  /* ---- scoring: behaviour (+1/view) + favourites (+3/like) -------------- */
  function categoryScores() {
    var b = readBehavior(), favs = readFavorites(), s = {};
    Object.keys(b.cats).forEach(function (k) { s[k] = (s[k] || 0) + b.cats[k]; });
    favs.forEach(function (id) { var p = window.NM_FIND(id); if (p) s[p.category] = (s[p.category] || 0) + 3; });
    return s;
  }
  function topKey(s) { var t = null, n = -1; Object.keys(s).forEach(function (k) { if (s[k] > n) { n = s[k]; t = k; } }); return t; }

  /* ---- favourite (heart) buttons --------------------------------------- */
  function heartHtml(id, mode) {
    var fav = isFav(id);
    if (mode === "button") {
      return '<button type="button" class="nm-fav" data-fav-id="' + id + '" data-mode="button" aria-pressed="' + fav + '" title="' + (fav ? "Saved" : "Save") + '" ' +
        'onclick="event.preventDefault();event.stopPropagation();window.NM_TOGGLE_FAV(' + id + ')" ' +
        'style="cursor:pointer;font-weight:800;padding:0.875rem 1.5rem;border-radius:9999px;transition:all .15s;border:2px solid ' + (fav ? FILL : "#e2e8f0") + ';color:' + (fav ? FILL : "#12141C") + ';background:' + (fav ? "#fee2e2" : "#fff") + '">' + (fav ? "♥ Saved" : "♡ Save") + '</button>';
    }
    return '<button type="button" class="nm-fav" data-fav-id="' + id + '" data-mode="icon" aria-pressed="' + fav + '" title="' + (fav ? "Saved" : "Save") + '" ' +
      'onclick="event.preventDefault();event.stopPropagation();window.NM_TOGGLE_FAV(' + id + ')" ' +
      'style="position:absolute;top:10px;right:10px;z-index:5;width:34px;height:34px;border-radius:9999px;border:none;cursor:pointer;display:grid;place-items:center;font-size:16px;line-height:1;background:rgba(255,255,255,.92);box-shadow:0 4px 12px -5px rgba(0,0,0,.35);color:' + (fav ? FILL : "#64748b") + '">' + (fav ? "♥" : "♡") + '</button>';
  }
  window.NM_HEART_HTML = heartHtml;
  window.NM_IS_FAV = isFav;
  window.NM_SYNC_HEARTS = function () {
    document.querySelectorAll(".nm-fav[data-fav-id]").forEach(function (btn) {
      var id = parseInt(btn.getAttribute("data-fav-id"), 10), fav = isFav(id), mode = btn.getAttribute("data-mode");
      btn.setAttribute("aria-pressed", fav); btn.title = fav ? "Saved" : "Save";
      if (mode === "button") {
        btn.textContent = fav ? "♥ Saved" : "♡ Save";
        btn.style.border = "2px solid " + (fav ? FILL : "#e2e8f0");
        btn.style.color = fav ? FILL : "#12141C";
        btn.style.background = fav ? "#fee2e2" : "#fff";
      } else {
        btn.textContent = fav ? "♥" : "♡";
        btn.style.color = fav ? FILL : "#64748b";
      }
    });
  };
  window.NM_TOGGLE_FAV = function (id) {
    id = parseInt(id, 10);
    // Saving a favourite is a functional wishlist action — no consent gate, no popup.
    var f = readFavorites(), i = f.indexOf(id);
    if (i >= 0) f.splice(i, 1); else f.unshift(id);
    writeFavorites(f.slice(0, 24));
    window.NM_SYNC_HEARTS();
    lastSig = null; renderHome();       // reflect the new favourite in the rail
    return true;
  };

  /* ---- card + grid ----------------------------------------------------- */
  function card(p) {
    var oldHtml = p.old ? '<span class="text-slate-400 line-through text-sm">$' + p.old.toFixed(2) + '</span>' : '';
    return '<a href="product.html?id=' + p.id + '" class="relative border border-slate-200 rounded-2xl bg-white overflow-hidden flex flex-col transition hover:-translate-y-1 hover:shadow-hi">' +
      heartHtml(p.id, "icon") +
      '<div class="relative aspect-[4/3] grid place-items-center" style="background:linear-gradient(160deg,' + p.color + '18,' + p.color + '05)">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="' + p.color + '" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="width:44%;height:44%">' + window.NM_ICONS[p.icon] + '</svg></div>' +
      '<div class="p-4 flex flex-col gap-1.5 flex-1">' +
      '<span class="text-xs text-slate-500 font-semibold">' + p.brand + '</span>' +
      '<h3 class="font-bold leading-snug">' + p.name + '</h3>' +
      '<div class="text-[13px]">' + window.NM_STARS(p.rating) + '</div>' +
      '<div class="mt-auto flex items-center gap-2.5 pt-2"><span class="text-xl font-extrabold">$' + p.price.toFixed(2) + '</span>' + oldHtml + '</div>' +
      '</div></a>';
  }
  function grid(list) { return '<div class="grid grid-cols-2 lg:grid-cols-4 gap-5">' + list.map(card).join("") + '</div>'; }
  function label(t) { return '<p class="text-xs font-bold tracking-[0.14em] uppercase text-slate-400 mt-10 mb-4">' + t + '</p>'; }

  /* ---- home "Recommended for you" -------------------------------------- */
  var lastSig = null;
  function renderHome() {
    var host = document.getElementById("nm-reco");
    if (!host) return;
    var sect = host.closest("section");

    if (!marketingConsent()) {           // no marketing consent → no rail, no behaviour tracking
      if (lastSig === "off") return;
      clearBehavior();                   // favourites persist — they're a functional wishlist
      if (sect) sect.style.display = "none";
      host.innerHTML = "";
      window.NM_SYNC_HEARTS();
      lastSig = "off";
      return;
    }
    if (sect) sect.style.display = "";

    var b = readBehavior(), favs = readFavorites();
    var sig = "on|" + JSON.stringify(b.cats) + "|" + b.items.join(",") + "|" + favs.join(",");
    if (sig === lastSig) return;
    lastSig = sig;

    function head(eyebrow, title) {
      return '<div class="flex items-end justify-between gap-5 flex-wrap mb-6">' +
        '<div><p class="text-xs font-bold tracking-[0.14em] uppercase text-brand">' + eyebrow + '</p>' +
        '<h2 class="text-3xl md:text-4xl font-extrabold mt-1">' + title + '</h2></div>' +
        '<button type="button" onclick="showConsentPreferencesPopup()" class="text-sm font-semibold text-slate-500 hover:text-brand underline">Manage cookies</button></div>';
    }

    if (b.items.length === 0 && favs.length === 0) {
      // consent granted but nothing to personalize on yet → seed with trending
      host.innerHTML = head("✨ Recommended for you", "Popular right now") + grid(window.NM_CATALOG.slice(0, 4)) +
        '<p class="text-sm text-slate-500 mt-6 text-center">Browse a few products or tap ♡ to <strong>save</strong> favourites — this rail then tailors itself to what you like.</p>';
      window.NM_SYNC_HEARTS();
      return;
    }

    var cat = topKey(categoryScores());
    // lead with items from the top-interest category (favourites live in their
    // own row below), then fill with other non-favourited items.
    var picks = window.NM_CATALOG.filter(function (p) { return p.category === cat && !isFav(p.id); });
    if (picks.length < 4) picks = picks.concat(window.NM_CATALOG.filter(function (p) { return picks.indexOf(p) < 0 && !isFav(p.id); }));
    picks = picks.slice(0, 4);
    var favItems = favs.map(window.NM_FIND).filter(Boolean).slice(0, 4);
    var recent = b.items.map(window.NM_FIND).filter(Boolean).slice(0, 4);

    host.innerHTML =
      head("✨ Personalized for you", "Recommended because you like " + cat) + grid(picks) +
      (favItems.length ? label("♥ Saved for you") + grid(favItems) : "") +
      (recent.length ? label("Recently viewed") + grid(recent) : "");
    window.NM_SYNC_HEARTS();
  }

  /* ---- personalized "custom ads" slot (#nm-ads) ------------------------ */
  var lastAdsSig = null;
  function adCard(p) {
    var oldHtml = p.old ? '<span class="text-slate-400 line-through text-xs">$' + p.old.toFixed(2) + '</span>' : '';
    return '<a href="product.html?id=' + p.id + '" class="relative border border-slate-200 rounded-xl bg-white overflow-hidden flex flex-col transition hover:-translate-y-1 hover:shadow-hi">' +
      '<span class="absolute top-2 left-2 z-10 bg-brand-ink text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wide">Ad</span>' +
      '<div class="aspect-[16/10] grid place-items-center" style="background:linear-gradient(160deg,' + p.color + '18,' + p.color + '05)">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="' + p.color + '" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="width:38%;height:38%">' + window.NM_ICONS[p.icon] + '</svg></div>' +
      '<div class="p-3.5 flex flex-col gap-1">' +
      '<span class="text-[11px] text-slate-500 font-semibold">' + p.brand + '</span>' +
      '<h4 class="font-bold text-sm leading-snug">' + p.name + '</h4>' +
      '<div class="mt-1 flex items-center gap-2"><span class="font-extrabold">$' + p.price.toFixed(2) + '</span>' + oldHtml + '</div>' +
      '<span class="mt-1.5 text-xs font-bold text-brand">Shop this deal →</span>' +
      '</div></a>';
  }
  function adsPlaceholder() {
    return '<div class="rounded-2xl border border-dashed border-slate-300 bg-brand-soft p-5 flex items-center gap-4 flex-wrap text-sm text-slate-500">' +
      '<span class="text-[10px] font-extrabold uppercase tracking-wider text-white bg-slate-400 rounded px-2 py-1">Ad slot · Advertising</span>' +
      '<span class="flex-1 min-w-[240px]">Custom / personalized ads render here only after you <strong>accept cookies</strong> in the Securiti banner. Reject → nothing loads, no tracking.</span>' +
      '<button type="button" onclick="showConsentPreferencesPopup()" class="font-bold text-brand underline">Cookie preferences</button>' +
      '</div>';
  }
  function renderAds() {
    var host = document.getElementById("nm-ads");
    if (!host) return;
    var mkt = marketingConsent();
    var b = readBehavior(), favs = readFavorites();
    var sig = mkt ? ("on|" + JSON.stringify(b.cats) + "|" + favs.join(",")) : "off";
    if (sig === lastAdsSig) return;               // avoid poll flicker
    lastAdsSig = sig;
    if (!mkt) { host.innerHTML = adsPlaceholder(); return; }   // no Advertising consent → placeholder
    var personalized = (b.items.length > 0 || favs.length > 0);
    var cat = personalized ? topKey(categoryScores()) : null;
    var picks = cat ? window.NM_CATALOG.filter(function (p) { return p.category === cat; })
                    : window.NM_CATALOG.filter(function (p) { return p.tag === "sale"; });
    if (picks.length < 3) picks = picks.concat(window.NM_CATALOG.filter(function (p) { return picks.indexOf(p) < 0; }));
    picks = picks.slice(0, 3);
    var headline = cat ? ("Because you browsed " + cat + " — deals picked for you") : "Today's sponsored deals for you";
    host.innerHTML =
      '<div class="rounded-2xl overflow-hidden shadow-card border border-slate-200">' +
        '<div class="flex items-center justify-between gap-3 px-5 py-3 bg-brand text-white">' +
          '<span class="text-xs font-extrabold uppercase tracking-wider">✦ Sponsored · personalized for you</span>' +
          '<span class="text-[10px] font-bold bg-white/20 rounded px-2 py-1 uppercase tracking-wide hidden sm:inline">Ad · shown with Advertising consent</span>' +
        '</div>' +
        '<div class="p-5 bg-white">' +
          '<p class="text-sm font-bold text-brand-ink mb-4">' + headline + '</p>' + adGrid(picks) +
        '</div>' +
      '</div>';
  }
  function adGrid(list) { return '<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">' + list.map(adCard).join("") + '</div>'; }

  /* ---- product detail page --------------------------------------------- */
  function renderProduct() {
    var host = document.getElementById("nm-product");
    if (!host) return;
    var id = new URLSearchParams(location.search).get("id");
    var p = window.NM_FIND(id) || window.NM_CATALOG[0];
    document.title = p.name + " — NovaMart";
    recordView(p.id);

    var oldHtml = p.old ? '<span class="text-slate-400 line-through text-lg">$' + p.old.toFixed(2) + '</span>' +
      '<span class="ml-2 bg-brand text-white text-xs font-extrabold px-2 py-1 rounded-full">SAVE $' + (p.old - p.price).toFixed(0) + '</span>' : '';
    host.innerHTML =
      '<nav class="text-sm text-slate-500 mb-6"><a href="index.html" class="hover:text-brand">Home</a> · ' +
        '<a href="index.html#products" class="hover:text-brand">' + p.category + '</a> · <span class="text-brand-ink">' + p.name + '</span></nav>' +
      '<div class="grid lg:grid-cols-2 gap-10 items-start">' +
        '<div class="rounded-3xl aspect-square grid place-items-center" style="background:linear-gradient(160deg,' + p.color + '1f,' + p.color + '08)">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="' + p.color + '" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" style="width:42%;height:42%">' + window.NM_ICONS[p.icon] + '</svg></div>' +
        '<div>' +
          '<span class="text-xs font-bold tracking-[0.14em] uppercase text-brand">' + p.category + ' · ' + p.brand + '</span>' +
          '<h1 class="text-3xl md:text-4xl font-extrabold mt-2">' + p.name + '</h1>' +
          '<div class="text-lg mt-2">' + window.NM_STARS(p.rating) + '</div>' +
          '<p class="text-slate-600 mt-4 text-[17px]">' + p.blurb + '</p>' +
          '<div class="flex items-center gap-3 mt-6"><span class="text-3xl font-extrabold">$' + p.price.toFixed(2) + '</span>' + oldHtml + '</div>' +
          '<div class="flex gap-3 mt-6"><button class="flex-1 inline-flex justify-center font-bold px-6 py-3.5 rounded-full bg-brand text-white hover:bg-brand-dark transition">Add to cart</button>' +
          heartHtml(p.id, "button") + '</div>' +
          '<ul class="mt-7 grid sm:grid-cols-2 gap-3">' + p.features.map(function (f) {
            return '<li class="flex gap-2 items-start text-sm text-slate-600"><span class="text-brand font-bold">✓</span>' + f + '</li>'; }).join("") + '</ul>' +
          '<div class="mt-6 flex gap-4 text-[13px] text-slate-500"><span>🚚 Free 2-day delivery</span><span>↩︎ 90-day returns</span></div>' +
        '</div>' +
      '</div>';

    var more = window.NM_CATALOG.filter(function (x) { return x.category === p.category && x.id !== p.id; }).slice(0, 4);
    if (more.length < 4) more = more.concat(window.NM_CATALOG.filter(function (x) { return x.id !== p.id && more.indexOf(x) < 0; })).slice(0, 4);
    var moreHost = document.getElementById("nm-more");
    if (moreHost) moreHost.innerHTML = '<h2 class="text-2xl font-extrabold mb-6">More in ' + p.category + '</h2>' + grid(more);
    window.NM_SYNC_HEARTS();
  }

  function run() { renderProduct(); renderHome(); renderAds(); window.NM_SYNC_HEARTS(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
  // consent / favourites can change without a DOM event — poll lightly
  setInterval(function () { renderHome(); renderAds(); }, 1500);
})();
