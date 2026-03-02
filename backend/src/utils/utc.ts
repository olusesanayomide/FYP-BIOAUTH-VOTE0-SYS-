// UTC timestamp helpers for OTP and other time-sensitive logic

export const getUTCTimestamp = (): string => new Date().toISOString(); // Always UTC
export const getUTCNow = (): number => Date.now(); // Always UTC milliseconds

/**
 * Safely parses a date string from the database, ensuring it's treated as UTC.
 * Database TIMESTAMP columns may strip the 'Z' or offset, which causes JS to parse as local time.
 */
export const parseUTCDate = (dateStr: string | Date | null | undefined): number => {
    if (!dateStr) return 0;
    if (dateStr instanceof Date) return dateStr.getTime();

    // If it doesn't have a timezone indicator, append 'Z' to force UTC
    let normalized = dateStr;
    if (typeof normalized === 'string' && !normalized.endsWith('Z') && !normalized.includes('+')) {
        normalized = `${normalized}Z`;
    }

    return new Date(normalized).getTime();
};
