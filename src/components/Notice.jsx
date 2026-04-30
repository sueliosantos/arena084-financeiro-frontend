export default function Notice({ error, success }) {
  if (!error && !success) return null;

  return (
    <div className={`rounded-md border px-3 py-2 text-sm ${error ? "border-red-900 bg-red-950 text-danger" : "border-green-900 bg-green-950 text-brand"}`}>
      {error || success}
    </div>
  );
}
