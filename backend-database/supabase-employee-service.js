(function () {
  const STORAGE_KEY = "sunstar_employees";

  function hasClient() {
    return !!window.supabaseClient;
  }

  function normalizeDate(value) {
    const raw = String(value || "").trim();
    if (!raw) return null;

    // HTML month input returns YYYY-MM; store as first day of month.
    if (/^\d{4}-\d{2}$/.test(raw)) {
      return `${raw}-01`;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw;
    }

    return null;
  }

  function mapDbToLocal(row) {
    return {
      id: row.id,
      firstName: row.first_name || "",
      lastName: row.last_name || "",
      age: row.age || "",
      gender: row.gender || "",
      contact: row.contact || "",
      lastTitle: row.last_title || "",
      ds: row.date_started || "",
      de: row.date_ended || "",
      role: row.role || "",
      salary: row.salary || "",
      eName: row.emergency_name || "",
      eContact: row.emergency_contact || "",
      eRel: row.emergency_relation || "",
      email: row.email || "",
      password: row.password || "",
      profilePic: row.profile_pic || "",
      skills: Array.isArray(row.skills) ? row.skills : [],
      certs: Array.isArray(row.certs) ? row.certs : []
    };
  }

  function mapLocalToDb(emp) {
    return {
      id: emp.id,
      first_name: emp.firstName || "",
      last_name: emp.lastName || "",
      age: emp.age === "" ? null : Number(emp.age) || null,
      gender: emp.gender || null,
      contact: emp.contact || null,
      last_title: emp.lastTitle || null,
      date_started: normalizeDate(emp.ds),
      date_ended: normalizeDate(emp.de),
      role: emp.role || null,
      salary: emp.salary === "" ? null : Number(emp.salary) || null,
      emergency_name: emp.eName || null,
      emergency_contact: emp.eContact || null,
      emergency_relation: emp.eRel || null,
      email: (emp.email || "").toLowerCase(),
      password: emp.password || "",
      profile_pic: emp.profilePic || null,
      skills: Array.isArray(emp.skills) ? emp.skills : [],
      certs: Array.isArray(emp.certs) ? emp.certs : []
    };
  }

  async function fetchEmployees() {
    if (!hasClient()) return null;

    const { data, error } = await window.supabaseClient
      .from("employees")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("fetchEmployees failed", error);
      return null;
    }

    return (data || []).map(mapDbToLocal);
  }

  async function upsertEmployee(employee) {
    if (!hasClient()) return false;

    const payload = mapLocalToDb(employee);
    const { error } = await window.supabaseClient
      .from("employees")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      console.error("upsertEmployee failed", error);
      return false;
    }

    return true;
  }

  async function deleteEmployeeById(id) {
    if (!hasClient()) return false;

    const { error } = await window.supabaseClient
      .from("employees")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("deleteEmployeeById failed", error);
      return false;
    }

    return true;
  }

  async function authenticateEmployee(email, password) {
    if (!hasClient()) return null;

    const { data, error } = await window.supabaseClient
      .from("employees")
      .select("*")
      .eq("email", email.toLowerCase())
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("authenticateEmployee failed", error);
      return null;
    }

    if (!data) return null;
    const mapped = mapDbToLocal(data);

    if (String(mapped.password || "") !== password) {
      return null;
    }

    return mapped;
  }

  async function syncLocalFromRemote() {
    const remote = await fetchEmployees();
    if (!Array.isArray(remote)) return false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
    return true;
  }

  window.EmployeeDataService = {
    fetchEmployees,
    upsertEmployee,
    deleteEmployeeById,
    authenticateEmployee,
    syncLocalFromRemote,
    mapDbToLocal,
    mapLocalToDb
  };
})();
