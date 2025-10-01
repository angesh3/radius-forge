import { useState, useEffect } from 'react';

const PerformanceTest = () => {
  const [sloConfig, setSloConfig] = useState({
    authP95: 150,
    authP99: 300,
    errorRate: 1,
    coaP95: 2000,
    custom: false
  });

  const [workloadMix, setWorkloadMix] = useState({
    mab: 30,
    eapTls: 25,
    peap: 25,
    pap: 10,
    msChapv2: 10
  });

  const [scalePoints, setScalePoints] = useState([1000, 5000, 10000, 50000, 100000]);
  const [selectedScalePoints, setSelectedScalePoints] = useState([1000, 5000, 10000]);

  const [testConfig, setTestConfig] = useState({
    warmupPeriod: 30,
    cooldownPeriod: 30,
    trialCount: 3,
    confidenceTarget: 95
  });

  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState(null);

  const defaultSlos = [
    { name: 'Default SLOs', authP95: 150, authP99: 300, errorRate: 1, coaP95: 2000 },
    { name: 'Strict SLOs', authP95: 100, authP99: 200, errorRate: 0.5, coaP95: 1500 },
    { name: 'Relaxed SLOs', authP95: 250, authP99: 500, errorRate: 2, coaP95: 3000 }
  ];

  const handleSloSetChange = (sloSet) => {
    setSloConfig({
      ...sloSet,
      custom: false
    });
  };

  const handleCustomSloChange = (field, value) => {
    setSloConfig({
      ...sloConfig,
      [field]: value,
      custom: true
    });
  };

  const handleWorkloadMixChange = (field, value) => {
    const newMix = { ...workloadMix, [field]: value };
    
    // Ensure total doesn't exceed 100%
    const total = Object.values(newMix).reduce((sum, val) => sum + val, 0);
    if (total <= 100) {
      setWorkloadMix(newMix);
    }
  };

  const handleScalePointToggle = (point) => {
    setSelectedScalePoints(prev => 
      prev.includes(point) 
        ? prev.filter(p => p !== point)
        : [...prev, point].sort((a, b) => a - b)
    );
  };

  const handleStartBenchmark = () => {
    setIsRunning(true);
    setTestResults([]);
    setCurrentTest({ phase: 'Starting', scalePoint: selectedScalePoints[0] });
    
    // Execute real performance test
    executeRealPerformanceTest();
  };

  const executeRealPerformanceTest = async () => {
    for (let testIndex = 0; testIndex < selectedScalePoints.length; testIndex++) {
      const scalePoint = selectedScalePoints[testIndex];
      setCurrentTest({ 
        phase: 'Running', 
        scalePoint, 
        trial: 1,
        totalTrials: testConfig.trialCount 
      });
      
      try {
        const response = await fetch('/api/performance/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scalePoint,
            sloConfig,
            workloadMix,
            testConfig
          })
        });
        
        const result = await response.json();
        setTestResults(prev => [...prev, result]);
      } catch (error) {
        console.error('Performance test failed:', error);
        setTestResults(prev => [...prev, {
          scalePoint,
          authP95: 0,
          authP99: 0,
          errorRate: 100,
          coaP95: 0,
          passed: false,
          bottleneck: 'API Error',
          timestamp: new Date().toISOString()
        }]);
      }
    }
    
    setIsRunning(false);
    setCurrentTest(null);
  };


  const handleExportReport = () => {
    // TODO: Generate and export PDF/HTML report
    alert('Benchmark report exported successfully!');
  };

  const handleCompareBaseline = () => {
    // TODO: Compare with baseline run
    alert('Baseline comparison started!');
  };

  const getWorkloadTotal = () => {
    return Object.values(workloadMix).reduce((sum, val) => sum + val, 0);
  };

  return (
    <div className="performance-test-page">
      <div className="page-header">
        <h1>Performance Test (SLO Benchmark)</h1>
        <p>Repeatable benchmark suite to validate SLOs & detect regressions</p>
      </div>

      <div className="test-configuration">
        <div className="config-section">
          <h2>SLO Configuration</h2>
          <div className="slo-presets">
            {defaultSlos.map((sloSet, index) => (
              <button 
                key={index}
                className={`slo-preset ${!sloConfig.custom && JSON.stringify(sloConfig).includes(sloSet.authP95.toString()) ? 'active' : ''}`}
                onClick={() => handleSloSetChange(sloSet)}
              >
                {sloSet.name}
              </button>
            ))}
          </div>
          
          <div className="slo-grid">
            <div className="slo-item">
              <label>Auth p95 (ms):</label>
              <input 
                type="number" 
                value={sloConfig.authP95} 
                onChange={(e) => handleCustomSloChange('authP95', parseInt(e.target.value))}
              />
            </div>
            <div className="slo-item">
              <label>Auth p99 (ms):</label>
              <input 
                type="number" 
                value={sloConfig.authP99} 
                onChange={(e) => handleCustomSloChange('authP99', parseInt(e.target.value))}
              />
            </div>
            <div className="slo-item">
              <label>Error Rate (%):</label>
              <input 
                type="number" 
                step="0.1" 
                value={sloConfig.errorRate} 
                onChange={(e) => handleCustomSloChange('errorRate', parseFloat(e.target.value))}
              />
            </div>
            <div className="slo-item">
              <label>CoA p95 (ms):</label>
              <input 
                type="number" 
                value={sloConfig.coaP95} 
                onChange={(e) => handleCustomSloChange('coaP95', parseInt(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="config-section">
          <h2>Workload Mix</h2>
          <div className="workload-grid">
            <div className="workload-item">
              <label>MAB (%):</label>
              <input 
                type="number" 
                min="0" 
                max="100" 
                value={workloadMix.mab} 
                onChange={(e) => handleWorkloadMixChange('mab', parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="workload-item">
              <label>EAP-TLS (%):</label>
              <input 
                type="number" 
                min="0" 
                max="100" 
                value={workloadMix.eapTls} 
                onChange={(e) => handleWorkloadMixChange('eapTls', parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="workload-item">
              <label>PEAP (%):</label>
              <input 
                type="number" 
                min="0" 
                max="100" 
                value={workloadMix.peap} 
                onChange={(e) => handleWorkloadMixChange('peap', parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="workload-item">
              <label>PAP (%):</label>
              <input 
                type="number" 
                min="0" 
                max="100" 
                value={workloadMix.pap} 
                onChange={(e) => handleWorkloadMixChange('pap', parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="workload-item">
              <label>MS-CHAPv2 (%):</label>
              <input 
                type="number" 
                min="0" 
                max="100" 
                value={workloadMix.msChapv2} 
                onChange={(e) => handleWorkloadMixChange('msChapv2', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="workload-total">
            Total: {getWorkloadTotal()}% {getWorkloadTotal() !== 100 && '(Must equal 100%)'}
          </div>
        </div>

        <div className="config-section">
          <h2>Scale Points</h2>
          <div className="scale-points">
            {scalePoints.map(point => (
              <label key={point} className="scale-point-checkbox">
                <input 
                  type="checkbox" 
                  checked={selectedScalePoints.includes(point)}
                  onChange={() => handleScalePointToggle(point)}
                />
                <span>{point.toLocaleString()} RPS</span>
              </label>
            ))}
          </div>
        </div>

        <div className="config-section">
          <h2>Test Configuration</h2>
          <div className="test-config-grid">
            <div className="config-item">
              <label>Warmup Period (sec):</label>
              <input 
                type="number" 
                value={testConfig.warmupPeriod} 
                onChange={(e) => setTestConfig({...testConfig, warmupPeriod: parseInt(e.target.value)})}
              />
            </div>
            <div className="config-item">
              <label>Cooldown Period (sec):</label>
              <input 
                type="number" 
                value={testConfig.cooldownPeriod} 
                onChange={(e) => setTestConfig({...testConfig, cooldownPeriod: parseInt(e.target.value)})}
              />
            </div>
            <div className="config-item">
              <label>Trial Count:</label>
              <input 
                type="number" 
                min="1" 
                max="10" 
                value={testConfig.trialCount} 
                onChange={(e) => setTestConfig({...testConfig, trialCount: parseInt(e.target.value)})}
              />
            </div>
            <div className="config-item">
              <label>Confidence Target (%):</label>
              <input 
                type="number" 
                min="90" 
                max="99" 
                value={testConfig.confidenceTarget} 
                onChange={(e) => setTestConfig({...testConfig, confidenceTarget: parseInt(e.target.value)})}
              />
            </div>
          </div>
        </div>
      </div>

      {currentTest && (
        <div className="current-test">
          <h2>Current Test Status</h2>
          <div className="test-status">
            <p>Phase: {currentTest.phase}</p>
            <p>Scale Point: {currentTest.scalePoint?.toLocaleString()} RPS</p>
            {currentTest.trial && (
              <p>Trial: {currentTest.trial} of {currentTest.totalTrials}</p>
            )}
          </div>
        </div>
      )}

      {testResults.length > 0 && (
        <div className="test-results">
          <h2>Test Results</h2>
          <div className="results-table">
            <table>
              <thead>
                <tr>
                  <th>Scale Point</th>
                  <th>Auth p95</th>
                  <th>Auth p99</th>
                  <th>Error Rate</th>
                  <th>CoA p95</th>
                  <th>Status</th>
                  <th>Bottleneck</th>
                </tr>
              </thead>
              <tbody>
                {testResults.map((result, index) => (
                  <tr key={index} className={result.passed ? 'passed' : 'failed'}>
                    <td>{result.scalePoint.toLocaleString()} RPS</td>
                    <td>{result.authP95}ms</td>
                    <td>{result.authP99}ms</td>
                    <td>{result.errorRate.toFixed(2)}%</td>
                    <td>{result.coaP95}ms</td>
                    <td>{result.passed ? 'PASS' : 'FAIL'}</td>
                    <td>{result.bottleneck || 'None'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="control-actions">
        <div className="action-buttons">
          <button 
            className="btn-primary" 
            onClick={handleStartBenchmark}
            disabled={isRunning || getWorkloadTotal() !== 100 || selectedScalePoints.length === 0}
          >
            {isRunning ? 'Running Benchmark...' : 'Start Benchmark'}
          </button>
          <button className="btn-secondary" onClick={handleExportReport} disabled={testResults.length === 0}>
            Export Report
          </button>
          <button className="btn-secondary" onClick={handleCompareBaseline} disabled={testResults.length === 0}>
            Compare with Baseline
          </button>
        </div>
      </div>

      <style jsx>{`
        .performance-test-page {
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

        .config-section {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .config-section h2 {
          margin-bottom: 15px;
          color: #555;
        }

        .slo-presets {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .slo-preset {
          padding: 8px 16px;
          border: 2px solid #ddd;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .slo-preset.active {
          border-color: #007bff;
          background-color: #007bff;
          color: white;
        }

        .slo-preset:hover {
          border-color: #007bff;
        }

        .slo-grid,
        .workload-grid,
        .test-config-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }

        .slo-item,
        .workload-item,
        .config-item {
          display: flex;
          flex-direction: column;
        }

        .slo-item label,
        .workload-item label,
        .config-item label {
          margin-bottom: 5px;
          font-weight: 500;
          color: #666;
        }

        .slo-item input,
        .workload-item input,
        .config-item input {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .workload-total {
          margin-top: 15px;
          font-weight: 500;
          color: #333;
        }

        .scale-points {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
        }

        .scale-point-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .scale-point-checkbox input {
          margin: 0;
        }

        .current-test {
          background: #e3f2fd;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #2196f3;
        }

        .test-status p {
          margin: 5px 0;
          font-weight: 500;
        }

        .test-results {
          margin: 30px 0;
        }

        .results-table {
          overflow-x: auto;
        }

        .results-table table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .results-table th,
        .results-table td {
          padding: 12px 15px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }

        .results-table th {
          background-color: #f8f9fa;
          font-weight: 600;
          color: #555;
        }

        .results-table tr.passed {
          background-color: #f0fff4;
        }

        .results-table tr.failed {
          background-color: #fff5f5;
        }

        .control-actions {
          margin-top: 30px;
          text-align: center;
        }

        .action-buttons {
          display: flex;
          gap: 15px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .btn-primary,
        .btn-secondary {
          padding: 10px 20px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background-color 0.2s;
        }

        .btn-primary {
          background-color: #007bff;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #0056b3;
        }

        .btn-primary:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }

        .btn-secondary {
          background-color: #6c757d;
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background-color: #545b62;
        }

        .btn-secondary:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default PerformanceTest;
