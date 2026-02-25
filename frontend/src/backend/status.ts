import { api } from "./api-client";

export interface StatusData {
  status: string;
  server_time: string;
  timestamp: number;
}

export const getStatus = (): Promise<StatusData> =>
  api.get("/status");
