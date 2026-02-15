/**
 * Type definitions for Web Speech API
 */

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  
  start(): void;
  stop(): void;
  abort(): void;
  
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  onaudiostart: (() => void) | null;
  onaudioend: (() => void) | null;
  onsoundstart: (() => void) | null;
  onsoundend: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onnomatch: ((event: SpeechRecognitionEvent) => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
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

interface SpeechRecognitionErrorEvent extends Event {
  error: 'no-speech' | 'aborted' | 'audio-capture' | 'network' | 'not-allowed' | 'service-not-allowed' | 'bad-grammar' | 'language-not-supported';
  message: string;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

declare var webkitSpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

interface Window {
  SpeechRecognition: typeof SpeechRecognition;
  webkitSpeechRecognition: typeof SpeechRecognition;
  speechSynthesis: SpeechSynthesis;
}

// Speech Synthesis (Text-to-Speech) API
interface SpeechSynthesis extends EventTarget {
  readonly pending: boolean;
  readonly speaking: boolean;
  readonly paused: boolean;
  
  speak(utterance: SpeechSynthesisUtterance): void;
  cancel(): void;
  pause(): void;
  resume(): void;
  getVoices(): SpeechSynthesisVoice[];
  
  onvoiceschanged: ((event: Event) => void) | null;
}

interface SpeechSynthesisUtterance extends EventTarget {
  text: string;
  lang: string;
  voice: SpeechSynthesisVoice | null;
  volume: number;
  rate: number;
  pitch: number;
  
  onstart: ((event: SpeechSynthesisEvent) => void) | null;
  onend: ((event: SpeechSynthesisEvent) => void) | null;
  onerror: ((event: SpeechSynthesisErrorEvent) => void) | null;
  onpause: ((event: SpeechSynthesisEvent) => void) | null;
  onresume: ((event: SpeechSynthesisEvent) => void) | null;
  onmark: ((event: SpeechSynthesisEvent) => void) | null;
  onboundary: ((event: SpeechSynthesisEvent) => void) | null;
}

interface SpeechSynthesisEvent extends Event {
  readonly utterance: SpeechSynthesisUtterance;
  readonly charIndex: number;
  readonly charLength: number;
  readonly elapsedTime: number;
  readonly name: string;
}

interface SpeechSynthesisErrorEvent extends SpeechSynthesisEvent {
  readonly error: 'canceled' | 'interrupted' | 'audio-busy' | 'audio-hardware' | 'network' | 'synthesis-unavailable' | 'synthesis-failed' | 'language-unavailable' | 'voice-unavailable' | 'text-too-long' | 'invalid-argument' | 'not-allowed';
}

interface SpeechSynthesisVoice {
  readonly voiceURI: string;
  readonly name: string;
  readonly lang: string;
  readonly localService: boolean;
  readonly default: boolean;
}

declare var SpeechSynthesisUtterance: {
  prototype: SpeechSynthesisUtterance;
  new(text?: string): SpeechSynthesisUtterance;
};
