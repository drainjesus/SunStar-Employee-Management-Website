(function () {
  const cfg = window.SUPABASE_CONFIG;

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
