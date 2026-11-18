import type { Metadata } from "next";
import { Dashboard } from "@/components/Dashboard";

export const metadata: Metadata = { title: "Dashboard | MagicShelf" };

export default function DashboardPage() {
  return <Dashboard />;
}
