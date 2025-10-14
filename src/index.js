const video = document.getElementById('webcam-stream');
const canvas = document.getElementById('qr-canvas'); // Renaming this to 'ocr-canvas' in HTML is recommended
const captureButton = document.getElementById('capture-button');
const statusMessage = document.getElementById('status-message');
const webhookUrl = "https://sanjana91.app.n8n.cloud/webhook-test/3f02f382-0683-4066-afca-16ca80c53cd5";

let stream; // To hold the camera stream
let ocrWorker; // To hold the Tesseract.js worker

/**
 * 1. Start the camera stream and initialize OCR Worker
 */
async function startCamera() {
    statusMessage.textContent = 'Initializing OCR engine and requesting camera...';
    
    // --- Initialize Tesseract Worker (New Step) ---
    try {
        ocrWorker = await Tesseract.createWorker('eng', 1, {
            // Optional: Log progress to the console
            logger: m => console.log('Tesseract Init:', m.status) 
        });
        await ocrWorker.loadLanguage('eng');
        await ocrWorker.initialize('eng');
        console.log('Tesseract.js Worker initialized.');
    } catch (e) {
        statusMessage.textContent = 'Error initializing OCR engine.';
        console.error('Tesseract Init Error:', e);
        captureButton.disabled = true;
        return;
    }
    
    // --- Start Camera (Original Step) ---
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } // Prefer the rear camera
        });
        
        video.srcObject = stream;
        await video.play();
        statusMessage.textContent = 'Camera active. Position text and click capture to OCR.';
        captureButton.disabled = false;

    } catch (err) {
        statusMessage.textContent = `Error accessing camera: ${err.name}. Make sure you are on HTTPS or localhost.`;
        console.error("Camera access error:", err);
        captureButton.disabled = true;
        // Terminate worker if camera fails
        if (ocrWorker) await ocrWorker.terminate(); 
    }
}

/**
 * 2. Capture Image and Perform OCR
 */
function captureAndProcessImage() {
    if (!stream || !ocrWorker) {
        statusMessage.textContent = 'System not active. Reload the page.';
        return;
    }

    statusMessage.textContent = 'Capturing frame and performing OCR...';
    captureButton.disabled = true; // Prevent multiple captures

    // --- Capture Frame ---
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    const context = canvas.getContext('2d');

    // Set canvas to a reasonable size (e.g., 800px wide) for both display and OCR input
    const captureWidth = 800;
    const captureHeight = (videoHeight / videoWidth) * captureWidth; 

    canvas.width = captureWidth;
    canvas.height = captureHeight;
    context.drawImage(video, 0, 0, captureWidth, captureHeight); 
    
    // Convert the canvas content directly to a Blob for Tesseract.js
    canvas.toBlob(async (blob) => {
        if (!blob) {
            statusMessage.textContent = 'Failed to create image blob.';
            captureButton.disabled = false;
            return;
        }

        try {
            statusMessage.textContent = 'OCR running. Please wait...';

            // --- Perform OCR using the Tesseract Worker ---
            const { data: { text } } = await ocrWorker.recognize(blob); 
            
            // --- Success ---
            if (text && text.trim().length > 0) {
                statusMessage.textContent = `OCR Complete. Extracted text: "${text.trim().substring(0, 50)}..."`;
                
                // Now, send the extracted text (and the image) to the webhook
                sendDataToWebhook(blob, text);
            } else {
                statusMessage.textContent = 'OCR failed to extract any meaningful text. Try again.';
            }

        } catch (error) {
            statusMessage.textContent = `OCR Error: ${error.message}`;
            console.error('OCR recognition error:', error);
        } finally {
            captureButton.disabled = false; // Re-enable for another try
        }
    }, 'image/jpeg', 0.8); 
}


/**
 * 3. Convert Image to File (Blob) and POST Data
 * @param {Blob} imageBlob The captured image data.
 * @param {string} ocrText The text extracted by Tesseract.
 */
function sendDataToWebhook(imageBlob, ocrText) {
    statusMessage.textContent = 'Image and text ready. Sending to webhook...';
    
    const formData = new FormData();
    // 1. Append the captured image
    formData.append('ocr_image', imageBlob, 'ocr_capture.jpeg'); 
    // 2. Append the extracted text (CRITICAL for OCR automation)
    formData.append('extracted_text', ocrText); 

    fetch(webhookUrl, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (response.ok) {
            statusMessage.textContent = `✅ Success! Image and data posted to webhook. Status: ${response.status}`;
            stopCamera();
        } else {
            statusMessage.textContent = `❌ Error posting data. Status: ${response.status} ${response.statusText}`;
        }
    })
    .catch(error => {
        statusMessage.textContent = `❌ Network Error: Could not reach webhook. Check your localhost setup.`;
        console.error('Fetch error:', error);
    });
}

/**
 * Stop the camera stream and terminate the worker
 */
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        stream = null;
    }
    if (ocrWorker) {
        ocrWorker.terminate();
        ocrWorker = null;
    }
    captureButton.disabled = true;
    statusMessage.textContent = 'Process complete. System stopped.';
}


// Initial setup
captureButton.addEventListener('click', captureAndProcessImage);
captureButton.disabled = true; // Disable until camera is ready

// Start the whole process when the page loads
document.addEventListener('DOMContentLoaded', startCamera);

// document.getElementById('file').addEventListener('change', async (e) => {
//   const file = e.target.files[0];
//   const form = new FormData();
//   form.append('file', file);
//   form.append('language', 'eng');
//   form.append('OCREngine', '2');

//   const resp = await fetch('https://api.ocr.space/parse/image', {
//     method: 'POST',
//     headers: {
//       apikey: 'api-key' // may be blocked by CORS on some origins
//     },
//     body: form
//   });
//   const data = await resp.json();
//   console.log(data);
// });

