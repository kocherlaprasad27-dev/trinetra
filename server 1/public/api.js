// api.js
const API_BASE = window.location.origin + "/api";

/**
 * Generic API request helper
 * @param {string} path - API path (ex: /auth/login)
 * @param {object} options - fetch options
 */
async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  // Handle non-JSON or error responses
  const contentType = response.headers.get("content-type");
  let data;

  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    throw {
      status: response.status,
      message: data?.message || data || "API Error"
    };
  }

  return data;
}
