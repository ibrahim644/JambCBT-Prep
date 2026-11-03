import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { getAdminUser } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const subjectRequirementSchema = z.object({
  programme_id: z.string().uuid(),
  admission_year: z.number().int().min(2020).max(2100),
  utme_subjects: z.array(z.string().trim().min(1)).min(4).max(10),
  olevel_requirements: z.object({
    subjects: z.array(z.string().trim().min(1)).min(1).max(10),
    minimum_credits: z.number().int().min(1).max(9),
  }),
  accepted_sittings: z.number().int().min(1).max(3).default(2),
  additional_requirements: z.string().trim().max(5000).nullable().optional(),
  source_url: z.string().trim().url().nullable().optional(),
}).superRefine((requirements, context) => {
  const normalize = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (
    new Set(requirements.utme_subjects.map(normalize)).size !==
    requirements.utme_subjects.length
  ) {
    context.addIssue({
      code: "custom",
      path: ["utme_subjects"],
      message: "UTME subjects must not be duplicated.",
    });
  }

  if (
    new Set(requirements.olevel_requirements.subjects.map(normalize)).size !==
    requirements.olevel_requirements.subjects.length
  ) {
    context.addIssue({
      code: "custom",
      path: ["olevel_requirements", "subjects"],
      message: "O'Level subjects must not be duplicated.",
    });
  }
});

const cutoffSchema = z.object({
  programme_id: z.string().uuid(),
  admission_year: z.number().int().min(2020).max(2100),
  cutoff_type: z.enum([
    "general",
    "departmental",
    "merit",
    "catchment",
    "other",
  ]),
  score: z.number().int().min(0).max(400),
  category: z.string().trim().max(150).nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  source_url: z.string().trim().url().nullable().optional(),
});

const eligibilitySchema = z.object({
  programme_id: z.string().uuid(),
  admission_year: z.number().int().min(2020).max(2100),
  entry_route: z.enum(["UTME", "Direct Entry", "other"]).default("UTME"),
  screening_method: z.string().trim().max(200).nullable().optional(),
  minimum_age: z.number().int().min(10).max(100).nullable().optional(),
  minimum_utme_score: z.number().int().min(0).max(400).nullable().optional(),
  additional_rules: z.record(z.string(), z.unknown()).default({}),
  notes: z.string().trim().max(5000).nullable().optional(),
  source_url: z.string().trim().url().nullable().optional(),
});

