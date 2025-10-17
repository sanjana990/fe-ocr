#!/usr/bin/env python3
"""
Test MongoDB Atlas connection
"""

import asyncio
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the app directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.core.mongodb import connect_to_mongo, close_mongo_connection
from app.core.mongodb import mongodb

async def test_mongodb_connection():
    """Test MongoDB Atlas connection"""
    try:
        print("🔍 Testing MongoDB Atlas connection...")
        
        # Check environment variables
        mongodb_url = os.getenv("MONGODB_URL")
        mongodb_database = os.getenv("MONGODB_DATABASE")
        
        if not mongodb_url:
            print("❌ MONGODB_URL environment variable not set")
            print("Please set MONGODB_URL in your .env file")
            return False
            
        if not mongodb_database:
            print("❌ MONGODB_DATABASE environment variable not set")
            print("Please set MONGODB_DATABASE in your .env file")
            return False
        
        print(f"📊 MongoDB URL: {mongodb_url[:50]}...")
        print(f"📊 Database: {mongodb_database}")
        
        # Connect to MongoDB
        await connect_to_mongo()
        print("✅ Connected to MongoDB Atlas successfully!")
        
        # Test database operations
        from app.core.mongodb import get_database
        db = get_database()
        
        # Test a simple operation
        collections = await db.list_collection_names()
        print(f"📁 Available collections: {collections}")
        
        # Test creating a test document
        test_collection = db["test_connection"]
        test_doc = {
            "message": "Hello MongoDB!",
            "timestamp": "2024-01-01T00:00:00Z",
            "test": True
        }
        
        result = await test_collection.insert_one(test_doc)
        print(f"✅ Test document inserted with ID: {result.inserted_id}")
        
        # Clean up test document
        await test_collection.delete_one({"_id": result.inserted_id})
        print("🧹 Test document cleaned up")
        
        print("🎉 MongoDB Atlas connection test successful!")
        return True
        
    except Exception as e:
        print(f"❌ MongoDB connection failed: {str(e)}")
        print("\n🔧 Troubleshooting tips:")
        print("1. Check your MONGODB_URL format")
        print("2. Verify your database user credentials")
        print("3. Ensure your IP is whitelisted in MongoDB Atlas")
        print("4. Check if your cluster is running")
        return False
    finally:
        try:
            await close_mongo_connection()
            print("🔌 MongoDB connection closed")
        except:
            pass

async def main():
    """Main test function"""
    print("🚀 MongoDB Atlas Connection Test")
    print("=" * 50)
    
    success = await test_mongodb_connection()
    
    if success:
        print("\n✅ All tests passed! Your MongoDB Atlas setup is working correctly.")
        print("You can now run your application with MongoDB integration.")
    else:
        print("\n❌ Connection test failed. Please check your setup.")
        print("Refer to the MONGODB_MIGRATION_GUIDE.md for detailed setup instructions.")

if __name__ == "__main__":
    asyncio.run(main())
