
import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const candidateName =
      typeof body.candidate_name === "string"
        ? body.candidate_name.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const phone =
      typeof body.phone === "string" ? body.phone.trim() : "";

    const state =
      typeof body.state === "string" ? body.state.trim() : "";

    const age = Number(body.age);
    const selectedSubjectIds = body.selected_subject_ids;

    if (candidateName.length < 2 || candidateName.length > 100) {
      return NextResponse.json(
        { error: "Enter a name between 2 and 100 characters." },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 }
      );
    }

    if (!/^[+()\d\s-]{7,20}$/.test(phone)) {
      return NextResponse.json(
        { error: "Enter a valid phone number." },
        { status: 400 }
      );
    }

    if (!state || state.length > 100) {
      return NextResponse.json(
        { error: "Select your state." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(age) || age < 10 || age > 100) {
      return NextResponse.json(
        { error: "Enter a valid age between 10 and 100." },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(selectedSubjectIds) ||
      ![1, 4].includes(selectedSubjectIds.length) ||
      new Set(selectedSubjectIds).size !== selectedSubjectIds.length ||
      selectedSubjectIds.some((id: unknown) => typeof id !== "string")
    ) {
      return NextResponse.json(
        {
          error:
            "Choose English only for free practice, or four subjects for the full CBT.",
        },
        { status: 400 }
      );
    }

    const { data: subjects, error: subjectsError } = await supabase
      .from("subjects")
      .select("id, code, name, is_active")
      .in("id", selectedSubjectIds);

    if (subjectsError) {
      console.error("Registration subject lookup failed:", subjectsError);
      return NextResponse.json(
        { error: "Unable to validate your subjects. Please try again." },
        { status: 500 }
      );
    }

    if (
      !subjects ||
      subjects.length !== selectedSubjectIds.length ||
      subjects.some((subject) => !subject.is_active)
    ) {
      return NextResponse.json(
        { error: "One or more selected subjects are unavailable." },
        { status: 400 }
      );
    }

    const isEnglish = (subject: (typeof subjects)[number]) => {
      const code = String(subject.code ?? "").trim().toUpperCase();
      const name = String(subject.name ?? "").trim().toLowerCase();

      return (
        code === "ENG" ||
        name.includes("use of english") ||
        name === "english"
      );
    };

    const englishSubjects = subjects.filter(isEnglish);
    const isFree = selectedSubjectIds.length === 1;

    if (englishSubjects.length !== 1) {
      return NextResponse.json(
        { error: "Use of English must be included exactly once." },
        { status: 400 }
      );
    }

    if (isFree && !isEnglish(subjects[0])) {
      return NextResponse.json(
        { error: "Free practice is available for English only." },
        { status: 400 }
      );
    }

    // Find the permanent candidate profile by normalized email.
    const { data: existingCandidate, error: lookupError } = await supabase
      .from("candidates")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (lookupError) {
      console.error("Candidate profile lookup failed:", lookupError);
      return NextResponse.json(
        { error: "Unable to prepare your candidate profile. Please try again." },
        { status: 500 }
      );
    }

    let permanentCandidateId: string;

    if (existingCandidate) {
      // Update the existing permanent profile.
      const { data: updatedCandidate, error: updateError } = await supabase
        .from("candidates")
        .update({
          full_name: candidateName,
          email,
          phone,
          state,
          age,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingCandidate.id)
        .select("id")
        .single();

      if (updateError || !updatedCandidate) {
        console.error("Candidate profile update failed:", updateError);
        return NextResponse.json(
          { error: "Unable to update your candidate profile." },
          { status: 500 }
        );
      }

      permanentCandidateId = updatedCandidate.id;
    } else {
      // Create a permanent profile for a new candidate.
      const { data: newCandidate, error: createError } = await supabase
        .from("candidates")
        .insert({
          full_name: candidateName,
          email,
          phone,
          state,
          age,
        })
        .select("id")
        .single();

      if (createError || !newCandidate) {
        // Another registration may have created the same email concurrently.
        // If so, reuse that profile instead of creating a duplicate.
        const { data: concurrentCandidate, error: retryLookupError } =
          await supabase
            .from("candidates")
            .select("id")
            .eq("email", email)
            .maybeSingle();

        if (retryLookupError || !concurrentCandidate) {
          console.error("Candidate profile creation failed:", createError);
          return NextResponse.json(
            { error: "Unable to create your candidate profile. Please try again." },
            { status: 500 }
          );
        }

        const { data: updatedCandidate, error: retryUpdateError } =
          await supabase
            .from("candidates")
            .update({
              full_name: candidateName,
              phone,
              state,
              age,
              updated_at: new Date().toISOString(),
            })
            .eq("id", concurrentCandidate.id)
            .select("id")
            .single();

        if (retryUpdateError || !updatedCandidate) {
          console.error(
            "Concurrent candidate profile update failed:",
            retryUpdateError
          );
          return NextResponse.json(
            { error: "Unable to update your candidate profile." },
            { status: 500 }
          );
        }

        permanentCandidateId = updatedCandidate.id;
      } else {
        permanentCandidateId = newCandidate.id;
      }
    }

    // Create a fresh, temporary exam session linked to the permanent profile.
    const rawToken = randomBytes(32).toString("hex");
    const hashedToken = createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const expiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: candidateSession, error: sessionError } = await supabase
      .from("candidate_sessions")
      .insert({
        candidate_id: permanentCandidateId,
        session_token: hashedToken,
        candidate_name: candidateName,
        email,
        phone,
        state,
        age,
        selected_subject_ids: selectedSubjectIds,
        access_type: isFree ? "free" : "paid",
        payment_status: isFree ? "not_required" : "pending",
        session_status: isFree ? "ready" : "registration",
        paid_attempts_allowed: 0,
        paid_attempts_used: 0,
        free_attempts_used: 0,
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (sessionError || !candidateSession) {
      console.error("Candidate session creation failed:", sessionError);
      return NextResponse.json(
        { error: "Registration failed. Please try again." },
        { status: 500 }
      );
    }

    const response = NextResponse.json({
      ok: true,
      candidate_id: permanentCandidateId,
      candidate_session_id: candidateSession.id,
      access_type: isFree ? "free" : "paid",
      payment_required: !isFree,
      message: isFree
        ? "Free English registration successful."
        : "Registration successful. Payment is required.",
    });

    response.cookies.set("candidate_session", rawToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Candidate registration error:", error);

    return NextResponse.json(
      { error: "An unexpected registration error occurred." },
      { status: 500 }
    );
  }
}
