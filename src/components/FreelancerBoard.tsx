'use client';
import React, { useState, useEffect } from 'react';
import { dbService } from '@/lib/supabase';
import { FreelancerProjectWithProfiles, FreelancerProposal, ProjectCategory, ProjectType, ProjectStatus } from '@/types/database';
import { useAuth } from '@/components/AuthProvider';

const categoryColors = {
  development: 'bg-blue-500',
  design: 'bg-purple-500',
  writing: 'bg-green-500',
  marketing: 'bg-orange-500',
  consulting: 'bg-yellow-500',
  other: 'bg-gray-500'
};

const statusColors = {
  open: 'bg-green-500',
  in_progress: 'bg-blue-500',
  completed: 'bg-gray-500',
  cancelled: 'bg-red-500'
};

export default function FreelancerBoard() {
  const { user, userProfile } = useAuth();
  const [projects, setProjects] = useState<FreelancerProjectWithProfiles[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<FreelancerProjectWithProfiles | null>(null);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState<ProjectCategory | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'all'>('all');

  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    category: 'development' as ProjectCategory,
    budget_min: 0,
    budget_max: 0,
    currency: 'EUR' as 'EUR' | 'USD' | 'CHF',
    deadline: '',
    skills_required: [] as string[],
    project_type: 'fixed' as ProjectType,
    remote_allowed: true,
    location: ''
  });

  const [newProposal, setNewProposal] = useState({
    proposal_text: '',
    proposed_budget: 0,
    proposed_timeline: 0
  });

  const [skillInput, setSkillInput] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await dbService.getFreelancerProjects();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProject.title || !newProject.description) return;

    try {
      await dbService.createFreelancerProject({
        ...newProject,
        budget_min: newProject.budget_min || undefined,
        budget_max: newProject.budget_max || undefined,
        deadline: newProject.deadline || undefined,
        location: newProject.location || undefined
      });

      await fetchProjects();
      setShowCreateModal(false);
      setNewProject({
        title: '',
        description: '',
        category: 'development',
        budget_min: 0,
        budget_max: 0,
        currency: 'EUR',
        deadline: '',
        skills_required: [],
        project_type: 'fixed',
        remote_allowed: true,
        location: ''
      });
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const handleSubmitProposal = async () => {
    if (!selectedProject || !newProposal.proposal_text) return;

    try {
      await dbService.createFreelancerProposal({
        project_id: selectedProject.id,
        proposal_text: newProposal.proposal_text,
        proposed_budget: newProposal.proposed_budget || undefined,
        proposed_timeline: newProposal.proposed_timeline || undefined
      });

      setShowProposalModal(false);
      setSelectedProject(null);
      setNewProposal({
        proposal_text: '',
        proposed_budget: 0,
        proposed_timeline: 0
      });
      await fetchProjects();
    } catch (error) {
      console.error('Error submitting proposal:', error);
    }
  };

  const addSkill = () => {
    if (skillInput.trim() && !newProject.skills_required.includes(skillInput.trim())) {
      setNewProject(prev => ({
        ...prev,
        skills_required: [...prev.skills_required, skillInput.trim()]
      }));
      setSkillInput('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setNewProject(prev => ({
      ...prev,
      skills_required: prev.skills_required.filter(skill => skill !== skillToRemove)
    }));
  };

  const filteredProjects = projects.filter(project => {
    const categoryMatch = filterCategory === 'all' || project.category === filterCategory;
    const statusMatch = filterStatus === 'all' || project.status === filterStatus;
    return categoryMatch && statusMatch;
  });

  const formatBudget = (min?: number, max?: number, currency = 'EUR') => {
    if (!min && !max) return 'Budget negotiable';
    if (min && max) return `${min} - ${max} ${currency}`;
    if (min) return `From ${min} ${currency}`;
    if (max) return `Up to ${max} ${currency}`;
    return 'Budget negotiable';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Freelancer Börse</h1>
            <p className="text-gray-400">Finden Sie Projekte oder stellen Sie Ihr eigenes Projekt ein</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Projekt erstellen
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as ProjectCategory | 'all')}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700"
          >
            <option value="all">Alle Kategorien</option>
            <option value="development">Development</option>
            <option value="design">Design</option>
            <option value="writing">Writing</option>
            <option value="marketing">Marketing</option>
            <option value="consulting">Consulting</option>
            <option value="other">Other</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as ProjectStatus | 'all')}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700"
          >
            <option value="all">Alle Status</option>
            <option value="open">Offen</option>
            <option value="in_progress">In Bearbeitung</option>
            <option value="completed">Abgeschlossen</option>
            <option value="cancelled">Abgebrochen</option>
          </select>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div key={project.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              {/* Project Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-2">
                  <span className={`px-2 py-1 rounded text-xs text-white ${categoryColors[project.category]}`}>
                    {project.category}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs text-white ${statusColors[project.status]}`}>
                    {project.status}
                  </span>
                </div>
                {project.remote_allowed && (
                  <span className="text-xs text-green-400">🌍 Remote</span>
                )}
              </div>

              <h3 className="text-xl font-semibold text-white mb-2">{project.title}</h3>
              <p className="text-gray-300 mb-4 line-clamp-3">{project.description}</p>

              {/* Budget */}
              <div className="mb-4">
                <p className="text-lg font-semibold text-green-400">
                  {formatBudget(project.budget_min, project.budget_max, project.currency)}
                </p>
                {project.project_type === 'hourly' && (
                  <p className="text-sm text-gray-400">Pro Stunde</p>
                )}
              </div>

              {/* Skills */}
              {project.skills_required && project.skills_required.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-1">
                    {project.skills_required.slice(0, 3).map((skill, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">
                        {skill}
                      </span>
                    ))}
                    {project.skills_required.length > 3 && (
                      <span className="px-2 py-1 bg-gray-700 text-gray-400 rounded text-xs">
                        +{project.skills_required.length - 3} mehr
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex justify-between items-center text-sm text-gray-400">
                <div>
                  <p>Von: {project.client.full_name || project.client.email}</p>
                  {project.deadline && (
                    <p>Deadline: {formatDate(project.deadline)}</p>
                  )}
                </div>
                {project.status === 'open' && user && user.id !== project.client_id && (
                  <button
                    onClick={() => {
                      setSelectedProject(project);
                      setShowProposalModal(true);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Angebot abgeben
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <div className="text-center text-gray-400 mt-12">
            <p>Keine Projekte gefunden.</p>
          </div>
        )}

        {/* Create Project Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
              <h2 className="text-2xl font-bold text-white mb-6">Neues Projekt erstellen</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Titel</label>
                  <input
                    type="text"
                    value={newProject.title}
                    onChange={(e) => setNewProject(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="z.B. Website-Entwicklung"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Beschreibung</label>
                  <textarea
                    value={newProject.description}
                    onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="Detaillierte Projektbeschreibung..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Kategorie</label>
                    <select
                      value={newProject.category}
                      onChange={(e) => setNewProject(prev => ({ ...prev, category: e.target.value as ProjectCategory }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    >
                      <option value="development">Development</option>
                      <option value="design">Design</option>
                      <option value="writing">Writing</option>
                      <option value="marketing">Marketing</option>
                      <option value="consulting">Consulting</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Projekt-Typ</label>
                    <select
                      value={newProject.project_type}
                      onChange={(e) => setNewProject(prev => ({ ...prev, project_type: e.target.value as ProjectType }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    >
                      <option value="fixed">Festpreis</option>
                      <option value="hourly">Stundenbasis</option>
                      <option value="ongoing">Laufend</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Budget Min</label>
                    <input
                      type="number"
                      value={newProject.budget_min}
                      onChange={(e) => setNewProject(prev => ({ ...prev, budget_min: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Budget Max</label>
                    <input
                      type="number"
                      value={newProject.budget_max}
                      onChange={(e) => setNewProject(prev => ({ ...prev, budget_max: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Währung</label>
                    <select
                      value={newProject.currency}
                      onChange={(e) => setNewProject(prev => ({ ...prev, currency: e.target.value as 'EUR' | 'USD' | 'CHF' }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    >
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                      <option value="CHF">CHF</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Deadline (optional)</label>
                  <input
                    type="date"
                    value={newProject.deadline}
                    onChange={(e) => setNewProject(prev => ({ ...prev, deadline: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Benötigte Skills</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      placeholder="Skill hinzufügen..."
                    />
                    <button
                      type="button"
                      onClick={addSkill}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {newProject.skills_required.map((skill, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-sm flex items-center gap-1"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="text-red-400 hover:text-red-300"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newProject.remote_allowed}
                      onChange={(e) => setNewProject(prev => ({ ...prev, remote_allowed: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-gray-300">Remote möglich</span>
                  </label>
                </div>

                {!newProject.remote_allowed && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Standort</label>
                    <input
                      type="text"
                      value={newProject.location}
                      onChange={(e) => setNewProject(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      placeholder="z.B. Berlin, Deutschland"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleCreateProject}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Projekt erstellen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Proposal Modal */}
        {showProposalModal && selectedProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
              <h2 className="text-2xl font-bold text-white mb-6">
                Angebot für: {selectedProject.title}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Ihr Angebot</label>
                  <textarea
                    value={newProposal.proposal_text}
                    onChange={(e) => setNewProposal(prev => ({ ...prev, proposal_text: e.target.value }))}
                    rows={6}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="Beschreiben Sie, warum Sie der richtige Freelancer für dieses Projekt sind..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Ihr Preis ({selectedProject.currency})
                    </label>
                    <input
                      type="number"
                      value={newProposal.proposed_budget}
                      onChange={(e) => setNewProposal(prev => ({ ...prev, proposed_budget: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Zeitrahmen (Tage)
                    </label>
                    <input
                      type="number"
                      value={newProposal.proposed_timeline}
                      onChange={(e) => setNewProposal(prev => ({ ...prev, proposed_timeline: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => {
                    setShowProposalModal(false);
                    setSelectedProject(null);
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSubmitProposal}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Angebot abgeben
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
