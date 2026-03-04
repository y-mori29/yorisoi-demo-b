import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, Loader2 } from 'lucide-react';
import { api } from '../services/api';

interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

interface Props {
    patientId: string;
    patientName: string;
}

export const PatientChatBot: React.FC<Props> = ({ patientId, patientName }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const SUGGESTIONS = [
        "前回との変更点は？",
        "最新の処方内容を教えて",
        "バイタルで気をつけることは？"
    ];

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleSend = async (text: string) => {
        if (!text.trim() || loading) return;

        const userMsg: ChatMessage = { role: 'user', text };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            // Frontend generic API call
            const historyForApi = messages.map(m => ({ role: m.role, text: m.text }));
            const res = await api.chatWithAI(patientId, text, historyForApi);

            const aiMsg: ChatMessage = { role: 'model', text: res.reply };
            setMessages(prev => [...prev, aiMsg]);
        } catch (e: any) {
            console.error(e);
            setMessages(prev => [...prev, { role: 'model', text: `エラーが発生しました: ${e.message}` }]);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-8 right-6 px-5 py-4 bg-emerald-600 text-white rounded-full shadow-2xl border-2 border-white hover:bg-emerald-700 transition-all z-[9999] flex items-center gap-2 active:scale-95 animate-[bounce_1s_ease-out_1]"
            >
                <Sparkles size={24} />
                <span className="font-bold text-sm">AIに聞く</span>
            </button>
        );
    }

    return (
        <>
            {/* Backdrop - High z-index to cover everything */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000]"
                onClick={() => setIsOpen(false)}
            />

            {/* Bottom Sheet - Higher z-index than backdrop, fixed to bottom */}
            <div className="fixed bottom-0 left-0 right-0 h-[85vh] bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden z-[10001]">
                {/* Header */}
                <div className="p-4 bg-emerald-600 text-white flex justify-between items-center shadow-md shrink-0">
                    <div className="flex items-center gap-2">
                        <Sparkles size={20} className="text-yellow-300" />
                        <div>
                            <h3 className="font-bold text-lg">AIアシスタント</h3>
                            <p className="text-xs text-emerald-100">{patientName} 様について質問</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
                    {messages.length === 0 && (
                        <div className="text-center mt-10 space-y-6">
                            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                                <Sparkles size={40} />
                            </div>
                            <p className="text-gray-500 text-sm px-4 leading-relaxed">
                                過去の記録や学習資料に基づき、<br />{patientName}様のご質問にお答えします。
                            </p>
                            <div className="grid grid-cols-1 gap-3 px-8">
                                {SUGGESTIONS.map(s => (
                                    <button
                                        key={s}
                                        onClick={() => handleSend(s)}
                                        className="text-sm bg-white border border-gray-200 p-3 rounded-xl hover:bg-emerald-50 text-left text-gray-700 transition-colors shadow-sm active:bg-emerald-100"
                                    >
                                        ✨ {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div
                                className={`max-w-[85%] p-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed shadow-sm ${msg.role === 'user'
                                    ? 'bg-emerald-600 text-white rounded-br-none'
                                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                                    }`}
                            >
                                {msg.text}
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                                <Loader2 size={16} className="animate-spin text-emerald-600" />
                                <span className="text-xs text-gray-500">解析中...</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-gray-100 shrink-0 safe-area-bottom">
                    <form
                        onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
                        className="flex gap-2"
                    >
                        <input
                            className="flex-1 border border-gray-300 rounded-full px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50"
                            placeholder="質問を入力..."
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || loading}
                            className="bg-emerald-600 text-white w-12 h-12 rounded-full flex items-center justify-center hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-md"
                        >
                            <Send size={20} />
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
};
