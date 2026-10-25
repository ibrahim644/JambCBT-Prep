"use client";

import { useMemo, useState } from "react";

export type InstitutionItem = {
  id: string;
  name: string;
  slug: string;
  institution_type: string;
  ownership: string;
  state: string;
  local_government_area: string | null;
  town: string | null;
  official_website: string | null;
  admissions_url: string | null;
  jamb_recognition_status: string;
  verification_source_url: string | null;
  is_published: boolean;
  created_at: string;
};

type InstitutionForm = {
  name: string;
  institution_type: string;
  ownership: string;
  state: string;
  local_government_area: string;
  town: string;
  address: string;
  official_website: string;
  admissions_url: string;
  jamb_recognition_status: string;
  verification_source_url: string;
};

const emptyForm: InstitutionForm = {
  name: "",
  institution_type: "university",
  ownership: "federal",
  state: "",
  local_government_area: "",
  town: "",
  address: "",
  official_website: "",
  admissions_url: "",
  jamb_recognition_status: "unverified",
  verification_source_url: "",
};

const types: Record<string, string> = {
  university: "University",
  polytechnic: "Polytechnic",
  college_of_education: "College of Education",
  federal_college_of_education: "Federal College of Education",
  monotechnic: "Monotechnic",
  other: "Other tertiary institution",
};

const ownerships: Record<string, string> = {
  federal: "Federal",
  state: "State",
  private: "Private",
  other: "Other",
};

const recognition: Record<string, string> = {
  unverified: "Unverified",
  verified: "Verified",
  not_verified: "Not verified",
  discontinued: "Discontinued",
};

const field =
  "mt-2 w-full rounded-xl border border-[#D9E3DB] bg-white px-4 py-3 text-sm outline-none focus:border-[#347653] focus:ring-2 focus:ring-[#347653]/15";

