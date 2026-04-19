(function () {
  const STORAGE_KEY = "sunstar_employees";
  const REQUIRED_PROFILE_COLUMNS_PATTERN = /(middle_name|birth_date|marital_status|employment_status|address|date_hired|date_terminated|employment_history|role_history)/i;
  let lastErrorMessage = "";

  function setLastError(message) {
    lastErrorMessage = String(message || "").trim();
  }

  function clearLastError() {
    lastErrorMessage = "";
  }

  function getLastError() {
    return lastErrorMessage;
  }

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
      middleName: row.middle_name || "",
      lastName: row.last_name || "",
      birthDate: row.birth_date || "",
      age: row.age || "",
      gender: row.gender || "",
      maritalStatus: row.marital_status || "",
      employmentStatus: row.employment_status || "",
      contact: row.contact || "",
      address: row.address || "",
      lastTitle: row.last_title || "",
      ds: row.date_started || "",
      de: row.date_ended || "",
      dateHired: row.date_hired || "",
      dateTerminated: row.date_terminated || "",
      role: row.role || "",
      salary: row.salary || "",
      eName: row.emergency_name || "",
      eContact: row.emergency_contact || "",
      eRel: row.emergency_relation || "",
      email: row.email || "",
      password: row.password || "",
      profilePic: row.profile_pic || "",
      employmentHistory: Array.isArray(row.employment_history) ? row.employment_history : [],
      roleHistory: Array.isArray(row.role_history) ? row.role_history : [],
      skills: Array.isArray(row.skills) ? row.skills : [],
      certs: Array.isArray(row.certs) ? row.certs : []
    };
  }

  function mapLocalToDb(emp, options = {}) {
    const includeExtendedProfile = options.includeExtendedProfile !== false;
    const includeHistory = options.includeHistory !== false;

    const mapped = {
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

    if (includeHistory) {
      mapped.date_hired = normalizeDate(emp.dateHired);
      mapped.date_terminated = normalizeDate(emp.dateTerminated);
      mapped.employment_history = Array.isArray(emp.employmentHistory) ? emp.employmentHistory : [];
      mapped.role_history = Array.isArray(emp.roleHistory) ? emp.roleHistory : [];
    }

    if (includeExtendedProfile) {
      mapped.middle_name = emp.middleName || null;
      mapped.birth_date = normalizeDate(emp.birthDate);
      mapped.marital_status = emp.maritalStatus || null;
      mapped.employment_status = emp.employmentStatus || null;
      mapped.address = emp.address || null;
    }

    return mapped;
  }

  async function fetchEmployees() {
    if (!hasClient()) {
      setLastError("Supabase client is not available.");
      return null;
    }

    const { data, error } = await window.supabaseClient
      .from("employees")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("fetchEmployees failed", error);
      setLastError(error.message || "Unable to fetch employees from Supabase.");
      return null;
    }

    clearLastError();
    return (data || []).map(mapDbToLocal);
  }

  async function upsertEmployee(employee) {
    if (!hasClient()) {
      setLastError("Supabase client is not available.");
      return false;
    }

    const payload = mapLocalToDb(employee);
    const { error } = await window.supabaseClient
      .from("employees")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      const errorText = [error.message, error.details, error.hint].filter(Boolean).join(" ");
      if (REQUIRED_PROFILE_COLUMNS_PATTERN.test(errorText)) {
        setLastError("Supabase schema is missing employee profile/history columns. Run 05_supabase_employee_profile_fields.sql and 09_add_history_fields.sql, then save again.");
      } else {
        setLastError(error.message || "Unable to save employee to Supabase.");
      }
      console.error("upsertEmployee failed", error);
      return false;
    }

    clearLastError();
    return true;
  }

  async function fetchEmployeeById(id) {
    if (!hasClient()) {
      setLastError("Supabase client is not available.");
      return null;
    }

    const { data, error } = await window.supabaseClient
      .from("employees")
      .select("*")
      .eq("id", id)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("fetchEmployeeById failed", error);
      setLastError(error.message || "Unable to fetch employee from Supabase.");
      return null;
    }

    if (!data) return null;
    clearLastError();
    return mapDbToLocal(data);
  }

  async function deleteEmployeeById(id) {
    if (!hasClient()) {
      setLastError("Supabase client is not available.");
      return false;
    }

    const { error } = await window.supabaseClient
      .from("employees")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("deleteEmployeeById failed", error);
      setLastError(error.message || "Unable to delete employee from Supabase.");
      return false;
    }

    clearLastError();
    return true;
  }

  async function authenticateEmployee(email, password) {
    if (!hasClient()) {
      setLastError("Supabase client is not available.");
      return null;
    }

    const { data, error } = await window.supabaseClient
      .from("employees")
      .select("*")
      .eq("email", email.toLowerCase())
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("authenticateEmployee failed", error);
      setLastError(error.message || "Unable to authenticate employee.");
      return null;
    }

    if (!data) return null;
    const mapped = mapDbToLocal(data);

    if (String(mapped.password || "") !== password) {
      return null;
    }

    clearLastError();
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
    fetchEmployeeById,
    upsertEmployee,
    deleteEmployeeById,
    authenticateEmployee,
    syncLocalFromRemote,
    mapDbToLocal,
    mapLocalToDb,
    getLastError
  };
})();
