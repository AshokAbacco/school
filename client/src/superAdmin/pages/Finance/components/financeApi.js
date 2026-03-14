import axios from "axios";
import { getToken } from "../../../../auth/storage";

const API = import.meta.env.VITE_API_URL;

const auth = () => ({
  Authorization: `Bearer ${getToken()}`,
});

/**
 * CREATE FINANCE
 */
export async function createFinance(data) {
  const res = await axios.post(`${API}/api/finance-profiles`, data, {
    headers: auth(),
  });
  return res.data;
}

/**
 * GET ALL FINANCE
 */
export async function getFinances() {
  const res = await axios.get(`${API}/api/finance-profiles`, {
    headers: auth(),
  });
  return res.data;
}

/**
 * UPDATE FINANCE
 */
export async function updateFinance(id, data) {
  const res = await axios.put(`${API}/api/finance-profiles/${id}`, data, {
    headers: auth(),
  });
  return res.data;
}

/**
 * DELETE FINANCE
 */
export async function deleteFinance(id) {
  const res = await axios.delete(`${API}/api/finance-profiles/${id}`, {
    headers: auth(),
  });
  return res.data;
}

/**
 * GET SCHOOLS
 */
export const getSchools = () => {
  return axios.get(`${API}/api/schools`, {
    headers: {
      Authorization: `Bearer ${getToken()}`
    }
  });
};