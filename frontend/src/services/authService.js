import api from './api';

export const googleLogin = async (token) => {
  const response = await api.post('/auth/google', { token });
  return response.data;
};
