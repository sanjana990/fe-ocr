#!/usr/bin/env python3
"""
Test cases for goQR.me API integration
Tests the backend proxy endpoint and goQR.me API functionality
"""

import asyncio
import aiohttp
import io
import json
from PIL import Image
import requests
import base64

# Test configuration
BACKEND_URL = "http://localhost:8000"
GOQR_API_URL = "https://api.qrserver.com/v1/read-qr-code/"

class GoQRAPITester:
    def __init__(self):
        self.test_results = []
    
    def create_test_qr_image(self, data: str = "https://test.example.com") -> bytes:
        """Create a simple test QR code image"""
        try:
            import qrcode
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(data)
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            img_bytes = io.BytesIO()
            img.save(img_bytes, format='PNG')
            return img_bytes.getvalue()
        except ImportError:
            print("⚠️ qrcode library not available, using mock image")
            # Create a simple test image
            img = Image.new('RGB', (200, 200), color='white')
            img_bytes = io.BytesIO()
            img.save(img_bytes, format='PNG')
            return img_bytes.getvalue()
    
    async def test_goqr_direct_api(self):
        """Test goQR.me API directly"""
        print("\n🔍 Testing goQR.me API directly...")
        
        try:
            # Create test QR image
            qr_image = self.create_test_qr_image("https://test.example.com")
            
            # Test direct API call
            form_data = aiohttp.FormData()
            form_data.add_field('file', io.BytesIO(qr_image), filename='test_qr.png', content_type='image/png')
            
            async with aiohttp.ClientSession() as session:
                async with session.post(GOQR_API_URL, data=form_data) as response:
                    print(f"📊 Direct API Status: {response.status}")
                    
                    if response.status == 200:
                        result = await response.json()
                        print(f"📊 Direct API Response: {result}")
                        
                        if result and len(result) > 0 and result[0].get('symbol'):
                            qr_data = result[0]['symbol'][0]
                            if qr_data.get('data') and not qr_data.get('error'):
                                print(f"✅ Direct API Success: {qr_data['data']}")
                                return True
                            else:
                                print(f"❌ Direct API Error: {qr_data.get('error', 'Unknown error')}")
                        else:
                            print("❌ Direct API: No QR codes found")
                    else:
                        print(f"❌ Direct API Failed: {response.status}")
                        error_text = await response.text()
                        print(f"Error details: {error_text}")
                        
        except Exception as e:
            print(f"❌ Direct API Exception: {e}")
            
        return False
    
    async def test_backend_proxy(self):
        """Test our backend proxy endpoint"""
        print("\n🔍 Testing backend proxy endpoint...")
        
        try:
            # Create test QR image
            qr_image = self.create_test_qr_image("https://backend.test.com")
            
            # Test backend proxy
            form_data = aiohttp.FormData()
            form_data.add_field('file', io.BytesIO(qr_image), filename='test_qr.png', content_type='image/png')
            
            async with aiohttp.ClientSession() as session:
                async with session.post(f"{BACKEND_URL}/qr-scan-goqr", data=form_data) as response:
                    print(f"📊 Backend Proxy Status: {response.status}")
                    
                    if response.status == 200:
                        result = await response.json()
                        print(f"📊 Backend Proxy Response: {result}")
                        
                        if result.get('success') and result.get('qr_codes'):
                            print(f"✅ Backend Proxy Success: {len(result['qr_codes'])} QR codes found")
                            for qr in result['qr_codes']:
                                print(f"  - Data: {qr['data']}")
                                print(f"  - Method: {qr['method']}")
                            return True
                        else:
                            print(f"❌ Backend Proxy: {result.get('error', 'No QR codes found')}")
                    else:
                        print(f"❌ Backend Proxy Failed: {response.status}")
                        error_text = await response.text()
                        print(f"Error details: {error_text}")
                        
        except Exception as e:
            print(f"❌ Backend Proxy Exception: {e}")
            
        return False
    
    async def test_different_qr_types(self):
        """Test different types of QR codes"""
        print("\n🔍 Testing different QR code types...")
        
        test_cases = [
            ("URL", "https://www.google.com"),
            ("Email", "mailto:test@example.com"),
            ("Phone", "tel:+1234567890"),
            ("Text", "Hello World!"),
            ("vCard", "BEGIN:VCARD\nFN:John Doe\nEND:VCARD"),
            ("WiFi", "WIFI:T:WPA;S:MyNetwork;P:password123;;"),
        ]
        
        results = []
        
        for qr_type, qr_data in test_cases:
            print(f"\n  Testing {qr_type}: {qr_data}")
            
            try:
                # Create QR image
                qr_image = self.create_test_qr_image(qr_data)
                
                # Test with backend proxy
                form_data = aiohttp.FormData()
                form_data.add_field('file', io.BytesIO(qr_image), filename=f'{qr_type.lower()}_test.png', content_type='image/png')
                
                async with aiohttp.ClientSession() as session:
                    async with session.post(f"{BACKEND_URL}/qr-scan-goqr", data=form_data) as response:
                        if response.status == 200:
                            result = await response.json()
                            if result.get('success') and result.get('qr_codes'):
                                detected_data = result['qr_codes'][0]['data']
                                success = detected_data == qr_data
                                print(f"    {'✅' if success else '❌'} {qr_type}: {detected_data}")
                                results.append((qr_type, success))
                            else:
                                print(f"    ❌ {qr_type}: No QR codes detected")
                                results.append((qr_type, False))
                        else:
                            print(f"    ❌ {qr_type}: HTTP {response.status}")
                            results.append((qr_type, False))
                            
            except Exception as e:
                print(f"    ❌ {qr_type}: Exception - {e}")
                results.append((qr_type, False))
        
        return results
    
    async def test_image_formats(self):
        """Test different image formats"""
        print("\n🔍 Testing different image formats...")
        
        formats = ['PNG', 'JPEG', 'GIF']
        results = []
        
        for fmt in formats:
            print(f"\n  Testing {fmt} format...")
            
            try:
                # Create QR image in different format
                qr_image = self.create_test_qr_image(f"https://{fmt.lower()}.test.com")
                
                # Convert to different format if needed
                if fmt != 'PNG':
                    img = Image.open(io.BytesIO(qr_image))
                    img_bytes = io.BytesIO()
                    img.save(img_bytes, format=fmt)
                    qr_image = img_bytes.getvalue()
                
                # Test with backend proxy
                form_data = aiohttp.FormData()
                form_data.add_field('file', io.BytesIO(qr_image), filename=f'test.{fmt.lower()}', content_type=f'image/{fmt.lower()}')
                
                async with aiohttp.ClientSession() as session:
                    async with session.post(f"{BACKEND_URL}/qr-scan-goqr", data=form_data) as response:
                        if response.status == 200:
                            result = await response.json()
                            if result.get('success') and result.get('qr_codes'):
                                print(f"    ✅ {fmt}: QR code detected")
                                results.append((fmt, True))
                            else:
                                print(f"    ❌ {fmt}: No QR codes detected")
                                results.append((fmt, False))
                        else:
                            print(f"    ❌ {fmt}: HTTP {response.status}")
                            results.append((fmt, False))
                            
            except Exception as e:
                print(f"    ❌ {fmt}: Exception - {e}")
                results.append((fmt, False))
        
        return results
    
    async def test_error_handling(self):
        """Test error handling scenarios"""
        print("\n🔍 Testing error handling...")
        
        error_tests = [
            ("Invalid file", b"not an image", "text/plain"),
            ("Empty file", b"", "image/png"),
            ("Corrupted image", b"corrupted data", "image/png"),
        ]
        
        results = []
        
        for test_name, file_data, content_type in error_tests:
            print(f"\n  Testing {test_name}...")
            
            try:
                form_data = aiohttp.FormData()
                form_data.add_field('file', io.BytesIO(file_data), filename='test', content_type=content_type)
                
                async with aiohttp.ClientSession() as session:
                    async with session.post(f"{BACKEND_URL}/qr-scan-goqr", data=form_data) as response:
                        if response.status == 400:
                            print(f"    ✅ {test_name}: Correctly rejected (400)")
                            results.append((test_name, True))
                        else:
                            print(f"    ❌ {test_name}: Unexpected status {response.status}")
                            results.append((test_name, False))
                            
            except Exception as e:
                print(f"    ❌ {test_name}: Exception - {e}")
                results.append((test_name, False))
        
        return results
    
    def print_summary(self, all_results):
        """Print test summary"""
        print("\n" + "="*60)
        print("📊 TEST SUMMARY")
        print("="*60)
        
        total_tests = 0
        passed_tests = 0
        
        for test_name, results in all_results.items():
            if isinstance(results, list):
                passed = sum(1 for _, success in results if success)
                total = len(results)
                print(f"{test_name}: {passed}/{total} passed")
                total_tests += total
                passed_tests += passed
            else:
                status = "✅ PASSED" if results else "❌ FAILED"
                print(f"{test_name}: {status}")
                total_tests += 1
                if results:
                    passed_tests += 1
        
        print(f"\nOverall: {passed_tests}/{total_tests} tests passed")
        print("="*60)
    
    async def run_all_tests(self):
        """Run all test cases"""
        print("🚀 Starting goQR.me API Test Suite")
        print("="*60)
        
        all_results = {}
        
        # Test 1: Direct API
        direct_api_success = await self.test_goqr_direct_api()
        all_results["Direct goQR.me API"] = direct_api_success
        
        # Test 2: Backend Proxy
        backend_proxy_success = await self.test_backend_proxy()
        all_results["Backend Proxy"] = backend_proxy_success
        
        # Test 3: Different QR Types
        qr_types_results = await self.test_different_qr_types()
        all_results["QR Code Types"] = qr_types_results
        
        # Test 4: Image Formats
        image_formats_results = await self.test_image_formats()
        all_results["Image Formats"] = image_formats_results
        
        # Test 5: Error Handling
        error_handling_results = await self.test_error_handling()
        all_results["Error Handling"] = error_handling_results
        
        # Print summary
        self.print_summary(all_results)
        
        return all_results

async def main():
    """Main test runner"""
    tester = GoQRAPITester()
    await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())
