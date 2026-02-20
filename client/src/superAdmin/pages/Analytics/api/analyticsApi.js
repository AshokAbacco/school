import axios from "axios";
import { getToken } from "../../../../auth/storage"; // adjust path if needed

const BASE = `${import.meta.env.VITE_API_URL}/api/superadmin/analytics`;

export async function getAnalytics({ range = "30d" }) {
  const token = getToken();   // ✅ correct source

  const { data } = await axios.get(BASE, {
    params: { range },
    headers: token
      ? { Authorization: `Bearer ${token}` }
      : {},
  });

  

  return data;
}

export const getSchoolDetails = async (schoolId) => {
  const res = await axios.get(`/superadmin/schools/${schoolId}/details`);
  return res.data;
};