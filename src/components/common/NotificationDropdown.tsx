import React, { useState, useRef, useEffect } from 'react';
import { useSusu } from '../../context/SusuContext';
import {
  Bell,
  Send,
  XCircle,
  ShoppingBag,
  CheckCircle2,
  Trash2,
  Check
} from 'lucide-react';
import { AppNotification } from '../../types/susu';

interface NotificationDropdownProps {
  align?: 'right' | 'left';
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ align = 'right' }) => {
  const {
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearAllNotifications
  } = useSusu();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Render specific icon based on notification type
  const renderNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'sent':
        return (
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: '#FFF7ED',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Send size={20} color="#EA580C" style={{ transform: 'rotate(0deg)' }} />
          </div>
        );
      case 'warning':
        return (
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: '#FEF2F2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <XCircle size={20} color="#EF4444" />
          </div>
        );
      case 'received':
        return (
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: '#F0FDF4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <ShoppingBag size={20} color="#16A34A" />
          </div>
        );
      case 'info':
      default:
        return (
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: '#EFF6FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <CheckCircle2 size={20} color="#2563EB" />
          </div>
        );
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger Button with Red Dot Badge */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'relative',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          transition: 'all 0.2s ease'
        }}
        aria-label="Notifications"
        title="View notifications"
      >
        <Bell size={20} color="#334155" />

        {/* Unread Red Dot Indicator (Exact match with screenshot) */}
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '9px',
              right: '9px',
              width: '9px',
              height: '9px',
              borderRadius: '50%',
              background: '#ef4444',
              border: '2px solid #ffffff',
              boxShadow: '0 0 4px rgba(239, 68, 68, 0.4)'
            }}
          />
        )}
      </button>

      {/* Popover Dropdown Card */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            [align === 'right' ? 'right' : 'left']: 0,
            width: '360px',
            maxWidth: 'calc(100vw - 32px)',
            background: '#ffffff',
            borderRadius: '18px',
            boxShadow: '0 16px 40px -4px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(15, 23, 42, 0.06)',
            zIndex: 9999,
            overflow: 'hidden',
            animation: 'slideUpFade 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Card Header */}
          <div
            style={{
              padding: '1.15rem 1.25rem 0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #f1f5f9'
            }}
          >
            <h3
              style={{
                fontSize: '1.15rem',
                fontWeight: 700,
                color: '#0f172a',
                margin: 0,
                fontFamily: 'var(--font-heading)'
              }}
            >
              Notifications
            </h3>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllNotificationsAsRead}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#6366f1',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: 0
                }}
              >
                <Check size={14} />
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div
            style={{
              maxHeight: '380px',
              overflowY: 'auto',
              overscrollBehavior: 'contain'
            }}
          >
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: '3rem 1.5rem',
                  textAlign: 'center',
                  color: '#94a3b8'
                }}
              >
                <Bell size={32} color="#cbd5e1" style={{ margin: '0 auto 0.75rem' }} />
                <div style={{ fontWeight: 600, color: '#64748b', fontSize: '0.9rem' }}>
                  No notifications
                </div>
                <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  You're all caught up with your Susu circle activity.
                </div>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => markNotificationAsRead(item.id)}
                  style={{
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    borderBottom: '1px solid #f8fafc',
                    background: item.read ? '#ffffff' : '#fcfdff',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = item.read ? '#ffffff' : '#fcfdff')
                  }
                >
                  {/* Rounded Icon */}
                  {renderNotificationIcon(item.type)}

                  {/* Text Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem'
                      }}
                    >
                      <h4
                        style={{
                          margin: 0,
                          fontSize: '0.94rem',
                          fontWeight: 700,
                          color: '#0f172a',
                          lineHeight: 1.3
                        }}
                      >
                        {item.title}
                      </h4>

                      {/* Purple dot for unread status (Exact match with screenshot) */}
                      {!item.read && (
                        <span
                          style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            background: '#6366f1',
                            flexShrink: 0
                          }}
                        />
                      )}
                    </div>

                    <p
                      style={{
                        margin: '0.25rem 0 0 0',
                        fontSize: '0.84rem',
                        color: '#64748b',
                        lineHeight: 1.45
                      }}
                    >
                      {item.description}
                    </p>

                    <span
                      style={{
                        display: 'inline-block',
                        marginTop: '0.4rem',
                        fontSize: '0.78rem',
                        color: '#94a3b8'
                      }}
                    >
                      {item.time}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Bar */}
          {notifications.length > 0 && (
            <div
              style={{
                padding: '0.75rem 1.25rem',
                background: '#fafafa',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.78rem'
              }}
            >
              <span style={{ color: '#94a3b8' }}>
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </span>
              <button
                type="button"
                onClick={clearAllNotifications}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.2rem 0.4rem',
                  borderRadius: '4px'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
              >
                <Trash2 size={13} />
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
