import { apiClient, ApiResponse } from './api';

export interface AppSetting {
    key: string;
    value: string;
    description?: string;
}

/**
 * Fetch global system settings (e.g. University Name)
 */
export const getSystemSettings = async (): Promise<ApiResponse<AppSetting[]>> => {
    try {
        const response = await apiClient.get('/admin/settings');
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            error: error.response?.data?.error || 'Failed to fetch settings',
        };
    }
};

/**
 * Update global system settings
 */
export const updateSystemSettings = async (settings: AppSetting[]): Promise<ApiResponse> => {
    try {
        const response = await apiClient.post('/admin/settings', settings);
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            error: error.response?.data?.error || 'Failed to update settings',
        };
    }
};

/**
 * Retrieve comprehensive audit logs
 */
export const getAuditLogs = async (): Promise<ApiResponse<any[]>> => {
    try {
        const response = await apiClient.get('/admin/audit-logs');
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            error: error.response?.data?.error || 'Failed to fetch audit logs',
        };
    }
};

/**
 * Create a new administrator account
 */
export const createAdmin = async (adminData: any): Promise<ApiResponse> => {
    try {
        const response = await apiClient.post('/admin/admins', adminData);
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            error: error.response?.data?.message || 'Failed to create admin account',
        };
    }
};

/**
 * Export audit logs in the specified format
 */
export const exportAuditLogs = async (format: string, adminId?: string): Promise<void> => {
    try {
        const response = await apiClient.get('/admin/audit-logs/export', {
            params: { format, adminId },
            responseType: 'blob'
        });

        // Create a link and trigger download
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        const extension = format === 'excel' ? 'xlsx' : format;
        const fileName = `audit_logs_${new Date().getTime()}.${extension}`;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    } catch (error: any) {
        console.error('Failed to export audit logs:', error);
        throw new Error('Failed to export audit logs');
    }
};
