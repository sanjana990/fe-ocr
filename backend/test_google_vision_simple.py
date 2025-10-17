#!/usr/bin/env python3
"""
Simple test to see what Google Vision API can detect
"""

import asyncio
import aiohttp
import io

async def test_google_vision_simple():
    """Test what Google Vision API can detect from your business card"""
    print("🔍 Testing Google Vision API with your business card...")
    
    try:
        # Test with your business card image
        form_data = aiohttp.FormData()
        form_data.add_field('file', open('../test_business_card.png', 'rb'), filename='test_business_card.png', content_type='image/png')
        
        async with aiohttp.ClientSession() as session:
            async with session.post('http://localhost:8000/qr-scan-google', data=form_data) as response:
                print(f"📊 Google Vision response status: {response.status}")
                
                if response.status == 200:
                    result = await response.json()
                    print(f"📊 Google Vision response: {result}")
                    
                    if result.get('success'):
                        print("✅ Google Vision API is working!")
                        print(f"📊 QR codes found: {result.get('count', 0)}")
                        print(f"📊 Method: {result.get('method', 'Unknown')}")
                        
                        if result.get('qr_codes'):
                            for qr in result['qr_codes']:
                                print(f"  - QR Data: {qr['data']}")
                        else:
                            print("⚠️ No QR codes detected - this might be normal for Google Vision API")
                            print("💡 Google Vision API is better for text detection than QR codes")
                        
                        return True
                    else:
                        print(f"❌ Google Vision failed: {result.get('error', 'Unknown error')}")
                        return False
                else:
                    error_text = await response.text()
                    print(f"❌ Google Vision request failed: {response.status} - {error_text}")
                    return False
                    
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        return False

async def test_google_vision_text():
    """Test Google Vision API for text detection (its main strength)"""
    print("\n🔍 Testing Google Vision API for text detection...")
    
    try:
        # Test text detection endpoint (if it exists)
        form_data = aiohttp.FormData()
        form_data.add_field('file', open('../test_business_card.png', 'rb'), filename='test_business_card.png', content_type='image/png')
        
        async with aiohttp.ClientSession() as session:
            # Try OCR endpoint to see if Google Vision works for text
            async with session.post('http://localhost:8000/ocr', data=form_data) as response:
                print(f"📊 OCR response status: {response.status}")
                
                if response.status == 200:
                    result = await response.json()
                    print(f"📊 OCR response: {result}")
                    
                    if result.get('success'):
                        print("✅ Google Vision API is working for text detection!")
                        print(f"📊 Text extracted: {len(result.get('text', ''))} characters")
                        return True
                    else:
                        print(f"❌ OCR failed: {result.get('error', 'Unknown error')}")
                        return False
                else:
                    error_text = await response.text()
                    print(f"❌ OCR request failed: {response.status} - {error_text}")
                    return False
                    
    except Exception as e:
        print(f"❌ OCR test failed with error: {e}")
        return False

async def main():
    """Run simple Google Vision tests"""
    print("🚀 Testing Google Vision API capabilities...")
    
    # Test 1: QR detection
    qr_ok = await test_google_vision_simple()
    
    # Test 2: Text detection
    text_ok = await test_google_vision_text()
    
    print(f"\n📊 Test Results:")
    print(f"QR Detection: {'✅' if qr_ok else '❌'}")
    print(f"Text Detection: {'✅' if text_ok else '❌'}")
    
    if text_ok:
        print("🎉 Google Vision API is working for text detection!")
        print("💡 For QR codes, consider using specialized libraries like ZXing or jsQR")
    else:
        print("⚠️ Google Vision API might not be properly configured")

if __name__ == "__main__":
    asyncio.run(main())

