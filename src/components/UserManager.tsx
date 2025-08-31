'use client';
import React, { useState } from 'react';
import { User, Plus, Edit3, Trash2, Mail, Calendar, UserCheck, UserX } from 'lucide-react';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Editor' | 'Contributor';
  status: 'Active' | 'Inactive';
  createdAt: string;
  lastLogin?: string;
  avatar?: string;
}

const sampleUsers: AdminUser[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'Admin',
    status: 'Active',
    createdAt: '2024-01-15',
    lastLogin: '2024-01-28'
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'Editor',
    status: 'Active',
    createdAt: '2024-01-20',
    lastLogin: '2024-01-27'
  },
  {
    id: '3',
    name: 'Mike Johnson',
    email: 'mike@example.com',
    role: 'Contributor',
    status: 'Inactive',
    createdAt: '2024-01-10',
    lastLogin: '2024-01-25'
  }
];

export default function UserManager() {
  const [users, setUsers] = useState<AdminUser[]>(sampleUsers);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [newUser, setNewUser] = useState<Partial<AdminUser>>({
    name: '',
    email: '',
    role: 'Contributor',
    status: 'Active'
  });

  const roleColors = {
    Admin: 'bg-red-100 text-red-800 border-red-200',
    Editor: 'bg-blue-100 text-blue-800 border-blue-200',
    Contributor: 'bg-green-100 text-green-800 border-green-200'
  };

  const statusColors = {
    Active: 'bg-green-100 text-green-800 border-green-200',
    Inactive: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const createUser = () => {
    if (!newUser.name || !newUser.email) return;

    const user: AdminUser = {
      id: Date.now().toString(),
      name: newUser.name!,
      email: newUser.email!,
      role: newUser.role!,
      status: newUser.status!,
      createdAt: new Date().toISOString().split('T')[0]
    };

    setUsers(prev => [...prev, user]);
    setNewUser({ name: '', email: '', role: 'Contributor', status: 'Active' });
    setShowCreateModal(false);
  };

  const updateUser = () => {
    if (!editingUser) return;

    setUsers(prev => prev.map(user => 
      user.id === editingUser.id ? editingUser : user
    ));
    setEditingUser(null);
  };

  const deleteUser = (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      setUsers(prev => prev.filter(user => user.id !== userId));
    }
  };

  const toggleUserStatus = (userId: string) => {
    setUsers(prev => prev.map(user => 
      user.id === userId 
        ? { ...user, status: user.status === 'Active' ? 'Inactive' : 'Active' }
        : user
    ));
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">User Management</h2>
          <p className="text-zinc-400 text-sm">Manage admin users and their permissions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white font-medium"
        >
          <Plus className="h-4 w-4" />
          Add User
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-blue-400" />
            <div>
              <div className="font-medium text-white">Total Users</div>
              <div className="text-sm text-zinc-400">{users.length}</div>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <UserCheck className="h-5 w-5 text-green-400" />
            <div>
              <div className="font-medium text-white">Active</div>
              <div className="text-sm text-zinc-400">{users.filter(u => u.status === 'Active').length}</div>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <UserX className="h-5 w-5 text-gray-400" />
            <div>
              <div className="font-medium text-white">Inactive</div>
              <div className="text-sm text-zinc-400">{users.filter(u => u.status === 'Inactive').length}</div>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-red-400" />
            <div>
              <div className="font-medium text-white">Admins</div>
              <div className="text-sm text-zinc-400">{users.filter(u => u.role === 'Admin').length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-700">
          <h3 className="text-lg font-medium text-white">All Users</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Last Login</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-zinc-800/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-xs font-medium text-white">
                        {getInitials(user.name)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{user.name}</div>
                        <div className="text-xs text-zinc-400 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleColors[user.role]}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[user.status]}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-zinc-500" />
                      {user.createdAt}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300">
                    {user.lastLogin || 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="text-blue-400 hover:text-blue-300 p-1 hover:bg-zinc-700 rounded"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleUserStatus(user.id)}
                        className={`p-1 hover:bg-zinc-700 rounded ${user.status === 'Active' ? 'text-yellow-400 hover:text-yellow-300' : 'text-green-400 hover:text-green-300'}`}
                      >
                        {user.status === 'Active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="text-red-400 hover:text-red-300 p-1 hover:bg-zinc-700 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowCreateModal(false)} />
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-zinc-700">
              <h3 className="text-xl font-semibold text-white">Add New User</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-zinc-700 rounded">
                <Plus className="h-5 w-5 rotate-45" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Name*</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={e => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white"
                  placeholder="e.g., John Doe"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Email*</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={e => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white"
                  placeholder="e.g., john@example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Role</label>
                  <select
                    value={newUser.role}
                    onChange={e => setNewUser(prev => ({ ...prev, role: e.target.value as AdminUser['role'] }))}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white"
                  >
                    <option value="Contributor">Contributor</option>
                    <option value="Editor">Editor</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Status</label>
                  <select
                    value={newUser.status}
                    onChange={e => setNewUser(prev => ({ ...prev, status: e.target.value as AdminUser['status'] }))}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
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
                onClick={createUser}
                disabled={!newUser.name || !newUser.email}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg text-white"
              >
                Add User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setEditingUser(null)} />
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-zinc-700">
              <h3 className="text-xl font-semibold text-white">Edit User</h3>
              <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-zinc-700 rounded">
                <Plus className="h-5 w-5 rotate-45" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Name*</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={e => setEditingUser(prev => ({ ...prev!, name: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Email*</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={e => setEditingUser(prev => ({ ...prev!, email: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Role</label>
                  <select
                    value={editingUser.role}
                    onChange={e => setEditingUser(prev => ({ ...prev!, role: e.target.value as AdminUser['role'] }))}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white"
                  >
                    <option value="Contributor">Contributor</option>
                    <option value="Editor">Editor</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Status</label>
                  <select
                    value={editingUser.status}
                    onChange={e => setEditingUser(prev => ({ ...prev!, status: e.target.value as AdminUser['status'] }))}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-zinc-700">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 border border-zinc-600 rounded-lg text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={updateUser}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white"
              >
                Update User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
