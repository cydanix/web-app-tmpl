/**
 * Backend API configuration
 */
export const getApiUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
};
