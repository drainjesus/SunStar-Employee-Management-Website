(function () {
  function initAdminSidebarRoutingFix() {
    const path = (window.location.pathname || "").replace(/\\/g, "/");
    if (!/\/admin\//.test(path)) return;

    const sidebar = document.querySelector("aside");
    if (!sidebar) return;

    if (!document.getElementById("admin-sidebar-routing-fix-style")) {
      const style = document.createElement("style");
      style.id = "admin-sidebar-routing-fix-style";
      style.textContent = [
        ".hidden { display: none !important; }",
        "aside { position: relative; z-index: 40; }",
        "aside nav a { pointer-events: auto; cursor: pointer; }"
      ].join("\n");
      document.head.appendChild(style);
    }

    const links = sidebar.querySelectorAll("nav a[href]");
    links.forEach(link => {
      if (link.dataset.navFixBound === "1") return;
      link.dataset.navFixBound = "1";

      link.addEventListener(
        "click",
        event => {
          const href = link.getAttribute("href");
          if (!href || href === "#" || href.startsWith("javascript:")) return;

          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
            return;
          }

          event.preventDefault();
          window.location.assign(href);
        },
        true
      );
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAdminSidebarRoutingFix, { once: true });
  } else {
    initAdminSidebarRoutingFix();
  }
})();