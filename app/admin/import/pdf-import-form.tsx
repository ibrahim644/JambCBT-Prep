"use client";

import { useState, type FormEvent } from "react";

type Subject = {
  id: string;
  code: string;
  name: string;
};

type ImportResult = {
  success?: boolean;
  message?: string;
  error?: string;
  subject?: { code: string; name: string };
  pdf_pages?: number;
  questions_detected?: number;
  parsed_questions?: number;
  questions_imported?: number;
  questions_skipped?: number;
  questions_needing_review?: number;
  published?: boolean;
};

export default function PdfImportForm({ subjects }: { subjects: Subject[] }) {
  const [subjectId, setSubjectId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const selectedSubject = subjects.find((subject) => subject.id === subjectId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);

    if (!selectedSubject) {
      setResult({ error: "Please select a subject." });
      return;
    }

    if (!file) {
      setResult({ error: "Please choose a PDF file." });
      return;
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setResult({ error: "Only PDF files are accepted." });
      return;
    }

    const formData = new FormData();
    formData.append("subject_code", selectedSubject.code);
    formData.append("subject_name", selectedSubject.name);
    formData.append("file", file);

    setBusy(true);

    try {
      const response = await fetch("/api/admin/import-pdf", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as ImportResult;

      if (!response.ok) {
        setResult({ error: data.error ?? "Import failed. Please try again." });
      } else {
        setResult(data);
        if (data.success) setFile(null);
      }
    } catch {
      setResult({
        error: "Could not contact the server. Check your connection and try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-2xl border border-[#E5EBE6] bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EAF5EC] text-xl text-[#286344]">
            ↑
          </div>
          <div>
            <h2 className="text-xl font-bold">Upload question bank</h2>
            <p className="mt-1 text-sm text-[#68796F]">PDF files up to the server's configured limit.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="subject" className="mb-2 block text-sm font-semibold">
              Examination subject
            </label>
            <select
              id="subject"
              value={subjectId}
              onChange={(event) => setSubjectId(event.target.value)}
              required
              disabled={busy}
              className="w-full rounded-xl border border-[#DCE6DE] bg-white px-4 py-3 text-sm outline-none focus:border-[#398052] focus:ring-2 focus:ring-[#398052]/15"
            >
              <option value="">Select a subject</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name} ({subject.code})
                </option>
              ))}
            </select>
            {subjects.length === 0 && (
              <p className="mt-2 text-sm text-amber-700">
                No subjects exist yet. Add a subject on the Subjects page first.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="pdf-file" className="mb-2 block text-sm font-semibold">
              PDF question file
            </label>
            <input
              id="pdf-file"
              type="file"
              accept=".pdf,application/pdf"
              required
              disabled={busy}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="block w-full rounded-xl border border-[#DCE6DE] bg-[#FAFCFA] p-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-[#EAF5EC] file:px-3 file:py-2 file:font-semibold file:text-[#286344]"
            />
            {file && (
              <p className="mt-2 break-all text-xs text-[#68796F]">
                Selected: {file.name} · {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={busy || subjects.length === 0}
            className="w-full rounded-xl bg-[#174B33] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#103B28] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Importing questions…" : "Import PDF"}
          </button>
        </form>

        {result?.error && (
          <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {result.error}
          </div>
        )}

        {result?.success && (
          <div className="mt-6 rounded-xl border border-[#CFE5D3] bg-[#F1F8F2] p-5">
            <h3 className="font-bold text-[#174B33]">Import completed</h3>
            <p className="mt-1 text-sm text-[#52705F]">{result.message}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                ["Detected", result.questions_detected],
                ["Parsed", result.parsed_questions],
                ["Imported", result.questions_imported],
                ["Skipped", result.questions_skipped],
                ["Needs review", result.questions_needing_review],
                ["PDF pages", result.pdf_pages],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-lg border border-[#DCE9DF] bg-white p-3">
                  <p className="text-xs text-[#68796F]">{label}</p>
                  <p className="mt-1 text-xl font-bold text-[#174B33]">
                    {typeof value === "number" ? value.toLocaleString() : "—"}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm font-medium text-[#286344]">
              Questions remain unpublished until reviewed and approved.
            </p>
            <a href="/admin/questions" className="mt-4 inline-flex rounded-lg bg-[#174B33] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#103B28]">
              Review questions →
            </a>
          </div>
        )}
      </section>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-[#E5EBE6] bg-white p-6">
          <h2 className="font-bold">Before you import</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-[#68796F]">
            <li>• Select the subject that matches the PDF.</li>
            <li>• Ensure the document contains readable questions and answer options.</li>
            <li>• Check imported answers and explanations before publishing.</li>
            <li>• Duplicate questions may be skipped by the importer.</li>
          </ul>
        </div>
        <div className="rounded-2xl bg-[#174B33] p-6 text-white">
          <p className="text-sm font-semibold text-[#D5E9DB]">Content quality</p>
          <p className="mt-2 text-lg font-bold">Review before publishing</p>
          <p className="mt-2 text-sm leading-6 text-white/75">
            Importing adds questions to the question bank. It does not automatically make them available in live examinations.
          </p>
        </div>
      </aside>
    </div>
  );
}
