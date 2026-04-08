import { useState, useEffect } from 'react';
import { getAllLanguageWords, updateLanguageWord, createLanguageWord, deleteLanguageWord, LanguageWordAdmin } from '@/api/admin';
import Button from '@/components/common/Button';
import { useNavigate } from 'react-router-dom';
import { useAdminGuard } from '@/hooks/useAdminGuard';

const LanguageMaintenancePage = () => {
  const navigate = useNavigate();
  const isAdmin = useAdminGuard();
  const [words, setWords] = useState<LanguageWordAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingWord, setEditingWord] = useState<LanguageWordAdmin | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterLanguage, setFilterLanguage] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [jsonInput, setJsonInput] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    if (isAdmin === true) {
      loadWords();
    }
  }, [isAdmin]);

  const loadWords = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllLanguageWords();
      setWords(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load language words');
      console.error('Failed to load language words:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditWord = (word: LanguageWordAdmin) => {
    setEditingWord({ ...word });
  };

  const handleSaveWord = async () => {
    if (!editingWord) return;

    try {
      setSaving(true);
      const updatedWord = await updateLanguageWord({
        wordId: editingWord.wordId,
        imageUrl: editingWord.imageUrl,
        distractorImages: editingWord.distractorImages,
        translations: editingWord.translations
      });

      // Update the word in the list
      setWords(words.map(w => w.wordId === updatedWord.wordId ? updatedWord : w));
      setEditingWord(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update word');
      console.error('Failed to update word:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingWord(null);
  };

  const handleJsonImport = async () => {
    if (!jsonInput.trim()) return;

    try {
      setImporting(true);
      setImportResult(null);
      setError(null);

      const data = JSON.parse(jsonInput);
      const words = data.words || data;
      const wordArray = Array.isArray(words) ? words : [words];

      if (wordArray.length === 0) {
        setError('No words found in JSON');
        return;
      }

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const word of wordArray) {
        try {
          await createLanguageWord({
            category: word.category,
            difficulty: word.difficulty,
            languageCode: word.languageCode || 'multi',
            translations: word.translations,
            imageUrl: word.imageUrl,
            distractorImages: word.distractorImages || [],
          });
          success++;
        } catch (err: any) {
          failed++;
          const enWord = word.translations?.en?.word || 'unknown';
          errors.push(`${enWord}: ${err.message}`);
        }
      }

      setImportResult({ success, failed, errors });
      if (success > 0) {
        await loadWords();
        setJsonInput('');
      }
    } catch (err: any) {
      setError(`Invalid JSON: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteWord = async (wordId: string, wordLabel: string) => {
    if (!window.confirm(`Delete "${wordLabel}"? This cannot be undone.`)) return;

    try {
      setError(null);
      await deleteLanguageWord(wordId);
      setWords(words.filter(w => w.wordId !== wordId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete word');
    }
  };

  const handleImageUrlChange = (url: string) => {
    if (editingWord) {
      setEditingWord({ ...editingWord, imageUrl: url });
    }
  };

  const handleDistractorImageChange = (index: number, url: string) => {
    if (editingWord) {
      const newDistractors = [...editingWord.distractorImages];
      newDistractors[index] = url;
      setEditingWord({ ...editingWord, distractorImages: newDistractors });
    }
  };

  const handleTranslationChange = (
    language: string, 
    field: 'word' | 'pronunciation', 
    value: string
  ) => {
    if (editingWord) {
      const newTranslations = { ...editingWord.translations } as any;
      if (!newTranslations[language]) {
        newTranslations[language] = { word: '', pronunciation: '' };
      }
      newTranslations[language][field] = value;
      setEditingWord({ ...editingWord, translations: newTranslations });
    }
  };

  // Filter and search words
  const filteredWords = words.filter(word => {
    const matchesCategory = !filterCategory || word.category === filterCategory;
    const matchesLanguage = !filterLanguage || Object.keys(word.translations).includes(filterLanguage);
    const matchesSearch = !searchTerm || 
      Object.values(word.translations).some(t => 
        t?.word.toLowerCase().includes(searchTerm.toLowerCase())
      ) ||
      word.wordId.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCategory && matchesLanguage && matchesSearch;
  });

  // Get unique categories and languages
  const categories = [...new Set(words.map(w => w.category))].sort();
  const languages = [...new Set(words.flatMap(w => Object.keys(w.translations)))].sort();

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">You don't have permission to access this page.</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading language data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <div className="flex gap-2">
            <Button onClick={loadWords}>Retry</Button>
            <Button variant="secondary" onClick={() => window.history.back()}>Go Back</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Language Data Maintenance</h1>
              <p className="text-gray-600">Review and modify language learning content</p>
            </div>
            <Button variant="secondary" onClick={() => window.history.back()}>
              ← Back to Admin
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search words or IDs..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-blue"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-blue"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
              <select
                value={filterLanguage}
                onChange={(e) => setFilterLanguage(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-blue"
              >
                <option value="">All Languages</option>
                {languages.map(lang => (
                  <option key={lang} value={lang}>{lang.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={loadWords} disabled={loading} className="w-full">
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredWords.length} of {words.length} words
          </div>
        </div>

        {/* JSON Import Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">📥 Import Words from JSON</h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setShowImport(!showImport); setImportResult(null); }}
            >
              {showImport ? 'Hide' : 'Show'}
            </Button>
          </div>

          {showImport && (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Paste your JSON with a <code className="bg-gray-100 px-1 rounded">words</code> array. Each word needs: category, difficulty, languageCode, translations, imageUrl, distractorImages.
              </p>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder={'{\n  "words": [\n    {\n      "category": "animals",\n      "difficulty": "beginner",\n      "languageCode": "multi",\n      "translations": { "en": { "word": "dog", "pronunciation": "/dɔːɡ/" } },\n      "imageUrl": "https://...",\n      "distractorImages": ["https://...", "https://..."]\n    }\n  ]\n}'}
                className="w-full h-48 border border-gray-300 rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-blue resize-y"
                disabled={importing}
              />
              <div className="flex items-center gap-3 mt-3">
                <Button onClick={handleJsonImport} disabled={importing || !jsonInput.trim()}>
                  {importing ? 'Importing...' : 'Import Words'}
                </Button>
                {jsonInput && (
                  <Button variant="secondary" size="sm" onClick={() => { setJsonInput(''); setImportResult(null); }}>
                    Clear
                  </Button>
                )}
              </div>

              {importResult && (
                <div className={`mt-3 p-3 rounded-md text-sm ${importResult.failed === 0 ? 'bg-green-50 text-green-800' : 'bg-yellow-50 text-yellow-800'}`}>
                  <p>✅ {importResult.success} word(s) imported{importResult.failed > 0 && `, ❌ ${importResult.failed} failed`}</p>
                  {importResult.errors.length > 0 && (
                    <ul className="mt-2 list-disc list-inside">
                      {importResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Words Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredWords.map((word) => (
            <WordCard
              key={word.wordId}
              word={word}
              onEdit={handleEditWord}
              onDelete={handleDeleteWord}
              isEditing={editingWord?.wordId === word.wordId}
            />
          ))}
        </div>

        {filteredWords.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No words found matching your filters.</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingWord && (
        <EditWordModal
          word={editingWord}
          onSave={handleSaveWord}
          onCancel={handleCancelEdit}
          onImageUrlChange={handleImageUrlChange}
          onDistractorImageChange={handleDistractorImageChange}
          onTranslationChange={handleTranslationChange}
          saving={saving}
        />
      )}
    </div>
  );
};

// Word Card Component
const WordCard = ({ 
  word, 
  onEdit, 
  onDelete,
  isEditing 
}: { 
  word: LanguageWordAdmin; 
  onEdit: (word: LanguageWordAdmin) => void;
  onDelete: (wordId: string, wordLabel: string) => void;
  isEditing: boolean;
}) => {
  const getTranslationText = (word: LanguageWordAdmin) => {
    const translations = Object.entries(word.translations)
      .filter(([_, translation]) => translation?.word)
      .map(([lang, translation]) => `${lang.toUpperCase()}: ${translation.word}`)
      .join(', ');
    return translations || 'No translations';
  };

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${isEditing ? 'ring-2 ring-primary-blue' : ''}`}>
      {/* Image Preview */}
      <div className="aspect-video bg-gray-100 relative">
        {word.imageUrl ? (
          <img
            src={word.imageUrl}
            alt={getTranslationText(word)}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y3ZjdmNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgZm91bmQ8L3RleHQ+PC9zdmc+';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span className="text-4xl">🖼️</span>
          </div>
        )}
        <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
          {word.category}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="mb-3">
          <h3 className="font-semibold text-gray-900 mb-1">{getTranslationText(word)}</h3>
          <p className="text-xs text-gray-500 font-mono">{word.wordId}</p>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Difficulty:</span>
            <span className="font-medium">{word.difficulty}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Distractors:</span>
            <span className="font-medium">{word.distractorImages.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Languages:</span>
            <span className="font-medium">{Object.keys(word.translations).length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Updated:</span>
            <span className="font-medium text-xs">
              {new Date(word.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            onClick={() => onEdit(word)}
            disabled={isEditing}
            className="flex-1"
            size="sm"
          >
            {isEditing ? 'Editing...' : 'Edit'}
          </Button>
          <button
            onClick={() => onDelete(word.wordId, getTranslationText(word))}
            className="px-3 py-1.5 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition-colors"
            title="Delete word"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
};

// Edit Modal Component
const EditWordModal = ({
  word,
  onSave,
  onCancel,
  onImageUrlChange,
  onDistractorImageChange,
  onTranslationChange,
  saving
}: {
  word: LanguageWordAdmin;
  onSave: () => void;
  onCancel: () => void;
  onImageUrlChange: (url: string) => void;
  onDistractorImageChange: (index: number, url: string) => void;
  onTranslationChange: (language: string, field: 'word' | 'pronunciation', value: string) => void;
  saving: boolean;
}) => {
  const supportedLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Edit Language Word</h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
              disabled={saving}
            >
              <span className="text-2xl">×</span>
            </button>
          </div>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Word ID</label>
                <input
                  type="text"
                  value={word.wordId}
                  disabled
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  value={word.category}
                  disabled
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                <input
                  type="text"
                  value={word.difficulty}
                  disabled
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-500"
                />
              </div>
            </div>

            {/* Main Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Main Image URL</label>
              <input
                type="url"
                value={word.imageUrl}
                onChange={(e) => onImageUrlChange(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-blue"
                placeholder="https://images.unsplash.com/..."
              />
              {word.imageUrl && (
                <div className="mt-2">
                  <img
                    src={word.imageUrl}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            {/* Distractor Images */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Distractor Images</label>
              <div className="space-y-3">
                {word.distractorImages.map((url, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <div className="flex-1">
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => onDistractorImageChange(index, e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-blue"
                        placeholder={`Distractor image ${index + 1} URL`}
                      />
                    </div>
                    {url && (
                      <img
                        src={url}
                        alt={`Distractor ${index + 1}`}
                        className="w-16 h-16 object-cover rounded border"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Translations */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Translations</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {supportedLanguages.map((lang) => {
                  const translation = (word.translations as any)[lang];
                  return (
                    <div key={lang} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">{lang.toUpperCase()}</h4>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Word</label>
                          <input
                            type="text"
                            value={translation?.word || ''}
                            onChange={(e) => onTranslationChange(lang, 'word', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-blue"
                            placeholder={`Word in ${lang.toUpperCase()}`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Pronunciation</label>
                          <input
                            type="text"
                            value={translation?.pronunciation || ''}
                            onChange={(e) => onTranslationChange(lang, 'pronunciation', e.target.value)}
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-blue"
                            placeholder="/pronunciation/"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <Button
              variant="secondary"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={onSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LanguageMaintenancePage;