export default function Notice({ error, success }) {
  if (!error && !success) return null;

  return (
    <div className={`rounded-xl border px-3 py-2 text-sm ${error ? "border-red-500/30 bg-red-500/10 text-danger" : "border-emerald-500/30 bg-emerald-500/10 text-ok"}`}>
      {error || success}
    </div>
  );
}
