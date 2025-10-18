#!/usr/bin/env python3
"""
Simple OCR Server - Clean and reliable OCR implementation
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
    print("✅ Environment variables loaded from .env file")
except ImportError:
    print("⚠️ python-dotenv not installed, using system environment variables")

from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from typing import List, Dict, Any
from fastapi.middleware.cors import CORSMiddleware
import structlog
import cv2
import numpy as np
from PIL import Image
import io
import pytesseract

# Try to import pyzbar, but handle gracefully if not available
try:
    from pyzbar import pyzbar
    PYZBAR_AVAILABLE = True
    print("✅ pyzbar available - QR code detection enabled")
except ImportError:
    PYZBAR_AVAILABLE = False
    print("⚠️ pyzbar not available - QR code detection will use OpenCV only")

# Import the new OCR service
from app.services.ocr_service import OCRService

# Import new modular services
from app.services.qr_service import QRService
from app.services.business_card_service import BusinessCardService
from app.services.image_processing_service import ImageProcessingService
from app.services.google_vision_service import google_vision_service

# Import MongoDB services
from app.core.mongodb import connect_to_mongo, close_mongo_connection, get_collection
from app.services.mongodb_service import MongoDBService

# Initialize MongoDB service
mongodb_service = None

def get_mongodb_service():
    """Get MongoDB service instance, ensuring it's initialized"""
    global mongodb_service
    if mongodb_service is None:
        raise HTTPException(status_code=500, detail="MongoDB service not initialized. Please check server startup.")
    return mongodb_service

# Import LinkedIn scraper
try:
    from linkedin_scraper import LinkedInScraperService
    LINKEDIN_SCRAPER_AVAILABLE = True
    print("✅ LinkedIn scraper available")
except ImportError as e:
    LINKEDIN_SCRAPER_AVAILABLE = False
    print(f"⚠️ LinkedIn scraper not available: {e}")
    print("Install with: pip install scrapy scrapy-playwright playwright")

# Setup logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)

# Initialize services
ocr_service = OCRService()
qr_service = QRService()
business_card_service = BusinessCardService()
image_processing_service = ImageProcessingService()
# MongoDB service will be initialized after connection
mongodb_service = None

def detect_qr_codes(image_data: bytes) -> list:
    """Detect QR codes in the image using multiple methods"""
    return qr_service.detect_qr_codes(image_data)


def parse_qr_content(qr_data: str) -> dict:
    """Parse QR code content and extract structured information"""
    return qr_service.parse_qr_content(qr_data)


# QR parsing functions moved to QRService


def extract_business_card_info(text: str) -> dict:
    """Extract structured business card information from OCR text"""
    return business_card_service.extract_business_card_info(text)

# Create FastAPI application
app = FastAPI(
    title="Simple OCR Server",
    version="1.0.0",
    description="Clean and reliable OCR functionality with MongoDB integration"
)

# MongoDB connection management
@app.on_event("startup")
async def startup_event():
    """Initialize MongoDB connection on startup"""
    global mongodb_service
    try:
        await connect_to_mongo()
        mongodb_service = MongoDBService()
        # Initialize the database connection in the service
        mongodb_service._get_db()
        logger.info("✅ MongoDB connected successfully")
    except Exception as e:
        logger.error("❌ Failed to connect to MongoDB", error=str(e))

@app.on_event("shutdown")
async def shutdown_event():
    """Close MongoDB connection on shutdown"""
    try:
        await close_mongo_connection()
        logger.info("✅ MongoDB connection closed")
    except Exception as e:
        logger.error("❌ Error closing MongoDB connection", error=str(e))

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Simple OCR Server",
        "status": "running",
        "tesseract_version": pytesseract.get_tesseract_version()
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "tesseract_available": True,
        "tesseract_version": pytesseract.get_tesseract_version()
    }


def enhance_image_for_ocr(cv_image):
    """Apply multiple image enhancement techniques for better OCR"""
    return image_processing_service.enhance_image_for_ocr(cv_image)


