export async function apiFetch(path, options = {}) {
  const base = "http://localhost:5001";

  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };

  return fetch(base + path, {
    ...options,
    credentials: "include",
    headers,
  });
}
