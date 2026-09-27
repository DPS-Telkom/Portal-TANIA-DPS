export function FullPageStatus({ message = "Memuat…" }: { message?: string }) {
  return (
    <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
