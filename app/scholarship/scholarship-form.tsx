"use client";

import { useState } from "react";

const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT Abuja",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
];

type ApplicationStatus = "idle" | "submitting" | "submitted";

const fieldClassName =
  "mt-2 w-full rounded-xl border border-[#DCE4D8] bg-[#FCFDFB] px-4 py-3 text-sm text-[#213D2A] outline-none transition placeholder:text-[#A0AA9F] focus:border-[#638B5B] focus:ring-4 focus:ring-[#638B5B]/10";

export default function ScholarshipForm() {
  const [status, setStatus] = useState<ApplicationStatus>("idle");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("submitting");

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/scholarship/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surname: formData.get("surname"),
          firstname: formData.get("firstname"),
          lastname: formData.get("lastname"),
          nin_number: formData.get("nin_number"),
          age: Number(formData.get("age")),
          state: formData.get("state"),
          school: formData.get("school"),
          email: formData.get("email"),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ?? "We could not submit your application. Please try again."
        );
      }

      setStatus("submitted");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "We could not submit your application. Please try again."
      );
      setStatus("idle");
    }
  }

  if (status === "submitted") {
    return (
      <div
        role="status"
        className="rounded-2xl border border-[#CFE2C5] bg-[#F1F7EC] p-6 sm:p-8"
      >
        <span
          aria-hidden="true"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#DDEDD5] text-xl font-black text-[#315D3B]"
        >
          ✓
        </span>
        <h3 className="mt-5 text-2xl font-black tracking-tight text-[#193724]">
          Your application is under review
        </h3>
        <p className="mt-3 text-sm leading-7 text-[#647563]">
          Thank you for applying. Your details have been received. Keep
          practising on JAMB Ready—more completed CBT practice can strengthen
          your chance of scholarship consideration. We will contact you by
          email if there is an update.
        </p>
        <p className="mt-4 text-xs leading-5 text-[#748074]">
          Scholarship awards are subject to review and are not guaranteed.
        </p>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-bold text-[#344B39]">
          Surname
          <input
            className={fieldClassName}
            name="surname"
            autoComplete="family-name"
            minLength={2}
            maxLength={100}
            required
          />
        </label>
        <label className="block text-sm font-bold text-[#344B39]">
          First name
          <input
            className={fieldClassName}
            name="firstname"
            autoComplete="given-name"
            minLength={2}
            maxLength={100}
            required
          />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-bold text-[#344B39]">
          Last name
          <input
            className={fieldClassName}
            name="lastname"
            autoComplete="additional-name"
            maxLength={100}
            required
          />
        </label>
        <label className="block text-sm font-bold text-[#344B39]">
          National Identity Number (NIN)
          <input
            className={fieldClassName}
            name="nin_number"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            pattern="[0-9]{11}"
            minLength={11}
            maxLength={11}
            aria-describedby="nin-hint"
            required
          />
          <span id="nin-hint" className="mt-1 block text-xs font-normal text-[#879287]">
            Enter your 11-digit NIN.
          </span>
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-bold text-[#344B39]">
          Age
          <input
            className={fieldClassName}
            name="age"
            type="number"
            min={10}
            max={100}
            required
          />
        </label>
        <label className="block text-sm font-bold text-[#344B39]">
          State
          <select className={fieldClassName} name="state" defaultValue="" required>
            <option value="" disabled>
              Select your state
            </option>
            {NIGERIAN_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-sm font-bold text-[#344B39]">
        School
        <input
          className={fieldClassName}
          name="school"
          autoComplete="organization"
          minLength={2}
          maxLength={200}
          required
        />
      </label>

      <label className="block text-sm font-bold text-[#344B39]">
        Email address
        <input
          className={fieldClassName}
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          required
        />
      </label>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="inline-flex min-h-14 w-full items-center justify-center rounded-xl bg-[#173F2B] px-6 text-sm font-extrabold text-white transition hover:bg-[#245538] disabled:cursor-wait disabled:opacity-70"
      >
        {status === "submitting" ? "Submitting application..." : "Submit application"}
      </button>
      <p className="text-center text-xs leading-5 text-[#879287]">
        By submitting, you confirm that the information provided is accurate.
      </p>
    </form>
  );
}
