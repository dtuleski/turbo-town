/**
 * PronunciationGamePage
 * 
 * Pronunciation mode for Language Learning game (paid members only).
 * Shows an image + word, player speaks the word, system scores pronunciation 0-100.
 * Up to 3 retries per word, best score counts.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getLanguageWords } from '../../api/language';
import { startGame as startGameAPI, completeGame, submitGameReview } from '../../api/game';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import AudioWaveform from '../../components/language/AudioWaveform';
import {
  calculatePronunciationScore,
  getFeedback,
  FEEDBACK_CONFIG,
  type PronunciationScore,
  type PronunciationFeedback,
} from '../../utils/pronunciationScoring';

interface Word {
  id: string;
  word: string;
  pronunciation: string;
  correctImageUrl: string;
  distractorImages: string[];
  category: string;
}

interface WordResult {
  wordId: string;
  word: string;
  bestScore: number;
  attemptsUsed: number;
  feedback: PronunciationFeedback;
}

const MAX_RETRIES = 3;

// Reduced word counts for pronunciation mode
const PRONUNCIATION_WORD_COUNTS: Record<string, number> = {
  beginner: 5,
  intermediate: 8,
  advanced: 12,
};

export default function PronunciationGamePage() {
  const navigate = useNavigate();
  const { languageCode } = useParams<{ languageCode: string }>();
  const location = useLocation();
  const settings = location.state?.settings;

  // Game state
  const [words, setWords] = useState<Word[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [wordResults, setWordResults] = useState<WordResult[]>([]);
  const [currentAttempt, setCurrentAttempt] = useState(0);
  const [currentBestScore, setCurrentBestScore] = useState(0);
  const [lastScore, setLastScore] = useState<PronunciationScore | null>(null);
  const [showScore, setShowScore] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [gameStartTime] = useState(Date.now());
  const [backendGameId, setBackendGameId] = useState<string>('');
  const [showResults, setShowResults] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Speech recognition
  const {
    state: recognitionState,
    result: recognitionResult,
    error: recognitionError,
    startListening,
    stopListening,
    reset: resetRecognition,
    analyserNode,
  } = useSpeechRecognition({
    languageCode: languageCode || 'en',
    silenceTimeout: 3000,
    maxDuration: 8000,
  });

  const currentWord = words[currentWordIndex];
  const progress = words.length > 0 ? ((currentWordIndex) / words.length) * 100 : 0;

  // Load words on mount
  useEffect(() => {
    if (!settings || !languageCode) {
      navigate('/language');
      return;
    }
    loadWords();
  }, [settings, languageCode]);

  const loadWords = async () => {
    try {
      const wordCount = PRONUNCIATION_WORD_COUNTS[settings.difficulty] || 5;
      const loadedWords = await getLanguageWords(
        languageCode!,
        settings.category,
        settings.difficulty,
        wordCount
      );

      if (!loadedWords || !Array.isArray(loadedWords) || loadedWords.length === 0) {
        alert('No vocabulary available for this combination. Please try a different category.');
        navigate('/language');
        return;
      }

      setWords(loadedWords);
      setIsLoading(false);

      // Start backend game for leaderboard
      try {
        const difficultyMap: Record<string, number> = { beginner: 1, intermediate: 2, advanced: 3 };
        const game = await startGameAPI({
          themeId: 'LANGUAGE_PRONUNCIATION',
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

  // Process recognition result when done
  useEffect(() => {
    if (recognitionState === 'done' && recognitionResult?.isFinal && currentWord) {
      const score = calculatePronunciationScore(
        currentWord.word,
        recognitionResult.transcript,
        recognitionResult.confidence
      );
      setLastScore(score);
      setShowScore(true);

      // Update best score
      if (score.score > currentBestScore) {
        setCurrentBestScore(score.score);
      }

      // Animate score counting up
      animateScoreReveal(score.score);
    }
  }, [recognitionState, recognitionResult]);

  const animateScoreReveal = (targetScore: number) => {
    setAnimatedScore(0);
    const duration = 800; // ms
    const startTime = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * targetScore));

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  };

  const handleRecord = useCallback(() => {
    setShowScore(false);
    setLastScore(null);
    resetRecognition();
    startListening();
  }, [resetRecognition, startListening]);

  const handleNextWord = useCallback(() => {
    // Save result for current word
    const result: WordResult = {
      wordId: currentWord.id,
      word: currentWord.word,
      bestScore: currentBestScore,
      attemptsUsed: currentAttempt + 1,
      feedback: getFeedback(currentBestScore),
    };
    setWordResults(prev => [...prev, result]);

    // Move to next word or end game
    if (currentWordIndex + 1 >= words.length) {
      finishGame([...wordResults, result]);
    } else {
      setCurrentWordIndex(prev => prev + 1);
      setCurrentAttempt(0);
      setCurrentBestScore(0);
      setLastScore(null);
      setShowScore(false);
      resetRecognition();
    }
  }, [currentWord, currentBestScore, currentAttempt, currentWordIndex, words.length, wordResults, resetRecognition]);

  const handleRetry = useCallback(() => {
    setCurrentAttempt(prev => prev + 1);
    setShowScore(false);
    setLastScore(null);
    resetRecognition();
  }, [resetRecognition]);

  const finishGame = async (results: WordResult[]) => {
    const completionTime = Math.floor((Date.now() - gameStartTime) / 1000);

    // The backend computes the authoritative game score from these params
    // (average pronunciation accuracy is reflected via correctAnswers/totalQuestions).
    if (backendGameId) {
      try {
        await completeGame({
          gameId: backendGameId,
          completionTime,
          attempts: results.reduce((sum, r) => sum + r.attemptsUsed, 0),
          correctAnswers: results.filter(r => r.bestScore >= 71).length,
          totalQuestions: results.length,
        });
      } catch (err) {
        console.error('Failed to complete backend game:', err);
      }
    }

    setShowResults(true);
  };

  // ============================================================
  // RESULTS SCREEN
  // ============================================================
  if (showResults) {
    const avgScore = wordResults.reduce((sum, r) => sum + r.bestScore, 0) / wordResults.length;
    const completionTime = Math.floor((Date.now() - gameStartTime) / 1000);
    const perfectWords = wordResults.filter(r => r.bestScore >= 91).length;
    const greatWords = wordResults.filter(r => r.bestScore >= 71).length;

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center p-4">
        <motion.div
          className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🎤</div>
            <h2 className="text-2xl font-bold text-gray-800">Pronunciation Complete!</h2>
          </div>

          {/* Overall Score */}
          <div className="text-center mb-6">
            <div className={`text-5xl font-black mb-1 ${FEEDBACK_CONFIG[getFeedback(Math.round(avgScore))].color}`}>
              {Math.round(avgScore)}%
            </div>
            <div className="text-sm text-gray-500">Average Accuracy</div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mb-6 text-center">
            <div>
              <div className="text-lg font-bold text-gray-800">{perfectWords}/{wordResults.length}</div>
              <div className="text-xs text-gray-500">Perfect</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-800">{greatWords}/{wordResults.length}</div>
              <div className="text-xs text-gray-500">Great+</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-800">{completionTime}s</div>
              <div className="text-xs text-gray-500">Time</div>
            </div>
          </div>

          {/* Per-Word Breakdown */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 max-h-48 overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-600 mb-3">Word Breakdown</h3>
            <div className="space-y-2">
              {wordResults.map((r, i) => {
                const config = FEEDBACK_CONFIG[r.feedback];
                return (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">{r.word}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{r.attemptsUsed} tries</span>
                      <span className={`font-bold ${config.color}`}>
                        {r.bestScore}% {config.emoji}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Star Rating */}
          {!reviewSubmitted ? (
            <div className="mb-6 text-center">
              <div className="text-sm text-gray-500 mb-2">Rate this game</div>
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    data-testid={`pronunciation-results-star-${star}`}
                    onClick={async () => {
                      setReviewSubmitted(true);
                      try { await submitGameReview('LANGUAGE_PRONUNCIATION', star); } catch {}
                    }}
                    className="text-3xl hover:scale-110 transition-transform"
                  >
                    {'☆'}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm text-green-500 font-medium mb-6 text-center">
              ✓ Thanks for your feedback!
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              data-testid="pronunciation-results-play-again"
              onClick={() => navigate(`/language/setup/${languageCode}`)}
              className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              🎮 Play Again
            </button>
            <button
              data-testid="pronunciation-results-hub"
              onClick={() => navigate('/hub')}
              className="flex-1 border-2 border-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Hub
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ============================================================
  // LOADING STATE
  // ============================================================
  if (isLoading || !currentWord) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">🎤</div>
          <p className="text-lg text-gray-600">Loading pronunciation game...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // GAME SCREEN
  // ============================================================
  const canRetry = currentAttempt < MAX_RETRIES - 1 && lastScore !== null && lastScore.score < 50;
  const retriesLeft = MAX_RETRIES - currentAttempt - 1;
  const isRecording = recognitionState === 'listening';
  const isProcessing = recognitionState === 'processing';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-4">
      <div className="container mx-auto max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            data-testid="pronunciation-game-back"
            onClick={() => navigate(`/language/setup/${languageCode}`)}
            className="text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← Back
          </button>
          <div className="text-sm text-gray-500">
            {currentWordIndex + 1} / {words.length}
          </div>
          <div className="text-sm font-medium text-indigo-600">
            🎤 Pronunciation
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
          <motion.div
            className="bg-indigo-500 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Word Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentWord.id}
            className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            {/* Image */}
            <div className="relative h-48 bg-gray-100">
              <img
                src={currentWord.correctImageUrl}
                alt={`Image for ${currentWord.word}`}
                className="w-full h-full object-cover"
                data-testid="pronunciation-game-image"
              />
              {/* Attempts badge */}
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-medium text-gray-600">
                Attempt {currentAttempt + 1}/{MAX_RETRIES}
              </div>
            </div>

            {/* Word Display */}
            <div className="p-6 text-center">
              <h2
                className="text-3xl font-bold text-gray-800 mb-2"
                data-testid="pronunciation-game-word"
              >
                {currentWord.word}
              </h2>
              <p className="text-sm text-gray-400">Say this word clearly</p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Recording Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          {/* Waveform */}
          <div className="mb-4">
            <AudioWaveform
              analyserNode={analyserNode}
              isActive={isRecording}
              barCount={24}
              height={48}
              color={isRecording ? 'indigo' : 'indigo'}
            />
          </div>

          {/* Status Text */}
          <div className="text-center mb-4" aria-live="polite">
            {recognitionState === 'idle' && !showScore && (
              <p className="text-gray-500 text-sm">Tap the microphone to start</p>
            )}
            {isRecording && (
              <p className="text-indigo-600 text-sm font-medium animate-pulse">
                🎙️ Listening... speak now!
              </p>
            )}
            {isProcessing && (
              <p className="text-gray-500 text-sm">Processing...</p>
            )}
            {recognitionError && (
              <p className="text-red-500 text-sm">{recognitionError.userFriendlyMessage}</p>
            )}
          </div>

          {/* Score Display */}
          <AnimatePresence>
            {showScore && lastScore && (
              <motion.div
                className={`text-center p-4 rounded-xl mb-4 ${FEEDBACK_CONFIG[lastScore.feedback].bgColor}`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <div className={`text-4xl font-black ${FEEDBACK_CONFIG[lastScore.feedback].color}`}>
                  {animatedScore}%
                </div>
                <div className="text-lg mt-1">
                  {FEEDBACK_CONFIG[lastScore.feedback].emoji} {FEEDBACK_CONFIG[lastScore.feedback].label}
                </div>
                {lastScore.recognizedText && (
                  <div className="text-xs text-gray-400 mt-2">
                    Heard: "{lastScore.recognizedText}"
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            {/* Record / Stop Button */}
            {!showScore && (
              <button
                data-testid="pronunciation-game-record-btn"
                onClick={isRecording ? stopListening : handleRecord}
                disabled={isProcessing}
                className={`
                  w-full py-4 rounded-xl font-bold text-lg transition-all duration-200
                  flex items-center justify-center gap-2
                  ${isRecording
                    ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }
                  ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {isRecording ? (
                  <>
                    <span className="w-3 h-3 bg-white rounded-full" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    🎤 Record
                  </>
                )}
              </button>
            )}

            {/* After Score: Retry or Next */}
            {showScore && lastScore && (
              <div className="flex gap-3">
                {/* Retry button (if score < 50 and retries left) */}
                {canRetry && (
                  <button
                    data-testid="pronunciation-game-retry-btn"
                    onClick={handleRetry}
                    className="flex-1 py-3 rounded-xl font-bold border-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors"
                  >
                    🔄 Retry ({retriesLeft} left)
                  </button>
                )}

                {/* Next Word / Finish button */}
                <button
                  data-testid="pronunciation-game-next-btn"
                  onClick={handleNextWord}
                  className={`
                    ${canRetry ? 'flex-1' : 'w-full'}
                    py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors
                  `}
                >
                  {currentWordIndex + 1 >= words.length ? '🏁 Finish' : '➡️ Next Word'}
                </button>
              </div>
            )}

            {/* Error: Try Again */}
            {recognitionState === 'error' && (
              <button
                data-testid="pronunciation-game-error-retry-btn"
                onClick={handleRecord}
                className="w-full py-4 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                🎤 Try Again
              </button>
            )}
          </div>
        </div>

        {/* Best Score for Current Word */}
        {currentBestScore > 0 && (
          <div className="text-center text-sm text-gray-500">
            Best score this word: <span className="font-bold text-indigo-600">{currentBestScore}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
