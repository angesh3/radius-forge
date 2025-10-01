#!/usr/bin/env python3
"""
Database cleanup script to remove duplicate RADIUS server entries
"""
import asyncio
import sys
import os
sys.path.append('/opt/radiusforge/src')

from src.api.database import get_db
from src.api.models import NAD
from sqlalchemy import select, func

async def cleanup_duplicates():
    """Remove duplicate server entries from database"""
    try:
        db_gen = get_db()
        db = await db_gen.__anext__()
        result = await db.execute(
                select(NAD.name, func.count(NAD.id).label('count'))
                .group_by(NAD.name)
                .having(func.count(NAD.id) > 1)
        )
        duplicates = result.all()
        print(f'Found {len(duplicates)} duplicate server names')
        
        for name, count in duplicates:
            print(f'Server {name}: {count} duplicates')
            servers = await db.execute(select(NAD).where(NAD.name == name))
            server_list = servers.scalars().all()
            for server in server_list[1:]:  # Keep first, delete rest
                await db.delete(server)
        
        await db.commit()
        print('Cleanup completed')
            
    except Exception as e:
        print(f'Error during cleanup: {e}')
    finally:
        if 'db' in locals():
            await db.close()

if __name__ == "__main__":
    asyncio.run(cleanup_duplicates())
