import axios from 'axios';

const api = axios.create({
    baseURL: '/api/',
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;

export const getMediaUrl = (url) => {
  if (!url) return null;
  try {
    const urlString = typeof url === 'string' ? url : String(url);
    if (urlString.startsWith('http')) {
      const parsed = new URL(urlString);
      return parsed.pathname;
    }
    return urlString.startsWith('/') ? urlString : `/${urlString}`;
  } catch (e) {
    return typeof url === 'string' ? url : String(url);
  }
};
