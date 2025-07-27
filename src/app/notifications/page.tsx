'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import Layout from '@/components/layout/Layout'
import { Bell, Check, CheckCheck, Eye, Calendar, User, BookOpen, MessageSquare, GraduationCap, Megaphone } from 'lucide-react'
import { Notification, NotificationType } from '@/types'

export default function NotificationsPage() {
  const { profile } = useAuth()
  const { notifications, markAsRead, markAllAsRead, deleteNotification } = useNotifications()
  const [filter, setFilter] = useState<'all' | 'unread' | NotificationType>('all')

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'grade_published':
        return <GraduationCap className="h-5 w-5 text-green-600" />
      case 'grade_updated':
        return <GraduationCap className="h-5 w-5 text-blue-600" />
      case 'feedback_received':
        return <MessageSquare className="h-5 w-5 text-purple-600" />
      case 'announcement':
        return <Megaphone className="h-5 w-5 text-orange-600" />
      default:
        return <Bell className="h-5 w-5 text-gray-600" />
    }
  }

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case 'grade_published':
        return 'bg-green-50 border-green-200'
      case 'grade_updated':
        return 'bg-blue-50 border-blue-200'
      case 'feedback_received':
        return 'bg-purple-50 border-purple-200'
      case 'announcement':
        return 'bg-orange-50 border-orange-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true
    if (filter === 'unread') return !notification.is_read
    return notification.type === filter
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      return 'Just now'
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)} days ago`
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600 mt-1">
              Stay updated with your latest activities and announcements
            </p>
          </div>
          
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <CheckCheck className="h-4 w-4" />
              <span>Mark All Read</span>
            </button>
          )}
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total</h3>
            <p className="text-3xl font-bold text-blue-600">{notifications.length}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Unread</h3>
            <p className="text-3xl font-bold text-orange-600">{unreadCount}</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">This Week</h3>
            <p className="text-3xl font-bold text-green-600">
              {notifications.filter(n => {
                const notificationDate = new Date(n.created_at)
                const weekAgo = new Date()
                weekAgo.setDate(weekAgo.getDate() - 7)
                return notificationDate >= weekAgo
              }).length}
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Grades</h3>
            <p className="text-3xl font-bold text-purple-600">
              {notifications.filter(n => 
                n.type === 'grade_published' || n.type === 'grade_updated'
              ).length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Notifications
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('grade_published')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'grade_published'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Grade Published
            </button>
            <button
              onClick={() => setFilter('grade_updated')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'grade_updated'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Grade Updated
            </button>
            <button
              onClick={() => setFilter('feedback_received')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'feedback_received'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Feedback
            </button>
            <button
              onClick={() => setFilter('announcement')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'announcement'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Announcements
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {filter === 'all' 
                ? 'All Notifications' 
                : filter === 'unread' 
                ? 'Unread Notifications'
                : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Notifications`
              }
              <span className="ml-2 text-sm text-gray-500">
                ({filteredNotifications.length})
              </span>
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-6 transition-colors duration-150 ${
                  !notification.is_read ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className={`text-sm font-medium ${
                          !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {notification.title}
                          {!notification.is_read && (
                            <span className="ml-2 inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                          )}
                        </h3>
                        
                        <p className={`mt-1 text-sm ${
                          !notification.is_read ? 'text-gray-700' : 'text-gray-500'
                        }`}>
                          {notification.message}
                        </p>
                        
                        <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(notification.created_at)}</span>
                          </div>
                          
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            notification.type === 'grade_published' ? 'bg-green-100 text-green-800' :
                            notification.type === 'grade_updated' ? 'bg-blue-100 text-blue-800' :
                            notification.type === 'feedback_received' ? 'bg-purple-100 text-purple-800' :
                            notification.type === 'announcement' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {notification.type.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        {!notification.is_read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        
                        {notification.related_id && (
                          <button
                            className="text-gray-400 hover:text-gray-600"
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {filteredNotifications.length === 0 && (
            <div className="text-center py-12">
              <Bell className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No notifications found
              </h3>
              <p className="text-gray-500">
                {filter === 'unread' 
                  ? 'All caught up! No unread notifications.' 
                  : 'You have no notifications matching the selected filter.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
