import axios from 'axios';

const defaultApiUrl = import.meta.env.PROD ? 'https://yuumi-production.up.railway.app/api' : 'http://localhost:5000/api';
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || defaultApiUrl });
export const apiOrigin = (import.meta.env.VITE_API_URL || defaultApiUrl).replace(/\/api\/?$/, '');
