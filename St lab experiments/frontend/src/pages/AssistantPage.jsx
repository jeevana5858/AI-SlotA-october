window.EcoSort = window.EcoSort || {};

(function () {
  const { useState, useRef, useEffect } = React;

  const AssistantPage = () => {
    const { api, Icon } = window.EcoSort;
    const [messages, setMessages] = useState([
      {
        role: 'assistant',
        text: 'Hello! I am the EcoSort AI Recycling Assistant. Ask me whether any item is recyclable, which smart bin it belongs in, or how to avoid recycling contamination.',
        category: 'EcoSort Assistant',
        suggestions: [
          'Is a greasy pizza box recyclable?',
          'Where do aluminium cans go?',
          'How do I dispose of old batteries?',
          'Show my Eco Score stats',
        ],
      },
    ]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const endRef = useRef(null);

    useEffect(() => {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendQuestion = async (qText) => {
      const trimmed = (qText || input).trim();
      if (!trimmed || sending) return;

      setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
      setInput('');
      setSending(true);

      try {
        const res = await api.post('/api/assistant/chat', { message: trimmed });
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: res.reply,
            category: res.category,
            recyclable: res.recyclable,
            suggestions: res.suggestions || [],
          },
        ]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: `Sorry, I encountered an error: ${err.message}` },
        ]);
      } finally {
        setSending(false);
      }
    };

    const formatBold = (txt) => {
      const parts = txt.split(/\*\*(.*?)\*\*/g);
      return parts.map((p, idx) => (idx % 2 === 1 ? <strong key={idx}>{p}</strong> : p));
    };

    return (
      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-3xl border border-eco-100 dark:border-slate-800 shadow-sm flex flex-col h-[75vh]">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-eco-700 text-white flex items-center justify-center">
            <Icon name="chat" className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg">AI Recycling Assistant</h2>
            <p className="text-xs text-slate-500">Instant guidance on waste segregation, recyclability & disposal</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-eco-700 text-white rounded-br-xs'
                    : 'bg-eco-50/80 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-eco-100 dark:border-slate-700 rounded-bl-xs'
                }`}
              >
                {m.category && m.role === 'assistant' && (
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="text-[11px] font-bold uppercase text-eco-700 dark:text-eco-400">
                      {m.category}
                    </span>
                    {m.recyclable && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white dark:bg-slate-700 border border-eco-200 dark:border-slate-600">
                        {m.recyclable}
                      </span>
                    )}
                  </div>
                )}
                <div className="whitespace-pre-line">{formatBold(m.text)}</div>

                {m.suggestions && m.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-eco-200/60 dark:border-slate-700">
                    {m.suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => sendQuestion(s)}
                        className="text-xs px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-eco-200 dark:border-slate-600 hover:border-eco-500 text-eco-800 dark:text-eco-300 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="text-xs text-slate-400 italic">EcoSort Assistant is thinking...</div>
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendQuestion();
          }}
          className="p-4 border-t border-slate-100 dark:border-slate-800 flex gap-2.5"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about any item (e.g., plastic container, foil, coffee grounds)..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-eco-500 outline-none"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="px-5 py-2.5 rounded-xl bg-eco-700 hover:bg-eco-800 disabled:opacity-50 text-white font-semibold text-sm"
          >
            Send
          </button>
        </form>
      </div>
    );
  };

  window.EcoSort.AssistantPage = AssistantPage;
})();

