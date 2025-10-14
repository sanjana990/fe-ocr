import { useState } from 'react';
import { MessageSquare, Upload, Scan, Database, Menu, X } from 'lucide-react';
import ChatView from './components/ChatView';
import UploadView from './components/UploadView';
import ScanView from './components/ScanView';
import DatabaseView from './components/DatabaseView';

function App() {
  const [activeView, setActiveView] = useState<'chat' | 'upload' | 'scan' | 'database'>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleNavClick = (view: 'chat' | 'upload' | 'scan' | 'database') => {
    setActiveView(view);
    setIsSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-purple-50">
      <div className="flex h-screen overflow-hidden">
        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="md:hidden fixed top-4 left-4 z-50 p-3 bg-slate-800 text-white rounded-xl shadow-lg hover:bg-slate-700 transition-colors"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-30"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`fixed md:relative z-40 w-72 bg-gradient-to-b from-slate-800 to-slate-900 text-white flex flex-col shadow-2xl h-full transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}>
          {/* Header */}
          <div className="p-6 border-b border-slate-700">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Chatterbox
            </h1>
            <p className="text-slate-400 text-sm mt-1">Tekisho Infotech</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <button
              onClick={() => handleNavClick('chat')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeView === 'chat'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="font-medium">Chat History</span>
            </button>

            <button
              onClick={() => handleNavClick('upload')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeView === 'upload'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Upload className="w-5 h-5" />
              <span className="font-medium">Upload File</span>
            </button>

            <button
              onClick={() => handleNavClick('scan')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeView === 'scan'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Scan className="w-5 h-5" />
              <span className="font-medium">Scan Code</span>
            </button>

            <button
              onClick={() => handleNavClick('database')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeView === 'database'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Database className="w-5 h-5" />
              <span className="font-medium">View Database</span>
            </button>
          </nav>

          {/* Footer Stats */}
          <div className="p-4 border-t border-slate-700 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Chats:</span>
              <span className="text-slate-200 font-semibold">0</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Files:</span>
              <span className="text-slate-200 font-semibold">0</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Scans:</span>
              <span className="text-slate-200 font-semibold">2</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col w-full md:w-auto overflow-hidden">
          {activeView === 'chat' && <ChatView />}
          {activeView === 'upload' && <UploadView />}
          {activeView === 'scan' && <ScanView />}
          {activeView === 'database' && <DatabaseView />}
        </div>
      </div>
    </div>
  );
}

export default App;
