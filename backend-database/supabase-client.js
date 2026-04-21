(function () {
  const DEFAULT_SUPABASE_CONFIG = {
    url: "https://zajdwkuejwedaaaygpss.supabase.co",
    anonKey: "sb_publishable_1mksI_Q3xrCiR5KEkFypiQ_3quIfGs5"
  };
  const cfg = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url && window.SUPABASE_CONFIG.anonKey)
    ? window.SUPABASE_CONFIG
    : DEFAULT_SUPABASE_CONFIG;

  if (!cfg || !cfg.url || !cfg.anonKey) {
    window.supabaseClient = null;
    console.warn("Supabase config missing. Using localStorage fallback.");
    return;
  }

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    window.supabaseClient = null;
    console.warn("Supabase SDK not loaded. Using localStorage fallback.");
    return;
  }

  window.supabaseClient = window.supabase.createClient(cfg.url, cfg.anonKey);
})();
