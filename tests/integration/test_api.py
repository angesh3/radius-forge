#!/usr/bin/env python3
"""
Integration Tests for FastAPI Endpoints
Tests API endpoints with database integration
"""

import pytest
import json
from httpx import AsyncClient
from datetime import datetime, timedelta

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src'))

from api.models import TestRun, TestStatus, TestType, NAD


class TestHealthEndpoints:
    """Test health and status endpoints"""
    
    @pytest.mark.integration
    async def test_root_endpoint(self, async_client: AsyncClient):
        """Test root endpoint"""
        response = await async_client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["name"] == "RadiusForge API"
        assert data["version"] == "1.0.0"
        assert data["status"] == "online"
        assert "timestamp" in data
    
    @pytest.mark.integration
    async def test_health_check(self, async_client: AsyncClient):
        """Test health check endpoint"""
        response = await async_client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert "services" in data
        
        services = data["services"]
        assert services["api"] == "online"
        assert services["database"] == "connected"
        assert services["websocket"] == "active"
        assert services["generators"] == "ready"


class TestRunsAPI:
    """Test test runs API endpoints"""
    
    @pytest.mark.integration
    async def test_create_test_run(self, async_client: AsyncClient, sample_test_run_data):
        """Test creating a new test run"""
        response = await async_client.post("/api/runs/", json=sample_test_run_data)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["name"] == sample_test_run_data["name"]
        assert data["test_type"] == sample_test_run_data["test_type"].value
        assert data["target_rps"] == sample_test_run_data["target_rps"]
        assert data["status"] == "pending"
        assert "id" in data
        assert "created_at" in data
    
    @pytest.mark.integration
    async def test_create_test_run_validation(self, async_client: AsyncClient):
        """Test test run creation validation"""
        invalid_data = {
            "name": "",  # Invalid: empty name
            "target_rps": -1,  # Invalid: negative RPS
            "duration_seconds": 5,  # Invalid: too short
            "radius_server_host": "",  # Invalid: empty host
        }
        
        response = await async_client.post("/api/runs/", json=invalid_data)
        assert response.status_code == 422  # Validation error
    
    @pytest.mark.integration
    async def test_list_test_runs(self, async_client: AsyncClient, sample_test_run):
        """Test listing test runs"""
        response = await async_client.get("/api/runs/")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) >= 1
        
        # Verify the sample test run is in the list
        test_run_ids = [run["id"] for run in data]
        assert sample_test_run.id in test_run_ids
    
    @pytest.mark.integration
    async def test_list_test_runs_filtering(self, async_client: AsyncClient, sample_test_run):
        """Test filtering test runs"""
        # Filter by status
        response = await async_client.get("/api/runs/?status=pending")
        assert response.status_code == 200
        
        data = response.json()
        for run in data:
            assert run["status"] == "pending"
        
        # Filter by test type
        response = await async_client.get("/api/runs/?test_type=performance")
        assert response.status_code == 200
        
        data = response.json()
        for run in data:
            assert run["test_type"] == "performance"
    
    @pytest.mark.integration
    async def test_list_test_runs_pagination(self, async_client: AsyncClient):
        """Test pagination of test runs"""
        # Test with limit
        response = await async_client.get("/api/runs/?limit=1")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) <= 1
        
        # Test with skip
        response = await async_client.get("/api/runs/?skip=0&limit=10")
        assert response.status_code == 200
    
    @pytest.mark.integration
    async def test_get_test_run(self, async_client: AsyncClient, sample_test_run):
        """Test getting a specific test run"""
        response = await async_client.get(f"/api/runs/{sample_test_run.id}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == sample_test_run.id
        assert data["name"] == sample_test_run.name
        assert data["test_type"] == sample_test_run.test_type.value
        assert data["target_rps"] == sample_test_run.target_rps
    
    @pytest.mark.integration
    async def test_get_test_run_not_found(self, async_client: AsyncClient):
        """Test getting non-existent test run"""
        response = await async_client.get("/api/runs/nonexistent-id")
        assert response.status_code == 404
    
    @pytest.mark.integration
    async def test_update_test_run(self, async_client: AsyncClient, sample_test_run):
        """Test updating a test run"""
        update_data = {
            "name": "Updated Test Name",
            "target_rps": 2000,
            "description": "Updated description"
        }
        
        response = await async_client.put(f"/api/runs/{sample_test_run.id}", json=update_data)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["name"] == update_data["name"]
        assert data["target_rps"] == update_data["target_rps"]
        assert data["description"] == update_data["description"]
    
    @pytest.mark.integration
    async def test_update_running_test_run(self, async_client: AsyncClient, db_session):
        """Test updating a running test run (should fail)"""
        # Create a running test run
        test_run = TestRun(
            name="Running Test",
            test_type=TestType.PERFORMANCE,
            status=TestStatus.RUNNING,
            target_rps=1000,
            duration_seconds=300,
            radius_server_host="127.0.0.1",
            radius_secret="secret"
        )
        db_session.add(test_run)
        await db_session.commit()
        await db_session.refresh(test_run)
        
        update_data = {"name": "Should Not Update"}
        response = await async_client.put(f"/api/runs/{test_run.id}", json=update_data)
        
        assert response.status_code == 400
        assert "Cannot update running test" in response.json()["detail"]
    
    @pytest.mark.integration
    async def test_delete_test_run(self, async_client: AsyncClient, db_session, sample_test_run_data):
        """Test deleting a test run"""
        # Create a test run for deletion
        test_run = TestRun(**sample_test_run_data)
        db_session.add(test_run)
        await db_session.commit()
        await db_session.refresh(test_run)
        
        response = await async_client.delete(f"/api/runs/{test_run.id}")
        
        assert response.status_code == 200
        assert response.json()["message"] == "Test run deleted"
        
        # Verify it's deleted
        get_response = await async_client.get(f"/api/runs/{test_run.id}")
        assert get_response.status_code == 404
    
    @pytest.mark.integration
    async def test_start_test_run(self, async_client: AsyncClient, sample_test_run):
        """Test starting a test run"""
        response = await async_client.post(f"/api/runs/{sample_test_run.id}/start")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["message"] == "Test run started"
        assert data["test_run_id"] == sample_test_run.id
        
        # Verify status is updated
        get_response = await async_client.get(f"/api/runs/{sample_test_run.id}")
        updated_run = get_response.json()
        assert updated_run["status"] in ["starting", "running"]
    
    @pytest.mark.integration
    async def test_start_already_running_test(self, async_client: AsyncClient, db_session):
        """Test starting an already running test"""
        # Create a running test run
        test_run = TestRun(
            name="Already Running",
            test_type=TestType.PERFORMANCE,
            status=TestStatus.RUNNING,
            target_rps=1000,
            duration_seconds=300,
            radius_server_host="127.0.0.1",
            radius_secret="secret"
        )
        db_session.add(test_run)
        await db_session.commit()
        await db_session.refresh(test_run)
        
        response = await async_client.post(f"/api/runs/{test_run.id}/start")
        
        assert response.status_code == 400
        assert "already running" in response.json()["detail"]
    
    @pytest.mark.integration
    async def test_stop_test_run(self, async_client: AsyncClient, db_session):
        """Test stopping a test run"""
        # Create a running test run
        test_run = TestRun(
            name="Running Test",
            test_type=TestType.PERFORMANCE,
            status=TestStatus.RUNNING,
            target_rps=1000,
            duration_seconds=300,
            radius_server_host="127.0.0.1",
            radius_secret="secret"
        )
        db_session.add(test_run)
        await db_session.commit()
        await db_session.refresh(test_run)
        
        response = await async_client.post(f"/api/runs/{test_run.id}/stop")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["message"] == "Test run stopping"
        assert data["test_run_id"] == test_run.id
    
    @pytest.mark.integration
    async def test_stop_non_running_test(self, async_client: AsyncClient, sample_test_run):
        """Test stopping a non-running test"""
        response = await async_client.post(f"/api/runs/{sample_test_run.id}/stop")
        
        assert response.status_code == 400
        assert "not running" in response.json()["detail"]
    
    @pytest.mark.integration
    async def test_get_test_metrics(self, async_client: AsyncClient, sample_test_run, sample_metrics):
        """Test getting test run metrics"""
        response = await async_client.get(f"/api/runs/{sample_test_run.id}/metrics")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) == len(sample_metrics)
        
        # Verify metric structure
        for metric in data:
            assert "elapsed_seconds" in metric
            assert "current_rps" in metric
            assert "success_rate" in metric
            assert "avg_latency" in metric
    
    @pytest.mark.integration
    async def test_get_metrics_with_limit(self, async_client: AsyncClient, sample_test_run, sample_metrics):
        """Test getting metrics with limit"""
        response = await async_client.get(f"/api/runs/{sample_test_run.id}/metrics?limit=1")
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data) == 1


