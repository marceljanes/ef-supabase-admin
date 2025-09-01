'use client';
import React, { useState, useEffect } from 'react';
import { dbService } from '@/lib/supabase';
import { UserProfile, Task, TaskWithProfiles } from '@/types/database';

interface Column {
  id: string;
  title: string;
  color: string;
  tasks: TaskWithProfiles[];
}

const initialColumns: Column[] = [
  { id: 'idea', title: 'Idea', color: 'bg-purple-600', tasks: [] },
  { id: 'demand', title: 'Demand', color: 'bg-orange-600', tasks: [] },
  { id: 'in-progress', title: 'In Progress', color: 'bg-blue-600', tasks: [] },
  { id: 'done', title: 'Done', color: 'bg-green-600', tasks: [] }
];

export default function AdminTaskBoard() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [draggedTask, setDraggedTask] = useState<TaskWithProfiles | null>(null);
  const [draggedFrom, setDraggedFrom] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithProfiles | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTask, setEditTask] = useState<any>({});
  const [updating, setUpdating] = useState(false);

  // Check if current user is admin
  const isAdmin = currentUser && 
                 (currentUser.role === 'admin' || currentUser.role === 'superadmin') && 
                 currentUser.status === 'approved';
  
  // Debug logging
  console.log('AdminTaskBoard Debug:', {
    currentUser: currentUser,
    userRole: currentUser?.role,
    userStatus: currentUser?.status,
    isAdmin: isAdmin,
    loading: loading
  });

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignee_id: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    exam_code: '',
    difficulty: 'mixed' as 'beginner' | 'intermediate' | 'advanced' | 'mixed',
    due_date: '',
    tags: [] as string[]
  });

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch current user profile (includes role/status)
        const userProfile = await dbService.getCurrentUserProfile();
        console.log('Fetched user profile:', userProfile);
        setCurrentUser(userProfile);
        
        // Fetch users for assignee dropdown
        const profiles = await dbService.getUsers();
        setUsers(profiles);
        
        // Fetch tasks and organize by status
        const tasks = await dbService.getTasks();
        
        // Organize tasks by status
        const organizedColumns = initialColumns.map(col => ({
          ...col,
          tasks: tasks.filter((task: TaskWithProfiles) => task.status === col.id)
        }));
        
        setColumns(organizedColumns);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const priorityColors = {
    low: 'bg-gray-500',
    medium: 'bg-blue-500',
    high: 'bg-orange-500',
    urgent: 'bg-red-500'
  };

  const handleDragStart = (task: TaskWithProfiles, columnId: string) => {
    setDraggedTask(task);
    setDraggedFrom(columnId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    if (!draggedTask || !draggedFrom || draggedFrom === targetColumnId) {
      setDraggedTask(null);
      setDraggedFrom(null);
      return;
    }

    try {
      // Update task status in database
      await dbService.updateTaskStatus(draggedTask.id, targetColumnId as any);
      
      // Update local state
      setColumns(prev => {
        const newColumns = prev.map(col => {
          if (col.id === draggedFrom) {
            return { ...col, tasks: col.tasks.filter(t => t.id !== draggedTask.id) };
          }
          if (col.id === targetColumnId) {
            return { ...col, tasks: [...col.tasks, { ...draggedTask, status: targetColumnId as any }] };
          }
          return col;
        });
        return newColumns;
      });
    } catch (error) {
      console.error('Error updating task status:', error);
    }

    setDraggedTask(null);
    setDraggedFrom(null);
  };

  const createTask = async () => {
    console.log('=== CREATE TASK DEBUG ===');
    console.log('newTask.title:', newTask.title);
    console.log('currentUser:', currentUser);
    console.log('isAdmin:', isAdmin);
    console.log('newTask data:', newTask);
    
    if (!newTask.title) {
      console.log('No title provided, returning early');
      return;
    }

    try {
      setCreating(true);
      setError(null);
      
      console.log('About to call dbService.createTask...');
      
      const createdTask = await dbService.createTask({
        title: newTask.title,
        description: newTask.description,
        assignee_id: newTask.assignee_id || undefined,
        priority: newTask.priority,
        exam_code: newTask.exam_code || undefined,
        difficulty: newTask.difficulty,
        due_date: newTask.due_date || undefined,
        tags: newTask.tags.length > 0 ? newTask.tags : undefined
      });

      console.log('Task created successfully:', createdTask);

      // Add to local state
      setColumns(prev => prev.map(col => 
        col.id === 'idea' ? { ...col, tasks: [...col.tasks, createdTask] } : col
      ));

      // Reset form
      setNewTask({
        title: '',
        description: '',
        assignee_id: '',
        priority: 'medium',
        exam_code: '',
        difficulty: 'mixed',
        due_date: '',
        tags: []
      });
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating task:', error);
      setError(error instanceof Error ? error.message : 'Failed to create task');
    } finally {
      setCreating(false);
    }
  };

  const deleteTask = async (taskId: string, columnId: string) => {
    try {
      await dbService.deleteTask(taskId);
      setColumns(prev => prev.map(col => 
        col.id === columnId ? { ...col, tasks: col.tasks.filter(t => t.id !== taskId) } : col
      ));
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const openEditModal = (task: TaskWithProfiles) => {
    setSelectedTask(task);
    setEditTask({
      title: task.title,
      description: task.description || '',
      assignee_id: task.assignee_id || '',
      priority: task.priority,
      exam_code: task.exam_code || '',
      difficulty: task.difficulty,
      due_date: task.due_date || '',
      tags: task.tags || []
    });
    setShowEditModal(true);
  };

  const updateTask = async () => {
    if (!selectedTask || !editTask.title) return;
    
    setError(null);
    
    try {
      setUpdating(true);
      
      const updatedTask = await dbService.updateTask(selectedTask.id, {
        title: editTask.title,
        description: editTask.description,
        assignee_id: editTask.assignee_id || undefined,
        priority: editTask.priority,
        exam_code: editTask.exam_code || undefined,
        difficulty: editTask.difficulty,
        due_date: editTask.due_date || undefined,
        tags: editTask.tags.length > 0 ? editTask.tags : undefined
      });

      // Update local state
      setColumns(prev => prev.map(col => ({
        ...col,
        tasks: col.tasks.map(t => t.id === selectedTask.id ? updatedTask : t)
      })));

      setShowEditModal(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('Error updating task:', error);
      setError(error instanceof Error ? error.message : 'Failed to update task');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-white">Loading task board...</div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Task Management Board</h2>
              <p className="text-zinc-400 text-sm">Manage question creation tasks and assignments</p>
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white font-medium"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Task
          </button>
            )}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 min-h-[600px]">
        {columns.map(column => (
          <div
            key={column.id}
            className="bg-zinc-900 border border-zinc-700 rounded-lg p-4"
            onDragOver={isAdmin ? handleDragOver : undefined}
            onDrop={isAdmin ? (e) => handleDrop(e, column.id) : undefined}
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
                  draggable={isAdmin}
                  onDragStart={() => isAdmin ? handleDragStart(task, column.id) : undefined}
                  onClick={() => isAdmin ? openEditModal(task) : null}
                  className={`bg-zinc-800 border border-zinc-600 rounded-lg p-3 transition-colors ${isAdmin ? 'cursor-pointer hover:bg-zinc-750' : 'cursor-default'}`}
                >
                  {/* Task Header */}
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-white text-sm line-clamp-2 flex-1 pr-2">{task.title}</h4>
                    <div className="flex items-center gap-1 shrink-0">
                      <div className={`w-2 h-2 rounded-full ${priorityColors[task.priority]}`} />
                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTask(task.id, column.id);
                          }}
                          className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-red-400"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Task Details */}
                  <div className="space-y-2 text-xs">
                    {task.exam_code && (
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-400">Exam:</span>
                        <span className="text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded">{task.exam_code}</span>
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
                      <span className="text-white">{task.question_count}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400">Difficulty:</span>
                      <span className="text-yellow-400">{task.difficulty}</span>
                    </div>

                    {task.due_date && (
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-400">Due:</span>
                        <span className="text-orange-400">{task.due_date}</span>
                      </div>
                    )}

                    {/* Tags */}
                    {task.tags && task.tags.length > 0 && (
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
                        {task.assignee ? 
                          ((task.assignee.full_name || task.assignee.email)?.charAt(0).toUpperCase() || '?') : 
                          '?'
                        }
                      </div>
                      <span className="text-zinc-300 text-xs">
                        {task.assignee ? (task.assignee.full_name || task.assignee.email) : 'Unassigned'}
                      </span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowCreateModal(false)} />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl">
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-zinc-700">
              <h3 className="text-lg md:text-xl font-semibold text-white">Create New Task</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-zinc-700 rounded">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 md:p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Assignee</label>
                  <select
                    value={newTask.assignee_id}
                    onChange={e => setNewTask(prev => ({ ...prev, assignee_id: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white"
                  >
                    <option value="">Select assignee...</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </option>
                    ))}
                  </select>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Exam Code</label>
                  <input
                    type="text"
                    value={newTask.exam_code}
                    onChange={e => setNewTask(prev => ({ ...prev, exam_code: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white"
                    placeholder="e.g., AWS-SAA-C03"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={newTask.due_date}
                    onChange={e => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mx-6 mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 p-6 border-t border-zinc-700">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-zinc-600 rounded-lg text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={createTask}
                disabled={!newTask.title || creating}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg text-white flex items-center gap-2"
              >
                {creating && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {creating ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowEditModal(false)} />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl">
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-zinc-700">
              <h3 className="text-lg md:text-xl font-semibold text-white">Edit Task</h3>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-zinc-700 rounded">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 md:p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Task Title*</label>
                  <input
                    type="text"
                    value={editTask.title}
                    onChange={e => setEditTask((prev: any) => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white"
                    placeholder="e.g., AWS Security Questions"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Assignee</label>
                  <select
                    value={editTask.assignee_id}
                    onChange={e => setEditTask((prev: any) => ({ ...prev, assignee_id: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white"
                  >
                    <option value="">Select assignee...</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.full_name || user.email}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Description</label>
                <textarea
                  value={editTask.description}
                  onChange={e => setEditTask((prev: any) => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white"
                  rows={3}
                  placeholder="Task description..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Priority</label>
                  <select
                    value={editTask.priority}
                    onChange={e => setEditTask((prev: any) => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Difficulty</label>
                  <select
                    value={editTask.difficulty}
                    onChange={e => setEditTask((prev: any) => ({ ...prev, difficulty: e.target.value as any }))}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white"
                  >
                    <option value="Mixed">Mixed</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Exam Code</label>
                  <input
                    type="text"
                    value={editTask.exam_code}
                    onChange={e => setEditTask((prev: any) => ({ ...prev, exam_code: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white"
                    placeholder="e.g., AWS-SAA-C03"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={editTask.due_date}
                    onChange={e => setEditTask((prev: any) => ({ ...prev, due_date: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mx-6 mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 p-6 border-t border-zinc-700">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-zinc-600 rounded-lg text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={updateTask}
                disabled={!editTask.title || updating}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-white flex items-center gap-2"
              >
                {updating && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {updating ? 'Updating...' : 'Update Task'}
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
