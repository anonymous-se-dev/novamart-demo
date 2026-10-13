/* ==========================================================================
   Consent demo layer  (shared by NovaMart & Meridian)
   --------------------------------------------------------------------------
   Demonstrates the Securiti Cookie Consent value story end-to-end:

   • GATING SIGNAL = Google Consent Mode v2. The Securiti banner, once its
     "Consent Type & Category Mapping" is enabled for the domain, calls
     gtag('consent','update',{…}) on every choice. This file observes that
     signal (via dataLayer) and reacts.
       marketing  = ad_storage granted
       analytics  = analytics_storage granted

   • THIRD-PARTY TAGS are loaded ONLY when their category is granted:
       analytics → Google Tag Manager   (set CONFIG.GTM_ID)
       marketing → Mailchimp connected  (set CONFIG.MAILCHIMP_USER)
     Until real IDs are provided they no-op; the on-page widgets below still
     demonstrate the behaviour with zero external accounts.

   • THIRD-PARTY WIDGETS (self-contained) appear only with consent and hide
     when consent is withdrawn — proving "shown only when consent is given".

   • RESET button clears all cookies + storage and reloads, so the Securiti
     banner re-appears and the demo can be run again from a clean state.
   ========================================================================== */
(function () {
  "use strict";

  var ACCENT = document.documentElement.getAttribute("data-accent") || "#111827";
  var BRAND  = document.documentElement.getAttribute("data-brand") || "This site";

  var CONFIG = {
    GTM_ID: "GTM-XXXXXXX",        // ← paste your Google Tag Manager container id
    MAILCHIMP_USER: "",  // Mailchimp "connected site" — loads Mailchimp's JS (which sets marketing cookies) ONLY with Marketing consent
    // Real subscribe from the newsletter widget (NovaMart audience). These are the
    // public embedded-form identifiers from Mailchimp → Audience → Signup forms →
    // Embedded form (form action host + u/id/f_id). Safe to ship in client HTML.
    MAILCHIMP: null
  };

  var state = { analytics: false, marketing: false };
  var loaded = { gtm: false, mailchimp: false };

  // Per-domain Securiti cookie-category IDs → our demo buckets (from <html>).
  function ids(attr) {
    return (document.documentElement.getAttribute(attr) || "")
      .split(",").map(function (s) { return s.trim(); }).filter(Boolean);
  }
  var MKT = ids("data-mkt");   // Advertising, Social Networking
  var ANA = ids("data-ana");   // Analytics & Customization, Performance & Functionality

  /* ---- read consent -----------------------------------------------------
     Primary  = Securiti's own consent cookie __privaci_cookie_consents
                ({"consents":{"<catId>":0|1}, …}) — works with no extra config.
     Fallback = Google Consent Mode (if the domain has GCM Category Mapping on).
     ---------------------------------------------------------------------- */
  // Securiti stores this cookie as base64-encoded JSON on live domains (and
  // URL-encoded/plain JSON in some contexts) — decode defensively either way.
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
  function privaciConsents() {
    var m = document.cookie.match(/(?:^|;\s*)__privaci_cookie_consents=([^;]+)/);
    return m ? decodeConsents(m[1]) : null;
  }
  // Global Privacy Control — a browser-level, legally-recognised opt-out of
  // sale/share (i.e. targeted Advertising). When present we force Marketing to
  // DENIED regardless of any stored choice, so marketing tags + widgets stay off
  // and can't overlap Securiti's "GPC Signal Detected" banner.
  function gpcOn() { try { return navigator.globalPrivacyControl === true; } catch (e) { return false; } }

  function refresh() {
    var c = privaciConsents();
    if (c) {
      state.marketing = MKT.some(function (id) { return String(c[id]) === "1"; });
      state.analytics = ANA.some(function (id) { return String(c[id]) === "1"; });
    } else {
      // fallback: Google Consent Mode signals in the dataLayer
      var dl = window.dataLayer || [], ad = "denied", an = "denied";
      for (var i = 0; i < dl.length; i++) {
        var a = dl[i];
        if (a && a[0] === "consent" && (a[1] === "default" || a[1] === "update") && a[2]) {
          if (a[2].ad_storage) ad = a[2].ad_storage;
          if (a[2].analytics_storage) an = a[2].analytics_storage;
        }
      }
      state.marketing = ad === "granted";
      state.analytics = an === "granted";
    }
    // GPC opt-out overrides any "granted" Marketing choice.
    if (gpcOn()) state.marketing = false;
  }

  function hookDataLayer() {
    window.dataLayer = window.dataLayer || [];
    if (window.dataLayer.__demoHook) return;
    var orig = window.dataLayer.push;
    window.dataLayer.push = function () {
      var r = orig.apply(this, arguments);
      refresh(); apply();
      return r;
    };
    window.dataLayer.__demoHook = true;
  }

  /* ---- real third-party tag loaders (gated) --------------------------- */
  function loadGTM() {
    if (loaded.gtm || !/^GTM-[A-Z0-9]+$/.test(CONFIG.GTM_ID) || CONFIG.GTM_ID === "GTM-XXXXXXX") return;
    loaded.gtm = true;
    (function (w, d, s, l, i) {
      w[l] = w[l] || []; w[l].push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
      var f = d.getElementsByTagName(s)[0], j = d.createElement(s);
      j.async = true; j.src = "https://www.googletagmanager.com/gtm.js?id=" + i; f.parentNode.insertBefore(j, f);
    })(window, document, "script", "dataLayer", CONFIG.GTM_ID);
  }
  function loadMailchimp() {
    if (loaded.mailchimp || !CONFIG.MAILCHIMP_USER) return;
    loaded.mailchimp = true;
    var s = document.createElement("script"); s.async = true;
    s.src = "https://chimpstatic.com/mcjs-connected/js/users/" + CONFIG.MAILCHIMP_USER + ".js";
    document.head.appendChild(s);
  }
  // Subscribe an email to Mailchimp via its embedded-form JSONP endpoint. The
  // newsletter widget only shows with Marketing consent, so this stays gated.
  // With MAILCHIMP unset it returns a demo "subscribed" result (no network call).
  function mcSubscribe(email, done) {
    var mc = CONFIG.MAILCHIMP || {};
    if (!mc.dc || !mc.u || !mc.id) { done(true, ""); return; }
    var cb = "__mc_cb_" + Date.now(), s = document.createElement("script");
    var to = setTimeout(function () { cleanup(); done(false, "Network timeout — please try again."); }, 8000);
    function cleanup() { clearTimeout(to); try { delete window[cb]; } catch (e) { window[cb] = undefined; } if (s.parentNode) s.parentNode.removeChild(s); }
    window[cb] = function (data) { cleanup(); done(!!data && data.result === "success", (data && data.msg || "").replace(/<[^>]+>/g, "")); };
    s.onerror = function () { cleanup(); done(false, "Could not reach Mailchimp."); };
    s.src = "https://" + mc.dc + ".list-manage.com/subscribe/post-json?u=" + encodeURIComponent(mc.u) +
      "&id=" + encodeURIComponent(mc.id) + (mc.f_id ? "&f_id=" + encodeURIComponent(mc.f_id) : "") +
      "&EMAIL=" + encodeURIComponent(email) + "&c=" + cb;
    document.body.appendChild(s);
  }

  /* ---- UI ------------------------------------------------------------- */
  function el(html) { var d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }
  var host;
  function ensureHost() {
    if (host) return;
    host = document.createElement("div");
    host.id = "consent-demo";
    document.body.appendChild(host);

    // Reset button (always visible) — bottom-right
    var reset = el(
      '<button id="cd-reset" title="Clear all cookies & consent, then reload" ' +
      'style="position:fixed;right:16px;bottom:16px;z-index:2147483000;cursor:pointer;border:none;' +
      'border-radius:999px;padding:11px 16px;font:700 13px Inter,system-ui,sans-serif;color:#fff;' +
      'background:' + ACCENT + ';box-shadow:0 10px 30px -10px rgba(0,0,0,.45)">↺ Reset consent</button>');
    reset.addEventListener("click", resetConsent);
    host.appendChild(reset);

    // Widgets stack — bottom-right, above the reset button
    var stack = document.createElement("div");
    stack.id = "cd-stack";
    stack.style.cssText = "position:fixed;right:16px;bottom:64px;z-index:2147482000;display:flex;" +
      "flex-direction:column;gap:10px;align-items:flex-end;max-width:300px";
    host.appendChild(stack);

    // Newsletter (marketing) — working demo subscribe
    var nl = el(
      '<div data-w="marketing" style="display:none;background:#fff;color:#111827;border:1px solid #e5e7eb;' +
      'border-radius:14px;box-shadow:0 12px 30px -12px rgba(0,0,0,.35);padding:14px 16px;width:280px;' +
      'font:400 13px Inter,system-ui,sans-serif">' +
      '<div style="font-weight:800;margin-bottom:4px">✉️ Join the ' + BRAND + ' newsletter</div>' +
      '<div style="color:#6b7280;margin-bottom:8px">Loaded via <b>Mailchimp</b> — shown because you allowed <b>Marketing</b> cookies.</div>' +
      '<div class="cd-nl-form" style="display:flex;gap:6px"><input type="email" class="cd-nl-email" placeholder="you@example.com" ' +
      'style="flex:1;min-width:0;border:1px solid #d1d5db;border-radius:8px;padding:8px 10px;font:inherit">' +
      '<button class="cd-nl-join" style="border:none;border-radius:8px;padding:8px 12px;font:700 13px Inter;color:#fff;cursor:pointer;background:' + ACCENT + '">Join</button></div>' +
      '<div class="cd-nl-done" style="display:none;color:#059669;font-weight:700;margin-top:6px"></div>' +
      '</div>');
    stack.appendChild(nl);
    (function () {
      var form = nl.querySelector(".cd-nl-form"), done = nl.querySelector(".cd-nl-done"),
          email = nl.querySelector(".cd-nl-email"), join = nl.querySelector(".cd-nl-join");
      function sub() {
        var v = (email.value || "").trim();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { email.style.borderColor = "#dc2626"; email.focus(); return; }
        email.style.borderColor = "#d1d5db";
        join.disabled = true; var was = join.textContent; join.textContent = "…";
        mcSubscribe(v, function (ok, msg) {
          join.disabled = false; join.textContent = was;
          done.style.display = "block";
          if (ok) { form.style.display = "none"; done.style.color = "#059669"; done.textContent = "✓ Thanks — " + v + " is subscribed!"; }
          else { done.style.color = "#dc2626"; done.textContent = msg || "Sorry, that didn't work — please try again."; }
        });
      }
      join.addEventListener("click", sub);
      email.addEventListener("keydown", function (e) { if (e.key === "Enter") sub(); });
    })();

    // Chat (marketing) — opens a demo chat panel
    var chatBtn = el(
      '<button data-w="marketing" title="Live chat" style="display:none;border:none;cursor:pointer;' +
      'border-radius:999px;padding:12px 16px;font:700 13px Inter;color:#fff;background:#111827;' +
      'box-shadow:0 10px 30px -10px rgba(0,0,0,.45)">💬 Chat with us</button>');
    stack.appendChild(chatBtn);
    var chat = el(
      '<div style="display:none;position:fixed;right:16px;bottom:118px;z-index:2147483001;width:300px;' +
      'background:#fff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;' +
      'box-shadow:0 18px 44px -14px rgba(0,0,0,.5);font:400 13px Inter,system-ui,sans-serif">' +
      '<div style="background:' + ACCENT + ';color:#fff;padding:12px 14px;font-weight:800;display:flex;justify-content:space-between;align-items:center">' + BRAND + ' Support <span class="cd-chat-x" style="cursor:pointer;font-weight:400;font-size:20px;line-height:1">×</span></div>' +
      '<div class="cd-chat-log" style="padding:12px 14px;height:190px;overflow-y:auto;display:flex;flex-direction:column;gap:8px"></div>' +
      '<div style="display:flex;gap:6px;padding:10px 12px;border-top:1px solid #eee"><input class="cd-chat-in" placeholder="Type a message…" style="flex:1;min-width:0;border:1px solid #d1d5db;border-radius:999px;padding:8px 12px;font:inherit"><button class="cd-chat-send" style="border:none;border-radius:999px;padding:8px 14px;font:700 13px Inter;color:#fff;cursor:pointer;background:' + ACCENT + '">Send</button></div>' +
      '</div>');
    host.appendChild(chat);
    (function () {
      var log = chat.querySelector(".cd-chat-log"), inp = chat.querySelector(".cd-chat-in"),
          send = chat.querySelector(".cd-chat-send"), x = chat.querySelector(".cd-chat-x"), greeted = false;
      function bubble(text, who) {
        var b = document.createElement("div");
        b.style.cssText = "max-width:80%;padding:8px 11px;border-radius:12px;font-size:13px;" + (who === "me"
          ? "align-self:flex-end;background:" + ACCENT + ";color:#fff"
          : "align-self:flex-start;background:#f3f4f6;color:#111827");
        b.textContent = text; log.appendChild(b); log.scrollTop = log.scrollHeight;
      }
      function say() {
        var v = (inp.value || "").trim(); if (!v) return; bubble(v, "me"); inp.value = "";
        setTimeout(function () { bubble("Thanks for reaching out! A " + BRAND + " specialist will be right with you. (Demo assistant.)", "bot"); }, 650);
      }
      chatBtn.addEventListener("click", function () {
        if (chat.style.display === "block") { chat.style.display = "none"; return; }
        var br = chatBtn.getBoundingClientRect();
        chat.style.bottom = Math.round(window.innerHeight - br.top + 10) + "px";
        chat.style.display = "block";
        if (!greeted) { greeted = true; bubble("Hi! 👋 Welcome to " + BRAND + ". How can we help you today?", "bot"); }
        inp.focus();
      });
      x.addEventListener("click", function () { chat.style.display = "none"; });
      send.addEventListener("click", say);
      inp.addEventListener("keydown", function (e) { if (e.key === "Enter") say(); });
    })();
    // (Analytics-active badge removed — no demo value.)
  }

  // Is the Securiti cookie banner currently on screen? (avoid overlapping it)
  // Detect by a visible accept/allow control — robust across banner variants.
  function bannerVisible() {
    var ctrls = document.querySelectorAll("button, a, [role=button]");
    for (var i = 0; i < ctrls.length; i++) {
      var c = ctrls[i];
      if (c.offsetParent === null) continue;
      if (/^(allow cookies|accept all|accept all cookies|consent to all|allow all)$/i.test((c.textContent || "").trim())) return true;
    }
    return false;
  }

  /* ---- COOKIE WRITERS — categorized first-party demo cookies -------------
     Real cookies that appear/disappear as categories are toggled in the
     Securiti banner (and get picked up by a Securiti cookie re-scan):
       essential → always written
       analytics → usage tracking; written when Analytics/Performance granted
       marketing → custom ads, retargeting, email/Mailchimp; when Advertising granted
     Withdraw a category and the matching cookies are deleted.
     ------------------------------------------------------------------------ */
  function ckPrefix() {
    var b = (document.documentElement.getAttribute("data-brand") || "site").toLowerCase();
    return b.indexOf("nova") >= 0 ? "nm" : b.indexOf("merid") >= 0 ? "mfg" : "site";
  }
  function rid(n) { var s = "", c = "abcdefghijklmnopqrstuvwxyz0123456789"; for (var i = 0; i < n; i++) s += c[Math.floor(Math.random() * c.length)]; return s; }
  function rnum(n) { var s = ""; for (var i = 0; i < n; i++) s += Math.floor(Math.random() * 10); return s; }
  var COOKIES = null;
  function cookieCatalog() {
    if (COOKIES) return COOKIES;
    var p = ckPrefix(), ts = Math.floor(Date.now() / 1000);
    COOKIES = [
      // Essential — strictly necessary (always set)
      { n: p + "_session",              cat: "essential", v: rid(24),                       days: 0 },
      { n: p + "_csrf_token",           cat: "essential", v: rid(32),                       days: 0 },
      // Performance & Functionality
      { n: p + "_performance",          cat: "analytics", v: rid(12),                       days: 180 },
      // Analytics & Customization
      { n: p + "_analytics_ga",         cat: "analytics", v: "GA1.1." + rnum(9) + "." + ts, days: 365 },
      { n: p + "_analytics_session",    cat: "analytics", v: rid(16),                       days: 1 },
      { n: p + "_analytics_pageviews",  cat: "analytics", v: "1",                           days: 365 },
      // Advertising / marketing
      { n: p + "_ads_google_click",     cat: "marketing", v: rid(20),                       days: 90 },
      { n: p + "_ads_meta_pixel",       cat: "marketing", v: "fb.1." + ts + "." + rnum(13), days: 90 },
      { n: p + "_ads_tiktok_click",     cat: "marketing", v: rid(20),                       days: 90 },
      { n: p + "_ads_audience_segment", cat: "marketing", v: ["auto","home","tech","travel"][Math.floor(Math.random() * 4)], days: 180 },
      { n: p + "_ads_retargeting",      cat: "marketing", v: rid(18),                       days: 180 },
      { n: p + "_marketing_email",      cat: "marketing", v: rid(20),                       days: 365 },
      { n: p + "_marketing_campaign",   cat: "marketing", v: "summer_" + rnum(4),           days: 60 },
      // Social Networking
      { n: p + "_social_connect",       cat: "marketing", v: rid(18),                       days: 180 },
      // Precise Geolocation
      { n: p + "_geo_store_locator",    cat: "marketing", v: "geo_" + rnum(4),              days: 30 }
    ];
    return COOKIES;
  }
  function hasCk(name) { return new RegExp("(^|;\\s*)" + name + "=").test(document.cookie); }
  function setCk(c) {
    if (hasCk(c.n)) return;
    var s = c.n + "=" + encodeURIComponent(c.v) + ";path=/;SameSite=Lax";
    if (c.days > 0) s += ";max-age=" + (c.days * 86400);
    document.cookie = s;
  }
  function delCk(name) {
    if (!hasCk(name)) return;
    ["/", location.pathname].forEach(function (p) {
      [location.hostname, "." + location.hostname, "", ""].forEach(function (d) {
        document.cookie = name + "=;max-age=0;path=" + p + (d ? ";domain=" + d : "");
      });
    });
  }
  function writeDemoCookies() {
    cookieCatalog().forEach(function (c) {
      var allowed = c.cat === "essential" ? true
                  : c.cat === "analytics" ? state.analytics
                  : c.cat === "marketing" ? state.marketing : false;
      if (allowed) setCk(c); else delCk(c.n);
    });
  }

  // Bridge Securiti consent → Google Consent Mode v2 so gtag.js / GA4 (and any
  // GTM ad tags) activate on the visitor's Securiti choice. Equivalent to
  // enabling "Consent Mode Category Mapping" in the Securiti console.
  var lastGcm = "";
  function syncConsentMode() {
    if (typeof window.gtag !== "function") return;
    var a = state.analytics ? "granted" : "denied";
    var m = state.marketing ? "granted" : "denied";
    var sig = a + "|" + m;
    if (sig === lastGcm) return;               // only push on change
    lastGcm = sig;
    window.gtag("consent", "update", {
      analytics_storage: a,
      ad_storage: m,
      ad_user_data: m,
      ad_personalization: m
    });
  }

  /* ---- Securiti CMP: intentionally NOT patched ---------------------------
     Earlier versions of this file forced the SDK's `disabled-link` guard off the
     "Advanced Settings" link, then tried to paper over the fallout by hiding the
     IAB Purposes / Vendor List tabs and blanking "undefined" text. Both were
     symptom patches for the SAME underlying problem — the IAB TCF vendor data not
     loading — and each one degraded the preference centre further. They are
     removed. The SDK's own behaviour is correct: it keeps the link disabled until
     the vendor data is in, and enables it by itself once loaded.
     If "Advanced Settings" stays greyed or the IAB tabs render "undefined", that
     is the TCF/GVL data failing to load — diagnose it, do not mask it:
       __tcfapi('ping', 2, console.log)            → cmpStatus should be "loaded"
       __tcfapi('getVendorList', 2, console.log)   → should return ~1,200 vendors
     and check the console for "<lang> language is unsupported by IAB TCF." */

  function apply() {
    ensureHost();
    syncConsentMode();
    if (state.analytics) loadGTM();
    if (state.marketing) loadMailchimp();
    writeDemoCookies();
    document.querySelectorAll("#cd-stack [data-w]").forEach(function (n) {
      var cat = n.getAttribute("data-w");
      n.style.display = state[cat] ? "" : "none";
    });
    // Reset button only once the banner is dismissed, so it never overlaps it.
    var reset = document.getElementById("cd-reset");
    if (reset) reset.style.display = bannerVisible() ? "none" : "";
    positionWidgets();
  }

  function cdVisible(el) {
    if (!el) return false;
    var cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity || "1") === 0) return false;
    var r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1 && r.bottom > 0 && r.top < window.innerHeight;
  }
  // Keep the floating widgets clear of the Securiti consent UI at the bottom of the
  // screen. Hide them while the full preference center is open (avoids overlap on any
  // width); otherwise sit above the banner bar when it is on screen.
  function positionWidgets() {
    var stack = document.getElementById("cd-stack"), reset = document.getElementById("cd-reset");
    if (!stack) return;
    if (cdVisible(document.querySelector(".cmp-modal")) ||
        cdVisible(document.querySelector(".f-gpc-banner"))) {
      stack.style.display = "none";
      if (reset) reset.style.display = "none";
      return;
    }
    stack.style.display = "flex";
    var floor = 16;
    var bar = document.querySelector(".cc-window");
    if (cdVisible(bar)) {
      var r = bar.getBoundingClientRect();
      if (r.bottom >= window.innerHeight - 8) floor = Math.round(window.innerHeight - r.top + 14);
    }
    var resetShown = reset && reset.style.display !== "none";
    if (reset) reset.style.bottom = floor + "px";
    stack.style.bottom = (floor + (resetShown ? 52 : 6)) + "px";
  }

  /* ---- reset ---------------------------------------------------------- */
  function resetConsent() {
    try {
      document.cookie.split(";").forEach(function (c) {
        var name = c.split("=")[0].trim(); if (!name) return;
        var doms = [location.hostname, "." + location.hostname, "", ""];
        var paths = ["/", location.pathname, ""];
        doms.forEach(function (d) {
          paths.forEach(function (p) {
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=" + p + (d ? ";domain=" + d : "");
          });
        });
      });
      localStorage.clear(); sessionStorage.clear();
    } catch (e) {}
    location.reload();
  }
  // expose for a footer link if wanted
  window.resetSecuritiConsent = resetConsent;

  /* ---- init ----------------------------------------------------------- */
  hookDataLayer(); refresh();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply);
  else apply();
  // catch the SDK finishing after us
  if (window.SecuritiSDK && typeof window.SecuritiSDK.onReady === "function") {
    try { window.SecuritiSDK.onReady(function () { refresh(); apply(); }); } catch (e) {}
  }
  // banner dismissal may not emit a dataLayer event — poll lightly so the
  // reset button toggles with the banner's presence.
  setInterval(function () { refresh(); apply(); }, 1200);
})();
