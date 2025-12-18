import { getApiUrl } from "./config";

export interface StatusData {
  status: string;
  server_time: string;
  timestamp: number;
}

/**
 * Get server status
 */
export const getStatus = async (): Promise<StatusData> => {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/status`);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
};
