// financeApi.js
import axios from "axios";
import { getToken } from "../../../../auth/storage";

const API = import.meta.env.VITE_API_URL;

const authHeaders = (isMultipart = false) => ({
  Authorization: `Bearer ${getToken()}`,
  ...(isMultipart ? {} : { "Content-Type": "application/json" }),
});

/**
 * CREATE FINANCE
 * Accepts FormData (handles file uploads + JSON fields together)
 */
export async function createFinance(data) {
  const isFormData = data instanceof FormData;
  const res = await axios.post(`${API}/api/finance-profiles`, data, {
    headers: authHeaders(isFormData),
  });
  return res.data;
}

/**
 * GET ALL FINANCE PROFILES
 */
export async function getFinances() {
  const res = await axios.get(`${API}/api/finance-profiles`, {
    headers: authHeaders(),
  });
  return res.data;
}

/**
 * GET SINGLE FINANCE PROFILE
 */
export async function getFinance(id) {
  const res = await axios.get(`${API}/api/finance-profiles/${id}`, {
    headers: authHeaders(),
  });
  return res.data;
}

/**
 * UPDATE FINANCE
 * Accepts FormData (handles file uploads + JSON fields together)
 */
export async function updateFinance(id, data) {
  const isFormData = data instanceof FormData;
  const res = await axios.put(`${API}/api/finance-profiles/${id}`, data, {
    headers: authHeaders(isFormData),
  });
  return res.data;
}

/**
 * DELETE FINANCE
 */
export async function deleteFinance(id) {
  const res = await axios.delete(`${API}/api/finance-profiles/${id}`, {
    headers: authHeaders(),
  });
  return res.data;
}

/**
 * GET SCHOOLS (for school selector in the form)
 */
export async function getSchools() {
  const res = await axios.get(`${API}/api/schools`, {
    headers: authHeaders(),
  });
  return res;
}