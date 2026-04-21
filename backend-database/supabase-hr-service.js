(function () {
  const TRAINING_KEY = "sunstar_trainings";
  const LEAVE_KEY = "sunstar_leaves";
  const LEAVE_ATTACHMENT_TABLE = "leave_attachments";
  const ATTENDANCE_KEY = "sunstar_attendance";
  const DEFAULT_SHIFT_SCHEDULE = "Newsroom Day Shift (08:00 AM - 05:00 PM)";
  const ATTENDANCE_EXTENDED_COLUMNS = [
    "is_verified",
    "verified_by",
    "verified_at",
    "status_source",
    "sanction_message",
    "sanction_by",
    "sanction_at",
    "shift_schedule",
    "overtime_hours",
    "is_holiday_work"
  ];

  function formatOvertimeHours(value) {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return "0.0";
    return parsed.toFixed(1);
  }

  function hasClient() {
    return !!window.supabaseClient;
  }

  function safeDateString(input) {
    if (!input) return null;
    const value = String(input).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function normalizeLeaveDocuments(documents) {
    if (!Array.isArray(documents)) return [];

    return documents
      .map((doc, index) => {
        if (!doc || typeof doc !== "object") return null;

        const dataUrl = String(doc.dataUrl || doc.url || doc.fileUrl || "").trim();
        if (!dataUrl) return null;

        return {
          name: String(doc.name || `Document ${index + 1}`),
          mimeType: String(doc.mimeType || ""),
          size: Number(doc.size || 0),
          dataUrl,
          uploadedAt: doc.uploadedAt || null
        };
      })
      .filter(Boolean);
  }

  function mapLeaveAttachmentDbToLocal(row) {
    const dataUrl = String(row.file_url || "").trim();
    if (!dataUrl) return null;

    return {
      name: String(row.file_name || "Document"),
      dataUrl,
      uploadedAt: row.uploaded_at || ""
    };
  }

  function buildLeaveAttachmentPayloads(leaveId, documents) {
    const numericLeaveId = Number(leaveId);
    if (!Number.isFinite(numericLeaveId)) return [];

    return normalizeLeaveDocuments(documents).map((doc) => ({
      leave_request_id: numericLeaveId,
      file_url: doc.dataUrl,
      file_name: doc.name || "Document"
    }));
  }

  function isLeaveAttachmentTableMissing(error) {
    const message = [error && error.message, error && error.details, error && error.hint]
      .filter(Boolean)
      .join(" ");

    return /leave_attachments/i.test(message);
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
  function mapLeaveLocalToDb(leave) {
    return {
      id: leave.id,
      employee_id: leave.empId === "" || leave.empId === null || leave.empId === undefined ? null : Number(leave.empId),
      employee_name: leave.name || "Unknown Employee",
      date_filed: safeDateString(leave.dateFiled),
      date_of_leave: safeDateString(leave.dateOfLeave),
      date_from: safeDateString(leave.dateFrom),
      date_to: safeDateString(leave.dateTo),
      reason: leave.reason || null,
      note: leave.note || null,
      days: Number(leave.days || 1),
      documents: Array.isArray(leave.documents) ? leave.documents : [],
      status: leave.status || "Pending",
      time_filed: leave.timeFiled || null
    };
  }

  function mapLeaveDbToLocal(row) {
    return {
      id: row.id,
      empId: row.employee_id,
      name: row.employee_name || "Unknown Employee",
      dateFiled: row.date_filed,
      timeFiled: row.time_filed,
      dateOfLeave: row.date_of_leave,
      dateFrom: row.date_from,
      dateTo: row.date_to,
      reason: row.reason,
      note: row.note,
      days: row.days || 1,
      documents: Array.isArray(row.documents) ? row.documents : [],
      status: row.status || "Pending",
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  function mapAttendanceDbToLocal(row) {
    return {
      empId: row.employee_id,
      name: row.employee_name || "",
      clockIn: row.clock_in || "--",
      clockOut: row.clock_out || "--",
      status: row.status || "Absent",
      shift: row.shift_schedule || DEFAULT_SHIFT_SCHEDULE,
      ot: formatOvertimeHours(row.overtime_hours),
      isHoliday: !!row.is_holiday_work,
      isVerified: !!row.is_verified,
      verifiedBy: row.verified_by || "",
      verifiedAt: row.verified_at || "",
      statusSource: row.status_source || "system",
      sanctionMessage: row.sanction_message || "",
      sanctionBy: row.sanction_by || "",
      sanctionAt: row.sanction_at || ""
    };
  }

  function hasExtendedAttendanceColumns(rows) {
    return rows.length === 0 || ATTENDANCE_EXTENDED_COLUMNS.every((column) =>
      Object.prototype.hasOwnProperty.call(rows[0], column)
    );
  }

  function mergeAttendanceMetaFromCache(grouped) {
    let cachedGrouped = {};

    try {
      const raw = localStorage.getItem(ATTENDANCE_KEY);
      cachedGrouped = raw ? JSON.parse(raw) : {};
    } catch {
      cachedGrouped = {};
    }

    const merged = {};
    Object.keys(grouped).forEach((dateKey) => {
      const remoteRecords = Array.isArray(grouped[dateKey]) ? grouped[dateKey] : [];
      const cachedRecords = Array.isArray(cachedGrouped[dateKey]) ? cachedGrouped[dateKey] : [];

      merged[dateKey] = remoteRecords.map((remoteRecord) => {
        const match = cachedRecords.find((cachedRecord) => {
          if (remoteRecord.empId !== undefined && remoteRecord.empId !== null && remoteRecord.empId !== "") {
            return String(cachedRecord.empId) === String(remoteRecord.empId);
          }

          return String(cachedRecord.name || "").trim().toLowerCase() === String(remoteRecord.name || "").trim().toLowerCase();
        });

        if (!match) return remoteRecord;

        return {
          ...remoteRecord,
          shift: remoteRecord.shift || match.shift || DEFAULT_SHIFT_SCHEDULE,
          ot: formatOvertimeHours(remoteRecord.ot || match.ot),
          isHoliday: !!(remoteRecord.isHoliday || match.isHoliday),
          isVerified: remoteRecord.isVerified || !!match.isVerified,
          verifiedBy: remoteRecord.verifiedBy || match.verifiedBy || "",
          verifiedAt: remoteRecord.verifiedAt || match.verifiedAt || "",
          statusSource: remoteRecord.statusSource || match.statusSource || "system",
          sanctionMessage: remoteRecord.sanctionMessage || match.sanctionMessage || "",
          sanctionBy: remoteRecord.sanctionBy || match.sanctionBy || "",
          sanctionAt: remoteRecord.sanctionAt || match.sanctionAt || ""
        };
      });
    });

    return merged;
  }

  function buildAttendancePayload(workDate, record, options = {}) {
    const includeExtendedFields = options.includeExtendedFields !== false;

    const payload = {
      work_date: safeDateString(workDate),
      employee_id: Number(record.empId),
      employee_name: record.name || "Unknown Employee",
      clock_in: record.clockIn && record.clockIn !== "--" ? record.clockIn : null,
      clock_out: record.clockOut && record.clockOut !== "--" ? record.clockOut : null,
      status: record.status || "Absent"
    };

    if (includeExtendedFields) {
      payload.shift_schedule = record.shift || DEFAULT_SHIFT_SCHEDULE;
      payload.overtime_hours = Number.parseFloat(record.ot || 0) || 0;
      payload.is_holiday_work = !!record.isHoliday;
      payload.is_verified = !!record.isVerified;
      payload.verified_by = record.verifiedBy || null;
      payload.verified_at = record.verifiedAt || null;
      payload.status_source = record.statusSource || "system";
      payload.sanction_message = record.sanctionMessage || null;
      payload.sanction_by = record.sanctionBy || null;
      payload.sanction_at = record.sanctionAt || null;
    }

    return payload;
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

    const leaves = (data || []).map(mapLeaveDbToLocal);
    const leaveIds = leaves
      .map((leave) => Number(leave.id))
      .filter((id) => Number.isFinite(id));

    if (leaveIds.length === 0) {
      return leaves;
    }

    const { data: attachmentRows, error: attachmentError } = await window.supabaseClient
      .from(LEAVE_ATTACHMENT_TABLE)
      .select("leave_request_id,file_url,file_name,uploaded_at")
      .in("leave_request_id", leaveIds);

    if (attachmentError) {
      if (!isLeaveAttachmentTableMissing(attachmentError)) {
        console.error("fetchLeaves attachments failed", attachmentError);
      }
      return leaves;
    }

    const attachmentMap = new Map();
    (attachmentRows || []).forEach((row) => {
      const doc = mapLeaveAttachmentDbToLocal(row);
      if (!doc) return;

      const key = String(row.leave_request_id);
      if (!attachmentMap.has(key)) {
        attachmentMap.set(key, []);
      }
      attachmentMap.get(key).push(doc);
    });

    return leaves.map((leave) => {
      const fromAttachmentTable = attachmentMap.get(String(leave.id));
      const fromLeaveRow = normalizeLeaveDocuments(leave.documents);

      return {
        ...leave,
        documents: Array.isArray(fromAttachmentTable) && fromAttachmentTable.length > 0
          ? fromAttachmentTable
          : fromLeaveRow
      };
    });
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

    if (Array.isArray(leave.documents)) {
      const leaveId = Number(leave.id);
      if (Number.isFinite(leaveId)) {
        const { error: deleteError } = await window.supabaseClient
          .from(LEAVE_ATTACHMENT_TABLE)
          .delete()
          .eq("leave_request_id", leaveId);

        if (deleteError && !isLeaveAttachmentTableMissing(deleteError)) {
          console.error("upsertLeave attachments delete failed", deleteError);
          return false;
        }

        const attachmentPayloads = buildLeaveAttachmentPayloads(leaveId, leave.documents);
        if (attachmentPayloads.length > 0) {
          const { error: insertError } = await window.supabaseClient
            .from(LEAVE_ATTACHMENT_TABLE)
            .insert(attachmentPayloads);

          if (insertError && !isLeaveAttachmentTableMissing(insertError)) {
            console.error("upsertLeave attachments insert failed", insertError);
            return false;
          }
        }
      }
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

    const rows = data || [];
    const grouped = {};
    rows.forEach(row => {
      const key = row.work_date;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(mapAttendanceDbToLocal(row));
    });

    if (!hasExtendedAttendanceColumns(rows)) {
      return mergeAttendanceMetaFromCache(grouped);
    }

    return grouped;
  }

  async function upsertAttendanceRecord(workDate, record) {
    if (!hasClient()) return false;
    if (!workDate || record.empId === undefined || record.empId === null || record.empId === "") {
      return false;
    }

    const payload = buildAttendancePayload(workDate, record);

    let { error } = await window.supabaseClient
      .from("attendance_records")
      .upsert(payload, { onConflict: "work_date,employee_id" });

    if (error) {
      const errorText = [error.message, error.details, error.hint].filter(Boolean).join(" ");
      const hasMissingExtendedColumn = /(is_verified|verified_by|verified_at|status_source|sanction_message|sanction_by|sanction_at|shift_schedule|overtime_hours|is_holiday_work)/i.test(errorText);

      if (hasMissingExtendedColumn) {
        const fallbackPayload = buildAttendancePayload(workDate, record, { includeExtendedFields: false });
        const fallback = await window.supabaseClient
          .from("attendance_records")
          .upsert(fallbackPayload, { onConflict: "work_date,employee_id" });

        if (!fallback.error) {
          return true;
        }

        error = fallback.error;
      }
    }

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
