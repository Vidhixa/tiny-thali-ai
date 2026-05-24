
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 bg-background">
      <div className="w-full max-w-sm bg-card p-6 sm:p-8 rounded-xl shadow-2xl">
        {children}
      </div>
    </main>
  );
}
