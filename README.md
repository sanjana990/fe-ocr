# Visitor Intelligence Platform

AI-driven Visitor Intelligence Platform - An ecosystem that automatically gathers, enriches, and interprets information about individuals and organizations through visual inputs and automated research.

## 🎯 Vision

Convert any form of business or visitor data into an instantly enriched, AI-interpreted profile with actionable insights.

## 🏗️ Architecture

```
projects-main/
├── frontend/          # React TypeScript frontend
├── backend/           # Python FastAPI backend
└── README.md          # This file
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (for frontend)
- **Python** 3.11+ (for backend)
- **PostgreSQL** (for database)
- **Redis** (for caching and queues)

### 1. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at: http://localhost:5173

### 2. Backend Setup

```bash
cd backend

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp env.example .env
# Edit .env with your configuration

# Start FastAPI server
python run.py
```

Backend will be available at: http://localhost:8000

### 3. Database Setup

```bash
# Create PostgreSQL database
createdb visitor_intelligence

# Run migrations (when implemented)
cd backend
alembic upgrade head
```

## 📋 Implementation Status

### ✅ Completed (Step 1)
- [x] Project structure reorganization
- [x] FastAPI backend setup
- [x] Database models design
- [x] API endpoints structure
- [x] Celery background tasks
- [x] OCR service foundation
- [x] AI service foundation
- [x] Research service foundation

### 🔄 In Progress
- [ ] Database implementation (Step 2)
- [ ] OCR service enhancement (Step 3)
- [ ] AI integration (Step 4)
- [ ] Research automation (Step 5)
- [ ] Frontend enhancement (Step 6)

### 📅 Planned
- [ ] API integration (Step 7)
- [ ] Advanced features (Step 8)
- [ ] Testing and deployment (Step 9)

## 🛠️ Tech Stack

### Frontend
- **React 18** + TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Tesseract.js** for OCR

### Backend
- **FastAPI** for web framework
- **PostgreSQL** for database
- **Redis** for caching and queues
- **Celery** for background tasks
- **SQLAlchemy** for ORM

### AI & ML
- **OpenAI GPT-4** for LLM
- **Tesseract** for OCR
- **OpenCV** for computer vision
- **BeautifulSoup** for web scraping

## 🔧 Development

### Code Quality

**Frontend:**
```bash
cd frontend
npm run lint
npm run typecheck
```

**Backend:**
```bash
cd backend
black app/
isort app/
flake8 app/
pytest
```

### Database Migrations

```bash
cd backend
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

## 📚 API Documentation

- **Swagger UI**: http://localhost:8000/api/v1/docs
- **ReDoc**: http://localhost:8000/api/v1/redoc
- **Health Check**: http://localhost:8000/health

## 🎯 Key Features

### 1. Intelligent Data Capture
- Business card OCR
- QR code scanning
- NFC reading
- Manual entry fallback

### 2. Automated Research
- Company data enrichment
- Social media discovery
- News and funding data
- Intent classification

### 3. AI-Powered Insights
- Profile summaries
- Engagement suggestions
- Visitor categorization
- Confidence scoring

### 4. Unified Profiles
- Combined data sources
- Real-time updates
- Historical tracking
- Analytics dashboard

## 🚀 Next Steps

1. **Step 2**: Implement database schema and migrations
2. **Step 3**: Enhance OCR with multiple engines
3. **Step 4**: Integrate AI services
4. **Step 5**: Build research automation
5. **Step 6**: Enhance frontend with state management
6. **Step 7**: Connect frontend to backend
7. **Step 8**: Add advanced features
8. **Step 9**: Testing and deployment

## 📞 Support

For questions or issues, please refer to the individual README files in the `frontend/` and `backend/` directories.

## 📄 License

This project is proprietary software for Tekisho Infotech.