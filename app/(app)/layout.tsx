import Shell from "@/components/Shell";
import { WorkspaceProvider } from "@/components/ws";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <Shell>{children}</Shell>
    </WorkspaceProvider>
  );
}
