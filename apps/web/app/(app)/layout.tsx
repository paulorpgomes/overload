import { TabBar } from "@/components/shell/tab-bar"

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-lg flex-col">
      {/* pb clears the fixed tab bar (h-16) plus the home indicator. */}
      <main className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom)+1rem)]">
        {children}
      </main>
      <TabBar />
    </div>
  )
}
