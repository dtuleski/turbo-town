import { useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const LANGUAGE_INFO = {
  'en': { name: 'English', flag: '🇺🇸' },
  'es': { name: 'Spanish', flag: '🇪🇸' },
  'fr': { name: 'French', flag: '🇫🇷' },
  'it': { name: 'Italian', flag: '🇮🇹' },
  'de': { name: 'German', flag: '🇩🇪' },
  'pt': { name: 'Portuguese', flag: '🇧🇷' },
  'el': { name: 'Greek', flag: '🇬🇷' },
};

export default function LanguageGameResults() {
  const navigate = useNavigate();
  const { languageCode } = useParams<{ languageCode: string }>();
  const location = useLocation();
  const gameState = location.state?.gameState;
  const settings = location.state?.settings;

  const language = languageCode ? LANGUAGE_INFO[languageCode as keyof typeof LANGUAGE_INFO] : null;

  useEffect(() => {
    if (!gameState || !settings || !language) {
      navigate('/language');
      return;
    }
    
    // Save game results to backend
    saveGameResults();
  }, [gameState, settings, language]);

  const saveGameResults = async () => {
    try {
      // TODO: Save to backend API
      // await api.saveLanguageGameResult({
      //   languageCode,
      //   score: gameState.score,
      //   correctAnswers: gameState.correctAnswers,
      //   totalQuestions: gameState.answers.length,
      //   settings
      // });
    } catch (error) {
      console.error('Failed to save game results:', error);
    }
  };

  if (!gameState || !settings || !language) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Game Session</h1>
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

  const totalQuestions = gameState.answers.length;
  const accuracy = totalQuestions > 0 ? (gameState.correctAnswers / totalQuestions) * 100 : 0;
  const timeSpent = Math.floor((Date.now() - gameState.timeStarted) / 1000);
  const xpGained = Math.floor(gameState.score / 10);

  // Determine performance level
  const getPerformanceLevel = () => {
    if (accuracy >= 90) return { level: 'Excellent', color: 'green', emoji: '🌟' };
    if (accuracy >= 75) return { level: 'Great', color: 'blue', emoji: '👏' };
    if (accuracy >= 60) return { level: 'Good', color: 'yellow', emoji: '👍' };
    return { level: 'Keep Practicing', color: 'orange', emoji: '💪' };
  };

  const performance = getPerformanceLevel();

  // Mock achievements - in real implementation, calculate based on performance
  const achievements = [];
  if (accuracy === 100) achievements.push('Perfect Score!');
  if (gameState.streak >= 5) achievements.push('Hot Streak!');
  if (timeSpent < 120) achievements.push('Speed Learner!');

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100">
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
              {language.name} Results
            </h1>
          </div>
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-3xl">{performance.emoji}</span>
            <span className={`text-2xl font-bold text-${performance.color}-600`}>
              {performance.level}
            </span>
          </div>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          {/* Score Card */}
          <motion.div 
            className="bg-white rounded-xl shadow-lg p-8 mb-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="text-center mb-8">
              <div className="text-6xl font-bold text-indigo-600 mb-2">
                {gameState.score}
              </div>
              <div className="text-xl text-gray-600">Total Score</div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {gameState.correctAnswers}
                </div>
                <div className="text-sm text-gray-600">Correct</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {accuracy.toFixed(0)}%
                </div>
                <div className="text-sm text-gray-600">Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-1">
                  {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}
                </div>
                <div className="text-sm text-gray-600">Time</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600 mb-1">
                  +{xpGained}
                </div>
                <div className="text-sm text-gray-600">XP Gained</div>
              </div>
            </div>
          </motion.div>

          {/* Achievements */}
          {achievements.length > 0 && (
            <motion.div 
              className="bg-white rounded-xl shadow-lg p-8 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span>🏆</span>
                Achievements Unlocked
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {achievements.map((achievement, index) => (
                  <motion.div
                    key={achievement}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                    className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 flex items-center gap-3"
                  >
                    <span className="text-2xl">🎖️</span>
                    <span className="font-semibold text-yellow-800">{achievement}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Detailed Breakdown */}
          <motion.div 
            className="bg-white rounded-xl shadow-lg p-8 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <span>📊</span>
              Detailed Breakdown
            </h2>
            
            <div className="space-y-4">
              {gameState.answers.map((answer: any, index: number) => (
                <div key={answer.wordId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className={`text-2xl ${answer.isCorrect ? '✅' : '❌'}`}></span>
                    <span className="font-medium">Question {index + 1}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">
                      {(answer.timeSpent / 1000).toFixed(1)}s
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <button
              onClick={() => navigate(`/language/setup/${languageCode}`, { state: { settings } })}
              className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold flex items-center justify-center gap-2"
            >
              <span>🔄</span>
              Play Again
            </button>
            <button
              onClick={() => navigate('/language')}
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center justify-center gap-2"
            >
              <span>🌍</span>
              Try Another Language
            </button>
            <button
              onClick={() => navigate('/hub')}
              className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
            >
              Back to Hub
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}