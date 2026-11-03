import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { getAdminUser } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const institutionSchema = z.object({
  name: z.string().trim().min(2).max(200),
  institution_type: z.enum([
    "university",
    "polytechnic",
    "college_of_education",
    "federal_college_of_education",
    "monotechnic",
    "other",
  ]),
  ownership: z.enum(["federal", "state", "private", "other"]),
  state: z.string().trim().min(2).max(100),
  local_government_area: z.string().trim().max(100).optional().default(""),
  town: z.string().trim().max(150).optional().default(""),
  address: z.string().trim().max(500).optional().default(""),
  official_website: z.union([z.string().trim().url(), z.literal("")]).optional().default(""),
  admissions_url: z.union([z.string().trim().url(), z.literal("")]).optional().default(""),
  jamb_recognition_status: z.enum([
    "unverified",
    "verified",
    "not_verified",
    "discontinued",
  ]).default("unverified"),
  verification_source_url: z.union([
    z.string().trim().url(),
    z.literal(""),
  ]).optional().default(""),
});

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function GET() {
  const admin = await getAdminUser();

  if (!admin) {
    return jsonError("Unauthorized. Please sign in as an administrator.", 401);
  }

  const { data, error } = await supabase
    .from("institutions")
    .select(
      "id, name, slug, institution_type, ownership, state, local_government_area, town, address, official_website, admissions_url, jamb_recognition_status, verification_source_url, last_verified_at, is_published, created_at"
    )
    .order("name", { ascending: true });

  if (error) {
    console.error("Institution listing failed:", error.message);
    return jsonError("Could not load institutions.", 500);
  }

  return NextResponse.json({ success: true, institutions: data ?? [] });
}

export async function POST(request: NextRequest) {
  const admin = await getAdminUser();

  if (!admin) {
    return jsonError("Unauthorized. Please sign in as an administrator.", 401);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON request.", 400);
  }

  const validation = institutionSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Please check the institution details.",
        details: validation.error.flatten(),
      },
      { status: 400 }
    );
  }

  const input = validation.data;
  const slug = slugify(input.name);

  if (
    input.jamb_recognition_status === "verified" &&
    !input.verification_source_url
  ) {
    return jsonError(
      "Add the official source URL before marking JAMB recognition as verified.",
      400
    );
  }

  if (!slug) {
    return jsonError("The institution name cannot be converted into a valid slug.", 400);
  }

  const { data: existing, error: lookupError } = await supabase
    .from("institutions")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (lookupError) {
    console.error("Institution slug lookup failed:", lookupError.message);
    return jsonError("Could not validate the institution name.", 500);
  }

  if (existing) {
    return jsonError(
      "An institution with this name already exists. Check the institution list.",
      409
    );
  }

  const canVerify =
    input.jamb_recognition_status === "verified" &&
    Boolean(input.verification_source_url);

  const record = {
    name: input.name,
    slug,
    institution_type: input.institution_type,
    ownership: input.ownership,
    state: input.state,
    local_government_area: input.local_government_area || null,
    town: input.town || null,
    address: input.address || null,
    official_website: input.official_website || null,
    admissions_url: input.admissions_url || null,
    jamb_recognition_status: input.jamb_recognition_status,
    verification_source_url: input.verification_source_url || null,
    last_verified_at: canVerify ? new Date().toISOString() : null,
    is_published: false,
  };

  const { data, error } = await supabase
    .from("institutions")
    .insert(record)
    .select(
      "id, name, slug, institution_type, ownership, state, local_government_area, town, address, official_website, admissions_url, jamb_recognition_status, verification_source_url, last_verified_at, is_published, created_at"
    )
    .single();

  if (error) {
    console.error("Institution creation failed:", error.message);
    return jsonError("Could not save the institution. Please try again.", 500);
  }

  return NextResponse.json(
    { success: true, institution: data },
    { status: 201 }
  );
}

export async function PATCH(request: NextRequest) {
  const admin = await getAdminUser();

  if (!admin) {
    return jsonError("Unauthorized. Please sign in as an administrator.", 401);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON request.", 400);
  }

  const schema = z.object({
    id: z.string().uuid(),
    is_published: z.boolean(),
  });

  const validation = schema.safeParse(body);

  if (!validation.success) {
    return jsonError("Invalid institution publication details.", 400);
  }

  const { id, is_published } = validation.data;

  if (is_published) {
    const { data: institution, error: institutionError } = await supabase
      .from("institutions")
      .select("jamb_recognition_status, verification_source_url")
      .eq("id", id)
      .maybeSingle();

    if (institutionError) {
      console.error("Institution publication lookup failed:", institutionError.message);
      return jsonError("Could not verify the institution details.", 500);
    }

    if (!institution) {
      return jsonError("Institution not found.", 404);
    }

    if (
      institution.jamb_recognition_status === "verified" &&
      !institution.verification_source_url
    ) {
      return jsonError(
        "Add an official recognition source URL before publishing this institution as JAMB verified.",
        400
      );
    }
  }

  const { data, error } = await supabase
    .from("institutions")
    .update({ is_published })
    .eq("id", id)
    .select(
      "id, name, slug, institution_type, ownership, state, local_government_area, town, address, official_website, admissions_url, jamb_recognition_status, verification_source_url, last_verified_at, is_published, created_at"
    )
    .single();

  if (error) {
    console.error("Institution publication update failed:", error.message);
    return jsonError("Could not update institution publication status.", 500);
  }

  return NextResponse.json({
    success: true,
    institution: data,
    message: is_published
      ? "Institution published successfully."
      : "Institution unpublished successfully.",
  });
}
