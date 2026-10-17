import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-3 py-10 text-center">
      <p className="text-5xl" aria-hidden>
        🦉
      </p>
      <h1 className="text-xl font-bold text-slate-900">Hoo… this page doesn&apos;t exist</h1>
      <p className="text-slate-700">The link may be wrong, or the course may have been deleted.</p>
      <Link href="/" className="inline-block rounded-xl bg-indigo-700 px-4 py-2.5 font-semibold text-white hover:bg-indigo-800">
        Back to home
      </Link>
    </div>
  );
}
