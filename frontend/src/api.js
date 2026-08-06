import axios from 'axios';

let defaultApiBase = '/api/';
if (typeof window !== 'undefined' && window.location.host.includes('.onrender.com')) {
  // If hosted on Render, map frontend domain (e.g. frontend-tn8c.onrender.com) to backend domain
  const host = window.location.host;
  let backendDomain = host;
  if (host.startsWith('frontend-')) {
    // If domain is frontend-tn8c.onrender.com -> whatsapp-clone-backend.onrender.com
    backendDomain = 'whatsapp-clone-backend.onrender.com';
  }
  defaultApiBase = `${window.location.protocol}//${backendDomain}/api/`;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || defaultApiBase;

const api = axios.create({
    baseURL: API_BASE_URL,
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
  const backendHost = import.meta.env.VITE_BACKEND_URL || API_BASE_URL.replace(/\/api\/?$/, '');
  try {
    const urlString = typeof url === 'string' ? url : String(url);
    if (urlString.startsWith('http://') || urlString.startsWith('https://')) {
      return urlString;
    }
    return urlString.startsWith('/') ? `${backendHost}${urlString}` : `${backendHost}/${urlString}`;
  } catch (e) {
    return typeof url === 'string' ? url : String(url);
  }
};

export const getWebSocketUrl = (path) => {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  
  if (import.meta.env.VITE_WS_URL) {
    const customWs = import.meta.env.VITE_WS_URL;
    return `${customWs}${path.startsWith('/') ? path : '/' + path}`;
  }

  let host = window.location.host;
  if (host.includes('.onrender.com')) {
    if (host.startsWith('frontend-')) {
      host = 'whatsapp-clone-backend.onrender.com';
    }
  }

  const cleanPath = path.startsWith('/') ? path : '/' + path;
  return `${wsProtocol}//${host}${cleanPath}`;
};
