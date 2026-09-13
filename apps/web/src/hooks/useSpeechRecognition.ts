/**
 * Custom hook wrapping the Web Speech Recognition API.
 * 
 * Provides a clean interface for:
 * - Starting/stopping speech recognition
 * - Getting recognized text and confidence
 * - Tracking recording state
 * - Accessing raw audio data for waveform visualization
 * - Handling errors gracefully with kid-friendly messages
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { SPEECH_RECOGNITION_LOCALES } from '../utils/pronunciationScoring';

// Type declarations for Web Speech API
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onaudiostart: (() => void) | null;
  onaudioend: (() => void) | null;
}

export type RecognitionState = 'idle' | 'listening' | 'processing' | 'done' | 'error';

export interface RecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface SpeechRecognitionError {
  code: string;
  message: string;
  userFriendlyMessage: string;
}

export interface UseSpeechRecognitionOptions {
  /** Language code (e.g., 'es', 'fr') */
  languageCode: string;
  /** Auto-stop after silence (ms). Default: 3000 */
  silenceTimeout?: number;
  /** Max recording duration (ms). Default: 8000 */
  maxDuration?: number;
}

export interface UseSpeechRecognitionReturn {
  /** Current state of recognition */
  state: RecognitionState;
  /** Latest recognition result */
  result: RecognitionResult | null;
  /** Error information if state is 'error' */
  error: SpeechRecognitionError | null;
  /** Start listening for speech */
  startListening: () => void;
  /** Stop listening */
  stopListening: () => void;
  /** Reset to idle state */
  reset: () => void;
  /** Whether the browser supports speech recognition */
  isSupported: boolean;
  /** Audio analyser node for waveform visualization */
  analyserNode: AnalyserNode | null;
}

/**
 * Map Speech API error codes to user-friendly messages (kid-appropriate).
 */
function getErrorMessage(errorCode: string): SpeechRecognitionError {
  const errors: Record<string, SpeechRecognitionError> = {
    'not-allowed': {
      code: 'not-allowed',
      message: 'Microphone permission denied',
      userFriendlyMessage: 'I need to hear you! Please allow microphone access and try again.',
    },
    'no-speech': {
      code: 'no-speech',
      message: 'No speech detected',
      userFriendlyMessage: "I didn't hear anything. Tap the microphone and speak clearly!",
    },
    'audio-capture': {
      code: 'audio-capture',
      message: 'No microphone found',
      userFriendlyMessage: "I can't find a microphone. Make sure one is connected!",
    },
    'network': {
      code: 'network',
      message: 'Network error during recognition',
      userFriendlyMessage: 'Oops! Check your internet connection and try again.',
    },
    'aborted': {
      code: 'aborted',
      message: 'Recognition aborted',
      userFriendlyMessage: 'Recording was stopped. Tap the microphone to try again!',
    },
  };

  return errors[errorCode] || {
    code: errorCode,
    message: `Speech recognition error: ${errorCode}`,
    userFriendlyMessage: 'Something went wrong. Please try again!',
  };
}

/**
 * Hook for speech recognition with Web Speech API.
 */
