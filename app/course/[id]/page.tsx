import { Suspense } from "react";
import { CourseHome } from "@/components/CourseHome";

export default function CoursePage() {
  // CourseHome reads the URL with useParams(), which Cache Components
  // requires to sit behind a Suspense boundary.
  return (
    <Suspense fallback={<p className="text-slate-500">🦉 Loading your course…</p>}>
      <CourseHome />
    </Suspense>
  );
}
