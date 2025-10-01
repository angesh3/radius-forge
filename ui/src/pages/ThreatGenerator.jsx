import { useState, useEffect } from 'react';

const ThreatGenerator = () => {
  const [selectedModules, setSelectedModules] = useState([]);
  const [safetyControls, setSafetyControls] = useState({
    maxTrafficPercent: 10,
    errorThreshold: 15,
    autoThrottle: true,
    killSwitch: true,
    allowedCidr: '192.168.1.0/24'
  });

  const [moduleConfigs, setModuleConfigs] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [telemetry, setTelemetry] = useState({
    dropReasons: {},
    parserErrors: 0,
    nasTimeouts: 0,
    alerts: []
  });

  const threatModules = [
    {
      id: 'burst-storms',
      name: 'Burst Storms',
      description: 'Generate micro-bursts of traffic (5-30 seconds)',
      category: 'Traffic',
      params: {
        burstDuration: { type: 'number', default: 15, min: 5, max: 30, unit: 'seconds' },
        burstInterval: { type: 'number', default: 60, min: 30, max: 300, unit: 'seconds' },
        burstMultiplier: { type: 'number', default: 5, min: 2, max: 20, unit: 'x' }
      }
    },
    {
      id: 'credential-spray',
      name: 'Credential Spray',
      description: 'Attempt authentication with unknown usernames and wrong secrets',
      category: 'Authentication',
      params: {
        unknownUserPercent: { type: 'number', default: 50, min: 10, max: 90, unit: '%' },
        wrongSecretPercent: { type: 'number', default: 30, min: 10, max: 90, unit: '%' },
        usernameDictionary: { type: 'select', default: 'common', options: ['common', 'admin', 'service', 'custom'] }
      }
    },
    {
      id: 'protocol-fuzz',
      name: 'Protocol Fuzz',
      description: 'Send malformed AVPs and oversized packets',
      category: 'Protocol',
      params: {
        malformedAvpPercent: { type: 'number', default: 5, min: 1, max: 20, unit: '%' },
        oversizePacketPercent: { type: 'number', default: 3, min: 1, max: 10, unit: '%' },
        maxPacketSize: { type: 'number', default: 8192, min: 4096, max: 65536, unit: 'bytes' }
      }
    },
    {
      id: 'latency-injection',
      name: 'Latency Injection',
      description: 'Introduce variable response delays',
      category: 'Timing',
      params: {
        delayPercent: { type: 'number', default: 10, min: 5, max: 50, unit: '%' },
        minDelay: { type: 'number', default: 1000, min: 100, max: 5000, unit: 'ms' },
        maxDelay: { type: 'number', default: 5000, min: 1000, max: 30000, unit: 'ms' }
      }
    },
    {
      id: 'eap-attacks',
      name: 'EAP Attacks',
      description: 'Unsupported EAP attempts and downgrade attacks',
      category: 'Authentication',
      params: {
        unsupportedEapPercent: { type: 'number', default: 15, min: 5, max: 40, unit: '%' },
        downgradeAttempts: { type: 'boolean', default: true },
        eapTypes: { type: 'multiselect', default: ['EAP-MD4', 'EAP-SIM'], options: ['EAP-MD4', 'EAP-SIM', 'EAP-AKA', 'EAP-GTC'] }
      }
    },
    {
      id: 'coa-flood',
      name: 'CoA/Disconnect Floods',
      description: 'Send excessive CoA and Disconnect requests',
      category: 'CoA',
      params: {
        coaRate: { type: 'number', default: 100, min: 10, max: 1000, unit: 'req/sec' },
        disconnectRate: { type: 'number', default: 50, min: 10, max: 500, unit: 'req/sec' },
        invalidSessionIds: { type: 'boolean', default: true }
      }
    },
    {
      id: 'syslog-flood',
      name: 'Syslog Flood',
      description: 'Generate high-volume syslog traffic with mixed priorities',
      category: 'Syslog',
      params: {
        messagesPerSecond: { type: 'number', default: 1000, min: 100, max: 10000, unit: 'msg/sec' },
        facilityMix: { type: 'multiselect', default: ['local0', 'local1'], options: ['local0', 'local1', 'local2', 'local3', 'local4', 'local5', 'local6', 'local7'] },
        severityMix: { type: 'multiselect', default: ['info', 'warning'], options: ['emergency', 'alert', 'critical', 'error', 'warning', 'notice', 'info', 'debug'] }
      }
    },
    {
      id: 'tacacs-storm',
      name: 'TACACS+ Command Storm',
      description: 'Send rapid-fire TACACS+ authorization requests',
      category: 'TACACS+',
      params: {
        commandsPerSecond: { type: 'number', default: 500, min: 50, max: 5000, unit: 'cmd/sec' },
        commandTypes: { type: 'multiselect', default: ['show', 'configure'], options: ['show', 'configure', 'debug', 'clear', 'reload'] },
        privilegeEscalation: { type: 'boolean', default: true }
      }
    }
  ];

  const handleModuleToggle = (moduleId) => {
    setSelectedModules(prev => 
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );

    // Initialize default config for newly selected modules
    if (!selectedModules.includes(moduleId)) {
      const module = threatModules.find(m => m.id === moduleId);
      const defaultConfig = {};
      Object.entries(module.params).forEach(([key, param]) => {
        defaultConfig[key] = param.default;
      });
      setModuleConfigs(prev => ({
        ...prev,
        [moduleId]: defaultConfig
      }));
    }
  };

  const handleModuleConfigChange = (moduleId, paramKey, value) => {
    setModuleConfigs(prev => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        [paramKey]: value
      }
    }));
  };

  const handleSafetyControlChange = (key, value) => {
    setSafetyControls(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleStartThreatGen = () => {
    if (selectedModules.length === 0) {
      alert('Please select at least one threat module');
      return;
    }

    setIsRunning(true);
    // TODO: Call API to start threat generation
    simulateThreatExecution();
  };

  const handleStopThreatGen = () => {
    setIsRunning(false);
    // TODO: Call API to stop threat generation
  };

  const handleKillSwitch = () => {
    setIsRunning(false);
    // TODO: Emergency stop all threat modules
    alert('Emergency kill switch activated! All threat modules stopped.');
  };

  const simulateThreatExecution = () => {
    // Simulate telemetry updates
    const interval = setInterval(() => {
      if (!isRunning) {
        clearInterval(interval);
        return;
      }

      setTelemetry(prev => ({
        dropReasons: {
          'Invalid AVP': 0,
          'Oversized Packet': 0,
          'Unknown User': 0,
          'Wrong Secret': 0
        },
        parserErrors: prev.parserErrors,
        nasTimeouts: prev.nasTimeouts,
        alerts: prev.alerts.length < 10 ? [
          ...prev.alerts,
          {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            level: 'warning',
            message: `Threshold breach detected: Error rate 0.0%`
          }
        ] : prev.alerts
      }));
    }, 2000);
  };

  const renderModuleConfig = (module) => {
    const config = moduleConfigs[module.id] || {};

    return (
      <div key={module.id} className="module-config">
        <h4>{module.name}</h4>
        <div className="param-grid">
          {Object.entries(module.params).map(([key, param]) => (
            <div key={key} className="param-item">
              <label>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</label>
              {param.type === 'number' && (
                <div className="number-input">
                  <input 
                    type="number"
                    min={param.min}
                    max={param.max}
                    value={config[key] || param.default}
                    onChange={(e) => handleModuleConfigChange(module.id, key, parseInt(e.target.value))}
                  />
                  <span className="unit">{param.unit}</span>
                </div>
              )}
              {param.type === 'boolean' && (
                <input 
                  type="checkbox"
                  checked={config[key] !== undefined ? config[key] : param.default}
                  onChange={(e) => handleModuleConfigChange(module.id, key, e.target.checked)}
                />
              )}
              {param.type === 'select' && (
                <select 
                  value={config[key] || param.default}
                  onChange={(e) => handleModuleConfigChange(module.id, key, e.target.value)}
                >
                  {param.options.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              )}
              {param.type === 'multiselect' && (
                <div className="multiselect">
                  {param.options.map(option => (
                    <label key={option} className="checkbox-label">
                      <input 
                        type="checkbox"
                        checked={(config[key] || param.default).includes(option)}
                        onChange={(e) => {
                          const currentValues = config[key] || param.default;
                          const newValues = e.target.checked
                            ? [...currentValues, option]
                            : currentValues.filter(v => v !== option);
                          handleModuleConfigChange(module.id, key, newValues);
                        }}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const categoryGroups = threatModules.reduce((groups, module) => {
    const category = module.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(module);
    return groups;
  }, {});

  return (
    <div className="threat-generator-page">
      <div className="page-header">
        <h1>Threat Generator</h1>
        <p>Generate adversarial traffic patterns to test resilience & detection</p>
      </div>

      <div className="safety-controls">
        <h2>Safety Controls</h2>
        <div className="safety-grid">
          <div className="safety-item">
            <label>Max % of Total Traffic:</label>
            <input 
              type="number"
              min="1"
              max="50"
              value={safetyControls.maxTrafficPercent}
              onChange={(e) => handleSafetyControlChange('maxTrafficPercent', parseInt(e.target.value))}
            />
            <span>%</span>
          </div>
          <div className="safety-item">
            <label>Error Threshold:</label>
            <input 
              type="number"
              min="5"
              max="50"
              value={safetyControls.errorThreshold}
              onChange={(e) => handleSafetyControlChange('errorThreshold', parseInt(e.target.value))}
            />
            <span>%</span>
          </div>
          <div className="safety-item">
            <label>Auto Throttle:</label>
            <input 
              type="checkbox"
              checked={safetyControls.autoThrottle}
              onChange={(e) => handleSafetyControlChange('autoThrottle', e.target.checked)}
            />
          </div>
          <div className="safety-item">
            <label>Kill Switch:</label>
            <input 
              type="checkbox"
              checked={safetyControls.killSwitch}
              onChange={(e) => handleSafetyControlChange('killSwitch', e.target.checked)}
            />
          </div>
          <div className="safety-item">
            <label>Allowed CIDR:</label>
            <input 
              type="text"
              value={safetyControls.allowedCidr}
              onChange={(e) => handleSafetyControlChange('allowedCidr', e.target.value)}
              placeholder="192.168.1.0/24"
            />
          </div>
        </div>
      </div>

      <div className="threat-modules">
        <h2>Threat Modules</h2>
        {Object.entries(categoryGroups).map(([category, modules]) => (
          <div key={category} className="module-category">
            <h3>{category}</h3>
            <div className="modules-grid">
              {modules.map(module => (
                <div key={module.id} className={`module-card ${selectedModules.includes(module.id) ? 'selected' : ''}`}>
                  <div className="module-header">
                    <label className="module-checkbox">
                      <input 
                        type="checkbox"
                        checked={selectedModules.includes(module.id)}
                        onChange={() => handleModuleToggle(module.id)}
                      />
                      <span className="module-name">{module.name}</span>
                    </label>
                  </div>
                  <p className="module-description">{module.description}</p>
                  {selectedModules.includes(module.id) && renderModuleConfig(module)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {isRunning && (
        <div className="telemetry">
          <h2>Live Telemetry</h2>
          <div className="telemetry-grid">
            <div className="telemetry-card">
              <h4>Drop Reasons</h4>
              <div className="drop-reasons">
                {Object.entries(telemetry.dropReasons).map(([reason, count]) => (
                  <div key={reason} className="drop-reason">
                    <span className="reason">{reason}:</span>
                    <span className="count">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="telemetry-card">
              <h4>Error Counts</h4>
              <div className="error-counts">
                <div className="error-item">
                  <span>Parser Errors:</span>
                  <span>{telemetry.parserErrors}</span>
                </div>
                <div className="error-item">
                  <span>NAS Timeouts:</span>
                  <span>{telemetry.nasTimeouts}</span>
                </div>
              </div>
            </div>
            <div className="telemetry-card">
              <h4>Recent Alerts</h4>
              <div className="alerts">
                {telemetry.alerts.slice(-5).map(alert => (
                  <div key={alert.id} className={`alert alert-${alert.level}`}>
                    <span className="alert-time">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                    <span className="alert-message">{alert.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="control-actions">
        <div className="action-buttons">
          {!isRunning ? (
            <button className="btn-danger" onClick={handleStartThreatGen}>
              Start Threat Generation
            </button>
          ) : (
            <>
              <button className="btn-secondary" onClick={handleStopThreatGen}>
                Stop Threat Generation
              </button>
              {safetyControls.killSwitch && (
                <button className="btn-emergency" onClick={handleKillSwitch}>
                  EMERGENCY KILL SWITCH
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .threat-generator-page {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          margin-bottom: 30px;
        }

        .page-header h1 {
          color: #333;
          margin-bottom: 10px;
        }

        .safety-controls {
          background: #fff3cd;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
          border: 1px solid #ffeaa7;
        }

        .safety-controls h2 {
          color: #856404;
          margin-bottom: 15px;
        }

        .safety-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }

        .safety-item {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .safety-item label {
          font-weight: 500;
          color: #856404;
        }

        .safety-item input {
          padding: 5px 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .safety-item span {
          color: #856404;
          font-size: 14px;
        }

        .threat-modules {
          margin-bottom: 30px;
        }

        .module-category {
          margin-bottom: 30px;
        }

        .module-category h3 {
          color: #555;
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 2px solid #eee;
        }

        .modules-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }

        .module-card {
          background: white;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          padding: 15px;
          transition: all 0.2s;
        }

        .module-card:hover {
          border-color: #ccc;
        }

        .module-card.selected {
          border-color: #dc3545;
          background-color: #fff5f5;
        }

        .module-header {
          margin-bottom: 10px;
        }

        .module-checkbox {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }

        .module-name {
          font-weight: 600;
          color: #333;
        }

        .module-description {
          color: #666;
          font-size: 14px;
          margin-bottom: 15px;
        }

        .module-config {
          border-top: 1px solid #eee;
          padding-top: 15px;
        }

        .module-config h4 {
          margin-bottom: 10px;
          color: #555;
          font-size: 14px;
        }

        .param-grid {
          display: grid;
          gap: 10px;
        }

        .param-item {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .param-item label {
          font-size: 12px;
          color: #666;
          font-weight: 500;
        }

        .number-input {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .number-input input {
          flex: 1;
          padding: 4px 8px;
          border: 1px solid #ddd;
          border-radius: 3px;
          font-size: 12px;
        }

        .unit {
          font-size: 11px;
          color: #888;
        }

        .multiselect {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          cursor: pointer;
        }

        .telemetry {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }

        .telemetry-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-top: 15px;
        }

        .telemetry-card {
          background: white;
          padding: 15px;
          border-radius: 6px;
          border: 1px solid #e0e0e0;
        }

        .telemetry-card h4 {
          margin-bottom: 10px;
          color: #555;
        }

        .drop-reason,
        .error-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
          font-size: 14px;
        }

        .alert {
          padding: 8px;
          border-radius: 4px;
          margin-bottom: 5px;
          font-size: 12px;
        }

        .alert-warning {
          background-color: #fff3cd;
          border: 1px solid #ffeaa7;
        }

        .alert-time {
          font-weight: 500;
          margin-right: 10px;
        }

        .control-actions {
          text-align: center;
        }

        .action-buttons {
          display: flex;
          gap: 15px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .btn-danger,
        .btn-secondary,
        .btn-emergency {
          padding: 12px 24px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: background-color 0.2s;
        }

        .btn-danger {
          background-color: #dc3545;
          color: white;
        }

        .btn-danger:hover {
          background-color: #c82333;
        }

        .btn-secondary {
          background-color: #6c757d;
          color: white;
        }

        .btn-secondary:hover {
          background-color: #545b62;
        }

        .btn-emergency {
          background-color: #ff4444;
          color: white;
          animation: pulse 1s infinite;
        }

        .btn-emergency:hover {
          background-color: #cc0000;
        }

        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(255, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0); }
        }
      `}</style>
    </div>
  );
};

export default ThreatGenerator;
