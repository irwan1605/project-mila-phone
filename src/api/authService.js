import axios from "axios";

const API_URL = `${process.env.REACT_APP_API_URL}`; // ganti sesuai backend-mu

export const registerUser = async (data) => {
  try {
    const response = await axios.post(`${API_URL}/auth/register`, data);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};
