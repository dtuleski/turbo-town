import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getUserCountry, getUserLanguageProgress, LanguageProgress } from '../../api/language';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  isRestricted: boolean;
  progress?: LanguageProgress;
}

const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', isRestricted: false },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', isRestricted: false },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', isRestricted: false },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', isRestricted: false },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', isRestricted: false },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷', isRestricted: false },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷', isRestricted: false },
];

export default function LanguageSelectionPage() {
  const navigate = useNavigate();
  const [languages, setLanguages] = useState<Language[]>(LANGUAGES);
  const [userCountry, setUserCountry] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    detectUserCountryAndRestrictLanguages();
    loadUserProgress();
  }, []);

  const detectUserCountryAndRestrictLanguages = async () => {
    try {
      // Get user's country from IP geolocation
      const country = await getUserCountry();
      setUserCountry(country);

      // Define country-language restrictions
      const restrictions: Record<string, string[]> = {
        'US': ['en'], 'GB': ['en'], 'CA': ['en', 'fr'], 'AU': ['en'],
        'ES': ['es'], 'MX': ['es'], 'AR': ['es'], 'CO': ['es'],
        'FR': ['fr'], 'BE': ['fr'], 'CH': ['fr', 'de'],
        'IT': ['it'], 'SM': ['it'], 'VA': ['it'],
        'DE': ['de'], 'AT': ['de'],
        'BR': ['pt'], 'PT': ['pt'], 'AO': ['pt'],
        'GR': ['el'], 'CY': ['el'],
      };

      const restrictedLanguages = restrictions[country] || [];
      
      setLanguages(prev => prev.map(lang => ({
        ...lang,
        isRestricted: restrictedLanguages.includes(lang.code)
      })));
    } catch (error) {
      console.error('Failed to detect country:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserProgress = async () => {
    try {
      const progressData = await getUserLanguageProgress();
      
      // Create a map for quick lookup
      const progressMap = progressData.reduce((acc, progress) => {
        acc[progress.languageCode] = progress;
        return acc;
      }, {} as Record<string, LanguageProgress>);

      // Update languages with progress data
      setLanguages(prev => prev.map(lang => ({
        ...lang,
        progress: progressMap[lang.code]
      })));
    } catch (error) {
      console.error('Failed to load progress:', error);
    }
  };

  const handleLanguageSelect = (language: Language) => {
    if (language.isRestricted) return;
    navigate(`/language/setup/${language.code}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Detecting your location...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.h1 
            className="text-4xl font-bold text-gray-800 mb-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            🌍 Choose Your Language
          </motion.h1>
          <motion.p 
            className="text-lg text-gray-600 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Learn vocabulary by matching words with images. 
            {userCountry && (
              <span className="block mt-2 text-sm text-indigo-600">
                Note: Languages from your country ({userCountry}) are not available to encourage learning new languages!
              </span>
            )}
          </motion.p>
        </div>

        {/* Language Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {languages.map((language, index) => (
            <motion.div
              key={language.code}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={`relative ${language.isRestricted ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              onClick={() => handleLanguageSelect(language)}
            >
              <div className={`
                bg-white rounded-xl shadow-lg p-6 transition-all duration-300 border-2
                ${language.isRestricted 
                  ? 'opacity-50 border-gray-200' 
                  : 'hover:shadow-xl hover:scale-105 border-transparent hover:border-indigo-200'
                }
              `}>
                {/* Restriction Overlay */}
                {language.isRestricted && (
                  <div className="absolute inset-0 bg-gray-900 bg-opacity-20 rounded-xl flex items-center justify-center">
                    <div className="bg-white rounded-full p-2">
                      <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-5V9m0 0V7m0 2h2m-2 0H10" />
                      </svg>
                    </div>
                  </div>
                )}

                {/* Flag */}
                <div className="text-4xl mb-4 text-center">
                  {language.flag}
                </div>

                {/* Language Names */}
                <div className="text-center mb-4">
                  <h3 className="text-xl font-semibold text-gray-800 mb-1">
                    {language.name}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {language.nativeName}
                  </p>
                </div>

                {/* Progress Bar (if user has progress) */}
                {language.progress && !language.isRestricted && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Level {language.progress.level}</span>
                      <span>{language.progress.wordsLearned} words</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min((language.progress.xp % 100), 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Status */}
                <div className="text-center">
                  {language.isRestricted ? (
                    <span className="text-sm text-gray-500 font-medium">
                      🔒 Not Available
                    </span>
                  ) : language.progress ? (
                    <span className="text-sm text-indigo-600 font-medium">
                      Continue Learning
                    </span>
                  ) : (
                    <span className="text-sm text-green-600 font-medium">
                      Start Learning
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Info Section */}
        <motion.div 
          className="mt-16 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl mb-3">🎯</div>
                <h3 className="font-semibold text-gray-800 mb-2">Choose Language</h3>
                <p className="text-gray-600 text-sm">Select a language you want to learn (not from your country)</p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-3">🖼️</div>
                <h3 className="font-semibold text-gray-800 mb-2">Match Words</h3>
                <p className="text-gray-600 text-sm">See a word and choose the correct image from 3 options</p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-3">🏆</div>
                <h3 className="font-semibold text-gray-800 mb-2">Earn Points</h3>
                <p className="text-gray-600 text-sm">Build your vocabulary and unlock achievements</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}