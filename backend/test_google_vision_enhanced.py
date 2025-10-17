#!/usr/bin/env python3
"""
Enhanced test for Google Vision API QR detection
"""

import asyncio
import aiohttp
import io
import qrcode
from PIL import Image

async def test_google_vision_enhanced():
    """Test Google Vision API with enhanced QR code"""
    print("🔍 Testing Google Vision API with enhanced QR code...")
    
    # Create a larger, higher quality QR code
    qr = qrcode.QRCode(
        version=3,  # Larger version
        box_size=20,  # Larger boxes
        border=10,  # Larger border
        error_correction=qrcode.constants.ERROR_CORRECT_H  # High error correction
    )
    qr.add_data("https://google-vision-enhanced-test.example.com")
    qr.make(fit=True)
    
    qr_img = qr.make_image(fill_color="black", back_color="white")
    
    # Resize to make it even larger
    qr_img = qr_img.resize((400, 400), Image.Resampling.LANCZOS)
    
    qr_bytes = io.BytesIO()
    qr_img.save(qr_bytes, format='PNG')
    qr_data = qr_bytes.getvalue()
    
    print(f"📊 Enhanced QR code size: {len(qr_data)} bytes")
    print(f"📊 QR code dimensions: {qr_img.size}")
    
    # Test Google Vision endpoint
    try:
        form_data = aiohttp.FormData()
        form_data.add_field('file', io.BytesIO(qr_data), filename='test_enhanced.png', content_type='image/png')
        
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

async def test_google_vision_direct():
    """Test Google Vision API directly without backend"""
    print("\n🔍 Testing Google Vision API directly...")
    
    try:
        from app.services.google_vision_service import google_vision_service
        
        # Create test QR code
        qr = qrcode.QRCode(version=2, box_size=15, border=8)
        qr.add_data("https://direct-test.example.com")
        qr.make(fit=True)
        
        qr_img = qr.make_image(fill_color="black", back_color="white")
        qr_img = qr_img.resize((300, 300), Image.Resampling.LANCZOS)
        
        qr_bytes = io.BytesIO()
        qr_img.save(qr_bytes, format='PNG')
        qr_data = qr_bytes.getvalue()
        
        print(f"📊 Direct test QR code size: {len(qr_data)} bytes")
        
        # Test directly
        qr_codes = await google_vision_service.detect_qr_codes(qr_data)
        
        if qr_codes:
            print(f"✅ Direct Google Vision working: {len(qr_codes)} codes found")
            for qr in qr_codes:
                print(f"  - Data: {qr['data']}")
                print(f"  - Method: {qr['method']}")
                print(f"  - Confidence: {qr.get('confidence', 'N/A')}")
            return True
        else:
            print("❌ Direct Google Vision found no QR codes")
            return False
            
    except Exception as e:
        print(f"❌ Direct Google Vision test failed: {e}")
        return False

async def main():
    """Run enhanced Google Vision tests"""
    print("🚀 Testing Google Vision API with enhanced QR codes...")
    
    # Test 1: Enhanced QR code via backend
    enhanced_ok = await test_google_vision_enhanced()
    
    # Test 2: Direct API test
    direct_ok = await test_google_vision_direct()
    
    print(f"\n📊 Enhanced Test Results:")
    print(f"Enhanced QR Code: {'✅' if enhanced_ok else '❌'}")
    print(f"Direct API Test: {'✅' if direct_ok else '❌'}")
    
    if enhanced_ok or direct_ok:
        print("🎉 Google Vision API is working!")
    else:
        print("⚠️ Google Vision API might need different configuration")
        print("💡 Try using a real QR code image instead of generated one")

if __name__ == "__main__":
    asyncio.run(main())

