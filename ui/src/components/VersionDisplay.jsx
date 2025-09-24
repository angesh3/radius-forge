import React, { useState, useEffect } from 'react';

const VersionDisplay = () => {
  const [versionInfo, setVersionInfo] = useState({
    version: '1.3.0',
    deploymentType: 'Full',
    lastUpdated: new Date().toISOString(),
    ports: {
      api: 8910,
      ui: 8911,
      websocket: 8912,
      radius_test: 8913,
      tacacs_test: 8914,
      syslog: 8915,
      metrics_export: 8916,
      health_check: 8917,
      admin_api: 8918,
      backup_service: 8919,
      reserved: 8920
    }
  });

  useEffect(() => {
    // Fetch version info from API
    fetch('http://localhost:8910/api/system/version')
      .then(res => res.json())
      .then(data => setVersionInfo(data))
      .catch(err => console.error('Failed to fetch version:', err));
  }, []);

  return (
    <div style={{
      position: 'fixed',
      bottom: 10,
      right: 10,
      padding: '8px 12px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: '#fff',
      borderRadius: '4px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 9999
    }}>
      <div>v{versionInfo.version} | {versionInfo.deploymentType}</div>
      <div style={{ fontSize: '10px', opacity: 0.8 }}>
        API: {versionInfo.ports.api} | UI: {versionInfo.ports.ui} | Range: {versionInfo.ports.api}-{versionInfo.ports.reserved}
      </div>
    </div>
  );
};

export default VersionDisplay;