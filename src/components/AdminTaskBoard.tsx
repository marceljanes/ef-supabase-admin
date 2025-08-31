'use client';
import React, { useState } from 'react';

interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  questionCount: number;
  examCode: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Mixed';
  dueDate: string;
  createdAt: string;
  tags: string[];
}

interface Column {
  id: string;
  title: string;
  color: string;
  tasks: Task[];
}

const initialColumns: Column[] = [
  { id: 'idea', title: 'Idea', color: 'bg-purple-600', tasks: [] },
  { id: 'in-progress', title: 'In Progress', color: 'bg-blue-600', tasks: [] },
  { id: 'done', title: 'Done', color: 'bg-green-600', tasks: [] }
];

const sampleTasks: Task[] = [
  {
    id: '1',
    title: 'AWS SAA-C03 Security Questions',
    description: 'Create 20 advanced security questions for AWS Solutions Architect certification',
    assignee: 'John Doe',
    priority: 'High',
    questionCount: 20,
    examCode: 'AWS-SAA-C03',
    category: 'Security',
    difficulty: 'Advanced',
    dueDate: '2024-02-15',
    createdAt: '2024-01-20',
    tags: ['AWS', 'Security', 'IAM']
  },
  {
    id: '2',
    title: 'Azure AZ-104 Networking Scenarios',
    description: 'Develop scenario-based questions for Azure networking concepts',
    assignee: 'Jane Smith',
    priority: 'Medium',
    questionCount: 15,
    examCode: 'AZ-104',
    category: 'Networking',
    difficulty: 'Intermediate',
    dueDate: '2024-02-20',
    createdAt: '2024-01-18',
    tags: ['Azure', 'Networking', 'VNet']
  }
];

