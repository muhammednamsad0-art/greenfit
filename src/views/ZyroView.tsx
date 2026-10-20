import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getZyroResponse } from '@/lib/zyro';
import type { AiMessage } from '@/lib/types';
import {
  Send, Sparkles, Bot, User, Trash2, Mic, MicOff, Volume2,
  Play, Pause, Square, Settings2,
} from 'lucide-react';

interface RecognitionAlternativeLike {
  transcript: string;
}

interface RecognitionResultLike extends ArrayLike<RecognitionAlternativeLike> {
  isFinal: boolean;
}

interface RecognitionResultEvent extends Event {
  results: ArrayLike<RecognitionResultLike>;
}

interface RecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

const SUGGESTIONS = [
  'How much water should I drink?',
  'What exercises can I do at home?',
  'I feel stressed about exams',
  'How can I be more eco-friendly at school?',
  'Tips for better sleep?',
  'How can I reduce my carbon footprint?',
];

export function ZyroView() {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [speechRate, setSpeechRate] = useState(1);
  const [recognitionLanguage, setRecognitionLanguage] = useState(() =>
    typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('ml') ? 'ml-IN' : 'en-US'
  );
  const [recognitionSupported, setRecognitionSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [speechStatus, setSpeechStatus] = useState<'idle' | 'speaking' | 'paused' | 'finished'>('idle');
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [latestAnswerId, setLatestAnswerId] = useState<string | null>(null);
  const [voiceNotice, setVoiceNotice] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recognitionHandledRef = useRef(false);
  const speechRunRef = useRef(0);
  const responseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);
  const speechSynthesisSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => {
    mountedRef.current = true;
    loadMessages();

    const speechWindow = window as SpeechRecognitionWindow;
    setRecognitionSupported(Boolean(speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition));

    function updateVoices() {
      if (speechSynthesisSupported) setVoices(window.speechSynthesis.getVoices());
    }

    updateVoices();
    if (speechSynthesisSupported) window.speechSynthesis.addEventListener('voiceschanged', updateVoices);

    return () => {
      mountedRef.current = false;
      if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      speechRunRef.current += 1;
      if (speechSynthesisSupported) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.removeEventListener('voiceschanged', updateVoices);
      }
    };
  }, [speechSynthesisSupported]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinking]);

  async function loadMessages() {
    const { data } = await supabase.from('ai_messages').select('*').order('created_at').limit(50);
    if (!mountedRef.current) return;
    if (data && data.length > 0) {
      setMessages(data);
    } else {
      const greeting: AiMessage = {
        id: 'greeting',
        role: 'assistant',
        content: "Hi! I'm ZYRO, your health and eco assistant. Ask me anything about health, exercise, stress, wellbeing, or the environment!",
        created_at: new Date().toISOString(),
      };
      setMessages([greeting]);
    }
  }

  async function sendMessage(text: string) {
    if (!text.trim() || thinking) return;
    stopSpeech();
    setVoiceNotice('');
    const temporaryUserId = `temp-user-${Date.now()}`;
    const userMsg: AiMessage = {
      id: temporaryUserId,
      role: 'user',
      content: text.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setThinking(true);

    const { data: savedUser } = await supabase
      .from('ai_messages')
      .insert({ role: 'user', content: text.trim() })
      .select()
      .single();

    if (!mountedRef.current) return;
    responseTimerRef.current = setTimeout(async () => {
      const response = getZyroResponse(text.trim());
      const { data: savedBot } = await supabase
        .from('ai_messages')
        .insert({ role: 'assistant', content: response.text })
        .select()
        .single();

      const assistantMessage: AiMessage = savedBot || {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.text,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => {
        const withoutTemp = prev.filter((message) => message.id !== temporaryUserId);
        const withUser = savedUser ? [...withoutTemp, savedUser] : [...withoutTemp, userMsg];
        return [...withUser, assistantMessage];
      });
      setThinking(false);
      setLatestAnswerId(assistantMessage.id);
      if (autoSpeak) speakAnswer(response.text, assistantMessage.id);
      responseTimerRef.current = null;
    }, 800 + Math.random() * 600);
  }

  async function clearChat() {
    stopSpeech();
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setListening(false);
    setThinking(false);
    if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
    responseTimerRef.current = null;
    setLatestAnswerId(null);
    await supabase.from('ai_messages').delete().neq('id', '00000000');
    if (!mountedRef.current) return;
    setMessages([{
      id: 'greeting',
      role: 'assistant',
      content: "Hi! I'm ZYRO, your health and eco assistant. Ask me anything about health, exercise, stress, wellbeing, or the environment!",
      created_at: new Date().toISOString(),
    }]);
  }

  function stopSpeech() {
    speechRunRef.current += 1;
    if (speechSynthesisSupported) window.speechSynthesis.cancel();
    setSpeechStatus('idle');
    setSpeakingMessageId(null);
  }

  function speakAnswer(text: string, messageId: string) {
    if (!speechSynthesisSupported) {
      setVoiceNotice('Spoken answers are not supported by this browser. You can still read the text reply.');
      return;
    }

    const runId = speechRunRef.current + 1;
    speechRunRef.current = runId;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const isMalayalam = /[\u0D00-\u0D7F]/u.test(text);
    const targetLanguage = isMalayalam ? 'ml' : 'en';
    const chosenVoice = voices.find((voice) => voice.voiceURI === selectedVoice);
    const matchingVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith(targetLanguage));
    const voice = chosenVoice?.lang.toLowerCase().startsWith(targetLanguage)
      ? chosenVoice
      : matchingVoice || chosenVoice;

    utterance.lang = voice?.lang || (isMalayalam ? 'ml-IN' : 'en-US');
    if (voice) utterance.voice = voice;
    utterance.rate = speechRate;
    utterance.onstart = () => {
      if (!mountedRef.current || speechRunRef.current !== runId) return;
      setSpeechStatus('speaking');
      setSpeakingMessageId(messageId);
    };
    utterance.onend = () => {
      if (!mountedRef.current || speechRunRef.current !== runId) return;
      setSpeechStatus('finished');
      setSpeakingMessageId(null);
    };
    utterance.onerror = (event) => {
      if (!mountedRef.current || speechRunRef.current !== runId || event.error === 'canceled' || event.error === 'interrupted') return;
      setSpeechStatus('idle');
      setSpeakingMessageId(null);
      setVoiceNotice('Voice playback did not start. Your text answer is still available to read.');
    };

    setVoiceNotice('');
    setSpeakingMessageId(messageId);
    window.speechSynthesis.speak(utterance);
  }

  function toggleSpeech(text: string, messageId: string) {
    if (!speechSynthesisSupported) {
      speakAnswer(text, messageId);
    } else if (speakingMessageId === messageId && speechStatus === 'speaking') {
      window.speechSynthesis.pause();
      setSpeechStatus('paused');
    } else if (speakingMessageId === messageId && speechStatus === 'paused') {
      window.speechSynthesis.resume();
      setSpeechStatus('speaking');
    } else {
      speakAnswer(text, messageId);
    }
  }

  function startListening() {
    const speechWindow = window as SpeechRecognitionWindow;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceNotice('Voice input is not supported by this browser. Type your question instead.');
      return;
    }

    stopSpeech();
    setVoiceNotice('');
    recognitionHandledRef.current = false;
    const recognition = new Recognition();
    recognition.lang = recognitionLanguage;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      const results = Array.from(event.results);
      const transcript = results.map((result) => result[0]?.transcript || '').join(' ').trim();
      if (transcript) setInput(transcript);

      const finalTranscript = results
        .filter((result) => result.isFinal)
        .map((result) => result[0]?.transcript || '')
        .join(' ')
        .trim();
      if (finalTranscript && !recognitionHandledRef.current) {
        recognitionHandledRef.current = true;
        recognitionRef.current = null;
        setListening(false);
        sendMessage(finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      if (recognitionRef.current !== recognition) return;
      recognitionRef.current = null;
      setListening(false);
      setVoiceNotice(event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? 'Microphone permission was denied. You can still type your question.'
        : 'Voice input could not be started. Please type your question instead.');
    };

    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return;
      recognitionRef.current = null;
      setListening(false);
    };

    try {
      recognition.start();
      setListening(true);
    } catch {
      recognitionRef.current = null;
      setListening(false);
      setVoiceNotice('Voice input could not be started. Please type your question instead.');
    }
  }

  function stopListening() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }

  const activityStatus = thinking
    ? 'Thinking'
    : listening
    ? 'Listening'
    : speechStatus === 'speaking'
    ? 'Speaking'
    : speechStatus === 'paused'
    ? 'Paused'
    : speechStatus === 'finished'
    ? 'Finished'
    : 'Ready';

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[400px]">
      {/* Header */}
      <div className="glass rounded-2xl p-4 mb-3 flex items-center gap-3">
        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 shadow-lg ${speechStatus === 'speaking' ? 'animate-pulse' : ''}`}>
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-display font-bold text-slate-800">ZYRO AI Assistant</h3>
          <p className="text-xs text-slate-500">Health, wellbeing & eco guidance</p>
        </div>
        <button
          onClick={clearChat}
          aria-label="Clear chat"
          title="Clear chat"
          className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <section className="glass rounded-2xl p-3 mb-3" aria-label="Voice controls">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2" role="status" aria-live="polite">
            <span className={`w-2.5 h-2.5 rounded-full ${activityStatus === 'Speaking' ? 'bg-teal-500 animate-pulse' : activityStatus === 'Listening' ? 'bg-rose-500 animate-pulse' : 'bg-slate-300'}`} />
            <span className="text-sm font-bold text-slate-600">{activityStatus}</span>
          </div>
          <details>
            <summary className="min-h-11 px-3 rounded-xl text-sm font-bold text-teal-700 bg-white/60 flex items-center gap-2 cursor-pointer list-none">
              <Settings2 className="w-4 h-4" />
              Voice settings
            </summary>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-200/70">
              <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={autoSpeak}
                  onChange={(event) => setAutoSpeak(event.target.checked)}
                  className="w-5 h-5 accent-teal-600"
                />
                Speak new answers automatically
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
                Voice
                <select
                  value={selectedVoice}
                  onChange={(event) => setSelectedVoice(event.target.value)}
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white/80 px-3 text-sm text-slate-700"
                >
                  <option value="">Automatic (match answer language)</option>
                  {voices.map((voice) => (
                    <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} ({voice.lang})</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
                Speaking speed
                <select
                  value={speechRate}
                  onChange={(event) => setSpeechRate(Number(event.target.value))}
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white/80 px-3 text-sm text-slate-700"
                >
                  <option value={0.8}>Slow</option>
                  <option value={1}>Normal</option>
                  <option value={1.2}>Fast</option>
                  <option value={1.4}>Faster</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
                Microphone language
                <select
                  value={recognitionLanguage}
                  onChange={(event) => setRecognitionLanguage(event.target.value)}
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white/80 px-3 text-sm text-slate-700"
                >
                  <option value="en-US">English</option>
                  <option value="ml-IN">Malayalam</option>
                </select>
              </label>
            </div>
          </details>
        </div>
        {recognitionSupported === false && (
          <p className="mt-2 text-xs text-slate-500">Voice input is not available in this browser. You can still type questions and listen to answers.</p>
        )}
        {!speechSynthesisSupported && (
          <p className="mt-2 text-xs text-slate-500">Spoken answers are not available in this browser. Text chat remains available.</p>
        )}
        {voiceNotice && <p className="mt-2 text-sm text-amber-700" role="alert">{voiceNotice}</p>}
      </section>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 animate-slide-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`inline-flex items-center justify-center w-8 h-8 rounded-xl shrink-0 ${msg.id === speakingMessageId && speechStatus === 'speaking' ? 'animate-pulse' : ''} ${
              msg.role === 'user'
                ? 'bg-gradient-to-br from-blue-400 to-indigo-500'
                : 'bg-gradient-to-br from-teal-400 to-cyan-500'
            }`}>
              {msg.role === 'user' ? (
                <User className="w-4 h-4 text-white" />
              ) : (
                <Bot className="w-4 h-4 text-white" />
              )}
            </div>
            <div className={`min-w-0 max-w-[90%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white rounded-tr-sm'
                : 'glass text-slate-700 rounded-tl-sm'
            }`}>
              <p className="text-sm whitespace-pre-line break-words">{msg.content}</p>
              {msg.role === 'assistant' && msg.id === latestAnswerId && (
                <div className="flex flex-wrap gap-2 mt-3" aria-label="Answer playback controls">
                  <button
                    type="button"
                    onClick={() => toggleSpeech(msg.content, msg.id)}
                    className="min-h-10 px-3 rounded-xl bg-white/70 text-teal-700 text-xs font-bold flex items-center gap-1.5"
                    aria-label={speakingMessageId === msg.id && speechStatus === 'speaking' ? 'Pause answer' : speakingMessageId === msg.id && speechStatus === 'paused' ? 'Resume answer' : 'Replay answer'}
                  >
                    {speakingMessageId === msg.id && speechStatus === 'speaking'
                      ? <><Pause className="w-4 h-4" /> Pause</>
                      : speakingMessageId === msg.id && speechStatus === 'paused'
                      ? <><Play className="w-4 h-4" /> Resume</>
                      : <><Volume2 className="w-4 h-4" /> Replay</>}
                  </button>
                  <button
                    type="button"
                    onClick={stopSpeech}
                    disabled={speakingMessageId !== msg.id || (speechStatus !== 'speaking' && speechStatus !== 'paused')}
                    className="min-h-10 px-3 rounded-xl bg-white/70 text-slate-600 text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
                    aria-label="Stop answer audio"
                  >
                    <Square className="w-3.5 h-3.5" /> Stop
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex gap-2 animate-slide-up">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="glass rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="px-3 py-1.5 rounded-full bg-white/70 border border-teal-200 text-xs font-semibold text-teal-700 hover:bg-teal-50 active:scale-95 transition-all"
            >
              <Sparkles className="w-3 h-3 inline mr-1" />
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={(event) => { event.preventDefault(); sendMessage(input); }}
        className="flex gap-2 mt-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask ZYRO anything..."
          aria-label="Ask ZYRO a question"
          className="min-w-0 flex-1 px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-teal-400 outline-none text-slate-700 bg-white/70"
        />
        <button
          type="button"
          onClick={listening ? stopListening : startListening}
          disabled={thinking || recognitionSupported === false}
          className={`w-12 h-12 shrink-0 rounded-2xl shadow-lg flex items-center justify-center active:scale-90 transition-all disabled:opacity-40 ${listening ? 'bg-rose-500 text-white' : 'bg-white text-teal-700'}`}
          aria-label={listening ? 'Stop listening' : 'Ask by voice'}
          title={recognitionSupported === false ? 'Voice input is not supported in this browser' : listening ? 'Stop listening' : 'Ask by voice'}
        >
          {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
        <button
          type="submit"
          disabled={!input.trim() || thinking}
          className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 text-white shadow-lg flex items-center justify-center active:scale-90 transition-all disabled:opacity-40"
          aria-label="Send question"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
