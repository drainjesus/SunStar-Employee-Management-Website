(function () {
  const path = (window.location.pathname || "").replace(/\\/g, "/");
  const isAdmin = /\/admin\//.test(path);
  const isEmployee = /\/employee\//.test(path);

  if (!isAdmin && !isEmployee) return;

  const MOBILE_BREAKPOINT = 1024;

  const navMap = {
    admin: [
      { href: "admin-dashboard.html", label: "Dashboard" },
      { href: "admin_employee_management.html", label: "Employee Mgmt" },
      { href: "admin_master_data.html", label: "Master Data" },
      { href: "admin_attendance_monitoring.html", label: "Attendance" },
      { href: "admin_leave_management.html", label: "Leave" },
      { href: "admin_training_development.html", label: "Training" },
      { href: "admin_employee_performance.html", label: "Performance" },
      { href: "admin_report_analytics.html", label: "Reports" }
    ],
    employee: [
      { href: "employee_dashboard.html", label: "Dashboard" },
      { href: "employee_attendance.html", label: "Attendance" },
      { href: "employee_leave.html", label: "Leave" },
      { href: "employee_training.html", label: "Training" },
      { href: "employee_performance.html", label: "Performance" },
      { href: "employee_settings.html", label: "Settings" }
    ]
  };

  function isMobile() {
    return window.innerWidth < MOBILE_BREAKPOINT;
  }

  function ensureStyles() {
    if (document.getElementById("mobile-responsive-styles")) return;

    const style = document.createElement("style");
    style.id = "mobile-responsive-styles";
    style.textContent = `
      @media (max-width: 1023px) {
        body.mobile-nav-enabled {
          padding-top: 56px;
          overflow-x: hidden;
        }

        #mobile-top-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 60;
          background: rgba(255, 255, 255, 0.97);
          border-bottom: 1px solid #e4e4e7;
          backdrop-filter: blur(6px);
        }

        #mobile-top-nav .inner {
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 0 12px;
          font-family: Inter, sans-serif;
        }

        #mobile-top-nav .portal {
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .08em;
          color: #3f3f46;
          white-space: nowrap;
        }

        #mobile-top-nav .controls {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        #mobile-top-nav select {
          min-width: 140px;
          max-width: 200px;
          height: 34px;
          border: 1px solid #d4d4d8;
          border-radius: 8px;
          padding: 0 8px;
          font-size: 13px;
          font-weight: 600;
          background: #fff;
          color: #18181b;
        }

        #mobile-top-nav button {
          height: 34px;
          border: 1px solid #d4d4d8;
          border-radius: 8px;
          padding: 0 10px;
          font-size: 12px;
          font-weight: 700;
          background: #fff;
          color: #18181b;
          text-transform: uppercase;
          letter-spacing: .04em;
        }

        .mobile-table-wrap {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .mobile-table-wrap table {
          min-width: 720px;
        }

        [role="dialog"] .relative.transform.overflow-hidden {
          width: calc(100vw - 16px) !important;
          max-width: calc(100vw - 16px) !important;
          margin-left: auto !important;
          margin-right: auto !important;
        }

        input,
        select,
        textarea {
          font-size: 16px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function wrapTablesForMobile() {
    if (!isMobile()) return;

    document.querySelectorAll("table").forEach(table => {
      if (table.parentElement && table.parentElement.classList.contains("mobile-table-wrap")) {
        return;
      }

      const wrapper = document.createElement("div");
      wrapper.className = "mobile-table-wrap";
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
  }

  function createOrUpdateMobileNav() {
    const navId = "mobile-top-nav";
    const existing = document.getElementById(navId);

    if (!isMobile()) {
      if (existing) existing.remove();
      document.body.classList.remove("mobile-nav-enabled");
      return;
    }

    const mode = isAdmin ? "admin" : "employee";
    const items = navMap[mode];
    const currentFile = path.split("/").pop();

    let bar = existing;
    if (!bar) {
      bar = document.createElement("div");
      bar.id = navId;
      bar.innerHTML = `
        <div class="inner">
          <span class="portal"></span>
          <div class="controls">
            <select aria-label="Navigate pages"></select>
            <button type="button">Logout</button>
          </div>
        </div>
      `;
      document.body.prepend(bar);
    }

    bar.querySelector(".portal").textContent = isAdmin ? "Admin Portal" : "Employee Portal";

    const select = bar.querySelector("select");
    select.innerHTML = items
      .map(item => `<option value="${item.href}" ${item.href === currentFile ? "selected" : ""}>${item.label}</option>`)
      .join("");

    select.onchange = () => {
      window.location.href = select.value;
    };

    const logoutBtn = bar.querySelector("button");
    logoutBtn.onclick = () => {
      localStorage.removeItem("sunstar_logged_in_user_id");
      localStorage.removeItem("sunstar_logged_in_role");
      localStorage.removeItem("sunstar_logged_in_admin_email");
      window.location.href = "../index.html";
    };

    document.body.classList.add("mobile-nav-enabled");
  }

  function runResponsiveSetup() {
    ensureStyles();
    createOrUpdateMobileNav();
    wrapTablesForMobile();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runResponsiveSetup, { once: true });
  } else {
    runResponsiveSetup();
  }

  window.addEventListener("resize", createOrUpdateMobileNav);
})();
