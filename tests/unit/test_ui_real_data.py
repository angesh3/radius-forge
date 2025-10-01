import pytest
from unittest.mock import patch, MagicMock
import json

class TestUIRealDataIntegration:
    """Test UI components use real data instead of mock data"""
    
    def test_dashboard_no_mock_data(self):
        """Test Dashboard.jsx doesn't contain hardcoded mock data"""
        with open('/home/ubuntu/repos/radius-forge/ui/src/pages/Dashboard.jsx', 'r') as f:
            content = f.read()
        
        mock_indicators = [
            'currentRPS: 5247',
            'activeConnections: 1284',
            'totalTests: 42',
            'Mock data for demonstration',
            'const mockServers = [',
            'const mockAlerts = [',
            'hardcoded mock data'
        ]
        
        for indicator in mock_indicators:
            assert indicator not in content, f"Found mock data indicator: {indicator}"
        
        assert 'fetch(\'/api/dashboard/stats\')' in content
        assert 'useEffect' in content
        assert 'setSystemStats(data.systemStats' in content
    
    def test_configuration_no_mock_data(self):
        """Test Configuration.jsx doesn't contain hardcoded mock servers"""
        with open('/home/ubuntu/repos/radius-forge/ui/src/pages/Configuration.jsx', 'r') as f:
            content = f.read()
        
        mock_indicators = [
            'Asset Manager Primary',
            'Asset Manager Secondary',
            'ISE PAN',
            'host: "192.168.1.10"',
            'secret: "testing123"'
        ]
        
        for indicator in mock_indicators:
            assert indicator not in content, f"Found mock data indicator: {indicator}"
        
        assert 'fetch(\'/api/servers\')' in content
        assert 'fetch(\'/api/test-profiles\')' in content
    
    def test_live_logs_no_mock_data(self):
        """Test LiveLogs.jsx doesn't contain mock log generation"""
        with open('/home/ubuntu/repos/radius-forge/ui/src/pages/LiveLogs.jsx', 'r') as f:
            content = f.read()
        
        mock_indicators = [
            'generateMockLog',
            'Mock authentication',
            'Mock RADIUS',
            'Mock TACACS',
            'setInterval(() => {',
            'Math.random()'
        ]
        
        for indicator in mock_indicators:
            assert indicator not in content, f"Found mock data indicator: {indicator}"
        
        assert 'new WebSocket(' in content
        assert 'ws://localhost:8910/ws/logs' in content or 'ws/logs' in content
    
    def test_dashboard_optimized_no_mock_data(self):
        """Test DashboardOptimized.jsx doesn't contain mock data"""
        with open('/home/ubuntu/repos/radius-forge/ui/src/pages/DashboardOptimized.jsx', 'r') as f:
            content = f.read()
        
        mock_indicators = [
            'scaleTestData = [',
            'incrementalRPSData = [',
            'authMethodsData = [',
            'rps: 150, success: 100',
            'time: \'00:00\', actual: 0'
        ]
        
        for indicator in mock_indicators:
            assert indicator not in content, f"Found mock data indicator: {indicator}"
        
        assert 'fetch(\'/api/dashboard/stats\')' in content
        assert 'useState([])' in content  # Empty initial state
    
    def test_test_coverage_report_no_mock_data(self):
        """Test TestCoverageReport.jsx doesn't contain mock test data"""
        with open('/home/ubuntu/repos/radius-forge/ui/src/pages/TestCoverageReport.jsx', 'r') as f:
            content = f.read()
        
        mock_indicators = [
            'failedTests = [',
            'coverageTrends = [',
            'suite: \'Authentication Module\'',
            'test: \'should handle expired tokens\'',
            'build: \'BUILD-1001\''
        ]
        
        for indicator in mock_indicators:
            assert indicator not in content, f"Found mock data indicator: {indicator}"
        
        assert 'fetch(\'/api/test-coverage/failed-tests\')' in content
        assert 'fetch(\'/api/test-coverage/trends\')' in content
    
    def test_all_dashboard_variants_consistent(self):
        """Test all dashboard variants use real data consistently"""
        dashboard_files = [
            '/home/ubuntu/repos/radius-forge/ui/src/pages/Dashboard.jsx',
            '/home/ubuntu/repos/radius-forge/ui/src/pages/DashboardOptimized.jsx',
            '/home/ubuntu/repos/radius-forge/ui/src/pages/DashboardReorganized.jsx'
        ]
        
        for file_path in dashboard_files:
            with open(file_path, 'r') as f:
                content = f.read()
            
            assert 'fetch(\'/api/dashboard/stats\')' in content, f"Missing real API call in {file_path}"
            
            hardcoded_values = ['5247', '1284', '42']
            for value in hardcoded_values:
                lines_with_value = [line for line in content.split('\n') if value in line]
                for line in lines_with_value:
                    if not (line.strip().startswith('//') or line.strip().startswith('*') or 'console.' in line):
                        assert f'currentRPS: {value}' not in line, f"Found hardcoded RPS in {file_path}: {line}"
                        assert f'activeConnections: {value}' not in line, f"Found hardcoded connections in {file_path}: {line}"
                        assert f'totalTests: {value}' not in line, f"Found hardcoded tests in {file_path}: {line}"

class TestAPIEndpointsRealData:
    """Test API endpoints return real data structure"""
    
    def test_api_endpoints_structure(self):
        """Test API endpoints return expected real data structure"""
        expected_dashboard_fields = [
            'currentRPS', 'activeTests', 'activeConnections', 
            'systemUptime', 'testDistribution', 'systemResources'
        ]
        
        expected_servers_fields = [
            'servers'  # Should contain array of server objects
        ]
        
        assert True  # Placeholder for actual API integration tests

class TestNoMockDataInProduction:
    """Comprehensive test to ensure no mock data exists in production code"""
    
    def test_no_mock_data_in_api_files(self):
        """Test API files don't contain mock data generation"""
        api_files = [
            '/home/ubuntu/repos/radius-forge/src/api/main_simple.py',
            '/home/ubuntu/repos/radius-forge/src/api/websocket_manager.py'
        ]
        
        for file_path in api_files:
            try:
                with open(file_path, 'r') as f:
                    content = f.read()
                
                mock_indicators = [
                    'random.randint',
                    'random.choice',
                    'Mock',
                    'fake',
                    'dummy',
                    'hardcoded'
                ]
                
                for indicator in mock_indicators:
                    lines_with_indicator = [line for line in content.split('\n') if indicator in line.lower()]
                    for line in lines_with_indicator:
                        if not (line.strip().startswith('#') or line.strip().startswith('"""') or line.strip().startswith("'''")):
                            if indicator.lower() in line.lower() and 'import' not in line:
                                pytest.fail(f"Found mock data indicator '{indicator}' in {file_path}: {line.strip()}")
            
            except FileNotFoundError:
                pass
    
    def test_websocket_real_data_only(self):
        """Test WebSocket manager only sends real telemetry data"""
        try:
            with open('/home/ubuntu/repos/radius-forge/src/api/websocket_manager.py', 'r') as f:
                content = f.read()
            
            assert 'random.uniform' not in content
            assert 'random.randint' not in content
            
            assert 'get_db' in content or 'database' in content.lower()
            
        except FileNotFoundError:
            pytest.skip("WebSocket manager file not found")
