#!/usr/bin/env python3
"""
RadiusForge Database Models
SQLAlchemy models for test runs, NADs, reports, and other entities
"""

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Float, JSON, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship, backref
from sqlalchemy.sql import func
from datetime import datetime
from typing import Optional, Dict, Any, List
from enum import Enum
import uuid

from .database import Base


class TestStatus(str, Enum):
    """Test execution status"""
    PENDING = "pending"
    STARTING = "starting"
    RUNNING = "running"
    STOPPING = "stopping"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TestType(str, Enum):
    """Type of test"""
    PERFORMANCE = "performance"
    SCALE = "scale"
    THREAT = "threat"
    CUSTOM = "custom"


class NADType(str, Enum):
    """Network Access Device type"""
    SWITCH = "switch"
    ROUTER = "router"
    WIRELESS_CONTROLLER = "wireless_controller"
    VPN_CONCENTRATOR = "vpn_concentrator"
    FIREWALL = "firewall"
    OTHER = "other"


class TestRun(Base):
    """Test run model"""
    __tablename__ = "test_runs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Test configuration
    test_type = Column(SQLEnum(TestType), nullable=False, default=TestType.PERFORMANCE)
    status = Column(SQLEnum(TestStatus), nullable=False, default=TestStatus.PENDING)
    
    # Test parameters
    target_rps = Column(Integer, nullable=False, default=1000)
    duration_seconds = Column(Integer, nullable=False, default=300)
    ramp_up_seconds = Column(Integer, default=30)
    ramp_down_seconds = Column(Integer, default=30)
    
    # Target configuration
    radius_server_host = Column(String(255), nullable=False)
    radius_server_port = Column(Integer, nullable=False, default=1812)
    radius_secret = Column(String(255), nullable=False)
    
    # Execution tracking
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    
    # Results summary (updated during test execution)
    packets_sent = Column(Integer, default=0)
    packets_received = Column(Integer, default=0)
    success_rate = Column(Float, default=0.0)
    error_rate = Column(Float, default=0.0)
    timeout_rate = Column(Float, default=0.0)
    avg_latency_ms = Column(Float, default=0.0)
    p95_latency_ms = Column(Float, default=0.0)
    p99_latency_ms = Column(Float, default=0.0)
    
    # Configuration as JSON
    test_config = Column(JSON, nullable=True)
    error_details = Column(JSON, nullable=True)
    
    # Relationships
    reports = relationship("Report", back_populates="test_run", cascade="all, delete-orphan")
    metrics = relationship("TestMetric", back_populates="test_run", cascade="all, delete-orphan")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "test_type": self.test_type.value if self.test_type else None,
            "status": self.status.value if self.status else None,
            "target_rps": self.target_rps,
            "duration_seconds": self.duration_seconds,
            "ramp_up_seconds": self.ramp_up_seconds,
            "ramp_down_seconds": self.ramp_down_seconds,
            "radius_server_host": self.radius_server_host,
            "radius_server_port": self.radius_server_port,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "packets_sent": self.packets_sent,
            "packets_received": self.packets_received,
            "success_rate": self.success_rate,
            "error_rate": self.error_rate,
            "timeout_rate": self.timeout_rate,
            "avg_latency_ms": self.avg_latency_ms,
            "p95_latency_ms": self.p95_latency_ms,
            "p99_latency_ms": self.p99_latency_ms,
            "test_config": self.test_config,
            "error_details": self.error_details
        }


class NAD(Base):
    """Network Access Device model"""
    __tablename__ = "nads"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Device information
    device_type = Column(SQLEnum(NADType), nullable=False, default=NADType.SWITCH)
    ip_address = Column(String(45), nullable=False)  # Support IPv6
    mac_address = Column(String(17), nullable=True)
    vendor = Column(String(100), nullable=True)
    model = Column(String(100), nullable=True)
    software_version = Column(String(100), nullable=True)
    
    # RADIUS configuration
    radius_secret = Column(String(255), nullable=False)
    coa_port = Column(Integer, default=3799)
    
    # Location and grouping
    location = Column(String(255), nullable=True)
    group_name = Column(String(100), nullable=True)
    
    # Status and health
    is_active = Column(Boolean, default=True)
    last_seen = Column(DateTime, nullable=True)
    health_status = Column(String(50), default="unknown")  # healthy, warning, critical, unknown
    
    # Metadata
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    
    # Configuration as JSON
    device_config = Column(JSON, nullable=True)
    capabilities = Column(JSON, nullable=True)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "device_type": self.device_type.value if self.device_type else None,
            "ip_address": self.ip_address,
            "mac_address": self.mac_address,
            "vendor": self.vendor,
            "model": self.model,
            "software_version": self.software_version,
            "radius_secret": self.radius_secret,
            "coa_port": self.coa_port,
            "location": self.location,
            "group_name": self.group_name,
            "is_active": self.is_active,
            "last_seen": self.last_seen.isoformat() if self.last_seen else None,
            "health_status": self.health_status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "device_config": self.device_config,
            "capabilities": self.capabilities
        }


