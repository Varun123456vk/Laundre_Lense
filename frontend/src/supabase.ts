import { createClient, type SupabaseClient, type User as SupabaseAuthUser } from "@supabase/supabase-js";
import type { User } from "./App";

// Retrieve and sanitize environment variables (configured via frontend/.env)
let rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
if (rawUrl && rawUrl.includes("supabase.com/dashboard/project/")) {
  const projId = rawUrl.split("supabase.com/dashboard/project/")[1]?.split("/")[0]?.split("?")[0];
  if (projId) {
    rawUrl = `https://${projId}.supabase.co`;
  }
}
const supabaseUrl = rawUrl?.replace(/\/+$/, "");
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== "https://your-project.supabase.co" &&
    supabaseAnonKey !== "your-anon-key"
  );
};

// Initialize Supabase Client
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * Triggers Google OAuth via Supabase Authentication.
 * Redirects the user to Google's sign-in screen.
 */
export async function signInWithGoogle(): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      error: new Error(
        "Supabase credentials are not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your frontend/.env file."
      ),
    };
  }

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    return { error: error ? new Error(error.message) : null };
  } catch (err: any) {
    return { error: new Error(err.message || "Failed to initiate Google OAuth.") };
  }
}

/**
 * Sign out of active Supabase session.
 */
export async function signOutSupabase(): Promise<void> {
  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Supabase sign out error:", err);
    }
  }
}

/**
 * Maps a Supabase Auth user object to the LaunderLens User model.
 */
export function mapSupabaseUserToUser(sbUser: SupabaseAuthUser): User {
  const email = sbUser.email || "";
  const meta = (sbUser.user_metadata || {}) as Record<string, any>;
  
  const rawName =
    meta.full_name ||
    meta.name ||
    meta.user_name ||
    (email ? email.split("@")[0].replace(/[._-]/g, " ") : "Investigator");

  // Title case the name
  const cleanName = rawName
    .split(" ")
    .filter(Boolean)
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") || "Investigator";

  const initials =
    cleanName
      .split(" ")
      .filter(Boolean)
      .map((w: string) => w[0].toUpperCase())
      .slice(0, 2)
      .join("") || "GU";

  return {
    id: sbUser.id,
    name: cleanName,
    email,
    initials,
    role: meta.role || "Senior AML Investigator",
    clearance: meta.clearance || "Tier-3 Authorized",
    department: meta.department || "Google Verified Authentication Desk",
  };
}

