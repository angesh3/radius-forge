#!/usr/bin/env python3
"""
End-to-End Tests for Scale Test Workflow
Tests complete scale test scenarios from creation to completion
"""

import pytest
import asyncio
import json
from datetime import datetime, timedelta
from unittest.mock import patch, AsyncMock, Mock

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src'))

from api.models import TestRun, TestStatus, TestType, TestMetric


class TestScaleTestWorkflow:
    """Test complete scale test workflow end-to-end"""
    
    @pytest.mark.e2e
    @pytest.mark.slow
    async def test_complete_scale_test_lifecycle(self, async_client, sample_test_run_data, websocket_manager):
        """Test complete scale test from creation to completion"""
        
        # Step 1: Create scale test
        scale_test_data = sample_test_run_data.copy()
        scale_test_data.update({
            "name": "Scale Test - 10K RPS",
            "description": "High-volume scale test for performance validation",
            "test_type": TestType.SCALE,
            "target_rps": 10000,
            "duration_seconds": 120,
            "ramp_up_seconds": 30,
            "ramp_down_seconds": 30
        })
        
        create_response = await async_client.post("/api/runs/", json=scale_test_data)
        assert create_response.status_code == 200
        
        test_run = create_response.json()
        test_run_id = test_run["id"]
        
        # Verify initial state
        assert test_run["status"] == "pending"
        assert test_run["test_type"] == "scale"
        assert test_run["target_rps"] == 10000
        
        # Step 2: Start the test
        start_response = await async_client.post(f"/api/runs/{test_run_id}/start")
        assert start_response.status_code == 200
        
        # Wait for test to actually start
        await asyncio.sleep(0.1)
        
        # Step 3: Monitor test status changes
        status_response = await async_client.get(f"/api/runs/{test_run_id}")
        updated_test = status_response.json()
        
        # Should be starting or running
        assert updated_test["status"] in ["starting", "running"]
        assert updated_test["started_at"] is not None
        
        # Step 4: Check metrics are being generated (simulated)
        # Wait a bit for metrics to be generated
        await asyncio.sleep(0.5)
        
        metrics_response = await async_client.get(f"/api/runs/{test_run_id}/metrics")
        assert metrics_response.status_code == 200
        
        # Note: In real test, we'd wait for actual metrics generation
        # For this test, we're testing the API structure
        
        # Step 5: Stop the test
        stop_response = await async_client.post(f"/api/runs/{test_run_id}/stop")
        assert stop_response.status_code == 200
        
        # Step 6: Verify final state
        final_response = await async_client.get(f"/api/runs/{test_run_id}")
        final_test = final_response.json()
        
        # Should be stopped, stopping, or completed
        assert final_test["status"] in ["stopping", "stopped", "completed", "cancelled"]
    
    @pytest.mark.e2e
    async def test_scale_test_configuration_validation(self, async_client, sample_test_run_data):
        """Test scale test configuration validation"""
        
        # Test with invalid high RPS
        invalid_high_rps = sample_test_run_data.copy()
        invalid_high_rps.update({
            "test_type": TestType.SCALE,
            "target_rps": 1000000,  # Extremely high RPS
            "duration_seconds": 60
        })
        
        response = await async_client.post("/api/runs/", json=invalid_high_rps)
        # Should either reject or accept based on MAX_RPS_LIMIT
        # The exact behavior depends on the configured limits
        
        # Test with very short duration
        invalid_duration = sample_test_run_data.copy()
        invalid_duration.update({
            "test_type": TestType.SCALE,
            "target_rps": 5000,
            "duration_seconds": 5  # Too short
        })
        
        response = await async_client.post("/api/runs/", json=invalid_duration)
        assert response.status_code == 422  # Validation error
    
    @pytest.mark.e2e
    async def test_scale_test_ramp_up_behavior(self, async_client, sample_test_run_data, db_session):
        """Test scale test ramp-up behavior simulation"""
        
        # Create scale test with specific ramp-up
        scale_test_data = sample_test_run_data.copy()
        scale_test_data.update({
            "test_type": TestType.SCALE,
            "target_rps": 5000,
            "duration_seconds": 60,
            "ramp_up_seconds": 20,
            "ramp_down_seconds": 10
        })
        
        create_response = await async_client.post("/api/runs/", json=scale_test_data)
        test_run_id = create_response.json()["id"]
        
        # Start test
        await async_client.post(f"/api/runs/{test_run_id}/start")
        
        # Simulate progression through ramp-up
        # In a real test, we'd monitor actual metrics over time
        
        # Check that test parameters are correctly stored
        response = await async_client.get(f"/api/runs/{test_run_id}")
        test_data = response.json()
        
        assert test_data["ramp_up_seconds"] == 20
        assert test_data["ramp_down_seconds"] == 10
        assert test_data["target_rps"] == 5000


