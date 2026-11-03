import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

const applicationSchema = z.object({
  surname: z.string().trim().min(2).max(100),
  firstname: z.string().trim().min(2).max(100),
  lastname: z.string().trim().min(1).max(100),
  nin_number: z.string().trim().regex(/^\d{11}$/),
  age: z.number().int().min(10).max(100),
  state: z.string().trim().min(2).max(100),
  school: z.string().trim().min(2).max(200),
  email: z.email().max(254),
});

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid application details." },
      { status: 400 }
    );
  }

  const validation = applicationSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: "Please check your application details and try again." },
      { status: 400 }
    );
  }

  const application = validation.data;
  const { error } = await supabase.from("scholarship_applications").insert({
    surname: application.surname,
    firstname: application.firstname,
    lastname: application.lastname,
    nin_number: application.nin_number,
    age: application.age,
    state: application.state,
    school: application.school,
    email: application.email.trim().toLowerCase(),
  });

  if (error) {
    console.error("Scholarship application save failed:", error.message);
    return NextResponse.json(
      { error: "We could not save your application. Please try again later." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
