import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import enhancedTheme from './theme/enhancedTheme';
import GlobalStylesEnhanced from './components/GlobalStylesEnhanced';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ScaleTest from './pages/ScaleTest';
import PerformanceTestEnhanced from './pages/PerformanceTestEnhanced';
import ThreatGeneratorEnhanced from './pages/ThreatGeneratorEnhanced';
import ReportEnhanced from './pages/ReportEnhanced';
import TestCoverageReport from './pages/TestCoverageReport';
import TopologyInteractiveCorrected from './pages/TopologyInteractiveCorrected';
import History from './pages/History';
import HelpEnhanced from './pages/HelpEnhanced';
import LiveLogs from './pages/LiveLogs';
import Configuration from './pages/Configuration';
import QuickTest from './pages/QuickTest';

function App() {
  return (
    <ThemeProvider theme={enhancedTheme}>
      <CssBaseline />
      <GlobalStylesEnhanced />
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/live-logs" element={<LiveLogs />} />
            <Route path="/configuration" element={<Configuration />} />
            <Route path="/quick-test" element={<QuickTest />} />
            <Route path="/scale-test" element={<ScaleTest />} />
            <Route path="/performance-test" element={<PerformanceTestEnhanced />} />
            <Route path="/threat-generator" element={<ThreatGeneratorEnhanced />} />
            <Route path="/report" element={<ReportEnhanced />} />
            <Route path="/test-coverage" element={<TestCoverageReport />} />
            <Route path="/topology" element={<TopologyInteractiveCorrected />} />
            <Route path="/history" element={<History />} />
            <Route path="/help" element={<HelpEnhanced />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;
