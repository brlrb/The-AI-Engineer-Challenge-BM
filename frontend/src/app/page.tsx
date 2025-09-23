'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Settings, Upload, FileText, X, Trash2, Bot, Key, Cpu, Palette } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  imageUrl?: string; // For user messages with images
}

interface UploadedFile {
  name: string;
  type: string;
  size: number;
  url?: string; // For image preview
  fileType: 'document' | 'image';
}

// Placeholder messages for empty chat state
const PLACEHOLDER_MESSAGES = [
  "👋 Hi there! What's on your mind today?",
  "Start a conversation… I'm here to help.",
  "Ask me anything — from quick facts to deep dives.",
  "Type your question or task below on the chat window...",
  "Need ideas? Try: 'Summarize this article' or 'Plan a 3-day trip to Paris'.",
  "What would you like to do today? (Brainstorm, Research, Write, Plan…)",
  "✨ Got a thought? Let's explore it together.",
  "Ask me anything — serious or silly.",
  "🤔 Not sure where to start? Try: 'Tell me something interesting'."
];

export default function Home() {
  const [apiKey, setApiKey] = useState('');
  const [userMessage, setUserMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [provider, setProvider] = useState('openai');
  const [model, setModel] = useState('gpt-4o-mini');
  const [tone, setTone] = useState(50);
  const [clarity, setClarity] = useState(50);
  const [professionalism, setProfessionalism] = useState(50);
  const [engagement, setEngagement] = useState(50);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [hasContext, setHasContext] = useState(false);
  const [placeholderMessage, setPlaceholderMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  };

  // Function to get a random placeholder message
  const getRandomPlaceholderMessage = () => {
    const randomIndex = Math.floor(Math.random() * PLACEHOLDER_MESSAGES.length);
    return PLACEHOLDER_MESSAGES[randomIndex];
  };

  const getAvailableModels = () => {
    if (provider === 'openai') {
      return [
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
        { value: 'gpt-4o', label: 'GPT-4o' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
      ];
    } else if (provider === 'gemini') {
      return [
        { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
        { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
        { value: 'gemini-1.0-pro', label: 'Gemini 1.0 Pro' },
      ];
    } else if (provider === 'together') {
      return [
        { value: 'meta-llama/Llama-3.1-8B-Instruct-Turbo', label: 'Llama 3.1 8B Instruct Turbo' },
        { value: 'meta-llama/Llama-3.1-70B-Instruct-Turbo', label: 'Llama 3.1 70B Instruct Turbo' },
        { value: 'meta-llama/Meta-Llama-3-8B-Instruct', label: 'Llama 3 8B Instruct' },
        { value: 'meta-llama/Meta-Llama-3-70B-Instruct', label: 'Llama 3 70B Instruct' },
        { value: 'mistralai/Mixtral-8x7B-Instruct-v0.1', label: 'Mixtral 8x7B Instruct' },
        { value: 'mistralai/Mistral-7B-Instruct-v0.3', label: 'Mistral 7B Instruct' },
        { value: 'Qwen/Qwen2.5-7B-Instruct', label: 'Qwen 2.5 7B Instruct' },
      ];
    }
    return [];
  };

  const getApiKeyLabel = () => {
    if (provider === 'openai') {
      return '🔑 OpenAI API Key';
    } else if (provider === 'gemini') {
      return '🔑 Google Gemini API Key';
    } else if (provider === 'together') {
      return '🔑 Together AI API Key';
    }
    return '🔑 API Key';
  };

  const getApiKeyPlaceholder = () => {
    if (provider === 'openai') {
      return 'Enter your OpenAI API key...';
    } else if (provider === 'gemini') {
      return 'Enter your Google Gemini API key...';
    } else if (provider === 'together') {
      return 'Enter your Together AI API key...';
    }
    return 'Enter your API key...';
  };

  const getProviderDisplayName = () => {
    if (provider === 'openai') {
      return 'OpenAI';
    } else if (provider === 'gemini') {
      return 'Google Gemini';
    } else if (provider === 'together') {
      return 'Together AI';
    }
    return provider;
  };

  // Update model and reset API key when provider changes
  useEffect(() => {
    const models = getAvailableModels();
    if (models.length > 0) {
      setModel(models[0].value);
    }
    // Reset API key when switching providers since each provider needs different keys
    setApiKey('');
  }, [provider]);

  useEffect(() => {
    // Only scroll to bottom if there are messages or a response is being streamed
    if (messages.length > 0 || currentResponse) {
      scrollToBottom();
    }
  }, [messages, currentResponse]);

  // Initialize placeholder message on component mount
  useEffect(() => {
    setPlaceholderMessage(getRandomPlaceholderMessage());
  }, []);

  // Change placeholder message periodically when chat is empty
  useEffect(() => {
    if (messages.length === 0) {
      const interval = setInterval(() => {
        setPlaceholderMessage(getRandomPlaceholderMessage());
      }, 5000); // Change every 5 seconds

      return () => clearInterval(interval);
    }
  }, [messages.length]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      handleSubmit(e as React.FormEvent);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Submit clicked - API key:', apiKey, 'Message:', userMessage);
    console.log('API key trimmed length:', apiKey.trim().length);
    console.log('Message trimmed length:', userMessage.trim().length);
    
    if (!apiKey.trim() || !userMessage.trim()) {
      alert('Please enter both API key and message');
      return;
    }

    // Add user message to chat
    const userMsg: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
      imageUrl: uploadedFile && uploadedFile.fileType === 'image' ? uploadedFile.url : undefined
    };
    
    setMessages(prev => [...prev, userMsg]);
    setCurrentResponse('');
    setIsLoading(true);


    const apiUrl = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
                    ? 'http://127.0.0.1:8000/api/chat'
                    : '/api/chat';

    try {
      console.log('Submitting to API with model:', model);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_message: userMessage,
          api_key: apiKey,
          provider,
          model,
          style: {
            tone,
            clarity,
            professionalism,
            engagement,
          },
          has_context: hasContext
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('File selected:', file.name, file.type, file.size);

    // Check if API key is provided
    if (!apiKey.trim()) {
      alert('Please enter your API key before uploading a file.');
      return;
    }

    console.log('API key provided, starting upload...');

    // Validate file type
    const allowedTypes = ['application/pdf', 'text/plain', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload only PDF, TXT, or JPG/JPEG files.');
      return;
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('File size must be less than 10MB.');
      return;
    }

    // Determine file type
    const isImage = file.type.startsWith('image/');
    const fileType = isImage ? 'image' : 'document';

    setIsUploading(true);
    setIsParsing(true);
    
    // Create preview URL for images
    const fileUrl = isImage ? URL.createObjectURL(file) : undefined;
    
    setUploadedFile({
      name: file.name,
      type: file.type,
      size: file.size,
      url: fileUrl,
      fileType: fileType
    });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);

      const apiUrl = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
                      ? 'http://127.0.0.1:8000/api/upload'
                      : '/api/upload';

      console.log('Uploading to:', apiUrl);
      console.log('FormData contents:', Array.from(formData.entries()));

      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `Upload failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('File uploaded and processed:', result);
      console.log('Setting hasContext to true');
      setHasContext(true);
      
      // Add automatic AI prompt message
      const fileName = file.name;
      const fileExtension = fileName.split('.').pop()?.toUpperCase() || '';
      const autoPromptMsg: Message = {
        role: 'assistant',
        content: isImage
          ? `🎉 Great! I've successfully uploaded your image "${fileName}" and I'm now ready to analyze it and answer questions about what I see. What would you like to know about this image?`
          : `🎉 Great! I've successfully analyzed your ${fileExtension} document "${fileName}" and I'm now ready to answer questions based on its content. What would you like to know about this document?`,
        timestamp: new Date()
      };
      console.log('Adding auto prompt message:', autoPromptMsg);
      setMessages(prev => [...prev, autoPromptMsg]);

    } catch (error) {
      console.error('Upload error:', error);
      alert(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setUploadedFile(null);
    } finally {
      setIsUploading(false);
      setIsParsing(false);
    }
  };

  const removeUploadedFile = () => {
    if (uploadedFile?.url) {
      URL.revokeObjectURL(uploadedFile.url);
    }
    setUploadedFile(null);
    setHasContext(false);
    setIsParsing(false);
    setMessages(prev => prev.filter(msg => msg.role !== 'system'));
  };

  const clearChat = () => {
    setMessages([]);
    setCurrentResponse('');
    setUserMessage('');
    // Don't clear uploaded file or context as user might want to continue with the same document
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Settings Button - Top Left */}
      <div className="absolute top-4 right-4 z-10">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" data-settings-trigger>
              <Settings className="h-4 w-4" />
              <span className="sr-only">Open settings</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[400px] sm:w-[540px] flex flex-col">
            <SheetHeader className="flex-shrink-0">
              <SheetTitle style={{ color: '#266CA9' }} className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Settings
              </SheetTitle>
            </SheetHeader>
            
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-1">
              {/* AI Configuration Section */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6 mt-6">
                <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  AI Configuration
                </h3>
                
                <div className="space-y-5">
                  {/* Provider Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      AI Provider
                    </label>
                    <select
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent text-sm"
                      style={{ '--tw-ring-color': '#266CA9' } as React.CSSProperties}
                    >
                      <option value="openai">OpenAI</option>
                      <option value="gemini">Google Gemini</option>
                      <option value="together">Together AI</option>
                    </select>
                  </div>

                  {/* API Key Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      {getApiKeyLabel().replace('🔑 ', '')}
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={getApiKeyPlaceholder()}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent text-sm"
                      style={{ '--tw-ring-color': '#266CA9' } as React.CSSProperties}
                    />
                    <p className="text-gray-500 text-xs">
                      Your API key is stored locally and never sent to our servers
                    </p>
                  </div>

                  {/* Model Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Cpu className="h-4 w-4" />
                      Model Selection
                    </label>
                    <select
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent text-sm"
                      style={{ '--tw-ring-color': '#266CA9' } as React.CSSProperties}
                    >
                      {getAvailableModels().map((modelOption) => (
                        <option key={modelOption.value} value={modelOption.value}>
                          {modelOption.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-gray-500 text-xs">
                      Choose a model. Mini/Nano are faster and cheaper; others are higher quality and more expensive.
                    </p>
                  </div>
                </div>
              </div>

              {/* Response Style Section */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Response Style
                </h3>
                
                <div className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Tone (casual)</span>
                      <span>formal</span>
                    </div>
                    <input 
                      type="range" 
                      min={0} 
                      max={100} 
                      value={tone} 
                      onChange={(e) => setTone(Number(e.target.value))} 
                      className="w-full"
                      style={{ accentColor: '#266CA9' }} 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Clarity (confusing)</span>
                      <span>clear</span>
                    </div>
                    <input 
                      type="range" 
                      min={0} 
                      max={100} 
                      value={clarity} 
                      onChange={(e) => setClarity(Number(e.target.value))} 
                      className="w-full"
                      style={{ accentColor: '#266CA9' }} 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Professionalism (informal)</span>
                      <span>polished</span>
                    </div>
                    <input 
                      type="range" 
                      min={0} 
                      max={100} 
                      value={professionalism} 
                      onChange={(e) => setProfessionalism(Number(e.target.value))} 
                      className="w-full"
                      style={{ accentColor: '#266CA9' }} 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Engagement (dull)</span>
                      <span>engaging</span>
                    </div>
                    <input 
                      type="range" 
                      min={0} 
                      max={100} 
                      value={engagement} 
                      onChange={(e) => setEngagement(Number(e.target.value))} 
                      className="w-full"
                      style={{ accentColor: '#266CA9' }} 
                    />
                  </div>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-5">
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#266CA9' }}>
            🤖 AIM Challenge
          </h1>
          <p className="text-black text-sm">
            Using <span className="font-semibold text-black">{model}</span> from <span className="font-semibold text-black">{getProviderDisplayName()}</span>
            {!apiKey.trim() && (
              <span className="text-red-500 text-sm ml-2">• Missing API key. <button 
                onClick={() => {
                  // Trigger the settings sheet to open
                  const settingsButton = document.querySelector('[data-settings-trigger]') as HTMLButtonElement;
                  settingsButton?.click();
                }}
                className="hover:text-red-700 cursor-pointer transition-colors border-b-2 border-dotted border-red-500 hover:border-red-700"
              >
                Click to add
              </button>.</span>
            )}
          </p>
        </div>


        {/* Chat Toolbar */}
        <div className="bg-[#FAFAFA] backdrop-blur-sm rounded-t-lg border-t border-l border-r border-[#bbb] px-6 py-3 flex justify-end items-center">
          {messages.length > 0 && (
            <Button
              onClick={clearChat}
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Clear chat history"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear Chat
            </Button>
          )}
        </div>

        {/* Chat Messages */}
        <div className="bg-[#FAFAFA] backdrop-blur-sm rounded-b-lg p-6 mb-6 h-105 overflow-y-auto border-l border-r border-b border-[#bbb]">
          <div className="space-y-4">
            {/* Placeholder message when chat is empty */}
            {messages.length === 0 && !isLoading && !isParsing && (
              <div className="flex justify-center items-center h-full">
                <div className="text-center">
                  <div className="text-2xl mb-4">💬</div>
                  <p className="text-[#696969] text-lg font-medium animate-pulse">
                    {placeholderMessage}
                  </p>
                </div>
              </div>
            )}
            
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-[#ECECEC] text-gray-900'
                      : 'bg-transparent text-[#696969]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs opacity-70">
                      {message.role === 'user' ? '👤 You' : `🤖 ${model} (${getProviderDisplayName()})`}
                    </span>
                    <span className="text-xs opacity-50">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  <div className="prose max-w-none">
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
                            <h1 className="text-2xl font-bold mb-4 text-[#696969]">{children}</h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-xl font-bold mb-3 text-[#696969]">{children}</h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-lg font-bold mb-2 text-[#696969]">{children}</h3>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>
                          ),
                          li: ({ children }) => (
                            <li className="text-[#696969]">{children}</li>
                          ),
                          p: ({ children }) => (
                            <p className="mb-3 text-[#696969] leading-relaxed">{children}</p>
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
                            <th className="border border-gray-600 px-4 py-2 bg-transparent text-left font-semibold text-[#696969]">
                              {children}
                            </th>
                          ),
                          td: ({ children }) => (
                            <td className="border border-gray-600 px-4 py-2 text-[#696969]">
                              {children}
                            </td>
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    ) : (
                      <div className="space-y-3">
                        <div className="whitespace-pre-wrap text-gray-900">{message.content}</div>
                        {message.imageUrl && (
                          <div className="mt-3">
                            <img 
                              src={message.imageUrl} 
                              alt="Uploaded image"
                              className="max-w-full max-h-48 object-contain rounded-lg shadow-sm border border-gray-200"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Document parsing indicator */}
            {isParsing && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg px-4 py-3 bg-blue-50 border border-blue-200 text-blue-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs opacity-70">📄 AI</span>
                    <span className="inline-block h-4 w-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                    <span className="text-sm">Processing document... Please wait while I analyze the content.</span>
                  </div>
                </div>
              </div>
            )}

            {/* Waiting spinner before any response arrives */}
            {isLoading && !currentResponse && !isParsing && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg px-4 py-3 bg-transparent text-[#696969]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs opacity-70">🤖 {model} ({getProviderDisplayName()})</span>
                    <span className="inline-block h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  </div>
                </div>
              </div>
            )}

            {/* Current streaming response */}
            {isLoading && currentResponse && !isParsing && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg px-4 py-3 bg-transparent text-[#696969]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs opacity-70">🤖 {model} ({getProviderDisplayName()})</span>
                    <span className="text-xs opacity-50">typing...</span>
                  </div>
                  <div className="prose max-w-none">
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
                          <h1 className="text-2xl font-bold mb-4 text-[#696969]">{children}</h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-xl font-bold mb-3 text-[#696969]">{children}</h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-lg font-bold mb-2 text-[#696969]">{children}</h3>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>
                        ),
                        li: ({ children }) => (
                          <li className="text-[#696969]">{children}</li>
                        ),
                        p: ({ children }) => (
                          <p className="mb-3 text-[#696969] leading-relaxed">{children}</p>
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
                          <th className="border border-gray-600 px-4 py-2 bg-transparent text-left font-semibold text-[#696969]">
                            {children}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td className="border border-gray-600 px-4 py-2 text-[#696969]">
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
        <form onSubmit={handleSubmit} className="">
          <div className="flex gap-4">
            <div className="flex-1 flex flex-col gap-4">
              {/* File Upload Section */}
              <div>
                {!uploadedFile ? (
                  <div className="flex items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.txt,.jpg,.jpeg,image/jpeg,image/jpg"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }}
                      disabled={isUploading || isParsing || !apiKey.trim()}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm"
                      variant="outline"
                      size="sm"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {isUploading ? 'Uploading...' : isParsing ? 'Processing...' : 'Upload File'}
                    </Button>
                    <p className="text-xs text-gray-500">Max 10MB • PDF, TXT, or JPG/JPEG files</p>
                  </div>
                ) : (
                  <div className={`flex items-center gap-3 rounded-lg px-4 py-3 ${
                    uploadedFile.fileType === 'image' 
                      ? 'bg-blue-50 border border-blue-200' 
                      : 'bg-green-50 border border-green-200'
                  }`}>
                    {uploadedFile.fileType === 'image' ? (
                      <img 
                        src={uploadedFile.url} 
                        alt={uploadedFile.name}
                        className="h-8 w-8 object-cover rounded"
                      />
                    ) : (
                      <FileText className="h-5 w-5 text-green-600" />
                    )}
                    <div className="flex flex-col flex-1">
                      <span className={`text-sm font-medium ${
                        uploadedFile.fileType === 'image' ? 'text-blue-800' : 'text-green-800'
                      }`}>
                        {uploadedFile.name}
                      </span>
                      <span className={`text-xs ${
                        uploadedFile.fileType === 'image' ? 'text-blue-600' : 'text-green-600'
                      }`}>
                        {formatFileSize(uploadedFile.size)}
                      </span>
                    </div>
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        removeUploadedFile();
                      }}
                      size="sm"
                      variant="ghost"
                      className={`h-8 w-8 p-0 hover:bg-opacity-20 ${
                        uploadedFile.fileType === 'image' 
                          ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-100' 
                          : 'text-green-600 hover:text-green-800 hover:bg-green-100'
                      }`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <textarea
                ref={textareaRef}
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                onInput={adjustTextareaHeight}
                onKeyDown={handleKeyDown}
                placeholder={isParsing ? "Document is being processed... Please wait..." : "Type your message here... (Press Enter to send, Shift+Enter for new line)"}
                disabled={isLoading || isParsing}
                rows={2}
                className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 placeholder:text-sm focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 resize-none overflow-hidden"
                style={{ '--tw-ring-color': '#266CA9' } as React.CSSProperties}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || isParsing || !userMessage.trim() || !apiKey.trim()}
              onClick={(e) => {
                if (!apiKey.trim() || !userMessage.trim()) {
                  e.preventDefault();
                  alert('Please enter both API key and message');
                  return;
                }
              }}
              className="px-6 py-3 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 self-end disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                backgroundColor: !apiKey.trim() ? '#9CA3AF' : '#266CA9',
                '--tw-ring-color': '#266CA9'
              } as React.CSSProperties}
              onMouseEnter={(e) => {
                if (apiKey.trim()) {
                  e.currentTarget.style.backgroundColor = '#1e5a8a';
                }
              }}
              onMouseLeave={(e) => {
                if (apiKey.trim()) {
                  e.currentTarget.style.backgroundColor = '#266CA9';
                }
              }}
            >
              {isLoading ? '⏳' : isParsing ? '📄' : uploadedFile?.fileType === 'image' ? '🖼️' : 'Send'}
            </button>
          </div>
          <p className="text-gray-600 text-xs mt-2">
            💡 Press <kbd className="bg-white/20 px-1 rounded">Enter</kbd> to send, <kbd className="bg-white/20 px-1 rounded">Shift+Enter</kbd> for new line
          </p>
        </form>

        
      </div>
    </div>
  );
}
