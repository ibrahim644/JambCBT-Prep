
import "server-only";
const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (
  buffer: Buffer
) => Promise<{ text: string; numpages: number }>;
import { createHash } from "node:crypto";

export type ParsedQuestion = {
  question_text: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct_option: "A" | "B" | "C" | "D" | null;
  explanation: string | null;
  source_hash: string;
  needs_review: boolean;
  review_note: string | null;
};

export type PdfImportResult = {
  pages: number;
  questions: ParsedQuestion[];
  questionsDetected: number;
  questionsNeedingReview: number;
};

function normalizeText(value: string): string {
  return value
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .trim();
}

function splitQuestionBlocks(text: string): string[] {
  // Recognizes question numbers at the start of a line, e.g. "1."
  // or "1)" and avoids treating ordinary inline numbers as question starts.
  const matches = [
    ...text.matchAll(/(?:^|\n)\s*(\d{1,4})\s*[.)]\s+/g),
  ];

  if (matches.length === 0) {
    return [];
  }

  const blocks: string[] = [];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const start = match.index ?? 0;
    const contentStart = start + match[0].length;
    const nextStart =
      i + 1 < matches.length
        ? (matches[i + 1].index ?? text.length)
        : text.length;

    const block = text.slice(contentStart, nextStart).trim();

    if (block.length > 0) {
      blocks.push(block);
    }
  }

  return blocks;
}

function parseBlock(
  rawBlock: string
): Omit<ParsedQuestion, "source_hash"> | null {
  const block = normalizeText(rawBlock);

  // Options may appear on separate lines or be separated by spaces.
  const optionPattern =
    /(?:^|\n)\s*([A-D])\s*[.)]\s*([\s\S]*?)(?=(?:\n\s*[A-D]\s*[.)]\s*)|(?:\n\s*(?:correct\s+answer|answer|ans)\s*[:\-])|(?:\n\s*explanation\s*[:\-])|$)/gi;

  const options: Partial<Record<"A" | "B" | "C" | "D", string>> = {};

  for (const match of block.matchAll(optionPattern)) {
    const letter = match[1].toUpperCase() as "A" | "B" | "C" | "D";
    const value = match[2].trim();

    if (value) {
      options[letter] = value;
    }
  }

  // Fallback for PDFs that put options on the same line.
  if (Object.keys(options).length < 4) {
    const inlinePattern =
      /(?:^|\s)([A-D])\s*[.)]\s*([\s\S]*?)(?=(?:\s+[A-D]\s*[.)]\s*)|(?:\s+(?:correct\s+answer|answer|ans)\s*[:\-])|(?:\s+explanation\s*[:\-])|$)/gi;

    for (const match of block.matchAll(inlinePattern)) {
      const letter = match[1].toUpperCase() as "A" | "B" | "C" | "D";
      const value = match[2].trim();

      if (value && !options[letter]) {
        options[letter] = value;
      }
    }
  }

  const answerMatch = block.match(
    /(?:correct\s+answer|answer|ans)\s*[:\-]\s*(?:option\s*)?([A-D])\b/i
  );

  const explanationMatch = block.match(
    /explanation\s*[:\-]\s*([\s\S]*)$/i
  );

  const answer = answerMatch
    ? (answerMatch[1].toUpperCase() as "A" | "B" | "C" | "D")
    : null;

  const questionEndCandidates = [
    block.search(/\n\s*A\s*[.)]\s*/i),
    block.search(/\s+A\s*[.)]\s*/i),
    block.search(/\n\s*(?:correct\s+answer|answer|ans)\s*[:\-]/i),
    block.search(/\n\s*explanation\s*[:\-]/i),
  ].filter((index) => index >= 0);

  const questionEnd =
    questionEndCandidates.length > 0
      ? Math.min(...questionEndCandidates)
      : -1;

  const questionText =
    questionEnd >= 0
      ? block.slice(0, questionEnd).trim()
      : block.trim();

  const allOptionsPresent = ["A", "B", "C", "D"].every(
    (letter) => Boolean(options[letter as "A" | "B" | "C" | "D"])
  );

  // Avoid importing a block with no plausible question or options.
  if (!questionText || Object.keys(options).length < 2) {
    return null;
  }

  const missing = ["A", "B", "C", "D"].filter(
    (letter) => !options[letter as "A" | "B" | "C" | "D"]
  );

  const reviewNotes: string[] = [];

  if (!allOptionsPresent) {
    reviewNotes.push(`Missing options: ${missing.join(", ")}`);
  }

  if (!answer) {
    reviewNotes.push("Answer key not detected");
  }

  const explanation = explanationMatch?.[1]?.trim() || null;

  return {
    question_text: questionText,
    options: {
      A: options.A ?? "",
      B: options.B ?? "",
      C: options.C ?? "",
      D: options.D ?? "",
    },
    correct_option: answer,
    explanation,
    needs_review: reviewNotes.length > 0,
    review_note: reviewNotes.length > 0 ? reviewNotes.join("; ") : null,
  };
}

export async function extractQuestionsFromPdf(
  buffer: Buffer
): Promise<PdfImportResult> {
  const parsedPdf = await pdfParse(buffer);
  const text = normalizeText(parsedPdf.text || "");

  if (text.length < 50) {
    throw new Error(
      "This PDF contains too little selectable text. It may be scanned and require OCR."
    );
  }

  const blocks = splitQuestionBlocks(text);

  if (blocks.length === 0) {
    throw new Error(
      "No numbered questions were detected. Check the PDF format before importing."
    );
  }

  const questions: ParsedQuestion[] = [];

  for (const block of blocks) {
    const parsed = parseBlock(block);

    if (!parsed) {
      continue;
    }

    const stableText = normalizeText(parsed.question_text)
      .toLowerCase()
      .replace(/\s+/g, " ");

    const stableOptions = JSON.stringify(parsed.options);

    const sourceHash = createHash("sha256")
      .update(`${stableText}|${stableOptions}`)
      .digest("hex");

    questions.push({
      ...parsed,
      source_hash: sourceHash,
    });
  }

  if (questions.length === 0) {
    throw new Error(
      "Question numbers were detected, but no usable question blocks were parsed."
    );
  }

  return {
    pages: parsedPdf.numpages,
    questions,
    questionsDetected: blocks.length,
    questionsNeedingReview: questions.filter((q) => q.needs_review).length,
  };
}
