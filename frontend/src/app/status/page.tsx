"use client";

import { useEffect, useState } from "react";
import { Card, Badge, Spinner, Alert } from "react-bootstrap";

interface StatusData {
  status: string;
  server_time: string;
  timestamp: number;
}

export default function StatusPage() {
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchStatus = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
      const response = await fetch(`${apiUrl}/api/status`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: StatusData = await response.json();
      setStatusData(data);
      setError(null);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "short",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">
            Server Status Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Real-time server monitoring
          </p>
        </div>

        {error && (
          <Alert variant="danger" className="mb-4">
            <Alert.Heading>Connection Error</Alert.Heading>
            <p>{error}</p>
            <button
              onClick={fetchStatus}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
            >
              Retry
            </button>
          </Alert>
        )}

        <Card className="shadow-lg border-0">
          <Card.Header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold mb-0">Server Status</h2>
              {loading ? (
                <Spinner animation="border" size="sm" />
              ) : (
                <Badge
                  bg={statusData?.status === "ok" ? "success" : "danger"}
                  className="px-3 py-2"
                >
                  {statusData?.status?.toUpperCase() || "UNKNOWN"}
                </Badge>
              )}
            </div>
          </Card.Header>
          <Card.Body className="p-6">
            {loading && !statusData ? (
              <div className="text-center py-12">
                <Spinner animation="border" variant="primary" />
                <p className="mt-4 text-gray-600">Loading server status...</p>
              </div>
            ) : statusData ? (
              <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Server Time
                  </h3>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">
                    {formatDateTime(statusData.server_time)}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      Unix Timestamp
                    </h3>
                    <p className="text-xl font-mono text-gray-800 dark:text-white">
                      {statusData.timestamp}
                    </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      Last Updated
                    </h3>
                    <p className="text-xl text-gray-800 dark:text-white">
                      {lastUpdate.toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-blue-600 dark:text-blue-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Status updates automatically every 5 seconds
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}

