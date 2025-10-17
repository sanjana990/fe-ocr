import { useState, useEffect, useRef } from 'react';
import { QrCode, Nfc, Camera, X, FileImage } from 'lucide-react';
import { qrDetectionService } from '../services/qrDetection';
import { DatabaseService } from '../lib/supabase';

type ScanMode = 'qr' | 'nfc' | 'text' | null;

// DetectedCard interface is now imported from cardDetection service

function ScanView() {
  const [scanMode, setScanMode] = useState<ScanMode>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState<string>('Idle');
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  // Removed processingMode state - always use hybrid processing
  const [isProcessing, setIsProcessing] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);


  // Backend API endpoints
  const backendOCRUrl = 'http://localhost:8000/ocr';
  const backendBusinessCardUrl = 'http://localhost:8000/business-card';

  // Simple camera management
  useEffect(() => {
    if (isScanning && (scanMode === 'qr' || scanMode === 'text')) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isScanning, scanMode]);

  const startCamera = async () => {
    setStatus('Starting camera...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStatus('Camera ready. Position your business card and click "Capture Image".');
      }
    } catch (error) {
      console.error('Camera Error:', error);
      setStatus('Error accessing camera. Please allow camera permissions.');
    }
  };


  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  // Simple capture function
  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) {
      setStatus('Camera not ready');
      return;
    }

    setIsProcessing(true);
    setStatus('Capturing image...');

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      // Set canvas size to video size
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0);
      
      // Convert to blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setStatus('Failed to capture image');
          setIsProcessing(false);
          return;
        }

        // Show captured image
        const url = URL.createObjectURL(blob);
        setCapturedImageUrl(url);
        
        // Process the image
        await processImage(blob);
      }, 'image/jpeg', 0.9);
      
    } catch (error) {
      console.error('Capture error:', error);
      setStatus('Capture failed: ' + (error instanceof Error ? error.message : String(error)));
      setIsProcessing(false);
    }
  };

  // Simple image processing
  const processImage = async (blob: Blob) => {
    setStatus('Processing image...');
    
    try {
      let result;
      
      // Handle QR code scanning with frontend detection
      if (scanMode === 'qr') {
        result = await processQRCodeFrontend(blob);
        
        if (result.success) {
          let statusMessage = `✅ QR Code Scan Complete!\n\n📱 Found ${result.qrCount} QR codes\n\n`;
          
          result.qrCodes.forEach((qr: any, index: number) => {
            statusMessage += `📱 QR Code ${index + 1}:\n`;
            statusMessage += `   Data: ${qr.data}\n`;
            statusMessage += `   Type: ${qr.parsed?.type || 'Unknown'}\n`;
            if (qr.parsed && Object.keys(qr.parsed).length > 0) {
              statusMessage += `   Parsed Info:\n`;
              Object.entries(qr.parsed).forEach(([key, value]) => {
                statusMessage += `     ${key}: ${value}\n`;
              });
            }
            statusMessage += '\n';
          });
          
          // Add URL details if available
          if (result.urlDetails && Object.keys(result.urlDetails).length > 0) {
            statusMessage += '🌐 URL Details Fetched:\n';
            Object.entries(result.urlDetails).forEach(([url, details]: [string, any]) => {
              if (details.success) {
                statusMessage += `   ${url}:\n`;
                if (details.title) statusMessage += `     Title: ${details.title}\n`;
                if (details.description) statusMessage += `     Description: ${details.description}\n`;
                if (details.contact_info?.emails) {
                  statusMessage += `     Emails: ${details.contact_info.emails.join(', ')}\n`;
                }
                if (details.contact_info?.phones) {
                  statusMessage += `     Phones: ${details.contact_info.phones.join(', ')}\n`;
                }
                if (details.social_links && Object.keys(details.social_links).length > 0) {
                  statusMessage += `     Social Links: ${Object.keys(details.social_links).join(', ')}\n`;
                }
                statusMessage += '\n';
              }
            });
          }
          
          setStatus(statusMessage);
          setIsProcessing(false);
          return;
        } else {
          setStatus(`❌ QR Scan Failed: ${result.error}`);
          setIsProcessing(false);
          return;
        }
      }
      
      // Handle text scanning with hybrid approach (Vision API + Enhanced OCR)
      if (scanMode === 'text') {
        result = await processTextHybrid(blob);
        
        if (result.success) {
          let statusMessage = '✅ Text Extraction Complete!\n\n';
          
          // Display structured information if available
          if (result.structuredInfo && Object.keys(result.structuredInfo).length > 0) {
            const info = result.structuredInfo;
            statusMessage += '📋 EXTRACTED INFORMATION:\n';
            statusMessage += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
            
            if (info.name) statusMessage += `👤 Name: ${info.name}\n`;
            if (info.title) statusMessage += `💼 Title: ${info.title}\n`;
            if (info.company) statusMessage += `🏢 Company: ${info.company}\n`;
            if (info.phone) statusMessage += `📞 Phone: ${info.phone}\n`;
            if (info.email) statusMessage += `📧 Email: ${info.email}\n`;
            if (info.website) statusMessage += `🌐 Website: ${info.website}\n`;
            if (info.address) statusMessage += `📍 Address: ${info.address}\n`;
            
            // Display other information (like pincode)
            if (info.otherInfo && info.otherInfo.length > 0) {
              info.otherInfo.forEach((item: string) => {
                statusMessage += `ℹ️ ${item}\n`;
              });
            }
            
            statusMessage += '\n';
          }
          
          // Display raw text
          if (result.text && result.text.trim()) {
            statusMessage += '📝 EXTRACTED TEXT:\n';
            statusMessage += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
            statusMessage += result.text;
            statusMessage += '\n\n';
          }
          
          statusMessage += `🔧 Processing: ${result.engine} (${Math.round(result.confidence * 100)}% confidence)`;
          if (result.method) {
            statusMessage += `\n🎯 Method: ${result.method}`;
          }
          
          // Save to database
          try {
            await saveToDatabase(result, 'text_scan');
            statusMessage += `\n💾 Data saved to database successfully!`;
          } catch (error) {
            console.error('❌ Failed to save to database:', error);
            statusMessage += `\n⚠️ Data extraction successful but failed to save to database`;
          }
          
          setStatus(statusMessage);
          setIsProcessing(false);
          return;
        } else {
          setStatus(`❌ Text Extraction Failed: ${result.error}`);
          setIsProcessing(false);
          return;
        }
      }
      
      // Always use hybrid processing (Vision + OCR) for business cards
      result = await processBusinessCardVision(blob);
      
      if (result.success) {
        let statusMessage = '✅ Processing Complete!\n\n';
        
        // Display structured information if available
        if (result.structuredInfo && Object.keys(result.structuredInfo).length > 0) {
          const info = result.structuredInfo;
          statusMessage += '📋 STRUCTURED BUSINESS CARD DATA:\n';
          statusMessage += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
          
          if (info.name) statusMessage += `👤 Name: ${info.name}\n`;
          if (info.title) statusMessage += `💼 Title: ${info.title}\n`;
          if (info.company) statusMessage += `🏢 Company: ${info.company}\n`;
          if (info.phone) statusMessage += `📞 Phone: ${info.phone}\n`;
          if (info.email) statusMessage += `📧 Email: ${info.email}\n`;
          if (info.website) statusMessage += `🌐 Website: ${info.website}\n`;
          if (info.address) statusMessage += `📍 Address: ${info.address}\n`;
          
          statusMessage += '\n';
        }
        
        // Display vision analysis if available
        if (result.visionAnalysis && result.visionAvailable) {
          statusMessage += '🔍 VISION ANALYSIS:\n';
          statusMessage += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
          
          // Handle nested structure from backend
          const visionData = result.visionAnalysis.structured_info || result.visionAnalysis;
          
          if (visionData.analysis_notes) {
            statusMessage += `📝 Analysis: ${visionData.analysis_notes}\n`;
          }
          
          if (visionData.quality_assessment) {
            const quality = visionData.quality_assessment;
            statusMessage += `📊 Quality: Image=${quality.image_quality}, Text=${quality.text_clarity}, Layout=${quality.layout_complexity}\n`;
          }
          
          statusMessage += '\n';
        }
        
        // Display QR codes if found
        if (result.qrCodes && result.qrCodes.length > 0) {
          statusMessage += '📱 QR CODES FOUND:\n';
          statusMessage += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
          
          result.qrCodes.forEach((qr: any, index: number) => {
            statusMessage += `📱 QR Code ${index + 1}:\n`;
            statusMessage += `   Type: ${qr.type}\n`;
            statusMessage += `   Data: ${qr.data}\n`;
            
            if (qr.parsed && Object.keys(qr.parsed).length > 0) {
              statusMessage += `   Parsed Info:\n`;
              Object.entries(qr.parsed).forEach(([key, value]) => {
                if (value && key !== 'raw_data') {
                  statusMessage += `     ${key}: ${value}\n`;
                }
              });
            }
            statusMessage += '\n';
          });
        } else if (result.qrCount > 0) {
          statusMessage += `📱 QR Codes Found: ${result.qrCount}\n\n`;
        }
        
        // Display raw text as fallback
        if (result.text && result.text.trim()) {
          statusMessage += '📝 RAW OCR TEXT:\n';
          statusMessage += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
          statusMessage += result.text.substring(0, 200) + (result.text.length > 200 ? '...' : '');
          statusMessage += '\n\n';
        }
        
        statusMessage += `🔧 Processing: ${result.engine} (${Math.round(result.confidence * 100)}% confidence)`;
        if (result.visionAvailable) {
          statusMessage += ' + Vision Analysis';
        }
        
        setStatus(statusMessage);
      } else {
        setStatus(`❌ Processing failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Processing error:', error);
      setStatus('❌ Processing failed: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsProcessing(false);
    }
  };


  // Frontend QR code detection with automatic URL fetching
  const processQRCodeFrontend = async (imageBlob: Blob) => {
    console.log('🔍 Processing QR codes with frontend detection...');
    
    try {
      // Convert blob to ImageData
      const imageData = await blobToImageData(imageBlob);
      
      // Detect QR codes using frontend libraries
      const qrResults = await qrDetectionService.detectQRCodes(imageData);
      
      console.log('📊 Frontend QR Detection Results:', qrResults);
      
      if (qrResults.length > 0) {
        // Parse QR codes
        const parsedResults = qrResults.map(qr => ({
          ...qr,
          parsed: qrDetectionService.parseQRContent(qr.data)
        }));
        
        // Fetch URL details for URLs
        const urlDetails: Record<string, any> = {};
        const urlsToFetch = qrResults
          .filter(qr => qr.data.startsWith('http://') || qr.data.startsWith('https://') || qr.data.startsWith('www.'))
          .map(qr => qr.data);
        
        for (const url of urlsToFetch) {
          try {
            const details = await qrDetectionService.fetchURLDetails(url);
            urlDetails[url] = details;
          } catch (error) {
            urlDetails[url] = { success: false, error: String(error) };
          }
        }
        
        return {
          success: true,
          qrCodes: parsedResults,
          qrCount: qrResults.length,
          parsedData: {},
          urlDetails: urlDetails,
          error: null
        };
      } else {
        // If frontend detection fails, try backend detection as fallback
        console.log('🔍 Frontend detection failed, trying backend QR detection...');
        return await processQRCodeBackend(imageBlob);
      }
    } catch (error) {
      console.error('❌ Frontend QR scan error:', error);
      // Try backend as fallback
      console.log('🔍 Frontend error, trying backend QR detection...');
      return await processQRCodeBackend(imageBlob);
    }
  };

  // Backend QR code detection as fallback
  const processQRCodeBackend = async (imageBlob: Blob) => {
    console.log('🔍 Processing QR codes with backend detection...');
    
    try {
      const formData = new FormData();
      formData.append('file', imageBlob, 'qr_scan.jpg');

      const response = await fetch(`${backendOCRUrl.replace('/ocr', '')}/qr-scan`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('📊 Backend QR Detection Results:', result);
      
      if (result.success && result.qr_codes && result.qr_codes.length > 0) {
        // Parse QR codes
        const parsedResults = result.qr_codes.map((qr: any) => ({
          data: qr.data,
          type: qr.type || 'QRCODE',
          method: 'backend',
          parsed: qrDetectionService.parseQRContent(qr.data)
        }));
        
        return {
          success: true,
          qrCodes: parsedResults,
          qrCount: result.qr_codes.length,
          parsedData: {},
          urlDetails: {},
          error: null
        };
      } else {
        return {
          success: true,
          qrCodes: [],
          qrCount: 0,
          parsedData: {},
          urlDetails: {},
          error: null
        };
      }
    } catch (error) {
      console.error('❌ Backend QR scan error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        qrCodes: [],
        qrCount: 0
      };
    }
  };

  // Helper function to convert blob to ImageData
  const blobToImageData = async (blob: Blob): Promise<ImageData> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        resolve(imageData);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(blob);
    });
  };



  // NEW: Vision-enhanced business card processing
  const processBusinessCardVision = async (imageBlob: Blob) => {
    console.log('🔍 Processing business card with Vision + OCR analysis...');
    
    try {
      const formData = new FormData();
      formData.append('file', imageBlob, 'business_card.jpg');

      const response = await fetch(backendBusinessCardUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('📊 Vision + OCR Result:', result);
      console.log('📊 Structured data:', result.structured_data);
      console.log('📊 Vision available:', result.vision_available);
      console.log('📊 Vision analysis:', result.vision_analysis);
      
      if (result.success) {
        return {
          success: true,
          text: result.raw_text || '',
          confidence: result.confidence,
          engine: result.engine_used,
          qrCodes: result.qr_codes || [],
          structuredInfo: result.structured_data || {},
          visionAnalysis: result.vision_analysis,
          visionAvailable: result.vision_available,
          qrCount: result.qr_count || 0
        };
      } else {
        return {
          success: false,
          error: result.error,
          text: "",
          confidence: 0.0
        };
      }
    } catch (error) {
      console.error('❌ Vision processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };







  // Hybrid text processing: Vision API first, then enhanced OCR fallback
  const processTextHybrid = async (imageBlob: Blob) => {
    console.log('🔍 Processing text with hybrid approach (Vision API + Enhanced OCR)...');
    
    try {
      // Step 1: Try Vision API first (highest accuracy)
      console.log('🎯 Attempting Vision API processing...');
      const visionResult = await processBusinessCardVision(imageBlob);
      
      if (visionResult.success && visionResult.structuredInfo && Object.keys(visionResult.structuredInfo).length > 0) {
        console.log('✅ Vision API successful, using structured data');
        return {
          success: true,
          text: visionResult.text,
          confidence: visionResult.confidence,
          engine: visionResult.engine,
          structuredInfo: visionResult.structuredInfo,
          method: 'Vision API (High Accuracy)'
        };
      }
      
      // Step 2: Fallback to enhanced OCR with improved parsing
      console.log('🔄 Vision API insufficient, trying enhanced OCR...');
      const ocrResult = await processTextOCR(imageBlob);
      
      if (ocrResult.success) {
        console.log('✅ Enhanced OCR successful');
        return {
          success: true,
          text: ocrResult.text,
          confidence: ocrResult.confidence,
          engine: ocrResult.engine,
          structuredInfo: ocrResult.structuredInfo,
          method: 'Enhanced OCR (Fallback)'
        };
      }
      
      // Step 3: If both fail, return error
      return {
        success: false,
        error: 'Both Vision API and OCR processing failed',
        text: "",
        confidence: 0.0
      };
      
    } catch (error) {
      console.error('❌ Hybrid processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  // Enhanced OCR processing for text scanning mode
  const processTextOCR = async (imageBlob: Blob) => {
    console.log('🔍 Processing text with enhanced OCR...');
    
    try {
      const formData = new FormData();
      formData.append('file', imageBlob, 'text_document.jpg');

      const response = await fetch(backendOCRUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('📊 OCR Result:', result);
      
      if (result.success) {
        // Extract structured information from the text with enhanced parsing
        const extractedInfo = extractTextInfoEnhanced(result.text);
        
        return {
          success: true,
          text: result.text,
          confidence: result.confidence,
          engine: result.engine,
          structuredInfo: extractedInfo
        };
      } else {
        return {
          success: false,
          error: result.error,
          text: "",
          confidence: 0.0
        };
      }
    } catch (error) {
      console.error('❌ OCR error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  // Enhanced text extraction with better parsing for business cards
  const extractTextInfoEnhanced = (text: string) => {
    const info = {
      name: '',
      title: '',
      company: '',
      phone: '',
      email: '',
      website: '',
      address: '',
      otherInfo: [] as string[]
    };

    if (!text) return info;

    // Clean the text first
    const cleanedText = text.replace(/\s+/g, ' ').trim();
    
    console.log('🔍 Enhanced parsing for text:', cleanedText);
    
    // 1. EMAIL DETECTION (highest priority - most reliable)
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const emailMatch = cleanedText.match(emailPattern);
    if (emailMatch) {
      info.email = emailMatch[0];
      console.log('✅ Email found:', info.email);
    }

    // 2. PHONE DETECTION (improved for Indian numbers)
    const phonePatterns = [
      /(\+?91[\s\-]?[6-9]\d{9})/g,  // +91 9848806006
      /(M\s*\+?91[\s\-]?[6-9]\d{9})/g,  // M +91 9848806006
      /(Tel[:\s]*\+?91[\s\-]?\d{2,3}[\s\-]?\d{7,8})/gi,  // Tel: 91-40-55316666
      /(\+?91[\s\-]?\d{2,3}[\s\-]?\d{7,8})/g  // 91-40-55316666
    ];
    
    for (const pattern of phonePatterns) {
      const matches = cleanedText.match(pattern);
      if (matches && matches.length > 0) {
        // Take the first valid phone number
        let phone = matches[0].trim();
        // Clean up the phone number
        phone = phone.replace(/^(Tel[:\s]*|M\s*)/i, '');
        phone = phone.replace(/\s+/g, '');
        if (phone.length >= 10) {
          info.phone = phone;
          console.log('✅ Phone found:', info.phone);
          break;
        }
      }
    }

    // 3. WEBSITE DETECTION
    const websitePattern = /(https?:\/\/[^\s]+|www\.[^\s]+)/i;
    const websiteMatch = cleanedText.match(websitePattern);
    if (websiteMatch) {
      info.website = websiteMatch[0];
      console.log('✅ Website found:', info.website);
    }

    // 4. NAME DETECTION (improved logic)
    // Look for patterns like "FirstName LastName" at the beginning
    const namePatterns = [
      /^([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,  // First Last or First Middle Last
      /^([A-Z][a-z]+\s+[A-Z])/  // First LastInitial
    ];
    
    for (const pattern of namePatterns) {
      const nameMatch = cleanedText.match(pattern);
      if (nameMatch) {
        const potentialName = nameMatch[1].trim();
        // Validate it's not a company name or title
        if (!potentialName.toLowerCase().includes('ltd') && 
            !potentialName.toLowerCase().includes('inc') &&
            !potentialName.toLowerCase().includes('corp') &&
            !potentialName.toLowerCase().includes('analyst') &&
            !potentialName.toLowerCase().includes('manager') &&
            potentialName.length < 50) {
          info.name = potentialName;
          console.log('✅ Name found:', info.name);
          break;
        }
      }
    }

    // 5. TITLE DETECTION (look for job titles)
    const titlePatterns = [
      /(Systems\s+Analyst|Project\s+Manager|Software\s+Engineer|Senior\s+Developer|Team\s+Lead|Director|Manager|Analyst|Engineer|Developer|Consultant|Specialist|Executive|President|CEO|CTO|VP|Designer|Coordinator|Assistant)/gi
    ];
    
    for (const pattern of titlePatterns) {
      const titleMatch = cleanedText.match(pattern);
      if (titleMatch) {
        info.title = titleMatch[0].trim();
        console.log('✅ Title found:', info.title);
        break;
      }
    }

    // 6. COMPANY DETECTION (look for company names with Ltd, Inc, Corp, etc.)
    const companyPatterns = [
      /([A-Z][a-zA-Z\s&]+(?:Ltd|Inc|Corp|Company|Services|Technologies|Solutions|Systems|Computer|Software|Tech|Group|Holdings|Enterprises|Private|Pvt))/gi,
      /(Satyam\s+Computer\s+Services\s+Ltd)/gi  // Specific pattern for Satyam
    ];
    
    for (const pattern of companyPatterns) {
      const companyMatch = cleanedText.match(pattern);
      if (companyMatch) {
        info.company = companyMatch[0].trim();
        console.log('✅ Company found:', info.company);
        break;
      }
    }

    // 7. ADDRESS DETECTION (improved to avoid phone numbers)
    const addressPatterns = [
      /([A-Za-z\s]+(?:Towers?|Building|Complex|Road|Street|Avenue|Lane|Colony|Nagar|Area|Village|Town|City|State|Country))/gi,
      /(Ohri\s+Towers?[^,]*)/gi,  // Specific pattern for Ohri Towers
      /(Sebastian\s+Road[^,]*)/gi  // Specific pattern for Sebastian Road
    ];
    
    for (const pattern of addressPatterns) {
      const addressMatch = cleanedText.match(pattern);
      if (addressMatch) {
        let address = addressMatch[0].trim();
        // Remove phone numbers from address
        address = address.replace(/\d{2,3}[\s\-]?\d{7,8}/g, '');
        address = address.replace(/\s+/g, ' ').trim();
        if (address.length > 10) {
          info.address = address;
          console.log('✅ Address found:', info.address);
          break;
        }
      }
    }

    // 8. PINCODE DETECTION (separate from address)
    const pincodePattern = /\b\d{6}\b/;
    const pincodeMatch = cleanedText.match(pincodePattern);
    if (pincodeMatch) {
      info.otherInfo.push(`Pincode: ${pincodeMatch[0]}`);
      console.log('✅ Pincode found:', pincodeMatch[0]);
    }

    console.log('📊 Final extracted info:', info);
    return info;
  };


  // Save structured data to database
  const saveToDatabase = async (result: any, source: 'text_scan' | 'file_upload') => {
    try {
      const structuredData = {
        name: result.structuredInfo?.name || '',
        title: result.structuredInfo?.title || '',
        company: result.structuredInfo?.company || '',
        phone: result.structuredInfo?.phone || '',
        email: result.structuredInfo?.email || '',
        website: result.structuredInfo?.website || '',
        address: result.structuredInfo?.address || '',
        other_info: result.structuredInfo?.otherInfo || [],
        source: source,
        processing_method: result.method || result.engine || 'unknown',
        confidence_score: result.confidence || 0,
        raw_text: result.text || ''
      };

      console.log('💾 Saving to database:', structuredData);
      
      if (source === 'text_scan') {
        await DatabaseService.saveTextScanData(structuredData);
      } else {
        await DatabaseService.saveFileUploadData(structuredData);
      }
      
      console.log('✅ Successfully saved to database');
    } catch (error) {
      console.error('❌ Database save error:', error);
      throw error;
    }
  };

  const startScan = (mode: ScanMode) => {
    setScanMode(mode);
    setIsScanning(true);
  };

  const stopScan = () => {
    stopCamera();
    setIsScanning(false);
    setScanMode(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-800">Scan Code</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {!isScanning ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* QR Code */}
              <button
                onClick={() => startScan('qr')}
                className="group bg-white rounded-2xl shadow-md hover:shadow-xl border border-gray-100 p-8 transition-all hover:-translate-y-1"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="p-6 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl group-hover:scale-110 transition-transform">
                    <QrCode className="w-12 h-12 text-green-600" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">
                      QR Code
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Scan QR codes and auto-fetch URL details
                    </p>
                  </div>
                </div>
              </button>



              {/* NFC */}
              <button
                onClick={() => startScan('nfc')}
                className="group bg-white rounded-2xl shadow-md hover:shadow-xl border border-gray-100 p-8 transition-all hover:-translate-y-1"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="p-6 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl group-hover:scale-110 transition-transform">
                    <Nfc className="w-12 h-12 text-blue-600" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">
                      NFC Card
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Read NFC tags and cards
                    </p>
                  </div>
                </div>
              </button>

              {/* Text Scan */}
              <button
                onClick={() => startScan('text')}
                className="group bg-white rounded-2xl shadow-md hover:shadow-xl border border-gray-100 p-8 transition-all hover:-translate-y-1"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="p-6 bg-gradient-to-br from-purple-100 to-violet-100 rounded-2xl group-hover:scale-110 transition-transform">
                    <FileImage className="w-12 h-12 text-purple-600" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">
                      Text Scan
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Extract text from documents and cards
                    </p>
                  </div>
                </div>
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              {/* Scanner Header */}
              <div className="bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  {scanMode === 'qr' && 'QR Code Scanner'}
                  {scanMode === 'nfc' && 'NFC Reader'}
                  {scanMode === 'text' && 'Text Scanner'}
                </h3>
                <button
                  onClick={stopScan}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Scanner Area */}
              <div className="p-8 flex flex-col items-center gap-4">
                {scanMode === 'qr' && (
                  <>
                    {/* Camera View */}
                    <div className="relative w-full aspect-video rounded-xl bg-black flex items-center justify-center overflow-hidden">
                      {capturedImageUrl ? (
                        <img
                          src={capturedImageUrl}
                          alt="Captured business card"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <video
                          ref={videoRef}
                          className="w-full h-full object-contain"
                          autoPlay
                          muted
                          playsInline
                        />
                      )}
                    </div>
                    
                    {/* Hidden canvas for capture */}
                    <canvas ref={canvasRef} className="hidden" />
                    
                    {/* Process Button */}
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-2">
                          Advanced processing with OCR + Vision analysis
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 mt-4">
                      <button
                        onClick={captureImage}
                        disabled={isProcessing}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                      >
                        <Camera className="w-4 h-4" />
                        {isProcessing ? 'Processing...' : 'Capture Image'}
                      </button>
                      
                      <button
                        onClick={() => {
                          setCapturedImageUrl(null);
                          setStatus('Restarting camera...');
                          // Restart the camera
                          stopCamera();
                          setTimeout(() => {
                            startCamera();
                          }, 100);
                        }}
                        className="px-6 py-3 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700"
                      >
                        Reset
                      </button>
                      
                      <button
                        onClick={stopScan}
                        className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700"
                      >
                        Stop Camera
                      </button>
                    </div>
                    
                    {/* Status Display */}
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <p className="text-gray-700 whitespace-pre-line">{status}</p>
                    </div>
                  </>
                )}
                {scanMode === 'text' && (
                  <>
                    {/* Camera View */}
                    <div className="relative w-full aspect-video rounded-xl bg-black flex items-center justify-center overflow-hidden">
                      {capturedImageUrl ? (
                        <img
                          src={capturedImageUrl}
                          alt="Captured document"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <video
                          ref={videoRef}
                          className="w-full h-full object-contain"
                          autoPlay
                          muted
                          playsInline
                        />
                      )}
                    </div>
                    
                    {/* Hidden canvas for capture */}
                    <canvas ref={canvasRef} className="hidden" />
                    
                    {/* Process Button */}
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-2">
                          OCR text extraction with structured output
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 mt-4">
                      <button
                        onClick={captureImage}
                        disabled={isProcessing}
                        className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50"
                      >
                        <Camera className="w-4 h-4" />
                        {isProcessing ? 'Processing...' : 'Capture Text'}
                      </button>
                      
                      <button
                        onClick={() => {
                          setCapturedImageUrl(null);
                          setStatus('Restarting camera...');
                          // Restart the camera
                          stopCamera();
                          setTimeout(() => {
                            startCamera();
                          }, 100);
                        }}
                        className="px-6 py-3 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700"
                      >
                        Reset
                      </button>
                      
                      <button
                        onClick={stopScan}
                        className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700"
                      >
                        Stop Camera
                      </button>
                    </div>
                    
                    {/* Status Display */}
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <p className="text-gray-700 whitespace-pre-line">{status}</p>
                    </div>
                  </>
                )}
                {scanMode !== 'qr' && scanMode !== 'text' && (
                  <p className="text-gray-600 text-center">Feature coming soon...</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ScanView;
