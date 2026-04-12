import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { getLanguageWords } from '../../api/language';
import { startGame as startGameAPI, completeGame, submitGameReview } from '../../api/game';

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
  const [backendGameId, setBackendGameId] = useState<string>('');
  const [showResults, setShowResults] = useState(false);
  const [finalGameState, setFinalGameState] = useState<GameState | null>(null);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [backendScore, setBackendScore] = useState<number | null>(null);

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
      
      // Ensure words is an array and has content
      if (!words || !Array.isArray(words) || words.length === 0) {
        console.error('No words available for this language/category combination');
        alert('Sorry, no vocabulary is available for this language and category combination. Please try a different category.');
        navigate('/language');
        return;
      }
      
      setWords(words);
      setQuestionStartTime(Date.now());
      
      // Start game in backend for leaderboard tracking
      try {
        const difficultyMap: Record<string, number> = { easy: 1, medium: 2, hard: 3 };
        const game = await startGameAPI({
          themeId: 'LANGUAGE_LEARNING',
          difficulty: difficultyMap[settings.difficulty] || 1,
        });
        setBackendGameId(game.id);
      } catch (err) {
        console.error('Failed to start backend game:', err);
      }
    } catch (error) {
      console.error('Failed to load words:', error);
      navigate('/language');
    }
  };

  const currentWord = words[gameState.currentWordIndex];
  const progress = words.length > 0 ? ((gameState.currentWordIndex + 1) / words.length) * 100 : 0;

  // Shuffle images once per question (stable across re-renders)
  const shuffledImages = useMemo(() => {
    if (!currentWord) return [];
    const allImages = [currentWord.correctImageUrl, ...currentWord.distractorImages];
    return [...allImages].sort(() => Math.random() - 0.5);
  }, [currentWord?.id]);

  // Show results page when game is finished (AFTER all hooks)
  if (showResults && finalGameState) {
    const finalScore = backendScore ?? finalGameState.score;
    const accuracy = finalGameState.correctAnswers / Math.max(1, words.length);
    const completionTime = Math.floor((Date.now() - finalGameState.timeStarted) / 1000);
    const diffLabel = settings.difficulty === 'advanced' ? 'Hard' : settings.difficulty === 'intermediate' ? 'Medium' : 'Easy';

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-2">🎉</div>
          <h2 className="text-2xl font-bold mb-4">Game Complete!</h2>
          <div className="text-5xl font-black text-indigo-600 mb-1">{finalScore.toLocaleString()}</div>
          <div className="text-sm text-gray-500 mb-6">Total Score</div>
          <div className="grid grid-cols-3 gap-4 mb-6 text-center">
            <div>
              <div className="text-lg font-bold text-gray-800">{diffLabel}</div>
              <div className="text-xs text-gray-500">Difficulty</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-800">{Math.round(accuracy * 100)}%</div>
              <div className="text-xs text-gray-500">Accuracy</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-800">{completionTime}s</div>
              <div className="text-xs text-gray-500">Time</div>
            </div>
          </div>
          {/* Star Rating */}
          {!reviewSubmitted ? (
            <div className="mb-6">
              <div className="text-sm text-gray-500 mb-2">Rate this game</div>
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={async () => {
                      setReviewSubmitted(true);
                      try { await submitGameReview('LANGUAGE_LEARNING', star); } catch {}
                    }}
                    className="text-3xl hover:scale-110 transition-transform"
                  >
                    {'☆'}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm text-green-500 font-medium mb-6">✓ Thanks for your feedback!</div>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/language/setup/${languageCode}`, { state: { settings } })}
              className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              🎮 Play Again
            </button>
            <button
              onClick={() => navigate('/hub')}
              className="flex-1 border-2 border-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Hub
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleImageSelect = (imageUrl: string) => {
    if (showFeedback || !currentWord) return;
    
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
        const finalCorrectAnswers = gameState.correctAnswers + (correct ? 1 : 0);
        const finalScore = gameState.score + totalPoints;
        const completionTime = Math.floor((Date.now() - gameState.timeStarted) / 1000);
        
        // Complete game in backend for leaderboard
        if (backendGameId) {
          try {
            const result = await completeGame({
              gameId: backendGameId,
              completionTime,
              attempts: words.length,
              correctAnswers: finalCorrectAnswers,
              totalQuestions: words.length,
            });
            if (result?.score) {
              setBackendScore(result.score);
            }
          } catch (err) {
            console.error('Failed to complete backend game:', err);
          }
        }
        
        setFinalGameState({ ...gameState, score: finalScore, correctAnswers: finalCorrectAnswers });
        setShowResults(true);
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
            <div 
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
            <div
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
                  <div
                    key={imageUrl}
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
                    <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                      <img
                        src={imageUrl}
                        alt={`Option ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to emoji if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'block';
                        }}
                      />
                      <div 
                        className="text-6xl hidden"
                        style={{ display: 'none' }}
                      >
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
                  </div>
                ))}
              </div>

              {/* Streak Indicator */}
              {gameState.streak > 1 && !showFeedback && (
                <div className="text-center mt-6">
                  <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-full">
                    <span>🔥</span>
                    <span className="font-semibold">{gameState.streak} streak!</span>
                  </div>
                </div>
              )}
            </div>
        </div>
      </div>
    </div>
  );
}