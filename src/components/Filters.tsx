import React from 'react';
import { Search } from 'lucide-react';

interface FiltersProps {
  examCodes: string[];
  categories: string[];
  selectedExamCode: string;
  selectedCategory: string;
  searchQuery: string;
  onExamCodeChange: (examCode: string) => void;
  onCategoryChange: (category: string) => void;
  onSearchChange: (query: string) => void;
}

export default function Filters({
  examCodes,
  categories,
  selectedExamCode,
  selectedCategory,
  searchQuery,
  onExamCodeChange,
  onCategoryChange,
  onSearchChange
}: FiltersProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 mb-6">
      <h2 className="text-lg font-medium text-white mb-4">Filters</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Exam Code Filter */}
        <div>
          <label htmlFor="exam-code-filter" className="block text-sm font-medium text-zinc-300 mb-2">
            Exam Code
          </label>
          <select
            id="exam-code-filter"
            value={selectedExamCode}
            onChange={(e) => onExamCodeChange(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-white text-sm focus:outline-none focus:border-green-500"
          >
            <option value="">All Exam Codes</option>
            {examCodes.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <label htmlFor="category-filter" className="block text-sm font-medium text-zinc-300 mb-2">
            Category
          </label>
          <select
            id="category-filter"
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-white text-sm focus:outline-none focus:border-green-500"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Search Filter */}
        <div>
          <label htmlFor="search-filter" className="block text-sm font-medium text-zinc-300 mb-2">
            Search Questions
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-zinc-400" />
            </div>
            <input
              id="search-filter"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by question content..."
              className="w-full pl-10 pr-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-white text-sm focus:outline-none focus:border-green-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
