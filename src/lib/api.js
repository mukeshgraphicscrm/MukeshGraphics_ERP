import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
});

// Request interceptor to add Firebase Auth token
api.interceptors.request.use(async (config) => {
  // TODO: Add Firebase Auth token retrieval here when Auth is fully integrated
  // const token = await getFirebaseAuthToken();
  // if (token) {
  //   config.headers.Authorization = `Bearer ${token}`;
  // }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
