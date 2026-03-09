import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';

interface GameSettings {
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  wordCount: number;
}

const DIFFICULTIES = [
  {
    id: 'beginner',
    name: 'Beginner',
    description: 'Basic vocabulary, 10 words',
    wordCount: 10,
    multiplier: '1x',
    color: 'green',
    icon: '🌱'
  },
  {
    id: 'intermediate',
    name: 'Intermediate', 
    description: 'Common words, 15 words',
    wordCount: 15,
    multiplier: '1.5x',
    color: 'yellow',
    icon: '🌿'
  },
  {
    id: 'advanced',
    name: 'Advanced',
    description: 'Complex vocabulary, 20 words',
    wordCount: 20,
    multiplier: '2x',
    color: 'red',
    icon: '🌳'
  }
];

const CATEGORIES = [
  { id: 'animals', name: 'Animals', icon: '🐕', description: 'Dogs, cats, birds, and more' },
  { id: 'food', name: 'Food & Drinks', icon: '🍎', description: 'Fruits, vegetables, meals' },
  { id: 'colors', name: 'Colors', icon: '🌈', description: 'Basic and advanced colors' },
  { id: 'numbers', name: 'Numbers', icon: '🔢', description: 'Numbers 1-20 and beyond' },
  { id: 'objects', name: 'Objects', icon: '📱', description: 'Everyday items and tools' },
  { id: 'nature', name: 'Nature', icon: '🌲', description: 'Trees, flowers, weather' },
];

const LANGUAGE_INFO = {
  'en': { name: 'English', flag: '🇺🇸' },
  'es': { name: 'Spanish', flag: '🇪🇸' },
  'fr': { name: 'French', flag: '🇫🇷' },
  'it': { name: 'Italian', flag: '🇮🇹' },
  'de': { name: 'German', flag: '🇩🇪' },
  'pt': { name: 'Portuguese', flag: '🇧🇷' },
  'el': { name: 'Greek', flag: '🇬🇷' },
};

export default function LanguageGameSetup() {
  const navigate = useNavigate();
  const { languageCode } = useParams<{ languageCode: string }>();
  const [settings, setSettings] = useState<GameSettings>({
    difficulty: 'beginner',
    category: 'animals',
    wordCount: 10
  });

  const language = languageCode ? LANGUAGE_INFO[languageCode as keyof typeof LANGUAGE_INFO] : null;

  if (!language) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Language Not Found</h1>
          <button 
            onClick={() => navigate('/language')}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to Language Selection
          </button>
        </div>
      </div>
    );
  }

  const handleDifficultyChange = (difficulty: 'beginner' | 'intermediate' | 'advanced') => {
    const difficultyInfo = DIFFICULTIES.find(d => d.id === difficulty);
    setSettings(prev => ({
      ...prev,
      difficulty,
      wordCount: difficultyInfo?.wordCount || 10
    }));
  };

  const handleStartGame = () => {
    navigate(`/language/game/${languageCode}`, { 
      state: { settings } 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-4xl">{language.flag}</span>
            <h1 className="text-4xl font-bold text-gray-800">
              Learn {language.name}
            </h1>
          </div>
          <p className="text-lg text-gray-600">
            Configure your learning session
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          {/* Difficulty Selection */}
          <motion.div 
            className="bg-white rounded-xl shadow-lg p-8 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <span>🎯</span>
              Choose Difficulty
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {DIFFICULTIES.map((difficulty) => (
                <div
                  key={difficulty.id}
                  className={`
                    border-2 rounded-lg p-6 cursor-pointer transition-all duration-300
                    ${settings.difficulty === difficulty.id
                      ? 'border-indigo-500 bg-indigo-50 shadow-md'
                      : 'border-gray-200 hover:border-indigo-300 hover:shadow-sm'
                    }
                  `}
                  onClick={() => handleDifficultyChange(difficulty.id as any)}
                >
                  <div className="text-center">
                    <div className="text-3xl mb-3">{difficulty.icon}</div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">
                      {difficulty.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3">
                      {difficulty.description}
                    </p>
                    <div className="flex justify-between items-center text-sm">
                      <span className="bg-gray-100 px-2 py-1 rounded">
                        {difficulty.wordCount} words
                      </span>
                      <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-medium">
                        {difficulty.multiplier} points
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Category Selection */}
          <motion.div 
            className="bg-white rounded-xl shadow-lg p-8 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <span>📚</span>
              Choose Category
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {CATEGORIES.map((category) => (
                <div
                  key={category.id}
                  className={`
                    border-2 rounded-lg p-4 cursor-pointer transition-all duration-300
                    ${settings.category === category.id
                      ? 'border-indigo-500 bg-indigo-50 shadow-md'
                      : 'border-gray-200 hover:border-indigo-300 hover:shadow-sm'
                    }
                  `}
                  onClick={() => setSettings(prev => ({ ...prev, category: category.id }))}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">{category.icon}</div>
                    <h3 className="font-semibold text-gray-800 mb-1">
                      {category.name}
                    </h3>
                    <p className="text-gray-600 text-xs">
                      {category.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Game Summary & Start */}
          <motion.div 
            className="bg-white rounded-xl shadow-lg p-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <span>🚀</span>
              Ready to Start?
            </h2>
            
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Game Summary:</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl mb-2">{language.flag}</div>
                  <div className="text-sm text-gray-600">Language</div>
                  <div className="font-semibold">{language.name}</div>
                </div>
                <div>
                  <div className="text-2xl mb-2">
                    {DIFFICULTIES.find(d => d.id === settings.difficulty)?.icon}
                  </div>
                  <div className="text-sm text-gray-600">Difficulty</div>
                  <div className="font-semibold capitalize">{settings.difficulty}</div>
                </div>
                <div>
                  <div className="text-2xl mb-2">
                    {CATEGORIES.find(c => c.id === settings.category)?.icon}
                  </div>
                  <div className="text-sm text-gray-600">Category</div>
                  <div className="font-semibold">
                    {CATEGORIES.find(c => c.id === settings.category)?.name}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => navigate('/language')}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back to Languages
              </button>
              <button
                onClick={handleStartGame}
                className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold flex items-center gap-2"
              >
                <span>Start Learning</span>
                <span>🎮</span>
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}