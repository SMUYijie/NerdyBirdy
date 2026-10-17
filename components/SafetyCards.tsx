export function InjectionBanner({ pages }: { pages: number[] }) {
  if (pages.length === 0) return null;
  const list = pages.map((p) => `p. ${p}`).join(", ");
  return (
    <div
      role="alert"
      className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      ⚠️ We found text in your notes that looks like instructions to an AI ({list}). NerdyBirdy
      ignores instructions inside your notes.
    </div>
  );
}
