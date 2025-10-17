"""
MongoDB configuration and connection management
"""

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
import structlog
from typing import Optional
import os

from app.core.config import settings

logger = structlog.get_logger(__name__)

class MongoDB:
    """MongoDB connection manager"""
    
    client: Optional[AsyncIOMotorClient] = None
    database = None

# Global MongoDB instance
mongodb = MongoDB()

async def connect_to_mongo():
    """Create database connection"""
    try:
        # Get MongoDB connection string from environment
        mongodb_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
        database_name = os.getenv("MONGODB_DATABASE", "visitor_intelligence")
        
        logger.info("Connecting to MongoDB", url=mongodb_url, database=database_name)
        
        # Create async client
        mongodb.client = AsyncIOMotorClient(mongodb_url)
        mongodb.database = mongodb.client[database_name]
        
        # Test connection
        await mongodb.client.admin.command('ping')
        logger.info("✅ Successfully connected to MongoDB")
        
    except Exception as e:
        logger.error("❌ Failed to connect to MongoDB", error=str(e))
        raise

async def close_mongo_connection():
    """Close database connection"""
    if mongodb.client:
        mongodb.client.close()
        logger.info("MongoDB connection closed")

def get_database():
    """Get database instance"""
    return mongodb.database

def get_collection(collection_name: str):
    """Get collection instance"""
    if not mongodb.database:
        raise Exception("Database not connected")
    return mongodb.database[collection_name]
