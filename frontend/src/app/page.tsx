'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export default function Home() {
  const [apiKey, setApiKey] = useState('');
  const [developerMessage, setDeveloperMessage] = useState('You are a helpful AI assistant.');
  const [userMessage, setUserMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentResponse]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      handleSubmit(e as React.FormEvent);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim() || !userMessage.trim()) {
      alert('Please enter both API key and message');
      return;
    }

    // Add user message to chat
    const userMsg: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setCurrentResponse('');
    setIsLoading(true);


    const apiUrl = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
                    ? 'http://127.0.0.1:8000/api/chat'
                    : '/api/chat';

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          developer_message: developerMessage,
          user_message: userMessage,
          api_key: apiKey,
          model: 'gpt-4.1-mini'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      let fullResponse = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = new TextDecoder().decode(value);
        fullResponse += chunk;
        setCurrentResponse(fullResponse);
      }

      // Add assistant response to chat
      const assistantMsg: Message = {
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMsg]);
      setUserMessage('');
      
    } catch (error) {
      console.error('Error:', error);
      alert('Error communicating with the API. Please check your API key and try again.');
    } finally {
      setIsLoading(false);
      setCurrentResponse('');
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🤖 AI Engineer Challenge
          </h1>
          <p className="text-purple-200 text-lg">
            Chat with GPT-4.1-mini using your OpenAI API key
          </p>
        </div>

        {/* API Key Input */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-6">
          <label className="block text-white font-medium mb-2">
            🔑 OpenAI API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your OpenAI API key..."
            className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
          />
          <p className="text-purple-200 text-sm mt-2">
            Your API key is stored locally and never sent to our servers
          </p>
        </div>

        {/* Developer Message Input */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-6">
          <label className="block text-white font-medium mb-2">
            ⚙️ System/Developer Message
          </label>
          <textarea
            value={developerMessage}
            onChange={(e) => setDeveloperMessage(e.target.value)}
            placeholder="Define the AI's role and behavior..."
            rows={3}
            className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent resize-none"
          />
        </div>

        {/* Chat Messages */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-6 h-96 overflow-y-auto">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/20 text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs opacity-70">
                      {message.role === 'user' ? '👤 You' : '🤖 AI'}
                    </span>
                    <span className="text-xs opacity-50">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  <div className="prose prose-invert max-w-none">
                    {message.role === 'assistant' ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                        components={{
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          code: ({ className, children, ...props }: any) => {
                            const match = /language-(\w+)/.exec(className || '');
                            const inline = !match;
                            return !inline && match ? (
                              <pre className="bg-gray-800 rounded-lg p-4 overflow-x-auto">
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              </pre>
                            ) : (
                              <code className="bg-gray-700 px-1 py-0.5 rounded text-sm" {...props}>
                                {children}
                              </code>
                            );
                          },
                          pre: ({ children }) => (
                            <div className="bg-gray-800 rounded-lg p-4 overflow-x-auto my-4">
                              {children}
                            </div>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-gray-400 pl-4 my-4 italic text-gray-300">
                              {children}
                            </blockquote>
                          ),
                          h1: ({ children }) => (
                            <h1 className="text-2xl font-bold mb-4 text-white">{children}</h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-xl font-bold mb-3 text-white">{children}</h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-lg font-bold mb-2 text-white">{children}</h3>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>
                          ),
                          li: ({ children }) => (
                            <li className="text-gray-100">{children}</li>
                          ),
                          p: ({ children }) => (
                            <p className="mb-3 text-gray-100 leading-relaxed">{children}</p>
                          ),
                          a: ({ children, href }) => (
                            <a href={href} className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">
                              {children}
                            </a>
                          ),
                          table: ({ children }) => (
                            <div className="overflow-x-auto my-4">
                              <table className="min-w-full border-collapse border border-gray-600">
                                {children}
                              </table>
                            </div>
                          ),
                          th: ({ children }) => (
                            <th className="border border-gray-600 px-4 py-2 bg-gray-700 text-left font-semibold text-white">
                              {children}
                            </th>
                          ),
                          td: ({ children }) => (
                            <td className="border border-gray-600 px-4 py-2 text-gray-100">
                              {children}
                            </td>
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    ) : (
                      <div className="whitespace-pre-wrap text-gray-100">{message.content}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Current streaming response */}
            {isLoading && currentResponse && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg px-4 py-3 bg-white/20 text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs opacity-70">🤖 AI</span>
                    <span className="text-xs opacity-50">typing...</span>
                  </div>
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                      components={{
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        code: ({ className, children, ...props }: any) => {
                          const match = /language-(\w+)/.exec(className || '');
                          const inline = !match;
                          return !inline && match ? (
                            <pre className="bg-gray-800 rounded-lg p-4 overflow-x-auto">
                              <code className={className} {...props}>
                                {children}
                              </code>
                            </pre>
                          ) : (
                            <code className="bg-gray-700 px-1 py-0.5 rounded text-sm" {...props}>
                              {children}
                            </code>
                          );
                        },
                        pre: ({ children }) => (
                          <div className="bg-gray-800 rounded-lg p-4 overflow-x-auto my-4">
                            {children}
                          </div>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-gray-400 pl-4 my-4 italic text-gray-300">
                            {children}
                          </blockquote>
                        ),
                        h1: ({ children }) => (
                          <h1 className="text-2xl font-bold mb-4 text-white">{children}</h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-xl font-bold mb-3 text-white">{children}</h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-lg font-bold mb-2 text-white">{children}</h3>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>
                        ),
                        li: ({ children }) => (
                          <li className="text-gray-100">{children}</li>
                        ),
                        p: ({ children }) => (
                          <p className="mb-3 text-gray-100 leading-relaxed">{children}</p>
                        ),
                        a: ({ children, href }) => (
                          <a href={href} className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">
                            {children}
                          </a>
                        ),
                        table: ({ children }) => (
                          <div className="overflow-x-auto my-4">
                            <table className="min-w-full border-collapse border border-gray-600">
                              {children}
                            </table>
                          </div>
                        ),
                        th: ({ children }) => (
                          <th className="border border-gray-600 px-4 py-2 bg-gray-700 text-left font-semibold text-white">
                            {children}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td className="border border-gray-600 px-4 py-2 text-gray-100">
                            {children}
                          </td>
                        ),
                      }}
                    >
                      {currentResponse}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input */}
        <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
          <div className="flex gap-4">
            <textarea
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message here... (Press Enter to send, Shift+Enter for new line)"
              disabled={isLoading}
              rows={3}
              className="flex-1 px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent disabled:opacity-50 resize-none"
            />
            <button
              type="submit"
              disabled={isLoading || !userMessage.trim()}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400 self-end"
            >
              {isLoading ? '⏳' : '🚀'}
            </button>
          </div>
          <p className="text-purple-200 text-xs mt-2">
            💡 Press <kbd className="bg-white/20 px-1 rounded">Enter</kbd> to send, <kbd className="bg-white/20 px-1 rounded">Shift+Enter</kbd> for new line
          </p>
        </form>

        
      </div>
    </div>
  );
}
