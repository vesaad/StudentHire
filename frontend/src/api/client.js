import axios from 'axios';
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
  headers: { Accept: 'application/json' },
});
export function getErrorMessage(error) {
  if (error.response?.data?.error?.message) return error.response.data.error.message;
  if (error.code === 'ECONNABORTED') return 'Serveri nuk u përgjigj në kohë. Provo përsëri.';
  if (!error.response) return 'Lidhja me serverin dështoi. Kontrollo nëse backend-i është nisur.';
  return 'Kërkesa dështoi. Provo përsëri.';
}
