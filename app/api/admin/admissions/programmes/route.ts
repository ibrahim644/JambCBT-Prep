import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { getAdminUser } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const programmeSchema = z.object({
  institution_id: z.string().uuid(),
  course_name: z.string().trim().min(2).max(200),
  faculty: z.string().trim().max(200).optional().default(""),
  department: z.string().trim().max(200).optional().default(""),
  award_type: z.string().trim().max(100).optional().default(""),
  study_mode: z.string().trim().max(100).optional().default(""),
  duration_years: z.number().int().min(1).max(15).nullable().optional(),
});

function jsonError(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET() {
  const admin = await getAdminUser();

  if (!admin) {
    return jsonError("Unauthorized. Please sign in as an administrator.", 401);
  }

  const [programmeResult, institutionResult] = await Promise.all([
    supabase
      .from("admission_programmes")
      .select("id, institution_id, course_name, course_slug, faculty, department, award_type, study_mode, duration_years, is_published, created_at")
      .order("course_name", { ascending: true }),
    supabase
      .from("institutions")
      .select("id, name, state, institution_type, is_published")
      .order("name", { ascending: true }),
  ]);

  if (programmeResult.error || institutionResult.error) {
    console.error(
      "Programme listing failed:",
      programmeResult.error?.message,
      institutionResult.error?.message
    );
    return jsonError("Could not load programmes and institutions.", 500);
  }

  return NextResponse.json({
    success: true,
    programmes: programmeResult.data ?? [],
    institutions: institutionResult.data ?? [],
  });
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

  const validation = programmeSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Please check the programme details.",
        details: validation.error.flatten(),
      },
      { status: 400 }
    );
  }

  const input = validation.data;
  const courseSlug = slugify(input.course_name);

  if (!courseSlug) {
    return jsonError("The course name is not valid.", 400);
  }

  const { data: institution, error: institutionError } = await supabase
    .from("institutions")
    .select("id")
    .eq("id", input.institution_id)
    .maybeSingle();

  if (institutionError) {
    console.error("Institution lookup failed:", institutionError.message);
    return jsonError("Could not validate the selected institution.", 500);
  }

  if (!institution) {
    return jsonError("Select an institution that exists in the directory.", 400);
  }

  const { data: duplicate, error: duplicateError } = await supabase
    .from("admission_programmes")
    .select("id")
    .eq("institution_id", input.institution_id)
    .eq("course_slug", courseSlug)
    .maybeSingle();

  if (duplicateError) {
    console.error("Programme duplicate check failed:", duplicateError.message);
    return jsonError("Could not validate the programme name.", 500);
  }

  if (duplicate) {
    return jsonError(
      "This course already exists under the selected institution.",
      409
    );
  }

  const { data, error } = await supabase
    .from("admission_programmes")
    .insert({
      institution_id: input.institution_id,
      course_name: input.course_name,
      course_slug: courseSlug,
      faculty: input.faculty || null,
      department: input.department || null,
      award_type: input.award_type || null,
      study_mode: input.study_mode || null,
      duration_years: input.duration_years ?? null,
      is_published: false,
    })
    .select("id, institution_id, course_name, course_slug, faculty, department, award_type, study_mode, duration_years, is_published, created_at")
    .single();

  if (error) {
    console.error("Programme creation failed:", error.message);
    return jsonError("Could not save the programme. Please try again.", 500);
  }

  return NextResponse.json({ success: true, programme: data }, { status: 201 });
}
