(function () {
  const SESSION_ROLE_KEY = "sunstar_logged_in_role";
  const SESSION_USER_KEY = "sunstar_logged_in_user_id";
  const SESSION_ADMIN_EMAIL_KEY = "sunstar_logged_in_admin_email";

  function loginPath() {
    const path = (window.location.pathname || "").replace(/\\/g, "/");
    if (path.includes("/admin/") || path.includes("/employee/")) {
      return "../index.html";
    }
    return "index.html";
  }

  function redirectToLogin() {
    window.location.replace(loginPath());
  }

  function requireAdmin() {
    const role = localStorage.getItem(SESSION_ROLE_KEY);
    const adminEmail = localStorage.getItem(SESSION_ADMIN_EMAIL_KEY);
    if (role !== "admin" || !adminEmail) {
      redirectToLogin();
      return false;
    }
    return true;
  }

  function requireEmployee() {
    const role = localStorage.getItem(SESSION_ROLE_KEY);
    const userId = localStorage.getItem(SESSION_USER_KEY);
    if (role !== "employee" || !userId) {
      redirectToLogin();
      return false;
    }
    return true;
  }

  window.AuthGuard = {
    requireAdmin,
    requireEmployee
  };
})();
