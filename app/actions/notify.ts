"use server";

import { notifyNewSignup } from "@/lib/notifications";

/**
 * Fire-and-forget admin notification that a new account was just created.
 * Called from the signup form client-side after supabase.auth.signUp()
 * succeeds. Failures are swallowed and logged so they never break the
 * user-facing signup flow.
 */
export async function notifySignupAction(email: string): Promise<void> {
  if (!email) return;
  try {
    await notifyNewSignup(email);
  } catch (err) {
    console.error("[notifySignupAction]", err);
  }
}
