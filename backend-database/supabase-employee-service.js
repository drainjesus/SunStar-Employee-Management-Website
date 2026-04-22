(function () {
  const STORAGE_KEY = "sunstar_employees";
  const REQUIRED_PROFILE_COLUMNS_PATTERN = /(middle_name|birth_date|marital_status|employment_status|address|date_hired|date_terminated|employment_history|role_history)/i;
  const EMPLOYEE_SETTINGS_TABLE = "employee_settings";
  const EXTENDED_PROFILE_SETTINGS_KEY = "__employee_profile_snapshot";
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

  function hasText(value) {
    return value !== null && value !== undefined && String(value).trim() !== "";
  }

  function normalizeHistoryRows(rows, type) {
    return (Array.isArray(rows) ? rows : [])
      .map((row) => {
        if (!row || typeof row !== "object") return null;

        if (type === "employment") {
          return {
            ds: row.ds || "",
            de: row.de || "",
            company: row.company || "",
            job: row.job || ""
          };
        }

        return {
          ds: row.ds || "",
          de: row.de || "",
          role: row.role || "",
          salary: row.salary || ""
        };
      })
      .filter((row) => row && Object.values(row).some((value) => hasText(value)));
  }

  function normalizeEmploymentStatusRows(rows) {
    return (Array.isArray(rows) ? rows : [])
      .map((row) => {
        if (!row || typeof row !== "object") return null;
        return {
          dateFrom: row.dateFrom || "",
          dateTo: row.dateTo || "",
          status: row.status || "",
          remarks: row.remarks || ""
        };
      })
      .filter((row) => row && Object.values(row).some((value) => hasText(value)));
  }

  function buildExtendedProfileSnapshot(employee) {
    return {
      middleName: employee.middleName || "",
      birthDate: employee.birthDate || "",
      maritalStatus: employee.maritalStatus || "",
      employmentStatus: employee.employmentStatus || "",
      address: employee.address || "",
      dateHired: employee.dateHired || "",
      dateTerminated: employee.dateTerminated || "",
      company: employee.company || "",
      employmentHistory: normalizeHistoryRows(employee.employmentHistory, "employment"),
      roleHistory: normalizeHistoryRows(employee.roleHistory, "role"),
      employmentStatusHistory: normalizeEmploymentStatusRows(employee.employmentStatusHistory)
    };
  }

  function mergeExtendedProfile(employee, snapshot) {
    if (!snapshot || typeof snapshot !== "object") return employee;

    const mergedEmploymentHistory = (Array.isArray(employee.employmentHistory) && employee.employmentHistory.length > 0)
      ? employee.employmentHistory
      : normalizeHistoryRows(snapshot.employmentHistory, "employment");

    const mergedRoleHistory = (Array.isArray(employee.roleHistory) && employee.roleHistory.length > 0)
      ? employee.roleHistory
      : normalizeHistoryRows(snapshot.roleHistory, "role");
    const mergedEmploymentStatusHistory = (Array.isArray(employee.employmentStatusHistory) && employee.employmentStatusHistory.length > 0)
      ? employee.employmentStatusHistory
      : normalizeEmploymentStatusRows(snapshot.employmentStatusHistory);

    return {
      ...employee,
      middleName: hasText(employee.middleName) ? employee.middleName : (snapshot.middleName || ""),
      birthDate: hasText(employee.birthDate) ? employee.birthDate : (snapshot.birthDate || ""),
      maritalStatus: hasText(employee.maritalStatus) ? employee.maritalStatus : (snapshot.maritalStatus || ""),
      employmentStatus: hasText(employee.employmentStatus) ? employee.employmentStatus : (snapshot.employmentStatus || ""),
      address: hasText(employee.address) ? employee.address : (snapshot.address || ""),
      dateHired: hasText(employee.dateHired) ? employee.dateHired : (snapshot.dateHired || ""),
      dateTerminated: hasText(employee.dateTerminated) ? employee.dateTerminated : (snapshot.dateTerminated || ""),
      company: hasText(employee.company) ? employee.company : (snapshot.company || ""),
      employmentHistory: mergedEmploymentHistory,
      roleHistory: mergedRoleHistory,
      employmentStatusHistory: mergedEmploymentStatusHistory
    };
  }

  async function fetchExtendedProfilesByEmployeeIds(ids) {
    if (!hasClient()) return new Map();

    const numericIds = Array.from(new Set(
      (Array.isArray(ids) ? ids : [])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id))
    ));

    if (numericIds.length === 0) return new Map();

    const { data, error } = await window.supabaseClient
      .from(EMPLOYEE_SETTINGS_TABLE)
      .select("employee_id,privacy_preferences")
      .in("employee_id", numericIds);

    if (error) {
      console.warn("fetchExtendedProfilesByEmployeeIds skipped", error);
      return new Map();
    }

    const map = new Map();
    (data || []).forEach((row) => {
      const prefs = row && row.privacy_preferences && typeof row.privacy_preferences === "object"
        ? row.privacy_preferences
        : {};
      const snapshot = prefs[EXTENDED_PROFILE_SETTINGS_KEY];
      if (snapshot && typeof snapshot === "object") {
        map.set(String(row.employee_id), snapshot);
      }
    });

    return map;
  }

  async function upsertExtendedProfileByEmployeeId(employeeId, employee) {
    if (!hasClient()) {
      setLastError("Supabase client is not available.");
      return false;
    }

    const numericId = Number(employeeId);
    if (!Number.isFinite(numericId)) {
      setLastError("Invalid employee ID for profile history save.");
      return false;
    }

    let existingPrivacy = {};
    const { data: existingSettings, error: existingError } = await window.supabaseClient
      .from(EMPLOYEE_SETTINGS_TABLE)
      .select("privacy_preferences")
      .eq("employee_id", numericId)
      .limit(1)
      .maybeSingle();

    if (existingError) {
      const errorText = [existingError.message, existingError.details, existingError.hint].filter(Boolean).join(" ");
      if (/employee_settings|privacy_preferences/i.test(errorText)) {
        setLastError("Supabase schema is missing employee profile storage. Run 03_supabase_subsystem_tables.sql and 04_supabase_policies_dev_extended.sql, or add the employee profile/history columns.");
      } else {
        setLastError(existingError.message || "Unable to load employee profile settings from Supabase.");
      }
      console.error("upsertExtendedProfileByEmployeeId load failed", existingError);
      return false;
    }

    if (existingSettings && existingSettings.privacy_preferences && typeof existingSettings.privacy_preferences === "object") {
      existingPrivacy = existingSettings.privacy_preferences;
    }

    const payload = {
      employee_id: numericId,
      privacy_preferences: {
        ...existingPrivacy,
        [EXTENDED_PROFILE_SETTINGS_KEY]: buildExtendedProfileSnapshot(employee)
      }
    };

    const { error } = await window.supabaseClient
      .from(EMPLOYEE_SETTINGS_TABLE)
      .upsert(payload, { onConflict: "employee_id" });

    if (error) {
      const errorText = [error.message, error.details, error.hint].filter(Boolean).join(" ");
      if (/employee_settings|privacy_preferences/i.test(errorText)) {
        setLastError("Supabase schema is missing employee profile storage. Run 03_supabase_subsystem_tables.sql and 04_supabase_policies_dev_extended.sql, or add the employee profile/history columns.");
      } else {
        setLastError(error.message || "Unable to save employee profile history to Supabase.");
      }
      console.error("upsertExtendedProfileByEmployeeId failed", error);
      return false;
    }

    return true;
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
    const employmentHistory = normalizeHistoryRows(row.employment_history, "employment");
    const roleHistory = normalizeHistoryRows(row.role_history, "role");
    const firstEmploymentRow = employmentHistory[0] || {};
    const firstRoleRow = roleHistory[0] || {};

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
      company: firstEmploymentRow.company || "",
      lastTitle: row.last_title || firstEmploymentRow.job || "",
      ds: row.date_started || firstEmploymentRow.ds || "",
      de: row.date_ended || firstEmploymentRow.de || "",
      dateHired: row.date_hired || "",
      dateTerminated: row.date_terminated || "",
      role: row.role || firstRoleRow.role || "",
      salary: row.salary || firstRoleRow.salary || "",
      eName: row.emergency_name || "",
      eContact: row.emergency_contact || "",
      eRel: row.emergency_relation || "",
      email: row.email || "",
      password: row.password || "",
      profilePic: row.profile_pic || "",
      employmentHistory,
      roleHistory,
      employmentStatusHistory: normalizeEmploymentStatusRows(row.employment_status_history),
      skills: Array.isArray(row.skills) ? row.skills : [],
      certs: Array.isArray(row.certs) ? row.certs : []
    };
  }

  function mapLocalToDb(emp, options = {}) {
    const includeExtendedProfile = options.includeExtendedProfile !== false;
    const includeHistory = options.includeHistory !== false;
    const normalizedEmploymentHistory = normalizeHistoryRows(emp.employmentHistory, "employment");
    const normalizedRoleHistory = normalizeHistoryRows(emp.roleHistory, "role");
    const firstEmploymentRow = normalizedEmploymentHistory[0] || {};
    const firstRoleRow = normalizedRoleHistory[0] || {};

    const mapped = {
      id: emp.id,
      first_name: emp.firstName || "",
      last_name: emp.lastName || "",
      age: emp.age === "" ? null : Number(emp.age) || null,
      gender: emp.gender || null,
      contact: emp.contact || null,
      last_title: emp.lastTitle || firstEmploymentRow.job || null,
      date_started: normalizeDate(emp.ds || firstEmploymentRow.ds),
      date_ended: normalizeDate(emp.de || firstEmploymentRow.de),
      role: emp.role || firstRoleRow.role || null,
      salary: (emp.salary === "" || emp.salary === null || emp.salary === undefined)
        ? ((firstRoleRow.salary === "" || firstRoleRow.salary === null || firstRoleRow.salary === undefined)
          ? null
          : Number(firstRoleRow.salary) || null)
        : Number(emp.salary) || null,
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
      mapped.employment_history = normalizedEmploymentHistory;
      mapped.role_history = normalizedRoleHistory;
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

    const mappedEmployees = (data || []).map(mapDbToLocal);
    const extendedMap = await fetchExtendedProfilesByEmployeeIds(mappedEmployees.map((employee) => employee.id));

    clearLastError();
    return mappedEmployees.map((employee) => mergeExtendedProfile(employee, extendedMap.get(String(employee.id))));
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

    let shouldSyncExtendedProfile = true;

    if (error) {
      const errorText = [error.message, error.details, error.hint].filter(Boolean).join(" ");
      if (REQUIRED_PROFILE_COLUMNS_PATTERN.test(errorText)) {
        const fallbackPayload = mapLocalToDb(employee, { includeExtendedProfile: false, includeHistory: false });
        const fallback = await window.supabaseClient
          .from("employees")
          .upsert(fallbackPayload, { onConflict: "id" });

        if (fallback.error) {
          setLastError(fallback.error.message || "Unable to save employee base fields to Supabase.");
          console.error("upsertEmployee base fallback failed", fallback.error);
          return false;
        }

        const savedExtended = await upsertExtendedProfileByEmployeeId(employee.id, employee);
        if (!savedExtended) {
          return false;
        }
        shouldSyncExtendedProfile = false;
      } else {
        setLastError(error.message || "Unable to save employee to Supabase.");
        console.error("upsertEmployee failed", error);
        return false;
      }
    }

    if (shouldSyncExtendedProfile) {
      const savedExtended = await upsertExtendedProfileByEmployeeId(employee.id, employee);
      if (!savedExtended) {
        return false;
      }
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

    const mapped = mapDbToLocal(data);
    const extendedMap = await fetchExtendedProfilesByEmployeeIds([mapped.id]);

    clearLastError();
    return mergeExtendedProfile(mapped, extendedMap.get(String(mapped.id)));
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
