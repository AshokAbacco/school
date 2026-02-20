// client/src/superAdmin/pages/users/api/usersApi.js
import axios from "axios";
import { getToken } from "../../../../auth/storage";

const API = import.meta.env.VITE_API_URL;
const auth = () => ({ Authorization: `Bearer ${getToken()}` });

export async function getAllUsers(params = {}) {
  const res = await axios.get(`${API}/api/users/all`, {
    headers: auth(),
    params, // role, status, search, page, limit
  });
  return res.data;
}