import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function uploadFiles(paymentFile, bankFile, orderFile) {
  const body = new FormData();
  if (paymentFile) body.append('payment', paymentFile);
  if (bankFile) body.append('bank', bankFile);
  if (orderFile) body.append('orders', orderFile);

  const res = await api.post('/upload', body, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function reconcileBatch(batchId) {
  const res = await api.post(`/reconcile/${batchId}`);
  return res.data;
}

export async function getReconciliation(batchId = '') {
  const url = batchId ? `/reconcile/${batchId}` : '/reconcile';
  const res = await api.get(url);
  return res.data;
}

export async function getExceptions(batchId = '', params = {}) {
  const url = batchId ? `/exceptions/${batchId}` : '/exceptions';
  const res = await api.get(url, { params });
  return res.data;
}

export async function getTransactionById(txnId) {
  const res = await api.get(`/transactions/${txnId}`);
  return res.data;
}

export async function getExceptionById(txnId) {
  const res = await api.get(`/transactions/${txnId}`);
  return res.data;
}

export async function askController(question) {
  const res = await api.post('/chat', { question });
  return res.data;
}

export async function getReports(batchId = '') {
  const url = batchId ? `/reports/${batchId}` : '/reports';
  const res = await api.get(url);
  return res.data;
}

export default api;
