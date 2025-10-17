/**
 * Frontend QR Code Detection Service
 * Uses multiple client-side libraries for reliable QR code detection
 */

// Type declarations for the global libraries
declare global {
  interface Window {
    jsQR: any;
    ZXing: any;
    Tesseract: any;
  }
}

export interface QRCodeResult {
  data: string;
  type: string;
  location?: {
    topLeftCorner: { x: number; y: number };
    topRightCorner: { x: number; y: number };
    bottomLeftCorner: { x: number; y: number };
    bottomRightCorner: { x: number; y: number };
  };
  method: string;
}

export interface ParsedQRData {
  content_type: string;
  title: string;
  details: Record<string, any>;
  raw_data: string;
}

class QRDetectionService {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Wait for libraries to load
    await this.waitForLibraries();
    this.isInitialized = true;
  }

  private async waitForLibraries(): Promise<void> {
    const maxWaitTime = 10000; // 10 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      if (window.jsQR && window.ZXing) {
        console.log('✅ QR detection libraries loaded');
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error('QR detection libraries failed to load');
  }

  async detectQRCodes(imageData: ImageData): Promise<QRCodeResult[]> {
    await this.initialize();
    
    const results: QRCodeResult[] = [];
    
    try {
      // Try original image first
      console.log('🔍 Trying original image...');
      const jsQRResult = this.detectWithJSQR(imageData);
      if (jsQRResult) {
        results.push(jsQRResult);
        console.log('✅ jsQR detected QR code:', jsQRResult.data);
      }

      // If no QR codes found, try with image preprocessing
      if (results.length === 0) {
        console.log('🔍 No QR codes found, trying with image preprocessing...');
        
        // Try different preprocessing approaches
        const preprocessedImages = this.preprocessImage(imageData);
        
        for (let i = 0; i < preprocessedImages.length; i++) {
          const processedImage = preprocessedImages[i];
          console.log(`🔍 Trying preprocessing method ${i + 1}...`);
          
          const processedResult = this.detectWithJSQR(processedImage);
          if (processedResult) {
            results.push(processedResult);
            console.log(`✅ jsQR detected QR code with preprocessing method ${i + 1}:`, processedResult.data);
            break; // Stop after first successful detection
          }

          // Try goQR.me API with preprocessed image
          try {
            const goQRResults = await this.detectWithGoQRAPI(processedImage);
            if (goQRResults.length > 0) {
              results.push(...goQRResults);
              console.log(`✅ goQR.me API detected QR code with preprocessing method ${i + 1}:`, goQRResults[0].data);
              break; // Stop after first successful detection
            }
          } catch (error) {
            console.warn(`goQR.me API preprocessing method ${i + 1} failed:`, error);
          }
        }
      }

      // Method 2: goQR.me API (external service) - only if no QR codes found yet
      if (results.length === 0) {
        try {
          const goQRResults = await this.detectWithGoQRAPI(imageData);
          if (goQRResults.length > 0) {
            results.push(...goQRResults);
            console.log('✅ goQR.me API detected QR code:', goQRResults[0].data);
            return results; // Return early if API succeeds
          }
        } catch (error) {
          console.warn('goQR.me API detection failed:', error);
        }
      }

      // Method 3: ZXing (fallback - currently disabled due to API issues)
      const zxingResults = await this.detectWithZXing(imageData);
      results.push(...zxingResults);

      // Remove duplicates
      const uniqueResults = this.removeDuplicates(results);
      console.log(`📊 QR detection complete: ${uniqueResults.length} unique codes found`);
      return uniqueResults;
    } catch (error) {
      console.error('QR detection failed:', error);
      return [];
    }
  }

  private detectWithJSQR(imageData: ImageData): QRCodeResult | null {
    try {
      if (!window.jsQR) {
        console.warn('jsQR not available');
        return null;
      }

      console.log('🔍 jsQR detection - ImageData:', {
        width: imageData.width,
        height: imageData.height,
        dataLength: imageData.data.length
      });

      const code = window.jsQR(imageData.data, imageData.width, imageData.height);
      
      if (code) {
        console.log('✅ jsQR found QR code:', code.data);
        return {
          data: code.data,
          type: 'QRCODE',
          location: code.location,
          method: 'jsQR'
        };
      } else {
        console.log('❌ jsQR found no QR codes');
      }
      
      return null;
    } catch (error) {
      console.warn('jsQR detection failed:', error);
      return null;
    }
  }

  private async detectWithZXing(_imageData: ImageData): Promise<QRCodeResult[]> {
    try {
      if (!window.ZXing) {
        console.warn('ZXing not available');
        return [];
      }

      // Skip ZXing for now due to API compatibility issues
      // Focus on jsQR which is more reliable
      console.log('ZXing detection skipped due to API compatibility');
      return [];
    } catch (error) {
      console.warn('ZXing detection failed:', error);
      return [];
    }
  }

  private async detectWithGoQRAPI(imageData: ImageData): Promise<QRCodeResult[]> {
    try {
      console.log('🔍 Trying goQR.me API detection via backend proxy...');
      
      // Convert ImageData to blob
      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return [];

      ctx.putImageData(imageData, 0, 0);
      
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, 'image/png');
      });

      // Create FormData for backend API
      const formData = new FormData();
      formData.append('file', blob, 'qrcode.png');

      // Call backend proxy endpoint
      const response = await fetch('http://localhost:8000/qr-scan-goqr', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Backend API request failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('📊 goQR.me API response via backend:', result);

      // Parse the response
      if (result.success && result.qr_codes && result.qr_codes.length > 0) {
        console.log('✅ goQR.me API found QR codes via backend:', result.qr_codes.length);
        return result.qr_codes.map((qr: any) => ({
          data: qr.data,
          type: qr.type,
          location: qr.rect,
          method: qr.method
        }));
      }

      console.log('❌ goQR.me API found no QR codes via backend');
      return [];
    } catch (error) {
      console.warn('goQR.me API detection via backend failed:', error);
      return [];
    }
  }

  private preprocessImage(imageData: ImageData): ImageData[] {
    const preprocessedImages: ImageData[] = [];
    
    try {
      // Method 1: Increase contrast
      const contrastImage = this.increaseContrast(imageData);
      preprocessedImages.push(contrastImage);
      
      // Method 2: Convert to grayscale and increase contrast
      const grayscaleImage = this.convertToGrayscale(imageData);
      const grayscaleContrast = this.increaseContrast(grayscaleImage);
      preprocessedImages.push(grayscaleContrast);
      
      // Method 3: Apply threshold
      const thresholdImage = this.applyThreshold(imageData);
      preprocessedImages.push(thresholdImage);
      
      // Method 4: Resize image (sometimes smaller images work better)
      const resizedImage = this.resizeImage(imageData, 0.5);
      preprocessedImages.push(resizedImage);
      
      console.log(`🔧 Generated ${preprocessedImages.length} preprocessed images`);
      return preprocessedImages;
    } catch (error) {
      console.warn('Image preprocessing failed:', error);
      return [];
    }
  }

  private increaseContrast(imageData: ImageData): ImageData {
    const newImageData = new ImageData(imageData.width, imageData.height);
    const data = newImageData.data;
    const originalData = imageData.data;
    
    for (let i = 0; i < originalData.length; i += 4) {
      // Apply contrast enhancement
      const factor = 1.5;
      data[i] = Math.min(255, Math.max(0, (originalData[i] - 128) * factor + 128));     // R
      data[i + 1] = Math.min(255, Math.max(0, (originalData[i + 1] - 128) * factor + 128)); // G
      data[i + 2] = Math.min(255, Math.max(0, (originalData[i + 2] - 128) * factor + 128)); // B
      data[i + 3] = originalData[i + 3]; // A
    }
    
    return newImageData;
  }

  private convertToGrayscale(imageData: ImageData): ImageData {
    const newImageData = new ImageData(imageData.width, imageData.height);
    const data = newImageData.data;
    const originalData = imageData.data;
    
    for (let i = 0; i < originalData.length; i += 4) {
      const gray = Math.round(0.299 * originalData[i] + 0.587 * originalData[i + 1] + 0.114 * originalData[i + 2]);
      data[i] = gray;     // R
      data[i + 1] = gray; // G
      data[i + 2] = gray; // B
      data[i + 3] = originalData[i + 3]; // A
    }
    
    return newImageData;
  }

  private applyThreshold(imageData: ImageData): ImageData {
    const newImageData = new ImageData(imageData.width, imageData.height);
    const data = newImageData.data;
    const originalData = imageData.data;
    
    // Calculate threshold (Otsu's method approximation)
    let threshold = 128;
    const histogram = new Array(256).fill(0);
    
    for (let i = 0; i < originalData.length; i += 4) {
      const gray = Math.round(0.299 * originalData[i] + 0.587 * originalData[i + 1] + 0.114 * originalData[i + 2]);
      histogram[gray]++;
    }
    
    // Simple threshold calculation
    let sum = 0;
    let total = 0;
    for (let i = 0; i < 256; i++) {
      sum += i * histogram[i];
      total += histogram[i];
    }
    threshold = Math.round(sum / total);
    
    for (let i = 0; i < originalData.length; i += 4) {
      const gray = Math.round(0.299 * originalData[i] + 0.587 * originalData[i + 1] + 0.114 * originalData[i + 2]);
      const value = gray > threshold ? 255 : 0;
      data[i] = value;     // R
      data[i + 1] = value; // G
      data[i + 2] = value; // B
      data[i + 3] = originalData[i + 3]; // A
    }
    
    return newImageData;
  }

  private resizeImage(imageData: ImageData, scale: number): ImageData {
    const newWidth = Math.round(imageData.width * scale);
    const newHeight = Math.round(imageData.height * scale);
    const newImageData = new ImageData(newWidth, newHeight);
    
    // Simple nearest neighbor resize
    for (let y = 0; y < newHeight; y++) {
      for (let x = 0; x < newWidth; x++) {
        const sourceX = Math.floor(x / scale);
        const sourceY = Math.floor(y / scale);
        const sourceIndex = (sourceY * imageData.width + sourceX) * 4;
        const targetIndex = (y * newWidth + x) * 4;
        
        newImageData.data[targetIndex] = imageData.data[sourceIndex];
        newImageData.data[targetIndex + 1] = imageData.data[sourceIndex + 1];
        newImageData.data[targetIndex + 2] = imageData.data[sourceIndex + 2];
        newImageData.data[targetIndex + 3] = imageData.data[sourceIndex + 3];
      }
    }
    
    return newImageData;
  }

  private removeDuplicates(results: QRCodeResult[]): QRCodeResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      if (seen.has(result.data)) {
        return false;
      }
      seen.add(result.data);
      return true;
    });
  }

  parseQRContent(qrData: string): ParsedQRData {
    const parsed: ParsedQRData = {
      content_type: 'unknown',
      title: '',
      details: {},
      raw_data: qrData
    };

    try {
      // URL detection
      if (qrData.startsWith('http://') || qrData.startsWith('https://') || qrData.startsWith('www.')) {
        parsed.content_type = 'url';
        parsed.title = 'Website Link';
        parsed.details = { url: qrData };
        return parsed;
      }

      // Email detection
      if (qrData.includes('@') && qrData.includes('.')) {
        parsed.content_type = 'email';
        parsed.title = 'Email Address';
        parsed.details = { email: qrData };
        return parsed;
      }

      // Phone number detection
      if (/^\+?[\d\s\-\(\)]{10,}$/.test(qrData)) {
        parsed.content_type = 'phone';
        parsed.title = 'Phone Number';
        parsed.details = { phone: qrData };
        return parsed;
      }

      // vCard detection
      if (qrData.startsWith('BEGIN:VCARD')) {
        parsed.content_type = 'vcard';
        parsed.title = 'Business Card';
        parsed.details = this.parseVCard(qrData);
        return parsed;
      }

      // WiFi detection
      if (qrData.startsWith('WIFI:')) {
        parsed.content_type = 'wifi';
        parsed.title = 'WiFi Network';
        parsed.details = this.parseWiFi(qrData);
        return parsed;
      }

      // SMS detection
      if (qrData.startsWith('sms:')) {
        parsed.content_type = 'sms';
        parsed.title = 'SMS Message';
        parsed.details = this.parseSMS(qrData);
        return parsed;
      }

      // LinkedIn detection
      if (qrData.includes('linkedin.com')) {
        parsed.content_type = 'linkedin';
        parsed.title = 'LinkedIn Profile';
        parsed.details = { url: qrData, platform: 'LinkedIn' };
        return parsed;
      }

      // Social media detection
      const socialPlatforms = ['twitter.com', 'facebook.com', 'instagram.com', 'youtube.com'];
      const platform = socialPlatforms.find(p => qrData.includes(p));
      if (platform) {
        parsed.content_type = 'social';
        parsed.title = `${platform.split('.')[0]} Profile`;
        parsed.details = { url: qrData, platform: platform.split('.')[0] };
        return parsed;
      }

      // Plain text
      parsed.content_type = 'text';
      parsed.title = 'Text Content';
      parsed.details = { text: qrData };
      return parsed;

    } catch (error) {
      console.warn('QR content parsing failed:', error);
      parsed.content_type = 'error';
      parsed.title = 'Unknown Content';
      parsed.details = { error: String(error) };
      return parsed;
    }
  }

  private parseVCard(vcardData: string): Record<string, any> {
    const details: Record<string, any> = {};
    const lines = vcardData.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.includes(':')) {
        const [key, value] = trimmedLine.split(':', 2);
        const upperKey = key.toUpperCase();
        
        if (upperKey === 'FN') details.name = value;
        else if (upperKey === 'ORG') details.company = value;
        else if (upperKey === 'TITLE') details.title = value;
        else if (upperKey === 'EMAIL') details.email = value;
        else if (upperKey === 'TEL') details.phone = value;
        else if (upperKey === 'URL') details.website = value;
        else if (upperKey === 'ADR') details.address = value;
      }
    }
    
    return details;
  }

  private parseWiFi(wifiData: string): Record<string, any> {
    const details: Record<string, any> = {};
    const parts = wifiData.substring(5).split(';');
    
    for (const part of parts) {
      if (part.includes(':')) {
        const [key, value] = part.split(':', 2);
        if (key === 'S') details.ssid = value;
        else if (key === 'P') details.password = value;
        else if (key === 'T') details.security = value;
      }
    }
    
    return details;
  }

  private parseSMS(smsData: string): Record<string, any> {
    if (smsData.includes(':')) {
      const parts = smsData.split(':');
      if (parts.length >= 3) {
        return {
          phone: parts[1],
          message: parts[2]
        };
      }
    }
    return { raw: smsData };
  }

  async fetchURLDetails(url: string): Promise<any> {
    try {
      // Try to fetch the full page content for analysis
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (compatible; BusinessCardScanner/1.0)'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      
      // Extract structured information from HTML
      const extractedInfo = this.extractInfoFromHTML(html, url);
      
      return {
        success: true,
        url: url,
        title: extractedInfo.title,
        description: extractedInfo.description,
        contact_info: extractedInfo.contact_info,
        social_links: extractedInfo.social_links,
        extracted_data: extractedInfo
      };
    } catch (error) {
      // Fallback to simple check if full fetch fails
      try {
        await fetch(url, {
          method: 'HEAD',
          mode: 'no-cors'
        });
        
        return {
          success: true,
          url: url,
          title: 'Website',
          description: 'URL accessible (limited info due to CORS)',
          contact_info: {},
          social_links: {}
        };
      } catch (fallbackError) {
        return {
          success: false,
          url: url,
          error: String(error)
        };
      }
    }
  }

  private extractInfoFromHTML(html: string, _url: string): any {
    // Create a temporary DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const extractedInfo = {
      title: '',
      description: '',
      contact_info: {
        emails: [] as string[],
        phones: [] as string[],
        names: [] as string[]
      },
      social_links: {} as Record<string, string>
    };
    
    // Extract title
    const titleElement = doc.querySelector('title');
    if (titleElement) {
      extractedInfo.title = titleElement.textContent?.trim() || '';
    }
    
    // Extract meta description
    const metaDesc = doc.querySelector('meta[name="description"]');
    if (metaDesc) {
      extractedInfo.description = metaDesc.getAttribute('content') || '';
    }
    
    // Extract all text content for analysis
    const textContent = doc.body?.textContent || '';
    
    // Extract emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = textContent.match(emailRegex) || [];
    extractedInfo.contact_info.emails = [...new Set(emails)];
    
    // Extract phone numbers
    const phoneRegex = /(\+?[\d\s\-\(\)]{10,})/g;
    const phones = textContent.match(phoneRegex) || [];
    extractedInfo.contact_info.phones = [...new Set(phones.map(p => p.trim()))];
    
    // Extract potential names (simple heuristic)
    const nameRegex = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g;
    const names = textContent.match(nameRegex) || [];
    extractedInfo.contact_info.names = [...new Set(names)];
    
    // Extract social media links
    const socialPatterns = {
      linkedin: /linkedin\.com\/in\/[a-zA-Z0-9-]+/g,
      twitter: /twitter\.com\/[a-zA-Z0-9_]+/g,
      facebook: /facebook\.com\/[a-zA-Z0-9.]+/g,
      instagram: /instagram\.com\/[a-zA-Z0-9_.]+/g
    };
    
    for (const [platform, pattern] of Object.entries(socialPatterns)) {
      const matches = textContent.match(pattern);
      if (matches) {
        extractedInfo.social_links[platform] = matches[0];
      }
    }
    
    return extractedInfo;
  }
}

// Export singleton instance
export const qrDetectionService = new QRDetectionService();
