"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CartProduct = {
  id: string;
  name: string;
  service: string;
  minPrice: number | null;
  maxPrice: number | null;
  imageUrl?: string | null;
  quantity?: number;
};

export type FileMeta = {
  path: string;
  name: string;
  size: number;
};

export type AnswerValue =
  | string
  | number
  | boolean
  | string[]
  | FileMeta[]
  | null;

export type Answers = Record<string, AnswerValue>;

/** Map of product id → note text (set by user on the invoice). */
export type ProductNotes = Record<string, string>;

export type SubmittedQuoteSummary = {
  id: string;
  submitted_at: string | null;
  total_min: number | null;
  total_max: number | null;
  products: CartProduct[];
};

export type SubmittedQuoteDetail = SubmittedQuoteSummary & {
  answers: Answers;
  notes: ProductNotes;
};

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");
  return { supabase, user };
}

function qtyOf(p: { quantity?: number }): number {
  const q = p.quantity ?? 1;
  return Number.isFinite(q) && q > 0 ? Math.floor(q) : 1;
}

function totalsOf(products: CartProduct[]) {
  const total_min = products.reduce(
    (s, p) => s + (p.minPrice ?? 0) * qtyOf(p),
    0,
  );
  const total_max = products.reduce(
    (s, p) => s + (p.maxPrice ?? 0) * qtyOf(p),
    0,
  );
  return { total_min, total_max };
}

export async function getDraftQuote(): Promise<{
  products: CartProduct[];
  answers: Answers;
} | null> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("quotes")
    .select("products, answers")
    .eq("user_id", user.id)
    .eq("status", "draft")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return {
    products: (data.products ?? []) as CartProduct[],
    answers: (data.answers ?? {}) as Answers,
  };
}

/**
 * Upserts the draft row for the current user. Updates only the columns
 * provided in `patch`, so products and answers can be saved independently
 * without one clobbering the other.
 */
async function upsertDraft(patch: {
  products?: CartProduct[];
  answers?: Answers;
}) {
  const { supabase, user } = await requireUser();

  const updateFields: Record<string, unknown> = {};
  if (patch.products !== undefined) {
    updateFields.products = patch.products;
    const { total_min, total_max } = totalsOf(patch.products);
    updateFields.total_min = total_min;
    updateFields.total_max = total_max;
  }
  if (patch.answers !== undefined) {
    updateFields.answers = patch.answers;
  }

  // Try update existing draft first
  const { data: updated, error: updateError } = await supabase
    .from("quotes")
    .update(updateFields)
    .eq("user_id", user.id)
    .eq("status", "draft")
    .select("id");

  if (updateError) throw updateError;
  if (updated && updated.length > 0) return;

  // No draft existed — insert one
  const insertFields: Record<string, unknown> = {
    user_id: user.id,
    status: "draft",
    products: patch.products ?? [],
    answers: patch.answers ?? {},
    ...(patch.products !== undefined ? totalsOf(patch.products) : {}),
  };

  const { error: insertError } = await supabase
    .from("quotes")
    .insert(insertFields);

  // Possible race: another tab inserted between our update and insert.
  // 23505 = unique violation on quotes_one_draft_per_user_idx — retry the update.
  if (insertError) {
    const code = (insertError as { code?: string }).code;
    if (code === "23505") {
      const { error: retryError } = await supabase
        .from("quotes")
        .update(updateFields)
        .eq("user_id", user.id)
        .eq("status", "draft");
      if (retryError) throw retryError;
      return;
    }
    throw insertError;
  }
}

export async function saveDraftProducts(products: CartProduct[]) {
  await upsertDraft({ products });
}

export async function saveDraftAnswers(answers: Answers) {
  await upsertDraft({ answers });
}

export async function submitQuote(input: {
  products: CartProduct[];
  answers: Answers;
}): Promise<{ id: string }> {
  const { supabase, user } = await requireUser();
  const { total_min, total_max } = totalsOf(input.products);

  // If a draft exists, flip it to submitted with final values.
  const { data: existing, error: lookupError } = await supabase
    .from("quotes")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "draft")
    .maybeSingle();

  if (lookupError) throw lookupError;

  if (existing) {
    const { data, error } = await supabase
      .from("quotes")
      .update({
        status: "submitted",
        products: input.products,
        answers: input.answers,
        total_min,
        total_max,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("id")
      .single();
    if (error) throw error;
    return { id: data.id };
  }

  const { data, error } = await supabase
    .from("quotes")
    .insert({
      user_id: user.id,
      status: "submitted",
      products: input.products,
      answers: input.answers,
      total_min,
      total_max,
      submitted_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id };
}

export async function getUserQuotes(): Promise<SubmittedQuoteSummary[]> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("quotes")
    .select("id, submitted_at, total_min, total_max, products")
    .eq("user_id", user.id)
    .eq("status", "submitted")
    .order("submitted_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    submitted_at: row.submitted_at,
    total_min: row.total_min,
    total_max: row.total_max,
    products: (row.products ?? []) as CartProduct[],
  }));
}

export async function getQuoteById(
  id: string,
): Promise<SubmittedQuoteDetail | null> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("quotes")
    .select("id, submitted_at, total_min, total_max, products, answers, notes")
    .eq("user_id", user.id)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    submitted_at: data.submitted_at,
    total_min: data.total_min,
    total_max: data.total_max,
    products: (data.products ?? []) as CartProduct[],
    answers: (data.answers ?? {}) as Answers,
    notes: (data.notes ?? {}) as ProductNotes,
  };
}

export async function updateQuoteNotes(
  quoteId: string,
  notes: ProductNotes,
): Promise<void> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("quotes")
    .update({ notes })
    .eq("id", quoteId)
    .eq("user_id", user.id);
  if (error) throw error;
}

/**
 * Returns a short-lived signed URL for a path in the quote-uploads bucket.
 * Used by the history detail page to display photos/PDFs that were uploaded
 * during the questions flow. Returns null if the file is gone or the user
 * doesn't have access (RLS).
 */
export async function getSignedUploadUrl(
  path: string,
  ttlSeconds = 60 * 10,
): Promise<string | null> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.storage
    .from("quote-uploads")
    .createSignedUrl(path, ttlSeconds);
  if (error) return null;
  return data?.signedUrl ?? null;
}