export function useSpeechRecognition({
  languageCode,
  silenceTimeout = 3000,
  maxDuration = 8000,
}: UseSpeechRecognitionOptions): UseSpeechRecognitionReturn {
  const [state, setState] = useState<RecognitionState>('idle');
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [error, setError] = useState<SpeechRecognitionError | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxDurationRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live refs mirroring state/result so async Speech API callbacks read current
  // values instead of stale closure values (critical for reliable transitions,
  // especially on mobile where onend can fire before onresult commits).
  const stateRef = useRef<RecognitionState>('idle');
  const resultRef = useRef<RecognitionResult | null>(null);

  const setStateTracked = useCallback((s: RecognitionState) => {
    stateRef.current = s;
    setState(s);
  }, []);
  const setResultTracked = useCallback((r: RecognitionResult | null) => {
    resultRef.current = r;
    setResult(r);
  }, []);

  const isSupported = !!(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (maxDurationRef.current) {
      clearTimeout(maxDurationRef.current);
      maxDurationRef.current = null;
    }
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore errors on abort
      }
      recognitionRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setAnalyserNode(null);
  }, []);

  const startListening = useCallback(async () => {
    if (!isSupported) {
      setError({
        code: 'not-supported',
        message: 'Speech recognition not supported',
        userFriendlyMessage: 'Your browser does not support speech recognition. Please use Chrome, Edge, or Safari.',
      });
      setStateTracked('error');
      return;
    }

    // Reset previous state
    setError(null);
    setResultTracked(null);
    setStateTracked('listening');

    try {
      // Defensively tear down any leftover audio graph from a previous attempt.
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try { await audioContextRef.current.close(); } catch { /* ignore */ }
        audioContextRef.current = null;
      }

      // Request microphone access for waveform visualization
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Set up AudioContext for waveform
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      // A freshly created AudioContext often starts 'suspended' (browser autoplay
      // policy), especially on repeat use after a prior context was closed. If it
      // stays suspended the analyser emits all-zero data — the waveform freezes and
      // the mic appears dead. Resume it within this user-gesture-initiated call.
      if (audioContext.state === 'suspended') {
        try { await audioContext.resume(); } catch { /* ignore */ }
      }

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      setAnalyserNode(analyser);

      // Create speech recognition instance
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition: SpeechRecognitionInstance = new SpeechRecognition();

      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = SPEECH_RECOGNITION_LOCALES[languageCode] || 'en-US';

      // Finalize: transition to 'done' if we captured any transcript, else 'error'.
      // Idempotent — safe to call from multiple event paths (onresult/onend/timeout).
      const finalize = () => {
        if (stateRef.current === 'done' || stateRef.current === 'error' || stateRef.current === 'idle') {
          return; // already resolved
        }
        if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
        if (maxDurationRef.current) { clearTimeout(maxDurationRef.current); maxDurationRef.current = null; }
        if (safetyTimeoutRef.current) { clearTimeout(safetyTimeoutRef.current); safetyTimeoutRef.current = null; }

        // Fully release the audio graph so the next word starts from a clean slate.
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          try { audioContextRef.current.close(); } catch { /* ignore */ }
          audioContextRef.current = null;
        }
        setAnalyserNode(null);

        if (resultRef.current && resultRef.current.transcript.trim().length > 0) {
          setStateTracked('done');
        } else {
          setError(getErrorMessage('no-speech'));
          setStateTracked('error');
        }
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const lastResult = event.results[event.results.length - 1];
        const alternative = lastResult[0];

        setResultTracked({
          transcript: alternative.transcript,
          confidence: alternative.confidence,
          isFinal: lastResult.isFinal,
        });

        if (lastResult.isFinal) {
          setStateTracked('processing');
          // Some mobile browsers never fire onend after a final result — stop
          // explicitly and finalize shortly after so we never hang.
          try { recognition.stop(); } catch { /* ignore */ }
          setTimeout(finalize, 300);
          return;
        }

        // Reset silence timeout on interim speech
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          try { recognitionRef.current?.stop(); } catch { /* ignore */ }
        }, silenceTimeout);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        // "aborted"/"no-speech" after we already captured a transcript: finalize as done
        if ((event.error === 'aborted' || event.error === 'no-speech') && resultRef.current?.transcript) {
          finalize();
          return;
        }
        if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
        if (maxDurationRef.current) { clearTimeout(maxDurationRef.current); maxDurationRef.current = null; }
        if (safetyTimeoutRef.current) { clearTimeout(safetyTimeoutRef.current); safetyTimeoutRef.current = null; }
        const speechError = getErrorMessage(event.error);
        setError(speechError);
        setStateTracked('error');
        cleanup();
      };

      recognition.onend = () => {
        // Recognition ended — resolve based on whatever we captured.
        finalize();
      };

      recognitionRef.current = recognition;
      recognition.start();

      // Max duration: stop recognition (its onend/onerror will finalize)
      maxDurationRef.current = setTimeout(() => {
        try { recognitionRef.current?.stop(); } catch { /* ignore */ }
      }, maxDuration);

      // Hard safety net: if no event resolves the session (some mobile browsers
      // go silent), force a finalize so the UI can never hang on "Listening...".
      safetyTimeoutRef.current = setTimeout(() => {
        try { recognitionRef.current?.abort(); } catch { /* ignore */ }
        finalize();
      }, maxDuration + 2000);

    } catch (err: any) {
      // MediaDevices errors (permission denied, etc.)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError(getErrorMessage('not-allowed'));
      } else if (err.name === 'NotFoundError') {
        setError(getErrorMessage('audio-capture'));
      } else {
        setError({
          code: 'unknown',
          message: err.message || 'Unknown error',
          userFriendlyMessage: 'Something went wrong. Please try again!',
        });
      }
      setStateTracked('error');
      cleanup();
    }
  }, [isSupported, languageCode, silenceTimeout, maxDuration, cleanup, setStateTracked, setResultTracked]);

  const stopListening = useCallback(() => {
    // User tapped "Stop": stop recognition; its onend will finalize to done/error.
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (maxDurationRef.current) {
      clearTimeout(maxDurationRef.current);
      maxDurationRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    cleanup();
    setStateTracked('idle');
    setResultTracked(null);
    setError(null);
  }, [cleanup, setStateTracked, setResultTracked]);

  return {
    state,
    result,
    error,
    startListening,
    stopListening,
    reset,
    isSupported,
    analyserNode,
  };
}