def process_image_with_tesseract(image, cv_image):
    """Process image with Tesseract using multiple enhancement techniques"""
    return image_processing_service.process_image_with_tesseract(image, cv_image)


@app.post("/ocr")
async def process_ocr(file: UploadFile = File(...)):
    """Process OCR with uploaded image using multi-engine OCR service"""
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read file content
        content = await file.read()
        
        logger.info("🚀 Processing OCR request", 
                   filename=file.filename, 
                   file_size=len(content))
        
        # Debug: Log image details
        try:
            from PIL import Image
            import io
            img = Image.open(io.BytesIO(content))
            logger.info("📸 Received image details", 
                       format=img.format, 
                       mode=img.mode, 
                       size=f"{img.width}x{img.height}")
        except Exception as e:
            logger.warning("⚠️ Could not analyze image", error=str(e))
        
        # Process with multi-engine OCR service
        result = await ocr_service.process_image(content, engine='auto')
        
        # Detect QR codes
        logger.info("🔍 Detecting QR codes...")
        qr_codes = detect_qr_codes(content)
        logger.info(f"📱 Found {len(qr_codes)} QR codes")
        
        logger.info("✅ OCR processing completed", 
                   filename=file.filename, 
                   success=result["success"],
                   text_length=len(result.get("text", "")),
                   confidence=result.get("confidence", 0),
                   engine=result.get("engine", "unknown"),
                   qr_count=len(qr_codes))
        
        return {
            "success": result["success"],
            "filename": file.filename,
            "text": result.get("text", ""),
            "confidence": result.get("confidence", 0.0),
            "engine": result.get("engine", "unknown"),
            "qr_codes": qr_codes,
            "error": result.get("error")
        }
        
    except Exception as e:
        logger.error("❌ OCR processing failed", error=str(e))
        return {
            "success": False,
            "error": str(e),
            "text": "",
            "confidence": 0.0
        }


@app.post("/business-card")
async def process_business_card(file: UploadFile = File(...)):
    """Process business card with OCR + Vision analysis"""
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read file content
        content = await file.read()
        
        logger.info("🚀 Processing business card", 
                   filename=file.filename, 
                   file_size=len(content))
        
        # Process with enhanced business card extraction (OCR + Vision)
        result = await ocr_service.extract_business_card_data(content, use_vision=True)
        
        logger.info("✅ Business card processing completed", 
                   filename=file.filename, 
                   success=result["success"],
                   confidence=result.get("confidence", 0),
                   vision_available=result.get("vision_available", False),
                   qr_count=result.get("qr_count", 0))
        
        # Save to MongoDB if processing was successful
        saved_data = None
        if result["success"] and result.get("data"):
            try:
                from app.models.mongodb_models import StructuredData
                
                # Create structured data object
                structured_data = StructuredData(
                    name=result["data"].get("name"),
                    title=result["data"].get("title"),
                    company=result["data"].get("company"),
                    phone=result["data"].get("phone"),
                    email=result["data"].get("email"),
                    website=result["data"].get("website"),
                    address=result["data"].get("address"),
                    other_info=result["data"].get("other_info", []),
                    source="file_upload",
                    processing_method=result.get("engine_used", "unknown"),
                    confidence_score=result.get("confidence", 0.0),
                    raw_text=result.get("raw_text", "")
                )
                
                # Save to MongoDB
                service = get_mongodb_service()
                saved_data = await service.save_structured_data(structured_data)
                logger.info("✅ Business card data saved to MongoDB", id=saved_data.get("id"))
                
            except Exception as e:
                logger.warning("⚠️ Failed to save business card data to MongoDB", error=str(e))
        
        return {
            "success": result["success"],
            "filename": file.filename,
            "structured_data": result.get("data", {}),
            "confidence": result.get("confidence", 0.0),
            "raw_text": result.get("raw_text", ""),
            "engine_used": result.get("engine_used", "unknown"),
            "qr_codes": result.get("qr_codes", []),
            "qr_count": result.get("qr_count", 0),
            "vision_analysis": result.get("vision_analysis"),
            "vision_available": result.get("vision_available", False),
            "saved_to_database": saved_data is not None,
            "database_id": saved_data.get("id") if saved_data else None,
            "error": result.get("error")
        }
        
    except Exception as e:
        logger.error("❌ Business card processing failed", error=str(e))
        return {
            "success": False,
            "error": str(e),
            "structured_data": {},
            "confidence": 0.0
        }


