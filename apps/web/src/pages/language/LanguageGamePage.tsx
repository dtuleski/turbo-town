import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getLanguageWords, saveLanguageGameResult } from '../../api/language';

interface Word {
  id: string;
  word: string;
  pronunciation: string;
  correctImageUrl: string;
  distractorImages: string[];
  category: string;
}

interface GameState {
  currentWordIndex: number;
  score: number;
  correctAnswers: number;
  streak: number;
  timeStarted: number;
  answers: Array<{
    wordId: string;
    selectedImage: string;
    isCorrect: boolean;
    timeSpent: number;
  }>;
}

export default function LanguageGamePage() {
  const navigate = useNavigate();
  const { languageCode } = useParams<{ languageCode: string }>();
  const location = useLocation();
  const settings = location.state?.settings;

  const [words, setWords] = useState<Word[]>([]);
  const [gameState, setGameState] = useState<GameState>({
    currentWordIndex: 0,
    score: 0,
    correctAnswers: 0,
    streak: 0,
    timeStarted: Date.now(),
    answers: []
  });
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  useEffect(() => {
    if (!settings || !languageCode) {
      navigate('/language');
      return;
    }
    loadWords();
  }, [settings, languageCode]);

  const loadWords = async () => {
    try {
      const words = await getLanguageWords(
        languageCode!,
        settings.category,
        settings.difficulty,
        settings.wordCount
      );
      
      setWords(words);
      setQuestionStartTime(Date.now());
    } catch (error) {
      console.error('Failed to load words:', error);
      navigate('/language');
    }
  };

  const currentWord = words[gameState.currentWordIndex];
  const progress = words.length > 0 ? ((gameState.currentWordIndex + 1) / words.length) * 100 : 0;

  const handleImageSelect = (imageUrl: string) => {
    if (showFeedback) return;
    
    setSelectedImage(imageUrl);
    const correct = imageUrl === currentWord.correctImageUrl;
    setShowFeedback(true);

    const timeSpent = Date.now() - questionStartTime;
    const timeBonus = Math.max(0, 50 - Math.floor(timeSpent / 1000) * 5);
    const streakBonus = gameState.streak * 10;
    const basePoints = 100;
    const totalPoints = correct ? basePoints + timeBonus + streakBonus : 0;

    setGameState(prev => ({
      ...prev,
      score: prev.score + totalPoints,
      correctAnswers: prev.correctAnswers + (correct ? 1 : 0),
      streak: correct ? prev.streak + 1 : 0,
      answers: [...prev.answers, {
        wordId: currentWord.id,
        selectedImage: imageUrl,
        isCorrect: correct,
        timeSpent
      }]
    }));

    // Auto-advance after 2 seconds
    setTimeout(async () => {
      if (gameState.currentWordIndex + 1 >= words.length) {
        // Game finished - save results
        try {
          await saveLanguageGameResult({
            languageCode: languageCode!,
            score: gameState.score + totalPoints,
            correctAnswers: gameState.correctAnswers + (correct ? 1 : 0),
            totalQuestions: words.length,
            difficulty: settings.difficulty,
            category: settings.category,
            timeSpent: Math.floor((Date.now() - gameState.timeStarted) / 1000),
            xpGained: Math.floor((gameState.score + totalPoints) / 10)
          });
        } catch (error) {
          console.error('Failed to save game result:', error);
        }
        
        navigate(`/language/results/${languageCode}`, {
          state: { gameState: { ...gameState, score: gameState.score + totalPoints }, settings }
        });
      } else {
        // Next question
        setGameState(prev => ({ ...prev, currentWordIndex: prev.currentWordIndex + 1 }));
        setSelectedImage('');
        setShowFeedback(false);
        setQuestionStartTime(Date.now());
      }
    }, 2000);
  };

  const playPronunciation = () => {
    // In real implementation, play audio file
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(currentWord.word);
      utterance.lang = languageCode === 'es' ? 'es-ES' : languageCode!;
      speechSynthesis.speak(utterance);
    }
  };

  if (!currentWord) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading words...</p>
        </div>
      </div>
    );
  }

  // Shuffle images for display
  const allImages = [currentWord.correctImageUrl, ...currentWord.distractorImages];
  const shuffledImages = [...allImages].sort(() => Math.random() - 0.5);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header with Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => navigate('/language')}
              className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <div className="text-right">
              <div className="text-sm text-gray-600">Score</div>
              <div className="text-2xl font-bold text-indigo-600">{gameState.score}</div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <motion.div 
              className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Question {gameState.currentWordIndex + 1} of {words.length}</span>
            <span>{gameState.correctAnswers} correct</span>
          </div>
        </div>

        {/* Game Content */}
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentWord.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-xl shadow-lg p-8 mb-8"
            >
              {/* Word Display */}
              <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <h1 className="text-5xl font-bold text-gray-800">
                    {currentWord.word}
                  </h1>
                  <button
                    onClick={playPronunciation}
                    className="bg-indigo-100 hover:bg-indigo-200 text-indigo-600 p-3 rounded-full transition-colors"
                    title="Play pronunciation"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M9 9a3 3 0 000 6h3v-6H9z" />
                    </svg>
                  </button>
                </div>
                <p className="text-gray-500 text-lg">{currentWord.pronunciation}</p>
                <p className="text-gray-600 mt-2">Choose the correct image:</p>
              </div>

              {/* Image Options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {shuffledImages.map((imageUrl, index) => (
                  <motion.div
                    key={imageUrl}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className={`
                      relative cursor-pointer rounded-xl overflow-hidden border-4 transition-all duration-300
                      ${showFeedback
                        ? imageUrl === currentWord.correctImageUrl
                          ? 'border-green-500 shadow-lg shadow-green-200'
                          : imageUrl === selectedImage
                          ? 'border-red-500 shadow-lg shadow-red-200'
                          : 'border-gray-200 opacity-50'
                        : selectedImage === imageUrl
                        ? 'border-indigo-500 shadow-lg'
                        : 'border-gray-200 hover:border-indigo-300 hover:shadow-md'
                      }
                    `}
                    onClick={() => handleImageSelect(imageUrl)}
                  >
                    <div className="aspect-square bg-gray-100 flex items-center justify-center">
                      {/* Placeholder for actual images */}
                      <div className="text-6xl">
                        {imageUrl.includes('dog') ? '🐕' :
                         imageUrl.includes('cat') ? '🐱' :
                         imageUrl.includes('rabbit') ? '🐰' :
                         imageUrl.includes('bird') ? '🐦' : '🖼️'}
                      </div>
                    </div>
                    
                    {/* Feedback Overlay */}
                    {showFeedback && (
                      <div className={`
                        absolute inset-0 flex items-center justify-center
                        ${imageUrl === currentWord.correctImageUrl
                          ? 'bg-green-500 bg-opacity-90'
                          : imageUrl === selectedImage
                          ? 'bg-red-500 bg-opacity-90'
                          : 'bg-gray-900 bg-opacity-50'
                        }
                      `}>
                        {imageUrl === currentWord.correctImageUrl ? (
                          <div className="text-white text-center">
                            <div className="text-4xl mb-2">✅</div>
                            <div className="font-semibold">Correct!</div>
                          </div>
                        ) : imageUrl === selectedImage ? (
                          <div className="text-white text-center">
                            <div className="text-4xl mb-2">❌</div>
                            <div className="font-semibold">Wrong</div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Streak Indicator */}
              {gameState.streak > 1 && !showFeedback && (
                <motion.div 
                  className="text-center mt-6"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-full">
                    <span>🔥</span>
                    <span className="font-semibold">{gameState.streak} streak!</span>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}