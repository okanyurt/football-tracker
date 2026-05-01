export type Result<T> = { data: T; error: null } | { data: null; error: string };

export async function handle<T>(res: Response, fallback: string): Promise<Result<T>> {
  if (res.status === 401) {
    window.location.replace("/login");
    return new Promise(() => {});
  }
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    return { data: null, error: d.error || fallback };
  }
  return { data: await res.json(), error: null };
}
