
import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import { supabase } from "@/lib/supabase";
import { extractQuestionsFromPdf } from "@/lib/pdf-importer";
import { getAdminUser } from "@/lib/admin-auth";

export const runtime = "nodejs";

const requestSchema = z.object({
  subject_code: z
    .string()
    .trim()
    .min(2)
    .max(20)
    .regex(/^[A-Za-z0-9_-]+$/),
  subject_name: z.string().trim().min(2).max(100),
});

const MAX_PDF_MB = Math.max(
  1,
  Number.parseInt(process.env.MAX_PDF_MB || "15", 10) || 15
);

const MAX_PDF_BYTES = MAX_PDF_MB * 1024 * 1024;

function isAuthorized(request: NextRequest): boolean {
  const expectedToken = process.env.ADMIN_IMPORT_TOKEN;
  const authorization = request.headers.get("authorization");

  if (!expectedToken || !authorization) {
    return false;
  }

  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return false;
  }

  // Hash both strings first so timingSafeEqual receives fixed-length buffers.
  const expectedHash = createHash("sha256")
    .update(expectedToken)
    .digest();

  const suppliedHash = createHash("sha256")
    .update(match[1])
    .digest();

  return timingSafeEqual(expectedHash, suppliedHash);
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function POST(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin && !isAuthorized(request)) {
    return jsonError("Unauthorized. Valid admin credentials are required.", 401);
  }

  // Reject obviously oversized requests before parsing multipart form data.
  const contentLength = Number(request.headers.get("content-length") || "0");

  if (contentLength > MAX_PDF_BYTES + 1024 * 1024) {
    return jsonError(`PDF upload exceeds the ${MAX_PDF_MB} MB limit.`, 413);
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return jsonError("Invalid multipart form data.", 400);
  }

  const validation = requestSchema.safeParse({
    subject_code: formData.get("subject_code"),
    subject_name: formData.get("subject_name"),
  });

  if (!validation.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid subject details.",
        details: validation.error.flatten(),
      },
      { status: 400 }
    );
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return jsonError("Upload a PDF using the form field named 'file'.", 400);
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return jsonError("Only .pdf files are accepted.", 415);
  }

  if (file.size === 0) {
    return jsonError("The uploaded file is empty.", 400);
  }

  if (file.size > MAX_PDF_BYTES) {
    return jsonError(`PDF upload exceeds the ${MAX_PDF_MB} MB limit.`, 413);
  }

  let buffer: Buffer;

  try {
    buffer = Buffer.from(await file.arrayBuffer());
  } catch {
    return jsonError("Could not read the uploaded file.", 400);
  }

  // This is a basic file-signature check, not a complete malware scan.
  if (buffer.length < 5 || buffer.subarray(0, 5).toString() !== "%PDF-") {
    return jsonError("The uploaded file does not have a valid PDF signature.", 415);
  }

  const subjectCode = validation.data.subject_code.toUpperCase();
  const subjectName = validation.data.subject_name;
  const safeFileName = file.name.replace(/[^\w.\- ()]/g, "_").slice(0, 200);

  let importJobId: string | null = null;
  let imported = 0;

  try {
    // Find or create the subject.
    const { data: existingSubject, error: subjectLookupError } =
      await supabase
        .from("subjects")
        .select("id, name")
        .eq("code", subjectCode)
        .maybeSingle();

    if (subjectLookupError) {
      throw new Error(`Subject lookup failed: ${subjectLookupError.message}`);
    }

    let subjectId: string;

    if (existingSubject) {
      subjectId = existingSubject.id;

      // Do not silently rename an existing subject during import.
      if (existingSubject.name.trim().toLowerCase() !== subjectName.toLowerCase()) {
        return NextResponse.json(
          {
            success: false,
            error:
              `Subject code ${subjectCode} already belongs to "${existingSubject.name}". ` +
              "Use the existing subject name or correct the subject code.",
          },
          { status: 409 }
        );
      }
    } else {
      const { data: newSubject, error: createSubjectError } =
        await supabase
          .from("subjects")
          .insert({
            code: subjectCode,
            name: subjectName,
            is_active: true,
          })
          .select("id")
          .single();

      if (createSubjectError || !newSubject) {
        throw new Error(
          `Could not create subject: ${createSubjectError?.message ?? "Unknown error"}`
        );
      }

      subjectId = newSubject.id;
    }

    const { data: job, error: jobError } = await supabase
      .from("import_jobs")
      .insert({
        source_file: safeFileName,
        subject_id: subjectId,
        status: "started",
      })
      .select("id")
      .single();

    if (jobError || !job) {
      throw new Error(
        `Could not create import history: ${jobError?.message ?? "Unknown error"}`
      );
    }

    importJobId = job.id;

    const result = await extractQuestionsFromPdf(buffer);

    // Normalize text consistently for duplicate detection.
    const normalizeQuestionText = (value: string) =>
      value.trim().toLowerCase().replace(/\s+/g, " ");

    // Remove repeated question text inside the same PDF.
    const seen = new Set<string>();
    const uniqueQuestions = result.questions.filter((question) => {
      const key = normalizeQuestionText(question.question_text);

      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Read existing questions in pages instead of sending long question
    // texts in a potentially oversized .in() request URL.
    const existingTexts = new Set<string>();
    const PAGE_SIZE = 500;

    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase
        .from("questions")
        .select("question_text")
        .eq("subject_id", subjectId)
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        throw new Error(`Duplicate check failed: ${error.message}`);
      }

      const rows = data ?? [];

      for (const row of rows) {
        existingTexts.add(normalizeQuestionText(row.question_text));
      }

      if (rows.length < PAGE_SIZE) break;
    }
    const questionsToInsert = uniqueQuestions
      .filter((question) => !existingTexts.has(normalizeQuestionText(question.question_text)))
      .map((question) => ({
        subject_id: subjectId,
        import_job_id: importJobId,
        question_text: question.question_text,
        options: question.options,
        correct_option: question.correct_option,
        explanation: question.explanation,
        source_file: safeFileName,
        source_hash: question.source_hash,
        is_published: false,
        needs_review: question.needs_review,
        review_note: question.review_note,
      }));


    // Insert small batches to reduce request size and avoid transient failures.
    const INSERT_BATCH_SIZE = 10;
    

    for (let i = 0; i < questionsToInsert.length; i += INSERT_BATCH_SIZE) {
      const batch = questionsToInsert.slice(i, i + INSERT_BATCH_SIZE);

      let lastInsertError: string | null = null;
      let inserted = false;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const { error } = await supabase.from("questions").insert(batch);

          if (!error) {
            inserted = true;
            break;
          }

          lastInsertError = error.message;
        } catch (insertError) {
          lastInsertError =
            insertError instanceof Error
              ? insertError.message
              : String(insertError);
        }

        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        }
      }

      if (!inserted) {
        throw new Error(
          `Question insert failed at batch ${Math.floor(i / INSERT_BATCH_SIZE) + 1} after 3 attempts: ${lastInsertError ?? "Unknown insertion error"}`
        );
      }

      imported += batch.length;
    }
    const skipped = result.questionsDetected - imported;
    const needsReview = questionsToInsert.filter(
      (question) => question.needs_review
    ).length;

    const { error: updateJobError } = await supabase
      .from("import_jobs")
      .update({
        status: "completed",
        questions_detected: result.questionsDetected,
        questions_imported: imported,
        questions_skipped: Math.max(0, skipped),
        questions_needing_review: needsReview,
        completed_at: new Date().toISOString(),
      })
      .eq("id", importJobId);

    if (updateJobError) {
      throw new Error(`Could not finalize import history: ${updateJobError.message}`);
    }

    return NextResponse.json({
      success: true,
      message: "PDF import completed. Questions remain unpublished.",
      import_job_id: importJobId,
      subject: {
        code: subjectCode,
        name: subjectName,
      },
      pdf_pages: result.pages,
      questions_detected: result.questionsDetected,
      parsed_questions: result.questions.length,
      questions_imported: imported,
      questions_skipped: Math.max(0, skipped),
      questions_needing_review: needsReview,
      published: false,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown import error";

    console.error("PDF import failed:", {
      importJobId,
      message,
    });

    if (importJobId) {
      const { error: updateError } = await supabase
        .from("import_jobs")
        .update({
          status: "failed",
          error_message: message.slice(0, 1000),
          completed_at: new Date().toISOString(),
        })
        .eq("id", importJobId);

      if (updateError) {
        console.error("Could not update failed import job:", updateError.message);
      }
    }

    return jsonError(
      "The PDF import failed. Check the server terminal and import history for details.",
      500
    );
  }
}





