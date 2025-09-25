#!/usr/bin/env python3
"""
RadiusForge Topology Data API Router
Endpoints for managing network topology data and NADs
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_, or_
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging
import ipaddress

from ..database import get_db
from ..models import NAD, NADType
from ..config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


# Pydantic models for request/response
from pydantic import BaseModel, Field, validator


class NADCreate(BaseModel):
    """Request model for creating a NAD"""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    device_type: NADType = NADType.SWITCH
    ip_address: str = Field(..., min_length=7, max_length=45)  # Support IPv4/IPv6
    mac_address: Optional[str] = Field(None, pattern=r"^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$")
    vendor: Optional[str] = Field(None, max_length=100)
    model: Optional[str] = Field(None, max_length=100)
    software_version: Optional[str] = Field(None, max_length=100)
    radius_secret: str = Field(..., min_length=1, max_length=255)
    coa_port: int = Field(default=3799, ge=1, le=65535)
    location: Optional[str] = Field(None, max_length=255)
    group_name: Optional[str] = Field(None, max_length=100)
    device_config: Optional[Dict[str, Any]] = None
    capabilities: Optional[Dict[str, Any]] = None

    @validator("ip_address")
    def validate_ip_address(cls, v):
        try:
            ipaddress.ip_address(v)
            return v
        except ValueError:
            raise ValueError("Invalid IP address format")


class NADUpdate(BaseModel):
    """Request model for updating a NAD"""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    device_type: Optional[NADType] = None
    ip_address: Optional[str] = Field(None, min_length=7, max_length=45)
    mac_address: Optional[str] = Field(None, pattern=r"^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$")
    vendor: Optional[str] = Field(None, max_length=100)
    model: Optional[str] = Field(None, max_length=100)
    software_version: Optional[str] = Field(None, max_length=100)
    radius_secret: Optional[str] = Field(None, min_length=1, max_length=255)
    coa_port: Optional[int] = Field(None, ge=1, le=65535)
    location: Optional[str] = Field(None, max_length=255)
    group_name: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None
    health_status: Optional[str] = Field(None, pattern=r"^(healthy|warning|critical|unknown)$")
    device_config: Optional[Dict[str, Any]] = None
    capabilities: Optional[Dict[str, Any]] = None

    @validator("ip_address")
    def validate_ip_address(cls, v):
        if v is not None:
            try:
                ipaddress.ip_address(v)
                return v
            except ValueError:
                raise ValueError("Invalid IP address format")
        return v


class NADResponse(BaseModel):
    """Response model for NAD"""

    id: str
    name: str
    description: Optional[str]
    device_type: str
    ip_address: str
    mac_address: Optional[str]
    vendor: Optional[str]
    model: Optional[str]
    software_version: Optional[str]
    radius_secret: str
    coa_port: int
    location: Optional[str]
    group_name: Optional[str]
    is_active: bool
    last_seen: Optional[str]
    health_status: str
    created_at: str
    updated_at: str
    device_config: Optional[Dict[str, Any]]
    capabilities: Optional[Dict[str, Any]]


class TopologyStats(BaseModel):
    """Topology statistics"""

    total_nads: int
    active_nads: int
    inactive_nads: int
    device_types: Dict[str, int]
    health_status: Dict[str, int]
    groups: Dict[str, int]
    locations: Dict[str, int]


@router.get("/stats", response_model=TopologyStats)
async def get_topology_stats(db: AsyncSession = Depends(get_db)):
    """Get topology statistics"""
    try:
        # Get all NADs
        result = await db.execute(select(NAD))
        nads = result.scalars().all()

        # Calculate statistics
        total_nads = len(nads)
        active_nads = len([nad for nad in nads if nad.is_active])
        inactive_nads = total_nads - active_nads

        # Device types
        device_types = {}
        for nad in nads:
            device_type = nad.device_type.value if nad.device_type else "unknown"
            device_types[device_type] = device_types.get(device_type, 0) + 1

        # Health status
        health_status = {}
        for nad in nads:
            status = nad.health_status or "unknown"
            health_status[status] = health_status.get(status, 0) + 1

        # Groups
        groups = {}
        for nad in nads:
            group = nad.group_name or "ungrouped"
            groups[group] = groups.get(group, 0) + 1

        # Locations
        locations = {}
        for nad in nads:
            location = nad.location or "unknown"
            locations[location] = locations.get(location, 0) + 1

        return TopologyStats(
            total_nads=total_nads,
            active_nads=active_nads,
            inactive_nads=inactive_nads,
            device_types=device_types,
            health_status=health_status,
            groups=groups,
            locations=locations,
        )

    except Exception as e:
        logger.error(f"Failed to get topology stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get topology statistics")


@router.get("/nads", response_model=List[NADResponse])
async def list_nads(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    device_type: Optional[NADType] = None,
    is_active: Optional[bool] = None,
    health_status: Optional[str] = None,
    group_name: Optional[str] = None,
    location: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """List NADs with filtering and pagination"""
    try:
        # Build query
        query = select(NAD).order_by(desc(NAD.created_at))

        # Apply filters
        if device_type:
            query = query.where(NAD.device_type == device_type)
        if is_active is not None:
            query = query.where(NAD.is_active == is_active)
        if health_status:
            query = query.where(NAD.health_status == health_status)
        if group_name:
            query = query.where(NAD.group_name == group_name)
        if location:
            query = query.where(NAD.location == location)
        if search:
            # Search in name, description, IP address, vendor, model
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    NAD.name.ilike(search_term),
                    NAD.description.ilike(search_term),
                    NAD.ip_address.ilike(search_term),
                    NAD.vendor.ilike(search_term),
                    NAD.model.ilike(search_term),
                )
            )

        # Apply pagination
        query = query.offset(skip).limit(limit)

        # Execute query
        result = await db.execute(query)
        nads = result.scalars().all()

        return [NADResponse(**nad.to_dict()) for nad in nads]

    except Exception as e:
        logger.error(f"Failed to list NADs: {e}")
        raise HTTPException(status_code=500, detail="Failed to list NADs")


@router.get("/nads/{nad_id}", response_model=NADResponse)
async def get_nad(nad_id: str, db: AsyncSession = Depends(get_db)):
    """Get a specific NAD by ID"""
    try:
        result = await db.execute(select(NAD).where(NAD.id == nad_id))
        nad = result.scalar_one_or_none()

        if not nad:
            raise HTTPException(status_code=404, detail="NAD not found")

        return NADResponse(**nad.to_dict())

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get NAD {nad_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get NAD")


@router.post("/nads", response_model=NADResponse)
async def create_nad(nad_data: NADCreate, db: AsyncSession = Depends(get_db)):
    """Create a new NAD"""
    try:
        # Check if IP address already exists
        result = await db.execute(select(NAD).where(NAD.ip_address == nad_data.ip_address))
        existing_nad = result.scalar_one_or_none()

        if existing_nad:
            raise HTTPException(status_code=400, detail=f"NAD with IP address {nad_data.ip_address} already exists")

        # Create NAD
        nad = NAD(
            name=nad_data.name,
            description=nad_data.description,
            device_type=nad_data.device_type,
            ip_address=nad_data.ip_address,
            mac_address=nad_data.mac_address,
            vendor=nad_data.vendor,
            model=nad_data.model,
            software_version=nad_data.software_version,
            radius_secret=nad_data.radius_secret,
            coa_port=nad_data.coa_port,
            location=nad_data.location,
            group_name=nad_data.group_name,
            device_config=nad_data.device_config or {},
            capabilities=nad_data.capabilities or {},
        )

        db.add(nad)
        await db.commit()
        await db.refresh(nad)

        logger.info(f"Created NAD: {nad.id} ({nad.ip_address})")
        return NADResponse(**nad.to_dict())

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create NAD: {e}")
        raise HTTPException(status_code=500, detail="Failed to create NAD")


@router.put("/nads/{nad_id}", response_model=NADResponse)
async def update_nad(nad_id: str, nad_data: NADUpdate, db: AsyncSession = Depends(get_db)):
    """Update a NAD"""
    try:
        result = await db.execute(select(NAD).where(NAD.id == nad_id))
        nad = result.scalar_one_or_none()

        if not nad:
            raise HTTPException(status_code=404, detail="NAD not found")

        # Check for IP address conflicts if IP is being updated
        if nad_data.ip_address and nad_data.ip_address != nad.ip_address:
            result = await db.execute(select(NAD).where(NAD.ip_address == nad_data.ip_address))
            existing_nad = result.scalar_one_or_none()

            if existing_nad:
                raise HTTPException(status_code=400, detail=f"NAD with IP address {nad_data.ip_address} already exists")

        # Update fields
        update_data = nad_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(nad, field, value)

        nad.updated_at = datetime.utcnow()

        await db.commit()
        await db.refresh(nad)

        logger.info(f"Updated NAD: {nad.id}")
        return NADResponse(**nad.to_dict())

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update NAD {nad_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update NAD")


@router.delete("/nads/{nad_id}")
async def delete_nad(nad_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a NAD"""
    try:
        result = await db.execute(select(NAD).where(NAD.id == nad_id))
        nad = result.scalar_one_or_none()

        if not nad:
            raise HTTPException(status_code=404, detail="NAD not found")

        # Delete from database
        await db.delete(nad)
        await db.commit()

        logger.info(f"Deleted NAD: {nad_id}")
        return {"message": "NAD deleted", "nad_id": nad_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete NAD {nad_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete NAD")


@router.post("/nads/{nad_id}/ping")
async def ping_nad(nad_id: str, db: AsyncSession = Depends(get_db)):
    """Ping a NAD to check connectivity"""
    try:
        result = await db.execute(select(NAD).where(NAD.id == nad_id))
        nad = result.scalar_one_or_none()

        if not nad:
            raise HTTPException(status_code=404, detail="NAD not found")

        # Mock ping implementation - replace with actual ping
        import asyncio
        import subprocess

        try:
            # Use ping command
            process = await asyncio.create_subprocess_exec(
                "ping", "-c", "1", "-W", "3000", nad.ip_address, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
            )
            returncode = await process.wait()

            is_reachable = returncode == 0
            response_time = 0.0  # Would be parsed from ping output in real implementation

            # Update last seen and health status
            if is_reachable:
                nad.last_seen = datetime.utcnow()
                nad.health_status = "healthy"
            else:
                nad.health_status = "critical"

            await db.commit()

            return {
                "nad_id": nad_id,
                "ip_address": nad.ip_address,
                "reachable": is_reachable,
                "response_time_ms": response_time,
                "timestamp": datetime.utcnow().isoformat(),
            }

        except Exception as ping_error:
            logger.error(f"Ping failed for NAD {nad_id}: {ping_error}")
            return {
                "nad_id": nad_id,
                "ip_address": nad.ip_address,
                "reachable": False,
                "error": str(ping_error),
                "timestamp": datetime.utcnow().isoformat(),
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to ping NAD {nad_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to ping NAD")


@router.post("/nads/bulk-ping")
async def bulk_ping_nads(
    active_only: bool = Query(True, description="Only ping active NADs"), db: AsyncSession = Depends(get_db)
):
    """Ping multiple NADs to check connectivity"""
    try:
        # Get NADs to ping
        query = select(NAD)
        if active_only:
            query = query.where(NAD.is_active == True)

        result = await db.execute(query)
        nads = result.scalars().all()

        # Ping all NADs concurrently (limit concurrency to avoid overwhelming network)
        import asyncio

        semaphore = asyncio.Semaphore(10)  # Max 10 concurrent pings

        async def ping_single_nad(nad):
            async with semaphore:
                try:
                    process = await asyncio.create_subprocess_exec(
                        "ping",
                        "-c",
                        "1",
                        "-W",
                        "3000",
                        nad.ip_address,
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                    )
                    returncode = await process.wait()

                    is_reachable = returncode == 0

                    # Update NAD status
                    if is_reachable:
                        nad.last_seen = datetime.utcnow()
                        nad.health_status = "healthy"
                    else:
                        nad.health_status = "critical"

                    return {"nad_id": nad.id, "name": nad.name, "ip_address": nad.ip_address, "reachable": is_reachable}

                except Exception:
                    nad.health_status = "unknown"
                    return {
                        "nad_id": nad.id,
                        "name": nad.name,
                        "ip_address": nad.ip_address,
                        "reachable": False,
                        "error": "ping_failed",
                    }

        # Execute all pings
        results = await asyncio.gather(*[ping_single_nad(nad) for nad in nads])

        # Commit all NAD updates
        await db.commit()

        # Calculate summary
        total_tested = len(results)
        reachable_count = len([r for r in results if r.get("reachable", False)])
        unreachable_count = total_tested - reachable_count

        return {
            "summary": {
                "total_tested": total_tested,
                "reachable": reachable_count,
                "unreachable": unreachable_count,
                "success_rate": (reachable_count / total_tested * 100) if total_tested > 0 else 0,
            },
            "results": results,
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as e:
        logger.error(f"Failed to bulk ping NADs: {e}")
        raise HTTPException(status_code=500, detail="Failed to bulk ping NADs")


@router.get("/groups")
async def list_groups(db: AsyncSession = Depends(get_db)):
    """List all unique NAD groups"""
    try:
        result = await db.execute(select(NAD.group_name).distinct().where(NAD.group_name.isnot(None)))
        groups = [row[0] for row in result.fetchall()]
        return {"groups": sorted(groups)}

    except Exception as e:
        logger.error(f"Failed to list groups: {e}")
        raise HTTPException(status_code=500, detail="Failed to list groups")


@router.get("/locations")
async def list_locations(db: AsyncSession = Depends(get_db)):
    """List all unique NAD locations"""
    try:
        result = await db.execute(select(NAD.location).distinct().where(NAD.location.isnot(None)))
        locations = [row[0] for row in result.fetchall()]
        return {"locations": sorted(locations)}

    except Exception as e:
        logger.error(f"Failed to list locations: {e}")
        raise HTTPException(status_code=500, detail="Failed to list locations")
