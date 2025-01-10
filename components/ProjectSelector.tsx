import { useState, useEffect } from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';
import { getAllProjects, getAllSnags, deleteProject, getProject } from '@/lib/db';

interface Project {
  id: string;
  name: string;
  count: number;
}

interface ProjectSelectorProps {
  selectedProject: string;
  onProjectSelect: (project: string) => void;
  onNewProject: () => void;
  refreshTrigger?: number;
  isDarkMode?: boolean;
}

export function ProjectSelector({ 
  selectedProject, 
  onProjectSelect, 
  onNewProject,
  refreshTrigger = 0,
  isDarkMode = false
}: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [deleteConfirmProject, setDeleteConfirmProject] = useState<string | null>(null);

  useEffect(() => {
    const loadProjects = async () => {
      const [projectList, snags] = await Promise.all([
        getAllProjects(),
        getAllSnags()
      ]);

      // Count snags per project
      const snagCounts = snags.reduce((acc, snag) => {
        const count = (acc.get(snag.projectName) || 0) + 1;
        acc.set(snag.projectName, count);
        return acc;
      }, new Map<string, number>());

      // Combine project data with snag counts
      const projectsWithCounts = projectList.map(project => ({
        id: project.id,
        name: project.name,
        count: snagCounts.get(project.name) || 0
      })).sort((a, b) => a.name.localeCompare(b.name));

      setProjects(projectsWithCounts);
    };

    loadProjects();
  }, [refreshTrigger]);

  const handleDeleteProject = async (projectId: string) => {
    await deleteProject(projectId);
    
    // Update local state
    const project = await getProject(projectId);
    if (project && selectedProject === project.name) {
      onProjectSelect('');
    }
    setDeleteConfirmProject(null);
    
    // Refresh projects list
    const updatedProjects = await getAllProjects();
    const snags = await getAllSnags();
    
    // Count snags per project
    const snagCounts = snags.reduce((acc, snag) => {
      const count = (acc.get(snag.projectName) || 0) + 1;
      acc.set(snag.projectName, count);
      return acc;
    }, new Map<string, number>());

    // Update projects with counts
    const projectsWithCounts = updatedProjects
      .map(project => ({
        id: project.id,
        name: project.name,
        count: snagCounts.get(project.name) || 0
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    setProjects(projectsWithCounts);
  };

  return (
    <div className={`rounded-lg shadow p-4 transition-colors duration-300 ${
      isDarkMode ? 'bg-gray-800' : 'bg-white'
    }`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className={`text-lg font-medium transition-colors duration-300 ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>Projects</h2>
        <button
          onClick={onNewProject}
          className={`p-1.5 rounded-lg transition-all duration-300 hover:bg-gray-100 ${
            isDarkMode 
              ? 'text-gray-200 hover:text-white hover:bg-gray-700' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
          title="New Project"
        >
          <PlusCircle className="w-4 h-4" />
        </button>
      </div>
      
      <div className="space-y-2">
        {projects.length === 0 ? (
          <p className={`text-sm text-center py-4 transition-colors duration-300 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            No projects yet. Create your first project!
          </p>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="relative group"
            >
              <button
                onClick={() => onProjectSelect(project.name)}
                className={`w-full px-4 py-2 rounded-lg text-left transition-all duration-300 ${
                  selectedProject === project.name
                    ? isDarkMode 
                      ? 'bg-gray-700 text-white' 
                      : 'bg-gray-900 text-white'
                    : isDarkMode
                      ? 'hover:bg-gray-700 text-gray-200'
                      : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <div className="flex justify-between items-center pr-8">
                  <span className="font-medium">{project.name}</span>
                  <span className={`px-2 py-1 rounded-full text-sm transition-colors duration-300 ${
                    selectedProject === project.name
                      ? isDarkMode
                        ? 'bg-gray-600 text-white'
                        : 'bg-gray-800 text-white'
                      : isDarkMode
                        ? 'bg-gray-900 text-gray-200'
                        : 'bg-gray-200 text-gray-700'
                  }`}>
                    {project.count} {project.count === 1 ? 'snag' : 'snags'}
                  </span>
                </div>
              </button>
              
              {/* Delete Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirmProject(project.name);
                }}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 ${
                  isDarkMode
                    ? 'text-gray-400 hover:text-red-400 hover:bg-gray-700'
                    : 'text-gray-400 hover:text-red-600 hover:bg-gray-100'
                }`}
                title="Delete Project"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* Delete Confirmation Modal */}
              {deleteConfirmProject === project.name && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className={`rounded-lg p-6 max-w-md mx-4 space-y-4 transition-colors duration-300 ${
                    isDarkMode ? 'bg-gray-800' : 'bg-white'
                  }`}>
                    <h3 className={`text-lg font-semibold transition-colors duration-300 ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>Delete Project</h3>
                    <p className={`transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      Are you sure you want to delete "{project.name}"? This will permanently delete the project and all its {project.count} snags.
                    </p>
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setDeleteConfirmProject(null)}
                        className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                          isDarkMode
                            ? 'text-gray-300 hover:bg-gray-700'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300"
                      >
                        Delete Project
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
} 