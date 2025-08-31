'use client';
import React, { useState } from 'react';
import AdminTaskBoard from './AdminTaskBoard';
import UserManager from './UserManager';
import { Kanban, Users, LayoutGrid } from 'lucide-react';

export default function PMI() {
  const [activeSubTab, setActiveSubTab] = useState('kanban');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">PMI - Project Management Interface</h2>
          <p className="text-zinc-400 text-sm">Task management and user administration</p>
        </div>
      </div>

      {/* Sub Navigation */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg">
        <nav className="flex">
          <button
            onClick={() => setActiveSubTab('kanban')}
            className={`flex items-center space-x-2 px-6 py-4 border-b-2 transition-colors ${
              activeSubTab === 'kanban'
                ? 'border-green-500 text-green-500 bg-zinc-800/50'
                : 'border-transparent text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/30'
            }`}
          >
            <Kanban className="h-4 w-4" />
            <span>Kanban Board</span>
          </button>
          <button
            onClick={() => setActiveSubTab('users')}
            className={`flex items-center space-x-2 px-6 py-4 border-b-2 transition-colors ${
              activeSubTab === 'users'
                ? 'border-green-500 text-green-500 bg-zinc-800/50'
                : 'border-transparent text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/30'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>User Management</span>
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="min-h-[600px]">
        {activeSubTab === 'kanban' && <AdminTaskBoard />}
        {activeSubTab === 'users' && <UserManager />}
      </div>
    </div>
  );
}
