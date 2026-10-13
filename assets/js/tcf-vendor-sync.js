/* ==========================================================================
   TCF vendor consent → Securiti Universal Consent
   --------------------------------------------------------------------------
   PROBLEM: Securiti's cookie-consent records are CATEGORY level. IAB TCF
   per-vendor choices live only inside the TC String, so an operator cannot see
   "Sam opted out of Criteo" anywhere in the Securiti UI.

   WHAT THIS DOES: watches the IAB TCF API for consent changes, works out which
   individual vendors the signed-in user granted or refused, and sends those to a
   small server-side bridge that writes them into Securiti Universal Consent —
   one consent purpose per vendor ("TCF Vendor: Criteo SA (#91)"), keyed to the
   user's identity. The operator then sees them in
   Universal Consent Management → Consent Records.

   Vendor names come from the TCF Global Vendor List (~1,200 vendors), so ANY
   TCF vendor is supported with no pre-configuration.

   NOTE ON CREDENTIALS: the Securiti Consent API needs tenant key/secret, which
   must never ship in a public page — hence the bridge (tcf-vendor-consent/lambda).
   Until BRIDGE_URL is set, changes are queued locally and can be pushed with
   tcf-vendor-consent/push-vendor-consent.py --from-json (see README).
   ========================================================================== */
(function () {
  "use strict";

  var CONFIG = {
    // Lambda Function URL of the bridge. Empty → queue locally only.
    // Same-origin path → CloudFront → "Demo Center Consent Mapper" Lambda
    // (the Lambda function URL itself is IAM-auth only, reachable via CloudFront OAC).
    BRIDGE_URL: "",
    SOURCE: "IAB TCF Preference Center"
  };

  var SITE = (document.documentElement.getAttribute("data-brand") || "site")
    .toLowerCase().indexOf("nova") >= 0 ? "nm" : "mfg";
  var SNAP_KEY = SITE + "_tcf_vendor_snapshot";
  var QUEUE_KEY = SITE + "_tcf_vendor_queue";

  function identity() {
    try {
      var u = window.DemoAccount && window.DemoAccount.current();
      return u ? u.email : null;
    } catch (e) { return null; }
  }

  function readJSON(k, fallback) {
    try { return JSON.parse(localStorage.getItem(k)) || fallback; } catch (e) { return fallback; }
  }
  function writeJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  /* ---- vendor names from the Global Vendor List ------------------------- */
  var gvl = null, gvlPending = false;
  function loadGVL(done) {
    if (gvl) { done(gvl); return; }
    if (typeof window.__tcfapi !== "function") { done(null); return; }
    if (gvlPending) { setTimeout(function () { loadGVL(done); }, 400); return; }
    gvlPending = true;
    try {
      window.__tcfapi("getVendorList", 2, function (d, ok) {
        gvlPending = false;
        gvl = (ok && d && d.vendors) ? d.vendors : null;
        done(gvl);
      });
    } catch (e) { gvlPending = false; done(null); }
  }
  function vendorName(id) {
    var v = gvl && gvl[String(id)];
    return (v && v.name) ? v.name : ("Vendor " + id);
  }

  /* ---- diff this consent state against the last one --------------------- */
  function diffVendors(consents) {
    var prev = readJSON(SNAP_KEY, null);
    var changes = [];
    Object.keys(consents || {}).forEach(function (id) {
      var now = !!consents[id];
      if (!prev || prev[id] !== now) changes.push({ id: Number(id), granted: now });
    });
    writeJSON(SNAP_KEY, consents || {});
    // First ever run has no baseline: only report REFUSALS, so the demo shows the
    // meaningful signal instead of ~1,200 "granted" rows.
    if (!prev) changes = changes.filter(function (c) { return c.granted === false; });
    return changes;
  }

  function send(who, changes, tcString) {
    if (!changes.length) return;
    var vendors = changes.map(function (c) {
      return { id: c.id, name: vendorName(c.id), granted: c.granted };
    });
    var payload = { identity: who, source: CONFIG.SOURCE, tcString: tcString || "", vendors: vendors };

    if (!CONFIG.BRIDGE_URL) {
      var q = readJSON(QUEUE_KEY, []);
      writeJSON(QUEUE_KEY, q.concat(vendors));
      console.info("[tcf-vendor-sync] queued " + vendors.length +
        " vendor decision(s) for " + who + " — no BRIDGE_URL set. " +
        "Run TCFVendorSync.pendingJSON() and push with push-vendor-consent.py --from-json");
      return;
    }
    fetch(CONFIG.BRIDGE_URL, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload), keepalive: true
    }).then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (res) { console.info("[tcf-vendor-sync] wrote", res && res.written, "to Securiti"); })
      .catch(function (e) { console.warn("[tcf-vendor-sync] bridge error", e); });
  }

  function handle(tcData) {
    if (!tcData || !tcData.vendor) return;
    var who = identity();
    if (!who) return;                       // per-user record needs a signed-in identity
    var changes = diffVendors(tcData.vendor.consents);
    if (!changes.length) return;
    loadGVL(function () { send(who, changes, tcData.tcString); });
  }

  /* ---- listen for consent changes --------------------------------------- */
  function start(tries) {
    tries = tries || 0;
    if (typeof window.__tcfapi !== "function") {
      if (tries < 40) setTimeout(function () { start(tries + 1); }, 250);
      return;
    }
    try {
      window.__tcfapi("addEventListener", 2, function (tcData, ok) {
        if (!ok || !tcData) return;
        // 'useractioncomplete' = the user just saved a choice; 'tcloaded' = existing state
        if (tcData.eventStatus === "useractioncomplete" || tcData.eventStatus === "tcloaded") handle(tcData);
      });
    } catch (e) {}
  }
  start();

  /* ---- helpers for demoing without the bridge ---------------------------- */
  window.TCFVendorSync = {
    /** JSON to feed: push-vendor-consent.py --identity <you> --from-json file.json */
    pendingJSON: function () { return JSON.stringify(readJSON(QUEUE_KEY, []), null, 1); },
    clearQueue: function () { writeJSON(QUEUE_KEY, []); },
    /** push the CURRENT full vendor state (not just changes) */
    pushAll: function () {
      if (typeof window.__tcfapi !== "function") return "no TCF api";
      window.__tcfapi("getTCData", 2, function (d, ok) {
        if (!ok || !d || !d.vendor) return;
        var who = identity(); if (!who) { console.warn("[tcf-vendor-sync] sign in first"); return; }
        var all = Object.keys(d.vendor.consents || {}).map(function (id) {
          return { id: Number(id), granted: !!d.vendor.consents[id] };
        });
        loadGVL(function () { send(who, all, d.tcString); });
      });
      return "requested";
    }
  };
})();
