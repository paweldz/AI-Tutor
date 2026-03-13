import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase.js";

/**
 * Manages Supabase Auth state: login, signup, logout, password reset.
 * When supabase is null (not configured), user is always null.
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!supabase);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signUp(email, password) {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  }

  return { user, loading, signUp, signIn, signOut, resetPassword, authEnabled: !!supabase };
}
