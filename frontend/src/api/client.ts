import axios from 'axios';

// En producción (ejecutable), usa la misma URL base
// En desarrollo, usa el proxy de Vite o localhost:3000
const getBaseURL = () => {
  // Si estamos en desarrollo con Vite
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  }
  // En producción, usa ruta relativa (mismo servidor)
  return '/api';
};

export const apiClient = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para manejo de errores global
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'Error en la petición';
    console.error('API Error:', message);
    return Promise.reject(error);
  }
);