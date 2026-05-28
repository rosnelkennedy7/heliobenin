// En dev : VITE_API_URL absent → '' → /api/... proxié par Vite vers localhost:8000
// En prod : VITE_API_URL = https://heliobenin.com (Nginx proxy → backend)
export const API_BASE = import.meta.env.VITE_API_URL || ''
