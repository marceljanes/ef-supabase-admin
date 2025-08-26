import React from 'react';
import { Question } from '@/types/database';
import { ChevronLeft, ChevronRight, Edit, Trash } from 'lucide-react';

interface QuestionsListProps {
  questions: Question[];
  filteredQuestions: Question[];
  currentPage: number;
  questionsPerPage: number;
  onEdit: (question: Question) => void;
  onDelete: (id: string) => void;
  onPageChange: (page: number) => void;
  loading: boolean;
  deleting: { [key: string]: boolean };
}

// 10 minute recent window (same as update screen)
const RECENT_MS = 10 * 60 * 1000;
const isRecent = (ts?: string) => ts ? (Date.now() - new Date(ts).getTime()) < RECENT_MS : false;

export default function QuestionsList({
  questions,
  filteredQuestions,
  currentPage,
  questionsPerPage,
  onEdit,
  onDelete,
  onPageChange,
  loading,
  deleting
}: QuestionsListProps) {
  // Calculate pagination
  const indexOfLastQuestion = currentPage * questionsPerPage;
  const indexOfFirstQuestion = indexOfLastQuestion - questionsPerPage;
  const currentQuestions = filteredQuestions.slice(indexOfFirstQuestion, indexOfLastQuestion);
  const totalPages = Math.ceil(filteredQuestions.length / questionsPerPage);

  const pageNumbers = [];
  const maxVisiblePages = 5;

  // Logic to display limited page numbers with ellipses
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden">
      {/* Questions List Header */}
      <div className="border-b border-zinc-700 p-4 flex justify-between items-center">
        <h2 className="text-lg font-medium text-white">Questions</h2>
        <div className="text-sm text-zinc-400">
          {filteredQuestions.length} of {questions.length} questions
        </div>
      </div>

      {/* Questions Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-700">
          <thead className="bg-zinc-800">
            <tr>
              <th className="px-2 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider w-2"></th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                ID
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Exam Code
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Category
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Question
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Level
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-700">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-zinc-400">
                  Loading questions...
                </td>
              </tr>
            ) : currentQuestions.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-zinc-400">
                  No questions match your filters.
                </td>
              </tr>
            ) : (
              currentQuestions.map((question) => {
                const recent = isRecent(question.updated_at);
                return (
                <tr
                  key={question.id}
                  className={`group hover:bg-zinc-800 cursor-pointer transition-colors ${question.inactive ? 'opacity-60' : ''}`}
                  onClick={() => onEdit(question)}
                >
                  <td className={`px-2 py-4 relative ${recent ? 'border-l-2 border-l-green-500' : ''}`}>
                    {recent && <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-green-400" />}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-zinc-300">{question.id?.substring(0, 8)}&hellip;</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-zinc-300">{question.exam_code}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-zinc-300">{question.category}</td>
                  <td className="px-4 py-4 text-sm text-zinc-300 max-w-sm truncate">
                    <span className="inline-flex items-center gap-2">
                      {question.question}
                      {recent && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/30">Updated</span>}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-block rounded-full px-2 py-1 text-xs ${
                      question.level === 'easy' ? 'bg-green-900 text-green-300' :
                      question.level === 'medium' ? 'bg-yellow-900 text-yellow-300' :
                      question.level === 'hard' ? 'bg-red-900 text-red-300' :
                      'bg-zinc-700 text-zinc-300'
                    }`}>
                      {question.level || 'unknown'}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-block rounded-full px-2 py-1 text-xs ${
                      !question.inactive ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                    }`}>
                      {!question.inactive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(question);
                      }}
                      className="text-zinc-400 hover:text-zinc-200 p-1 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (question.id) onDelete(question.id);
                      }}
                      disabled={question.id ? deleting[question.id] : false}
                      className="text-zinc-400 hover:text-red-400 p-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {question.id && deleting[question.id] ? (
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent"></span>
                      ) : (
                        <Trash className="h-4 w-4" />
                      )}
                    </button>
                  </td>
                </tr>
              );})
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && filteredQuestions.length > 0 && (
        <div className="border-t border-zinc-700 p-4 flex justify-between items-center">
          <div className="text-sm text-zinc-400">
            Showing {indexOfFirstQuestion + 1} to {Math.min(indexOfLastQuestion, filteredQuestions.length)} of {filteredQuestions.length} entries
          </div>
          <div className="flex space-x-1">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-2 py-1 rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 disabled:opacity-50 disabled:hover:bg-zinc-800 disabled:hover:text-zinc-400"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            {startPage > 1 && (
              <>
                <button
                  onClick={() => onPageChange(1)}
                  className={`px-3 py-1 rounded text-sm ${
                    currentPage === 1 
                      ? 'bg-green-600 text-white' 
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  1
                </button>
                {startPage > 2 && (
                  <span className="px-2 py-1 text-zinc-500">...</span>
                )}
              </>
            )}
            
            {pageNumbers.map(number => (
              <button
                key={number}
                onClick={() => onPageChange(number)}
                className={`px-3 py-1 rounded text-sm ${
                  currentPage === number 
                    ? 'bg-green-600 text-white' 
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                }`}
              >
                {number}
              </button>
            ))}
            
            {endPage < totalPages && (
              <>
                {endPage < totalPages - 1 && (
                  <span className="px-2 py-1 text-zinc-500">...</span>
                )}
                <button
                  onClick={() => onPageChange(totalPages)}
                  className={`px-3 py-1 rounded text-sm ${
                    currentPage === totalPages 
                      ? 'bg-green-600 text-white' 
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  {totalPages}
                </button>
              </>
            )}
            
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-2 py-1 rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 disabled:opacity-50 disabled:hover:bg-zinc-800 disabled:hover:text-zinc-400"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
