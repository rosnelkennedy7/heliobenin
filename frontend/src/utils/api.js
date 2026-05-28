// En dev : VITE_API_URL absent → '' → /api/... proxié par Vite vers localhost:8000
// En prod : VITE_API_URL = http://51.75.35.141:8000 (VPS YoupiHost)
export const API_BASE = import.meta.env.VITE_API_URL || ''
