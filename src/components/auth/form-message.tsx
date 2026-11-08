export function FormMessage({ error, success }: { error?: string; success?: string }) {
  if (error) return <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{error}</p>;
  if (success) return <p role="status" className="rounded-2xl bg-success/10 px-4 py-3 text-sm font-medium text-success">{success}</p>;
  return null;
}
