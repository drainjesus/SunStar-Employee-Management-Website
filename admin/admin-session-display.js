(function () {
  const SESSION_ADMIN_EMAIL_KEY = "sunstar_logged_in_admin_email";

  function initialsFromName(name) {
    const parts = String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) return "";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function initialsFromEmail(email) {
    const local = String(email || "").split("@")[0] || "";
    const cleaned = local.replace(/[^a-zA-Z0-9]/g, "");
    return (cleaned.slice(0, 2) || "AD").toUpperCase();
  }

  async function fetchAdminProfileFromRemote() {
    if (!window.supabaseClient) return null;
    const email = localStorage.getItem(SESSION_ADMIN_EMAIL_KEY);
    if (!email) return null;

    const { data, error } = await window.supabaseClient
      .from("admin_accounts")
      .select("full_name, role")
      .eq("email", String(email).toLowerCase())
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return {
      fullName: String(data.full_name || "").trim(),
      role: String(data.role || "").trim()
    };
  }

  async function applyAdminSessionDisplay() {
    const email = (localStorage.getItem(SESSION_ADMIN_EMAIL_KEY) || "").trim();
    const profile = await fetchAdminProfileFromRemote();

    const displayName =
      (profile && profile.fullName) || email || "Admin";
    const displayRole =
      (profile && profile.role) || "Authenticated Admin";
    const initials = profile && profile.fullName
      ? initialsFromName(profile.fullName)
      : initialsFromEmail(email);

    document.querySelectorAll("[data-admin-display-name]").forEach((el) => {
      el.textContent = displayName;
    });
    document.querySelectorAll("[data-admin-display-role]").forEach((el) => {
      el.textContent = displayRole;
    });
    document.querySelectorAll("[data-admin-display-initials]").forEach((el) => {
      el.textContent = initials || "AD";
    });
  }

  window.applyAdminSessionDisplay = applyAdminSessionDisplay;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      applyAdminSessionDisplay();
    });
  } else {
    applyAdminSessionDisplay();
  }
})();
