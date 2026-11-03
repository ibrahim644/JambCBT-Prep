import type { ReactNode } from "react";
import AdminSidebar from "./admin-sidebar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminSidebar>{children}</AdminSidebar>;
}
