import axios from 'axios';

// All requests go to /api (proxied to the Express server in development).
const api = axios.create({ baseURL: '/api' });

const TOKEN_KEY = 'aerp_token';
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

// Attach the JWT to every request automatically.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Turn any failed request into a readable message (+ field errors if the server sent them).
export const errorMessage = (err) =>
  err.response?.data?.message || (err.request ? 'Cannot reach the server. Is the backend running?' : 'Something went wrong');
export const fieldErrors = (err) =>
  Object.fromEntries((err.response?.data?.errors || []).map((e) => [e.field, e.message]));

export default api;