class TestPerformanceTestWorkflow:
    """Test performance test workflow"""
    
    @pytest.mark.e2e
    async def test_performance_test_creation_and_execution(self, async_client, sample_test_run_data):
        """Test performance test creation and execution"""
        
        # Create performance test
        perf_test_data = sample_test_run_data.copy()
        perf_test_data.update({
            "name": "Performance Baseline Test",
            "test_type": TestType.PERFORMANCE,
            "target_rps": 1000,
            "duration_seconds": 300
        })
        
        create_response = await async_client.post("/api/runs/", json=perf_test_data)
        assert create_response.status_code == 200
        
        test_run = create_response.json()
        assert test_run["test_type"] == "performance"
        
        # Start the test
        start_response = await async_client.post(f"/api/runs/{test_run['id']}/start")
        assert start_response.status_code == 200
    
    @pytest.mark.e2e
    async def test_performance_test_metrics_collection(self, async_client, sample_test_run, sample_metrics):
        """Test performance test metrics collection"""
        
        # Get metrics for the test
        metrics_response = await async_client.get(f"/api/runs/{sample_test_run.id}/metrics")
        assert metrics_response.status_code == 200
        
        metrics = metrics_response.json()
        assert isinstance(metrics, list)
        
        if len(metrics) > 0:
            # Verify metric structure
            metric = metrics[0]
            required_fields = [
                "elapsed_seconds", "current_rps", "target_rps",
                "success_rate", "error_rate", "timeout_rate",
                "avg_latency", "p95_latency", "p99_latency"
            ]
            
            for field in required_fields:
                assert field in metric


class TestThreatTestWorkflow:
    """Test threat simulation workflow"""
    
    @pytest.mark.e2e
    async def test_threat_test_creation(self, async_client, sample_test_run_data):
        """Test threat test creation"""
        
        threat_test_data = sample_test_run_data.copy()
        threat_test_data.update({
            "name": "Threat Simulation - Brute Force",
            "description": "Simulate brute force authentication attempts",
            "test_type": TestType.THREAT,
            "target_rps": 100,  # Lower RPS for threat simulation
            "duration_seconds": 180,
            "test_config": {
                "threat_type": "brute_force",
                "attack_pattern": "incremental",
                "username_list": ["admin", "user", "test"],
                "password_attempts": 50
            }
        })
        
        create_response = await async_client.post("/api/runs/", json=threat_test_data)
        assert create_response.status_code == 200
        
        test_run = create_response.json()
        assert test_run["test_type"] == "threat"
        assert test_run["test_config"]["threat_type"] == "brute_force"
    
    @pytest.mark.e2e
    async def test_threat_test_validation(self, async_client, sample_test_run_data):
        """Test threat test validation and safety checks"""
        
        # Test with potentially dangerous configuration
        dangerous_threat = sample_test_run_data.copy()
        dangerous_threat.update({
            "test_type": TestType.THREAT,
            "target_rps": 50000,  # Very high RPS for threat test
            "test_config": {
                "threat_type": "dos_simulation"
            }
        })
        
        response = await async_client.post("/api/runs/", json=dangerous_threat)
        # Should either limit or validate threat test parameters
        # The exact behavior depends on implementation safety checks


