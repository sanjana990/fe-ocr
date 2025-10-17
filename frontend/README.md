# Visitor Intelligence Platform - Frontend

Modern React TypeScript frontend for the AI-driven Visitor Intelligence Platform.

## Features

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Tesseract.js** for OCR functionality
- **Responsive Design** with mobile support

## Project Structure

```
frontend/
├── src/
│   ├── components/          # React components
│   │   ├── ChatView.tsx     # Chat interface
│   │   ├── UploadView.tsx   # File upload
│   │   ├── ScanView.tsx     # QR/OCR scanning
│   │   └── DatabaseView.tsx # Data visualization
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # App entry point
│   └── index.css            # Global styles
├── package.json             # Dependencies
├── vite.config.ts           # Vite configuration
├── tailwind.config.js       # Tailwind configuration
└── tsconfig.json            # TypeScript configuration
```

## Quick Start

### 1. Install Dependencies

```bash
# Install Node.js dependencies
npm install
```

### 2. Start Development Server

```bash
# Start Vite development server
npm run dev
```

### 3. Access Application

- **Frontend**: http://localhost:5173
- **API Documentation**: http://localhost:8000/api/v1/docs (when backend is running)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

## Features

### 1. Chat Interface
- Real-time messaging
- Voice input support
- Message history

### 2. File Upload
- Drag-and-drop interface
- Multiple file support
- File type validation

### 3. QR/OCR Scanning
- Camera integration
- Real-time OCR processing
- Business card extraction

### 4. Database View
- Data visualization
- Search and filtering
- Analytics dashboard

## Development

### Code Quality

```bash
# Lint code
npm run lint

# Type check
npm run typecheck

# Format code (if using Prettier)
npx prettier --write src/
```

### Building for Production

```bash
# Build production bundle
npm run build

# Preview production build
npm run preview
```

## Integration with Backend

The frontend is designed to work with the FastAPI backend:

- **API Base URL**: `http://localhost:8000/api/v1`
- **CORS**: Configured for local development
- **Authentication**: JWT tokens (when implemented)
- **Real-time**: WebSocket connections (when implemented)

## Next Steps

1. **Step 6**: Enhance frontend with state management
2. **Step 7**: Connect to backend APIs
3. **Step 8**: Add advanced features
4. **Step 9**: Implement real-time updates
5. **Step 10**: Add authentication and user management
