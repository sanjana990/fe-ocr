"""
MongoDB data endpoints
Replaces Supabase operations with MongoDB equivalents
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional, Dict, Any
import structlog

from app.services.mongodb_service import MongoDBService
from app.models.mongodb_models import StructuredData, LinkedInCompany

router = APIRouter()
logger = structlog.get_logger(__name__)

# Initialize MongoDB service
mongodb_service = None

def get_mongodb_service():
    """Get MongoDB service instance, ensuring it's initialized"""
    global mongodb_service
    if mongodb_service is None:
        mongodb_service = MongoDBService()
        # Initialize the database connection
        mongodb_service._get_db()
    return mongodb_service

@router.post("/structured-data")
async def create_structured_data(data: StructuredData):
    """Create new structured data entry"""
    try:
        service = get_mongodb_service()
        result = await service.save_structured_data(data)
        logger.info("Structured data created successfully", id=result.get("id"))
        return {
            "success": True,
            "data": result,
            "message": "Structured data created successfully"
        }
    except Exception as e:
        logger.error("Failed to create structured data", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to create structured data: {str(e)}")

@router.get("/structured-data")
async def get_structured_data(
    limit: int = Query(100, description="Number of records to return"),
    skip: int = Query(0, description="Number of records to skip"),
    source: Optional[str] = Query(None, description="Filter by source (text_scan or file_upload)")
):
    """Get structured data with optional filtering"""
    try:
        service = get_mongodb_service()
        if source:
            data = await service.get_structured_data_by_source(source, limit)
        else:
            data = await service.get_all_structured_data(limit, skip)
        
        logger.info("Structured data retrieved successfully", count=len(data))
        return {
            "success": True,
            "data": data,
            "count": len(data),
            "message": "Structured data retrieved successfully"
        }
    except Exception as e:
        logger.error("Failed to get structured data", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get structured data: {str(e)}")

@router.delete("/structured-data/{data_id}")
async def delete_structured_data(data_id: str):
    """Delete structured data by ID"""
    try:
        service = get_mongodb_service()
        success = await service.delete_structured_data(data_id)
        if success:
            return {
                "success": True,
                "message": "Structured data deleted successfully"
            }
        else:
            raise HTTPException(status_code=404, detail="Structured data not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to delete structured data", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to delete structured data: {str(e)}")

@router.post("/linkedin-companies")
async def create_linkedin_company(data: LinkedInCompany):
    """Create new LinkedIn company entry"""
    try:
        service = get_mongodb_service()
        result = await service.save_linkedin_company(data)
        logger.info("LinkedIn company created successfully", id=result.get("id"))
        return {
            "success": True,
            "data": result,
            "message": "LinkedIn company created successfully"
        }
    except Exception as e:
        logger.error("Failed to create LinkedIn company", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to create LinkedIn company: {str(e)}")

@router.get("/linkedin-companies")
async def get_linkedin_companies(
    limit: int = Query(100, description="Number of records to return"),
    skip: int = Query(0, description="Number of records to skip"),
    industry: Optional[str] = Query(None, description="Filter by industry"),
    search: Optional[str] = Query(None, description="Search in company name, industry, or location")
):
    """Get LinkedIn companies with optional filtering and search"""
    try:
        service = get_mongodb_service()
        if search:
            data = await service.search_linkedin_companies(search, limit)
        elif industry:
            data = await service.get_linkedin_companies_by_industry(industry, limit)
        else:
            data = await service.get_all_linkedin_companies(limit, skip)
        
        logger.info("LinkedIn companies retrieved successfully", count=len(data))
        return {
            "success": True,
            "data": data,
            "count": len(data),
            "message": "LinkedIn companies retrieved successfully"
        }
    except Exception as e:
        logger.error("Failed to get LinkedIn companies", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get LinkedIn companies: {str(e)}")

@router.delete("/linkedin-companies/{company_id}")
async def delete_linkedin_company(company_id: str):
    """Delete LinkedIn company by ID"""
    try:
        service = get_mongodb_service()
        success = await service.delete_linkedin_company(company_id)
        if success:
            return {
                "success": True,
                "message": "LinkedIn company deleted successfully"
            }
        else:
            raise HTTPException(status_code=404, detail="LinkedIn company not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to delete LinkedIn company", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to delete LinkedIn company: {str(e)}")

@router.put("/linkedin-companies/{company_id}")
async def update_linkedin_company(company_id: str, data: Dict[str, Any]):
    """Update LinkedIn company by ID"""
    try:
        service = get_mongodb_service()
        result = await service.update_linkedin_company(company_id, data)
        if result:
            return {
                "success": True,
                "data": result,
                "message": "LinkedIn company updated successfully"
            }
        else:
            raise HTTPException(status_code=404, detail="LinkedIn company not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to update LinkedIn company", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to update LinkedIn company: {str(e)}")

@router.get("/visitors")
async def get_visitors(
    limit: int = Query(100, description="Number of records to return"),
    skip: int = Query(0, description="Number of records to skip")
):
    """Get all visitors"""
    try:
        service = get_mongodb_service()
        data = await service.get_all_visitors(limit, skip)
        logger.info("Visitors retrieved successfully", count=len(data))
        return {
            "success": True,
            "data": data,
            "count": len(data),
            "message": "Visitors retrieved successfully"
        }
    except Exception as e:
        logger.error("Failed to get visitors", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get visitors: {str(e)}")

@router.get("/companies")
async def get_companies(
    limit: int = Query(100, description="Number of records to return"),
    skip: int = Query(0, description="Number of records to skip")
):
    """Get all companies"""
    try:
        service = get_mongodb_service()
        data = await service.get_all_companies(limit, skip)
        logger.info("Companies retrieved successfully", count=len(data))
        return {
            "success": True,
            "data": data,
            "count": len(data),
            "message": "Companies retrieved successfully"
        }
    except Exception as e:
        logger.error("Failed to get companies", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get companies: {str(e)}")
