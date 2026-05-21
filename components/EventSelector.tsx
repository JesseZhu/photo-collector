'use client';

import { useState, useEffect } from 'react';
import { Calendar, Users, Image } from 'lucide-react';

interface Event {
  id: string;
  photoCount: number;
  userCount: number;
  createTime: string;
}

interface EventSelectorProps {
  currentEvent?: string;
  onSelectEvent: (eventId: string) => void;
}

export default function EventSelector({ currentEvent, onSelectEvent }: EventSelectorProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/events')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setEvents(data.events);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-4 text-gray-500">Loading events...</div>;
  }

  if (events.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent Events</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {events.map(event => (
          <button
            key={event.id}
            onClick={() => onSelectEvent(event.id)}
            className={`
              p-4 rounded-lg border-2 transition-all duration-200 text-left
              ${currentEvent === event.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }
            `}
          >
            <p className="font-medium text-gray-900 mb-2 truncate">{event.id}</p>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Image className="h-4 w-4" />
                <span>{event.photoCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{event.userCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{new Date(event.createTime).toLocaleDateString('zh-CN')}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
