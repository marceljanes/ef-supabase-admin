'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { dbService } from '@/lib/supabase';
import { UserProfile } from '@/types/database';
import { User, Check, X, Shield, Trash2 } from 'lucide-react';

export const UserApprovalManager: React.FC = () => {
  const { user, userProfile, isApproved } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Check if current user is admin
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';

  useEffect(() => {
    if (isApproved && isAdmin) {
      loadUsers();
    }
  }, [isApproved, isAdmin]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const profiles = await dbService.getUserProfiles();
      setUsers(profiles);
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (userId: string, approve: boolean) => {
    if (!user) return;
    
    try {
      setActionLoading(userId);
      setError('');
      
      if (approve) {
        await dbService.approveUser(userId, user.id);
      } else {
        await dbService.revokeApproval(userId);
      }
      
      await loadUsers(); // Reload the list
    } catch (err) {
      console.error('Error updating approval:', err);
      setError(`Failed to ${approve ? 'approve' : 'revoke'} user`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'user' | 'admin' | 'super_admin') => {
    try {
      setActionLoading(userId);
      setError('');
      
      await dbService.updateUserRole(userId, newRole);
      await loadUsers(); // Reload the list
    } catch (err) {
      console.error('Error updating role:', err);
      setError('Failed to update user role');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(userId);
      setError('');
      
      await dbService.deleteUserProfile(userId);
      await loadUsers(); // Reload the list
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'text-red-600 bg-red-100';
      case 'admin': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!isApproved || !isAdmin) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-500">
          <Shield className="mx-auto h-12 w-12 mb-3" />
          <p>Admin access required to manage user approvals.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">User Management</h2>
        <p className="text-gray-600">Approve, manage, or revoke user access to the application.</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Approved
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((profile) => (
                <tr key={profile.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-500" />
                        </div>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {profile.email}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {profile.id.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      profile.is_approved 
                        ? 'text-green-800 bg-green-100' 
                        : 'text-yellow-800 bg-yellow-100'
                    }`}>
                      {profile.is_approved ? 'Approved' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={profile.role}
                      onChange={(e) => handleRoleChange(profile.id, e.target.value as any)}
                      disabled={actionLoading === profile.id}
                      className={`text-xs px-2 py-1 rounded-full border-0 ${getRoleColor(profile.role)}`}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(profile.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {profile.approved_at ? formatDate(profile.approved_at) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {profile.is_approved ? (
                        <button
                          onClick={() => handleApproval(profile.id, false)}
                          disabled={actionLoading === profile.id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          title="Revoke approval"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleApproval(profile.id, true)}
                          disabled={actionLoading === profile.id}
                          className="text-green-600 hover:text-green-900 disabled:opacity-50"
                          title="Approve user"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteUser(profile.id)}
                        disabled={actionLoading === profile.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        title="Delete user"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-sm font-medium text-blue-900 mb-2">User Approval System</h3>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• New users must be approved by an admin before accessing the application</p>
          <p>• Users will see a "pending approval" message until approved</p>
          <p>• Only admins and super admins can manage user approvals</p>
          <p>• Revoking approval will immediately block user access</p>
        </div>
      </div>
    </div>
  );
};
