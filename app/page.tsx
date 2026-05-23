'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import UploadZone from '@/components/UploadZone';
import PhotoGrid from '@/components/PhotoGrid';
import { Camera, User, Link2, Clock, Image, Users, ArrowLeft } from 'lucide-react';

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

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const [event, setEvent] = useState(searchParams.get('event') || '');
  const [user, setUser] = useState(searchParams.get('user') || '');
  const [showUserInput, setShowUserInput] = useState(!user);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [origin, setOrigin] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventExpired, setEventExpired] = useState(false);
  const [eventNotFound, setEventNotFound] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    setBaseUrl(window.location.origin);
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (event) {
      const selectedEvent = events.find(e => e.id === event);
      setCurrentEvent(selectedEvent || null);
      loadPhotos();
    }
  }, [event, events]);

  const loadEvents = async () => {
    try {
      const res = await fetch(`${baseUrl}/api/events`);
      const data = await res.json();
      if (data.success) {
        setEvents(data.events);
      }
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setEventsLoading(false);
    }
  };

  const loadPhotos = async () => {
    if (!event) return;
    
    setLoading(true);
    setEventExpired(false);
    setEventNotFound(false);

    try {
      const res = await fetch(`${baseUrl}/api/photos?event=${encodeURIComponent(event)}`);
      const data = await res.json();
      
      if (data.success) {
        setPhotos(data.photos);
      } else if (data.error?.includes('expired')) {
        setEventExpired(true);
        setPhotos([]);
      } else if (data.error?.includes('not exist')) {
        setEventNotFound(true);
        setPhotos([]);
      }
    } catch (error) {
      console.error('Failed to load photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEvent = (eventId: string) => {
    const selectedEvent = events.find(e => e.id === eventId);
    setEvent(eventId);
    setCurrentEvent(selectedEvent || null);
    updateUrl(eventId, user);
  };

  const handleBackToEvents = () => {
    setEvent('');
    setCurrentEvent(null);
    setPhotos([]);
    router.push(pathname);
  };

  const handleUserSubmit = () => {
    if (user.trim()) {
      updateUrl(event, user);
      setShowUserInput(false);
    }
  };

  const updateUrl = (newEvent: string, newUser: string) => {
    const params = new URLSearchParams();
    if (newEvent) params.set('event', newEvent);
    if (newUser) params.set('user', newUser);
    router.push(`?${params.toString()}`);
  };

  const getShareLink = () => {
    if (!event || !origin) return '';
    const params = new URLSearchParams();
    params.set('event', event);
    if (user) params.set('user', user);
    return `${origin}${pathname}?${params.toString()}`;
  };

  const copyShareLink = () => {
    const link = getShareLink();
    if (link) {
      navigator.clipboard.writeText(link);
      alert('链接已复制到剪贴板！');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) return '刚刚';
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return formatDate(dateStr);
  };

  return (
    <main className="min-h-screen bg-[#f8f9fa] text-[#191c1d] antialiased pt-16 pb-24 md:pb-8">
      {/* Top App Bar */}
      <header className="fixed top-0 w-full z-50 bg-[#f8f9fa]/70 backdrop-blur-md border-b border-[#e1bfb8]/20 shadow-sm">
        <div className="flex justify-between items-center h-16 px-5 max-w-[1280px] mx-auto w-full">
          <div className="flex items-center gap-1">
            <Camera className="w-8 h-8 text-[#ae3115]" />
            <span className="font-bold text-xl text-[#ae3115] tracking-tight">照片收集</span>
          </div>
          {event && (
            <button
              onClick={handleBackToEvents}
              className="flex items-center gap-1 text-[#59413c] hover:text-[#ae3115] transition-colors text-sm font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden md:inline">返回活动列表</span>
            </button>
          )}

        </div>
      </header>

      <div className="max-w-[1280px] mx-auto px-5 pt-10 pb-10">
        {/* Event Not Found */}
        {eventNotFound && (
          <div className="max-w-xl mx-auto mb-6 p-4 bg-[#ffdad6] border border-[#e1bfb8]/20 rounded-xl flex items-center gap-3">
            <div className="text-[#ba1a1a] text-xl">⚠</div>
            <div>
              <p className="font-semibold text-[#ba1a1a]">活动不存在</p>
              <p className="text-sm text-[#93000a]">该活动不存在，请检查链接。</p>
            </div>
          </div>
        )}

        {/* Event Expired */}
        {eventExpired && (
          <div className="max-w-xl mx-auto mb-6 p-4 bg-[#ffdad6]/50 border border-[#e1bfb8]/20 rounded-xl flex items-center gap-3">
            <Clock className="h-5 w-5 text-[#ba1a1a] flex-shrink-0" />
            <div>
              <p className="font-semibold text-[#ba1a1a]">活动已过期</p>
              <p className="text-sm text-[#93000a]">您可以浏览已上传的照片，但无法上传新照片。</p>
            </div>
          </div>
        )}

        {/* Event Selector - Cards Grid */}
        {!event && (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-2xl text-[#191c1d]">选择活动</h2>
            </div>
            
            {eventsLoading ? (
              <div className="text-center py-12 text-[#59413c]">加载中...</div>
            ) : events.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-[#e1bfb8]/20">
                <p className="text-[#59413c]">暂无可用活动。</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {events.map(e => (
                  <button
                    key={e.id}
                    onClick={() => handleSelectEvent(e.id)}
                    className="bg-white rounded-xl border border-[#e1bfb8]/20 hover:border-[#ae3115]/30 hover:shadow-md transition-all overflow-hidden text-left active:scale-[0.98] duration-200"
                  >
                    {e.coverImage ? (
                      <div className="h-40 overflow-hidden bg-[#f3f4f5]">
                        <img
                          src={e.coverImage}
                          alt={e.id}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-40 bg-gradient-to-br from-[#ffdad2]/30 to-[#cae6ff]/30 flex items-center justify-center">
                        <Camera className="h-12 w-12 text-[#ae3115]/30" />
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="font-semibold text-[#191c1d] mb-2">{e.id}</h3>
                      {e.description && (
                        <p className="text-sm text-[#59413c] mb-3 line-clamp-2">{e.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-[#59413c]">
                        <div className="flex items-center gap-1">
                          <Image className="h-4 w-4" />
                          <span>{e.photoCount}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{e.userCount}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{formatDate(e.expiresAt)}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* User Input */}
        {showUserInput && event && !eventNotFound && (
          <section className="max-w-xl mx-auto text-center mb-10">
            <div className="bg-[#f3f4f5] rounded-xl p-6 shadow-sm border border-[#e1bfb8]/20 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#ff6b4a]/20 rounded-full blur-2xl"></div>
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[#4cb9ff]/20 rounded-full blur-2xl"></div>
              <h1 className="font-bold text-2xl md:text-3xl text-[#191c1d] mb-3 relative z-10">
                欢迎来到 {event}
              </h1>
              <p className="text-[#59413c] mb-6 relative z-10">
                输入您的昵称开始分享照片
              </p>
              <div className="max-w-sm mx-auto text-left relative z-10">
                <label className="block text-xs font-semibold text-[#59413c] mb-1 ml-1" htmlFor="nickname">
                  您的昵称
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#59413c]/50" />
                  <input
                    id="nickname"
                    type="text"
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleUserSubmit()}
                    placeholder="请输入您的昵称..."
                    className="w-full h-12 pl-10 pr-4 rounded-xl bg-[#e1e3e4] border-none focus:ring-2 focus:ring-[#4cb9ff] focus:bg-white text-[#191c1d] transition-all shadow-inner"
                  />
                </div>
                <button
                  onClick={handleUserSubmit}
                  className="w-full mt-4 flex items-center justify-center gap-2 bg-[#ae3115] text-white h-[56px] px-8 rounded-full font-semibold shadow-[0_8px_24px_rgba(174,49,21,0.2)] hover:bg-[#ff6b4a] hover:text-[#661000] transition-colors active:scale-95 duration-200"
                >
                  继续
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Share Link */}
        {event && user && origin && !eventNotFound && (
          <div className="max-w-xl mx-auto mb-6">
            <div className="flex items-center gap-2 p-3 bg-[#ffdad2]/30 border border-[#e1bfb8]/20 rounded-xl">
              <Link2 className="h-5 w-5 text-[#ae3115] flex-shrink-0" />
              <input
                type="text"
                value={getShareLink()}
                readOnly
                className="flex-1 bg-transparent text-sm text-[#191c1d] focus:outline-none"
              />
              <button
                onClick={copyShareLink}
                className="text-sm text-[#ae3115] hover:text-[#ff6b4a] font-semibold flex-shrink-0"
              >
                复制
              </button>
            </div>
          </div>
        )}

        {/* Upload Zone */}
        {event && user && !eventExpired && !eventNotFound && (
          <div className="mb-10">
            {currentEvent?.coverImage && (
              <div className="mb-6 h-48 rounded-xl overflow-hidden relative">
                <img
                  src={currentEvent.coverImage}
                  alt={event}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                <div className="absolute bottom-4 left-4">
                  <h2 className="text-white font-bold text-xl">{currentEvent.id}</h2>
                  {currentEvent.description && (
                    <p className="text-white/80 text-sm">{currentEvent.description}</p>
                  )}
                </div>
              </div>
            )}
            <UploadZone
              event={event}
              user={user}
              onUploadComplete={loadPhotos}
            />
          </div>
        )}

        {/* Photo Grid */}
        {event && !eventNotFound && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-2xl text-[#191c1d]">
                精彩瞬间
                <span className="text-[#59413c] text-base ml-2 font-normal">({photos.length})</span>
              </h2>
            </div>
            {loading ? (
              <div className="text-center py-16 text-[#59413c]">加载中...</div>
            ) : (
              <PhotoGrid photos={photos} formatRelativeTime={formatRelativeTime} />
            )}
          </section>
        )}
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
