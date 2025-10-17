"""
MongoDB service for database operations
Replaces Supabase operations with MongoDB equivalents
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
import structlog

from app.core.mongodb import get_collection
from app.models.mongodb_models import (
    StructuredData, 
    LinkedInCompany, 
    Visitor, 
    Company,
    Interaction,
    EnrichmentLog
)

logger = structlog.get_logger(__name__)

class MongoDBService:
    """MongoDB service for database operations"""
    
    def __init__(self):
        self.db = None
        self.structured_data_collection = None
        self.linkedin_companies_collection = None
        self.visitors_collection = None
        self.companies_collection = None
        self.interactions_collection = None
        self.enrichment_logs_collection = None
        logger.info("MongoDBService initialized")
    
    def _get_db(self):
        """Get database connection, initialize if needed"""
        if self.db is None:
            from app.core.mongodb import get_database
            self.db = get_database()
            self.structured_data_collection = self.db["structured_data"]
            self.linkedin_companies_collection = self.db["linkedin_companies"]
            self.visitors_collection = self.db["visitors"]
            self.companies_collection = self.db["companies"]
            self.interactions_collection = self.db["interactions"]
            self.enrichment_logs_collection = self.db["enrichment_logs"]
        return self.db

    # Structured Data Operations
    async def save_structured_data(self, data: StructuredData) -> Dict[str, Any]:
        """Save structured data to MongoDB"""
        try:
            # Convert to dict and remove None values
            data_dict = data.dict(exclude_none=True)
            data_dict["created_at"] = datetime.utcnow()
            data_dict["updated_at"] = datetime.utcnow()
            
            result = await self.structured_data_collection.insert_one(data_dict)
            
            # Return the inserted document
            inserted_doc = await self.structured_data_collection.find_one({"_id": result.inserted_id})
            if inserted_doc:
                inserted_doc["id"] = str(inserted_doc["_id"])
                # Convert ObjectId to string for JSON serialization
                if "_id" in inserted_doc:
                    inserted_doc["_id"] = str(inserted_doc["_id"])
            
            logger.info("✅ Structured data saved successfully", id=str(result.inserted_id))
            return inserted_doc
            
        except Exception as e:
            logger.error("❌ Failed to save structured data", error=str(e))
            raise

    async def get_all_structured_data(self, limit: int = 100, skip: int = 0) -> List[Dict[str, Any]]:
        """Get all structured data with pagination"""
        try:
            self._get_db()  # Ensure database is connected
            cursor = self.structured_data_collection.find().sort("created_at", -1).skip(skip).limit(limit)
            documents = await cursor.to_list(length=limit)
            
            # Convert ObjectId to string for JSON serialization
            for doc in documents:
                doc["id"] = str(doc["_id"])
                if "created_at" in doc:
                    doc["created_at"] = doc["created_at"].isoformat()
                if "updated_at" in doc:
                    doc["updated_at"] = doc["updated_at"].isoformat()
            
            logger.info(f"✅ Retrieved {len(documents)} structured data records")
            return documents
            
        except Exception as e:
            logger.error("❌ Failed to get structured data", error=str(e))
            raise

    async def get_structured_data_by_source(self, source: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get structured data by source"""
        try:
            cursor = self.structured_data_collection.find({"source": source}).sort("created_at", -1).limit(limit)
            documents = await cursor.to_list(length=limit)
            
            # Convert ObjectId to string for JSON serialization
            for doc in documents:
                doc["id"] = str(doc["_id"])
                if "created_at" in doc:
                    doc["created_at"] = doc["created_at"].isoformat()
                if "updated_at" in doc:
                    doc["updated_at"] = doc["updated_at"].isoformat()
            
            logger.info(f"✅ Retrieved {len(documents)} structured data records for source: {source}")
            return documents
            
        except Exception as e:
            logger.error("❌ Failed to get structured data by source", error=str(e))
            raise

    async def delete_structured_data(self, data_id: str) -> bool:
        """Delete structured data by ID"""
        try:
            result = await self.structured_data_collection.delete_one({"_id": ObjectId(data_id)})
            
            if result.deleted_count > 0:
                logger.info("✅ Structured data deleted successfully", id=data_id)
                return True
            else:
                logger.warning("⚠️ No structured data found with ID", id=data_id)
                return False
                
        except Exception as e:
            logger.error("❌ Failed to delete structured data", error=str(e))
            raise

    # LinkedIn Companies Operations
    async def save_linkedin_company(self, data: LinkedInCompany) -> Dict[str, Any]:
        """Save LinkedIn company data to MongoDB"""
        try:
            data_dict = data.dict(exclude_none=True)
            data_dict["created_at"] = datetime.utcnow()
            data_dict["updated_at"] = datetime.utcnow()
            
            result = await self.linkedin_companies_collection.insert_one(data_dict)
            
            # Return the inserted document
            inserted_doc = await self.linkedin_companies_collection.find_one({"_id": result.inserted_id})
            inserted_doc["id"] = str(inserted_doc["_id"])
            
            logger.info("✅ LinkedIn company saved successfully", id=str(result.inserted_id))
            return inserted_doc
            
        except Exception as e:
            logger.error("❌ Failed to save LinkedIn company", error=str(e))
            raise

    async def get_all_linkedin_companies(self, limit: int = 100, skip: int = 0) -> List[Dict[str, Any]]:
        """Get all LinkedIn companies with pagination"""
        try:
            cursor = self.linkedin_companies_collection.find().sort("created_at", -1).skip(skip).limit(limit)
            documents = await cursor.to_list(length=limit)
            
            # Convert ObjectId to string for JSON serialization
            for doc in documents:
                doc["id"] = str(doc["_id"])
                if "created_at" in doc:
                    doc["created_at"] = doc["created_at"].isoformat()
                if "updated_at" in doc:
                    doc["updated_at"] = doc["updated_at"].isoformat()
                if "scraped_at" in doc:
                    doc["scraped_at"] = doc["scraped_at"].isoformat()
            
            logger.info(f"✅ Retrieved {len(documents)} LinkedIn companies")
            return documents
            
        except Exception as e:
            logger.error("❌ Failed to get LinkedIn companies", error=str(e))
            raise

    async def get_linkedin_companies_by_industry(self, industry: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get LinkedIn companies by industry"""
        try:
            # Use regex for case-insensitive search
            query = {"industry": {"$regex": industry, "$options": "i"}}
            cursor = self.linkedin_companies_collection.find(query).sort("created_at", -1).limit(limit)
            documents = await cursor.to_list(length=limit)
            
            # Convert ObjectId to string for JSON serialization
            for doc in documents:
                doc["id"] = str(doc["_id"])
                if "created_at" in doc:
                    doc["created_at"] = doc["created_at"].isoformat()
                if "updated_at" in doc:
                    doc["updated_at"] = doc["updated_at"].isoformat()
                if "scraped_at" in doc:
                    doc["scraped_at"] = doc["scraped_at"].isoformat()
            
            logger.info(f"✅ Retrieved {len(documents)} LinkedIn companies for industry: {industry}")
            return documents
            
        except Exception as e:
            logger.error("❌ Failed to get LinkedIn companies by industry", error=str(e))
            raise

    async def search_linkedin_companies(self, query: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Search LinkedIn companies by name, industry, or location"""
        try:
            # Create search query for multiple fields
            search_query = {
                "$or": [
                    {"company_name": {"$regex": query, "$options": "i"}},
                    {"industry": {"$regex": query, "$options": "i"}},
                    {"hq_location": {"$regex": query, "$options": "i"}}
                ]
            }
            
            cursor = self.linkedin_companies_collection.find(search_query).sort("created_at", -1).limit(limit)
            documents = await cursor.to_list(length=limit)
            
            # Convert ObjectId to string for JSON serialization
            for doc in documents:
                doc["id"] = str(doc["_id"])
                if "created_at" in doc:
                    doc["created_at"] = doc["created_at"].isoformat()
                if "updated_at" in doc:
                    doc["updated_at"] = doc["updated_at"].isoformat()
                if "scraped_at" in doc:
                    doc["scraped_at"] = doc["scraped_at"].isoformat()
            
            logger.info(f"✅ Found {len(documents)} LinkedIn companies for query: {query}")
            return documents
            
        except Exception as e:
            logger.error("❌ Failed to search LinkedIn companies", error=str(e))
            raise

    async def delete_linkedin_company(self, company_id: str) -> bool:
        """Delete LinkedIn company by ID"""
        try:
            result = await self.linkedin_companies_collection.delete_one({"_id": ObjectId(company_id)})
            
            if result.deleted_count > 0:
                logger.info("✅ LinkedIn company deleted successfully", id=company_id)
                return True
            else:
                logger.warning("⚠️ No LinkedIn company found with ID", id=company_id)
                return False
                
        except Exception as e:
            logger.error("❌ Failed to delete LinkedIn company", error=str(e))
            raise

    async def update_linkedin_company(self, company_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update LinkedIn company by ID"""
        try:
            data["updated_at"] = datetime.utcnow()
            
            result = await self.linkedin_companies_collection.update_one(
                {"_id": ObjectId(company_id)},
                {"$set": data}
            )
            
            if result.modified_count > 0:
                # Return the updated document
                updated_doc = await self.linkedin_companies_collection.find_one({"_id": ObjectId(company_id)})
                if updated_doc:
                    updated_doc["id"] = str(updated_doc["_id"])
                    if "created_at" in updated_doc:
                        updated_doc["created_at"] = updated_doc["created_at"].isoformat()
                    if "updated_at" in updated_doc:
                        updated_doc["updated_at"] = updated_doc["updated_at"].isoformat()
                    if "scraped_at" in updated_doc:
                        updated_doc["scraped_at"] = updated_doc["scraped_at"].isoformat()
                
                logger.info("✅ LinkedIn company updated successfully", id=company_id)
                return updated_doc
            else:
                logger.warning("⚠️ No LinkedIn company found with ID", id=company_id)
                return None
                
        except Exception as e:
            logger.error("❌ Failed to update LinkedIn company", error=str(e))
            raise

    # Visitor Operations
    async def save_visitor(self, data: Visitor) -> Dict[str, Any]:
        """Save visitor data to MongoDB"""
        try:
            data_dict = data.dict(exclude_none=True)
            data_dict["created_at"] = datetime.utcnow()
            data_dict["updated_at"] = datetime.utcnow()
            
            result = await self.visitors_collection.insert_one(data_dict)
            
            # Return the inserted document
            inserted_doc = await self.visitors_collection.find_one({"_id": result.inserted_id})
            inserted_doc["id"] = str(inserted_doc["_id"])
            
            logger.info("✅ Visitor saved successfully", id=str(result.inserted_id))
            return inserted_doc
            
        except Exception as e:
            logger.error("❌ Failed to save visitor", error=str(e))
            raise

    async def get_all_visitors(self, limit: int = 100, skip: int = 0) -> List[Dict[str, Any]]:
        """Get all visitors with pagination"""
        try:
            cursor = self.visitors_collection.find().sort("created_at", -1).skip(skip).limit(limit)
            documents = await cursor.to_list(length=limit)
            
            # Convert ObjectId to string for JSON serialization
            for doc in documents:
                doc["id"] = str(doc["_id"])
                if "created_at" in doc:
                    doc["created_at"] = doc["created_at"].isoformat()
                if "updated_at" in doc:
                    doc["updated_at"] = doc["updated_at"].isoformat()
            
            logger.info(f"✅ Retrieved {len(documents)} visitors")
            return documents
            
        except Exception as e:
            logger.error("❌ Failed to get visitors", error=str(e))
            raise

    # Company Operations
    async def save_company(self, data: Company) -> Dict[str, Any]:
        """Save company data to MongoDB"""
        try:
            data_dict = data.dict(exclude_none=True)
            data_dict["created_at"] = datetime.utcnow()
            data_dict["updated_at"] = datetime.utcnow()
            
            result = await self.companies_collection.insert_one(data_dict)
            
            # Return the inserted document
            inserted_doc = await self.companies_collection.find_one({"_id": result.inserted_id})
            inserted_doc["id"] = str(inserted_doc["_id"])
            
            logger.info("✅ Company saved successfully", id=str(result.inserted_id))
            return inserted_doc
            
        except Exception as e:
            logger.error("❌ Failed to save company", error=str(e))
            raise

    async def get_all_companies(self, limit: int = 100, skip: int = 0) -> List[Dict[str, Any]]:
        """Get all companies with pagination"""
        try:
            cursor = self.companies_collection.find().sort("created_at", -1).skip(skip).limit(limit)
            documents = await cursor.to_list(length=limit)
            
            # Convert ObjectId to string for JSON serialization
            for doc in documents:
                doc["id"] = str(doc["_id"])
                if "created_at" in doc:
                    doc["created_at"] = doc["created_at"].isoformat()
                if "updated_at" in doc:
                    doc["updated_at"] = doc["updated_at"].isoformat()
            
            logger.info(f"✅ Retrieved {len(documents)} companies")
            return documents
            
        except Exception as e:
            logger.error("❌ Failed to get companies", error=str(e))
            raise
