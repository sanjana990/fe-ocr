import { useState } from 'react';
import { Database, Search, Filter, Calendar, User } from 'lucide-react';

interface DataEntry {
  id: string;
  type: string;
  content: string;
  timestamp: Date;
  status: 'active' | 'archived';
}

function DatabaseView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'chat' | 'file' | 'scan'>('all');

  const mockData: DataEntry[] = [
    {
      id: '1',
      type: 'chat',
      content: 'What are the services offered?',
      timestamp: new Date('2025-10-09T14:30:00'),
      status: 'active',
    },
    {
      id: '2',
      type: 'file',
      content: 'document.json',
      timestamp: new Date('2025-10-09T15:45:00'),
      status: 'active',
    },
    {
      id: '3',
      type: 'scan',
      content: 'QR Code: https://example.com',
      timestamp: new Date('2025-10-10T10:15:00'),
      status: 'active',
    },
  ];

  const filteredData = mockData.filter((entry) => {
    const matchesSearch = entry.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || entry.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'chat':
        return 'bg-blue-100 text-blue-700';
      case 'file':
        return 'bg-green-100 text-green-700';
      case 'scan':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'chat':
        return '💬';
      case 'file':
        return '📄';
      case 'scan':
        return '📷';
      default:
        return '📦';
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
                  onClick={() => setFilterType('chat')}
                  className={`px-4 py-3 rounded-xl font-medium transition-all ${
                    filterType === 'chat'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Chats
                </button>
                <button
                  onClick={() => setFilterType('file')}
                  className={`px-4 py-3 rounded-xl font-medium transition-all ${
                    filterType === 'file'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Files
                </button>
                <button
                  onClick={() => setFilterType('scan')}
                  className={`px-4 py-3 rounded-xl font-medium transition-all ${
                    filterType === 'scan'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Scans
                </button>
              </div>
            </div>
          </div>

          {/* Data Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredData.length > 0 ? (
              filteredData.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-white rounded-xl shadow-md hover:shadow-xl border border-gray-100 p-6 transition-all hover:-translate-y-1"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getTypeIcon(entry.type)}</span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${getTypeColor(
                          entry.type
                        )}`}
                      >
                        {entry.type}
                      </span>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      {entry.status}
                    </span>
                  </div>

                  <p className="text-gray-800 font-medium mb-3 line-clamp-2">
                    {entry.content}
                  </p>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{entry.timestamp.toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>{entry.timestamp.toLocaleTimeString()}</span>
                    </div>
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
                      : 'Start chatting, uploading files, or scanning to see data here'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DatabaseView;
