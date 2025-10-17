"""
MongoDB data models equivalent to Supabase tables
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId

class PyObjectId(ObjectId):
    """Custom ObjectId type for Pydantic"""
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string")
        return field_schema

class StructuredData(BaseModel):
    """Structured data model - equivalent to structured_data table"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    name: Optional[str] = None
    title: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    other_info: Optional[List[str]] = None
    source: str = Field(..., description="Source: 'text_scan' or 'file_upload'")
    processing_method: Optional[str] = None
    confidence_score: Optional[float] = Field(default=0.0, ge=0.0, le=1.0)
    raw_text: Optional[str] = None
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        json_schema_extra = {
            "example": {
                "name": "John Doe",
                "title": "Software Engineer",
                "company": "Tech Corp",
                "phone": "+1-555-0123",
                "email": "john@techcorp.com",
                "website": "https://techcorp.com",
                "address": "123 Tech Street, San Francisco, CA",
                "source": "text_scan",
                "processing_method": "Vision API (High Accuracy)",
                "confidence_score": 0.95,
                "raw_text": "John Doe Software Engineer Tech Corp..."
            }
        }

class LinkedInCompany(BaseModel):
    """LinkedIn company model - equivalent to linkedin_companies table"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    company_name: str = Field(..., description="Company name")
    website: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    hq_location: Optional[str] = None
    company_type: Optional[str] = None
    linkedin_url: Optional[str] = None
    scraped_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        json_schema_extra = {
            "example": {
                "company_name": "Tech Corp",
                "website": "https://techcorp.com",
                "industry": "Technology",
                "company_size": "100-500 employees",
                "hq_location": "San Francisco, CA",
                "company_type": "Private",
                "linkedin_url": "https://linkedin.com/company/techcorp"
            }
        }

class Visitor(BaseModel):
    """Visitor model - equivalent to visitors table"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    name: str = Field(..., description="Visitor name")
    email: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    title: Optional[str] = None
    summary: Optional[str] = None
    confidence_score: Optional[float] = Field(default=0.0, ge=0.0, le=1.0)
    company_id: Optional[PyObjectId] = None
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class Company(BaseModel):
    """Company model - equivalent to companies table"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    name: str = Field(..., description="Company name")
    domain: Optional[str] = None
    industry: Optional[str] = None
    size: Optional[str] = None
    funding_info: Optional[Dict[str, Any]] = None
    description: Optional[str] = None
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class Interaction(BaseModel):
    """Interaction model"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    visitor_id: PyObjectId = Field(..., description="Visitor ID")
    interaction_type: str = Field(..., description="Type of interaction")
    details: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class EnrichmentLog(BaseModel):
    """Enrichment log model"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    visitor_id: PyObjectId = Field(..., description="Visitor ID")
    enrichment_type: str = Field(..., description="Type of enrichment")
    status: str = Field(..., description="Enrichment status")
    details: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
