(function () {
  "use strict";

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  var tabs = document.querySelectorAll("[data-route]");
  var pages = document.querySelectorAll(".page");

  function go(route, push) {
    var found = false;
    pages.forEach(function (p) {
      var active = p.id === route;
      p.classList.toggle("is-active", active);
      if (active) { p.removeAttribute("hidden"); found = true; }
      else { p.setAttribute("hidden", ""); }
    });
    if (!found) return;
    document.querySelectorAll(".tab").forEach(function (t) {
      var on = t.getAttribute("data-route") === route;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    if (push && history.pushState) history.pushState({ route: route }, "", "#" + route);
    requestAnimationFrame(observeReveals);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  tabs.forEach(function (el) {
    el.addEventListener("click", function (e) {
      var route = el.getAttribute("data-route");
      if (!route) return;
      e.preventDefault();
      go(route, true);
    });
  });

  window.addEventListener("popstate", function (e) {
    var route = (e.state && e.state.route) || (location.hash || "").replace("#", "") || pages[0].id;
    go(route, false);
  });

  var initial = (location.hash || "").replace("#", "") || pages[0].id;
  go(initial, false);

  var revealObserver = null;
  function observeReveals() {
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(".reveal").forEach(function (n) { n.classList.add("is-visible"); });
      return;
    }
    if (revealObserver) revealObserver.disconnect();
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    document.querySelectorAll(".page.is-active .reveal:not(.is-visible)").forEach(function (n) {
      revealObserver.observe(n);
    });
  }
  observeReveals();

  // ─── Contact form ────────────────────────────────────────
  var form = document.getElementById("contact-form");
  if (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var status = document.getElementById("cm-status");
      var cfg = window.RP_CONFIG || {};
      if (form.botcheck && form.botcheck.checked) return;

      if (status) { status.textContent = "Sending…"; status.className = "cm-status"; }
      var fd = new FormData(form);
      var lead = {
        name: fd.get("name"),
        email: fd.get("email"),
        phone: fd.get("phone") || null,
        company: null,
        role: fd.get("role") || null,
        message: fd.get("message") || null,
        source: "contact_realty",
        domain: "mettarealtypartners.com",
        user_agent: navigator.userAgent,
        referrer: document.referrer || null,
        metadata: { page: location.pathname }
      };

      var results = await Promise.allSettled([
        cfg.SUPABASE_URL ? fetch(cfg.SUPABASE_URL + "/rest/v1/leads", {
          method: "POST",
          headers: {
            "apikey": cfg.SUPABASE_ANON_KEY,
            "Authorization": "Bearer " + cfg.SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
          },
          body: JSON.stringify(lead)
        }) : Promise.reject("supabase-not-configured"),
        (function(){
          var w = new FormData();
          w.append("access_key", cfg.WEB3FORMS_KEY || "REPLACE_WITH_WEB3FORMS_KEY_REALTY");
          w.append("subject", "mettarealtypartners.com — new inquiry from " + lead.name);
          w.append("from_name", "mettarealtypartners.com");
          if (lead.email) w.append("replyto", lead.email);
          w.append("name", lead.name);
          w.append("email", lead.email);
          w.append("phone", lead.phone || "");
          w.append("role", lead.role || "");
          w.append("message", lead.message || "");
          return fetch("https://api.web3forms.com/submit", { method: "POST", body: w });
        })(),
        (cfg.GOOGLE_SHEETS_WEBHOOK_URL && cfg.GOOGLE_SHEETS_WEBHOOK_URL.indexOf("REPLACE_WITH") !== 0)
          ? fetch(cfg.GOOGLE_SHEETS_WEBHOOK_URL, {
              method: "POST",
              mode: "no-cors",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(lead)
            })
          : Promise.reject("sheets-webhook-not-configured")
      ]);

      var anyOk = results.some(function(r){
        return r.status === "fulfilled" && (r.value === undefined || (r.value && (r.value.ok || r.value.type === "opaque")));
      });
      if (anyOk) {
        if (status) { status.textContent = "Sent. I'll reply within a day."; status.className = "cm-status is-ok"; }
        form.reset();
        if (window.gtag) gtag("event", "contact_submit", { domain: "mettarealtypartners.com", role: lead.role });
      } else {
        if (status) { status.textContent = "Something broke. Email hey@mettarealtypartners.com directly."; status.className = "cm-status is-error"; }
      }
    });
  }
})();
