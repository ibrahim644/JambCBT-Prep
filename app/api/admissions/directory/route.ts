import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [institutionsResult, programmesResult] = await Promise.all([
      supabase
        .from("institutions")
        .select("id, name, state, institution_type, ownership, official_website")
        .eq("is_published", true)
        .order("name"),
      supabase
        .from("admission_programmes")
        .select(
          "id, institution_id, course_name, institutions!inner(is_published)"
        )
        .eq("is_published", true)
        .eq("institutions.is_published", true),
    ]);

    if (institutionsResult.error || programmesResult.error) {
      console.error(
        "Public institution directory lookup failed:",
        institutionsResult.error?.message,
        programmesResult.error?.message
      );
      return NextResponse.json(
        { error: "The institution directory is temporarily unavailable." },
        { status: 500 }
      );
    }

    const institutions = institutionsResult.data ?? [];
    const programmes = programmesResult.data ?? [];
    const programmeIds = programmes.map((programme) => programme.id);

    if (programmeIds.length === 0) {
      return NextResponse.json({
        institutions: institutions.map((institution) => ({
          ...institution,
          cutoff_year: null,
          cutoff_marks: [],
        })),
      });
    }

    const cutoffsResult = await supabase
      .from("admission_cutoff_marks")
      .select("id, programme_id, admission_year, score, source_url")
      .in("programme_id", programmeIds)
      .eq("cutoff_type", "general")
      .eq("verification_status", "verified")
      .eq("is_published", true)
      .not("score", "is", null)
      .order("admission_year", { ascending: false });

    if (cutoffsResult.error) {
      console.error(
        "Public institution cutoff lookup failed:",
        cutoffsResult.error.message
      );
      return NextResponse.json(
        { error: "The institution directory is temporarily unavailable." },
        { status: 500 }
      );
    }

    const programmesById = new Map(
      programmes.map((programme) => [programme.id, programme])
    );
    const latestYearByInstitution = new Map<string, number>();

    for (const cutoff of cutoffsResult.data ?? []) {
      const programme = programmesById.get(cutoff.programme_id);
      if (!programme) continue;

      const currentYear = latestYearByInstitution.get(programme.institution_id);
      if (!currentYear || cutoff.admission_year > currentYear) {
        latestYearByInstitution.set(
          programme.institution_id,
          cutoff.admission_year
        );
      }
    }

    const cutoffsByInstitution = new Map<
      string,
      {
        id: string;
        score: number;
        source_url: string | null;
        course_name: string;
      }[]
    >();

    for (const cutoff of cutoffsResult.data ?? []) {
      const programme = programmesById.get(cutoff.programme_id);
      if (
        !programme ||
        cutoff.admission_year !==
          latestYearByInstitution.get(programme.institution_id)
      ) {
        continue;
      }

      const marks = cutoffsByInstitution.get(programme.institution_id) ?? [];
      marks.push({
        id: cutoff.id,
        score: Number(cutoff.score),
        source_url: cutoff.source_url,
        course_name: programme.course_name,
      });
      cutoffsByInstitution.set(programme.institution_id, marks);
    }

    return NextResponse.json({
      institutions: institutions.map((institution) => ({
        ...institution,
        cutoff_year: latestYearByInstitution.get(institution.id) ?? null,
        cutoff_marks: cutoffsByInstitution.get(institution.id) ?? [],
      })),
    });
  } catch (error) {
    console.error("Public institution directory API failed:", error);
    return NextResponse.json(
      { error: "The institution directory is temporarily unavailable." },
      { status: 500 }
    );
  }
}
