/* ==========================================================================
   demo-cookies.js — one script per Securiti cookie category
   --------------------------------------------------------------------------
   The build copies this file to several names, one per category:
     assets/js/cookies-advertising.js   data-role="advertising"
     assets/js/cookies-analytics.js     data-role="analytics"   … and so on
     assets/js/cookie-cleanup.js        data-role="cleanup"
   A category script WRITES only its own category's cookies, so Securiti's scan
   maps each script (initiator) to exactly one category. With Securiti
   auto-blocking on, a declined category's script is blocked outright: the
   cookies never appear because the script never runs.

   cookie-cleanup.js writes nothing (so it is never categorized or blocked); it
   DELETES cookies whose category has been withdrawn, which a blocked category
   script cannot do for itself.

   Without auto-blocking (e.g. Meridian), each category script also checks
   consent itself, so the cookies still follow the banner.

   Attributes: data-role, data-prefix ("nm" | "mfg"), data-cats (JSON map of
   category key -> this domain's Securiti category ID).
   ========================================================================== */
(function () {
  "use strict";

  var me = document.currentScript;
  var ROLE = (me && me.getAttribute("data-role")) || "cleanup";
  var P = (me && me.getAttribute("data-prefix")) || "site";
  var CATS = {};
  try { CATS = JSON.parse((me && me.getAttribute("data-cats")) || "{}"); } catch (e) {}
  var RETAIL = P === "nm";

  function rid(n) { var s = "", c = "abcdefghijklmnopqrstuvwxyz0123456789"; for (var i = 0; i < n; i++) s += c[Math.floor(Math.random() * c.length)]; return s; }
  function rnum(n) { var s = ""; for (var i = 0; i < n; i++) s += Math.floor(Math.random() * 10); return s; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  var ts = Math.floor(Date.now() / 1000);

  // Every non-essential demo cookie on the site. Essential cookies stay with consent-demo.js.
  var CATALOG = {
    performance: [
      { n: "_performance",          v: function () { return rid(12); },              days: 180 },
      { n: "_perf_lb_route",        v: function () { return "edge-" + rnum(2); },    days: 1 },
      { n: "_func_language",        v: function () { return "en-US"; },              days: 365 },
      { n: "_func_currency",        v: function () { return "USD"; },                days: 365 },
      { n: RETAIL ? "_func_recently_viewed" : "_func_rate_alerts", v: function () { return rid(10); }, days: 30 }
    ],
    analytics: [
      { n: "_analytics_ga",         v: function () { return "GA1.1." + rnum(9) + "." + ts; }, days: 365 },
      { n: "_analytics_session",    v: function () { return rid(16); },              days: 1 },
      { n: "_analytics_pageviews",  v: function () { return "1"; },                  days: 365 },
      { n: "_analytics_heatmap",    v: function () { return "hm." + rid(16); },      days: 90 },
      { n: "_analytics_ab_test",    v: function () { return pick(["control", "variant_b"]); }, days: 30 }
    ],
    advertising: [
      { n: "_ads_google_click",     v: function () { return rid(20); },              days: 90 },
      { n: "_ads_meta_pixel",       v: function () { return "fb.1." + ts + "." + rnum(13); }, days: 90 },
      { n: RETAIL ? "_ads_tiktok_click" : "_ads_linkedin_insight", v: function () { return rid(20); }, days: 90 },
      { n: "_ads_audience_segment", v: function () { return pick(RETAIL ? ["auto", "home", "tech", "travel"] : ["banking", "lending", "wealth", "business"]); }, days: 180 },
      { n: "_ads_retargeting",      v: function () { return rid(18); },              days: 180 },
      { n: "_marketing_email",      v: function () { return rid(20); },              days: 365 },
      { n: "_marketing_campaign",   v: function () { return (RETAIL ? "summer_" : "q3_") + rnum(4); }, days: 60 }
    ],
    social: [
      { n: "_social_connect",       v: function () { return rid(18); },              days: 180 },
      { n: "_social_share_widget",  v: function () { return rid(14); },              days: 180 },
      { n: "_social_login",         v: function () { return rid(18); },              days: 30 }
    ],
    geo: [
      { n: RETAIL ? "_geo_store_locator" : "_geo_branch_locator", v: function () { return "geo_" + rnum(4); }, days: 30 },
      { n: "_geo_precise_location", v: function () { return (RETAIL ? "40.71," : "41.88,") + rnum(2) + "|-7" + rnum(1) + "." + rnum(2); }, days: 1 },
      { n: "_geo_region",           v: function () { return RETAIL ? "US-NY" : "US-IL"; }, days: 30 }
    ],
    biometrics: [
      { n: RETAIL ? "_bio_virtual_tryon" : "_bio_voice_auth",  v: function () { return "tmpl_" + rid(20); }, days: 30 },
      { n: RETAIL ? "_bio_face_checkout" : "_bio_face_verify", v: function () { return "tmpl_" + rid(20); }, days: 30 }
    ]
  };

  // Securiti stores {"consents":{"<catId>":0|1}} as base64 JSON on live domains,
  // URL-encoded or plain JSON elsewhere (same decoding as consent-demo.js).
  function consents() {
    var m = document.cookie.match(/(?:^|;\s*)__privaci_cookie_consents=([^;]+)/);
    if (!m) return null;
    var raw = m[1], tries = [];
    try { tries.push(atob(raw)); } catch (e) {}
    try { tries.push(decodeURIComponent(raw)); } catch (e) {}
    tries.push(raw);
    for (var i = 0; i < tries.length; i++) {
      try { var o = JSON.parse(tries[i]); if (o && o.consents) return o.consents; } catch (e) {}
    }
    return null;
  }
  function granted(cat, c) { var id = CATS[cat]; return !!(c && id !== undefined && String(c[id]) === "1"); }
  function has(name) { return new RegExp("(^|;\\s*)" + name + "=").test(document.cookie); }
  function set(name, value, days) {
    if (has(name)) return;
    var s = name + "=" + encodeURIComponent(value) + ";path=/;SameSite=Lax";
    if (days > 0) s += ";max-age=" + (days * 86400);
    document.cookie = s;
  }
  function del(name) {
    if (!has(name)) return;
    ["/", location.pathname].forEach(function (p) {
      [location.hostname, "." + location.hostname, ""].forEach(function (d) {
        document.cookie = name + "=;max-age=0;path=" + p + (d ? ";domain=" + d : "");
      });
    });
  }

  var last = "";
  function sync() {
    var c = consents(), sig = c ? JSON.stringify(c) : "none";
    if (sig === last) return;
    last = sig;
    Object.keys(CATALOG).forEach(function (cat) {
      if (ROLE !== "cleanup" && ROLE !== cat) return;
      var ok = granted(cat, c);
      CATALOG[cat].forEach(function (ck) {
        if (ok) { if (ROLE === cat) set(P + ck.n, ck.v(), ck.days); }
        else del(P + ck.n);
      });
    });
  }

  sync();
  setInterval(sync, 1000);   // follow banner choices and Reset without hooking the SDK
})();
