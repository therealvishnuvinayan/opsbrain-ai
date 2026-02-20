import { KnowledgeSubnav } from "@/features/knowledge/components/knowledge-subnav";
import { KnowledgeStoreProvider } from "@/features/knowledge/store";

export default function KnowledgeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <KnowledgeStoreProvider>
      <div className="mx-auto max-w-7xl space-y-6">
        <KnowledgeSubnav />
        {children}
      </div>
    </KnowledgeStoreProvider>
  );
}
