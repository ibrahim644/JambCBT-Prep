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
  olevel_requirements: z.record(z.string(), z.unknown()),
  accepted_sittings: z.number().int().min(1).max(3).default(2),
  additional_requirements: z.string().trim().max(5000).nullable().optional(),
  source_url: z.string().trim().url().nullable().optional(),
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
          "id, institution_id, course_name, course_slug, faculty, department, is_published, institutions(name, state)"
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
