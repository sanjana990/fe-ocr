import { useState, useEffect } from 'react';
import { Database, Search, Calendar, User, Trash2, Eye, X } from 'lucide-react';
import { DatabaseService, StructuredData } from '../lib/supabase';

function DatabaseView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'text_scan' | 'file_upload'>('all');
  const [structuredData, setStructuredData] = useState<StructuredData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<StructuredData | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Load structured data from database
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await DatabaseService.getAllStructuredData();
        setStructuredData(data || []);
      } catch (error) {
        console.error('Failed to load structured data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredData = structuredData.filter((entry) => {
    const matchesSearch = 
      entry.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.phone?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || entry.source === filterType;
    return matchesSearch && matchesFilter;
  });

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'text_scan':
        return 'bg-purple-100 text-purple-700';
      case 'file_upload':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleViewDetails = (entry: StructuredData) => {
    setSelectedEntry(entry);
    setShowDetails(true);
  };

  const handleDeleteEntry = async (id: number) => {
    if (confirm('Are you sure you want to delete this entry?')) {
      try {
        await DatabaseService.deleteStructuredData(id);
        setStructuredData(prev => prev.filter(entry => entry.id !== id));
      } catch (error) {
        console.error('Failed to delete entry:', error);
      }
    }
  };


  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-800">Database</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Search and Filter Bar */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search database..."
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 outline-none transition-all"
                />
              </div>

              {/* Filter */}
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-4 py-3 rounded-xl font-medium transition-all ${
                    filterType === 'all'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterType('text_scan')}
                  className={`px-4 py-3 rounded-xl font-medium transition-all ${
                    filterType === 'text_scan'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Text Scans
                </button>
                <button
                  onClick={() => setFilterType('file_upload')}
                  className={`px-4 py-3 rounded-xl font-medium transition-all ${
                    filterType === 'file_upload'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  File Uploads
                </button>
              </div>
            </div>
          </div>

          {/* Data Grid */}
          {loading ? (
            <div className="col-span-2 bg-white rounded-2xl shadow-md border border-gray-100 p-12">
              <div className="text-center">
                <div className="inline-block p-6 bg-gray-100 rounded-full mb-4">
                  <Database className="w-12 h-12 text-gray-400 animate-pulse" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Loading data...
                </h3>
                <p className="text-gray-600">
                  Fetching structured data from database
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredData.length > 0 ? (
                filteredData.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-white rounded-xl shadow-md hover:shadow-xl border border-gray-100 p-6 transition-all hover:-translate-y-1"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {entry.source === 'text_scan' ? '📱' : '📄'}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${getSourceColor(
                            entry.source
                          )}`}
                        >
                          {entry.source === 'text_scan' ? 'Text Scan' : 'File Upload'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewDetails(entry)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEntry(entry.id!)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      {entry.name && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-800">{entry.name}</span>
                        </div>
                      )}
                      {entry.company && (
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{entry.company}</span>
                        </div>
                      )}
                      {entry.email && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">📧</span>
                          <span className="text-gray-600 text-sm">{entry.email}</span>
                        </div>
                      )}
                      {entry.phone && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">📞</span>
                          <span className="text-gray-600 text-sm">{entry.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(entry.created_at!).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400">🎯</span>
                        <span>{entry.processing_method}</span>
                      </div>
                      {entry.confidence_score && (
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400">📊</span>
                          <span>{Math.round(entry.confidence_score * 100)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 bg-white rounded-2xl shadow-md border border-gray-100 p-12">
                  <div className="text-center">
                    <div className="inline-block p-6 bg-gray-100 rounded-full mb-4">
                      <Database className="w-12 h-12 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">
                      No data found
                    </h3>
                    <p className="text-gray-600">
                      {searchQuery || filterType !== 'all'
                        ? 'Try adjusting your search or filters'
                        : 'Start text scanning or uploading files to see structured data here'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {showDetails && selectedEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-800">
                  Structured Data Details
                </h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedEntry.name && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-sm font-medium text-gray-600">Name</label>
                    <p className="text-gray-800 font-medium">{selectedEntry.name}</p>
                  </div>
                )}
                {selectedEntry.title && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-sm font-medium text-gray-600">Title</label>
                    <p className="text-gray-800 font-medium">{selectedEntry.title}</p>
                  </div>
                )}
                {selectedEntry.company && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-sm font-medium text-gray-600">Company</label>
                    <p className="text-gray-800 font-medium">{selectedEntry.company}</p>
                  </div>
                )}
                {selectedEntry.phone && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-sm font-medium text-gray-600">Phone</label>
                    <p className="text-gray-800 font-medium">{selectedEntry.phone}</p>
                  </div>
                )}
                {selectedEntry.email && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <p className="text-gray-800 font-medium">{selectedEntry.email}</p>
                  </div>
                )}
                {selectedEntry.website && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-sm font-medium text-gray-600">Website</label>
                    <p className="text-gray-800 font-medium">{selectedEntry.website}</p>
                  </div>
                )}
              </div>

              {/* Address */}
              {selectedEntry.address && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="text-sm font-medium text-gray-600">Address</label>
                  <p className="text-gray-800 font-medium">{selectedEntry.address}</p>
                </div>
              )}

              {/* Other Info */}
              {selectedEntry.other_info && selectedEntry.other_info.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="text-sm font-medium text-gray-600">Additional Information</label>
                  <div className="mt-2 space-y-1">
                    {selectedEntry.other_info.map((info, index) => (
                      <p key={index} className="text-gray-800 text-sm">{info}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Processing Info */}
              <div className="bg-blue-50 rounded-lg p-4">
                <label className="text-sm font-medium text-gray-600">Processing Information</label>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Source:</span>
                    <span className="font-medium">{selectedEntry.source === 'text_scan' ? 'Text Scan' : 'File Upload'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Method:</span>
                    <span className="font-medium">{selectedEntry.processing_method}</span>
                  </div>
                  {selectedEntry.confidence_score && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Confidence:</span>
                      <span className="font-medium">{Math.round(selectedEntry.confidence_score * 100)}%</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created:</span>
                    <span className="font-medium">{new Date(selectedEntry.created_at!).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Raw Text */}
              {selectedEntry.raw_text && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="text-sm font-medium text-gray-600">Raw Extracted Text</label>
                  <div className="mt-2 bg-white rounded border p-3 max-h-32 overflow-y-auto">
                    <p className="text-gray-800 text-sm whitespace-pre-wrap">{selectedEntry.raw_text}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DatabaseView;
