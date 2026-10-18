import { Suspense } from "react";
import { Loading } from "@/components/Spinner";
import { CourseHome } from "@/components/CourseHome";

export default function CoursePage() {
  // CourseHome reads the URL with useParams(), which Cache Components
  // requires to sit behind a Suspense boundary.
  return (
    <Suspense fallback={<Loading message="Loading…" />}>
      <CourseHome />
    </Suspense>
  );
}
