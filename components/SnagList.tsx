import { useState, useEffect, useCallback } from 'react';
import { getSnagsByProject, deleteSnag, updateSnag } from '@/lib/db';
import { Trash2, Save, X, Search, SortDesc, Maximize2 } from 'lucide-react';
import { format } from 'date-fns';

interface Snag {
  id: string;
  projectName: string;
  snagNumber: number;
  description: string;
  photoPath: string;
  priority: 'Low' | 'Medium' | 'High';
  assignedTo: string;
  status: 'Open' | 'Closed';
  createdAt: Date;
  updatedAt: Date;
}

interface EditState {
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  assignedTo: string;
  status: 'Open' | 'Closed';
}

interface SnagListProps {
  projectName: string;
  refreshTrigger?: number;
  isDarkMode?: boolean;
}

type SortOption = 'newest' | 'oldest' | 'updated';

export function SnagList({ projectName, refreshTrigger = 0, isDarkMode = false }: SnagListProps) {
  const [snags, setSnags] = useState<Snag[]>([]);
  const [filteredSnags, setFilteredSnags] = useState<Snag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({
    description: '',
    priority: 'Medium',
    assignedTo: '',
    status: 'Open'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Load snags
  useEffect(() => {
    const loadSnags = async () => {
      if (!projectName) {
        setSnags([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const loadedSnags = await getSnagsByProject(projectName);
        setSnags(loadedSnags);
      } catch (error) {
        console.error('Failed to load snags:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSnags();
  }, [projectName, refreshTrigger]);

  // Filter and sort snags
  useEffect(() => {
    let filtered = [...snags];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(snag => 
        snag.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        default:
          return 0;
      }
    });

    setFilteredSnags(filtered);
  }, [snags, searchTerm, sortBy]);

  const handleDelete = async (id: string) => {
    try {
      await deleteSnag(id);
      setSnags(snags.filter(snag => snag.id !== id));
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Failed to delete snag:', error);
    }
  };

  const startEditing = (snag: Snag) => {
    setEditingId(snag.id);
    setEditState({
      description: snag.description,
      priority: snag.priority,
      assignedTo: snag.assignedTo,
      status: snag.status
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditState({
      description: '',
      priority: 'Medium',
      assignedTo: '',
      status: 'Open'
    });
  };

  const saveChanges = async (snag: Snag) => {
    try {
      await updateSnag(snag.id, editState);
      setSnags(snags.map(s => 
        s.id === snag.id 
          ? { ...s, ...editState } 
          : s
      ));
      setEditingId(null);
    } catch (error) {
      console.error('Failed to update snag:', error);
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingId) {
        if (e.key === 'Escape') {
          cancelEditing();
        } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          const snag = snags.find(s => s.id === editingId);
          if (snag) saveChanges(snag);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingId, snags]);

  if (loading) {
    return (
      <div className={`rounded-lg shadow transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="p-4 border-b border-gray-200">
          <h2 className={`text-xl font-semibold transition-colors duration-300 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>Snag List</h2>
        </div>
        <div className={`p-8 text-center transition-colors duration-300 ${
          isDarkMode ? 'text-gray-400' : 'text-gray-500'
        }`}>
          Loading snags...
        </div>
      </div>
    );
  }

  if (!projectName) {
    return (
      <div className={`rounded-lg shadow transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="p-4 border-b border-gray-200">
          <h2 className={`text-xl font-semibold transition-colors duration-300 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>Snag List</h2>
        </div>
        <div className={`p-8 text-center transition-colors duration-300 ${
          isDarkMode ? 'text-gray-400' : 'text-gray-500'
        }`}>
          Select a project to view snags
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg shadow transition-colors duration-300 ${
      isDarkMode ? 'bg-gray-800' : 'bg-white'
    }`}>
      {/* Header with search and sort */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className={`text-lg font-medium transition-colors duration-300 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>Snag List</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className={`w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors duration-300 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-400'
              }`} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search descriptions..."
                className={`w-64 pl-9 pr-4 py-1.5 text-sm rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400 focus:ring-gray-500'
                    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500 focus:ring-gray-400'
                }`}
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className={`text-sm py-1.5 px-3 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-gray-200 focus:ring-gray-500'
                  : 'bg-white border-gray-200 text-gray-900 focus:ring-gray-400'
              }`}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="updated">Recently Updated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Snag List */}
      {filteredSnags.length === 0 ? (
        <div className={`p-8 text-center transition-colors duration-300 ${
          isDarkMode ? 'text-gray-400' : 'text-gray-500'
        }`}>
          {searchTerm ? 'No snags match your search.' : 'No snags added yet. Upload photos to get started.'}
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {filteredSnags.map((snag) => (
            <div 
              key={snag.id} 
              className={`p-4 transition-colors duration-300 ${
                isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex flex-col md:flex-row gap-4">
                {/* Photo */}
                <div className="md:w-1/3 relative group">
                  <div className={`relative w-full rounded-lg overflow-hidden transition-colors duration-300 ${
                    isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
                  }`}>
                    <div className="aspect-[4/3] relative">
                      <img
                        src={snag.photoPath}
                        alt={snag.description || `Snag #${snag.snagNumber}`}
                        className="absolute inset-0 w-full h-full object-contain cursor-pointer"
                        onClick={() => setZoomedImage(snag.photoPath)}
                      />
                    </div>
                  </div>
                  <div className={`absolute top-2 left-2 px-2 py-1 rounded-lg shadow-sm text-sm font-medium transition-all duration-300 ${
                    isDarkMode ? 'bg-gray-800/90 text-white' : 'bg-white/90 text-gray-900'
                  } backdrop-blur-sm`}>
                    Snag #{snag.snagNumber}
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity rounded-lg">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(snag.id);
                      }}
                      className={`absolute top-2 right-2 p-2 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-300 transform hover:scale-105 ${
                        isDarkMode
                          ? 'bg-gray-800/90 text-red-400 hover:text-red-300'
                          : 'bg-white/90 text-red-600 hover:text-red-700'
                      } backdrop-blur-sm`}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div className="md:w-2/3 space-y-4">
                  {editingId === snag.id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <textarea
                          value={editState.description}
                          onChange={(e) => setEditState(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full p-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                          placeholder="Enter description..."
                          autoFocus
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Priority
                          </label>
                          <select
                            value={editState.priority}
                            onChange={(e) => setEditState(prev => ({ 
                              ...prev, 
                              priority: e.target.value as 'Low' | 'Medium' | 'High' 
                            }))}
                            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Status
                          </label>
                          <select
                            value={editState.status}
                            onChange={(e) => setEditState(prev => ({ 
                              ...prev, 
                              status: e.target.value as 'Open' | 'Closed' 
                            }))}
                            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="Open">Open</option>
                            <option value="Closed">Closed</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Assigned To
                        </label>
                        <input
                          type="text"
                          value={editState.assignedTo}
                          onChange={(e) => setEditState(prev => ({ ...prev, assignedTo: e.target.value }))}
                          className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter name..."
                        />
                      </div>

                      <div className="flex justify-end items-center space-x-4">
                        <span className="text-sm text-gray-500">
                          Press Esc to cancel • Ctrl+Enter to save
                        </span>
                        <div className="space-x-2">
                          <button
                            onClick={cancelEditing}
                            className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => saveChanges(snag)}
                            className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="space-y-4 cursor-pointer hover:bg-gray-100 p-4 rounded-lg group relative"
                      onClick={() => startEditing(snag)}
                    >
                      <div>
                        <h3 className="text-sm font-medium text-gray-700">Description</h3>
                        <p className="mt-1 text-gray-600">{snag.description || 'No description'}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h3 className="text-sm font-medium text-gray-700">Priority</h3>
                          <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium
                            ${snag.priority === 'High' 
                              ? 'bg-red-100 text-red-800' 
                              : snag.priority === 'Medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {snag.priority}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-sm font-medium text-gray-700">Status</h3>
                          <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium
                            ${snag.status === 'Open' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {snag.status}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-gray-700">Assigned To</h3>
                        <p className="mt-1 text-gray-600">{snag.assignedTo || 'Unassigned'}</p>
                      </div>

                      <span className="text-sm text-blue-500 opacity-0 group-hover:opacity-100 absolute top-2 right-2">
                        Click to edit
                      </span>
                    </div>
                  )}
                  <div className="text-sm text-gray-500">
                    Added {format(new Date(snag.createdAt), 'MMM d, yyyy')}
                    {snag.updatedAt > snag.createdAt && 
                      ` • Updated ${format(new Date(snag.updatedAt), 'MMM d, yyyy')}`}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 max-w-md mx-4 space-y-4 transition-colors duration-300 ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h3 className={`text-lg font-semibold transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>Delete Snag</h3>
            <p className={`transition-colors duration-300 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Are you sure you want to delete this snag? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                  isDarkMode
                    ? 'text-gray-300 hover:bg-gray-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300 transform hover:scale-105"
              >
                Delete Snag
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-5xl w-full h-full flex items-center justify-center">
            <button
              onClick={() => setZoomedImage(null)}
              className={`absolute top-4 right-4 p-2 rounded-full shadow-sm transition-all duration-300 transform hover:scale-105 ${
                isDarkMode
                  ? 'bg-gray-800/90 text-white hover:bg-gray-700/90'
                  : 'bg-white/90 text-gray-900 hover:bg-gray-100/90'
              } backdrop-blur-sm`}
            >
              <X className="w-6 h-6" />
            </button>
            <div className="relative w-full h-full">
              <img
                src={zoomedImage}
                alt="Zoomed view"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 