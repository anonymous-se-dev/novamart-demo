/* ==========================================================================
   account.js — static demo login + per-user Privacy & Data (shared by both sites)
   --------------------------------------------------------------------------
   Ties the identity layer to the Securiti consent + preference story:

   • Static demo users (no backend). Sign in from the header.
   • On login we SEED that user's consent profile into Securiti's own consent
     cookie (__privaci_cookie_consents) so each user demonstrates a distinct
     consent state, and SEED their interests into the personalization behaviour
     cookie so the "Recommended for you" rail is tailored to them.
   • A "Privacy & Data" panel shows the signed-in user's live consent state,
     their preferences, and links straight into the Securiti preference center
     and a Privacy-Center/DSR request scaffold.

   Cross-domain consent sharing is intentionally out of scope for now.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  var ACCENT = root.getAttribute("data-accent") || "#111827";
  var BRAND = root.getAttribute("data-brand") || "This site";
  var lb = BRAND.toLowerCase();
  var SITE = lb.indexOf("nova") >= 0 ? "nm" : lb.indexOf("merid") >= 0 ? "mfg" : "site";

  function ids(a) {
    return (root.getAttribute(a) || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
  }
  var MKT = ids("data-mkt");                 // Advertising, Social
  var ANA = ids("data-ana");                 // Analytics, Performance
  var ESS = SITE === "nm" ? "12" : SITE === "mfg" ? "4" : "";
  var BKEY = SITE + "_ad_personalization";   // personalize.js behaviour cookie
  var LSKEY = SITE + "_demo_user";           // session marker (localStorage)

  var USERS = ({
    nm: [
      { email: "alex@novamart.demo", pass: "demo", name: "Alex Rivera", plan: "NovaMart Rewards · Gold",
        interests: ["Electronics", "Home"], consent: { analytics: true, marketing: true } },
      { email: "sam@novamart.demo", pass: "demo", name: "Sam Chen", plan: "NovaMart Rewards · Silver",
        interests: ["Fashion", "Grocery"], consent: { analytics: true, marketing: false } }
    ],
    mfg: [
      { email: "jordan@meridian.demo", pass: "demo", name: "Jordan Blake", plan: "Private Wealth client",
        interests: ["Wealth", "Business"], consent: { analytics: true, marketing: true } },
      { email: "taylor@meridian.demo", pass: "demo", name: "Taylor Reed", plan: "Everyday Banking client",
        interests: ["Banking", "Lending"], consent: { analytics: false, marketing: false } }
    ]
  })[SITE] || [];

  function byEmail(e) { e = (e || "").toLowerCase().trim(); for (var i = 0; i < USERS.length; i++) if (USERS[i].email === e) return USERS[i]; return null; }
  function currentUser() { try { return byEmail(localStorage.getItem(LSKEY)); } catch (e) { return null; } }

  /* ---- consent + behaviour seeding ------------------------------------ */
  function b64(s) { try { return btoa(unescape(encodeURIComponent(s))); } catch (e) { return btoa(s); } }
  function setCookie(name, val, days, domain) {
    document.cookie = name + "=" + val + ";path=/;max-age=" + (days * 86400) + ";SameSite=Lax" + (domain ? ";domain=" + domain : "");
  }
  function seedConsent(u) {
    var c = {}; if (ESS) c[ESS] = 1;
    ANA.forEach(function (id) { c[id] = u.consent.analytics ? 1 : 0; });
    MKT.forEach(function (id) { c[id] = u.consent.marketing ? 1 : 0; });
    var val = b64(JSON.stringify({ consents: c }));
    setCookie("__privaci_cookie_consents", val, 365, "");
    setCookie("__privaci_cookie_no_action", "false", 365, "");  // banner already actioned
  }
  function seedBehavior(u) {
    // personalization only renders with marketing consent (see personalize.js)
    if (!u.consent.marketing) { document.cookie = BKEY + "=;max-age=0;path=/"; return; }
    var cats = {}; u.interests.forEach(function (cat, i) { cats[cat] = 10 - i * 2; });
    setCookie(BKEY, encodeURIComponent(JSON.stringify({ cats: cats, items: [] })), 180, "");
  }

  /* ---- IDENTITY LINKING ------------------------------------------------
     Without this the Securiti consent record is keyed to an anonymous, per-browser
     UUID — so the operator sees "4e448289-…" instead of a person, and the Privacy
     Center has to ask for an email to find you. The SDK exposes
     window.setConsentBannerParams({uuid}) (→ bannerConfigUtils.setUUID), which
     stamps the cookie-consent record with OUR identifier instead. Call it with the
     signed-in user's email on every page as soon as the SDK is present, so cookie
     consent and the signed-in identity are the same subject.
     NOTE: this links the COOKIE plane. Linking the Privacy Center's "Consent
     Preferences" (UCM) plane needs the universal-preference-center iframe with
     `primaryIdentifier` — see PREF_CENTER below. */
  function linkConsentIdentity(u, tries) {
    if (!u) return;
    tries = tries || 0;
    try {
      if (typeof window.setConsentBannerParams === "function") {
        window.setConsentBannerParams({ uuid: u.email });
        return;
      }
    } catch (e) {}
    if (tries < 40) setTimeout(function () { linkConsentIdentity(u, tries + 1); }, 250); // SDK loads async
  }

  function login(u) {
    try { localStorage.setItem(LSKEY, u.email); } catch (e) {}
    seedConsent(u); seedBehavior(u);
    linkConsentIdentity(u);
    location.reload();
  }
  function logout() {
    try { localStorage.removeItem(LSKEY); } catch (e) {}
    location.reload();
  }

  /* ---- consent read (for the panel) ----------------------------------- */
  function decodeConsents(raw) {
    var t = []; try { t.push(atob(raw)); } catch (e) {} try { t.push(decodeURIComponent(raw)); } catch (e) {} t.push(raw);
    for (var i = 0; i < t.length; i++) { try { var o = JSON.parse(t[i]); if (o && o.consents) return o.consents; } catch (e) {} }
    return null;
  }
  function catState() {
    var m = document.cookie.match(/(?:^|;\s*)__privaci_cookie_consents=([^;]+)/);
    var c = (m ? decodeConsents(m[1]) : null) || {};
    return {
      analytics: ANA.some(function (id) { return String(c[id]) === "1"; }),
      marketing: MKT.some(function (id) { return String(c[id]) === "1"; })
    };
  }

  /* ---- tiny DOM helper ------------------------------------------------ */
  function el(html) { var d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }
  function overlay(inner, wide) {
    var o = el('<div style="position:fixed;inset:0;z-index:2147483600;background:rgba(15,23,42,.55);' +
      'display:flex;align-items:center;justify-content:center;padding:16px;font:400 14px Inter,system-ui,sans-serif">' +
      '<div role="dialog" style="background:#fff;color:#0f172a;border-radius:18px;width:100%;max-width:' + (wide ? "440" : "400") + 'px;' +
      'max-height:90vh;overflow:auto;box-shadow:0 30px 80px -20px rgba(0,0,0,.6)"></div></div>');
    o.firstChild.appendChild(inner);
    o.addEventListener("click", function (e) { if (e.target === o) document.body.removeChild(o); });
    document.body.appendChild(o); return o;
  }
  function pill(on) {
    return '<span style="display:inline-block;padding:2px 10px;border-radius:999px;font-weight:700;font-size:12px;' +
      (on ? "background:#dcfce7;color:#166534" : "background:#f1f5f9;color:#64748b") + '">' + (on ? "Allowed" : "Off") + '</span>';
  }

  /* ---- login modal ---------------------------------------------------- */
  function openLogin() {
    var quick = USERS.map(function (u) {
      return '<button data-email="' + u.email + '" class="cd-quick" style="text-align:left;border:1px solid #e2e8f0;background:#f8fafc;' +
        'border-radius:10px;padding:8px 10px;cursor:pointer;font:inherit;width:100%">' +
        '<div style="font-weight:700">' + u.name + '</div><div style="color:#64748b;font-size:12px">' + u.email + ' · password: <b>demo</b></div></button>';
    }).join("");
    var body = el(
      '<div style="padding:22px 22px 20px">' +
      '<div style="font:800 20px \'Playfair Display\',Inter,serif;margin-bottom:2px">Sign in to ' + BRAND + '</div>' +
      '<div style="color:#64748b;margin-bottom:16px">Demo accounts — pick one or type the credentials.</div>' +
      '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">' + quick + '</div>' +
      '<input class="cd-email" type="email" placeholder="Email" style="width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:10px 12px;font:inherit;margin-bottom:8px">' +
      '<input class="cd-pass" type="password" placeholder="Password" style="width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:10px 12px;font:inherit">' +
      '<div class="cd-err" style="color:#dc2626;font-size:13px;min-height:18px;margin:6px 2px"></div>' +
      '<button class="cd-signin" style="width:100%;border:none;border-radius:10px;padding:11px;font:700 15px Inter;color:#fff;cursor:pointer;background:' + ACCENT + '">Sign in</button>' +
      '<button class="cd-cancel" style="width:100%;border:none;background:none;color:#64748b;padding:10px;margin-top:4px;cursor:pointer;font:inherit">Cancel</button>' +
      '</div>');
    var o = overlay(body);
    var email = body.querySelector(".cd-email"), pass = body.querySelector(".cd-pass"), err = body.querySelector(".cd-err");
    body.querySelectorAll(".cd-quick").forEach(function (b) {
      b.addEventListener("click", function () { email.value = b.getAttribute("data-email"); pass.value = "demo"; });
    });
    function attempt() {
      var u = byEmail(email.value);
      if (!u || pass.value !== u.pass) { err.textContent = "Invalid email or password."; return; }
      login(u);
    }
    body.querySelector(".cd-signin").addEventListener("click", attempt);
    pass.addEventListener("keydown", function (e) { if (e.key === "Enter") attempt(); });
    body.querySelector(".cd-cancel").addEventListener("click", function () { document.body.removeChild(o); });
  }

  /* ---- Privacy & Data panel ------------------------------------------- */
  function openPanel(u) {
    var s = catState();
    var body = el(
      '<div style="padding:22px">' +
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:4px">' +
      '<div style="width:42px;height:42px;border-radius:999px;background:' + ACCENT + ';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:17px">' + u.name.charAt(0) + '</div>' +
      '<div><div style="font-weight:800;font-size:17px">' + u.name + '</div><div style="color:#64748b;font-size:13px">' + u.email + '</div></div></div>' +
      '<div style="color:#64748b;font-size:13px;margin:2px 0 16px">' + u.plan + '</div>' +

      '<div style="font-weight:800;margin-bottom:8px">Your consent</div>' +
      '<div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:16px">' +
      '<div style="display:flex;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #eef2f7"><span>Essential</span><span style="color:#64748b;font-weight:700;font-size:12px">Always on</span></div>' +
      '<div style="display:flex;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #eef2f7"><span>Analytics &amp; Customization</span>' + pill(s.analytics) + '</div>' +
      '<div style="display:flex;justify-content:space-between;padding:10px 12px"><span>Advertising / Marketing</span>' + pill(s.marketing) + '</div>' +
      '</div>' +

      '<div style="font-weight:800;margin-bottom:8px">Your preferences</div>' +
      '<div style="color:#334155;font-size:13px;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;margin-bottom:18px">' +
      '<div>Personalized for: <b>' + u.interests.join(", ") + '</b></div>' +
      '<div style="color:#64748b;margin-top:2px">' + (s.marketing ? "Recommendations tailored to you are on." : "Turn on Advertising cookies to see tailored recommendations.") + '</div></div>' +

      '<button class="cd-managecookies" style="width:100%;border:none;border-radius:10px;padding:11px;font:700 14px Inter;color:#fff;cursor:pointer;background:' + ACCENT + ';margin-bottom:8px">Manage cookie preferences</button>' +
      '<a href="https://privacy-central.securiti.ai/#/form-access-preference/6be13b8f-fdb6-4dc0-a0e0-5b917a0ad5ac/54bfc98c-4bfe-45f8-813f-e4e3aec09c65" target="_blank" rel="noopener" style="display:block;text-align:center;text-decoration:none;border:1.5px solid ' + ACCENT + ';border-radius:10px;padding:10px;font:700 14px Inter;color:' + ACCENT + ';background:#fff;margin-bottom:8px">Manage communication preferences ↗</a>' +
      '<button class="cd-dsr" style="width:100%;border:1.5px solid ' + ACCENT + ';border-radius:10px;padding:10px;font:700 14px Inter;color:' + ACCENT + ';background:#fff;cursor:pointer;margin-bottom:8px">Privacy Center — submit a request</button>' +
      '<button class="cd-signout" style="width:100%;border:none;background:none;color:#64748b;padding:10px;cursor:pointer;font:inherit">Sign out</button>' +
      '</div>');
    var o = overlay(body, true);
    body.querySelector(".cd-managecookies").addEventListener("click", function () {
      document.body.removeChild(o);
      if (typeof window.showConsentPreferencesPopup === "function") window.showConsentPreferencesPopup();
    });
    body.querySelector(".cd-dsr").addEventListener("click", function () { document.body.removeChild(o); openDSR(u); });
    body.querySelector(".cd-signout").addEventListener("click", logout);
  }

  /* ---- Privacy Center / DSR scaffold ---------------------------------- */
  function openDSR(u) {
    location.href = "privacy-center.html#request"; return;
    var body = el(
      '<div style="padding:22px">' +
      '<div style="font:800 19px \'Playfair Display\',Inter,serif;margin-bottom:2px">Privacy Center</div>' +
      '<div style="color:#64748b;margin-bottom:16px">Submit a data-subject request. Powered by Securiti DSR.</div>' +
      '<label style="font-weight:700;font-size:13px">Request type</label>' +
      '<select class="cd-type" style="width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:10px 12px;font:inherit;margin:6px 0 12px">' +
      '<option>Access my data</option><option>Delete my data</option><option>Do not sell/share my data</option><option>Correct my data</option></select>' +
      '<label style="font-weight:700;font-size:13px">Email</label>' +
      '<input class="cd-dsr-email" type="email" value="' + u.email + '" style="width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:10px 12px;font:inherit;margin:6px 0 14px">' +
      '<button class="cd-dsr-submit" style="width:100%;border:none;border-radius:10px;padding:11px;font:700 14px Inter;color:#fff;cursor:pointer;background:' + ACCENT + '">Submit request</button>' +
      '<button class="cd-dsr-cancel" style="width:100%;border:none;background:none;color:#64748b;padding:10px;margin-top:4px;cursor:pointer;font:inherit">Back</button>' +
      '<div class="cd-dsr-done" style="display:none;text-align:center;padding:8px 0 2px"></div>' +
      '</div>');
    var o = overlay(body, true);
    body.querySelector(".cd-dsr-cancel").addEventListener("click", function () { document.body.removeChild(o); openPanel(u); });
    body.querySelector(".cd-dsr-submit").addEventListener("click", function () {
      var type = body.querySelector(".cd-type").value;
      var ref = "DSR-" + Math.random().toString(36).slice(2, 7).toUpperCase();
      body.querySelectorAll("select,input,label,.cd-dsr-submit,.cd-dsr-cancel").forEach(function (n) { n.style.display = "none"; });
      var done = body.querySelector(".cd-dsr-done");
      done.style.display = "block";
      done.innerHTML = '<div style="font-size:34px">✅</div><div style="font-weight:800;margin:4px 0">Request received</div>' +
        '<div style="color:#475569;font-size:13px">Your <b>' + type + '</b> request was logged as <b>' + ref + '</b>.<br>You\'ll get an email at ' + u.email + ' with next steps.</div>';
    });
  }

  /* ---- header wiring -------------------------------------------------- */
  function wireHeader() {
    var btn = document.getElementById("cd-auth");
    if (!btn) {
      // fallback: first header link/button whose text is Account or Log In
      var cands = document.querySelectorAll("header a, header button, nav a, nav button");
      for (var i = 0; i < cands.length; i++) {
        var t = (cands[i].textContent || "").trim().toLowerCase();
        if (t === "account" || t === "log in" || t === "login" || t === "sign in") { btn = cands[i]; break; }
      }
    }
    if (!btn) return;
    var u = currentUser();
    if (u) {
      var label = btn.querySelector("span") || btn;
      label.textContent = u.name.split(" ")[0];
    }
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      var cu = currentUser();
      if (cu) openPanel(cu); else openLogin();
    });
  }

  // Re-assert the identity link on every page load while signed in (the SDK is
  // re-initialised per page, and loads asynchronously after this script).
  linkConsentIdentity(currentUser());

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wireHeader);
  else wireHeader();

  // expose for other scripts / console demoing
  window.DemoAccount = { current: currentUser, login: login, logout: logout, openLogin: openLogin };
})();
