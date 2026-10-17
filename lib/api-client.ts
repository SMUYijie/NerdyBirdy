// Browser helper for calling our own route handlers.
export async function postJSON<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("We couldn't reach NerdyBirdy. Check your internet connection and try again.");
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON response (e.g. a platform timeout page).
  }
  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : "Something went wrong. Please try again.";
    throw new Error(message);
  }
  return data as T;
}
