import { supabase } from '../config/supabase';
import { ApiError } from '../middleware/errorHandler';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationCategory = 'election' | 'results' | 'system' | 'verification';

export interface CreateNotificationInput {
  recipientRole: 'admin' | 'voter';
  recipientId: string;
  title: string;
  description: string;
  type?: NotificationType;
  category?: NotificationCategory;
  route?: string;
}

export const createNotification = async (input: CreateNotificationInput) => {
  const {
    recipientRole,
    recipientId,
    title,
    description,
    type = 'info',
    category = 'system',
    route = ''
  } = input;

  const { error } = await supabase
    .from('notifications')
    .insert({
      recipient_role: recipientRole,
      recipient_id: recipientId,
      title,
      description,
      type,
      category,
      route
    });

  if (error) {
    console.error('Failed to create notification:', error);
    throw new ApiError(500, 'Failed to create notification', 'NOTIFICATION_CREATE_FAILED');
  }
};

export const createBroadcastForRole = async (
  role: 'admin' | 'voter',
  payload: Omit<CreateNotificationInput, 'recipientRole' | 'recipientId'>
) => {
  const table = role === 'admin' ? 'admin' : 'users';
  const roleFilter = role === 'admin' ? null : { column: 'role', value: 'VOTER' };

  let query = supabase.from(table).select('id');
  if (roleFilter) {
    query = query.eq(roleFilter.column, roleFilter.value);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Failed to fetch recipients for broadcast:', error);
    throw new ApiError(500, 'Failed to broadcast notifications', 'NOTIFICATION_BROADCAST_FAILED');
  }

  const recipients = (data || []).map((r: any) => r.id);
  if (recipients.length === 0) return;

  const rows = recipients.map((id: string) => ({
    recipient_role: role,
    recipient_id: id,
    title: payload.title,
    description: payload.description,
    type: payload.type || 'info',
    category: payload.category || 'system',
    route: payload.route || ''
  }));

  const { error: insertError } = await supabase.from('notifications').insert(rows);
  if (insertError) {
    console.error('Failed to insert broadcast notifications:', insertError);
    throw new ApiError(500, 'Failed to broadcast notifications', 'NOTIFICATION_BROADCAST_FAILED');
  }
};

export const getNotificationsForRecipient = async (
  recipientRole: 'admin' | 'voter',
  recipientId: string,
  limit = 20
) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, title, description, type, category, route, read_at, created_at')
    .eq('recipient_role', recipientRole)
    .eq('recipient_id', recipientId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch notifications:', error);
    throw new ApiError(500, 'Failed to fetch notifications', 'NOTIFICATION_FETCH_FAILED');
  }

  return (data || []).map((n: any) => ({
    ...n,
    isRead: !!n.read_at
  }));
};

export const markNotificationRead = async (
  id: string,
  recipientRole: 'admin' | 'voter',
  recipientId: string
) => {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('recipient_role', recipientRole)
    .eq('recipient_id', recipientId);

  if (error) {
    console.error('Failed to mark notification read:', error);
    throw new ApiError(500, 'Failed to mark notification read', 'NOTIFICATION_UPDATE_FAILED');
  }
};

export const markAllNotificationsRead = async (
  recipientRole: 'admin' | 'voter',
  recipientId: string
) => {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_role', recipientRole)
    .eq('recipient_id', recipientId)
    .is('read_at', null);

  if (error) {
    console.error('Failed to mark all notifications read:', error);
    throw new ApiError(500, 'Failed to update notifications', 'NOTIFICATION_UPDATE_FAILED');
  }
};

export const clearReadNotifications = async (
  recipientRole: 'admin' | 'voter',
  recipientId: string
) => {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('recipient_role', recipientRole)
    .eq('recipient_id', recipientId)
    .not('read_at', 'is', null);

  if (error) {
    console.error('Failed to clear read notifications:', error);
    throw new ApiError(500, 'Failed to clear notifications', 'NOTIFICATION_CLEAR_FAILED');
  }
};
