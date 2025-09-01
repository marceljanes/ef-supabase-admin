'use client';
import React, { useState, useEffect } from 'react';
import { User, Plus, Edit3, Trash2, Mail, Calendar, UserCheck, UserX } from 'lucide-react';
import { dbService } from '@/lib/supabase';
import { UserProfile } from '@/types/database';

// Map UserProfile to display format
interface DisplayUser {
  id: string;
  name: string;
  email: string;
  full_name?: string;
  role: 'User' | 'Admin' | 'Superadmin';
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
}

export default function UserManager() {
  const [users, setUsers] = useState<DisplayUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<DisplayUser | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  const roleColors = {
    User: 'bg-gray-100 text-gray-800 border-gray-200',
    Admin: 'bg-blue-100 text-blue-800 border-blue-200',
    Superadmin: 'bg-red-100 text-red-800 border-red-200'
  };

  const statusColors = {
    Pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    Approved: 'bg-green-100 text-green-800 border-green-200',
    Rejected: 'bg-red-100 text-red-800 border-red-200'
  };

  // Map UserProfile to DisplayUser
  const mapUserProfileToDisplay = (profile: UserProfile): DisplayUser => ({
    id: profile.id,
    name: profile.full_name || profile.email.split('@')[0] || 'Unknown User',
    email: profile.email,
    full_name: profile.full_name || profile.email,
    role: profile.role.charAt(0).toUpperCase() + profile.role.slice(1) as DisplayUser['role'],
    status: profile.status.charAt(0).toUpperCase() + profile.status.slice(1) as DisplayUser['status'],
    createdAt: new Date(profile.created_at).toLocaleDateString(),
    approvedAt: profile.approved_at ? new Date(profile.approved_at).toLocaleDateString() : undefined,
    approvedBy: profile.approved_by || undefined,
    rejectionReason: profile.rejection_reason || undefined
  });

  // Fetch users and current user on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [profiles, currentUserProfile] = await Promise.all([
          dbService.getUsers(),
          dbService.getCurrentUserProfile()
        ]);
        
        const displayUsers = profiles.map(mapUserProfileToDisplay);
        setUsers(displayUsers);
        setCurrentUser(currentUserProfile);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const approveUser = async (userId: string) => {
    if (!currentUser) return;
    
    try {
      await dbService.approveUser(userId, currentUser.id);
      
      // Refresh users list
      const profiles = await dbService.getUsers();
      const displayUsers = profiles.map(mapUserProfileToDisplay);
      setUsers(displayUsers);
    } catch (error) {
      console.error('Error approving user:', error);
      alert('Failed to approve user');
    }
  };

  const rejectUser = async (userId: string) => {
    if (!currentUser) return;
    
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;
    
    try {
      await dbService.rejectUser(userId, currentUser.id, reason);
      
      // Refresh users list
      const profiles = await dbService.getUsers();
      const displayUsers = profiles.map(mapUserProfileToDisplay);
      setUsers(displayUsers);
    } catch (error) {
      console.error('Error rejecting user:', error);
      alert('Failed to reject user');
    }
  };

  const updateUser = async () => {
    if (!editingUser) return;

    try {
      // Convert DisplayUser back to UserProfile format for update
      const updatePayload: Partial<UserProfile> = {
        role: editingUser.role.toLowerCase() as UserProfile['role'],
        full_name: editingUser.full_name
      };

      await dbService.updateUser(editingUser.id, updatePayload);
      
      setUsers(prev => prev.map(user => 
        user.id === editingUser.id ? editingUser : user
      ));
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user');
    }
  };

  const deleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await dbService.deleteUser(userId);
        setUsers(prev => prev.filter(user => user.id !== userId));
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Failed to delete user');
      }
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-white">Loading users...</div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">User Management</h2>
              <p className="text-zinc-400 text-sm">Manage registered users and their permissions</p>
            </div>
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
              <div className="font-medium text-white">Approved</div>
              <div className="text-sm text-zinc-400">{users.filter(u => u.status === 'Approved').length}</div>
            </div>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <UserX className="h-5 w-5 text-yellow-400" />
            <div>
              <div className="font-medium text-white">Pending</div>
              <div className="text-sm text-zinc-400">{users.filter(u => u.status === 'Pending').length}</div>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Approved At</th>
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
                        <div className="text-sm font-medium text-white">{user.full_name || user.name}</div>
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
                    {user.approvedAt || 'Not approved'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      {user.status === 'Pending' && currentUser?.role === 'admin' && (
                        <>
                          <button
                            onClick={() => approveUser(user.id)}
                            className="p-1 hover:bg-zinc-700 rounded text-green-400 hover:text-green-300"
                            title="Approve user"
                          >
                            <UserCheck className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => rejectUser(user.id)}
                            className="p-1 hover:bg-zinc-700 rounded text-red-400 hover:text-red-300"
                            title="Reject user"
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setEditingUser(user)}
                        className="p-1 hover:bg-zinc-700 rounded text-blue-400 hover:text-blue-300"
                        title="Edit user"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="p-1 hover:bg-zinc-700 rounded text-red-400 hover:text-red-300"
                        title="Delete user"
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
                <label className="block text-sm font-medium text-zinc-300 mb-2">Full Name</label>
                <input
                  type="text"
                  value={editingUser.full_name || ''}
                  onChange={e => setEditingUser(prev => ({ ...prev!, full_name: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Email</label>
                <input
                  type="email"
                  value={editingUser.email}
                  disabled
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-zinc-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Role</label>
                <select
                  value={editingUser.role}
                  onChange={e => setEditingUser(prev => ({ ...prev!, role: e.target.value as DisplayUser['role'] }))}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white"
                >
                  <option value="User">User</option>
                  <option value="Admin">Admin</option>
                  <option value="Superadmin">Superadmin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Current Status</label>
                <div className={`px-3 py-2 rounded border text-sm ${statusColors[editingUser.status]}`}>
                  {editingUser.status}
                </div>
              </div>

              {editingUser.rejectionReason && (
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Rejection Reason</label>
                  <div className="px-3 py-2 bg-zinc-800 border border-zinc-600 rounded text-zinc-400 text-sm">
                    {editingUser.rejectionReason}
                  </div>
                </div>
              )}
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
        </>
      )}
    </div>
  );
}
