(function () {
  function hasClient() {
    return !!window.supabaseClient;
  }

  function mapDbToLocal(row) {
    return {
      id: row.id,
      fullName: row.full_name || "",
      email: (row.email || "").toLowerCase(),
      password: row.password || "",
      role: row.role || "Super Admin",
      status: row.status || "Active",
      lastLoginAt: row.last_login_at || null
    };
  }

  async function authenticateAdmin(email, password) {
    if (!hasClient()) return null;

    const normalizedEmail = (email || "").trim().toLowerCase();
    const { data, error } = await window.supabaseClient
      .from("admin_accounts")
      .select("*")
      .eq("email", normalizedEmail)
      .eq("status", "Active")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("authenticateAdmin failed", error);
      return null;
    }

    if (!data) return null;
    const mapped = mapDbToLocal(data);

    if (String(mapped.password || "") !== String(password || "")) {
      return null;
    }

    await window.supabaseClient
      .from("admin_accounts")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", mapped.id);

    return mapped;
  }

  async function fetchAdminEmails() {
    if (!hasClient()) return [];

    const { data, error } = await window.supabaseClient
      .from("admin_accounts")
      .select("email")
      .eq("status", "Active");

    if (error) {
      console.error("fetchAdminEmails failed", error);
      return [];
    }

    return (data || []).map(row => String(row.email || "").toLowerCase()).filter(Boolean);
  }

  window.AdminDataService = {
    authenticateAdmin,
    fetchAdminEmails,
    mapDbToLocal
  };
})();
