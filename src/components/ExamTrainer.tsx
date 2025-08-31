"use client";
import React, { useState } from 'react';

interface ExampleQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const SAMPLE_QUESTIONS: ExampleQuestion[] = [
  {
    id: 1,
    question: 'Which AWS service is best suited for storing large amounts of unstructured object data?',
    options: ['Amazon RDS', 'Amazon S3', 'Amazon EBS', 'Amazon ElastiCache'],
    correctIndex: 1,
    explanation: 'Amazon S3 is an object storage service designed for large-scale unstructured data.'
  },
  {
    id: 2,
    question: 'In networking, what does CIDR stand for?',
    options: ['Common Internet Domain Routing', 'Classless Inter-Domain Routing', 'Central IP Distribution Route', 'Classful Integrated Domain Routing'],
    correctIndex: 1,
    explanation: 'CIDR = Classless Inter-Domain Routing.'
  },
  {
    id: 3,
    question: 'Which HTTP status code indicates a resource was not found?',
    options: ['200', '301', '404', '500'],
    correctIndex: 2,
    explanation: '404 Not Found is returned when the server cannot find the requested resource.'
  },
  {
    id: 4,
    question: 'What is the primary purpose of an index in a relational database?',
    options: ['Increase storage usage', 'Speed up data retrieval', 'Enforce foreign keys', 'Normalize data'],
    correctIndex: 1,
    explanation: 'Indexes speed up read (query) performance by allowing faster lookups.'
  },
  {
    id: 5,
    question: 'Which JavaScript method converts a JSON string into an object?',
    options: ['JSON.parse()', 'JSON.stringify()', 'Object.assign()', 'JSON.toObject()'],
    correctIndex: 0,
    explanation: 'JSON.parse() converts a JSON string into a JavaScript object.'
  },
  {
    id: 6,
    question: 'Which SQL clause is used to filter aggregated results?',
    options: ['WHERE', 'GROUP BY', 'HAVING', 'ORDER BY'],
    correctIndex: 2,
    explanation: 'HAVING filters groups created by GROUP BY.'
  },
  {
    id: 7,
    question: 'What does the term "idempotent" mean in the context of HTTP methods?',
    options: ['It cannot be cached', 'It can be safely called multiple times producing the same result', 'It always modifies server state', 'It guarantees a 2xx response'],
    correctIndex: 1,
    explanation: 'Idempotent methods (e.g., GET, PUT, DELETE) produce the same effect no matter how many times they are executed.'
  },
  {
    id: 8,
    question: 'Which data structure uses FIFO (First In, First Out)?',
    options: ['Stack', 'Tree', 'Queue', 'Graph'],
    correctIndex: 2,
    explanation: 'A queue processes elements in the order they arrive (FIFO).'
  },
  {
    id: 9,
    question: 'Docker images are composed of multiple:',
    options: ['Branches', 'Commits', 'Layers', 'Clusters'],
    correctIndex: 2,
    explanation: 'Images are built from immutable layered filesystem snapshots.'
  },
  {
    id: 10,
    question: 'In Git, which command creates a new branch and switches to it?',
    options: ['git switch -c <name>', 'git commit -b <name>', 'git checkout -m <name>', 'git branch -u <name>'],
    correctIndex: 0,
    explanation: 'git switch -c <branch> (or older: git checkout -b <branch>) creates and checks out a branch.'
  }
];

interface QuestionCardProps {
  q: ExampleQuestion;
  onSubmit: (id: number, selected: number) => void;
  submitted: boolean;
  selectedIndex: number | null;
}

