// client/src/superAdmin/pages/schools/api/schoolsApi.js
import axios from "axios";
import { getToken } from "../../../../auth/storage";

const API = import.meta.env.VITE_API_URL;

const auth = () => ({
  Authorization: `Bearer ${getToken()}`,
});

export async function createSchool(data) {
  const res = await axios.post(`${API}/api/schools`, data, {
    headers: auth(),
  });
  return res.data;
}

export async function getSchools() {
  const res = await axios.get(`${API}/api/schools`, {
    headers: auth(),
  });
  return res.data;
}

export async function getSchoolById(id) {
  const res = await axios.get(`${API}/api/schools/${id}`, {
    headers: auth(),
  });
  return res.data;
}

export async function updateSchool(id, data) {
  const res = await axios.put(`${API}/api/schools/${id}`, data, {
    headers: auth(),
  });
  return res.data;
}

export async function deleteSchool(id) {
  const res = await axios.delete(`${API}/api/schools/${id}`, {
    headers: auth(),
  });
  return res.data;
}