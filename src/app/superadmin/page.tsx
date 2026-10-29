import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { SuperAdminView } from "@/components/SuperAdminView";
import { superadminEnabled } from "@/lib/superadmin";

export const metadata: Metadata = {
  title: "Super admin · นัดประชุม",
  robots: { index: false, follow: false },
};

export default function SuperAdminPage() {
  return (
    <Suspense>
      <Gate />
    </Suspense>
  );
}

// Read the env at request time (not build time): without SUPERADMIN_TOKEN the page doesn't exist.
async function Gate() {
  await connection();
  if (!superadminEnabled()) notFound();
  return <SuperAdminView />;
}