@app.post("/qr-scan-goqr")
async def scan_qr_codes_goqr(
    file: UploadFile = File(...)
):
    """Scan QR codes using goQR.me API (backend proxy to avoid CORS)"""
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read file content
        content = await file.read()
        
        logger.info("🔍 Starting goQR.me API scan", 
                   filename=file.filename, 
                   file_size=len(content))
        
        # Call goQR.me API from backend
        import aiohttp
        import io
        
        form_data = aiohttp.FormData()
        form_data.add_field('file', io.BytesIO(content), filename=file.filename, content_type=file.content_type)
        
        async with aiohttp.ClientSession() as session:
            async with session.post('https://api.qrserver.com/v1/read-qr-code/', data=form_data) as response:
                if response.status == 200:
                    result = await response.json()
                    logger.info(f"📊 goQR.me API response: {result}")
                    
                    # Parse the response
                    qr_codes = []
                    if result and len(result) > 0 and result[0].get('symbol'):
                        for symbol in result[0]['symbol']:
                            if symbol.get('data') and not symbol.get('error'):
                                qr_codes.append({
                                    "data": symbol['data'],
                                    "type": "QRCODE",
                                    "rect": {"x": 0, "y": 0, "width": 0, "height": 0},
                                    "method": "goQR.me API (backend proxy)"
                                })
                    
                    logger.info(f"✅ goQR.me API found {len(qr_codes)} QR codes")
                    return {
                        "success": True,
                        "filename": file.filename,
                        "qr_codes": qr_codes,
                        "count": len(qr_codes),
                        "method": "goQR.me API (backend proxy)"
                    }
                else:
                    # Get detailed error information
                    error_text = await response.text()
                    logger.warning(f"goQR.me API failed: {response.status} - {error_text}")
                    return {
                        "success": False,
                        "filename": file.filename,
                        "qr_codes": [],
                        "count": 0,
                        "error": f"API request failed: {response.status} - {error_text}"
                    }
                    
    except Exception as e:
        logger.error(f"goQR.me API scan failed: {e}")
        raise HTTPException(status_code=500, detail=f"QR scan failed: {str(e)}")


@app.post("/qr-scan-google")
async def scan_qr_codes_google_vision(
    file: UploadFile = File(...)
):
    """Scan QR codes using Google Vision API"""
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read file content
        content = await file.read()
        
        logger.info("🔍 Starting Google Vision API scan", 
                   filename=file.filename, 
                   file_size=len(content))
        
        # Check if Google Vision is available
        if not google_vision_service.is_available():
            logger.warning("Google Vision API not available")
            return {
                "success": False,
                "filename": file.filename,
                "qr_codes": [],
                "count": 0,
                "error": "Google Vision API not available. Please set up Google Cloud credentials."
            }
        
        # Detect QR codes using Google Vision
        qr_codes = await google_vision_service.detect_qr_codes(content)
        
        logger.info(f"✅ Google Vision found {len(qr_codes)} QR codes")
        return {
            "success": True,
            "filename": file.filename,
            "qr_codes": qr_codes,
            "count": len(qr_codes),
            "method": "Google Vision API"
        }
        
    except Exception as e:
        logger.error(f"Google Vision API scan failed: {e}")
        raise HTTPException(status_code=500, detail=f"QR scan failed: {str(e)}")