export default function AdminTaskBoard() {
  const [columns, setColumns] = useState<Column[]>(() => {
    const cols = [...initialColumns];
    cols[0].tasks = sampleTasks;
    return cols;
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [draggedFrom, setDraggedFrom] = useState<string | null>(null);

  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    assignee: '',
    priority: 'Medium',
    questionCount: 10,
    examCode: '',
    category: '',
    difficulty: 'Mixed',
    dueDate: '',
    tags: []
  });

  const priorityColors = {
    Low: 'bg-gray-500',
    Medium: 'bg-blue-500',
    High: 'bg-orange-500',
    Urgent: 'bg-red-500'
  };

  const handleDragStart = (task: Task, columnId: string) => {
    setDraggedTask(task);
    setDraggedFrom(columnId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    if (!draggedTask || !draggedFrom || draggedFrom === targetColumnId) {
      setDraggedTask(null);
      setDraggedFrom(null);
      return;
    }

    setColumns(prev => {
      const newColumns = prev.map(col => {
        if (col.id === draggedFrom) {
          return { ...col, tasks: col.tasks.filter(t => t.id !== draggedTask.id) };
        }
        if (col.id === targetColumnId) {
          return { ...col, tasks: [...col.tasks, draggedTask] };
        }
        return col;
      });
      return newColumns;
    });

    setDraggedTask(null);
    setDraggedFrom(null);
  };

  const createTask = () => {
    if (!newTask.title || !newTask.assignee) return;

    const task: Task = {
      id: Date.now().toString(),
      title: newTask.title!,
      description: newTask.description || '',
      assignee: newTask.assignee!,
      priority: newTask.priority!,
      questionCount: newTask.questionCount!,
      examCode: newTask.examCode || '',
      category: newTask.category || '',
      difficulty: newTask.difficulty!,
      dueDate: newTask.dueDate || '',
      createdAt: new Date().toISOString().split('T')[0],
      tags: newTask.tags || []
    };

    setColumns(prev => prev.map(col => 
      col.id === 'idea' ? { ...col, tasks: [...col.tasks, task] } : col
    ));

    setNewTask({
      title: '',
      description: '',
      assignee: '',
      priority: 'Medium',
      questionCount: 10,
      examCode: '',
      category: '',
      difficulty: 'Mixed',
      dueDate: '',
      tags: []
    });
    setShowCreateModal(false);
  };

  const deleteTask = (taskId: string, columnId: string) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, tasks: col.tasks.filter(t => t.id !== taskId) } : col
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Task Management Board</h2>
          <p className="text-zinc-400 text-sm">Manage question creation tasks and assignments</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white font-medium"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Task
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {columns.map(col => (
          <div key={col.id} className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${col.color}`} />
              <div>
                <div className="font-medium text-white">{col.title}</div>
                <div className="text-sm text-zinc-400">{col.tasks.length} tasks</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-3 gap-6 min-h-[600px]">
        {columns.map(column => (
          <div
            key={column.id}
            className="bg-zinc-900 border border-zinc-700 rounded-lg p-4"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-3 h-3 rounded-full ${column.color}`} />
              <h3 className="font-semibold text-white">{column.title}</h3>
              <span className="ml-auto text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded">
                {column.tasks.length}
              </span>
            </div>

            {/* Tasks */}
            <div className="space-y-3">
              {column.tasks.map(task => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => handleDragStart(task, column.id)}
                  className="bg-zinc-800 border border-zinc-600 rounded-lg p-4 cursor-move hover:bg-zinc-750 transition-colors"
                >
                  {/* Task Header */}
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-medium text-white text-sm line-clamp-2">{task.title}</h4>
                    <div className="flex items-center gap-1 ml-2">
                      <div className={`w-2 h-2 rounded-full ${priorityColors[task.priority]}`} />
                      <button
                        onClick={() => deleteTask(task.id, column.id)}
                        className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-red-400"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Task Details */}
                  <div className="space-y-2 text-xs">
                    {task.examCode && (
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-400">Exam:</span>
                        <span className="text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded">{task.examCode}</span>
                      </div>
                    )}
                    
                    {task.category && (
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-400">Category:</span>
                        <span className="text-green-400">{task.category}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400">Questions:</span>
                      <span className="text-white">{task.questionCount}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400">Difficulty:</span>
                      <span className="text-yellow-400">{task.difficulty}</span>
                    </div>

                    {task.dueDate && (
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-400">Due:</span>
                        <span className="text-orange-400">{task.dueDate}</span>
                      </div>
                    )}

                    {/* Tags */}
                    {task.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {task.tags.map(tag => (
                          <span key={tag} className="text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Assignee */}
                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-zinc-700">
                      <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-xs font-medium text-white">
                        {task.assignee.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="text-zinc-300 text-xs">{task.assignee}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowCreateModal(false)} />
          <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-zinc-700">
              <h3 className="text-xl font-semibold text-white">Create New Task</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-zinc-700 rounded">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Task Title*</label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={e => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white"
                    placeholder="e.g., AWS Security Questions"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Assignee*</label>
                  <input
                    type="text"
                    value={newTask.assignee}
                    onChange={e => setNewTask(prev => ({ ...prev, assignee: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white"
                    placeholder="e.g., John Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Description</label>
                <textarea
                  rows={3}
                  value={newTask.description}
                  onChange={e => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white"
                  placeholder="Describe the task requirements..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={e => setNewTask(prev => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Question Count</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={newTask.questionCount}
                    onChange={e => setNewTask(prev => ({ ...prev, questionCount: Number(e.target.value) }))}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Difficulty</label>
                  <select
                    value={newTask.difficulty}
                    onChange={e => setNewTask(prev => ({ ...prev, difficulty: e.target.value as any }))}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white"
                  >
                    <option value="Mixed">Mixed</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Exam Code</label>
                  <input
                    type="text"
                    value={newTask.examCode}
                    onChange={e => setNewTask(prev => ({ ...prev, examCode: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white"
                    placeholder="e.g., AWS-SAA-C03"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Category</label>
                  <input
                    type="text"
                    value={newTask.category}
                    onChange={e => setNewTask(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white"
                    placeholder="e.g., Security"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={newTask.dueDate}
                    onChange={e => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-zinc-700">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-zinc-600 rounded-lg text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={createTask}
                disabled={!newTask.title || !newTask.assignee}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg text-white"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
