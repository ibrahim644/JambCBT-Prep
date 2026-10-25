import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const candidateName =
      typeof body.candidate_name === "string" ? body.candidate_name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
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

    if (!Number.isInteger(age) || age < 10 || age > 100) {
      return NextResponse.json(
        { error: "Enter a valid age between 10 and 100." },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(selectedSubjectIds) ||
      selectedSubjectIds.length !== 4 ||
      new Set(selectedSubjectIds).size !== 4 ||
      selectedSubjectIds.some((id) => typeof id !== "string")
    ) {
      return NextResponse.json(
        { error: "Select exactly four different subjects, including Use of English." },
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
        { error: "Unable to validate your subject selection. Please try again." },
        { status: 500 }
      );
    }

    if (
      !subjects ||
      subjects.length !== 4 ||
      subjects.some((subject) => !subject.is_active)
    ) {
      return NextResponse.json(
        { error: "One or more selected subjects are unavailable. Please select again." },
        { status: 400 }
      );
    }

    const hasEnglish = subjects.some((subject) => {
      const code = String(subject.code ?? "").trim().toUpperCase();
      const name = String(subject.name ?? "").trim().toLowerCase();

      return code === "ENG" || name.includes("use of english") || name === "english";
    });

    if (!hasEnglish) {
      return NextResponse.json(
        { error: "Use of English is compulsory. Select it plus three other subjects." },
        { status: 400 }
      );
    }

    const rawToken = randomBytes(32).toString("hex");
    const hashedToken = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data: candidate, error: insertError } = await supabase
      .from("candidate_sessions")
      .insert({
        session_token: hashedToken,
        candidate_name: candidateName,
        email,
        age,
        selected_subject_ids: selectedSubjectIds,
        payment_status: "pending",
        session_status: "registration",
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (insertError || !candidate) {
      console.error("Candidate registration failed:", insertError);
      return NextResponse.json(
        { error: "Registration failed. Please try again." },
        { status: 500 }
      );
    }

    const response = NextResponse.json({
      ok: true,
      candidate_id: candidate.id,
      message: "Registration successful.",
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