@app.post("/qr-scan")
async def scan_qr_codes(
    file: UploadFile = File(...),
    fetch_url_details: bool = False
):
    """Scan for QR codes in the image and optionally fetch URL details"""
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read file content
        content = await file.read()
        
        logger.info("🔍 Starting QR code scan", 
                   filename=file.filename, 
                   file_size=len(content),
                   fetch_url_details=fetch_url_details)
        
        # Detect QR codes
        qr_codes = detect_qr_codes(content)
        
        # Parse QR codes
        parsed_data = {}
        qr_results = []
        
        for qr in qr_codes:
            qr_data = qr.get("data", "")
            qr_type = qr.get("type", "QRCODE")
            
            # Parse QR content
            parsed_info = parse_qr_content(qr_data)
            
            qr_results.append({
                "data": qr_data,
                "type": qr_type,
                "parsed": parsed_info,
                "rect": qr.get("rect", {})
            })
            
            # Add to parsed data if it contains useful information
            if parsed_info.get("details"):
                parsed_data.update(parsed_info["details"])
        
        # Fetch URL details if requested and URLs found
        url_details = {}
        if fetch_url_details and qr_codes:
            urls_to_fetch = []
            for qr in qr_codes:
                parsed_info = qr.get("parsed", {})
                if parsed_info.get("content_type") == "url" or qr.get("data", "").startswith(('http://', 'https://', 'www.')):
                    urls_to_fetch.append(qr["data"])
            
            if urls_to_fetch:
                try:
                    from app.services.qr_fetch_service import fetch_multiple_qr_urls
                    url_details = await fetch_multiple_qr_urls(urls_to_fetch)
                    logger.info("URL details fetched", 
                               urls_fetched=len(url_details),
                               successful_fetches=sum(1 for details in url_details.values() if details.get("success")))
                except Exception as e:
                    logger.warning("Failed to fetch URL details", error=str(e))
                    url_details = {"error": str(e)}
        
        logger.info("✅ QR code scanning completed", 
                   filename=file.filename, 
                   qr_count=len(qr_codes),
                   url_details_fetched=bool(url_details))
        
        return {
            "success": True,
            "filename": file.filename,
            "qr_codes": qr_results,
            "parsed_data": parsed_data,
            "count": len(qr_codes),
            "url_details": url_details if fetch_url_details else {},
            "error": None
        }
        
    except Exception as e:
        logger.error("❌ QR code scanning failed", filename=file.filename, error=str(e))
        return {
            "success": False,
            "filename": file.filename,
            "qr_codes": [],
            "parsed_data": {},
            "count": 0,
            "url_details": {},
            "error": str(e)
        }


@app.post("/business-card-vision")
async def process_business_card_vision(file: UploadFile = File(...)):
    """Process business card using vision analysis only"""
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read file content
        content = await file.read()
        
        logger.info("🚀 Processing business card with vision analysis", 
                   filename=file.filename, 
                   file_size=len(content))
        
        # Process with vision-only analysis
        result = await ocr_service.analyze_business_card_vision(content)
        
        logger.info("✅ Vision analysis completed", 
                   filename=file.filename, 
                   success=result["success"],
                   confidence=result.get("confidence", 0),
                   method=result.get("method", "unknown"))
        
        return {
            "success": result["success"],
            "filename": file.filename,
            "structured_data": result.get("data", {}),
            "confidence": result.get("confidence", 0.0),
            "analysis_notes": result.get("analysis_notes", ""),
            "quality_assessment": result.get("quality_assessment", {}),
            "raw_analysis": result.get("raw_analysis", ""),
            "method": result.get("method", "vision_only"),
            "error": result.get("error")
        }
        
    except Exception as e:
        logger.error("❌ Vision analysis failed", error=str(e))
        return {
            "success": False,
            "error": str(e),
            "structured_data": {},
            "confidence": 0.0
        }


