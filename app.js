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
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var status = document.getElementById("cm-status");
      var key = form.querySelector('[name="access_key"]').value;
      if (!key || key.indexOf("REPLACE_WITH") === 0) {
        if (status) {
          status.textContent = "Form not configured yet — please email hey@mettarealtypartners.com directly.";
          status.className = "cm-status is-error";
        }
        return;
      }
      if (status) { status.textContent = "Sending…"; status.className = "cm-status"; }
      var fd = new FormData(form);
      fetch(form.action, { method: "POST", body: fd })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && data.success) {
            if (status) { status.textContent = "Sent. I'll reply within a day."; status.className = "cm-status is-ok"; }
            form.reset();
          } else {
            if (status) { status.textContent = (data && data.message) || "Something broke — please email directly."; status.className = "cm-status is-error"; }
          }
        })
        .catch(function () {
          if (status) { status.textContent = "Network error — please email directly."; status.className = "cm-status is-error"; }
        });
    });
  }
})();