export default function InstitutionManager({
  initialInstitutions,
}: {
  initialInstitutions: InstitutionItem[];
}) {
  const [institutions, setInstitutions] = useState(initialInstitutions);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return institutions.filter((item) => {
      const matchesSearch = [item.name, item.state, item.local_government_area ?? "", item.town ?? ""]
        .join(" ").toLowerCase().includes(q);
      const matchesType = typeFilter === "all" || item.institution_type === typeFilter;
      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "published" ? item.is_published : !item.is_published);
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [institutions, search, typeFilter, statusFilter]);

  async function saveInstitution(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/admissions/institutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save institution.");

      setInstitutions((current) =>
        [...current, result.institution as InstitutionItem].sort((a, b) => a.name.localeCompare(b.name))
      );
      setForm(emptyForm);
      setMessage("Institution added successfully as an unpublished draft.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const published = institutions.filter((item) => item.is_published).length;
  const verified = institutions.filter((item) => item.jamb_recognition_status === "verified").length;

  return (
    <div className="space-y-7">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total institutions", institutions.length, "Records in the directory"],
          ["Published", published, "Visible to public visitors"],
          ["JAMB verified", verified, "Marked as verified"],
          ["Drafts", institutions.length - published, "Awaiting publication"],
        ].map(([label, value, note]) => (
          <div key={String(label)} className="rounded-2xl border border-[#E2EAE3] bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-[#68796F]">{label}</p>
            <p className="mt-3 text-3xl font-extrabold">{value}</p>
            <p className="mt-1 text-xs text-[#819087]">{note}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-[#E2EAE3] bg-white p-5 shadow-sm sm:p-7">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#568269]">New directory record</p>
        <h2 className="mt-2 text-xl font-extrabold">Add an institution</h2>
        <p className="mt-1 text-sm leading-6 text-[#68796F]">
          New records remain unpublished until publication controls are implemented.
        </p>

        <form onSubmit={saveInstitution} className="mt-6 space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="block text-sm font-semibold">Institution name *
              <input required minLength={2} maxLength={200} className={field} placeholder="e.g. Ahmadu Bello University"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>

            <label className="block text-sm font-semibold">Institution type *
              <select required className={field} value={form.institution_type}
                onChange={(e) => setForm({ ...form, institution_type: e.target.value })}>
                {Object.entries(types).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>

            <label className="block text-sm font-semibold">Ownership *
              <select required className={field} value={form.ownership}
                onChange={(e) => setForm({ ...form, ownership: e.target.value })}>
                {Object.entries(ownerships).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>

            <label className="block text-sm font-semibold">State *
              <input required minLength={2} maxLength={100} className={field} placeholder="e.g. Kaduna"
                value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </label>

            <label className="block text-sm font-semibold">Local Government Area
              <input maxLength={100} className={field} placeholder="e.g. Sabon Gari"
                value={form.local_government_area} onChange={(e) => setForm({ ...form, local_government_area: e.target.value })} />
            </label>

            <label className="block text-sm font-semibold">Town or city
              <input maxLength={150} className={field} placeholder="e.g. Zaria"
                value={form.town} onChange={(e) => setForm({ ...form, town: e.target.value })} />
            </label>

            <label className="block text-sm font-semibold">Official website
              <input type="url" className={field} placeholder="https://example.edu.ng"
                value={form.official_website} onChange={(e) => setForm({ ...form, official_website: e.target.value })} />
            </label>

            <label className="block text-sm font-semibold">Admissions website
              <input type="url" className={field} placeholder="https://example.edu.ng/admissions"
                value={form.admissions_url} onChange={(e) => setForm({ ...form, admissions_url: e.target.value })} />
            </label>

            <label className="block text-sm font-semibold">JAMB recognition status *
              <select required className={field} value={form.jamb_recognition_status}
                onChange={(e) => setForm({ ...form, jamb_recognition_status: e.target.value })}>
                {Object.entries(recognition).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>

            <label className="block text-sm font-semibold md:col-span-2 xl:col-span-3">Verification source URL
              <input type="url" className={field} placeholder="Official source used for verification"
                value={form.verification_source_url}
                onChange={(e) => setForm({ ...form, verification_source_url: e.target.value })} />
            </label>

            <label className="block text-sm font-semibold md:col-span-2 xl:col-span-3">Full address
              <textarea rows={2} maxLength={500} className={field} placeholder="Street, campus or postal address"
                value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </label>
          </div>

          <div className="flex flex-col gap-3 border-t border-[#E8EEE9] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-xs leading-5 text-[#68796F]">
              Verify details and sources before making records publicly available.
            </p>
            <button type="submit" disabled={busy}
              className="rounded-xl bg-[#174B33] px-6 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-[#103A27] disabled:opacity-60">
              {busy ? "Saving institution..." : "+ Add institution"}
            </button>
          </div>
        </form>

        {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#E2EAE3] bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[#E8EEE9] p-5 sm:p-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-xl font-extrabold">Institution directory</h2>
            <p className="mt-1 text-sm text-[#68796F]">{filtered.length} of {institutions.length} institutions</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <input aria-label="Search institutions" className={`${field} mt-0 sm:min-w-[220px]`}
              placeholder="Search name, state or LGA..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select aria-label="Filter by institution type" className={`${field} mt-0`}
              value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All institution types</option>
              {Object.entries(types).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select aria-label="Filter by publication status" className={`${field} mt-0`}
              value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All statuses</option><option value="published">Published</option><option value="draft">Drafts</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF4EF] text-2xl">🏫</div>
            <h3 className="mt-4 font-bold">No institutions found</h3>
            <p className="mt-2 text-sm text-[#68796F]">
              {institutions.length === 0 ? "Add your first institution using the form above." : "Try another search term or filter."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="bg-[#F7F9F7] text-xs uppercase tracking-wide text-[#68796F]">
                <tr>
                  <th className="px-5 py-4">Institution</th><th className="px-5 py-4">Type</th>
                  <th className="px-5 py-4">Ownership</th><th className="px-5 py-4">Location</th>
                  <th className="px-5 py-4">JAMB status</th><th className="px-5 py-4">Publication</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8EEE9]">
                {filtered.map((item) => (
                  <tr key={item.id} className="align-top hover:bg-[#FAFCFA]">
                    <td className="px-5 py-4">
                      <p className="font-bold text-[#183B2A]">{item.name}</p>
                      <p className="mt-1 text-xs text-[#819087]">/{item.slug}</p>
                      {item.official_website && <a href={item.official_website} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-[#347653] hover:underline">Official website ↗</a>}
                    </td>
                    <td className="px-5 py-4">{types[item.institution_type] ?? item.institution_type}</td>
                    <td className="px-5 py-4">{ownerships[item.ownership] ?? item.ownership}</td>
                    <td className="px-5 py-4">{item.town || item.local_government_area || "—"}<p className="mt-1 text-xs text-[#819087]">{item.state}</p></td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.jamb_recognition_status === "verified" ? "bg-emerald-50 text-emerald-800" : item.jamb_recognition_status === "discontinued" || item.jamb_recognition_status === "not_verified" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}>
                        {recognition[item.jamb_recognition_status] ?? item.jamb_recognition_status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.is_published ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
                        {item.is_published ? "Published" : "Draft"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

