import { BookMarked } from "lucide-react";

const EmptyState = () => {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50">
        <BookMarked
          size={28}
          className="text-sky-500"
        />
      </div>

      <h3 className="text-lg font-bold text-slate-800">
        No tutorial teachers yet
      </h3>

      <p className="mt-2 text-sm text-slate-500">
        Add tutorial providers for recommendations
      </p>
    </div>
  );
};

export default EmptyState;
