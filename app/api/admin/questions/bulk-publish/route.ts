import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";

const letters = ["A", "B", "C", "D"] as const;
const PAGE_SIZE = 500;
const UPDATE_BATCH_SIZE = 100;

export async function POST() {
  try {
    const user = await getAdminUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in as an administrator." },
        { status: 401 }
      );
    }

    let offset = 0;
    let published = 0;
    let skipped = 0;

    while (true) {
      const { data, error } = await supabase
        .from("questions")
        .select("id, options, correct_option")
        .eq("is_published", false)
        .eq("needs_review", false)
        .order("id", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        console.error("Bulk publish query failed:", error);
        return NextResponse.json(
          { error: "Could not load unpublished questions." },
          { status: 500 }
        );
      }

      const rows = data ?? [];
      if (rows.length === 0) break;

      const eligibleIds: string[] = [];

      for (const question of rows) {
        const options = question.options as Record<string, unknown> | null;
        const validOptions =
          !!options &&
          letters.every(
            (letter) =>
              typeof options[letter] === "string" &&
              (options[letter] as string).trim().length > 0
          );

        const validAnswer = letters.includes(
          question.correct_option as (typeof letters)[number]
        );

        if (validOptions && validAnswer) {
          eligibleIds.push(question.id);
        } else {
          skipped++;
        }
      }

      for (
        let i = 0;
        i < eligibleIds.length;
        i += UPDATE_BATCH_SIZE
      ) {
        const ids = eligibleIds.slice(i, i + UPDATE_BATCH_SIZE);

        const { data: updated, error: updateError } = await supabase
          .from("questions")
          .update({
            is_published: true,
            needs_review: false,
            review_note: null,
          })
          .in("id", ids)
          .eq("is_published", false)
          .eq("needs_review", false)
          .select("id");

        if (updateError) {
          console.error("Bulk publish update failed:", updateError);
          return NextResponse.json(
            {
              error: `Publishing stopped after ${published} questions. Refresh the page and try again.`,
              published,
            },
            { status: 500 }
          );
        }

        published += updated?.length ?? 0;
      }

      if (rows.length < PAGE_SIZE) break;
      offset += rows.length;
    }

    return NextResponse.json({ success: true, published, skipped });
  } catch (error) {
    console.error("Bulk publish API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while publishing questions." },
      { status: 500 }
    );
  }
}
