-- Supabase Database Setup for Structured Data Storage
-- Run this SQL in your Supabase SQL editor

-- Create the structured_data table
CREATE TABLE IF NOT EXISTS structured_data (
    id BIGSERIAL PRIMARY KEY,
    name TEXT,
    title TEXT,
    company TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    address TEXT,
    other_info TEXT[],
    source TEXT NOT NULL CHECK (source IN ('text_scan', 'file_upload')),
    processing_method TEXT,
    confidence_score DECIMAL(3,2) DEFAULT 0.0,
    raw_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_structured_data_source ON structured_data(source);
CREATE INDEX IF NOT EXISTS idx_structured_data_created_at ON structured_data(created_at);
CREATE INDEX IF NOT EXISTS idx_structured_data_name ON structured_data(name);
CREATE INDEX IF NOT EXISTS idx_structured_data_company ON structured_data(company);
CREATE INDEX IF NOT EXISTS idx_structured_data_email ON structured_data(email);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_structured_data_updated_at 
    BEFORE UPDATE ON structured_data 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE structured_data ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust based on your security needs)
-- For development, you might want to allow all operations
CREATE POLICY "Allow all operations for authenticated users" ON structured_data
    FOR ALL USING (auth.role() = 'authenticated');

-- For public access (if needed for your use case)
CREATE POLICY "Allow all operations for anonymous users" ON structured_data
    FOR ALL USING (true);

-- Insert some sample data (optional)
INSERT INTO structured_data (name, title, company, phone, email, website, address, source, processing_method, confidence_score, raw_text) VALUES
('John Doe', 'Software Engineer', 'Tech Corp', '+1-555-0123', 'john@techcorp.com', 'https://techcorp.com', '123 Tech Street, San Francisco, CA', 'text_scan', 'Vision API (High Accuracy)', 0.95, 'John Doe Software Engineer Tech Corp +1-555-0123 john@techcorp.com https://techcorp.com 123 Tech Street, San Francisco, CA'),
('Jane Smith', 'Product Manager', 'Innovate Inc', '+1-555-0456', 'jane@innovate.com', 'https://innovate.com', '456 Innovation Ave, New York, NY', 'file_upload', 'Enhanced OCR (Fallback)', 0.87, 'Jane Smith Product Manager Innovate Inc +1-555-0456 jane@innovate.com https://innovate.com 456 Innovation Ave, New York, NY');

-- Create LinkedIn scraped data table
CREATE TABLE IF NOT EXISTS linkedin_companies (
    id BIGSERIAL PRIMARY KEY,
    company_name TEXT NOT NULL,
    website TEXT,
    industry TEXT,
    company_size TEXT,
    hq_location TEXT,
    company_type TEXT,
    linkedin_url TEXT,
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for LinkedIn companies table
CREATE INDEX IF NOT EXISTS idx_linkedin_companies_name ON linkedin_companies(company_name);
CREATE INDEX IF NOT EXISTS idx_linkedin_companies_industry ON linkedin_companies(industry);
CREATE INDEX IF NOT EXISTS idx_linkedin_companies_scraped_at ON linkedin_companies(scraped_at);
CREATE INDEX IF NOT EXISTS idx_linkedin_companies_created_at ON linkedin_companies(created_at);

-- Create trigger to update updated_at for LinkedIn companies
CREATE TRIGGER update_linkedin_companies_updated_at 
    BEFORE UPDATE ON linkedin_companies 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for LinkedIn companies table
ALTER TABLE linkedin_companies ENABLE ROW LEVEL SECURITY;

-- Create policies for LinkedIn companies table
CREATE POLICY "Allow all operations for authenticated users" ON linkedin_companies
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for anonymous users" ON linkedin_companies
    FOR ALL USING (true);

-- Grant necessary permissions
GRANT ALL ON structured_data TO authenticated;
GRANT ALL ON structured_data TO anon;
GRANT USAGE, SELECT ON SEQUENCE structured_data_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE structured_data_id_seq TO anon;

-- Grant permissions for LinkedIn companies table
GRANT ALL ON linkedin_companies TO authenticated;
GRANT ALL ON linkedin_companies TO anon;
GRANT USAGE, SELECT ON SEQUENCE linkedin_companies_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE linkedin_companies_id_seq TO anon;

