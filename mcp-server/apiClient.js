import axios from 'axios';

const BASE_URL = process.env.BACKEND_API_URL || 'http://localhost:5000/api';

export const api = axios.create({ baseURL: BASE_URL, timeout: 10000 });

// Converts an axios error (backend 4xx/5xx, or network failure) into a plain
// object the MCP tool handlers can return as tool error content, instead of
// throwing and losing the backend's validation details.
export function describeApiError(err) {
  if (err.response) {
    return {
      status: err.response.status,
      body: err.response.data
    };
  }
  return { status: null, body: { error: err.message } };
}
