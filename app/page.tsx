"use client"

import { useState } from "react"
import { ProjectSelector } from "@/components/ProjectSelector"
import { UploadArea } from "@/components/UploadArea"
import { SnagList } from "@/components/SnagList"
import { NewProjectDialog } from "@/components/NewProjectDialog"
import { addProject } from "@/lib/db"
import { Moon, Sun } from "lucide-react"

export default function Home() {
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const handleProjectSelect = (projectName: string) => {
    setSelectedProject(projectName);
  };

  const handleUploadComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleNewProject = async (projectName: string) => {
    try {
      await addProject(projectName);
      setSelectedProject(projectName);
      handleUploadComplete();
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <main className={`min-h-screen p-4 transition-colors duration-300 ${
      isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <header className="flex justify-between items-center mb-6">
          <h1 className={`text-2xl font-bold transition-colors duration-300 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Snag List Manager
          </h1>
          <button
            onClick={toggleDarkMode}
            className={`p-2 rounded-lg transition-all duration-300 ${
              isDarkMode 
                ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar */}
          <aside className="col-span-3">
            <ProjectSelector
              selectedProject={selectedProject}
              onProjectSelect={handleProjectSelect}
              onNewProject={() => setIsNewProjectDialogOpen(true)}
              refreshTrigger={refreshTrigger}
              isDarkMode={isDarkMode}
            />
          </aside>

          {/* Content Area */}
          <section className="col-span-9 space-y-6">
            <UploadArea
              projectName={selectedProject}
              onUploadComplete={handleUploadComplete}
              isDarkMode={isDarkMode}
            />
            <SnagList
              projectName={selectedProject}
              refreshTrigger={refreshTrigger}
              isDarkMode={isDarkMode}
            />
          </section>
        </div>
      </div>

      <NewProjectDialog
        isOpen={isNewProjectDialogOpen}
        onClose={() => setIsNewProjectDialogOpen(false)}
        onSubmit={handleNewProject}
        isDarkMode={isDarkMode}
      />
    </main>
  );
}

