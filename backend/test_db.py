#!/usr/bin/env python3
"""
Test database connection
"""

import asyncio
import os
from database_service import database_service

async def test_database():
    print("🔍 Testing database connection...")
    
    # Check if credentials are loaded
    print(f"SUPABASE_URL: {'✅ Set' if database_service.supabase_url else '❌ Missing'}")
    print(f"SUPABASE_KEY: {'✅ Set' if database_service.supabase_key else '❌ Missing'}")
    print(f"Database Available: {'✅ Yes' if database_service.available else '❌ No'}")
    
    if database_service.available:
        print("\n🧪 Testing database save...")
        
        test_data = {
            "company_name": "Test Company",
            "website": "https://test.com",
            "industry": "Technology",
            "size": "1-10 employees",
            "hq_location": "Test City",
            "company_type": "Private Company",
            "url": "https://linkedin.com/company/test",
            "scraped_at": "2025-10-17T01:00:00"
        }
        
        result = await database_service.save_linkedin_company(test_data)
        if result:
            print("✅ Database save successful!")
            print(f"Saved data: {result}")
        else:
            print("❌ Database save failed!")
    else:
        print("❌ Database service not available. Check your .env file.")

if __name__ == "__main__":
    asyncio.run(test_database())
