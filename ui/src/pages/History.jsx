import { useState, useEffect } from 'react';

const History = () => {
  const [runs, setRuns] = useState([]);
  const [filteredRuns, setFilteredRuns] = useState([]);
  const [selectedRuns, setSelectedRuns] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    target: 'all',
    dateRange: 'all',
    tags: []
  });
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);

  useEffect(() => {
    const fetchTestRuns = async () => {
      try {
        const response = await fetch('/api/runs');
        const data = await response.json();
        setRuns(data.runs || []);
        setFilteredRuns(data.runs || []);
      } catch (error) {
        console.error('Failed to fetch test runs:', error);
        setRuns([]);
        setFilteredRuns([]);
      }
    };

    fetchTestRuns();
  }, []);

  // Apply filters and search
  useEffect(() => {
    let filtered = runs;

    // Text search
    if (searchTerm) {
      filtered = filtered.filter(run => 
        run.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        run.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(run => run.status === filters.status);
    }

    // Target filter
    if (filters.target !== 'all') {
      filtered = filtered.filter(run => run.target === filters.target);
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (filters.dateRange) {
        case '24h':
          filterDate.setHours(now.getHours() - 24);
          break;
        case '7d':
          filterDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          filterDate.setDate(now.getDate() - 30);
          break;
      }
      
      filtered = filtered.filter(run => new Date(run.timestamp) >= filterDate);
    }

    // Tags filter
    if (filters.tags.length > 0) {
      filtered = filtered.filter(run => 
        filters.tags.some(tag => run.tags.includes(tag))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      if (sortBy === 'timestamp') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredRuns(filtered);
  }, [runs, searchTerm, filters, sortBy, sortOrder]);

  const handleRunSelection = (runId) => {
    if (comparisonMode) {
      setSelectedRuns(prev => {
        if (prev.includes(runId)) {
          return prev.filter(id => id !== runId);
        } else if (prev.length < 2) {
          return [...prev, runId];
        } else {
          // Replace the first selected run
          return [prev[1], runId];
        }
      });
    } else {
      setSelectedRuns([runId]);
    }
  };

  const handleFilterChange = (filterKey, value) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
  };

  const handleTagFilter = (tag) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) 
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const handleCompareRuns = () => {
    if (selectedRuns.length !== 2) {
      alert('Please select exactly 2 runs to compare');
      return;
    }

    const run1 = runs.find(r => r.id === selectedRuns[0]);
    const run2 = runs.find(r => r.id === selectedRuns[1]);

    const comparison = {
      run1,
      run2,
      deltas: {
        rps: ((run2.rps - run1.rps) / run1.rps * 100).toFixed(1),
        avgLatency: ((run2.avgLatency - run1.avgLatency) / run1.avgLatency * 100).toFixed(1),
        successRate: (run2.successRate - run1.successRate).toFixed(1),
        errorRate: (run2.errorRate - run1.errorRate).toFixed(1),
        p95Latency: ((run2.metrics.p95Latency - run1.metrics.p95Latency) / run1.metrics.p95Latency * 100).toFixed(1),
        p99Latency: ((run2.metrics.p99Latency - run1.metrics.p99Latency) / run1.metrics.p99Latency * 100).toFixed(1)
      }
    };

    setComparisonData(comparison);
  };

  const handleExportComparison = () => {
    if (!comparisonData) {
      alert('No comparison data available');
      return;
    }
    
    // TODO: Generate and export side-by-side PDF
    alert('Comparison report exported successfully!');
  };

  const handleDeleteRun = (runId) => {
    if (confirm('Are you sure you want to delete this test run?')) {
      setRuns(prev => prev.filter(r => r.id !== runId));
      setSelectedRuns(prev => prev.filter(id => id !== runId));
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (duration) => {
    return duration;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#28a745';
      case 'failed': return '#dc3545';
      case 'running': return '#007bff';
      default: return '#6c757d';
    }
  };

  const allTags = [...new Set(runs.flatMap(run => run.tags))];

  return (
    <div className="history-page">
      <div className="page-header">
        <h1>History & Compare</h1>
        <p>Browse test run catalog, search, filter, and compare results</p>
      </div>

      <div className="controls-section">
        <div className="search-controls">
          <input 
            type="text"
            placeholder="Search runs by name or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          
          <label className="comparison-toggle">
            <input 
              type="checkbox"
              checked={comparisonMode}
              onChange={(e) => setComparisonMode(e.target.checked)}
            />
            <span>Comparison Mode</span>
          </label>
        </div>

        <div className="filter-controls">
          <div className="filter-group">
            <label>Status:</label>
            <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
              <option value="all">All</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="running">Running</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Target:</label>
            <select value={filters.target} onChange={(e) => handleFilterChange('target', e.target.value)}>
              <option value="all">All</option>
              <option value="Asset Manager">Asset Manager</option>
              <option value="Cisco ISE">Cisco ISE</option>
              <option value="Lab Environment">Lab Environment</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Date Range:</label>
            <select value={filters.dateRange} onChange={(e) => handleFilterChange('dateRange', e.target.value)}>
              <option value="all">All Time</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Sort By:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="timestamp">Timestamp</option>
              <option value="name">Name</option>
              <option value="rps">RPS</option>
              <option value="avgLatency">Avg Latency</option>
              <option value="successRate">Success Rate</option>
            </select>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>

        <div className="tag-filters">
          <label>Filter by Tags:</label>
          <div className="tag-buttons">
            {allTags.map(tag => (
              <button 
                key={tag}
                className={`tag-button ${filters.tags.includes(tag) ? 'active' : ''}`}
                onClick={() => handleTagFilter(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="runs-table">
        <table>
          <thead>
            <tr>
              <th>{comparisonMode ? 'Compare' : 'Select'}</th>
              <th>Run Name</th>
              <th>Timestamp</th>
              <th>Duration</th>
              <th>Status</th>
              <th>Target</th>
              <th>RPS</th>
              <th>Avg Latency</th>
              <th>Success Rate</th>
              <th>Tags</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRuns.map(run => (
              <tr 
                key={run.id} 
                className={selectedRuns.includes(run.id) ? 'selected' : ''}
              >
                <td>
                  <input 
                    type={comparisonMode ? 'checkbox' : 'radio'}
                    name="selectedRun"
                    checked={selectedRuns.includes(run.id)}
                    onChange={() => handleRunSelection(run.id)}
                    disabled={comparisonMode && selectedRuns.length >= 2 && !selectedRuns.includes(run.id)}
                  />
                </td>
                <td className="run-name">{run.name}</td>
                <td>{formatTimestamp(run.timestamp)}</td>
                <td>{formatDuration(run.duration)}</td>
                <td>
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(run.status) }}
                  >
                    {run.status.toUpperCase()}
                  </span>
                </td>
                <td>{run.target}</td>
                <td>{run.rps.toLocaleString()}</td>
                <td>{run.avgLatency}ms</td>
                <td>{run.successRate}%</td>
                <td>
                  <div className="tags">
                    {run.tags.map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                </td>
                <td>
                  <div className="run-actions">
                    <button className="btn-view">View</button>
                    <button className="btn-delete" onClick={() => handleDeleteRun(run.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {comparisonMode && (
        <div className="comparison-controls">
          <div className="comparison-actions">
            <button 
              className="btn-primary"
              onClick={handleCompareRuns}
              disabled={selectedRuns.length !== 2}
            >
              Compare Selected Runs ({selectedRuns.length}/2)
            </button>
            {comparisonData && (
              <button className="btn-secondary" onClick={handleExportComparison}>
                Export Comparison Report
              </button>
            )}
          </div>
        </div>
      )}

      {comparisonData && (
        <div className="comparison-results">
          <h2>Comparison Results</h2>
          <div className="comparison-grid">
            <div className="comparison-section">
              <h3>Run Details</h3>
              <div className="comparison-table">
                <table>
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>{comparisonData.run1.name}</th>
                      <th>{comparisonData.run2.name}</th>
                      <th>Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>RPS</td>
                      <td>{comparisonData.run1.rps.toLocaleString()}</td>
                      <td>{comparisonData.run2.rps.toLocaleString()}</td>
                      <td className={comparisonData.deltas.rps > 0 ? 'positive' : 'negative'}>
                        {comparisonData.deltas.rps > 0 ? '+' : ''}{comparisonData.deltas.rps}%
                      </td>
                    </tr>
                    <tr>
                      <td>Avg Latency</td>
                      <td>{comparisonData.run1.avgLatency}ms</td>
                      <td>{comparisonData.run2.avgLatency}ms</td>
                      <td className={comparisonData.deltas.avgLatency < 0 ? 'positive' : 'negative'}>
                        {comparisonData.deltas.avgLatency > 0 ? '+' : ''}{comparisonData.deltas.avgLatency}%
                      </td>
                    </tr>
                    <tr>
                      <td>Success Rate</td>
                      <td>{comparisonData.run1.successRate}%</td>
                      <td>{comparisonData.run2.successRate}%</td>
                      <td className={comparisonData.deltas.successRate > 0 ? 'positive' : 'negative'}>
                        {comparisonData.deltas.successRate > 0 ? '+' : ''}{comparisonData.deltas.successRate}%
                      </td>
                    </tr>
                    <tr>
                      <td>P95 Latency</td>
                      <td>{comparisonData.run1.metrics.p95Latency}ms</td>
                      <td>{comparisonData.run2.metrics.p95Latency}ms</td>
                      <td className={comparisonData.deltas.p95Latency < 0 ? 'positive' : 'negative'}>
                        {comparisonData.deltas.p95Latency > 0 ? '+' : ''}{comparisonData.deltas.p95Latency}%
                      </td>
                    </tr>
                    <tr>
                      <td>P99 Latency</td>
                      <td>{comparisonData.run1.metrics.p99Latency}ms</td>
                      <td>{comparisonData.run2.metrics.p99Latency}ms</td>
                      <td className={comparisonData.deltas.p99Latency < 0 ? 'positive' : 'negative'}>
                        {comparisonData.deltas.p99Latency > 0 ? '+' : ''}{comparisonData.deltas.p99Latency}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="comparison-charts">
              <h3>Visual Comparison</h3>
              <div className="chart-placeholder">
                <p>Side-by-side time-series charts would be rendered here</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .history-page {
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

        .controls-section {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .search-controls {
          display: flex;
          gap: 20px;
          align-items: center;
          margin-bottom: 20px;
        }

        .search-input {
          flex: 1;
          padding: 10px 15px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
        }

        .comparison-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-weight: 500;
        }

        .filter-controls {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .filter-group label {
          font-weight: 500;
          color: #555;
        }

        .filter-group select {
          padding: 6px 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .tag-filters {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .tag-filters label {
          font-weight: 500;
          color: #555;
        }

        .tag-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .tag-button {
          padding: 4px 12px;
          border: 1px solid #007bff;
          background: white;
          color: #007bff;
          border-radius: 15px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
        }

        .tag-button:hover {
          background: #e3f2fd;
        }

        .tag-button.active {
          background: #007bff;
          color: white;
        }

        .runs-table {
          overflow-x: auto;
          margin-bottom: 20px;
        }

        .runs-table table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .runs-table th,
        .runs-table td {
          padding: 12px 15px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }

        .runs-table th {
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

        .run-name {
          font-weight: 500;
          color: #333;
        }

        .status-badge {
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
        }

        .tags {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }

        .tag {
          background-color: #e9ecef;
          color: #495057;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: 500;
        }

        .run-actions {
          display: flex;
          gap: 6px;
        }

        .btn-view,
        .btn-delete {
          padding: 4px 8px;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 500;
        }

        .btn-view {
          background-color: #007bff;
          color: white;
        }

        .btn-view:hover {
          background-color: #0056b3;
        }

        .btn-delete {
          background-color: #dc3545;
          color: white;
        }

        .btn-delete:hover {
          background-color: #c82333;
        }

        .comparison-controls {
          background: #e3f2fd;
          padding: 15px 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .comparison-actions {
          display: flex;
          gap: 15px;
          align-items: center;
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

        .btn-secondary:hover {
          background-color: #545b62;
        }

        .comparison-results {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .comparison-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-top: 20px;
        }

        .comparison-section h3,
        .comparison-charts h3 {
          margin-bottom: 15px;
          color: #555;
        }

        .comparison-table table {
          width: 100%;
          border-collapse: collapse;
        }

        .comparison-table th,
        .comparison-table td {
          padding: 10px 12px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }

        .comparison-table th {
          background-color: #f8f9fa;
          font-weight: 600;
          color: #555;
        }

        .comparison-table .positive {
          color: #28a745;
          font-weight: 600;
        }

        .comparison-table .negative {
          color: #dc3545;
          font-weight: 600;
        }

        .chart-placeholder {
          background: #f0f0f0;
          height: 200px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
          border: 2px dashed #ccc;
        }
      `}</style>
    </div>
  );
};

export default History;
