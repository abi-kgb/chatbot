import axios from 'axios';

const RENDER_BACKEND_HOST = 'whatsapp-clone-backend-kd0k.onrender.com';
const RENDER_BACKEND_ORIGIN = `https://${RENDER_BACKEND_HOST}`;

let defaultApiBase = '/api/';
if (typeof window !== 'undefined' && window.location.host.includes('.onrender.com')) {
  defaultApiBase = `${RENDER_BACKEND_ORIGIN}/api/`;
}

const rawApiUrl = import.meta.env.VITE_API_URL;
const API_BASE_URL = (rawApiUrl && !rawApiUrl.includes('your-backend-name')) ? rawApiUrl : defaultApiBase;

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
  const rawBackend = import.meta.env.VITE_BACKEND_URL;
  const backendHost = (rawBackend && !rawBackend.includes('your-backend-name')) ? rawBackend : API_BASE_URL.replace(/\/api\/?$/, '');
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
  const customWs = import.meta.env.VITE_WS_URL;
  
  if (customWs && !customWs.includes('your-backend-name')) {
    return `${customWs}${path.startsWith('/') ? path : '/' + path}`;
  }

  let host = window.location.host;
  if (host.includes('.onrender.com')) {
    host = RENDER_BACKEND_HOST;
  }

  const cleanPath = path.startsWith('/') ? path : '/' + path;
  return `${wsProtocol}//${host}${cleanPath}`;
};
