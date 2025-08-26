import React, { useState } from 'react';
import { Question } from '@/types/database';
import { Save, X } from 'lucide-react';

interface QuestionEditorProps {
  question: Question;
  examCategories: string[];
  onSave: (question: Question) => void;
  onClose: () => void;
  onLoadCategories: (examCode: string) => void;
  saving: boolean;
}

export default function QuestionEditor({
  question,
  examCategories,
  onSave,
  onClose,
  onLoadCategories,
  saving
}: QuestionEditorProps) {
  const [editingQuestion, setEditingQuestion] = useState<Question>({...question});

  const updateEditingQuestion = (field: string, value: any) => {
    setEditingQuestion({
      ...editingQuestion,
      [field]: value
    });
  };

  const updateAnswer = (answerIndex: number, field: string, value: any) => {
    if (!editingQuestion.answers) return;
    const updatedAnswers = [...editingQuestion.answers];
    updatedAnswers[answerIndex] = {
      ...updatedAnswers[answerIndex],
      [field]: value
    };
    setEditingQuestion({
      ...editingQuestion,
      answers: updatedAnswers
    });
  };

  const addAnswer = () => {
    const newAnswers = editingQuestion.answers || [];
    setEditingQuestion({
      ...editingQuestion,
      answers: [...newAnswers, { text: '', isCorrect: false }]
    });
  };

  const removeAnswer = (answerIndex: number) => {
    if (!editingQuestion.answers) return;
    const updatedAnswers = editingQuestion.answers.filter((_, index) => index !== answerIndex);
    setEditingQuestion({
      ...editingQuestion,
      answers: updatedAnswers
    });
  };

  const handleSave = () => {
    onSave(editingQuestion);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-700 p-4 flex justify-between items-center">
          <h2 className="text-lg font-medium text-white">Edit Question</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 disabled:bg-zinc-600 text-white text-sm px-4 py-2 rounded-md transition-colors flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save'}</span>
            </button>
            <button
              onClick={onClose}
              className="bg-zinc-700 hover:bg-zinc-600 text-white text-sm px-4 py-2 rounded-md transition-colors flex items-center space-x-2"
            >
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Basic Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Exam Code</label>
              <input
                type="text"
                value={editingQuestion.exam_code || ''}
                onChange={(e) => {
                  const newExamCode = e.target.value;
                  updateEditingQuestion('exam_code', newExamCode);
                  // Reset category when exam code changes
                  updateEditingQuestion('category', '');
                  // Load new categories for the new exam code
                  if (newExamCode.trim()) {
                    onLoadCategories(newExamCode);
                  }
                }}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-white text-sm focus:outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Category</label>
              <select
                value={editingQuestion.category || ''}
                onChange={(e) => updateEditingQuestion('category', e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-white text-sm focus:outline-none focus:border-green-500"
              >
                <option value="">Select Category</option>
                {examCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {examCategories.length === 0 && editingQuestion.exam_code && (
                <p className="text-xs text-zinc-500 mt-1">
                  No categories found for exam code "{editingQuestion.exam_code}"
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Level</label>
              <select
                value={editingQuestion.level || ''}
                onChange={(e) => updateEditingQuestion('level', e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-white text-sm focus:outline-none focus:border-green-500"
              >
                <option value="">Select Level</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Status</label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={!editingQuestion.inactive}
                    onChange={(e) => updateEditingQuestion('inactive', !e.target.checked)}
                    className="rounded bg-zinc-800 border-zinc-600 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-zinc-300">Active</span>
                </label>
              </div>
            </div>
          </div>

          {/* Question Text */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Question</label>
            <textarea
              value={editingQuestion.question || ''}
              onChange={(e) => updateEditingQuestion('question', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-white text-sm focus:outline-none focus:border-green-500"
            />
          </div>

          {/* Answers */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-zinc-300">Answers</label>
              <button
                onClick={addAnswer}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded-md transition-colors"
              >
                Add Answer
              </button>
            </div>
            <div className="space-y-3">
              {(editingQuestion.answers || []).map((answer, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-zinc-800 rounded-md">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={answer.isCorrect || false}
                      onChange={(e) => updateAnswer(index, 'isCorrect', e.target.checked)}
                      className="rounded bg-zinc-700 border-zinc-600 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-xs text-zinc-400">Correct</span>
                  </div>
                  <textarea
                    value={answer.text || ''}
                    onChange={(e) => updateAnswer(index, 'text', e.target.value)}
                    rows={2}
                    placeholder="Answer text..."
                    className="flex-1 px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md text-white text-sm focus:outline-none focus:border-green-500"
                  />
                  <button
                    onClick={() => removeAnswer(index)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-zinc-700 rounded transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Explanation */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Explanation</label>
            <textarea
              value={editingQuestion.explanation || ''}
              onChange={(e) => updateEditingQuestion('explanation', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-white text-sm focus:outline-none focus:border-green-500"
            />
          </div>

          {/* JSON Data */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">JSON Data (Read-only)</label>
            <div className="bg-zinc-800 border border-zinc-600 rounded-md p-4">
              <pre className="text-xs text-zinc-300 overflow-x-auto">
                {JSON.stringify(editingQuestion, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
