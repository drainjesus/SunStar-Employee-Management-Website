const PERFORMANCE_MANAGER_REVIEW_KEY = "sunstar_manager_reviews";
let managerReviewTableMissingInSession = false;

function getCachedManagerReviews() {
  try {
    const raw = localStorage.getItem(PERFORMANCE_MANAGER_REVIEW_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isManagerReviewsTableMissing(error) {
  const message = [error && error.message, error && error.details, error && error.hint]
    .filter(Boolean)
    .join(" ");
  return /manager_reviews/i.test(message);
}

function toNumberOrZero(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

window.PerformanceDataService = {
  async fetchPerformances() {
    if (!window.supabaseClient) return null;
    const { data, error } = await window.supabaseClient
      .from("performance_records")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("fetchPerformances failed", error);
      return null;
    }

    return data.map(row => ({
      id: row.id,
      name: row.employee_name,
      role: row.role,
      profilePic: row.profile_pic,
      managerRating: row.manager_rating,
      peerAvg: row.peer_avg,
      breakdown: row.breakdown,
      comments: row.comments
    }));
  },

  async upsertPerformance(record) {
    if (!window.supabaseClient) return false;

    const payload = {
      id: record.id,
      employee_name: record.name,
      role: record.role || null,
      profile_pic: record.profilePic || null,
      manager_rating: record.managerRating || null,
      peer_avg: record.peerAvg || null,
      breakdown: record.breakdown || null,
      comments: record.comments || null
    };

    const { error } = await window.supabaseClient
      .from("performance_records")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      console.error("upsertPerformance failed", error);
      return false;
    }

    return true;
  },

  async fetchPeerReviews() {
    if (!window.supabaseClient) return null;

    const { data, error } = await window.supabaseClient
      .from("peer_reviews")
      .select("reviewer_id,target_id,rating,updated_at");

    if (error) {
      console.error("fetchPeerReviews failed", error);
      return null;
    }

    return data.map(row => ({
      reviewerId: row.reviewer_id,
      targetId: row.target_id,
      rating: row.rating,
      updatedAt: row.updated_at
    }));
  },

  async upsertPeerReview(review) {
    if (!window.supabaseClient) return false;

    const { error } = await window.supabaseClient
      .from("peer_reviews")
      .upsert({
        reviewer_id: review.reviewerId,
        target_id: review.targetId,
        rating: review.rating,
        updated_at: review.updatedAt || new Date().toISOString()
      }, { onConflict: "reviewer_id,target_id" });

    if (error) {
      console.error("upsertPeerReview failed", error);
      return false;
    }

    return true;
  },

  async fetchManagerReviews() {
    if (!window.supabaseClient) return null;
    if (managerReviewTableMissingInSession) return getCachedManagerReviews();

    const { data, error } = await window.supabaseClient
      .from("manager_reviews")
      .select("employee_id,employee_name,leadership,communication,support,average,comment,updated_at")
      .order("updated_at", { ascending: false });

    if (error) {
      if (isManagerReviewsTableMissing(error)) {
        managerReviewTableMissingInSession = true;
        return getCachedManagerReviews();
      }
      console.error("fetchManagerReviews failed", error);
      return null;
    }

    managerReviewTableMissingInSession = false;
    const cached = getCachedManagerReviews();
    return (data || []).map((row) => ({
      ...(cached.find(item => String(item.employeeId) === String(row.employee_id)) || {}),
      employeeId: row.employee_id,
      employeeName: row.employee_name || "",
      criteria: (cached.find(item => String(item.employeeId) === String(row.employee_id)) || {}).criteria || {
        leadership: Number(row.leadership || 0),
        communication: Number(row.communication || 0),
        support: Number(row.support || 0)
      },
      average: row.average !== null && row.average !== undefined ? String(row.average) : "0.0",
      comment: row.comment || "",
      updatedAt: row.updated_at || ""
    }));
  },

  async upsertManagerReview(review) {
    if (!window.supabaseClient || !review) return false;
    if (managerReviewTableMissingInSession) return true;

    const criteria = review.criteria && typeof review.criteria === "object" ? review.criteria : {};
    const scores = Object.values(criteria).map(toNumberOrZero).filter((score) => score > 0);
    const leadership = toNumberOrZero(criteria.leadership) || scores[0] || 0;
    const communication = toNumberOrZero(criteria.communication) || scores[1] || 0;
    const support = toNumberOrZero(criteria.support) || scores[2] || 0;

    const payload = {
      employee_id: review.employeeId,
      employee_name: review.employeeName || "Employee",
      leadership,
      communication,
      support,
      average: Number.parseFloat(review.average) || 0,
      comment: review.comment || null,
      updated_at: review.updatedAt || new Date().toISOString()
    };

    const { error } = await window.supabaseClient
      .from("manager_reviews")
      .upsert(payload, { onConflict: "employee_id" });

    if (error) {
      if (isManagerReviewsTableMissing(error)) {
        managerReviewTableMissingInSession = true;
        return true;
      }
      console.error("upsertManagerReview failed", error);
      return false;
    }

    managerReviewTableMissingInSession = false;
    return true;
  }
};