@app.post("/batch-ocr")
async def batch_ocr(files: List[UploadFile] = File(...)):
    """Process multiple files for OCR"""
    try:
        if len(files) > 10:
            raise HTTPException(status_code=400, detail="Maximum 10 files allowed per batch")
        
        results = []
        
        for file in files:
            try:
                # Validate file type
                if not file.content_type.startswith('image/'):
                    results.append({
                        "filename": file.filename,
                        "success": False,
                        "error": "File must be an image",
                        "text": "",
                        "confidence": 0.0
                    })
                    continue
                
                # Read file content
                content = await file.read()
                
                logger.info("🚀 Processing batch file", 
                           filename=file.filename, 
                           file_size=len(content))
                
                # Process with multi-engine OCR service
                result = await ocr_service.process_image(content, engine='auto')
                
                # Detect QR codes
                qr_codes = detect_qr_codes(content)
                
                # Extract structured information if OCR was successful
                structured_info = None
                if result.get("success") and result.get("text"):
                    # Use AI-powered extraction instead of regex
                    from app.services.ai_extraction_service import ai_extraction_service
                    structured_info = await ai_extraction_service.extract_business_card_data(result.get("text", ""))
                
                results.append({
                    "filename": file.filename,
                    "success": result["success"],
                    "text": result.get("text", ""),
                    "confidence": result.get("confidence", 0.0),
                    "engine": result.get("engine", "unknown"),
                    "qr_codes": qr_codes,
                    "structuredInfo": structured_info,
                    "error": result.get("error")
                })
                
            except Exception as e:
                logger.error("❌ Batch file processing failed", 
                           filename=file.filename, 
                           error=str(e))
                results.append({
                    "filename": file.filename,
                    "success": False,
                    "error": str(e),
                    "text": "",
                    "confidence": 0.0
                })
        
        successful_count = sum(1 for r in results if r["success"])
        logger.info("✅ Batch processing completed", 
                   total_files=len(files),
                   successful=successful_count)
        
        return {
            "success": True,
            "total_files": len(files),
            "successful_files": successful_count,
            "results": results
        }
        
    except Exception as e:
        logger.error("❌ Batch OCR processing failed", error=str(e))
        return {
            "success": False,
            "error": str(e),
            "results": []
        }


@app.post("/debug-qr")
async def debug_qr(file: UploadFile = File(...)):
    """Debug QR code detection with detailed information"""
    try:
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        content = await file.read()
        
        # Test basic image decoding
        nparr = np.frombuffer(content, np.uint8)
        cv_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        debug_info = {
            "file_size": len(content),
            "image_shape": cv_image.shape if cv_image is not None else None,
            "pyzbar_available": PYZBAR_AVAILABLE,
            "opencv_available": True
        }
        
        # Test QR detection
        qr_codes = detect_qr_codes(content)
        
        return {
            "success": True,
            "debug_info": debug_info,
            "qr_codes": qr_codes,
            "qr_count": len(qr_codes)
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "debug_info": {"error": str(e)}
        }

@app.post("/debug-ocr")
async def debug_ocr(file: UploadFile = File(...)):
    """Debug OCR with detailed results"""
    try:
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        content = await file.read()
        image = Image.open(io.BytesIO(content))
        cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        result = process_image_with_tesseract(image, cv_image)
        
        return {
            "success": True,
            "filename": file.filename,
            "best_result": {
                "text": result["best_text"],
                "confidence": result["best_confidence"],
                "method": result["best_method"]
            },
            "all_results": result["all_results"]
        }
        
    except Exception as e:
        logger.error("Debug OCR failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Debug OCR failed: {str(e)}")


@app.post("/extract-url-content")
async def extract_url_content(request: dict):
    """Extract detailed information from a URL"""
    try:
        url = request.get('url')
        if not url:
            raise HTTPException(status_code=400, detail="URL is required")
        
        logger.info(f"🌐 Extracting content from URL: {url}")
        
        # Use the URL content service
        from app.services.url_content_service import url_content_service
        result = await url_content_service.extract_contact_info(url)
        
        logger.info(f"✅ URL content extraction completed", 
                   success=result.get('success'),
                   title=result.get('title'),
                   emails_found=len(result.get('contact_info', {}).get('emails', [])),
                   phones_found=len(result.get('contact_info', {}).get('phones', [])))
        
        return result
        
    except Exception as e:
        logger.error(f"URL content extraction failed: {e}")
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")


