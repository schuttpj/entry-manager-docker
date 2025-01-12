"use client"

import { useState } from "react"
import { ProjectSelector } from "@/components/ProjectSelector"
import { UploadArea } from "@/components/UploadArea"
import { SnagList } from "@/components/SnagList"
import { NewProjectDialog } from "@/components/NewProjectDialog"
import { AIVoiceAssistant } from "@/components/AIVoiceAssistant"
import { addProject } from "@/lib/db"

export default function Home() {
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isDarkMode] = useState(false);

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

  return (
    <main className="min-h-screen p-4 bg-gray-50">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Entry List Manager
          </h1>
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
            <AIVoiceAssistant 
              isDarkMode={isDarkMode} 
              projectName={selectedProject}
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
              handleUploadComplete={handleUploadComplete}
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

