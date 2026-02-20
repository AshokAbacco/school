// client/src/superAdmin/pages/schoolAdmins/api/schoolAdminApi.js
import axios from "axios";
import { getToken } from "../../../../auth/storage";

const API = import.meta.env.VITE_API_URL;

const auth = () => ({
  Authorization: `Bearer ${getToken()}`,
});

export async function getSchoolAdmins() {
  const res = await axios.get(`${API}/api/school-admins`, { headers: auth() });
  return res.data;
}

export async function createSchoolAdmin(data) {
  const res = await axios.post(`${API}/api/school-admins`, data, { headers: auth() });
  return res.data;
}

export async function updateSchoolAdmin(id, data) {
  const res = await axios.patch(`${API}/api/school-admins/${id}`, data, { headers: auth() });
  return res.data;
}

export async function deleteSchoolAdmin(id) {
  const res = await axios.delete(`${API}/api/school-admins/${id}`, { headers: auth() });
  return res.data;
}