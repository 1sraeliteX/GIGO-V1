import { useState, useEffect } from 'react';

const STORAGE_KEY = 'journal_quote';

export default function QuoteSection() {
  const [quote, setQuote] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setQuote(saved);
  }, []);

  function handleEdit() {
    setDraft(quote);
    setEditing(true);
  }

  function handleSave() {
    const trimmed = draft.trim();
    setQuote(trimmed);
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    setEditing(false);
  }

  function handleCancel() {
    setEditing(false);
  }

  function handleClear() {
    setQuote('');
    localStorage.removeItem(STORAGE_KEY);
    setEditing(false);
  }

  return (
    <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-4 sm:p-5 mb-4">
      {editing ? (
        <div className="space-y-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Enter your motivational quote..."
            rows={3}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 resize-none"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-[#fff] rounded-lg transition-colors"
            >
              Save
            </button>
              <button
                onClick={handleCancel}
                className="px-4 py-1.5 text-sm font-medium text-neutral-500 hover:text-white transition-colors"
              >
                Cancel
              </button>
              {quote && (
                <button
                  onClick={handleClear}
                  className="ml-auto px-4 py-1.5 text-sm font-medium text-red-600 hover:text-red-500 transition-colors"
                >
                  Remove
                </button>
              )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0 text-center">
            {quote ? (
              <p className="text-sm sm:text-base text-white italic leading-relaxed">&ldquo;{quote}&rdquo;</p>
            ) : (
              <p className="text-sm text-neutral-500 italic">Add a daily reminder&hellip;</p>
            )}
          </div>
          <button
            onClick={handleEdit}
            className="shrink-0 text-neutral-500 hover:text-emerald-400 transition-colors p-1"
            title={quote ? 'Edit quote' : 'Add quote'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
