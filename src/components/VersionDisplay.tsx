import React, { useState, useEffect } from 'react';
import './VersionDisplay.css';

interface VersionInfo {
  version: string;
  lastUpdated: string;
  buildNumber: number;
}

const VersionDisplay: React.FC = () => {
  const [version, setVersion] = useState<string>('01.00.00');

  useEffect(() => {
    // Try to fetch version info, fallback to default if not available
    fetch('/version.json')
      .then(response => response.json())
      .then((data: VersionInfo) => {
        setVersion(data.version);
      })
      .catch(() => {
        // Fallback to default version if file doesn't exist
        setVersion('01.00.00');
      });
  }, []);

  return (
    <div className="version-display">
      v{version}
    </div>
  );
};

export default VersionDisplay;
