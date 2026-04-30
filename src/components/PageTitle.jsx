export default function PageTitle({ title, actions }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-xl font-semibold">{title}</h2>
      {actions}
    </div>
  );
}