export async function GET() {
  try {
    const admin = await getAdminUser();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [
      programmesResult,
      subjectsResult,
      cutoffsResult,
      eligibilityResult,
    ] = await Promise.all([
      supabase
        .from("admission_programmes")
        .select(
          "id, institution_id, course_name, course_slug, faculty:faculty_or_school, department, is_published, institutions(name, state)"
        )
        .order("course_name"),
      supabase
        .from("admission_subject_requirements")
        .select("*")
        .order("admission_year", { ascending: false }),
      supabase
        .from("admission_cutoff_marks")
        .select("*")
        .order("admission_year", { ascending: false }),
      supabase
        .from("admission_eligibility_rules")
        .select("*")
        .order("admission_year", { ascending: false }),
    ]);

    const error =
      programmesResult.error ||
      subjectsResult.error ||
      cutoffsResult.error ||
      eligibilityResult.error;

    if (error) {
      console.error("Admission requirements fetch failed:", error.message);
      return NextResponse.json(
        { error: "Could not load admission requirements." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      programmes: programmesResult.data ?? [],
      subjectRequirements: subjectsResult.data ?? [],
      cutoffMarks: cutoffsResult.data ?? [],
      eligibilityRules: eligibilityResult.data ?? [],
    });
  } catch (error) {
    console.error("Admission requirements GET failed:", error);
    return NextResponse.json(
      { error: "Could not load admission requirements." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminUser();

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      !("record_type" in body) ||
      typeof body.record_type !== "string"
    ) {
      return NextResponse.json(
        { error: "A valid record_type is required." },
        { status: 400 }
      );
    }

    const record = body as Record<string, unknown>;
    let table:
      | "admission_subject_requirements"
      | "admission_cutoff_marks"
      | "admission_eligibility_rules";
    let payload: Record<string, unknown>;

    if (record.record_type === "subject_requirements") {
      const parsed = subjectRequirementSchema.safeParse(record);

      if (!parsed.success) {
        return NextResponse.json(
          {
            error: "Invalid subject requirement data.",
            details: parsed.error.flatten(),
          },
          { status: 400 }
        );
      }

      table = "admission_subject_requirements";
      payload = {
        ...parsed.data,
        verification_status: "unverified",
        is_published: false,
      };
    } else if (record.record_type === "cutoff_mark") {
      const parsed = cutoffSchema.safeParse(record);

      if (!parsed.success) {
        return NextResponse.json(
          {
            error: "Invalid cutoff mark data.",
            details: parsed.error.flatten(),
          },
          { status: 400 }
        );
      }

      table = "admission_cutoff_marks";
      payload = {
        ...parsed.data,
        verification_status: "unverified",
        is_published: false,
      };
    } else if (record.record_type === "eligibility_rule") {
      const parsed = eligibilitySchema.safeParse(record);

      if (!parsed.success) {
        return NextResponse.json(
          {
            error: "Invalid eligibility rule data.",
            details: parsed.error.flatten(),
          },
          { status: 400 }
        );
      }

      table = "admission_eligibility_rules";
      payload = {
        ...parsed.data,
        verification_status: "unverified",
        is_published: false,
      };
    } else {
      return NextResponse.json(
        {
          error:
            "Unsupported record_type. Use subject_requirements, cutoff_mark, or eligibility_rule.",
        },
        { status: 400 }
      );
    }

    const { data: programme, error: programmeError } = await supabase
      .from("admission_programmes")
      .select("id")
      .eq("id", payload.programme_id as string)
      .maybeSingle();

    if (programmeError || !programme) {
      return NextResponse.json(
        { error: "The selected programme was not found." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from(table)
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      console.error("Admission requirement insert failed:", error.message);
      return NextResponse.json(
        { error: "Could not save the admission requirement." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Admission requirement saved as an unpublished draft.",
        record: data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Admission requirements POST failed:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while saving the requirement." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await getAdminUser();

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
  }

  const validation = z
    .object({
      record_type: z.enum([
        "subject_requirements",
        "cutoff_mark",
        "eligibility_rule",
      ]),
      id: z.string().uuid(),
      verification_status: z.enum(["unverified", "verified", "needs_review"]),
      is_published: z.boolean(),
    })
    .safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid requirement review details." },
      { status: 400 }
    );
  }

  const record = validation.data;
  const table = {
    subject_requirements: "admission_subject_requirements",
    cutoff_mark: "admission_cutoff_marks",
    eligibility_rule: "admission_eligibility_rules",
  }[record.record_type];

  const { data: existing, error: existingError } = await supabase
    .from(table)
    .select("id, programme_id, source_url, last_verified_at")
    .eq("id", record.id)
    .maybeSingle();

  if (existingError) {
    console.error("Admission requirement lookup failed:", existingError.message);
    return NextResponse.json(
      { error: "Could not load the requirement for review." },
      { status: 500 }
    );
  }

  if (!existing) {
    return NextResponse.json(
      { error: "The admission requirement was not found." },
      { status: 404 }
    );
  }

  if (record.is_published) {
    if (record.verification_status !== "verified" || !existing.source_url) {
      return NextResponse.json(
        {
          error:
            "A requirement needs a source URL and verified status before it can be published.",
        },
        { status: 400 }
      );
    }

    const { data: programme, error: programmeError } = await supabase
      .from("admission_programmes")
      .select("is_published, institutions!inner(is_published)")
      .eq("id", existing.programme_id)
      .maybeSingle();

    if (programmeError) {
      console.error("Requirement publication check failed:", programmeError.message);
      return NextResponse.json(
        { error: "Could not verify the programme publication status." },
        { status: 500 }
      );
    }

    const institution = Array.isArray(programme?.institutions)
      ? programme.institutions[0]
      : programme?.institutions;

    if (!programme?.is_published || !institution?.is_published) {
      return NextResponse.json(
        {
          error:
            "Publish the institution and programme before publishing its requirements.",
        },
        { status: 400 }
      );
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from(table)
    .update({
      verification_status: record.verification_status,
      is_published: record.is_published,
      last_verified_at:
        record.is_published && record.verification_status === "verified"
          ? new Date().toISOString()
          : existing.last_verified_at,
    })
    .eq("id", record.id)
    .select("*")
    .single();

  if (updateError) {
    console.error("Admission requirement review update failed:", updateError.message);
    return NextResponse.json(
      { error: "Could not update the requirement review status." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, record: updated });
}
