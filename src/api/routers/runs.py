#!/usr/bin/env python3
"""
RadiusForge Test Runs API Router
Endpoints for managing test run lifecycle (start, stop, status)
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import asyncio
import logging

from ..database import get_db
from ..models import TestRun, TestStatus, TestType, TestMetric
from ..websocket_manager import WebSocketManager
from ..config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

# Global test execution state
active_tests: Dict[str, asyncio.Task] = {}
ws_manager = WebSocketManager()


# Pydantic models for request/response
from pydantic import BaseModel, Field


class TestRunCreate(BaseModel):
    """Request model for creating a test run"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    test_type: TestType = TestType.PERFORMANCE
    target_rps: int = Field(..., ge=1, le=settings.MAX_RPS_LIMIT)
    duration_seconds: int = Field(..., ge=10, le=3600)
    ramp_up_seconds: int = Field(default=30, ge=0, le=300)
    ramp_down_seconds: int = Field(default=30, ge=0, le=300)
    radius_server_host: str = Field(..., min_length=1)
    radius_server_port: int = Field(default=1812, ge=1, le=65535)
    radius_secret: str = Field(..., min_length=1)
    test_config: Optional[Dict[str, Any]] = None


class TestRunUpdate(BaseModel):
    """Request model for updating a test run"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    target_rps: Optional[int] = Field(None, ge=1, le=settings.MAX_RPS_LIMIT)
    duration_seconds: Optional[int] = Field(None, ge=10, le=3600)
    test_config: Optional[Dict[str, Any]] = None


class TestRunResponse(BaseModel):
    """Response model for test run"""
    id: str
    name: str
    description: Optional[str]
    test_type: str
    status: str
    target_rps: int
    duration_seconds: int
    ramp_up_seconds: int
    ramp_down_seconds: int
    radius_server_host: str
    radius_server_port: int
    started_at: Optional[str]
    completed_at: Optional[str]
    created_at: str
    updated_at: str
    packets_sent: int
    packets_received: int
    success_rate: float
    error_rate: float
    timeout_rate: float
    avg_latency_ms: float
    p95_latency_ms: float
    p99_latency_ms: float
    test_config: Optional[Dict[str, Any]]
    error_details: Optional[Dict[str, Any]]


@router.get("/", response_model=List[TestRunResponse])
async def list_test_runs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[TestStatus] = None,
    test_type: Optional[TestType] = None,
    db: AsyncSession = Depends(get_db)
):
    """List test runs with filtering and pagination"""
    try:
        # Build query
        query = select(TestRun).order_by(desc(TestRun.created_at))
        
        # Apply filters
        if status:
            query = query.where(TestRun.status == status)
        if test_type:
            query = query.where(TestRun.test_type == test_type)
        
        # Apply pagination
        query = query.offset(skip).limit(limit)
        
        # Execute query
        result = await db.execute(query)
        test_runs = result.scalars().all()
        
        return [TestRunResponse(**test_run.to_dict()) for test_run in test_runs]
        
    except Exception as e:
        logger.error(f"Failed to list test runs: {e}")
        raise HTTPException(status_code=500, detail="Failed to list test runs")


@router.get("/{test_run_id}", response_model=TestRunResponse)
async def get_test_run(
    test_run_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific test run by ID"""
    try:
        result = await db.execute(select(TestRun).where(TestRun.id == test_run_id))
        test_run = result.scalar_one_or_none()
        
        if not test_run:
            raise HTTPException(status_code=404, detail="Test run not found")
        
        return TestRunResponse(**test_run.to_dict())
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get test run {test_run_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get test run")


@router.post("/", response_model=TestRunResponse)
async def create_test_run(
    test_run_data: TestRunCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new test run"""
    try:
        # Check concurrent test limit
        active_count = len([t for t in active_tests.values() if not t.done()])
        if active_count >= settings.MAX_CONCURRENT_TESTS:
            raise HTTPException(
                status_code=429, 
                detail=f"Maximum concurrent tests ({settings.MAX_CONCURRENT_TESTS}) reached"
            )
        
        # Create test run
        test_run = TestRun(
            name=test_run_data.name,
            description=test_run_data.description,
            test_type=test_run_data.test_type,
            target_rps=test_run_data.target_rps,
            duration_seconds=test_run_data.duration_seconds,
            ramp_up_seconds=test_run_data.ramp_up_seconds,
            ramp_down_seconds=test_run_data.ramp_down_seconds,
            radius_server_host=test_run_data.radius_server_host,
            radius_server_port=test_run_data.radius_server_port,
            radius_secret=test_run_data.radius_secret,
            test_config=test_run_data.test_config or {}
        )
        
        db.add(test_run)
        await db.commit()
        await db.refresh(test_run)
        
        logger.info(f"Created test run: {test_run.id}")
        return TestRunResponse(**test_run.to_dict())
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create test run: {e}")
        raise HTTPException(status_code=500, detail="Failed to create test run")


@router.put("/{test_run_id}", response_model=TestRunResponse)
async def update_test_run(
    test_run_id: str,
    test_run_data: TestRunUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a test run (only if not running)"""
    try:
        result = await db.execute(select(TestRun).where(TestRun.id == test_run_id))
        test_run = result.scalar_one_or_none()
        
        if not test_run:
            raise HTTPException(status_code=404, detail="Test run not found")
        
        # Check if test is running
        if test_run.status in [TestStatus.RUNNING, TestStatus.STARTING]:
            raise HTTPException(status_code=400, detail="Cannot update running test")
        
        # Update fields
        update_data = test_run_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(test_run, field, value)
        
        test_run.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(test_run)
        
        logger.info(f"Updated test run: {test_run.id}")
        return TestRunResponse(**test_run.to_dict())
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update test run {test_run_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update test run")


@router.post("/{test_run_id}/start")
async def start_test_run(
    test_run_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Start a test run"""
    try:
        result = await db.execute(select(TestRun).where(TestRun.id == test_run_id))
        test_run = result.scalar_one_or_none()
        
        if not test_run:
            raise HTTPException(status_code=404, detail="Test run not found")
        
        # Check if already running
        if test_run.status in [TestStatus.RUNNING, TestStatus.STARTING]:
            raise HTTPException(status_code=400, detail="Test is already running")
        
        # Check concurrent test limit
        active_count = len([t for t in active_tests.values() if not t.done()])
        if active_count >= settings.MAX_CONCURRENT_TESTS:
            raise HTTPException(
                status_code=429, 
                detail=f"Maximum concurrent tests ({settings.MAX_CONCURRENT_TESTS}) reached"
            )
        
        # Update status to starting
        test_run.status = TestStatus.STARTING
        test_run.started_at = datetime.utcnow()
        await db.commit()
        
        # Start test execution in background
        task = asyncio.create_task(execute_test_run(test_run_id))
        active_tests[test_run_id] = task
        
        logger.info(f"Started test run: {test_run_id}")
        
        # Broadcast status update
        await ws_manager.broadcast({
            "type": "test_status",
            "test_run_id": test_run_id,
            "status": "starting"
        }, topic="test_updates")
        
        return {"message": "Test run started", "test_run_id": test_run_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start test run {test_run_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to start test run")


@router.post("/{test_run_id}/stop")
async def stop_test_run(
    test_run_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Stop a running test"""
    try:
        result = await db.execute(select(TestRun).where(TestRun.id == test_run_id))
        test_run = result.scalar_one_or_none()
        
        if not test_run:
            raise HTTPException(status_code=404, detail="Test run not found")
        
        # Check if test is running
        if test_run.status not in [TestStatus.RUNNING, TestStatus.STARTING]:
            raise HTTPException(status_code=400, detail="Test is not running")
        
        # Cancel the test task
        if test_run_id in active_tests:
            task = active_tests[test_run_id]
            if not task.done():
                task.cancel()
        
        # Update status
        test_run.status = TestStatus.STOPPING
        await db.commit()
        
        logger.info(f"Stopping test run: {test_run_id}")
        
        # Broadcast status update
        await ws_manager.broadcast({
            "type": "test_status",
            "test_run_id": test_run_id,
            "status": "stopping"
        }, topic="test_updates")
        
        return {"message": "Test run stopping", "test_run_id": test_run_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to stop test run {test_run_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to stop test run")


@router.delete("/{test_run_id}")
async def delete_test_run(
    test_run_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a test run (only if not running)"""
    try:
        result = await db.execute(select(TestRun).where(TestRun.id == test_run_id))
        test_run = result.scalar_one_or_none()
        
        if not test_run:
            raise HTTPException(status_code=404, detail="Test run not found")
        
        # Check if test is running
        if test_run.status in [TestStatus.RUNNING, TestStatus.STARTING]:
            raise HTTPException(status_code=400, detail="Cannot delete running test")
        
        # Cancel any pending task
        if test_run_id in active_tests:
            task = active_tests[test_run_id]
            if not task.done():
                task.cancel()
            del active_tests[test_run_id]
        
        # Delete from database
        await db.delete(test_run)
        await db.commit()
        
        logger.info(f"Deleted test run: {test_run_id}")
        return {"message": "Test run deleted", "test_run_id": test_run_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete test run {test_run_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete test run")


@router.get("/{test_run_id}/metrics")
async def get_test_metrics(
    test_run_id: str,
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db)
):
    """Get real-time metrics for a test run"""
    try:
        # Check if test run exists
        result = await db.execute(select(TestRun).where(TestRun.id == test_run_id))
        test_run = result.scalar_one_or_none()
        
        if not test_run:
            raise HTTPException(status_code=404, detail="Test run not found")
        
        # Get recent metrics
        query = select(TestMetric).where(
            TestMetric.test_run_id == test_run_id
        ).order_by(desc(TestMetric.timestamp)).limit(limit)
        
        result = await db.execute(query)
        metrics = result.scalars().all()
        
        return [metric.to_dict() for metric in metrics]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get metrics for test run {test_run_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get test metrics")


async def execute_test_run(test_run_id: str):
    """Execute a test run (background task)"""
    try:
        # This is a mock implementation - replace with actual test execution
        async with get_db_context() as db:
            # Get test run
            result = await db.execute(select(TestRun).where(TestRun.id == test_run_id))
            test_run = result.scalar_one_or_none()
            
            if not test_run:
                return
            
            # Update status to running
            test_run.status = TestStatus.RUNNING
            await db.commit()
            
            # Broadcast status update
            await ws_manager.broadcast({
                "type": "test_status",
                "test_run_id": test_run_id,
                "status": "running"
            }, topic="test_updates")
            
            # Mock test execution
            duration = test_run.duration_seconds
            start_time = datetime.utcnow()
            
            for i in range(duration):
                if test_run_id not in active_tests:
                    break  # Test was cancelled
                
                # Create mock metrics
                elapsed = i + 1
                current_rps = test_run.target_rps * min(1.0, elapsed / test_run.ramp_up_seconds)
                
                metric = TestMetric(
                    test_run_id=test_run_id,
                    elapsed_seconds=elapsed,
                    current_rps=current_rps,
                    target_rps=test_run.target_rps,
                    delivered_percent=95.0 + (5.0 * (elapsed % 10) / 10),
                    active_sockets=100,
                    total_connections=elapsed * 10,
                    avg_latency=45.0 + (elapsed % 20),
                    p95_latency=120.0 + (elapsed % 50),
                    p99_latency=250.0 + (elapsed % 100),
                    success_rate=99.5,
                    error_rate=0.5,
                    timeout_rate=0.1,
                    success_count=int(current_rps * 0.995),
                    error_count=int(current_rps * 0.005),
                    timeout_count=int(current_rps * 0.001)
                )
                
                db.add(metric)
                await db.commit()
                
                # Broadcast real-time metrics
                await ws_manager.broadcast({
                    "type": "test_metrics",
                    "test_run_id": test_run_id,
                    "metrics": metric.to_dict()
                }, topic="test_updates")
                
                await asyncio.sleep(1)
            
            # Complete the test
            test_run.status = TestStatus.COMPLETED
            test_run.completed_at = datetime.utcnow()
            test_run.packets_sent = duration * test_run.target_rps
            test_run.packets_received = int(test_run.packets_sent * 0.995)
            test_run.success_rate = 99.5
            test_run.error_rate = 0.5
            test_run.timeout_rate = 0.1
            test_run.avg_latency_ms = 45.0
            test_run.p95_latency_ms = 120.0
            test_run.p99_latency_ms = 250.0
            
            await db.commit()
            
            # Broadcast completion
            await ws_manager.broadcast({
                "type": "test_status",
                "test_run_id": test_run_id,
                "status": "completed"
            }, topic="test_updates")
            
    except asyncio.CancelledError:
        # Handle test cancellation
        async with get_db_context() as db:
            result = await db.execute(select(TestRun).where(TestRun.id == test_run_id))
            test_run = result.scalar_one_or_none()
            
            if test_run:
                test_run.status = TestStatus.CANCELLED
                test_run.completed_at = datetime.utcnow()
                await db.commit()
                
                await ws_manager.broadcast({
                    "type": "test_status",
                    "test_run_id": test_run_id,
                    "status": "cancelled"
                }, topic="test_updates")
        
    except Exception as e:
        # Handle test failure
        logger.error(f"Test execution failed for {test_run_id}: {e}")
        
        async with get_db_context() as db:
            result = await db.execute(select(TestRun).where(TestRun.id == test_run_id))
            test_run = result.scalar_one_or_none()
            
            if test_run:
                test_run.status = TestStatus.FAILED
                test_run.completed_at = datetime.utcnow()
                test_run.error_details = {"error": str(e)}
                await db.commit()
                
                await ws_manager.broadcast({
                    "type": "test_status",
                    "test_run_id": test_run_id,
                    "status": "failed",
                    "error": str(e)
                }, topic="test_updates")
    
    finally:
        # Clean up
        if test_run_id in active_tests:
            del active_tests[test_run_id]


# Import get_db_context for background tasks
from ..database import get_db_context