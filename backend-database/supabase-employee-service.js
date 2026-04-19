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

  function mergeExtendedProfileFromCache(rows) {
    let cached = [];

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      cached = raw ? JSON.parse(raw) : [];
    } catch (error) {
      cached = [];
    }

    const cacheById = new Map(
      (Array.isArray(cached) ? cached : [])
        .filter((emp) => emp && emp.id != null)
        .map((emp) => [String(emp.id), emp])
    );

    return rows.map((emp) => {
      const cachedEmp = cacheById.get(String(emp.id));
      if (!cachedEmp) return emp;

      return {
        ...emp,
        middleName: emp.middleName || cachedEmp.middleName || "",
        birthDate: emp.birthDate || cachedEmp.birthDate || "",
        maritalStatus: emp.maritalStatus || cachedEmp.maritalStatus || "",
        employmentStatus: emp.employmentStatus || cachedEmp.employmentStatus || "",
        address: emp.address || cachedEmp.address || "",
        dateHired: emp.dateHired || cachedEmp.dateHired || "",
        dateTerminated: emp.dateTerminated || cachedEmp.dateTerminated || "",
        employmentHistory: (Array.isArray(emp.employmentHistory) && emp.employmentHistory.length > 0)
          ? emp.employmentHistory
          : (Array.isArray(cachedEmp.employmentHistory) ? cachedEmp.employmentHistory : []),
        roleHistory: (Array.isArray(emp.roleHistory) && emp.roleHistory.length > 0)
          ? emp.roleHistory
          : (Array.isArray(cachedEmp.roleHistory) ? cachedEmp.roleHistory : [])
      };
    });
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

    const rows = data || [];
    const mappedRows = rows.map(mapDbToLocal);

    // Always merge cached extended/profile arrays (like employmentHistory, roleHistory)
    // so that UI edits persisted in localStorage remain available even if the DB
    // schema does not yet store these JSON arrays. The merge function preserves
    // server-side values when they already exist and falls back to cached values.
    return mergeExtendedProfileFromCache(mappedRows);
  }

  async function upsertEmployee(employee) {
    if (!hasClient()) return false;

    const payload = mapLocalToDb(employee);
    let { error } = await window.supabaseClient
      .from("employees")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      const errorText = [error.message, error.details, error.hint].filter(Boolean).join(" ");
      const isMissingExtendedColumn = /(middle_name|birth_date|marital_status|employment_status|address|date_hired|date_terminated|employment_history|role_history)/i.test(errorText);

      if (isMissingExtendedColumn) {
        const fallbackPayload = mapLocalToDb(employee, { includeExtendedProfile: false });
        const fallback = await window.supabaseClient
          .from("employees")
          .upsert(fallbackPayload, { onConflict: "id" });

        if (!fallback.error) {
          return true;
        }

        error = fallback.error;
      }
    }

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
