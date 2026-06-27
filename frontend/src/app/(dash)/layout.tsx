import { AppShell } from "@/components/AppShell";
import { NewAttestationToast } from "@/components/NewAttestationToast";

// All in-app cockpit routes (/dashboard, /decisions, /treasury, /verifier, /about)
// share the sidebar + topbar shell. The landing page ("/") sits outside this group.
export default function DashLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      {children}
      <NewAttestationToast />
    </AppShell>
  );
}