@app.post("/scrape-linkedin-company")
async def scrape_linkedin_company(
    company_name: str = Query(..., description="Company name to scrape from LinkedIn")
):
    """Scrape company information from LinkedIn"""
    try:
        if not LINKEDIN_SCRAPER_AVAILABLE:
            raise HTTPException(
                status_code=503, 
                detail="LinkedIn scraper not available. Install scrapy and scrapy-playwright"
            )
        
        logger.info(f"Scraping LinkedIn for company: {company_name}")
        
        # Initialize scraper service
        scraper = LinkedInScraperService()
        
        # Scrape company information
        result = await scraper.scrape_company(company_name)
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        # Save to MongoDB if scraping was successful
        try:
            from app.models.mongodb_models import LinkedInCompany
            
            # Create LinkedInCompany object
            linkedin_company = LinkedInCompany(
                company_name=result.get("company_name"),
                website=result.get("website"),
                industry=result.get("industry"),
                company_size=result.get("size"),
                hq_location=result.get("hq_location"),
                company_type=result.get("company_type"),
                linkedin_url=result.get("url")
            )
            
            # Save to MongoDB
            service = get_mongodb_service()
            saved_company = await service.save_linkedin_company(linkedin_company)
            if saved_company:
                logger.info(f"✅ LinkedIn company saved to MongoDB: {result.get('company_name')}")
            else:
                logger.warning(f"⚠️ Failed to save to MongoDB: {result.get('company_name')}")
                
        except Exception as db_error:
            logger.warning(f"⚠️ MongoDB save failed: {db_error}")
            # Continue with response even if database save fails
        
        logger.info(f"✅ LinkedIn scraping completed for: {result.get('company_name', company_name)}")
        
        return {
            "success": True,
            "company_name": result.get("company_name"),
            "website": result.get("website"),
            "industry": result.get("industry"),
            "size": result.get("size"),
            "hq_location": result.get("hq_location"),
            "company_type": result.get("company_type"),
            "linkedin_url": result.get("url"),
            "scraped_at": result.get("scraped_at")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"LinkedIn scraping failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"LinkedIn scraping failed: {str(e)}")


@app.post("/scrape-linkedin-companies")
async def scrape_linkedin_companies(
    company_names: List[str] = Query(..., description="List of company names to scrape")
):
    """Scrape multiple companies from LinkedIn"""
    try:
        if not LINKEDIN_SCRAPER_AVAILABLE:
            raise HTTPException(
                status_code=503, 
                detail="LinkedIn scraper not available. Install scrapy and scrapy-playwright"
            )
        
        logger.info(f"Scraping LinkedIn for {len(company_names)} companies")
        
        # Initialize scraper service
        scraper = LinkedInScraperService()
        
        # Scrape multiple companies
        results = await scraper.scrape_multiple_companies(company_names)
        
        return {
            "success": True,
            "companies": results,
            "total_scraped": len(results),
            "scraped_at": results[0].get("scraped_at") if results else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"LinkedIn batch scraping failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"LinkedIn batch scraping failed: {str(e)}")


# MongoDB Data Endpoints
@app.post("/data/structured-data")
async def create_structured_data(data: dict):
    """Create new structured data entry in MongoDB"""
    try:
        from app.models.mongodb_models import StructuredData
        
        # Create StructuredData object
        structured_data = StructuredData(**data)
        
        # Save to MongoDB
        service = get_mongodb_service()
        result = await service.save_structured_data(structured_data)
        
        logger.info("✅ Structured data saved to MongoDB", id=result.get("id"))
        return {
            "success": True,
            "data": result,
            "message": "Structured data created successfully"
        }
    except Exception as e:
        logger.error("❌ Failed to create structured data", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to create structured data: {str(e)}")

@app.get("/data/structured-data")
async def get_structured_data(
    limit: int = Query(100, description="Number of records to return"),
    skip: int = Query(0, description="Number of records to skip"),
    source: str = Query(None, description="Filter by source (text_scan or file_upload)")
):
    """Get structured data from MongoDB with optional filtering"""
    try:
        service = get_mongodb_service()
        if source:
            data = await service.get_structured_data_by_source(source, limit)
        else:
            data = await service.get_all_structured_data(limit, skip)
        
        logger.info("✅ Structured data retrieved from MongoDB", count=len(data))
        return {
            "success": True,
            "data": data,
            "count": len(data),
            "message": "Structured data retrieved successfully"
        }
    except Exception as e:
        logger.error("❌ Failed to get structured data", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get structured data: {str(e)}")

@app.delete("/data/structured-data/{data_id}")
async def delete_structured_data(data_id: str):
    """Delete structured data by ID from MongoDB"""
    try:
        service = get_mongodb_service()
        success = await service.delete_structured_data(data_id)
        if success:
            logger.info("✅ Structured data deleted from MongoDB", id=data_id)
            return {
                "success": True,
                "message": "Structured data deleted successfully"
            }
        else:
            raise HTTPException(status_code=404, detail="Structured data not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("❌ Failed to delete structured data", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to delete structured data: {str(e)}")

@app.post("/data/linkedin-companies")
async def create_linkedin_company(data: dict):
    """Create new LinkedIn company entry in MongoDB"""
    try:
        from app.models.mongodb_models import LinkedInCompany
        
        # Create LinkedInCompany object
        linkedin_company = LinkedInCompany(**data)
        
        # Save to MongoDB
        service = get_mongodb_service()
        result = await service.save_linkedin_company(linkedin_company)
        
        logger.info("✅ LinkedIn company saved to MongoDB", id=result.get("id"))
        return {
            "success": True,
            "data": result,
            "message": "LinkedIn company created successfully"
        }
    except Exception as e:
        logger.error("❌ Failed to create LinkedIn company", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to create LinkedIn company: {str(e)}")

@app.get("/data/linkedin-companies")
async def get_linkedin_companies(
    limit: int = Query(100, description="Number of records to return"),
    skip: int = Query(0, description="Number of records to skip"),
    industry: str = Query(None, description="Filter by industry"),
    search: str = Query(None, description="Search in company name, industry, or location")
):
    """Get LinkedIn companies from MongoDB with optional filtering and search"""
    try:
        service = get_mongodb_service()
        if search:
            data = await service.search_linkedin_companies(search, limit)
        elif industry:
            data = await service.get_linkedin_companies_by_industry(industry, limit)
        else:
            data = await service.get_all_linkedin_companies(limit, skip)
        
        logger.info("✅ LinkedIn companies retrieved from MongoDB", count=len(data))
        return {
            "success": True,
            "data": data,
            "count": len(data),
            "message": "LinkedIn companies retrieved successfully"
        }
    except Exception as e:
        logger.error("❌ Failed to get LinkedIn companies", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get LinkedIn companies: {str(e)}")

@app.delete("/data/linkedin-companies/{company_id}")
async def delete_linkedin_company(company_id: str):
    """Delete LinkedIn company by ID from MongoDB"""
    try:
        service = get_mongodb_service()
        success = await service.delete_linkedin_company(company_id)
        if success:
            logger.info("✅ LinkedIn company deleted from MongoDB", id=company_id)
            return {
                "success": True,
                "message": "LinkedIn company deleted successfully"
            }
        else:
            raise HTTPException(status_code=404, detail="LinkedIn company not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("❌ Failed to delete LinkedIn company", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to delete LinkedIn company: {str(e)}")

@app.put("/data/linkedin-companies/{company_id}")
async def update_linkedin_company(company_id: str, data: dict):
    """Update LinkedIn company by ID in MongoDB"""
    try:
        service = get_mongodb_service()
        result = await service.update_linkedin_company(company_id, data)
        if result:
            logger.info("✅ LinkedIn company updated in MongoDB", id=company_id)
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
        logger.error("❌ Failed to update LinkedIn company", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to update LinkedIn company: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Simple OCR Server with MongoDB...")
    print("📱 Frontend: http://localhost:5173")
    print("🔧 Backend API: http://localhost:8000")
    print("📚 API Docs: http://localhost:8000/docs")
    print("❤️  Health Check: http://localhost:8000/health")
    print("🗄️  MongoDB Integration: Enabled")
    print("📊 Data Endpoints: /data/structured-data, /data/linkedin-companies")
    uvicorn.run(app, host="0.0.0.0", port=8000)