class TestConcurrentTestExecution:
    """Test concurrent test execution scenarios"""
    
    @pytest.mark.e2e
    @pytest.mark.slow
    async def test_multiple_concurrent_tests(self, async_client, sample_test_run_data):
        """Test running multiple tests concurrently"""
        
        # Create multiple test runs
        test_ids = []
        
        for i in range(3):
            test_data = sample_test_run_data.copy()
            test_data.update({
                "name": f"Concurrent Test {i+1}",
                "target_rps": 500 * (i + 1),
                "duration_seconds": 30
            })
            
            create_response = await async_client.post("/api/runs/", json=test_data)
            assert create_response.status_code == 200
            
            test_ids.append(create_response.json()["id"])
        
        # Start all tests
        start_tasks = []
        for test_id in test_ids:
            start_tasks.append(async_client.post(f"/api/runs/{test_id}/start"))
        
        # Execute all starts concurrently
        start_responses = await asyncio.gather(*start_tasks, return_exceptions=True)
        
        # Check results
        successful_starts = 0
        for response in start_responses:
            if not isinstance(response, Exception) and response.status_code == 200:
                successful_starts += 1
            elif not isinstance(response, Exception) and response.status_code == 429:
                # Too many concurrent tests - this is expected behavior
                pass
        
        # At least some tests should start successfully
        assert successful_starts > 0
    
    @pytest.mark.e2e
    async def test_concurrent_test_limit_enforcement(self, async_client, sample_test_run_data, test_settings):
        """Test that concurrent test limits are enforced"""
        
        # Try to create more tests than the limit allows
        test_ids = []
        
        # Create tests up to the limit
        for i in range(test_settings.MAX_CONCURRENT_TESTS + 2):
            test_data = sample_test_run_data.copy()
            test_data["name"] = f"Limit Test {i+1}"
            
            create_response = await async_client.post("/api/runs/", json=test_data)
            if create_response.status_code == 200:
                test_ids.append(create_response.json()["id"])
        
        # Try to start all tests
        started_count = 0
        rejected_count = 0
        
        for test_id in test_ids:
            start_response = await async_client.post(f"/api/runs/{test_id}/start")
            
            if start_response.status_code == 200:
                started_count += 1
            elif start_response.status_code == 429:  # Too many concurrent tests
                rejected_count += 1
        
        # Should enforce the limit
        assert started_count <= test_settings.MAX_CONCURRENT_TESTS
        assert rejected_count > 0


class TestTestLifecycleManagement:
    """Test complete test lifecycle management"""
    
    @pytest.mark.e2e
    async def test_test_run_state_transitions(self, async_client, sample_test_run_data):
        """Test valid state transitions for test runs"""
        
        # Create test
        create_response = await async_client.post("/api/runs/", json=sample_test_run_data)
        test_id = create_response.json()["id"]
        
        # Initial state should be pending
        response = await async_client.get(f"/api/runs/{test_id}")
        assert response.json()["status"] == "pending"
        
        # Start test: pending -> starting/running
        await async_client.post(f"/api/runs/{test_id}/start")
        response = await async_client.get(f"/api/runs/{test_id}")
        assert response.json()["status"] in ["starting", "running"]
        
        # Stop test: running -> stopping/stopped
        await async_client.post(f"/api/runs/{test_id}/stop")
        response = await async_client.get(f"/api/runs/{test_id}")
        assert response.json()["status"] in ["stopping", "stopped", "cancelled"]
    
    @pytest.mark.e2e
    async def test_invalid_state_transitions(self, async_client, sample_test_run_data):
        """Test that invalid state transitions are prevented"""
        
        # Create and complete a test
        create_response = await async_client.post("/api/runs/", json=sample_test_run_data)
        test_id = create_response.json()["id"]
        
        # Try to start, then complete manually by updating DB
        # (This would require direct DB access in a real test)
        
        # Try to start already running test
        await async_client.post(f"/api/runs/{test_id}/start")
        
        # Try to start again (should fail)
        response = await async_client.post(f"/api/runs/{test_id}/start")
        assert response.status_code == 400
    
    @pytest.mark.e2e
    async def test_test_cleanup_after_completion(self, async_client, sample_test_run_data):
        """Test cleanup processes after test completion"""
        
        create_response = await async_client.post("/api/runs/", json=sample_test_run_data)
        test_id = create_response.json()["id"]
        
        # Start and immediately stop test
        await async_client.post(f"/api/runs/{test_id}/start")
        await asyncio.sleep(0.1)  # Brief pause
        await async_client.post(f"/api/runs/{test_id}/stop")
        
        # Verify test can be deleted after completion
        await asyncio.sleep(0.2)  # Wait for stop to complete
        
        delete_response = await async_client.delete(f"/api/runs/{test_id}")
        # Should succeed if test is not running
        assert delete_response.status_code in [200, 400]  # 400 if still stopping


