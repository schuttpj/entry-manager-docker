import { useState, useEffect } from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';
import { getAllProjects, getAllSnags, deleteProject, getProject } from '@/lib/db';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
    <Card className={`p-4 transition-all duration-300 ${
      isDarkMode ? 'bg-[#1a1f2e] shadow-lg' : 'bg-white/95 backdrop-blur-sm'
    }`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className={`text-lg font-semibold transition-colors duration-300 ${
          isDarkMode ? 'text-zinc-100' : 'text-gray-900'
        }`}>Projects</h2>
        <Button
          onClick={onNewProject}
          variant="ghost"
          size="icon"
          className={`rounded-full transition-all duration-300 hover:scale-110 ${
            isDarkMode 
              ? 'text-zinc-400 hover:text-zinc-200 hover:bg-[#252b3b]' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
          title="New Project"
        >
          <PlusCircle className="w-5 h-5" />
        </Button>
      </div>
      
      <div className="space-y-2">
        {projects.length === 0 ? (
          <div className={`text-sm text-center py-6 rounded-lg border-2 border-dashed transition-colors duration-300 ${
            isDarkMode 
              ? 'text-zinc-400 border-[#252b3b]' 
              : 'text-gray-500 border-gray-200'
          }`}>
            <p>No projects yet.</p>
            <p className="mt-1 text-xs">Create your first project to get started!</p>
          </div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="relative group"
            >
              <button
                onClick={() => onProjectSelect(project.name)}
                className={`w-full px-4 py-3 rounded-lg text-left transition-all duration-300 ${
                  selectedProject === project.name
                    ? isDarkMode 
                      ? 'bg-[#252b3b] text-zinc-100 ring-2 ring-blue-500/20' 
                      : 'bg-gray-900 text-white ring-2 ring-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                    : isDarkMode
                      ? 'hover:bg-[#1e2433] text-zinc-300 hover:shadow-[0_2px_10px_rgba(0,0,0,0.2)]'
                      : 'hover:bg-gray-50 text-gray-700 hover:shadow-md'
                }`}
              >
                <div className="flex justify-between items-center pr-8">
                  <span className={`font-medium transition-all duration-300 ${
                    selectedProject === project.name 
                      ? 'text-lg transform scale-105' 
                      : 'group-hover:scale-105'
                  }`}>
                    {project.name}
                  </span>
                  <div className={`min-w-[80px] h-[26px] flex items-center justify-center rounded-full text-xs font-medium transition-all duration-300 ${
                    selectedProject === project.name
                      ? isDarkMode
                        ? 'bg-blue-500/10 text-blue-200'
                        : 'bg-blue-500/20 text-blue-100'
                      : isDarkMode
                        ? 'bg-[#1a1f2e] text-zinc-400'
                        : 'bg-gray-100 text-gray-600'
                  }`}>
                    {project.count} {project.count === 1 ? 'entry' : 'entries'}
                  </div>
                </div>
              </button>

              {/* Delete Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirmProject(project.name);
                }}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 ${
                  isDarkMode
                    ? 'text-zinc-500 hover:text-red-400 hover:bg-[#252b3b]'
                    : 'text-gray-400 hover:text-red-600 hover:bg-gray-100'
                }`}
                title="Delete Project"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* Delete Confirmation Modal */}
              {deleteConfirmProject === project.name && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                  <Card className={`p-6 max-w-md mx-4 space-y-4 transition-all duration-300 animate-in fade-in-0 zoom-in-95 ${
                    isDarkMode ? 'bg-[#1a1f2e] text-zinc-100' : 'bg-white text-gray-900'
                  }`}>
                    <h3 className="text-lg font-semibold">Delete Project</h3>
                    <p className={`${
                      isDarkMode ? 'text-zinc-400' : 'text-gray-600'
                    }`}>
                      Are you sure you want to delete "{project.name}"? This will permanently delete the project and all its {project.count} entries.
                    </p>
                    <div className="flex justify-end gap-3 pt-2">
                      <Button
                        variant="ghost"
                        onClick={() => setDeleteConfirmProject(null)}
                        className={isDarkMode ? 'text-zinc-300 hover:bg-[#252b3b] hover:text-zinc-100' : 'hover:bg-gray-100'}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleDeleteProject(project.id)}
                        className="hover:bg-red-700 transition-colors duration-300"
                      >
                        Delete Project
                      </Button>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  );
} 