import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Supabase client — null when env vars are not configured */
export const supabase = url && key ? createClient(url, key) : null;

/**
 * Browser console diagnostic — run window.diagnoseSupabase() in DevTools
 * to check connection, auth, tables, and RLS in one go.
 */
if (typeof window !== "undefined") {
  window.diagnoseSupabase = async function () {
    console.log("=== Supabase Diagnostic ===");
    console.log("1. Client configured:", !!supabase);
    console.log("   URL:", url || "(missing VITE_SUPABASE_URL)");
    console.log("   Key:", key ? key.slice(0, 20) + "..." : "(missing VITE_SUPABASE_ANON_KEY)");

    if (!supabase) { console.error("❌ Supabase client is null — env vars missing"); return; }

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    console.log("2. Auth:", user ? `✓ user ${user.id}` : `✗ ${authErr?.message || "not logged in"}`);

    const tables = ["tutor_settings", "tutor_memory", "tutor_xp", "tutor_streaks"];
    for (const t of tables) {
      const { data, error, count } = await supabase.from(t).select("*", { count: "exact", head: true });
      if (error) {
        console.error(`3. ${t}: ✗ ${error.message} (code: ${error.code})`);
      } else {
        console.log(`3. ${t}: ✓ exists (${count ?? "?"} rows for this user)`);
      }
    }

    // Quick write/read test on tutor_settings
    if (user) {
      const testVal = `diag_${Date.now()}`;
      const { error: wErr } = await supabase.from("tutor_settings").upsert(
        { user_id: user.id, key: "_diag_test", value: testVal },
        { onConflict: "user_id,key" }
      );
      if (wErr) {
        console.error("4. Write test: ✗", wErr.message);
      } else {
        const { data: rd, error: rErr } = await supabase.from("tutor_settings")
          .select("value").eq("key", "_diag_test").maybeSingle();
        if (rErr) console.error("4. Read test: ✗", rErr.message);
        else if (rd?.value === testVal) console.log("4. Write/Read test: ✓ round-trip OK");
        else console.error("4. Read test: ✗ value mismatch", rd?.value, "vs", testVal);
        // Clean up
        await supabase.from("tutor_settings").delete().eq("key", "_diag_test");
      }
    }
    console.log("=== End Diagnostic ===");
  };
}
