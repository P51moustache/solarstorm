export default function Loading() {
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-3 border-solar-emerald border-t-transparent rounded-full animate-spin" />
        <p className="text-solar-muted text-sm">Loading...</p>
      </div>
    </div>
  );
}
