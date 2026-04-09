(function () {
  const TRAINING_KEY = "sunstar_trainings";
  const LEAVE_KEY = "sunstar_leaves";
  const ATTENDANCE_KEY = "sunstar_attendance";

  function hasClient() {
    return !!window.supabaseClient;
  }

  function safeDateString(input) {
    if (!input) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(input))) return String(input);
    const parsed = new Date(input);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10);
  }

  function mapTrainingDbToLocal(row) {
    return {
      id: row.id,
      name: row.name || "",
      category: row.category || "",
      date: row.training_date || "",
      dept: row.department || "",
      desc: row.description || "",
      status: row.status || "Upcoming",
      enrollees: Array.isArray(row.enrollees) ? row.enrollees : []
    };
  }

  function mapTrainingLocalToDb(training) {
    return {
      id: training.id,
      name: training.name || "",
      category: training.category || null,
      training_date: safeDateString(training.date),
      department: training.dept || null,
      description: training.desc || null,
      status: training.status || "Upcoming",
      enrollees: Array.isArray(training.enrollees) ? training.enrollees : []
    };
  }

  function mapLeaveDbToLocal(row) {
    return {
      id: row.id,
      empId: row.employee_id,
      name: row.employee_name || "",
      dateFiled: row.date_filed || "",
      dateOfLeave: row.date_of_leave || "",
      reason: row.reason || "",
      note: row.note || "",
      days: Number(row.days || 1),
      status: row.status || "Pending",
      timeFiled: row.time_filed || "",
      createdAt: row.created_at || ""
    };
  }

  function mapLeaveLocalToDb(leave) {
    return {
      id: leave.id,
      employee_id: leave.empId === "" || leave.empId === null || leave.empId === undefined ? null : Number(leave.empId),
      employee_name: leave.name || "Unknown Employee",
      date_filed: safeDateString(leave.dateFiled),
      date_of_leave: safeDateString(leave.dateOfLeave),
      reason: leave.reason || null,
      note: leave.note || null,
      days: Number(leave.days || 1),
      status: leave.status || "Pending",
      time_filed: leave.timeFiled || null
    };
  }

  function mapAttendanceDbToLocal(row) {
    return {
      empId: row.employee_id,
      name: row.employee_name || "",
      clockIn: row.clock_in || "--",
      clockOut: row.clock_out || "--",
      status: row.status || "Absent"
    };
  }

  async function fetchTrainings() {
    if (!hasClient()) return null;

    const { data, error } = await window.supabaseClient
      .from("training_programs")
      .select("*")
      .order("training_date", { ascending: false });

    if (error) {
      console.error("fetchTrainings failed", error);
      return null;
    }

    return (data || []).map(mapTrainingDbToLocal);
  }

  async function upsertTraining(training) {
    if (!hasClient()) return false;

    const payload = mapTrainingLocalToDb(training);
    const { error } = await window.supabaseClient
      .from("training_programs")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      console.error("upsertTraining failed", error);
      return false;
    }

    return true;
  }

  async function fetchLeaves() {
    if (!hasClient()) return null;

    const { data, error } = await window.supabaseClient
      .from("leave_requests")
      .select("*")
      .order("date_filed", { ascending: false })
      .order("time_filed", { ascending: false });

    if (error) {
      console.error("fetchLeaves failed", error);
      return null;
    }

    return (data || []).map(mapLeaveDbToLocal);
  }

  async function upsertLeave(leave) {
    if (!hasClient()) return false;

    const payload = mapLeaveLocalToDb(leave);
    const { error } = await window.supabaseClient
      .from("leave_requests")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      console.error("upsertLeave failed", error);
      return false;
    }

    return true;
  }

  async function fetchAttendanceGrouped() {
    if (!hasClient()) return null;

    const { data, error } = await window.supabaseClient
      .from("attendance_records")
      .select("*")
      .order("work_date", { ascending: false });

    if (error) {
      console.error("fetchAttendanceGrouped failed", error);
      return null;
    }

    const grouped = {};
    (data || []).forEach(row => {
      const key = row.work_date;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(mapAttendanceDbToLocal(row));
    });

    return grouped;
  }

  async function upsertAttendanceRecord(workDate, record) {
    if (!hasClient()) return false;
    if (!workDate || record.empId === undefined || record.empId === null || record.empId === "") {
      return false;
    }

    const payload = {
      work_date: safeDateString(workDate),
      employee_id: Number(record.empId),
      employee_name: record.name || "Unknown Employee",
      clock_in: record.clockIn && record.clockIn !== "--" ? record.clockIn : null,
      clock_out: record.clockOut && record.clockOut !== "--" ? record.clockOut : null,
      status: record.status || "Absent"
    };

    const { error } = await window.supabaseClient
      .from("attendance_records")
      .upsert(payload, { onConflict: "work_date,employee_id" });

    if (error) {
      console.error("upsertAttendanceRecord failed", error);
      return false;
    }

    return true;
  }

  async function syncTrainingsLocalFromRemote() {
    const remote = await fetchTrainings();
    if (!Array.isArray(remote)) return false;
    localStorage.setItem(TRAINING_KEY, JSON.stringify(remote));
    return true;
  }

  async function syncLeavesLocalFromRemote() {
    const remote = await fetchLeaves();
    if (!Array.isArray(remote)) return false;
    localStorage.setItem(LEAVE_KEY, JSON.stringify(remote));
    return true;
  }

  async function syncAttendanceLocalFromRemote() {
    const remote = await fetchAttendanceGrouped();
    if (!remote || typeof remote !== "object") return false;
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(remote));
    return true;
  }

  window.HRDataService = {
    fetchTrainings,
    upsertTraining,
    fetchLeaves,
    upsertLeave,
    fetchAttendanceGrouped,
    upsertAttendanceRecord,
    syncTrainingsLocalFromRemote,
    syncLeavesLocalFromRemote,
    syncAttendanceLocalFromRemote
  };
})();
