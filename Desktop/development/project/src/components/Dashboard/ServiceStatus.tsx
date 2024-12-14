import React from 'react';
import { Server, AlertTriangle } from 'lucide-react';
import { useBackendStatus } from '../../hooks/useBackendStatus';

export const ServiceStatus: React.FC = () => {
  const { isAvailable, isChecking } = useBackendStatus();

  if (isChecking) {
    return (
      <div className="flex items-center gap-2 text-gray-600">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
        <span className="text-sm">Checking service status...</span>
      </div>
    );
  }

  if (!isAvailable) {
    return (
      <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-lg">
        <AlertTriangle className="w-4 h-4" />
        <span className="text-sm">Backend service unavailable</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-green-600">
      <Server className="w-4 h-4" />
      <span className="text-sm">Service running</span>
    </div>
  );
};