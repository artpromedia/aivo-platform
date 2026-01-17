'use client';

import { useState, useEffect } from 'react';
import {
  WritingTemplate,
  WritingProject,
  getWritingTemplates,
  getTemplatesByType,
  getTemplate,
  createWritingProject,
  updateWritingProject,
  getWritingProjects,
  deleteWritingProject,
  exportProject,
} from '@/lib/writing-api';

interface WritingTemplatesProps {
  learnerId: string;
}

/**
 * Writing Templates component
 * Provides structured templates for different types of writing
 */
export function WritingTemplates({ learnerId }: WritingTemplatesProps) {
  const [templates, setTemplates] = useState<WritingTemplate[]>([]);
  const [projects, setProjects] = useState<WritingProject[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<WritingTemplate | null>(null);
  const [currentProject, setCurrentProject] = useState<WritingProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'templates' | 'projects' | 'editor'>('templates');
  const [filterType, setFilterType] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
    loadProjects();
  }, [learnerId]);

  async function loadTemplates(type?: string) {
    try {
      setLoading(true);
      const data = type ? await getTemplatesByType(type) : await getWritingTemplates();
      setTemplates(data);
    } catch (err) {
      setError('Failed to load templates');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadProjects() {
    try {
      const data = await getWritingProjects(learnerId);
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  }

  async function handleSelectTemplate(template: WritingTemplate) {
    try {
      const fullTemplate = await getTemplate(template.id);
      setSelectedTemplate(fullTemplate);
      
      // Initialize new project with template
      const newProject: WritingProject = {
        id: `temp-${Date.now()}`,
        learnerId,
        templateId: fullTemplate.id,
        title: '',
        sections: fullTemplate.sections.map((section) => ({
          ...section,
          content: '',
        })),
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      };
      
      setCurrentProject(newProject);
      setView('editor');
    } catch (err) {
      setError('Failed to load template details');
      console.error(err);
    }
  }

  async function handleLoadProject(project: WritingProject) {
    try {
      const template = await getTemplate(project.templateId);
      setSelectedTemplate(template);
      setCurrentProject(project);
      setView('editor');
    } catch (err) {
      setError('Failed to load project');
      console.error(err);
    }
  }

  async function handleSaveProject() {
    if (!currentProject) return;

    try {
      setSaving(true);
      setError(null);

      if (currentProject.id.startsWith('temp-')) {
        // Create new project
        const newProject = await createWritingProject(learnerId, {
          templateId: currentProject.templateId,
          title: currentProject.title,
          sections: currentProject.sections,
        });
        setCurrentProject(newProject);
      } else {
        // Update existing project
        const updatedProject = await updateWritingProject(learnerId, currentProject.id, {
          title: currentProject.title,
          sections: currentProject.sections,
        });
        setCurrentProject(updatedProject);
      }

      await loadProjects();
    } catch (err) {
      setError('Failed to save project');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProject(projectId: string) {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      await deleteWritingProject(learnerId, projectId);
      await loadProjects();
      if (currentProject?.id === projectId) {
        setCurrentProject(null);
        setSelectedTemplate(null);
        setView('projects');
      }
    } catch (err) {
      setError('Failed to delete project');
      console.error(err);
    }
  }

  async function handleExportProject(format: 'pdf' | 'docx') {
    if (!currentProject) return;

    try {
      const blob = await exportProject(learnerId, currentProject.id, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentProject.title || 'document'}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(`Failed to export as ${format}`);
      console.error(err);
    }
  }

  function updateSection(sectionId: string, content: string) {
    if (!currentProject) return;

    const updatedSections = currentProject.sections.map((section) =>
      section.id === sectionId ? { ...section, content } : section
    );

    setCurrentProject({
      ...currentProject,
      sections: updatedSections,
      lastModified: new Date().toISOString(),
    });
  }

  const templateTypes = [
    'Essay',
    'Report',
    'Story',
    'Letter',
    'Email',
    'Paragraph',
    'Poem',
    'Persuasive',
  ];

  if (loading && templates.length === 0) {
    return <div className="text-center py-8">Loading writing templates...</div>;
  }

  return (
    <div>
      {/* View Selector */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setView('templates')}
          className={`px-4 py-2 rounded-md font-medium ${
            view === 'templates'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Templates
        </button>
        <button
          onClick={() => setView('projects')}
          className={`px-4 py-2 rounded-md font-medium ${
            view === 'projects'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          My Projects ({projects.length})
        </button>
      </div>

      {/* Templates View */}
      {view === 'templates' && (
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Filter by type:</label>
            <select
              value={filterType || ''}
              onChange={(e) => {
                const type = e.target.value || null;
                setFilterType(type);
                loadTemplates(type || undefined);
              }}
              className="px-3 py-2 border border-slate-300 rounded-md"
            >
              <option value="">All Types</option>
              {templateTypes.map((type) => (
                <option key={type} value={type.toLowerCase()}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className="p-4 border border-slate-200 rounded-lg text-left hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium">{template.name}</h4>
                  <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded">
                    {template.type}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mb-2">{template.description}</p>
                <p className="text-xs text-slate-500">{template.gradeLevel}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Projects View */}
      {view === 'projects' && (
        <div>
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 mb-4">You don't have any writing projects yet.</p>
              <button
                onClick={() => setView('templates')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Start a New Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="p-4 border border-slate-200 rounded-lg hover:border-indigo-300 transition-colors"
                >
                  <h4 className="font-medium mb-2">{project.title || 'Untitled Project'}</h4>
                  <p className="text-xs text-slate-500 mb-3">
                    Last modified: {new Date(project.lastModified).toLocaleDateString()}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleLoadProject(project)}
                      className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => handleDeleteProject(project.id)}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Editor View */}
      {view === 'editor' && currentProject && selectedTemplate && (
        <div>
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <input
                type="text"
                value={currentProject.title}
                onChange={(e) => setCurrentProject({ ...currentProject, title: e.target.value })}
                className="text-xl font-semibold border-none outline-none focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1 w-full"
                placeholder="Enter project title..."
              />
              <p className="text-sm text-slate-600 mt-1">{selectedTemplate.name}</p>
            </div>
            <button
              onClick={() => {
                setView('projects');
                setCurrentProject(null);
                setSelectedTemplate(null);
              }}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200"
            >
              Close
            </button>
          </div>

          <div className="space-y-6">
            {currentProject.sections.map((section, idx) => (
              <div key={section.id} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-lg">{section.title}</h4>
                    {section.prompt && (
                      <p className="text-sm text-slate-600 mt-1">{section.prompt}</p>
                    )}
                  </div>
                  <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded">
                    Section {idx + 1}
                  </span>
                </div>

                <textarea
                  value={section.content}
                  onChange={(e) => updateSection(section.id, e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  rows={section.minWords ? Math.max(4, Math.ceil(section.minWords / 15)) : 6}
                  placeholder={section.placeholder || 'Start writing...'}
                />

                {section.minWords && (
                  <p className="text-xs text-slate-500 mt-1">
                    {section.content.split(/\s+/).filter(Boolean).length} /{' '}
                    {section.minWords} words minimum
                  </p>
                )}
              </div>
            ))}
          </div>

          {error && <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md">{error}</div>}

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleSaveProject}
              disabled={saving || !currentProject.title.trim()}
              className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Project'}
            </button>
            {!currentProject.id.startsWith('temp-') && (
              <>
                <button
                  onClick={() => handleExportProject('pdf')}
                  className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700"
                >
                  Export as PDF
                </button>
                <button
                  onClick={() => handleExportProject('docx')}
                  className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700"
                >
                  Export as DOCX
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
