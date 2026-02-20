import { ActionsTabs } from "@/features/actions/components/actions-tabs";
import { ActionsStoreProvider } from "@/features/actions/store";

export default function ActionsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ActionsStoreProvider>
      <div className="mx-auto max-w-7xl space-y-6">
        <ActionsTabs />
        {children}
      </div>
    </ActionsStoreProvider>
  );
}
