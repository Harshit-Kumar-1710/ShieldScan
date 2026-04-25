import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor — attach timestamp for latency tracking
api.interceptors.request.use((config) => {
  config.metadata = { startTime: Date.now() };
  return config;
});

// Response interceptor — attach latency to response
api.interceptors.response.use(
  (response) => {
    response.latencyMs = Date.now() - response.config.metadata.startTime;
    return response;
  },
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      "Unknown error occurred";
    return Promise.reject(new Error(message));
  }
);

export async function predictSingle(payload, threshold = null) {
  const body = { payload };
  if (threshold !== null) body.threshold = threshold;
  const res = await api.post("/predict", body);
  return { ...res.data, latencyMs: res.latencyMs };
}

export async function predictBatch(payloads) {
  const res = await api.post("/predict/batch", { payloads });
  return { ...res.data, latencyMs: res.latencyMs };
}

export async function getModelInfo() {
  const res = await api.get("/model/info");
  return res.data;
}

export async function getModelThresholds() {
  const res = await api.get("/model/thresholds");
  return res.data;
}

export async function getModelFeatures() {
  const res = await api.get("/model/features");
  return res.data;
}

export async function healthCheck() {
  const res = await api.get("/health");
  return res.data;
}

export default api;