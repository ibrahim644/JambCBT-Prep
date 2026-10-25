import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";

const createSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().min(2).max(20).regex(/^[A-Za-z0-9_-]+$/),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2).max(100).optional(),
  code: z.string().trim().min(2).max(20).regex(/^[A-Za-z0-9_-]+$/).optional(),
  is_active: z.boolean().optional(),
}).refine(
  (value) => value.name !== undefined || value.code !== undefined || value.is_active !== undefined,
  { message: "Provide at least one field to update." }
);

export async function POST(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized. Please sign in as an administrator." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid subject details." }, { status: 400 });
  }

  const payload = { name: parsed.data.name, code: parsed.data.code.toUpperCase(), is_active: true };
  const { data, error } = await supabase.from("subjects").insert(payload).select("id, name, code, is_active").single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "A subject with that code may already exist." }, { status: 409 });
    }
    console.error("Create subject failed:", error.message);
    return NextResponse.json({ error: "Could not create subject. Check the database schema and constraints." }, { status: 500 });
  }

  return NextResponse.json({ subject: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized. Please sign in as an administrator." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid update." }, { status: 400 });
  }

  const { id, ...fields } = parsed.data;
  const payload: Record<string, string | boolean> = {};
  if (fields.name !== undefined) payload.name = fields.name;
  if (fields.code !== undefined) payload.code = fields.code.toUpperCase();
  if (fields.is_active !== undefined) payload.is_active = fields.is_active;

  const { data, error } = await supabase
    .from("subjects")
    .update(payload)
    .eq("id", id)
    .select("id, name, code, is_active")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "A subject with that code may already exist." }, { status: 409 });
    }
    console.error("Update subject failed:", error.message);
    return NextResponse.json({ error: "Could not update subject." }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Subject not found." }, { status: 404 });
  }

  return NextResponse.json({ subject: data });
}
