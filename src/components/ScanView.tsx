import { useState, useEffect, useRef } from 'react';
import { QrCode, CreditCard, Nfc, Camera, X } from 'lucide-react';
import Tesseract from 'tesseract.js';

type ScanMode = 'qr' | 'barcode' | 'nfc' | null;

function ScanView() {
  const [scanMode, setScanMode] = useState<ScanMode>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState<string>('Idle');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<any>(null);



  const webhookUrl =
    'https://sanjana91.app.n8n.cloud/webhook-test/3f02f382-0683-4066-afca-16ca80c53cd5';

  // ---- QR Camera + OCR Start ----
  useEffect(() => {
    if (isScanning && scanMode === 'qr') {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isScanning, scanMode]);

  const startCamera = async () => {
    setStatus('Initializing OCR engine and requesting camera...');
    try {
      // ✅ Modern Tesseract.js (v5+) initialization
      workerRef.current = await Tesseract.createWorker('eng', 1, {
        logger: (m) => console.log('Tesseract:', m.status),
      });
      console.log('Tesseract.js Worker initialized.');

      // ✅ Start camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus('Camera active. Position QR code and click capture.');
    } catch (error) {
      console.error('Camera/OCR Init Error:', error);
      setStatus('Error initializing OCR or accessing camera.');
    }
  };


  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  };

  const captureAndProcess = async () => {
    if (!videoRef.current || !canvasRef.current || !workerRef.current) {
      setStatus('System not active.');
      return;
    }

    setStatus('Capturing frame...');
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const captureWidth = 800;
    const captureHeight = (video.videoHeight / video.videoWidth) * captureWidth;
    canvas.width = captureWidth;
    canvas.height = captureHeight;
    ctx.drawImage(video, 0, 0, captureWidth, captureHeight);

    canvas.toBlob(async (blob) => {
      if (!blob) return setStatus('Failed to capture image.');
      try {
        setStatus('Running OCR...');
        const { data: { text } } = await workerRef.current.recognize(blob);
        if (text && text.trim()) {
          setStatus(`OCR Complete. Sending data to webhook...`);
          await sendToWebhook(blob, text);
        } else {
          setStatus('No readable text found.');
        }
      } catch (err) {
        console.error(err);
        setStatus('OCR failed.');
      }
    }, 'image/jpeg', 0.8);
  };

  const sendToWebhook = async (imageBlob: Blob, text: string) => {
    const formData = new FormData();
    formData.append('ocr_image', imageBlob, 'ocr_capture.jpeg');
    formData.append('extracted_text', text);

    try {
      const res = await fetch(webhookUrl, { method: 'POST', body: formData });
      if (res.ok) {
        setStatus(`✅ Data sent successfully.`);
        stopCamera();
      } else {
        setStatus(`❌ Webhook error: ${res.status}`);
      }
    } catch (e) {
      setStatus('Network error while posting data.');
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                      Scan QR codes for quick access
                    </p>
                  </div>
                </div>
              </button>

              {/* Barcode */}
              <button
                onClick={() => startScan('barcode')}
                className="group bg-white rounded-2xl shadow-md hover:shadow-xl border border-gray-100 p-8 transition-all hover:-translate-y-1"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="p-6 bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl group-hover:scale-110 transition-transform">
                    <CreditCard className="w-12 h-12 text-orange-600" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">
                      Barcode
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Scan product barcodes
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
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              {/* Scanner Header */}
              <div className="bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  {scanMode === 'qr' && 'QR Code Scanner'}
                  {scanMode === 'barcode' && 'Barcode Scanner'}
                  {scanMode === 'nfc' && 'NFC Reader'}
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
                    <video
                      ref={videoRef}
                      id="webcam-stream"
                      className="w-full aspect-video rounded-xl bg-black"
                      autoPlay
                      muted
                    />
                    <canvas
                      ref={canvasRef}
                      id="qr-canvas"
                      className="hidden"
                    />
                    <button
                      onClick={captureAndProcess}
                      className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
                    >
                      Capture & OCR
                    </button>
                    <p className="text-gray-700 mt-2">{status}</p>
                  </>
                )}
                {scanMode !== 'qr' && (
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
