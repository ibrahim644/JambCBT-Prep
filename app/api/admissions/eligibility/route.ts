import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [institutionsResult, programmesResult] = await Promise.all([
      supabase
        .from("institutions")
        .select(
          "id, name, state, institution_type, official_website, admissions_url, jamb_recognition_status, verification_source_url"
        )
        .eq("is_published", true)
        .order("name"),
      supabase
        .from("admission_programmes")
        .select(
          "id, institution_id, course_name, faculty:faculty_or_school, department, award_type, study_mode, duration_years, institutions!inner(id, name, state, institution_type, is_published)"
        )
        .eq("is_published", true)
        .eq("institutions.is_published", true)
        .order("course_name"),
    ]);

    if (institutionsResult.error || programmesResult.error) {
      console.error(
        "Public admissions directory lookup failed:",
        institutionsResult.error?.message,
        programmesResult.error?.message
      );
      return NextResponse.json(
        { error: "Admission information is temporarily unavailable." },
        { status: 500 }
      );
    }

    const programmeIds = (programmesResult.data ?? []).map(
      (programme) => programme.id
    );

    if (programmeIds.length === 0) {
      return NextResponse.json({
        institutions: institutionsResult.data ?? [],
        programmes: [],
        subjectRequirements: [],
        cutoffMarks: [],
        eligibilityRules: [],
      });
    }

    const [subjectsResult, cutoffsResult, eligibilityResult] =
      await Promise.all([
        supabase
          .from("admission_subject_requirements")
          .select(
            "id, programme_id, admission_year, utme_subjects, olevel_requirements, accepted_sittings, additional_requirements, source_url"
          )
          .in("programme_id", programmeIds)
          .eq("verification_status", "verified")
          .eq("is_published", true)
          .not("score", "is", null)
          .order("admission_year", { ascending: false }),
        supabase
          .from("admission_cutoff_marks")
          .select(
            "id, programme_id, admission_year, cutoff_type, score, category, notes, source_url"
          )
          .in("programme_id", programmeIds)
          .eq("verification_status", "verified")
          .eq("is_published", true)
          .order("admission_year", { ascending: false }),
        supabase
          .from("admission_eligibility_rules")
          .select("admission_year")
          .in("programme_id", programmeIds)
          .eq("verification_status", "verified")
          .eq("is_published", true)
          .order("admission_year", { ascending: false }),
      ]);

    const error =
      subjectsResult.error || cutoffsResult.error || eligibilityResult.error;

    if (error) {
      console.error("Public admissions lookup failed:", error.message);
      return NextResponse.json(
        { error: "Admission information is temporarily unavailable." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      institutions: institutionsResult.data ?? [],
      programmes: programmesResult.data ?? [],
      subjectRequirements: subjectsResult.data ?? [],
      cutoffMarks: cutoffsResult.data ?? [],
      eligibilityRules: eligibilityResult.data ?? [],
    });
  } catch (error) {
    console.error("Public admissions API failed:", error);
    return NextResponse.json(
      { error: "Admission information is temporarily unavailable." },
      { status: 500 }
    );
  }
}
