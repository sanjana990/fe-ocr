# Supabase Database Integration

This document explains how to set up and use the Supabase database integration for storing structured data from text scanning and file uploads.

## 🚀 Quick Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note down your project URL and anon key

### 2. Environment Configuration

Create a `.env` file in the `frontend` directory:

```bash
# Copy the example file
cp env.example .env

# Edit with your Supabase credentials
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_BACKEND_URL=http://localhost:8000
```

### 3. Database Setup

Run the SQL script in your Supabase SQL editor:

```sql
-- Copy and paste the contents of supabase_setup.sql
-- This will create the structured_data table with proper indexes and policies
```

## 📊 Database Schema

### `structured_data` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `name` | TEXT | Extracted person name |
| `title` | TEXT | Job title |
| `company` | TEXT | Company name |
| `phone` | TEXT | Phone number |
| `email` | TEXT | Email address |
| `website` | TEXT | Website URL |
| `address` | TEXT | Physical address |
| `other_info` | TEXT[] | Additional information (like pincode) |
| `source` | TEXT | 'text_scan' or 'file_upload' |
| `processing_method` | TEXT | Method used for extraction |
| `confidence_score` | DECIMAL | Confidence score (0.0-1.0) |
| `raw_text` | TEXT | Original extracted text |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

## 🔧 Features

### ✅ Implemented Features

1. **Automatic Storage**: All text scans and file uploads are automatically saved to the database
2. **Structured Data**: Extracted information is properly categorized and stored
3. **Source Tracking**: Each entry is tagged with its source (text_scan or file_upload)
4. **Processing Metadata**: Stores processing method and confidence scores
5. **Database View**: Browse, search, and filter stored data
6. **Details Modal**: View complete structured data with raw text
7. **Delete Functionality**: Remove entries from the database

### 🎯 Data Flow

```
Text Scan/File Upload → Processing → Structured Data → Database Storage → Database View
```

## 📱 Usage

### Text Scanning
1. Go to "Scan Code" → "Text Scan"
2. Capture an image with text
3. Data is automatically extracted and saved to database
4. View results in "View Database"

### File Upload
1. Go to "Upload File"
2. Upload image files
3. Data is automatically extracted and saved to database
4. View results in "View Database"

### Database Management
1. Go to "View Database"
2. Browse all stored structured data
3. Filter by source (Text Scans, File Uploads)
4. Search by name, company, email, or phone
5. Click "View Details" to see complete information
6. Delete entries if needed

## 🔍 Database Service API

The `DatabaseService` class provides these methods:

```typescript
// Save text scan data
await DatabaseService.saveTextScanData(structuredData);

// Save file upload data
await DatabaseService.saveFileUploadData(structuredData);

// Get all data
const data = await DatabaseService.getAllStructuredData();

// Get data by source
const textScans = await DatabaseService.getStructuredDataBySource('text_scan');

// Delete data
await DatabaseService.deleteStructuredData(id);
```

## 🛡️ Security

- Row Level Security (RLS) is enabled
- Policies allow authenticated and anonymous access
- Adjust policies based on your security requirements

## 📈 Performance

- Indexes on frequently queried columns
- Efficient filtering and searching
- Automatic timestamp updates

## 🐛 Troubleshooting

### Common Issues

1. **Connection Error**: Check your Supabase URL and anon key
2. **Permission Denied**: Verify RLS policies are set correctly
3. **Data Not Saving**: Check browser console for errors
4. **Empty Database**: Ensure the SQL setup script was run

### Debug Steps

1. Check browser console for errors
2. Verify environment variables are loaded
3. Test Supabase connection in the browser console
4. Check Supabase logs for database errors

## 🔄 Future Enhancements

- [ ] Data export functionality
- [ ] Bulk operations
- [ ] Advanced filtering options
- [ ] Data analytics dashboard
- [ ] API rate limiting
- [ ] Data backup and restore

## 📝 Notes

- All data is stored in UTC timestamps
- Confidence scores are stored as decimals (0.0-1.0)
- Raw text is preserved for reference
- Processing metadata helps track extraction quality

