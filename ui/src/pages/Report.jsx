import { useState, useEffect } from 'react';

const Report = () => {
  const [selectedRuns, setSelectedRuns] = useState([]);
  const [reportConfig, setReportConfig] = useState({
    format: 'PDF',
    includeCharts: true,
    includeConfig: true,
    includeIncidents: true,
    includeSloVerdicts: true,
    includeRegressionAnalysis: true
  });

  const [emailConfig, setEmailConfig] = useState({
    enabled: false,
    recipients: '',
    subject: 'RadiusForge Test Report - {runId}',
    smtpServer: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    smtpTls: true
  });

  const [availableRuns, setAvailableRuns] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReports, setGeneratedReports] = useState([]);

  // Mock data for available runs
  useEffect(() => {
    setAvailableRuns([
      {
        id: 'run-001',
        name: 'Scale Test 5K RPS',
        timestamp: '2024-08-14T10:30:00Z',
        duration: '00:05:30',
        target: 'Asset Manager',
        rps: 5000,
        status: 'completed',
        tags: ['nightly', '5k-rps']
      },
      {
        id: 'run-002',
        name: 'Performance Benchmark',
        timestamp: '2024-08-14T09:15:00Z',
        duration: '00:12:45',
        target: 'Cisco ISE',
        rps: 10000,
        status: 'completed',
        tags: ['benchmark', 'slo-validation']
      },
      {
        id: 'run-003',
        name: 'EAP-TLS Load Test',
        timestamp: '2024-08-14T08:00:00Z',
        duration: '00:08:20',
        target: 'Asset Manager',
        rps: 2500,
        status: 'completed',
        tags: ['eap-tls', 'tls-test']
      },
      {
        id: 'run-004',
        name: 'Threat Generation Test',
        timestamp: '2024-08-13T16:45:00Z',
        duration: '00:03:15',
        target: 'Lab Environment',
        rps: 1000,
        status: 'completed',
        tags: ['threat-gen', 'security-test']
      }
    ]);

    setGeneratedReports([
      {
        id: 'report-001',
        runId: 'run-001',
        format: 'PDF',
        generatedAt: '2024-08-14T10:35:00Z',
        fileSize: '2.4 MB',
        downloadUrl: '/api/reports/report-001.pdf'
      },
      {
        id: 'report-002',
        runId: 'run-002',
        format: 'HTML',
        generatedAt: '2024-08-14T09:20:00Z',
        fileSize: '1.8 MB',
        downloadUrl: '/api/reports/report-002.html'
      }
    ]);
  }, []);

  const handleRunSelection = (runId) => {
    setSelectedRuns(prev => 
      prev.includes(runId)
        ? prev.filter(id => id !== runId)
        : [...prev, runId]
    );
  };

  const handleConfigChange = (field, value) => {
    setReportConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEmailConfigChange = (field, value) => {
    setEmailConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleGenerateReport = async () => {
    if (selectedRuns.length === 0) {
      alert('Please select at least one test run');
      return;
    }

    setIsGenerating(true);
    
    // TODO: Call API to generate report
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const newReport = {
        id: `report-${Date.now()}`,
        runId: selectedRuns.length === 1 ? selectedRuns[0] : 'multiple',
        format: reportConfig.format,
        generatedAt: new Date().toISOString(),
        fileSize: `${(Math.random() * 5 + 1).toFixed(1)} MB`,
        downloadUrl: `/api/reports/report-${Date.now()}.${reportConfig.format.toLowerCase()}`
      };
      
      setGeneratedReports(prev => [newReport, ...prev]);
      
      if (emailConfig.enabled) {
        // TODO: Send email
        alert('Report generated and emailed successfully!');
      } else {
        alert('Report generated successfully!');
      }
    } catch (error) {
      alert('Error generating report: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadReport = (report) => {
    // TODO: Implement actual download
    alert(`Downloading ${report.format} report...`);
  };

  const handleDeleteReport = (reportId) => {
    if (confirm('Are you sure you want to delete this report?')) {
      setGeneratedReports(prev => prev.filter(r => r.id !== reportId));
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (duration) => {
    // Convert duration string to readable format
    return duration;
  };

  return (
    <div className="report-page">
      <div className="page-header">
        <h1>Report Generator</h1>
        <p>Produce and distribute human-readable summaries of test runs</p>
      </div>

      <div className="report-configuration">
        <div className="config-section">
          <h2>Select Test Runs</h2>
          <div className="runs-table">
            <table>
              <thead>
                <tr>
                  <th>Select</th>
                  <th>Run Name</th>
                  <th>Timestamp</th>
                  <th>Duration</th>
                  <th>Target</th>
                  <th>RPS</th>
                  <th>Tags</th>
                </tr>
              </thead>
              <tbody>
                {availableRuns.map(run => (
                  <tr key={run.id} className={selectedRuns.includes(run.id) ? 'selected' : ''}>
                    <td>
                      <input 
                        type="checkbox"
                        checked={selectedRuns.includes(run.id)}
                        onChange={() => handleRunSelection(run.id)}
                      />
                    </td>
                    <td>{run.name}</td>
                    <td>{formatTimestamp(run.timestamp)}</td>
                    <td>{formatDuration(run.duration)}</td>
                    <td>{run.target}</td>
                    <td>{run.rps.toLocaleString()}</td>
                    <td>
                      <div className="tags">
                        {run.tags.map(tag => (
                          <span key={tag} className="tag">{tag}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="config-section">
          <h2>Report Configuration</h2>
          <div className="config-grid">
            <div className="config-item">
              <label>Format:</label>
              <select 
                value={reportConfig.format} 
                onChange={(e) => handleConfigChange('format', e.target.value)}
              >
                <option value="PDF">PDF</option>
                <option value="HTML">HTML</option>
                <option value="CSV">CSV</option>
                <option value="JSON">JSON</option>
              </select>
            </div>
          </div>
          
          <div className="config-checkboxes">
            <label className="checkbox-label">
              <input 
                type="checkbox"
                checked={reportConfig.includeCharts}
                onChange={(e) => handleConfigChange('includeCharts', e.target.checked)}
              />
              <span>Include Charts (time-series, latency histogram, error taxonomy)</span>
            </label>
            <label className="checkbox-label">
              <input 
                type="checkbox"
                checked={reportConfig.includeConfig}
                onChange={(e) => handleConfigChange('includeConfig', e.target.checked)}
              />
              <span>Include Configuration Snapshot (JSON format)</span>
            </label>
            <label className="checkbox-label">
              <input 
                type="checkbox"
                checked={reportConfig.includeIncidents}
                onChange={(e) => handleConfigChange('includeIncidents', e.target.checked)}
              />
              <span>Include Top Incidents (timeouts, rejects with timestamps)</span>
            </label>
            <label className="checkbox-label">
              <input 
                type="checkbox"
                checked={reportConfig.includeSloVerdicts}
                onChange={(e) => handleConfigChange('includeSloVerdicts', e.target.checked)}
              />
              <span>Include SLO Verdicts and Pass/Fail Status</span>
            </label>
            <label className="checkbox-label">
              <input 
                type="checkbox"
                checked={reportConfig.includeRegressionAnalysis}
                onChange={(e) => handleConfigChange('includeRegressionAnalysis', e.target.checked)}
              />
              <span>Include Regression Analysis and Deltas</span>
            </label>
          </div>
        </div>

        <div className="config-section">
          <h2>Email Distribution</h2>
          <label className="checkbox-label email-toggle">
            <input 
              type="checkbox"
              checked={emailConfig.enabled}
              onChange={(e) => handleEmailConfigChange('enabled', e.target.checked)}
            />
            <span>Enable Email Distribution</span>
          </label>
          
          {emailConfig.enabled && (
            <div className="email-config">
              <div className="config-grid">
                <div className="config-item">
                  <label>Recipients (comma-separated):</label>
                  <textarea
                    value={emailConfig.recipients}
                    onChange={(e) => handleEmailConfigChange('recipients', e.target.value)}
                    placeholder="admin@company.com, team@company.com"
                    rows="2"
                  />
                </div>
                <div className="config-item">
                  <label>Subject Template:</label>
                  <input 
                    type="text"
                    value={emailConfig.subject}
                    onChange={(e) => handleEmailConfigChange('subject', e.target.value)}
                    placeholder="Use {runId}, {timestamp}, {target} placeholders"
                  />
                </div>
                <div className="config-item">
                  <label>SMTP Server:</label>
                  <input 
                    type="text"
                    value={emailConfig.smtpServer}
                    onChange={(e) => handleEmailConfigChange('smtpServer', e.target.value)}
                    placeholder="smtp.company.com"
                  />
                </div>
                <div className="config-item">
                  <label>SMTP Port:</label>
                  <input 
                    type="number"
                    value={emailConfig.smtpPort}
                    onChange={(e) => handleEmailConfigChange('smtpPort', parseInt(e.target.value))}
                  />
                </div>
                <div className="config-item">
                  <label>SMTP Username:</label>
                  <input 
                    type="text"
                    value={emailConfig.smtpUser}
                    onChange={(e) => handleEmailConfigChange('smtpUser', e.target.value)}
                  />
                </div>
                <div className="config-item">
                  <label>SMTP Password:</label>
                  <input 
                    type="password"
                    value={emailConfig.smtpPassword}
                    onChange={(e) => handleEmailConfigChange('smtpPassword', e.target.value)}
                  />
                </div>
              </div>
              <label className="checkbox-label">
                <input 
                  type="checkbox"
                  checked={emailConfig.smtpTls}
                  onChange={(e) => handleEmailConfigChange('smtpTls', e.target.checked)}
                />
                <span>Use TLS Encryption</span>
              </label>
            </div>
          )}
        </div>
      </div>

      <div className="generated-reports">
        <h2>Generated Reports</h2>
        {generatedReports.length === 0 ? (
          <p className="no-reports">No reports generated yet</p>
        ) : (
          <div className="reports-table">
            <table>
              <thead>
                <tr>
                  <th>Run ID</th>
                  <th>Format</th>
                  <th>Generated</th>
                  <th>File Size</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {generatedReports.map(report => (
                  <tr key={report.id}>
                    <td>{report.runId}</td>
                    <td>{report.format}</td>
                    <td>{formatTimestamp(report.generatedAt)}</td>
                    <td>{report.fileSize}</td>
                    <td>
                      <div className="report-actions">
                        <button 
                          className="btn-download"
                          onClick={() => handleDownloadReport(report)}
                        >
                          Download
                        </button>
                        <button 
                          className="btn-delete"
                          onClick={() => handleDeleteReport(report.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="control-actions">
        <div className="action-buttons">
          <button 
            className="btn-primary"
            onClick={handleGenerateReport}
            disabled={isGenerating || selectedRuns.length === 0}
          >
            {isGenerating ? 'Generating Report...' : 'Generate Report'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .report-page {
          padding: 20px;
          max-width: 1400px;
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

        .runs-table,
        .reports-table {
          overflow-x: auto;
        }

        .runs-table table,
        .reports-table table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .runs-table th,
        .runs-table td,
        .reports-table th,
        .reports-table td {
          padding: 12px 15px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }

        .runs-table th,
        .reports-table th {
          background-color: #f8f9fa;
          font-weight: 600;
          color: #555;
        }

        .runs-table tr.selected {
          background-color: #e3f2fd;
        }

        .runs-table tr:hover {
          background-color: #f5f5f5;
        }

        .tags {
          display: flex;
          gap: 5px;
          flex-wrap: wrap;
        }

        .tag {
          background-color: #007bff;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
        }

        .config-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }

        .config-item {
          display: flex;
          flex-direction: column;
        }

        .config-item label {
          margin-bottom: 5px;
          font-weight: 500;
          color: #666;
        }

        .config-item input,
        .config-item select,
        .config-item textarea {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .config-item textarea {
          resize: vertical;
          font-family: inherit;
        }

        .config-checkboxes {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          font-size: 14px;
        }

        .checkbox-label input {
          margin: 0;
        }

        .email-toggle {
          font-weight: 600;
          margin-bottom: 15px;
        }

        .email-config {
          border-top: 1px solid #ddd;
          padding-top: 20px;
        }

        .generated-reports {
          margin: 30px 0;
        }

        .no-reports {
          text-align: center;
          color: #666;
          font-style: italic;
          padding: 40px 0;
        }

        .report-actions {
          display: flex;
          gap: 8px;
        }

        .btn-download,
        .btn-delete {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
        }

        .btn-download {
          background-color: #28a745;
          color: white;
        }

        .btn-download:hover {
          background-color: #218838;
        }

        .btn-delete {
          background-color: #dc3545;
          color: white;
        }

        .btn-delete:hover {
          background-color: #c82333;
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

        .btn-primary {
          padding: 12px 24px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 500;
          background-color: #007bff;
          color: white;
          transition: background-color 0.2s;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #0056b3;
        }

        .btn-primary:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default Report;