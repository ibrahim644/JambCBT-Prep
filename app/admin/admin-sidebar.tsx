"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  BookOpen,
  Building2,
  ChevronRight,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  Menu,
  Upload,
  Users,
  X,
} from "lucide-react";
import AdminLogoutButton from "./admin-logout-button";

const sections = [
  {
    label: "Overview",
    links: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "CBT management",
    links: [
      { href: "/admin/questions", label: "Question review", icon: ClipboardCheck },
      { href: "/admin/import", label: "Import PDF", icon: Upload },
      { href: "/admin/subjects", label: "Subjects", icon: BookOpen },
      { href: "/admin/candidates", label: "Candidates", icon: Users },
    ],
  },
  {
    label: "Admissions",
    links: [
      { href: "/admin/admissions", label: "Overview", icon: GraduationCap },
      { href: "/admin/admissions/institutions", label: "Institutions", icon: Building2 },
      { href: "/admin/admissions/programmes", label: "Programmes", icon: BookOpen },
      { href: "/admin/admissions/requirements", label: "Requirements & cut-offs", icon: ListChecks },
    ],
  },
];

export default function AdminSidebar({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeHref = sections
    .flatMap((section) => section.links)
    .map(({ href }) => href)
    .filter(
      (href) =>
        pathname === href ||
        (href !== "/admin" && pathname.startsWith(`${href}/`))
    )
    .sort((a, b) => b.length - a.length)[0];

  if (pathname === "/admin/login") return children;

  return (
    <div className="min-h-screen bg-[#F4F7F4] text-[#183B2A] md:grid md:grid-cols-[260px_minmax(0,1fr)]">
      <header className="flex items-center justify-between bg-[#123D2B] px-4 py-3 text-white md:hidden">
        <Link href="/admin" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#174B33]">
            <GraduationCap aria-hidden="true" className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-bold">JAMB CBT</span>
            <span className="block text-[10px] uppercase tracking-[0.16em] text-[#B9D8C2]">
              Administration
            </span>
          </span>
        </Link>
        <button
          type="button"
          aria-expanded={mobileOpen}
          aria-controls="admin-navigation"
          aria-label={mobileOpen ? "Close admin navigation" : "Open admin navigation"}
          onClick={() => setMobileOpen((open) => !open)}
          className="rounded-lg p-2 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          {mobileOpen ? (
            <X aria-hidden="true" className="h-5 w-5" />
          ) : (
            <Menu aria-hidden="true" className="h-5 w-5" />
          )}
        </button>
      </header>

      <aside
        id="admin-navigation"
        className={`${mobileOpen ? "block" : "hidden"} flex-col bg-[#123D2B] text-white md:sticky md:top-0 md:flex md:h-screen`}
      >
        <div className="hidden items-center gap-3 border-b border-white/10 px-6 py-5 md:flex">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#174B33] shadow-sm">
            <GraduationCap aria-hidden="true" className="h-6 w-6" />
          </div>
          <div>
            <p className="text-base font-bold tracking-tight">JAMB CBT</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.19em] text-[#B9D8C2]">
              Administration
            </p>
          </div>
        </div>

        <nav aria-label="Admin navigation" className="flex-1 space-y-6 overflow-y-auto px-4 py-5 md:pt-6">
          {sections.map((section) => (
            <div key={section.label}>
              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                {section.label}
              </p>
              <div className="space-y-1">
                {section.links.map(({ href, label, icon: Icon }) => {
                  const active = href === activeHref;

                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm transition ${
                        active
                          ? "bg-white/12 font-semibold text-white ring-1 ring-white/10"
                          : "text-white/75 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
                      <span className="min-w-0 flex-1">{label}</span>
                      {active && (
                        <ChevronRight
                          aria-hidden="true"
                          className="h-4 w-4 text-[#B9D8C2]"
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-4 py-5">
          <div className="mb-4 flex items-center gap-3 rounded-xl bg-white/[0.06] p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#DCEBE0] text-sm font-bold uppercase text-[#174B33]">
              A
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                Admin workspace
              </p>
              <p className="mt-0.5 text-xs text-white/50">Administrator</p>
            </div>
          </div>
          <AdminLogoutButton />
          <p className="mt-4 px-1 text-[10px] leading-5 text-white/35">
            JAMB CBT Administration
            <br />
            Secure content management
          </p>
        </div>
      </aside>

      <main className="min-w-0">{children}</main>
    </div>
  );
}
