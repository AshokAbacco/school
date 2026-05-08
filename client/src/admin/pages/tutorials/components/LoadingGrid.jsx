const LoadingGrid = () => {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-3xl border border-slate-200 p-5"
        >
          <div className="mb-4 h-5 rounded bg-slate-200" />
          <div className="mb-3 h-4 rounded bg-slate-100" />
          <div className="h-4 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
};

export default LoadingGrid;
