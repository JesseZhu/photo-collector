'use client';

import { useState, useEffect, useRef } from 'react';
import { Lock, Plus, Trash2, Copy, ExternalLink, Calendar, Users, Image, Clock, LogOut, AlertCircle, CheckCircle, Upload, X, Camera } from 'lucide-react';

interface Event {
  id: string;
  description: string;
  coverImage: string;
  createdAt: string;
  expiresAt: string;
  active: boolean;
  photoCount: number;
  userCount: number;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEvent, setNewEvent] = useState({
    id: '',
    description: '',
    coverImage: '',
    expiryDays: 7,
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>('');
  const [coverUploading, setCoverUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    setBaseUrl(window.location.origin);
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch(`${baseUrl}/api/admin/login`);
      const data = await res.json();
      if (data.initialized) {
        const token = getCookie('admin_token');
        if (token) {
          setIsAuthenticated(true);
          loadEvents(true);
        }
      } else {
        setIsInitializing(true);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async (admin = false) => {
    try {
      const headers: Record<string, string> = {};
      const token = getCookie('admin_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${baseUrl}/api/events?admin=${admin}`, { headers });
      const data = await res.json();
      if (data.success) {
        setEvents(data.events);
      }
    } catch (error) {
      console.error('Failed to load events:', error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    try {
      const res = await fetch(`${baseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          initialize: isInitializing,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setIsAuthenticated(true);
        loadEvents(true);
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '登录失败' });
    }
  };

  const handleLogout = () => {
    document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    setIsAuthenticated(false);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    try {
      let coverUrl = newEvent.coverImage;
      if (coverFile) {
        coverUrl = await uploadCover();
      }

      const token = getCookie('admin_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${baseUrl}/api/events`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...newEvent, coverImage: coverUrl }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: `活动 "${newEvent.id}" 创建成功` });
        setNewEvent({ id: '', description: '', coverImage: '', expiryDays: 7 });
        clearCover();
        setShowCreateForm(false);
        loadEvents(true);
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
        setMessage({ type: 'error', text: '创建活动失败' });
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm(`确定要删除活动 "${id}" 吗？此操作将删除所有已上传的照片。`)) {
      return;
    }

    try {
      const token = getCookie('admin_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${baseUrl}/api/events?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers,
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: `活动 "${id}" 已删除` });
        loadEvents(true);
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '删除活动失败' });
    }
  };

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Only image files are allowed' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File size exceeds 10MB limit' });
      return;
    }

    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setNewEvent({ ...newEvent, coverImage: '' });
  };

  const uploadCover = async (): Promise<string> => {
    if (!coverFile) return newEvent.coverImage;

    setCoverUploading(true);
    try {
      const token = getCookie('admin_token');
      const formData = new FormData();
      formData.append('file', coverFile);

      const res = await fetch(`${baseUrl}/api/covers`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        return data.url;
      }
      throw new Error(data.error);
    } finally {
      setCoverUploading(false);
    }
  };

  const clearCover = () => {
    setCoverFile(null);
    setCoverPreview('');
    setNewEvent({ ...newEvent, coverImage: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const copyShareLink = (eventId: string, includeUser = false) => {
    const params = new URLSearchParams();
    params.set('event', eventId);
    if (includeUser) {
      params.set('user', '');
    }
    const link = `${window.location.origin}?${params.toString()}`;
    navigator.clipboard.writeText(link);
    setMessage({ type: 'success', text: '链接已复制到剪贴板' });
  };

  const getCookie = (name: string): string | null => {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <p className="text-[#59413c]">加载中...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#f8f9fa] flex items-center justify-center pt-16">
        <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-sm border border-[#e1bfb8]/20">
          <div className="text-center mb-6">
            <Lock className="mx-auto h-12 w-12 text-[#ae3115] mb-4" />
            <h1 className="font-bold text-2xl text-[#191c1d]">管理员登录</h1>
            {isInitializing && (
              <p className="mt-2 text-sm text-[#8c1900]">
                首次使用：请设置管理员密码
              </p>
            )}
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#59413c] mb-1 ml-1" htmlFor="password">
                密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#59413c]/50" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入管理员密码"
                  className="w-full h-12 pl-10 pr-4 rounded-xl bg-[#e1e3e4] border-none focus:ring-2 focus:ring-[#4cb9ff] focus:bg-white text-[#191c1d] transition-all shadow-inner"
                  required
                />
              </div>
            </div>

            {message && (
              <div className={`p-3 rounded-xl flex items-center gap-2 ${
                message.type === 'error' ? 'bg-[#ffdad6] text-[#ba1a1a]' : 'bg-[#ffdad2]/30 text-[#ae3115]'
              }`}>
                {message.type === 'error' ? (
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                ) : (
                  <CheckCircle className="h-5 w-5 flex-shrink-0" />
                )}
                <span className="text-sm">{message.text}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-[#ae3115] text-white h-[56px] rounded-full font-semibold shadow-[0_8px_24px_rgba(174,49,21,0.2)] hover:bg-[#ff6b4a] hover:text-[#661000] transition-colors active:scale-95 duration-200"
            >
              {isInitializing ? '设置密码' : '登录'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f9fa] text-[#191c1d] antialiased pt-16 pb-24 md:pb-8">
      {/* Top App Bar */}
      <header className="fixed top-0 w-full z-50 bg-[#f8f9fa]/70 backdrop-blur-md border-b border-[#e1bfb8]/20 shadow-sm">
        <div className="flex justify-between items-center h-16 px-5 max-w-[1280px] mx-auto w-full">
          <div className="flex items-center gap-1">
            <Camera className="w-8 h-8 text-[#ae3115]" />
            <span className="font-bold text-xl text-[#ae3115] tracking-tight">管理后台</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-[#59413c] hover:text-[#ae3115] transition-colors text-sm font-medium"
          >
            <LogOut className="h-4 w-4" />
            退出
          </button>
        </div>
      </header>

      <div className="max-w-[1280px] mx-auto px-5 pt-10 pb-10">
        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-2 ${
            message.type === 'error' ? 'bg-[#ffdad6] text-[#ba1a1a]' : 'bg-[#ffdad2]/30 text-[#ae3115]'
          }`}>
            {message.type === 'error' ? (
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
            ) : (
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Create Event Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 bg-[#ae3115] text-white px-6 py-3 rounded-full font-semibold shadow-[0_8px_24px_rgba(174,49,21,0.2)] hover:bg-[#ff6b4a] hover:text-[#661000] transition-colors active:scale-95 duration-200"
          >
            <Plus className="h-5 w-5" />
            创建新活动
          </button>
        </div>

        {/* Create Event Form */}
        {showCreateForm && (
          <div className="mb-8 p-6 bg-white rounded-xl shadow-sm border border-[#e1bfb8]/20 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#ff6b4a]/10 rounded-full blur-2xl"></div>
            <h2 className="font-bold text-xl text-[#191c1d] mb-4 relative z-10">创建活动</h2>
            <form onSubmit={handleCreateEvent} className="space-y-4 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#59413c] mb-1 ml-1">
                    活动 ID *
                  </label>
                  <input
                    type="text"
                    value={newEvent.id}
                    onChange={(e) => setNewEvent({ ...newEvent, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                    placeholder="例如：2026-05-云南旅行"
                    className="w-full h-12 px-4 rounded-xl bg-[#e1e3e4] border-none focus:ring-2 focus:ring-[#4cb9ff] focus:bg-white text-[#191c1d] transition-all shadow-inner"
                    required
                  />
                  <p className="mt-1 text-xs text-[#59413c]/60">仅支持小写字母、数字和连字符</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#59413c] mb-1 ml-1">
                    有效期
                  </label>
                  <select
                    value={newEvent.expiryDays}
                    onChange={(e) => setNewEvent({ ...newEvent, expiryDays: parseInt(e.target.value) })}
                    className="w-full h-12 px-4 rounded-xl bg-[#e1e3e4] border-none focus:ring-2 focus:ring-[#4cb9ff] focus:bg-white text-[#191c1d] transition-all shadow-inner"
                  >
                    <option value={1}>1 天</option>
                    <option value={3}>3 天</option>
                    <option value={7}>7 天（默认）</option>
                    <option value={14}>14 天</option>
                    <option value={30}>30 天</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#59413c] mb-1 ml-1">
                  活动描述（选填）
                </label>
                <input
                  type="text"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="简要描述活动内容"
                  className="w-full h-12 px-4 rounded-xl bg-[#e1e3e4] border-none focus:ring-2 focus:ring-[#4cb9ff] focus:bg-white text-[#191c1d] transition-all shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#59413c] mb-1 ml-1">
                  封面图片（选填）
                </label>
                <div className="space-y-3">
                  {coverPreview ? (
                    <div className="relative inline-block">
                      <img
                        src={coverPreview}
                        alt="封面预览"
                        className="h-24 w-auto rounded-xl border border-[#e1bfb8]/20 object-cover"
                      />
                      <button
                        type="button"
                        onClick={clearCover}
                        className="absolute -top-2 -right-2 p-1 bg-[#ae3115] text-white rounded-full hover:bg-[#ff6b4a] transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-3 p-4 border-2 border-dashed border-[#e1bfb8]/30 rounded-xl cursor-pointer hover:border-[#ae3115]/40 hover:bg-[#ffdad2]/10 transition-colors"
                    >
                      <Upload className="h-5 w-5 text-[#59413c]/40" />
                      <span className="text-sm text-[#59413c]">
                        点击上传封面图片（JPG、PNG、WebP、GIF，最大 10MB）
                      </span>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCoverFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={coverUploading}
                  className="flex items-center justify-center gap-2 bg-[#ae3115] text-white h-[56px] px-8 rounded-full font-semibold shadow-[0_8px_24px_rgba(174,49,21,0.2)] hover:bg-[#ff6b4a] hover:text-[#661000] transition-colors active:scale-95 duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {coverUploading ? '上传中...' : '创建活动'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewEvent({ id: '', description: '', coverImage: '', expiryDays: 7 });
                    clearCover();
                  }}
                  className="px-6 py-2 bg-[#e1e3e4] text-[#59413c] rounded-full hover:bg-[#d9dadb] transition-colors font-medium"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Events List */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-2xl text-[#191c1d]">
              活动列表
              <span className="text-[#59413c] text-base ml-2 font-normal">({events.length})</span>
            </h2>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-[#e1bfb8]/20">
              <p className="text-[#59413c]">还没有活动，创建你的第一个活动吧！</p>
            </div>
          ) : (
            <div className="masonry-grid">
              {events.map(event => (
                <div
                  key={event.id}
                  className="masonry-item p-5 bg-white rounded-xl border border-[#e1bfb8]/20 hover:shadow-md transition-shadow"
                >
                  {event.coverImage && (
                    <div className="h-32 -mx-5 -mt-5 mb-4 overflow-hidden rounded-t-xl">
                      <img
                        src={event.coverImage}
                        alt={event.id}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-[#191c1d]">{event.id}</h3>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                      event.active
                        ? 'bg-[#ffdad2]/30 text-[#ae3115]'
                        : 'bg-[#ffdad6] text-[#ba1a1a]'
                    }`}>
                      {event.active ? '进行中' : '已过期'}
                    </span>
                  </div>

                  {event.description && (
                    <p className="text-[#59413c] text-sm mb-3">{event.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-sm text-[#59413c] mb-4">
                    <div className="flex items-center gap-1">
                      <Image className="h-4 w-4" />
                      <span>{event.photoCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{event.userCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{formatDate(event.expiresAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-[#e1bfb8]/20">
                    <button
                      onClick={() => copyShareLink(event.id)}
                      className="p-2 text-[#59413c] hover:text-[#ae3115] hover:bg-[#ffdad2]/20 rounded-lg transition-colors"
                      title="复制链接"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <a
                      href={`/?event=${event.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-[#59413c] hover:text-[#ae3115] hover:bg-[#ffdad2]/20 rounded-lg transition-colors"
                      title="查看活动"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="p-2 text-[#59413c] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/30 rounded-lg transition-colors ml-auto"
                      title="删除活动"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
