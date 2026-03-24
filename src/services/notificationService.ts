import apiClient, { ApiResponse } from './api';

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'election' | 'results' | 'system' | 'verification';
  route?: string;
  isRead: boolean;
  created_at: string;
}

export const getNotifications = async (limit = 20): Promise<ApiResponse<NotificationItem[]>> => {
  try {
    const response = await apiClient.get(`/notifications?limit=${limit}`);
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to fetch notifications',
    };
  }
};

export const markNotificationRead = async (id: string): Promise<ApiResponse> => {
  try {
    const response = await apiClient.patch(`/notifications/${id}/read`);
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to update notification',
    };
  }
};

export const markAllNotificationsRead = async (): Promise<ApiResponse> => {
  try {
    const response = await apiClient.post('/notifications/mark-all-read');
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to update notifications',
    };
  }
};

export const clearReadNotifications = async (): Promise<ApiResponse> => {
  try {
    const response = await apiClient.post('/notifications/clear-read');
    return response.data;
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to clear notifications',
    };
  }
};
