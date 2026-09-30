import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Search,
  Send,
  Plus,
  Phone,
  Clock,
  Check,
  CheckCheck,
  AlertCircle,
  FileCode2,
  Sparkles,
  RefreshCw,
  FolderGit2,
  User,
  Info,
  Tag,
  Smile,
  ShieldAlert,
  ChevronDown,
  X,
  Copy,
  ExternalLink,
  Activity,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react';
import { api } from '../../api';
import { ChatConversation, ChatMessage, WhatsAppTemplate, Contact } from '../../types';
import { getTemplateVariables, getVariableContext, renderTemplatePreview } from '../../utils/templateHelper';

export const ClientLiveChat: React.FC = () => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);

  // UI state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'active_window' | 'unread'>('all');
  const [loadingConversations, setLoadingConversations] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);

  // Send message mode
  const [chatMode, setChatMode] = useState<'text' | 'template'>('text');
  const [textInput, setTextInput] = useState<string>('');

  // Template send form
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
  const [variableInputModes, setVariableInputModes] = useState<Record<string, 'custom' | 'attribute'>>({});

  // New Chat modal
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState<boolean>(false);
  const [newChatPhone, setNewChatPhone] = useState<string>('');
  const [newChatName, setNewChatName] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial load
  const loadConversations = async () => {
    try {
      const res = await api.getChatConversations();
      if (res.success) {
        setConversations(res.conversations);
        if (res.conversations.length > 0 && !selectedPhone) {
          setSelectedPhone(res.conversations[0].phone);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadMessages = async (phone: string) => {
    if (!phone) return;
    try {
      const res = await api.getChatMessages(phone);
      if (res.success) {
        setMessages(res.messages);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadDependencies = async () => {
    try {
      const [cRes, tRes] = await Promise.all([api.getContacts({ limit: 100 }), api.getTemplates()]);
      if (cRes.success) setContacts(cRes.contacts);
      if (tRes.success) setTemplates(tRes.templates);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadConversations();
    loadDependencies();
  }, []);

  // Poll conversation list & messages every 2.5 seconds for snappy real-time updates
  useEffect(() => {
    const timer = setInterval(() => {
      loadConversations();
      if (selectedPhone) {
        api.getChatMessages(selectedPhone).then((res) => {
          if (res.success) {
            setMessages(res.messages);
          }
        });
      }
    }, 2500);
    return () => clearInterval(timer);
  }, [selectedPhone]);

  // Load message history when selected phone changes
  useEffect(() => {
    if (!selectedPhone) return;
    setLoadingMessages(true);
    api.getChatMessages(selectedPhone)
      .then((res) => {
        if (res.success) {
          setMessages(res.messages);
          scrollToBottom();
        }
      })
      .finally(() => setLoadingMessages(false));
  }, [selectedPhone]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const currentConv = conversations.find(
    (c) => c.phone.replace(/\D/g, '') === selectedPhone.replace(/\D/g, '')
  );

  // Pre-fill template variables when template changes
  const handleSelectTemplate = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const tpl = templates.find((t) => t.id === tplId);
    if (!tpl) return;

    const initialVars: Record<string, string> = {};
    const initialModes: Record<string, 'custom' | 'attribute'> = {};
    const contact = contacts.find(
      (c) => c.phone.replace(/\D/g, '') === selectedPhone.replace(/\D/g, '')
    );

    const tplVars = getTemplateVariables(tpl);
    tplVars.forEach((v, idx) => {
      initialModes[v] = 'custom';
      if (v === '1' || v.toLowerCase() === 'name' || idx === 0) {
        initialVars[v] = contact?.name || currentConv?.contact_name || 'Customer';
      } else if (v === '2' && contact?.custom1) {
        initialVars[v] = contact.custom1;
      } else if (v === '3' && contact?.custom2) {
        initialVars[v] = contact.custom2;
      } else {
        initialVars[v] = '';
      }
    });

    setTemplateVariables(initialVars);
    setVariableInputModes(initialModes);
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPhone) return;

    if (chatMode === 'text') {
      if (!textInput.trim()) return;
      setIsSending(true);
      try {
        const res = await api.sendChatMessage({
          to: selectedPhone,
          type: 'text',
          text: textInput.trim()
        });

        if (res.success) {
          setTextInput('');
          setMessages((prev) => [...prev, res.message]);
          loadConversations();
        } else {
          alert(res.error || 'Failed to send text message');
        }
      } catch (err: any) {
        alert('Send error: ' + err.message);
      } finally {
        setIsSending(false);
      }
    } else {
      // Template mode
      if (!selectedTemplateId) {
        alert('Please select a Meta template');
        return;
      }

      setIsSending(true);
      try {
        const res = await api.sendChatMessage({
          to: selectedPhone,
          type: 'template',
          templateId: selectedTemplateId,
          variables: templateVariables
        });

        if (res.success) {
          setMessages((prev) => [...prev, res.message]);
          setChatMode('text');
          loadConversations();
        } else {
          alert(res.error || 'Failed to dispatch template chat message');
        }
      } catch (err: any) {
        alert('Send error: ' + err.message);
      } finally {
        setIsSending(false);
      }
    }
  };

  // Start new conversation
  const handleStartNewChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatPhone.trim()) return;

    const formatted = newChatPhone.startsWith('+')
      ? newChatPhone.trim()
      : '+' + newChatPhone.replace(/\D/g, '');

    setSelectedPhone(formatted);
    setIsNewChatModalOpen(false);
    setNewChatPhone('');
    setNewChatName('');

    // Pre-populate empty message list if new
    setMessages([]);
    setChatMode('template'); // New chat outside window requires template
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const matchSearch =
      c.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      c.last_message.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchSearch) return false;
    if (filterType === 'active_window') return c.is_window_active;
    if (filterType === 'unread') return c.unread_count > 0;
    return true;
  });

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  return (
    <div className="h-[calc(100vh-135px)] flex flex-col space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            <span>WhatsApp Customer Live Chat & Inbox</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Two-way WhatsApp Business messaging with 24-hour session window tracking, template dispatch, and instant replies.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsNewChatModalOpen(true)}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[520px]">
        {/* LEFT PANEL: CONVERSATIONS LIST */}
        <div className={`w-full md:w-80 lg:w-96 border-r border-slate-800 flex flex-col bg-slate-950/60 ${selectedPhone ? 'hidden md:flex' : 'flex'}`}>
          {/* Search & Filter Header */}
          <div className="p-3 border-b border-slate-800 space-y-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search name, phone (+91...), message..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center space-x-1 text-[11px]">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                  filterType === 'all'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({conversations.length})
              </button>
              <button
                onClick={() => setFilterType('active_window')}
                className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                  filterType === 'active_window'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Active 24h ({conversations.filter((c) => c.is_window_active).length})
              </button>
              <button
                onClick={() => setFilterType('unread')}
                className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                  filterType === 'unread'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Unread ({conversations.filter((c) => c.unread_count > 0).length})
              </button>
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
            {loadingConversations ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400" />
                <span>Loading conversations...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                <MessageSquare className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                <p className="font-semibold text-slate-400">No conversations</p>
                <p className="text-[11px] mt-1 text-slate-500">
                  Click "New Chat" to initiate a conversation with any customer.
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected =
                  selectedPhone.replace(/\D/g, '') === conv.phone.replace(/\D/g, '');

                return (
                  <div
                    key={conv.phone}
                    onClick={() => setSelectedPhone(conv.phone)}
                    className={`p-3.5 flex items-start space-x-3 cursor-pointer transition-colors relative ${
                      isSelected
                        ? 'bg-slate-850 border-l-2 border-emerald-500'
                        : 'hover:bg-slate-900/60'
                    }`}
                  >
                    {/* Customer Avatar */}
                    <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-200 border border-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {conv.contact_name ? conv.contact_name.slice(0, 2).toUpperCase() : 'WA'}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white text-xs truncate">
                          {conv.contact_name}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(conv.last_message_time).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 font-mono mt-0.5">
                        <Phone className="w-2.5 h-2.5 text-emerald-400" />
                        <span>{conv.phone}</span>
                      </div>

                      {/* Snippet */}
                      <p className="text-[11px] text-slate-400 truncate mt-1">
                        {conv.last_message_sender === 'business' && (
                          <span className="text-slate-500">You: </span>
                        )}
                        {conv.last_message}
                      </p>

                      {/* Badges footer */}
                      <div className="mt-1.5 flex items-center space-x-1.5">
                        {conv.group_name && (
                          <span className="bg-slate-800 text-slate-300 text-[9px] px-1.5 py-0.2 rounded font-medium">
                            {conv.group_name}
                          </span>
                        )}

                        {conv.is_window_active ? (
                          <span className="bg-emerald-500/10 text-emerald-400 text-[9px] px-1.5 py-0.2 rounded font-medium flex items-center space-x-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            <span>24h Active</span>
                          </span>
                        ) : (
                          <span className="bg-amber-500/10 text-amber-400 text-[9px] px-1.5 py-0.2 rounded font-medium flex items-center space-x-0.5">
                            <ShieldAlert className="w-2.5 h-2.5" />
                            <span>Template Req</span>
                          </span>
                        )}

                        {conv.unread_count > 0 && (
                          <span className="ml-auto bg-emerald-500 text-slate-950 font-bold text-[9px] px-1.5 py-0.2 rounded-full">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANEL: CHAT TIMELINE & INPUT BAR */}
        <div className={`flex-1 flex flex-col bg-slate-900/80 ${!selectedPhone ? 'hidden md:flex' : 'flex'}`}>
          {selectedPhone ? (
            <>
              {/* Chat Window Header */}
              <div className="px-4 sm:px-6 py-3 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setSelectedPhone('')}
                    className="md:hidden p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Back to conversations"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                    {currentConv?.contact_name ? currentConv.contact_name.slice(0, 2).toUpperCase() : 'WA'}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-sm font-bold text-white">
                        {currentConv?.contact_name || 'Customer'}
                      </h2>
                      {currentConv?.group_name && (
                        <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-full font-medium">
                          {currentConv.group_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono">
                      <span>{selectedPhone}</span>
                      <span>•</span>
                      {currentConv?.is_window_active ? (
                        <span className="text-emerald-400 font-sans font-medium flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span>24h Session Open</span>
                        </span>
                      ) : (
                        <span className="text-amber-400 font-sans font-medium flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                          <span>Session Closed (Use Template)</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <span className="hidden sm:inline font-mono text-[11px]">Auto-refresh: 2.5s</span>
                  <button
                    onClick={() => {
                      loadConversations();
                      if (selectedPhone) loadMessages(selectedPhone);
                    }}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                    title="Refresh chat"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingMessages ? 'animate-spin text-emerald-400' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Messages Timeline */}
              <div className="flex-1 p-6 overflow-y-auto space-y-3.5 bg-slate-950/40">
                {loadingMessages ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400" />
                    <span>Loading messages...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-16 text-center text-slate-500 text-xs space-y-2">
                    <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="font-semibold text-slate-400">No message history yet</p>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                      Send a WhatsApp Template to start a conversation, or simulate an incoming message from the client.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOutbound = msg.sender === 'business';

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-md sm:max-w-lg rounded-2xl p-3.5 shadow-md text-xs ${
                            isOutbound
                              ? 'bg-emerald-950/80 border border-emerald-800/60 text-emerald-100 rounded-br-xs'
                              : 'bg-slate-800/90 border border-slate-700 text-slate-100 rounded-bl-xs'
                          }`}
                        >
                          {/* Template Header Badge */}
                          {msg.message_type === 'template' && (
                            <div className="mb-2 pb-1.5 border-b border-emerald-800/60 flex items-center justify-between gap-2">
                              <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-emerald-300">
                                <FileCode2 className="w-3 h-3" />
                                <span>Meta Template: {msg.template_name}</span>
                              </span>
                              {msg.template_category && (
                                <span className="bg-emerald-500/20 text-emerald-300 text-[9px] px-1.5 py-0.2 rounded font-mono">
                                  {msg.template_category}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Message Content */}
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                          {/* Footer: Time & Status */}
                          <div className="mt-1.5 flex items-center justify-end space-x-1.5 text-[10px] text-slate-400">
                            <span>
                              {new Date(msg.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>

                            {isOutbound && (
                              <span>
                                {msg.status === 'Read' && (
                                  <span title="Read">
                                    <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
                                  </span>
                                )}
                                {msg.status === 'Delivered' && (
                                  <span title="Delivered">
                                    <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                                  </span>
                                )}
                                {msg.status === 'Sent' && (
                                  <span title="Sent to WhatsApp">
                                    <Check className="w-3.5 h-3.5 text-slate-500" />
                                  </span>
                                )}
                                {msg.status === 'Failed' && (
                                  <span title={msg.error_message || 'Delivery Failed'}>
                                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Area */}
              <div className="p-4 border-t border-slate-800 bg-slate-950">
                {/* Chat Mode Switcher Tabs */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex space-x-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setChatMode('text')}
                      className={`px-3 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                        chatMode === 'text'
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      💬 Normal Chat (Free-form)
                    </button>
                    <button
                      type="button"
                      onClick={() => setChatMode('template')}
                      className={`px-3 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                        chatMode === 'template'
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      📑 Meta Template Chat
                    </button>
                  </div>

                  {/* Window Warning */}
                  {!currentConv?.is_window_active && chatMode === 'text' && (
                    <span className="text-[11px] text-amber-400 flex items-center space-x-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Outside 24h window. If Meta rejects text, use Template mode.</span>
                    </span>
                  )}
                </div>

                {/* Form based on mode */}
                {chatMode === 'text' ? (
                  <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Type a message to customer... (Press Enter to send)"
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={isSending || !textInput.trim()}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-semibold cursor-pointer flex items-center space-x-1.5 shadow-lg shadow-emerald-600/20 text-xs"
                    >
                      {isSending ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span>Send</span>
                          <Send className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">
                        Select Approved Meta Template:
                      </label>
                      <select
                        value={selectedTemplateId}
                        onChange={(e) => handleSelectTemplate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">-- Choose an approved template --</option>
                        {templates.map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>
                            {tpl.name} ({tpl.category} - {tpl.language})
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedTemplate && (
                      <div className="space-y-3 pt-2 border-t border-slate-800">
                        {/* Live Message Preview */}
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span className="font-semibold text-emerald-400 uppercase tracking-wide">
                              Live Preview (Customer View):
                            </span>
                            <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">
                              {getTemplateVariables(selectedTemplate).length} variable(s)
                            </span>
                          </div>
                          <div className="text-[12px] text-slate-200 leading-relaxed font-sans whitespace-pre-wrap bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
                            {renderTemplatePreview(selectedTemplate.body_text, templateVariables)}
                          </div>
                        </div>

                        {getTemplateVariables(selectedTemplate).length > 0 ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-white text-[11px] flex items-center space-x-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Configure Template Variables ({getTemplateVariables(selectedTemplate).length}):</span>
                              </p>
                              <div className="flex items-center space-x-1 text-[10px]">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const allCustom: Record<string, 'custom' | 'attribute'> = {};
                                    getTemplateVariables(selectedTemplate).forEach(v => allCustom[v] = 'custom');
                                    setVariableInputModes(allCustom);
                                  }}
                                  className="text-purple-400 hover:text-purple-300 px-1.5 py-0.5 rounded hover:bg-purple-950/30 cursor-pointer"
                                >
                                  ✍️ Type All
                                </button>
                                <span className="text-slate-600">•</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const allAttr: Record<string, 'custom' | 'attribute'> = {};
                                    getTemplateVariables(selectedTemplate).forEach(v => allAttr[v] = 'attribute');
                                    setVariableInputModes(allAttr);
                                  }}
                                  className="text-emerald-400 hover:text-emerald-300 px-1.5 py-0.5 rounded hover:bg-emerald-950/30 cursor-pointer"
                                >
                                  📂 Choose All
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto p-1">
                              {getTemplateVariables(selectedTemplate).map((varName) => {
                                const contact = contacts.find(
                                  (c) => c.phone.replace(/\D/g, '') === selectedPhone.replace(/\D/g, '')
                                );
                                const currentVal = templateVariables[varName] || '';
                                const currentMode = variableInputModes[varName] || 'custom';
                                const location = getVariableContext(selectedTemplate, varName);

                                return (
                                  <div key={varName} className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                                    <div className="flex items-center justify-between text-[11px]">
                                      <div className="flex items-center space-x-1.5">
                                        <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 text-xs">
                                          {'{{' + varName + '}}'}
                                        </span>
                                        <span className="text-[10px] text-slate-500">
                                          {location}
                                        </span>
                                      </div>

                                      {/* Segmented Mode Switch */}
                                      <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[9px]">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setVariableInputModes({
                                              ...variableInputModes,
                                              [varName]: 'custom'
                                            })
                                          }
                                          className={`px-1.5 py-0.5 rounded font-medium cursor-pointer transition-colors ${
                                            currentMode === 'custom'
                                              ? 'bg-purple-600 text-white shadow-xs'
                                              : 'text-slate-400 hover:text-white'
                                          }`}
                                        >
                                          ✍️ Custom
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setVariableInputModes({
                                              ...variableInputModes,
                                              [varName]: 'attribute'
                                            })
                                          }
                                          className={`px-1.5 py-0.5 rounded font-medium cursor-pointer transition-colors ${
                                            currentMode === 'attribute'
                                              ? 'bg-emerald-600 text-white shadow-xs'
                                              : 'text-slate-400 hover:text-white'
                                          }`}
                                        >
                                          📂 Choose
                                        </button>
                                      </div>
                                    </div>

                                    {currentMode === 'custom' ? (
                                      /* Option 1: Type Custom Value */
                                      <div className="space-y-1.5">
                                        <input
                                          type="text"
                                          value={currentVal}
                                          onChange={(e) =>
                                            setTemplateVariables({
                                              ...templateVariables,
                                              [varName]: e.target.value
                                            })
                                          }
                                          placeholder={`Type custom text for {{${varName}}}`}
                                          className="w-full bg-slate-900 border border-purple-500/40 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-purple-400 focus:outline-none"
                                        />

                                        {/* Quick chips to fill custom or contact values */}
                                        <div className="flex flex-wrap gap-1 text-[9px]">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setTemplateVariables({
                                                ...templateVariables,
                                                [varName]: contact?.name || currentConv?.contact_name || 'Customer'
                                              })
                                            }
                                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                                          >
                                            👤 Name
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setTemplateVariables({
                                                ...templateVariables,
                                                [varName]: selectedPhone
                                              })
                                            }
                                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                                          >
                                            📞 Phone
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setTemplateVariables({
                                                ...templateVariables,
                                                [varName]: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
                                              })
                                            }
                                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                                          >
                                            📅 Today
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setTemplateVariables({
                                                ...templateVariables,
                                                [varName]: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                              })
                                            }
                                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                                          >
                                            ⏰ Time
                                          </button>
                                          {currentVal && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setTemplateVariables({
                                                  ...templateVariables,
                                                  [varName]: ''
                                                })
                                              }
                                              className="text-rose-400 hover:text-rose-300 px-1 py-0.5 cursor-pointer ml-auto"
                                            >
                                              ✕ Clear
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      /* Option 2: Choose Variable / Contact Attribute */
                                      <div className="space-y-1">
                                        <select
                                          value={
                                            currentVal === (contact?.name || currentConv?.contact_name) ? 'name'
                                            : currentVal === selectedPhone ? 'phone'
                                            : currentVal === (contact?.email || '') ? 'email'
                                            : currentVal === (contact?.variables?.[varName] || '') ? `var_${varName}`
                                            : ''
                                          }
                                          onChange={(e) => {
                                            const role = e.target.value;
                                            let val = '';
                                            if (role === 'name') val = contact?.name || currentConv?.contact_name || 'Customer';
                                            else if (role === 'phone') val = selectedPhone;
                                            else if (role === 'email') val = contact?.email || '';
                                            else if (role.startsWith('var_')) {
                                              const num = role.replace('var_', '');
                                              val = contact?.variables?.[num] || contact?.metadata?.[`var_${num}`] || '';
                                            }
                                            setTemplateVariables({
                                              ...templateVariables,
                                              [varName]: val
                                            });
                                          }}
                                          className="w-full bg-slate-900 border border-emerald-500/50 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-emerald-400 focus:outline-none"
                                        >
                                          <option value="">-- Choose contact field --</option>
                                          <optgroup label="Core Profile Attributes">
                                            <option value="name">👤 Customer Name ({contact?.name || currentConv?.contact_name || 'Customer'})</option>
                                            <option value="phone">📞 Phone Number ({selectedPhone})</option>
                                            {contact?.email && <option value="email">✉️ Email ({contact.email})</option>}
                                          </optgroup>
                                          {contact?.variables?.[varName] && (
                                            <optgroup label="Contact Variable">
                                              <option value={`var_${varName}`}>✨ Contact Variable {varName} ({contact.variables[varName]})</option>
                                            </optgroup>
                                          )}
                                        </select>
                                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                                          <span>Resolved value:</span>
                                          <strong className="text-emerald-400 font-mono truncate max-w-[150px]">
                                            {currentVal || '(blank)'}
                                          </strong>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-xl text-emerald-300 text-[11px] flex items-center space-x-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>
                              <strong>Zero Variables Required:</strong> This template has no dynamic placeholders. It will dispatch with standard approved Meta content.
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] text-slate-400">
                            Cost: 1 {selectedTemplate.category === 'UTILITY' ? 'Utility' : 'Marketing'} credit
                          </span>
                          <button
                            type="button"
                            onClick={handleSendMessage}
                            disabled={isSending}
                            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl font-semibold cursor-pointer flex items-center space-x-1.5 shadow-lg shadow-emerald-600/20 text-xs"
                          >
                            {isSending ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <span>Send Template Message</span>
                                <Send className="w-3.5 h-3.5" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 space-y-3">
              <MessageSquare className="w-12 h-12 text-slate-700" />
              <p className="text-white font-semibold">Select a conversation or start a new chat</p>
              <p className="text-xs text-slate-400 max-w-sm text-center">
                Select an active customer thread from the left or click "New Chat" to send a WhatsApp template or message.
              </p>
              <button
                onClick={() => setIsNewChatModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Start New Chat
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {isNewChatModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Start New WhatsApp Chat</span>
              </h2>
              <button
                onClick={() => setIsNewChatModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStartNewChat} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Pick an Existing Contact:</label>
                <select
                  onChange={(e) => {
                    const c = contacts.find((item) => item.id === e.target.value);
                    if (c) {
                      setNewChatPhone(c.phone);
                      setNewChatName(c.name);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Choose from your Contacts list --</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Or Enter WhatsApp Phone (E.164) *</label>
                <input
                  type="text"
                  required
                  placeholder="+919876543210"
                  value={newChatPhone}
                  onChange={(e) => setNewChatPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Contact Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Vikram Singhania"
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsNewChatModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl font-semibold cursor-pointer"
                >
                  Open Chat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
