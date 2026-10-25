"use client";

import { useMemo, useState } from "react";

export type SubjectItem = {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  totalQuestions: number;
  publishedQuestions: number;
  reviewQuestions: number;
};

type SubjectForm = { name: string; code: string };

export default function SubjectsManager({ initialSubjects }: { initialSubjects: SubjectItem[] }) {
  const [subjects, setSubjects] = useState(initialSubjects);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [form, setForm] = useState<SubjectForm>({ name: "", code: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const filtered = useMemo(() => subjects.filter((subject) => {
    const matchesSearch = `${subject.name} ${subject.code}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = status === "all" || (status === "active" ? subject.is_active : !subject.is_active);
    return matchesSearch && matchesStatus;
  }), [subjects, search, status]);

  const activeCount = subjects.filter((s) => s.is_active).length;
  const publishedCount = subjects.reduce((sum, s) => sum + s.publishedQuestions, 0);
  const totalCount = subjects.reduce((sum, s) => sum + s.totalQuestions, 0);

  function resetForm() {
    setForm({ name: "", code: "" });
    setEditingId(null);
  }

  async function saveSubject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/subjects", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId
          ? { id: editingId, name: form.name, code: form.code }
          : { name: form.name, code: form.code }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save subject.");

      const saved = result.subject as { id: string; name: string; code: string; is_active: boolean };
      setSubjects((current) => {
        const existing = current.find((s) => s.id === saved.id);
        if (existing) return current.map((s) => s.id === saved.id ? { ...s, ...saved } : s).sort((a, b) => a.name.localeCompare(b.name));
        return [...current, { ...saved, totalQuestions: 0, publishedQuestions: 0, reviewQuestions: 0 }].sort((a, b) => a.name.localeCompare(b.name));
      });
      setMessage(editingId ? "Subject updated successfully." : "Subject added successfully.");
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleSubject(subject: SubjectItem) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/subjects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: subject.id, is_active: !subject.is_active }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update subject status.");
      setSubjects((current) => current.map((s) => s.id === subject.id ? { ...s, is_active: result.subject.is_active } : s));
      setMessage(`${subject.name} is now ${result.subject.is_active ? "active" : "inactive"}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function beginEdit(subject: SubjectItem) {
    setEditingId(subject.id);
    setForm({ name: subject.name, code: subject.code });
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-7">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total subjects" value={subjects.length} note="Subjects in your database" />
        <Stat label="Active subjects" value={activeCount} note="Available for registration" />
        <Stat label="Published questions" value={publishedCount} note="Eligible for examination" />
        <Stat label="All questions" value={totalCount} note="Including questions awaiting review" />
      </div>

      <section className="rounded-2xl border border-[#E2EAE3] bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-5">
          <h2 className="text-lg font-bold">{editingId ? "Edit subject" : "Add a subject"}</h2>
          <p className="mt-1 text-sm text-[#68796F]">Use a unique short code, such as BIO for Biology.</p>
        </div>
        <form onSubmit={saveSubject} className="grid gap-4 md:grid-cols-[1fr_220px_auto_auto] md:items-end">
          <label className="block text-sm font-medium">
            Subject name
            <input required minLength={2} maxLength={100} value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Biology"
              className="mt-2 w-full rounded-xl border border-[#D9E3DB] px-4 py-3 outline-none focus:border-[#347653] focus:ring-2 focus:ring-[#347653]/15" />
          </label>
          <label className="block text-sm font-medium">
            Subject code
            <input required minLength={2} maxLength={20} pattern="[A-Za-z0-9_-]+"
              value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="e.g. BIO"
              className="mt-2 w-full rounded-xl border border-[#D9E3DB] px-4 py-3 uppercase outline-none focus:border-[#347653] focus:ring-2 focus:ring-[#347653]/15" />
          </label>
          <button disabled={busy} className="rounded-xl bg-[#174B33] px-5 py-3 font-semibold text-white hover:bg-[#103A27] disabled:opacity-60">
            {busy ? "Saving..." : editingId ? "Save changes" : "Add subject"}
          </button>
          {editingId && <button type="button" onClick={resetForm} className="rounded-xl border border-[#D9E3DB] px-5 py-3 font-semibold hover:bg-[#F4F7F4]">Cancel</button>}
        </form>
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#E2EAE3] bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[#E8EEE9] p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div>
            <h2 className="text-lg font-bold">All subjects</h2>
            <p className="mt-1 text-sm text-[#68796F]">{filtered.length} of {subjects.length} subjects shown</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or code..."
              aria-label="Search subjects"
              className="rounded-xl border border-[#D9E3DB] px-4 py-2.5 text-sm outline-none focus:border-[#347653]" />
            <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter subject status"
              className="rounded-xl border border-[#D9E3DB] bg-white px-4 py-2.5 text-sm">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-[#F7F9F7] text-xs uppercase tracking-wide text-[#68796F]">
              <tr>
                <th className="px-6 py-4 font-semibold">Subject</th>
                <th className="px-6 py-4 font-semibold">Code</th>
                <th className="px-6 py-4 font-semibold">Published</th>
                <th className="px-6 py-4 font-semibold">Needs review / unpublished</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EEE9]">
              {filtered.map((subject) => (
                <tr key={subject.id} className="hover:bg-[#FAFCFA]">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-[#183B2A]">{subject.name}</p>
                    <p className="mt-1 text-xs text-[#819087]">{subject.totalQuestions} total questions</p>
                  </td>
                  <td className="px-6 py-4"><span className="rounded-lg bg-[#EEF4EF] px-2.5 py-1 font-mono text-xs font-semibold">{subject.code}</span></td>
                  <td className="px-6 py-4 font-semibold">{subject.publishedQuestions}</td>
                  <td className="px-6 py-4">{subject.reviewQuestions}</td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${subject.is_active ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                      {subject.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button disabled={busy} onClick={() => beginEdit(subject)} className="rounded-lg border border-[#D9E3DB] px-3 py-2 text-xs font-semibold hover:bg-[#F4F7F4] disabled:opacity-50">Edit</button>
                      <button disabled={busy} onClick={() => toggleSubject(subject)} className={`rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50 ${subject.is_active ? "border border-amber-200 text-amber-800 hover:bg-amber-50" : "bg-[#174B33] text-white hover:bg-[#103A27]"}`}>
                        {subject.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-[#68796F]">No subjects match your search.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="rounded-2xl border border-[#E2EAE3] bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-[#68796F]">{label}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-[#174B33]">{value.toLocaleString()}</p>
      <p className="mt-1 text-xs text-[#819087]">{note}</p>
    </div>
  );
}
