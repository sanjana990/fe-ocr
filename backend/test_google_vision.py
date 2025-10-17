#!/usr/bin/env python3
"""
Test script for Google Vision API QR detection
"""

import asyncio
import aiohttp
import io
import qrcode
from PIL import Image

async def test_google_vision_qr():
    """Test Google Vision API QR detection"""
    print("🔍 Testing Google Vision API QR detection...")
    
    # Create a test QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data("https://google-vision-test.example.com")
    qr.make(fit=True)
    
    qr_img = qr.make_image(fill_color="black", back_color="white")
    qr_bytes = io.BytesIO()
    qr_img.save(qr_bytes, format='PNG')
    qr_data = qr_bytes.getvalue()
    
    print(f"📊 Test QR code size: {len(qr_data)} bytes")
    
    # Test Google Vision endpoint
    try:
        form_data = aiohttp.FormData()
        form_data.add_field('file', io.BytesIO(qr_data), filename='test_google_vision.png', content_type='image/png')
        
        async with aiohttp.ClientSession() as session:
            async with session.post('http://localhost:8000/qr-scan-google', data=form_data) as response:
                print(f"📊 Google Vision response status: {response.status}")
                
                if response.status == 200:
                    result = await response.json()
                    print(f"📊 Google Vision response: {result}")
                    
                    if result.get('success') and result.get('qr_codes'):
                        print(f"✅ Google Vision working: {len(result['qr_codes'])} codes found")
                        for qr in result['qr_codes']:
                            print(f"  - Data: {qr['data']}")
                            print(f"  - Method: {qr['method']}")
                            print(f"  - Confidence: {qr.get('confidence', 'N/A')}")
                        return True
                    else:
                        print(f"❌ Google Vision failed: {result.get('error', 'No QR codes found')}")
                        return False
                else:
                    error_text = await response.text()
                    print(f"❌ Google Vision request failed: {response.status} - {error_text}")
                    return False
                    
    except Exception as e:
        print(f"❌ Google Vision test failed with error: {e}")
        return False

async def test_google_vision_setup():
    """Test if Google Vision API is properly set up"""
    print("\n🔍 Testing Google Vision API setup...")
    
    try:
        from app.services.google_vision_service import google_vision_service
        
        if google_vision_service.is_available():
            print("✅ Google Vision API is available")
            return True
        else:
            print("❌ Google Vision API not available")
            print("💡 Setup instructions:")
            print("1. Go to Google Cloud Console")
            print("2. Enable Vision API")
            print("3. Create service account credentials")
            print("4. Set GOOGLE_APPLICATION_CREDENTIALS environment variable")
            return False
            
    except Exception as e:
        print(f"❌ Google Vision setup test failed: {e}")
        return False

async def main():
    """Run all Google Vision tests"""
    print("🚀 Testing Google Vision API setup...")
    
    # Test 1: Setup check
    setup_ok = await test_google_vision_setup()
    
    if not setup_ok:
        print("\n⚠️ Google Vision API not set up. Please configure credentials first.")
        return
    
    # Test 2: QR detection
    qr_ok = await test_google_vision_qr()
    
    print(f"\n📊 Test Results:")
    print(f"Setup: {'✅' if setup_ok else '❌'}")
    print(f"QR Detection: {'✅' if qr_ok else '❌'}")
    
    if setup_ok and qr_ok:
        print("🎉 Google Vision API is working perfectly!")
    else:
        print("⚠️ Some tests failed. Check the setup instructions above.")

if __name__ == "__main__":
    asyncio.run(main())

