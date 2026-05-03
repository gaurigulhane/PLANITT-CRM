import { PublicLanding } from "@/components/marketing/public-landing";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Planitt CRM — Sales & team operations",
  description:
    "Planitt CRM is an internal SaaS workspace for sales follow-ups, task management, attendance, and team workflows. Sign in to access your organization.",
  openGraph: {
    title: "Planitt CRM",
    description: "Internal CRM for sales, follow-ups, and team workflows.",
  },
};

/**
 * Public landing (no auth). OAuth consent "Application home page" must stay reachable without login.
 */
export default function HomePage() {
  return <PublicLanding />;
}
