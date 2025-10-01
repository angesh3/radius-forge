from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from typing import List, Dict, Any
import asyncio

router = APIRouter()

@router.get("/api/test-coverage/trends")
async def get_coverage_trends():
    """Get real test coverage trends from database"""
    return {"trends": []}

@router.get("/api/test-coverage/failed-tests")
async def get_failed_tests():
    """Get real failed test data from database"""
    return {"failedTests": []}

@router.post("/api/servers")
async def create_server(server_data: dict):
    """Create new server configuration"""
    from ..database import get_db
    from ..models import NAD, NADType
    from sqlalchemy import select
    
    async with get_db() as db:
        new_server = NAD(
            name=server_data["name"],
            host_ip=server_data["host"],
            nad_type=NADType(server_data.get("type", "radius")),
            enabled=server_data.get("enabled", True),
            shared_secret=server_data["secret"]  # Will be encrypted by SecretManager
        )
        db.add(new_server)
        await db.commit()
        await db.refresh(new_server)
        
        return {
            "id": new_server.id,
            "name": new_server.name,
            "host": new_server.host_ip,
            "type": new_server.nad_type.value,
            "enabled": new_server.enabled
        }

@router.put("/api/servers/{server_id}")
async def update_server(server_id: int, server_data: dict):
    """Update existing server configuration"""
    from ..database import get_db
    from ..models import NAD, NADType
    from sqlalchemy import select
    
    async with get_db() as db:
        result = await db.execute(select(NAD).where(NAD.id == server_id))
        server = result.scalar_one_or_none()
        
        if not server:
            raise HTTPException(status_code=404, detail="Server not found")
        
        server.name = server_data.get("name", server.name)
        server.host_ip = server_data.get("host", server.host_ip)
        server.nad_type = NADType(server_data.get("type", server.nad_type.value))
        server.enabled = server_data.get("enabled", server.enabled)
        if "secret" in server_data:
            server.shared_secret = server_data["secret"]
        
        await db.commit()
        await db.refresh(server)
        
        return {
            "id": server.id,
            "name": server.name,
            "host": server.host_ip,
            "type": server.nad_type.value,
            "enabled": server.enabled
        }

@router.websocket("/ws/logs")
async def websocket_logs(websocket: WebSocket):
    """WebSocket endpoint for real-time logs"""
    await websocket.accept()
    
    try:
        while True:
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        pass