const QuestionCard: React.FC<QuestionCardProps & { theme: 'dark'|'light' }> = ({ q, onSubmit, submitted, selectedIndex, theme }) => {
  const light = theme === 'light';
  return (
    <div className={`relative border rounded-lg p-4 shadow-sm transition-colors ${light ? 'bg-white/70 border-zinc-300' : 'bg-zinc-800/80 border-zinc-700'} backdrop-blur-sm`}>
      {light && <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-white/60" />}
      <h3 className={`font-medium mb-3 ${light ? 'text-zinc-800' : 'text-zinc-100'}`}>{q.id}. {q.question}</h3>
      <div className="space-y-2">
        {q.options.map((opt, idx) => {
          const isChosen = selectedIndex === idx;
          const isCorrect = submitted && idx === q.correctIndex;
            const isWrong = submitted && isChosen && idx !== q.correctIndex;
          return (
            <button
              key={idx}
              disabled={submitted}
              onClick={() => onSubmit(q.id, idx)}
              className={`w-full text-left px-3 py-2 rounded border text-sm transition-colors select-none
                ${submitted ? '' : light ? 'hover:border-green-500 hover:bg-green-100' : 'hover:border-green-500 hover:bg-green-50 dark:hover:bg-zinc-700'}
                ${isChosen && !submitted ? (light ? 'border-green-500 bg-green-100' : 'border-green-500 bg-green-50 dark:bg-zinc-700') : ''}
                ${isCorrect ? (light ? 'border-green-600 bg-green-200 text-green-800' : 'border-green-600 bg-green-900/30 text-green-300') : ''}
                ${isWrong ? (light ? 'border-red-500 bg-red-100 text-red-700' : 'border-red-500 bg-red-900/30 text-red-300') : ''}
                ${light ? 'border-zinc-300 bg-white text-zinc-800' : 'border-zinc-600 bg-zinc-900 text-zinc-200'}`}
            >
              <span className="inline-flex items-center gap-2">
                <span className={`inline-block h-2 w-2 rounded-full ${isCorrect ? 'bg-green-500' : isWrong ? 'bg-red-500' : isChosen ? 'bg-green-400' : 'bg-zinc-400'}`} />
                {opt}
              </span>
            </button>
          );
        })}
      </div>
      {submitted && (
        <div className="mt-4 text-sm">
          <p className={`font-medium ${light ? 'text-zinc-800' : 'text-zinc-100'}`}>Explanation:</p>
          <p className={`${light ? 'text-zinc-700' : 'text-zinc-300'} mt-1`}>{q.explanation}</p>
        </div>
      )}
    </div>
  );
};

interface ExamTrainerProps { theme: 'dark' | 'light'; }

const ExamTrainer: React.FC<ExamTrainerProps> = ({ theme }) => {
  const [responses, setResponses] = useState<Record<number, { selected: number; correct: boolean }>>({});
  const handleSubmit = (id: number, selected: number) => {
    if (responses[id]) return;
    const q = SAMPLE_QUESTIONS.find(q => q.id === id)!;
    const correct = q.correctIndex === selected;
    setResponses(prev => ({ ...prev, [id]: { selected, correct } }));
  };
  const totalAnswered = Object.keys(responses).length;
  const totalCorrect = Object.values(responses).filter(r => r.correct).length;
  const light = theme === 'light';
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className={`text-sm ${light ? 'text-zinc-600' : 'text-zinc-400'}`}>Answer each question individually. Feedback appears immediately.</p>
          <p className={`text-sm mt-1 ${light ? 'text-zinc-700' : 'text-zinc-300'}`}>Progress: {totalAnswered} / {SAMPLE_QUESTIONS.length} answered | Correct: {totalCorrect}</p>
        </div>
        {totalAnswered === SAMPLE_QUESTIONS.length && (
          <div className="px-3 py-1 rounded bg-green-600 text-white text-sm">Completed</div>
        )}
      </div>
      {SAMPLE_QUESTIONS.map(q => {
        const submission = responses[q.id];
        return (
          <div key={q.id} className="space-y-2">
            <QuestionCard
              q={q}
              onSubmit={handleSubmit}
              submitted={!!submission}
              selectedIndex={submission?.selected ?? null}
              theme={theme}
            />
            {!submission && (
              <div className="flex justify-end">
                <p className={`text-xs ${light ? 'text-zinc-500' : 'text-zinc-400'}`}>Select an answer above to submit.</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ExamTrainer;