class TestTopologyAPI:
    """Test topology API endpoints"""
    
    @pytest.mark.integration
    async def test_topology_endpoints_exist(self, async_client: AsyncClient):
        """Test that topology endpoints are accessible"""
        # This is a basic test to ensure the topology router is included
        # More specific tests would depend on the actual topology implementation
        response = await async_client.get("/api/topology/")
        
        # Should not be 404 (endpoint exists)
        assert response.status_code != 404


class TestErrorHandling:
    """Test API error handling"""
    
    @pytest.mark.integration
    async def test_invalid_json(self, async_client: AsyncClient):
        """Test handling of invalid JSON"""
        response = await async_client.post(
            "/api/runs/",
            content="invalid json",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 422
    
    @pytest.mark.integration
    async def test_missing_required_fields(self, async_client: AsyncClient):
        """Test handling of missing required fields"""
        incomplete_data = {
            "name": "Test"
            # Missing required fields
        }
        
        response = await async_client.post("/api/runs/", json=incomplete_data)
        assert response.status_code == 422
    
    @pytest.mark.integration
    async def test_invalid_field_types(self, async_client: AsyncClient):
        """Test handling of invalid field types"""
        invalid_data = {
            "name": "Test",
            "target_rps": "not_a_number",  # Should be int
            "duration_seconds": "not_a_number",  # Should be int
            "radius_server_host": "127.0.0.1",
            "radius_secret": "secret"
        }
        
        response = await async_client.post("/api/runs/", json=invalid_data)
        assert response.status_code == 422


class TestConcurrency:
    """Test concurrent operations"""
    
    @pytest.mark.integration
    @pytest.mark.slow
    async def test_concurrent_test_creation(self, async_client: AsyncClient, sample_test_run_data):
        """Test creating multiple test runs concurrently"""
        import asyncio
        
        async def create_test_run(suffix):
            data = sample_test_run_data.copy()
            data["name"] = f"Concurrent Test {suffix}"
            response = await async_client.post("/api/runs/", json=data)
            return response
        
        # Create 5 test runs concurrently
        tasks = [create_test_run(i) for i in range(5)]
        responses = await asyncio.gather(*tasks)
        
        # All should succeed
        for response in responses:
            assert response.status_code == 200
        
        # All should have unique IDs
        ids = [response.json()["id"] for response in responses]
        assert len(set(ids)) == len(ids)  # All unique
    
    @pytest.mark.integration
    async def test_concurrent_read_operations(self, async_client: AsyncClient, sample_test_run):
        """Test concurrent read operations"""
        import asyncio
        
        async def get_test_run():
            response = await async_client.get(f"/api/runs/{sample_test_run.id}")
            return response
        
        # Make 10 concurrent requests
        tasks = [get_test_run() for _ in range(10)]
        responses = await asyncio.gather(*tasks)
        
        # All should succeed
        for response in responses:
            assert response.status_code == 200
            assert response.json()["id"] == sample_test_run.id


class TestDatabaseIntegration:
    """Test database integration aspects"""
    
    @pytest.mark.integration
    @pytest.mark.database
    async def test_transaction_rollback(self, async_client: AsyncClient, db_session):
        """Test that failed operations rollback properly"""
        # This test would require more complex setup to trigger actual rollbacks
        # For now, we test that the database state is consistent
        
        initial_count_response = await async_client.get("/api/runs/")
        initial_count = len(initial_count_response.json())
        
        # Try to create an invalid test run
        invalid_data = {
            "name": "Test",
            "target_rps": -1,  # Invalid
            "duration_seconds": 300,
            "radius_server_host": "127.0.0.1",
            "radius_secret": "secret"
        }
        
        response = await async_client.post("/api/runs/", json=invalid_data)
        assert response.status_code == 422
        
        # Verify count hasn't changed
        final_count_response = await async_client.get("/api/runs/")
        final_count = len(final_count_response.json())
        
        assert final_count == initial_count
    
    @pytest.mark.integration
    @pytest.mark.database
    async def test_cascade_deletion(self, async_client: AsyncClient, sample_test_run, sample_metrics):
        """Test that related records are properly deleted"""
        # Get initial metrics count
        metrics_response = await async_client.get(f"/api/runs/{sample_test_run.id}/metrics")
        assert len(metrics_response.json()) > 0
        
        # Delete the test run
        delete_response = await async_client.delete(f"/api/runs/{sample_test_run.id}")
        assert delete_response.status_code == 200
        
        # Verify test run is gone
        get_response = await async_client.get(f"/api/runs/{sample_test_run.id}")
        assert get_response.status_code == 404
        
        # Verify metrics are also gone (cascade delete)
        metrics_response = await async_client.get(f"/api/runs/{sample_test_run.id}/metrics")
        assert metrics_response.status_code == 404