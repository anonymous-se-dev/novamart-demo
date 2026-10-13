/* ==========================================================================
   extra-cookies.js — demo cookies for every Securiti cookie category
   --------------------------------------------------------------------------
   Adds first-party demo cookies to the categories the base demo layer covers
   thinly (Performance & Functionality, Analytics, Social Networking, Precise
   Geolocation, Biometrics). Each cookie is written only while ITS OWN category
   is consented in the Securiti banner, and deleted when consent is withdrawn,
   so a re-scan finds them and opting out visibly removes them.

   Category IDs are per Securiti domain, so the build passes them in:
     <script src="assets/js/extra-cookies.js" data-prefix="nm"
             data-cats='{"performance":45,"analytics":43,…}'></script>
   ========================================================================== */
(function () {
  "use strict";

  var me = document.currentScript;
  var P = (me && me.getAttribute("data-prefix")) || "site";
  var CATS = {};
  try { CATS = JSON.parse((me && me.getAttribute("data-cats")) || "{}"); } catch (e) {}

  function rid(n) { var s = "", c = "abcdefghijklmnopqrstuvwxyz0123456789"; for (var i = 0; i < n; i++) s += c[Math.floor(Math.random() * c.length)]; return s; }
  function rnum(n) { var s = ""; for (var i = 0; i < n; i++) s += Math.floor(Math.random() * 10); return s; }

  var RETAIL = P === "nm";
  var COOKIES = [
    // Performance & Functionality
    { n: P + "_perf_lb_route",         cat: "performance", v: "edge-" + rnum(2),                 days: 1 },
    { n: P + "_func_language",         cat: "performance", v: "en-US",                           days: 365 },
    { n: P + "_func_currency",         cat: "performance", v: "USD",                             days: 365 },
    { n: P + (RETAIL ? "_func_recently_viewed" : "_func_rate_alerts"), cat: "performance", v: rid(10), days: 30 },
    // Analytics & Customization
    { n: P + "_analytics_heatmap",     cat: "analytics",   v: "hm." + rid(16),                   days: 90 },
    { n: P + "_analytics_ab_test",     cat: "analytics",   v: ["control", "variant_b"][Math.floor(Math.random() * 2)], days: 30 },
    // Social Networking
    { n: P + "_social_share_widget",   cat: "social",      v: rid(14),                           days: 180 },
    { n: P + "_social_login",          cat: "social",      v: rid(18),                           days: 30 },
    // Precise Geolocation
    { n: P + "_geo_precise_location",  cat: "geo",         v: (RETAIL ? "40.71," : "41.88,") + rnum(2) + "|-7" + rnum(1) + "." + rnum(2), days: 1 },
    { n: P + "_geo_region",            cat: "geo",         v: RETAIL ? "US-NY" : "US-IL",         days: 30 },
    // Biometrics
    { n: P + (RETAIL ? "_bio_virtual_tryon" : "_bio_voice_auth"),  cat: "biometrics", v: "tmpl_" + rid(20), days: 30 },
    { n: P + (RETAIL ? "_bio_face_checkout" : "_bio_face_verify"), cat: "biometrics", v: "tmpl_" + rid(20), days: 30 }
  ];

  // Same decoding as consent-demo.js: Securiti stores {"consents":{"<catId>":0|1}} as
  // base64 JSON on live domains, URL-encoded or plain JSON elsewhere.
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
  function granted(cat, c) {
    var id = CATS[cat];
    return !!(c && id !== undefined && String(c[id]) === "1");
  }
  function has(name) { return new RegExp("(^|;\\s*)" + name + "=").test(document.cookie); }
  function set(c) {
    if (has(c.n)) return;
    var s = c.n + "=" + encodeURIComponent(c.v) + ";path=/;SameSite=Lax";
    if (c.days > 0) s += ";max-age=" + (c.days * 86400);
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
    var c = consents();
    var sig = c ? JSON.stringify(c) : "none";
    if (sig === last) return;
    last = sig;
    COOKIES.forEach(function (ck) { if (granted(ck.cat, c)) set(ck); else del(ck.n); });
  }

  sync();
  setInterval(sync, 1000);   // pick up banner choices (and Reset) without hooking the SDK
})();
