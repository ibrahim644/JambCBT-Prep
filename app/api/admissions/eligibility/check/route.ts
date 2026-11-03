
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  programme_id: z.string().uuid(),
  admission_year: z.number().int().min(2020).max(2100),
  utme_score: z.number().int().min(0).max(400),
  utme_subjects: z.array(z.string().trim().min(1)).length(4),
  olevel_sittings: z.number().int().min(1).max(3),
  olevel_subjects: z
    .array(
      z.object({
        subject: z.string().trim().min(1),
        grade: z.enum(["A1", "B2", "B3", "C4", "C5", "C6", "D7", "E8", "F9"]),
      })
    )
    .min(1)
    .max(30),
});

const normalize = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

const creditGrades = new Set(["A1", "B2", "B3", "C4", "C5", "C6"]);

const additionalScienceSubjects = new Set([
  "biology",
  "chemistry",
  "agriculturalscience",
  "geography",
  "furthermathematics",
  "healthscience",
  "technicaldrawing",
  "foodandnutrition",
  "animalhusbandry",
]);

function hasSubject(subjects: string[], acceptedNames: string[]) {
  const normalized = new Set(subjects.map(normalize));
  return acceptedNames.some((name) => normalized.has(normalize(name)));
}

function hasCredit(
  results: { subject: string; grade: string }[],
  acceptedNames: string[]
) {
  return results.some(
    (result) =>
      acceptedNames.some(
        (name) => normalize(name) === normalize(result.subject)
      ) && creditGrades.has(result.grade.trim().toUpperCase())
  );
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Please provide valid admission assessment details.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const candidate = parsed.data;
    if (
      !candidate.utme_subjects.some((subject) =>
        ["useofenglish", "englishlanguage"].includes(normalize(subject))
      )
    ) {
      return NextResponse.json(
        { error: "Use of English must be one of your four UTME subjects." },
        { status: 400 }
      );
    }

    // Reject duplicate subjects, even if the form is bypassed.
    const utmeSubjects = candidate.utme_subjects.map(normalize);
    const olevelSubjects = candidate.olevel_subjects.map((item) =>
      normalize(item.subject)
    );

    if (new Set(utmeSubjects).size !== utmeSubjects.length) {
      return NextResponse.json(
        { error: "Each UTME subject must be selected only once." },
        { status: 400 }
      );
    }

    if (new Set(olevelSubjects).size !== olevelSubjects.length) {
      return NextResponse.json(
        { error: "Each O'Level subject must be entered only once." },
        { status: 400 }
      );
    }

    const { data: programme, error: programmeError } = await supabase
      .from("admission_programmes")
      .select(
        "id, course_name, institution_id, institutions!inner(name, state, is_published)"
      )
      .eq("id", candidate.programme_id)
      .eq("is_published", true)
      .eq("institutions.is_published", true)
      .maybeSingle();

    if (programmeError) throw programmeError;

    if (!programme) {
      return NextResponse.json(
        { error: "This programme is not currently available for assessment." },
        { status: 404 }
      );
    }

    const { data: requirement, error: requirementError } = await supabase
      .from("admission_subject_requirements")
      .select("*")
      .eq("programme_id", candidate.programme_id)
      .eq("admission_year", candidate.admission_year)
      .eq("verification_status", "verified")
      .eq("is_published", true)
      .maybeSingle();

    if (requirementError) throw requirementError;

    const { data: rule, error: ruleError } = await supabase
      .from("admission_eligibility_rules")
      .select("*")
      .eq("programme_id", candidate.programme_id)
      .eq("admission_year", candidate.admission_year)
      .eq("entry_route", "UTME")
      .eq("verification_status", "verified")
      .eq("is_published", true)
      .maybeSingle();

    if (ruleError) throw ruleError;

    const { data: cutoffMarks, error: cutoffError } = await supabase
      .from("admission_cutoff_marks")
      .select("cutoff_type, score, category, notes, source_url")
      .eq("programme_id", candidate.programme_id)
      .eq("admission_year", candidate.admission_year)
      .eq("verification_status", "verified")
      .eq("is_published", true)
      .not("score", "is", null)
      .order("score", { ascending: false });

    if (cutoffError) throw cutoffError;

    const cutoffComparisons = (cutoffMarks ?? []).map((cutoff) => ({
      ...cutoff,
      meets_score: candidate.utme_score >= Number(cutoff.score),
    }));

    // Draft or unverified cutoff marks are never used.
    // Even verified departmental/merit cutoffs are not assumed to be
    // universal minimum UTME scores.
    if (!requirement) {
      return NextResponse.json({
        status: "unable_to_determine",
        programme: programme.course_name,
        institution: programme.institutions,
        admission_year: candidate.admission_year,
        utme_score: candidate.utme_score,
        cutoff_comparisons: cutoffComparisons,
        message:
          "Verified and published subject requirements are not available for this programme and admission year.",
        checks: [],
        disclaimer:
          "This checker does not use unverified draft requirements.",
      });
    }

    const checks: {
      name: string;
      passed: boolean | null;
      detail: string;
    }[] = [];

    const requiredUtme: string[] = Array.isArray(requirement.utme_subjects)
      ? requirement.utme_subjects.filter(
          (item: unknown): item is string => typeof item === "string"
        )
      : [];

    let criteriaComplete = true;
    if (requiredUtme.length === 0) {
      criteriaComplete = false;
      checks.push({
        name: "UTME subjects",
        passed: null,
        detail: "No usable UTME subject combination is published for this programme.",
      });
    }

    for (const required of requiredUtme) {
      const optionMatch = required.match(
        /^(?:one additional subject:|one of:)\s*(.+)$/i
      );

      if (optionMatch) {
        const options = optionMatch[1]
          .split(/,|\bor\b/i)
          .map((item) => item.trim())
          .filter(Boolean);

        const passed = hasSubject(candidate.utme_subjects, options);

        checks.push({
          name: "UTME optional subject",
          passed,
          detail: passed
            ? "An accepted optional subject was selected."
            : `Select one accepted subject: ${options.join(", ")}.`,
        });
      } else {
        const passed = hasSubject(candidate.utme_subjects, [required]);

        checks.push({
          name: `UTME: ${required}`,
          passed,
          detail: passed
            ? `${required} is included.`
            : `${required} is required.`,
        });
      }
    }

    const olevel = requirement.olevel_requirements as {
      subjects?: unknown;
      minimum_credits?: unknown;
    };

    const olevelRequirements: string[] = Array.isArray(olevel?.subjects)
      ? olevel.subjects.filter(
          (item: unknown): item is string => typeof item === "string"
        )
      : [];

    const results = candidate.olevel_subjects;
    const minimumCredits =
      typeof olevel?.minimum_credits === "number" &&
      Number.isInteger(olevel.minimum_credits) &&
      olevel.minimum_credits >= 1 &&
      olevel.minimum_credits <= 9
        ? olevel.minimum_credits
        : null;

    const creditCount = results.filter((item) =>
      creditGrades.has(item.grade.trim().toUpperCase())
    ).length;

    checks.push({
      name: "O'Level minimum credits",
      passed:
        minimumCredits === null ? null : creditCount >= minimumCredits,
      detail:
        minimumCredits === null
          ? "The published minimum number of credits is missing or invalid; this requirement cannot be assessed."
          : `${creditCount} credit-level results entered; ${minimumCredits} required.`,
    });
    if (minimumCredits === null) criteriaComplete = false;

    if (olevelRequirements.length === 0) {
      criteriaComplete = false;
      checks.push({
        name: "O'Level subjects",
        passed: null,
        detail: "No usable O'Level subject requirements are published for this programme.",
      });
    }

    for (const subject of olevelRequirements) {
      const normalized = normalize(subject);

      if (
        normalized.includes("twootherscience") ||
        normalized.includes("otherrelevantscience")
      ) {
        // Count distinct science credits excluding the three specifically
        // required subjects: English, Mathematics and Physics.
        const excluded = new Set([
          "englishlanguage",
          "useofenglish",
          "mathematics",
          "maths",
          "physics",
        ]);

        const scienceCredits = new Set(
          results
            .filter(
              (item) =>
                creditGrades.has(item.grade.trim().toUpperCase()) &&
                additionalScienceSubjects.has(normalize(item.subject)) &&
                !excluded.has(normalize(item.subject))
            )
            .map((item) => normalize(item.subject))
        );

        const passed = scienceCredits.size >= 2;

        checks.push({
          name: "Additional science credits",
          passed,
          detail: passed
            ? "At least two distinct additional science-subject credits were entered."
            : "At least two distinct additional science-subject credits, beyond English, Mathematics and Physics, are required.",
        });

        continue;
      }

      const aliases =
        normalized === "englishlanguage"
          ? ["English Language", "Use of English"]
          : normalized === "mathematics"
            ? ["Mathematics", "Maths"]
            : [subject];

      const passed = hasCredit(results, aliases);

      checks.push({
        name: `O'Level: ${subject}`,
        passed,
        detail: passed
          ? `A credit in ${subject} was entered.`
          : `A credit in ${subject} is required.`,
      });
    }

    // The database column is text, so convert it safely to a number.
    const storedSittings = Number(requirement.accepted_sittings);
    const maxSittings =
      Number.isInteger(storedSittings) &&
      storedSittings >= 1 &&
      storedSittings <= 3
        ? storedSittings
        : null;

    checks.push({
      name: "O'Level sittings",
      passed:
        maxSittings === null
          ? null
          : candidate.olevel_sittings <= maxSittings,
      detail:
        maxSittings === null
          ? "The accepted number of O'Level sittings is missing or invalid; this requirement cannot be assessed."
          : `You entered ${candidate.olevel_sittings} sitting(s); the published maximum is ${maxSittings}.`,
    });
    if (maxSittings === null) criteriaComplete = false;

    // Only a verified, published eligibility rule may supply a universal
    // minimum UTME score for the final status.
    const minimumScore = Number(rule?.minimum_utme_score);
    const minimumScoreRuleAvailable =
      rule?.minimum_utme_score != null &&
      Number.isInteger(minimumScore) &&
      minimumScore >= 0 &&
      minimumScore <= 400;
    const generalCutoff = (cutoffMarks ?? []).find(
      (cutoff) =>
        cutoff.cutoff_type === "general" &&
        (cutoff.category === null || cutoff.category === "")
    );

    if (minimumScoreRuleAvailable) {
      checks.push({
        name: "Minimum UTME score",
        passed: candidate.utme_score >= minimumScore,
        detail: `Your score is ${candidate.utme_score}; the published minimum is ${minimumScore}.`,
      });
    } else if (generalCutoff) {
      checks.push({
        name: "General UTME cut-off",
        passed: candidate.utme_score >= Number(generalCutoff.score),
        detail: `Your score is ${candidate.utme_score}; the published general cut-off is ${generalCutoff.score}.`,
      });
    }

    const scoreRuleAvailable =
      minimumScoreRuleAvailable || Boolean(generalCutoff);

    if (rule?.minimum_age != null) {
      criteriaComplete = false;
      checks.push({
        name: "Minimum age",
        passed: null,
        detail:
          "This programme has a minimum-age rule. Confirm your age against the institution's stated reference date.",
      });
    }

    const additionalRules = rule?.additional_rules;
    if (
      additionalRules &&
      typeof additionalRules === "object" &&
      Object.keys(additionalRules).length > 0
    ) {
      criteriaComplete = false;
      checks.push({
        name: "Additional eligibility rules",
        passed: null,
        detail:
          "This programme has additional rules that must be checked with the institution.",
      });
    }

    const hasFailedChecks = checks.some((check) => check.passed === false);

    const status =
      hasFailedChecks
        ? "not_eligible"
        : scoreRuleAvailable && criteriaComplete
          ? "eligible"
          : "unable_to_determine";

    return NextResponse.json({
      status,
      programme: programme.course_name,
      institution: programme.institutions,
      admission_year: candidate.admission_year,
      utme_score: candidate.utme_score,
      cutoff_comparisons: cutoffComparisons,
      checks,
      message:
        status === "eligible"
          ? "Your details meet the verified requirements currently available. This is not an admission offer."
          : status === "not_eligible"
            ? "One or more checked requirements were not met. Review the failed checks below."
            : "Your entered details pass the available subject checks, but a verified minimum UTME score is unavailable. Full eligibility cannot yet be confirmed.",
      disclaimer:
        "This is a preliminary screening tool, not an admission decision. Confirm requirements with the institution and JAMB.",
    });
  } catch (error) {
    console.error("Eligibility assessment failed:", error);

    return NextResponse.json(
      { error: "Could not complete the eligibility assessment." },
      { status: 500 }
    );
  }
}