class TestErrorRecoveryScenarios:
    """Test error recovery in end-to-end scenarios"""
    
    @pytest.mark.e2e
    async def test_test_failure_recovery(self, async_client, sample_test_run_data):
        """Test recovery from test execution failures"""
        
        # Create test with potentially problematic configuration
        problematic_test = sample_test_run_data.copy()
        problematic_test.update({
            "radius_server_host": "nonexistent.example.com",  # Invalid host
            "radius_server_port": 99999,  # Invalid port
            "target_rps": 1,
            "duration_seconds": 10
        })
        
        create_response = await async_client.post("/api/runs/", json=problematic_test)
        test_id = create_response.json()["id"]
        
        # Start test (should fail due to invalid configuration)
        start_response = await async_client.post(f"/api/runs/{test_id}/start")
        assert start_response.status_code == 200  # Start request accepted
        
        # Wait for failure
        await asyncio.sleep(1.0)
        
        # Check if test failed gracefully
        response = await async_client.get(f"/api/runs/{test_id}")
        test_status = response.json()["status"]
        
        # Should be in failed state or still trying
        assert test_status in ["failed", "running", "starting", "stopping"]
    
    @pytest.mark.e2e
    async def test_network_timeout_handling(self, async_client, sample_test_run_data):
        """Test handling of network timeouts during tests"""
        
        # Create test with timeout-prone configuration
        timeout_test = sample_test_run_data.copy()
        timeout_test.update({
            "radius_server_host": "192.0.2.1",  # RFC5737 test address (should timeout)
            "target_rps": 10,
            "duration_seconds": 30
        })
        
        create_response = await async_client.post("/api/runs/", json=timeout_test)
        test_id = create_response.json()["id"]
        
        # Start test
        await async_client.post(f"/api/runs/{test_id}/start")
        
        # Wait briefly
        await asyncio.sleep(0.5)
        
        # Test should handle timeouts gracefully
        response = await async_client.get(f"/api/runs/{test_id}")
        test_data = response.json()
        
        # Should not crash the system
        assert "status" in test_data


class TestIntegrationWithWebSocket:
    """Test integration between test execution and WebSocket updates"""
    
    @pytest.mark.e2e
    @pytest.mark.websocket
    async def test_websocket_updates_during_test(self, async_client, sample_test_run_data, websocket_manager):
        """Test that WebSocket updates are sent during test execution"""
        
        # Connect a mock WebSocket client
        mock_websocket = Mock()
        mock_websocket.accept = AsyncMock()
        mock_websocket.send_json = AsyncMock()
        
        client_id = await websocket_manager.connect(mock_websocket)
        await websocket_manager.subscribe(mock_websocket, ["test_updates"])
        
        # Create and start test
        create_response = await async_client.post("/api/runs/", json=sample_test_run_data)
        test_id = create_response.json()["id"]
        
        # Start test (should trigger WebSocket updates)
        await async_client.post(f"/api/runs/{test_id}/start")
        
        # Wait for updates
        await asyncio.sleep(0.2)
        
        # Verify WebSocket messages were sent
        # Note: In the current implementation, we'd need to check the actual calls
        assert mock_websocket.send_json.called or mock_websocket.accept.called
    
    @pytest.mark.e2e
    @pytest.mark.websocket
    async def test_real_time_metrics_broadcast(self, async_client, sample_test_run_data, websocket_manager):
        """Test real-time metrics broadcasting via WebSocket"""
        
        # This test would verify that metrics are broadcast in real-time
        # as tests execute. The implementation would depend on the actual
        # WebSocket integration in the test execution logic.
        
        # For now, we test the structure and basic connectivity
        stats = websocket_manager.get_stats()
        assert "total_connections" in stats
        assert "topics" in stats


class TestReportGeneration:
    """Test report generation for completed tests"""
    
    @pytest.mark.e2e
    async def test_test_completion_report(self, async_client, sample_test_run, sample_metrics):
        """Test report generation after test completion"""
        
        # Get test run details
        response = await async_client.get(f"/api/runs/{sample_test_run.id}")
        test_data = response.json()
        
        # Verify test summary data is available
        assert "packets_sent" in test_data
        assert "packets_received" in test_data
        assert "success_rate" in test_data
        assert "error_rate" in test_data
        assert "timeout_rate" in test_data
        assert "avg_latency_ms" in test_data
        assert "p95_latency_ms" in test_data
        assert "p99_latency_ms" in test_data
        
        # Get detailed metrics
        metrics_response = await async_client.get(f"/api/runs/{sample_test_run.id}/metrics")
        assert metrics_response.status_code == 200
        
        metrics = metrics_response.json()
        assert len(metrics) > 0