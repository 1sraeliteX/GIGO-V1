import { useEffect, useRef, useState } from 'react';
import { Bot, MessageCircle, Send, X } from 'lucide-react';
import { api } from '../services/api';
import {
  AGENT_OPTION,
  INITIAL_TOPIC_IDS,
  SUPPORT_TOPICS,
  findTopic,
  followUpOptions,
  topicOptions,
} from '../constants/supportFaq';

let idSeq = 0;
const nextId = () => ++idSeq;

const DEFAULT_OPTIONS = [...topicOptions(INITIAL_TOPIC_IDS), AGENT_OPTION];

const GREETING =
  "Hi, I'm the Tradora assistant. I can answer questions about this website: logging trades, accounts, subscriptions, reports and more. What would you like help with?";

const FALLBACK =
  "Sorry, I couldn't match that to one of my answers. Pick a topic below, or ask to talk to a human agent.";

export default function SupportChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => [
    { id: nextId(), from: 'bot', text: GREETING, options: DEFAULT_OPTIONS },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const endRef = useRef(null);
  const timers = useRef([]);
  const lastQuestionRef = useRef('');

  useEffect(() => {
    api.support.config()
      .then((data) => setWhatsappNumber(data.whatsapp_number || ''))
      .catch(() => {});
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, typing, open]);

  const pushUser = (text) => {
    lastQuestionRef.current = text;
    setMessages((prev) => [...prev, { id: nextId(), from: 'user', text }]);
  };

  const respond = (text, options = [], extra = {}) => {
    setTyping(true);
    const timer = setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [
        ...prev,
        { id: nextId(), from: 'bot', text, options, ...extra },
      ]);
    }, 550);
    timers.current.push(timer);
  };

  const respondWithAgent = () => {
    const digits = String(whatsappNumber).replace(/\D/g, '');
    if (!digits) {
      respond(
        'WhatsApp support has not been connected yet. Please try again later, or contact the site administrator.',
        DEFAULT_OPTIONS,
      );
      return;
    }
    respond(
      'No problem. Our team can take it from here on WhatsApp. Tap the button below to continue with a human agent.',
      topicOptions(INITIAL_TOPIC_IDS),
      { whatsapp: true },
    );
  };

  const handleOption = (option) => {
    if (typing) return;
    pushUser(option.label);

    if (option.value === 'agent') {
      respondWithAgent();
      return;
    }

    const topic = SUPPORT_TOPICS[option.value];
    if (!topic) {
      respond(FALLBACK, DEFAULT_OPTIONS);
      return;
    }
    respond(topic.answer, followUpOptions(option.value));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || typing) return;

    setInput('');
    pushUser(text);

    const topicId = findTopic(text);
    if (topicId === 'agent') {
      respondWithAgent();
    } else if (topicId && SUPPORT_TOPICS[topicId]) {
      respond(SUPPORT_TOPICS[topicId].answer, followUpOptions(topicId));
    } else {
      respond(FALLBACK, DEFAULT_OPTIONS);
    }
  };

  const digits = String(whatsappNumber).replace(/\D/g, '');
  const question = lastQuestionRef.current.slice(0, 180);
  const whatsappHref = digits
    ? `https://wa.me/${digits}?text=${encodeURIComponent(
        `Hi Tradora support, I need help with: ${question || 'my account'}`,
      )}`
    : '';

  const lastMessage = messages[messages.length - 1];
  const optionsForId = !typing && lastMessage?.from === 'bot' ? lastMessage.id : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Close support chat' : 'Open support chat'}
        aria-expanded={open}
        className="fixed bottom-20 right-3 sm:bottom-28 sm:right-8 z-40 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-[#fff] shadow-lg flex items-center justify-center transition-colors"
      >
        {open ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Tradora support chat"
          className="fixed z-40 right-3 sm:right-8 bottom-[140px] sm:bottom-[180px] w-[calc(100vw_-_24px)] sm:w-[380px] h-[min(540px,calc(100vh_-_170px))] sm:h-[540px] sm:max-h-[calc(100vh_-_210px)] bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-neutral-800 shrink-0">
            <img src="/logo.png" alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white leading-tight">Tradora Support</p>
              <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Automated answers
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${message.from === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.from === 'bot' && (
                  <div className="w-7 h-7 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`max-w-[85%] ${message.from === 'user' ? 'items-end' : ''} flex flex-col`}>
                  <div
                    className={`px-3 py-2 text-sm whitespace-pre-line ${
                      message.from === 'user'
                        ? 'bg-emerald-600 text-[#fff] rounded-2xl rounded-tr-sm'
                        : 'bg-neutral-800 text-neutral-300 border border-neutral-700/60 rounded-2xl rounded-tl-sm'
                    }`}
                  >
                    {message.text}
                  </div>

                  {message.whatsapp && whatsappHref && (
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-500 text-[#fff] text-sm font-semibold rounded-lg px-3 py-2.5 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Chat on WhatsApp
                    </a>
                  )}

                  {message.id === optionsForId && message.options?.length > 0 && (
                    <div className="mt-2 space-y-1.5 w-full">
                      {message.options.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleOption(option)}
                          className={`w-full text-left text-xs sm:text-sm rounded-lg px-3 py-2 border transition-colors ${
                            option.value === 'agent'
                              ? 'border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10'
                              : 'border-neutral-700 text-neutral-300 hover:border-emerald-500 hover:bg-neutral-800'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex gap-2 justify-start">
                <div className="w-7 h-7 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-neutral-800 border border-neutral-700/60 rounded-2xl rounded-tl-sm px-3 py-2.5 flex items-center gap-1">
                  {[0, 1, 2].map((dot) => (
                    <span
                      key={dot}
                      className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-bounce"
                      style={{ animationDelay: `${dot * 120}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          <form
            onSubmit={handleSubmit}
            className="border-t border-neutral-800 p-2.5 flex items-center gap-2 shrink-0"
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Type your question..."
              aria-label="Type your question"
              className="flex-1 min-w-0 bg-neutral-800 border border-neutral-700 rounded-full px-3.5 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || typing}
              aria-label="Send message"
              className="w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-[#fff] flex items-center justify-center transition-colors shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
