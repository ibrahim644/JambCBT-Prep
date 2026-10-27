
import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";

type OptionLetter = "A" | "B" | "C" | "D";

type UpdateBody = {
  action?: "save" | "publish";
  question_text?: string;
  options?: Record<OptionLetter, string>;
  correct_option?: OptionLetter | null;
  explanation?: string | null;
  review_note?: string | null;
  passage?: string | null;
  instructions?: string | null;
};

const letters: OptionLetter[] = ["A", "B", "C", "D"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAdminUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in as an administrator." },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id
      )
    ) {
      return NextResponse.json(
        { error: "Invalid question ID." },
        { status: 400 }
      );
    }

    const body = (await request.json()) as UpdateBody;

    if (body.action !== "save" && body.action !== "publish") {
      return NextResponse.json(
        { error: "Invalid action." },
        { status: 400 }
      );
    }

    if (
      typeof body.question_text !== "string" ||
      !body.question_text.trim() ||
      body.question_text.length > 20000
    ) {
      return NextResponse.json(
        { error: "Enter a valid question." },
        { status: 400 }
      );
    }

    if (
      !body.options ||
      !letters.every(
        (letter) => typeof body.options?.[letter] === "string"
      )
    ) {
      return NextResponse.json(
        { error: "All four answer options must be provided." },
        { status: 400 }
      );
    }

    if (
      ![...letters, null].includes(
        body.correct_option as OptionLetter | null
      )
    ) {
      return NextResponse.json(
        { error: "Invalid correct answer." },
        { status: 400 }
      );
    }

    if (
      body.explanation !== undefined &&
      body.explanation !== null &&
      typeof body.explanation !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid explanation." },
        { status: 400 }
      );
    }

    if (
      body.review_note !== undefined &&
      body.review_note !== null &&
      typeof body.review_note !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid review note." },
        { status: 400 }
      );
    }

    if (
      body.passage !== undefined &&
      body.passage !== null &&
      (typeof body.passage !== "string" ||
        body.passage.length > 30000)
    ) {
      return NextResponse.json(
        { error: "Passage must not exceed 30,000 characters." },
        { status: 400 }
      );
    }

    if (
      body.instructions !== undefined &&
      body.instructions !== null &&
      (typeof body.instructions !== "string" ||
        body.instructions.length > 10000)
    ) {
      return NextResponse.json(
        { error: "Instructions must not exceed 10,000 characters." },
        { status: 400 }
      );
    }

    const options = {
      A: body.options.A.trim(),
      B: body.options.B.trim(),
      C: body.options.C.trim(),
      D: body.options.D.trim(),
    };

    if (
      options.A.length > 10000 ||
      options.B.length > 10000 ||
      options.C.length > 10000 ||
      options.D.length > 10000
    ) {
      return NextResponse.json(
        { error: "An answer option is too long." },
        { status: 400 }
      );
    }

    if (body.action === "publish") {
      if (letters.some((letter) => !options[letter])) {
        return NextResponse.json(
          { error: "Fill in all four options before publishing." },
          { status: 400 }
        );
      }

      if (!body.correct_option) {
        return NextResponse.json(
          { error: "Select the correct answer before publishing." },
          { status: 400 }
        );
      }
    }

    const updateData = {
      question_text: body.question_text.trim(),
      options,
      correct_option: body.correct_option ?? null,
      explanation: body.explanation?.trim() || null,
      passage: body.passage?.trim() || null,
      instructions: body.instructions?.trim() || null,
      ...(body.action === "publish"
        ? {
            is_published: true,
            needs_review: false,
            review_note: null,
          }
        : {
            review_note: body.review_note?.trim() || null,
          }),
    };

    const { data, error } = await supabase
      .from("questions")
      .update(updateData)
      .eq("id", id)
      .eq("is_published", false)
      .select(
        "id, question_text, options, correct_option, explanation, passage, instructions, needs_review, review_note, is_published"
      )
      .maybeSingle();

    if (error) {
      console.error("Question update failed:", error);

      return NextResponse.json(
        { error: "Could not update the question." },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Question not found or already published." },
        { status: 404 }
      );
    }

    return NextResponse.json({ question: data });
  } catch (error) {
    console.error("Question review API error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
