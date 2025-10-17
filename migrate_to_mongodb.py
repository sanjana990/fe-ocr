#!/usr/bin/env python3
"""
Migration script to transfer data from Supabase to MongoDB
"""

import asyncio
import os
import sys
from datetime import datetime
from typing import List, Dict, Any
import structlog

# Add the app directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.core.mongodb import connect_to_mongo, close_mongo_connection, get_collection
from app.services.mongodb_service import MongoDBService
from supabase import create_client, Client

logger = structlog.get_logger(__name__)

class SupabaseToMongoDBMigrator:
    """Migrate data from Supabase to MongoDB"""
    
    def __init__(self):
        self.supabase: Client = None
        self.mongodb_service = MongoDBService()
        
    def init_supabase(self):
        """Initialize Supabase client"""
        try:
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_ANON_KEY")
            
            if not supabase_url or not supabase_key:
                raise Exception("SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required")
            
            self.supabase = create_client(supabase_url, supabase_key)
            logger.info("✅ Supabase client initialized")
            
        except Exception as e:
            logger.error("❌ Failed to initialize Supabase client", error=str(e))
            raise
    
    async def migrate_structured_data(self):
        """Migrate structured_data table from Supabase to MongoDB"""
        try:
            logger.info("🔄 Starting structured_data migration...")
            
            # Get all data from Supabase
            response = self.supabase.table('structured_data').select('*').execute()
            supabase_data = response.data
            
            logger.info(f"📊 Found {len(supabase_data)} structured_data records in Supabase")
            
            migrated_count = 0
            for record in supabase_data:
                try:
                    # Convert Supabase record to MongoDB format
                    mongo_data = {
                        "name": record.get("name"),
                        "title": record.get("title"),
                        "company": record.get("company"),
                        "phone": record.get("phone"),
                        "email": record.get("email"),
                        "website": record.get("website"),
                        "address": record.get("address"),
                        "other_info": record.get("other_info", []),
                        "source": record.get("source"),
                        "processing_method": record.get("processing_method"),
                        "confidence_score": record.get("confidence_score", 0.0),
                        "raw_text": record.get("raw_text"),
                        "created_at": datetime.fromisoformat(record["created_at"].replace('Z', '+00:00')) if record.get("created_at") else datetime.utcnow(),
                        "updated_at": datetime.fromisoformat(record["updated_at"].replace('Z', '+00:00')) if record.get("updated_at") else datetime.utcnow(),
                        "supabase_id": record.get("id")  # Keep reference to original ID
                    }
                    
                    # Save to MongoDB
                    await self.mongodb_service.structured_data_collection.insert_one(mongo_data)
                    migrated_count += 1
                    
                except Exception as e:
                    logger.warning(f"⚠️ Failed to migrate structured_data record {record.get('id')}", error=str(e))
                    continue
            
            logger.info(f"✅ Migrated {migrated_count}/{len(supabase_data)} structured_data records")
            return migrated_count
            
        except Exception as e:
            logger.error("❌ Failed to migrate structured_data", error=str(e))
            raise
    
    async def migrate_linkedin_companies(self):
        """Migrate linkedin_companies table from Supabase to MongoDB"""
        try:
            logger.info("🔄 Starting linkedin_companies migration...")
            
            # Get all data from Supabase
            response = self.supabase.table('linkedin_companies').select('*').execute()
            supabase_data = response.data
            
            logger.info(f"📊 Found {len(supabase_data)} linkedin_companies records in Supabase")
            
            migrated_count = 0
            for record in supabase_data:
                try:
                    # Convert Supabase record to MongoDB format
                    mongo_data = {
                        "company_name": record.get("company_name"),
                        "website": record.get("website"),
                        "industry": record.get("industry"),
                        "company_size": record.get("company_size"),
                        "hq_location": record.get("hq_location"),
                        "company_type": record.get("company_type"),
                        "linkedin_url": record.get("linkedin_url"),
                        "scraped_at": datetime.fromisoformat(record["scraped_at"].replace('Z', '+00:00')) if record.get("scraped_at") else datetime.utcnow(),
                        "created_at": datetime.fromisoformat(record["created_at"].replace('Z', '+00:00')) if record.get("created_at") else datetime.utcnow(),
                        "updated_at": datetime.fromisoformat(record["updated_at"].replace('Z', '+00:00')) if record.get("updated_at") else datetime.utcnow(),
                        "supabase_id": record.get("id")  # Keep reference to original ID
                    }
                    
                    # Save to MongoDB
                    await self.mongodb_service.linkedin_companies_collection.insert_one(mongo_data)
                    migrated_count += 1
                    
                except Exception as e:
                    logger.warning(f"⚠️ Failed to migrate linkedin_companies record {record.get('id')}", error=str(e))
                    continue
            
            logger.info(f"✅ Migrated {migrated_count}/{len(supabase_data)} linkedin_companies records")
            return migrated_count
            
        except Exception as e:
            logger.error("❌ Failed to migrate linkedin_companies", error=str(e))
            raise
    
    async def verify_migration(self):
        """Verify that migration was successful"""
        try:
            logger.info("🔍 Verifying migration...")
            
            # Count records in MongoDB
            structured_data_count = await self.mongodb_service.structured_data_collection.count_documents({})
            linkedin_companies_count = await self.mongodb_service.linkedin_companies_collection.count_documents({})
            
            logger.info(f"📊 MongoDB records:")
            logger.info(f"  - structured_data: {structured_data_count}")
            logger.info(f"  - linkedin_companies: {linkedin_companies_count}")
            
            # Sample a few records to verify data integrity
            sample_structured = await self.mongodb_service.structured_data_collection.find_one()
            sample_linkedin = await self.mongodb_service.linkedin_companies_collection.find_one()
            
            if sample_structured:
                logger.info("✅ Sample structured_data record:", 
                           name=sample_structured.get("name"),
                           source=sample_structured.get("source"))
            
            if sample_linkedin:
                logger.info("✅ Sample linkedin_companies record:",
                           company_name=sample_linkedin.get("company_name"),
                           industry=sample_linkedin.get("industry"))
            
            return True
            
        except Exception as e:
            logger.error("❌ Migration verification failed", error=str(e))
            return False
    
    async def run_migration(self):
        """Run the complete migration process"""
        try:
            logger.info("🚀 Starting Supabase to MongoDB migration...")
            
            # Initialize connections
            self.init_supabase()
            await connect_to_mongo()
            
            # Run migrations
            structured_count = await self.migrate_structured_data()
            linkedin_count = await self.migrate_linkedin_companies()
            
            # Verify migration
            verification_success = await self.verify_migration()
            
            if verification_success:
                logger.info("🎉 Migration completed successfully!")
                logger.info(f"📊 Migration Summary:")
                logger.info(f"  - Structured Data: {structured_count} records")
                logger.info(f"  - LinkedIn Companies: {linkedin_count} records")
            else:
                logger.error("❌ Migration verification failed")
                return False
            
            return True
            
        except Exception as e:
            logger.error("❌ Migration failed", error=str(e))
            return False
        finally:
            await close_mongo_connection()

async def main():
    """Main migration function"""
    migrator = SupabaseToMongoDBMigrator()
    success = await migrator.run_migration()
    
    if success:
        print("✅ Migration completed successfully!")
        sys.exit(0)
    else:
        print("❌ Migration failed!")
        sys.exit(1)

if __name__ == "__main__":
    # Check for required environment variables
    required_vars = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "MONGODB_URL"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"❌ Missing required environment variables: {', '.join(missing_vars)}")
        print("Please set the following environment variables:")
        print("  - SUPABASE_URL: Your Supabase project URL")
        print("  - SUPABASE_ANON_KEY: Your Supabase anonymous key")
        print("  - MONGODB_URL: Your MongoDB connection string")
        sys.exit(1)
    
    asyncio.run(main())