class Report(Base):
    """Test report model"""
    __tablename__ = "reports"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    test_run_id = Column(String, ForeignKey("test_runs.id"), nullable=False)
    
    # Report metadata
    name = Column(String(255), nullable=False)
    report_type = Column(String(50), nullable=False, default="test_summary")  # test_summary, detailed, comparison
    format = Column(String(20), nullable=False, default="html")  # html, pdf, json, csv
    
    # File information
    file_path = Column(String(500), nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    
    # Report content (for small reports stored in DB)
    content = Column(Text, nullable=True)
    summary_data = Column(JSON, nullable=True)
    
    # Status
    is_generated = Column(Boolean, default=False)
    generation_error = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    generated_at = Column(DateTime, nullable=True)
    
    # Relationships
    test_run = relationship("TestRun", back_populates="reports")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "id": self.id,
            "test_run_id": self.test_run_id,
            "name": self.name,
            "report_type": self.report_type,
            "format": self.format,
            "file_path": self.file_path,
            "file_size_bytes": self.file_size_bytes,
            "content": self.content,
            "summary_data": self.summary_data,
            "is_generated": self.is_generated,
            "generation_error": self.generation_error,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "generated_at": self.generated_at.isoformat() if self.generated_at else None
        }


class TestMetric(Base):
    """Real-time test metrics model"""
    __tablename__ = "test_metrics"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    test_run_id = Column(String, ForeignKey("test_runs.id"), nullable=False)
    
    # Timestamp
    timestamp = Column(DateTime, nullable=False, server_default=func.now())
    elapsed_seconds = Column(Float, nullable=False)  # Seconds since test start
    
    # Performance metrics
    current_rps = Column(Float, nullable=False, default=0.0)
    target_rps = Column(Float, nullable=False, default=0.0)
    delivered_percent = Column(Float, nullable=False, default=0.0)
    
    # Connection metrics
    active_sockets = Column(Integer, nullable=False, default=0)
    total_connections = Column(Integer, nullable=False, default=0)
    failed_connections = Column(Integer, nullable=False, default=0)
    
    # Latency metrics (milliseconds)
    avg_latency = Column(Float, nullable=False, default=0.0)
    min_latency = Column(Float, nullable=False, default=0.0)
    max_latency = Column(Float, nullable=False, default=0.0)
    p50_latency = Column(Float, nullable=False, default=0.0)
    p95_latency = Column(Float, nullable=False, default=0.0)
    p99_latency = Column(Float, nullable=False, default=0.0)
    
    # Response metrics
    success_count = Column(Integer, nullable=False, default=0)
    error_count = Column(Integer, nullable=False, default=0)
    timeout_count = Column(Integer, nullable=False, default=0)
    
    # Rates (percentage)
    success_rate = Column(Float, nullable=False, default=0.0)
    error_rate = Column(Float, nullable=False, default=0.0)
    timeout_rate = Column(Float, nullable=False, default=0.0)
    
    # Additional metrics as JSON
    custom_metrics = Column(JSON, nullable=True)
    
    # Relationships
    test_run = relationship("TestRun", back_populates="metrics")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "id": self.id,
            "test_run_id": self.test_run_id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "elapsed_seconds": self.elapsed_seconds,
            "current_rps": self.current_rps,
            "target_rps": self.target_rps,
            "delivered_percent": self.delivered_percent,
            "active_sockets": self.active_sockets,
            "total_connections": self.total_connections,
            "failed_connections": self.failed_connections,
            "avg_latency": self.avg_latency,
            "min_latency": self.min_latency,
            "max_latency": self.max_latency,
            "p50_latency": self.p50_latency,
            "p95_latency": self.p95_latency,
            "p99_latency": self.p99_latency,
            "success_count": self.success_count,
            "error_count": self.error_count,
            "timeout_count": self.timeout_count,
            "success_rate": self.success_rate,
            "error_rate": self.error_rate,
            "timeout_rate": self.timeout_rate,
            "custom_metrics": self.custom_metrics
        }


class TestPreset(Base):
    """Test configuration presets"""
    __tablename__ = "test_presets"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Preset type and category
    test_type = Column(SQLEnum(TestType), nullable=False, default=TestType.PERFORMANCE)
    category = Column(String(100), nullable=True)  # e.g., "load_test", "stress_test", "baseline"
    
    # Configuration
    config_data = Column(JSON, nullable=False)
    
    # Metadata
    is_system_preset = Column(Boolean, default=False)  # System vs user-created
    is_active = Column(Boolean, default=True)
    usage_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "test_type": self.test_type.value if self.test_type else None,
            "category": self.category,
            "config_data": self.config_data,
            "is_system_preset": self.is_system_preset,
            "is_active": self.is_active,
            "usage_count": self.usage_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


# Create all indexes for better performance
from sqlalchemy import Index

# Indexes for test_runs
Index('idx_test_runs_status', TestRun.status)
Index('idx_test_runs_created_at', TestRun.created_at)
Index('idx_test_runs_test_type', TestRun.test_type)

# Indexes for test_metrics
Index('idx_test_metrics_test_run_id', TestMetric.test_run_id)
Index('idx_test_metrics_timestamp', TestMetric.timestamp)

# Indexes for nads
Index('idx_nads_ip_address', NAD.ip_address)
Index('idx_nads_is_active', NAD.is_active)
Index('idx_nads_device_type', NAD.device_type)

# Indexes for reports
Index('idx_reports_test_run_id', Report.test_run_id)
Index('idx_reports_created_at', Report.created_at)