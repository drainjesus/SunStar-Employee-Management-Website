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

    const { data, error } = await window.supabaseClient
      .from("manager_reviews")
      .select("employee_id,employee_name,leadership,communication,support,average,comment,updated_at")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("fetchManagerReviews failed", error);
      return null;
    }

    return (data || []).map((row) => ({
      employeeId: row.employee_id,
      employeeName: row.employee_name || "",
      criteria: {
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

    const payload = {
      employee_id: review.employeeId,
      employee_name: review.employeeName || "Employee",
      leadership: Number(review.criteria && review.criteria.leadership) || 0,
      communication: Number(review.criteria && review.criteria.communication) || 0,
      support: Number(review.criteria && review.criteria.support) || 0,
      average: Number.parseFloat(review.average) || 0,
      comment: review.comment || null,
      updated_at: review.updatedAt || new Date().toISOString()
    };

    const { error } = await window.supabaseClient
      .from("manager_reviews")
      .upsert(payload, { onConflict: "employee_id" });

    if (error) {
      console.error("upsertManagerReview failed", error);
      return false;
    }

    return true;
  }
};
