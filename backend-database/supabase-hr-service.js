(function () {
  const TRAINING_KEY = "sunstar_trainings";
  const TRAINING_DEV_KEY = "sunstar_training_development_entries";
  const TRAINING_CERTIFICATE_BUCKET = "training-certificates";
  const LEAVE_KEY = "sunstar_leaves";
  const LEAVE_ATTACHMENT_TABLE = "leave_attachments";
  const ATTENDANCE_KEY = "sunstar_attendance";
  const ATTENDANCE_REQUEST_KEY = "sunstar_attendance_requests";
  const ATTENDANCE_REQUEST_TABLE = "attendance_special_requests";
  const ATTENDANCE_REQUEST_UNSUPPORTED_COLUMNS_KEY = "__attendance_request_unsupported_columns";
  const DEFAULT_SHIFT_SCHEDULE = "Newsroom Day Shift (08:00 AM - 05:00 PM)";
  let trainingDevLastError = "";
  let attendanceRequestTableMissingInSession = false;
  const unsupportedTrainingDevColumns = new Set();
  const unsupportedAttendanceRequestColumns = new Set((() => {
    try {
      const raw = localStorage.getItem(ATTENDANCE_REQUEST_UNSUPPORTED_COLUMNS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map((value) => String(value)) : [];
    } catch {
      return [];
    }
  })());
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

  function setTrainingDevLastError(error) {
    const message = [error && error.message, error && error.details, error && error.hint]
      .filter(Boolean)
      .join(" ");
    trainingDevLastError = String(message || "").trim();
  }

  function clearTrainingDevLastError() {
    trainingDevLastError = "";
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

  function mapTrainingDevDbToLocal(row) {
    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.employee_name || "",
      submissionType: row.submission_type || "catalog",
      programId: row.program_id ?? null,
      providerName: row.provider_name || "",
      title: row.training_title || "",
      dateFrom: row.date_from || "",
      dateTo: row.date_to || "",
      certificateName: row.certificate_name || "",
      certificateUrl: row.certificate_url || "",
      certificateStoragePath: row.certificate_storage_path || "",
      certificateDataUrl: row.certificate_data_url || "",
      status: row.status || "Pending",
      reviewNote: row.review_note || "",
      reviewedBy: row.reviewed_by || "",
      reviewedAt: row.reviewed_at || "",
      createdAt: row.created_at || "",
      updatedAt: row.updated_at || ""
    };
  }

  function mapTrainingDevLocalToDb(entry) {
    const numericEmployeeId = Number(entry.employeeId);
    return {
      id: entry.id,
      employee_id: Number.isFinite(numericEmployeeId) ? numericEmployeeId : null,
      employee_name: entry.employeeName || null,
      submission_type: entry.submissionType === "external" ? "external" : "catalog",
      program_id: entry.programId === null || entry.programId === undefined || entry.programId === "" ? null : Number(entry.programId),
      provider_name: entry.providerName || null,
      training_title: entry.title || "",
      date_from: safeDateString(entry.dateFrom),
      date_to: safeDateString(entry.dateTo),
      certificate_name: entry.certificateName || "",
      certificate_url: entry.certificateUrl || null,
      certificate_storage_path: entry.certificateStoragePath || null,
      certificate_data_url: entry.certificateDataUrl || null,
      status: entry.status || "Pending",
      review_note: entry.reviewNote || null,
      reviewed_by: entry.reviewedBy || null,
      reviewed_at: entry.reviewedAt || null,
      created_at: entry.createdAt || null
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

  function mapAttendanceRequestDbToLocal(row) {
    const dbStatus = row.status || "Pending";
    const normalizedStatus = dbStatus === "Rejected" ? "Declined" : dbStatus;
    const dbType = row.request_type || "Official Business";
    const normalizedType = dbType === "Special Work" ? "Special Holiday Work" : dbType;
    const requestDateTo = row.request_date_to || row.request_date || "";

    return {
      id: row.id,
      empId: row.employee_id,
      employeeName: row.employee_name || "",
      requestDate: row.request_date || "",
      requestType: normalizedType,
      requestedHours: formatOvertimeHours(row.requested_hours),
      shiftSchedule: row.shift_schedule || DEFAULT_SHIFT_SCHEDULE,
      reason: row.reason || "",
      status: normalizedStatus,
      requestDetails: {
        dateFrom: row.request_date || "",
        dateTo: requestDateTo,
        timeFrom: row.time_from || "",
        timeTo: row.time_to || "",
        businessType: row.business_type || "",
        date: row.request_date || "",
        specialHoliday: row.special_holiday || ""
      },
      decisionNote: row.decision_note || "",
      decisionBy: row.decided_by || "",
      decisionAt: row.decided_at || "",
      createdAt: row.created_at || "",
      updatedAt: row.updated_at || ""
    };
  }

  function mapAttendanceRequestLocalToDb(request) {
    const parsedEmployeeId = Number(request.empId);
    const parsedHours = Number.parseFloat(request.requestedHours);
    const requestDetails = request.requestDetails || {};
    const normalizedStatus = request.status === "Declined" ? "Rejected" : (request.status || "Pending");
    const normalizedType = request.requestType === "Special Holiday Work" ? "Special Work" : (request.requestType || "Official Business");
    const requestDateTo = requestDetails.dateTo || request.requestDate;
    const normalizedReason = String(
      request.reason
      || requestDetails.specialHoliday
      || requestDetails.businessType
      || "Attendance request"
    ).trim() || "Attendance request";

    return {
      id: request.id,
      employee_id: Number.isFinite(parsedEmployeeId) ? parsedEmployeeId : null,
      employee_name: request.employeeName || "Unknown Employee",
      request_date: safeDateString(request.requestDate),
      request_date_to: safeDateString(requestDateTo),
      request_type: normalizedType,
      requested_hours: Number.isFinite(parsedHours) && parsedHours > 0 ? parsedHours : 0,
      shift_schedule: request.shiftSchedule || DEFAULT_SHIFT_SCHEDULE,
      reason: normalizedReason,
      time_from: requestDetails.timeFrom || null,
      time_to: requestDetails.timeTo || null,
      business_type: requestDetails.businessType || null,
      special_holiday: requestDetails.specialHoliday || null,
      status: normalizedStatus,
      decision_note: request.decisionNote || null,
      decided_by: request.decisionBy || null,
      decided_at: request.decisionAt || null
    };
  }

  function isAttendanceRequestTableMissing(error) {
    const message = [error && error.message, error && error.details, error && error.hint]
      .filter(Boolean)
      .join(" ");

    return /attendance_special_requests/i.test(message);
  }

  function getCachedAttendanceRequests() {
    try {
      const raw = localStorage.getItem(ATTENDANCE_REQUEST_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function toComparableTimestamp(value) {
    const parsed = new Date(value || "");
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }

  function mergeAttendanceRequestsWithCache(remoteRequests) {
    const cachedRequests = getCachedAttendanceRequests();
    const mergedMap = new Map();

    cachedRequests.forEach((request) => {
      if (!request || !request.id) return;
      mergedMap.set(String(request.id), request);
    });

    (Array.isArray(remoteRequests) ? remoteRequests : []).forEach((remoteRequest) => {
      if (!remoteRequest || !remoteRequest.id) return;
      const key = String(remoteRequest.id);
      const existing = mergedMap.get(key);
      if (!existing) {
        mergedMap.set(key, remoteRequest);
        return;
      }

      const existingTs = toComparableTimestamp(existing.updatedAt || existing.createdAt);
      const remoteTs = toComparableTimestamp(remoteRequest.updatedAt || remoteRequest.createdAt);

      if (remoteTs >= existingTs) {
        mergedMap.set(key, { ...existing, ...remoteRequest });
      }
    });

    return Array.from(mergedMap.values()).sort((a, b) => {
      const dateDiff = String(b.requestDate || "").localeCompare(String(a.requestDate || ""));
      if (dateDiff !== 0) return dateDiff;
      return toComparableTimestamp(b.createdAt) - toComparableTimestamp(a.createdAt);
    });
  }

  function isAttendanceRequestTableMarkedMissing() {
    return attendanceRequestTableMissingInSession;
  }

  function rememberUnsupportedAttendanceRequestColumn(columnName) {
    if (!columnName) return;
    unsupportedAttendanceRequestColumns.add(String(columnName));
    try {
      localStorage.setItem(
        ATTENDANCE_REQUEST_UNSUPPORTED_COLUMNS_KEY,
        JSON.stringify(Array.from(unsupportedAttendanceRequestColumns))
      );
    } catch {
      // Ignore localStorage write failures.
    }
  }

  function getMissingColumnFromError(error) {
    const combined = [error && error.message, error && error.details, error && error.hint]
      .filter(Boolean)
      .join(" ");
    const patterns = [
      /Could not find the ['"]([^'"]+)['"] column/i,
      /column ['"]([^'"]+)['"] does not exist/i,
      /Unknown column ['"]([^'"]+)['"]/i
    ];
    for (const pattern of patterns) {
      const match = combined.match(pattern);
      if (match && match[1]) return String(match[1]).trim();
    }
    return "";
  }

  function markAttendanceRequestTableMissing() {
    attendanceRequestTableMissingInSession = true;
  }

  function clearAttendanceRequestTableMissingMark() {
    attendanceRequestTableMissingInSession = false;
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
  }

  function createRequestUuid() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
      const randomValue = Math.floor(Math.random() * 16);
      const mapped = char === "x" ? randomValue : ((randomValue & 0x3) | 0x8);
      return mapped.toString(16);
    });
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

  async function fetchTrainingDevEntries() {
    if (!hasClient()) return null;

    const { data, error } = await window.supabaseClient
      .from("training_development_entries")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetchTrainingDevEntries failed", error);
      setTrainingDevLastError(error);
      return null;
    }

    clearTrainingDevLastError();
    return (data || []).map(mapTrainingDevDbToLocal);
  }

  async function upsertTrainingDevEntry(entry) {
    if (!hasClient()) return false;

    const payload = mapTrainingDevLocalToDb(entry);
    if (unsupportedTrainingDevColumns.has("certificate_url")) {
      delete payload.certificate_url;
    }
    if (unsupportedTrainingDevColumns.has("certificate_storage_path")) {
      delete payload.certificate_storage_path;
    }
    if (unsupportedTrainingDevColumns.has("certificate_data_url")) {
      delete payload.certificate_data_url;
    }
    if (unsupportedTrainingDevColumns.has("submission_type")) {
      delete payload.submission_type;
    }
    if (unsupportedTrainingDevColumns.has("program_id")) {
      delete payload.program_id;
    }
    if (unsupportedTrainingDevColumns.has("provider_name")) {
      delete payload.provider_name;
    }
    if (unsupportedTrainingDevColumns.has("review_note")) {
      delete payload.review_note;
    }
    if (unsupportedTrainingDevColumns.has("reviewed_by")) {
      delete payload.reviewed_by;
    }
    if (unsupportedTrainingDevColumns.has("reviewed_at")) {
      delete payload.reviewed_at;
    }
    if (unsupportedTrainingDevColumns.has("status")) {
      delete payload.status;
    }

    let { error } = await window.supabaseClient
      .from("training_development_entries")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      const fallbackPayload = { ...payload };
      const errorText = [error.message, error.details, error.hint].filter(Boolean).join(" ");
      let shouldRetry = false;

      if (/submission_type/i.test(errorText)) {
        delete fallbackPayload.submission_type;
        unsupportedTrainingDevColumns.add("submission_type");
        shouldRetry = true;
      }
      if (/program_id/i.test(errorText)) {
        delete fallbackPayload.program_id;
        unsupportedTrainingDevColumns.add("program_id");
        shouldRetry = true;
      }
      if (/provider_name/i.test(errorText)) {
        delete fallbackPayload.provider_name;
        unsupportedTrainingDevColumns.add("provider_name");
        shouldRetry = true;
      }
      if (/review_note/i.test(errorText)) {
        delete fallbackPayload.review_note;
        unsupportedTrainingDevColumns.add("review_note");
        shouldRetry = true;
      }
      if (/reviewed_by/i.test(errorText)) {
        delete fallbackPayload.reviewed_by;
        unsupportedTrainingDevColumns.add("reviewed_by");
        shouldRetry = true;
      }
      if (/reviewed_at/i.test(errorText)) {
        delete fallbackPayload.reviewed_at;
        unsupportedTrainingDevColumns.add("reviewed_at");
        shouldRetry = true;
      }
      if (/status/i.test(errorText)) {
        delete fallbackPayload.status;
        unsupportedTrainingDevColumns.add("status");
        shouldRetry = true;
      }
      if (/certificate[_\s]?url/i.test(errorText)) {
        delete fallbackPayload.certificate_url;
        unsupportedTrainingDevColumns.add("certificate_url");
        shouldRetry = true;
      }
      if (/certificate[_\s]?storage[_\s]?path/i.test(errorText)) {
        delete fallbackPayload.certificate_storage_path;
        unsupportedTrainingDevColumns.add("certificate_storage_path");
        shouldRetry = true;
      }
      if (/certificate_data_url/i.test(errorText)) {
        delete fallbackPayload.certificate_data_url;
        unsupportedTrainingDevColumns.add("certificate_data_url");
        shouldRetry = true;
      }

      if (shouldRetry) {
        const fallback = await window.supabaseClient
          .from("training_development_entries")
          .upsert(fallbackPayload, { onConflict: "id" });

        if (!fallback.error) {
          clearTrainingDevLastError();
          return true;
        }

        error = fallback.error;
      }

      console.error("upsertTrainingDevEntry failed", error);
      setTrainingDevLastError(error);
      return false;
    }

    clearTrainingDevLastError();
    return true;
  }

  function sanitizePathSegment(value, fallback = "unknown") {
    const cleaned = String(value || "")
      .trim()
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 80);
    return cleaned || fallback;
  }

  function getTrainingCertificatePublicUrl(storagePath) {
    if (!hasClient() || !storagePath) return "";
    const { data } = window.supabaseClient
      .storage
      .from(TRAINING_CERTIFICATE_BUCKET)
      .getPublicUrl(storagePath);
    return data && data.publicUrl ? data.publicUrl : "";
  }

  async function uploadTrainingCertificate(file, options = {}) {
    if (!hasClient() || !file) return null;

    const employeeId = sanitizePathSegment(options.employeeId, "employee");
    const entryId = sanitizePathSegment(options.entryId, "entry");
    const originalName = sanitizePathSegment(file.name || "certificate");
    const extension = originalName.includes(".")
      ? originalName.split(".").pop()
      : "bin";
    const uniquePath = `training-dev/${employeeId}/${entryId}_${Date.now()}.${extension}`;

    const { error: uploadError } = await window.supabaseClient
      .storage
      .from(TRAINING_CERTIFICATE_BUCKET)
      .upload(uniquePath, file, {
        upsert: true,
        contentType: file.type || undefined
      });

    if (uploadError) {
      setTrainingDevLastError(uploadError);
      return null;
    }

    clearTrainingDevLastError();
    const certificateUrl = getTrainingCertificatePublicUrl(uniquePath);
    return {
      storagePath: uniquePath,
      publicUrl: certificateUrl
    };
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

  async function deleteLeave(leaveId) {
    if (!hasClient()) return false;
    const id = Number(leaveId);
    if (!Number.isFinite(id)) return false;

    const { error: deleteError } = await window.supabaseClient
      .from("leave_requests")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("deleteLeave failed", deleteError);
      return false;
    }

    const { error: attachmentError } = await window.supabaseClient
      .from(LEAVE_ATTACHMENT_TABLE)
      .delete()
      .eq("leave_request_id", id);

    if (attachmentError && !isLeaveAttachmentTableMissing(attachmentError)) {
      console.error("deleteLeave attachments failed", attachmentError);
      return false;
    }

    return true;
  }

  async function clearLeaves() {
    if (!hasClient()) return false;

    const { error: deleteError } = await window.supabaseClient
      .from("leave_requests")
      .delete()
      .neq("id", -1);

    if (deleteError) {
      console.error("clearLeaves failed", deleteError);
      return false;
    }

    const { error: attachmentError } = await window.supabaseClient
      .from(LEAVE_ATTACHMENT_TABLE)
      .delete()
      .neq("leave_request_id", -1);

    if (attachmentError && !isLeaveAttachmentTableMissing(attachmentError)) {
      console.error("clearLeaves attachments failed", attachmentError);
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

  async function deleteAttendanceRecord(workDate, employeeId) {
    if (!hasClient()) return false;
    if (!workDate || employeeId === undefined || employeeId === null || employeeId === "") return false;

    const { error } = await window.supabaseClient
      .from("attendance_records")
      .delete()
      .eq("work_date", workDate)
      .eq("employee_id", employeeId);

    if (error) {
      console.error("deleteAttendanceRecord failed", error);
      return false;
    }

    return true;
  }

  async function clearAttendanceRecords(employeeId) {
    if (!hasClient()) return false;

    let query = window.supabaseClient
      .from("attendance_records")
      .delete();

    if (employeeId !== undefined && employeeId !== null && employeeId !== "") {
      query = query.eq("employee_id", employeeId);
    } else {
      query = query.neq("employee_id", "__none__");
    }

    const { error } = await query;

    if (error) {
      console.error("clearAttendanceRecords failed", error);
      return false;
    }

    return true;
  }

  async function fetchAttendanceRequests() {
    if (!hasClient()) return null;

    if (isAttendanceRequestTableMarkedMissing()) {
      return getCachedAttendanceRequests();
    }

    const { data, error } = await window.supabaseClient
      .from(ATTENDANCE_REQUEST_TABLE)
      .select("*")
      .order("request_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      if (isAttendanceRequestTableMissing(error)) {
        markAttendanceRequestTableMissing();
        return getCachedAttendanceRequests();
      }

      console.error("fetchAttendanceRequests failed", error);
      return null;
    }

    clearAttendanceRequestTableMissingMark();

    const mappedRemote = (data || []).map(mapAttendanceRequestDbToLocal);
    return mergeAttendanceRequestsWithCache(mappedRemote);
  }

  async function upsertAttendanceRequest(request) {
    if (!hasClient() || !request) return false;

    if (isAttendanceRequestTableMarkedMissing()) {
      return false;
    }

    if (!isUuid(request.id)) {
      request.id = createRequestUuid();
    }

    const payload = mapAttendanceRequestLocalToDb(request);
    unsupportedAttendanceRequestColumns.forEach((columnName) => {
      if (Object.prototype.hasOwnProperty.call(payload, columnName)) {
        delete payload[columnName];
      }
    });

    let { error } = await window.supabaseClient
      .from(ATTENDANCE_REQUEST_TABLE)
      .upsert(payload, { onConflict: "id" });

    if (error) {
      if (isAttendanceRequestTableMissing(error)) {
        markAttendanceRequestTableMissing();
        return false;
      }

      const errorText = [error.message, error.details, error.hint].filter(Boolean).join(" ");
      const fallbackPayload = { ...payload };
      let shouldRetry = false;

      if (/shift[_\s]?schedule/i.test(errorText)) {
        delete fallbackPayload.shift_schedule;
        rememberUnsupportedAttendanceRequestColumn("shift_schedule");
        shouldRetry = true;
      }
      if (/request[_\s]?date[_\s]?to/i.test(errorText)) {
        delete fallbackPayload.request_date_to;
        rememberUnsupportedAttendanceRequestColumn("request_date_to");
        shouldRetry = true;
      }
      if (/time[_\s]?from/i.test(errorText)) {
        delete fallbackPayload.time_from;
        rememberUnsupportedAttendanceRequestColumn("time_from");
        shouldRetry = true;
      }
      if (/time[_\s]?to/i.test(errorText)) {
        delete fallbackPayload.time_to;
        rememberUnsupportedAttendanceRequestColumn("time_to");
        shouldRetry = true;
      }
      if (/business[_\s]?type/i.test(errorText)) {
        delete fallbackPayload.business_type;
        rememberUnsupportedAttendanceRequestColumn("business_type");
        shouldRetry = true;
      }
      if (/special[_\s]?holiday/i.test(errorText)) {
        delete fallbackPayload.special_holiday;
        rememberUnsupportedAttendanceRequestColumn("special_holiday");
        shouldRetry = true;
      }
      if (/employee_id|foreign key|employees/i.test(errorText)) {
        delete fallbackPayload.employee_id;
        rememberUnsupportedAttendanceRequestColumn("employee_id");
        shouldRetry = true;
      }
      if (/reason/i.test(errorText)) {
        fallbackPayload.reason = fallbackPayload.reason || "Attendance request";
        shouldRetry = true;
      }

      const genericMissingColumn = getMissingColumnFromError(error);
      if (genericMissingColumn && Object.prototype.hasOwnProperty.call(fallbackPayload, genericMissingColumn)) {
        delete fallbackPayload[genericMissingColumn];
        rememberUnsupportedAttendanceRequestColumn(genericMissingColumn);
        shouldRetry = true;
      }

      if (shouldRetry) {
        const fallback = await window.supabaseClient
          .from(ATTENDANCE_REQUEST_TABLE)
          .upsert(fallbackPayload, { onConflict: "id" });

        if (!fallback.error) {
          return true;
        }

        error = fallback.error;
        const chainedMissingColumn = getMissingColumnFromError(error);
        if (chainedMissingColumn && Object.prototype.hasOwnProperty.call(fallbackPayload, chainedMissingColumn)) {
          delete fallbackPayload[chainedMissingColumn];
          rememberUnsupportedAttendanceRequestColumn(chainedMissingColumn);
          const secondFallback = await window.supabaseClient
            .from(ATTENDANCE_REQUEST_TABLE)
            .upsert(fallbackPayload, { onConflict: "id" });
          if (!secondFallback.error) {
            return true;
          }
          error = secondFallback.error;
        }
      }

      console.error("upsertAttendanceRequest failed", error);
      return false;
    }

    clearAttendanceRequestTableMissingMark();

    return true;
  }

  async function deleteAttendanceRequest(requestId) {
    if (!hasClient() || !requestId) return false;
    if (isAttendanceRequestTableMarkedMissing()) return true;

    const { error } = await window.supabaseClient
      .from(ATTENDANCE_REQUEST_TABLE)
      .delete()
      .eq("id", requestId);

    if (error) {
      if (isAttendanceRequestTableMissing(error)) {
        markAttendanceRequestTableMissing();
        return true;
      }
      console.error("deleteAttendanceRequest failed", error);
      return false;
    }

    clearAttendanceRequestTableMissingMark();
    return true;
  }

  async function clearAttendanceRequests(employeeId) {
    if (!hasClient()) return false;
    if (isAttendanceRequestTableMarkedMissing()) return true;

    let query = window.supabaseClient
      .from(ATTENDANCE_REQUEST_TABLE)
      .delete();

    if (employeeId !== undefined && employeeId !== null && employeeId !== "") {
      query = query.eq("employee_id", employeeId);
    } else {
      query = query.neq("id", "");
    }

    const { error } = await query;

    if (error) {
      if (isAttendanceRequestTableMissing(error)) {
        markAttendanceRequestTableMissing();
        return true;
      }
      console.error("clearAttendanceRequests failed", error);
      return false;
    }

    clearAttendanceRequestTableMissingMark();
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

  async function syncTrainingDevEntriesLocalFromRemote() {
    const remote = await fetchTrainingDevEntries();
    if (!Array.isArray(remote)) return false;
    localStorage.setItem(TRAINING_DEV_KEY, JSON.stringify(remote));
    return true;
  }

  async function syncAttendanceLocalFromRemote() {
    const remote = await fetchAttendanceGrouped();
    if (!remote || typeof remote !== "object") return false;
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(remote));
    return true;
  }

  async function syncAttendanceRequestsLocalFromRemote() {
    const remote = await fetchAttendanceRequests();
    if (!Array.isArray(remote)) return false;
    localStorage.setItem(ATTENDANCE_REQUEST_KEY, JSON.stringify(remote));
    return true;
  }

  window.HRDataService = {
    fetchTrainings,
    upsertTraining,
    fetchTrainingDevEntries,
    upsertTrainingDevEntry,
    fetchLeaves,
    upsertLeave,
    deleteLeave,
    clearLeaves,
    fetchAttendanceGrouped,
    upsertAttendanceRecord,
    deleteAttendanceRecord,
    clearAttendanceRecords,
    fetchAttendanceRequests,
    upsertAttendanceRequest,
    deleteAttendanceRequest,
    clearAttendanceRequests,
    syncTrainingsLocalFromRemote,
    syncTrainingDevEntriesLocalFromRemote,
    syncLeavesLocalFromRemote,
    syncAttendanceLocalFromRemote,
    syncAttendanceRequestsLocalFromRemote,
    uploadTrainingCertificate,
    getTrainingCertificatePublicUrl
    ,
    getTrainingDevLastError: () => trainingDevLastError
  };
})();
