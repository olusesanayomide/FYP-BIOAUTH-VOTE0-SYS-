export interface AuditLogTelemetryRow {
  id: string;
  action: string;
  status?: string;
  resource_id?: string;
  ip_address?: string;
  created_at: string;
  admin_name?: string;
  details?: unknown;
}

export type SecurityThreatLevel = "LOW" | "MEDIUM" | "HIGH";

export type SecurityIncidentSeverity = "low" | "medium" | "high";

export interface SecurityIncident {
  id: string;
  title: string;
  severity: SecurityIncidentSeverity;
  reason: string;
  count: number;
  latestAt: string;
  actor: string;
  sourceIp: string;
}

export interface SecurityTelemetry {
  failed24h: number;
  failed7d: number;
  biometricFailures7d: number;
  flaggedIps: number;
  highRiskUsers: number;
  threatLevel: SecurityThreatLevel;
  incidents: SecurityIncident[];
}

const FAILURE_ACTION_HINTS = [
  "FAILURE",
  "INVALID",
  "OTP_EXPIRED",
  "MAX_ATTEMPTS",
  "DOUBLE_VOTE",
  "SUSPENDED",
];

const BIOMETRIC_ACTION_KEYS = ["WEBAUTHN", "BIOMETRIC"];

export const isFailureLike = (log: AuditLogTelemetryRow) => {
  const status = (log.status || "").toUpperCase();
  if (status === "FAILURE") return true;

  const action = (log.action || "").toUpperCase();
  return FAILURE_ACTION_HINTS.some((key) => action.includes(key));
};

export const isBiometricAction = (action: string) => {
  const normalized = action.toUpperCase();
  return BIOMETRIC_ACTION_KEYS.some((key) => normalized.includes(key));
};

export const deriveSecurityTelemetry = (logs: AuditLogTelemetryRow[]): SecurityTelemetry => {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const sevenDaysMs = 7 * oneDayMs;

  const logs24h = logs.filter((log) => now - new Date(log.created_at).getTime() <= oneDayMs);
  const logs7d = logs.filter((log) => now - new Date(log.created_at).getTime() <= sevenDaysMs);

  const failed24h = logs24h.filter(isFailureLike).length;
  const failed7d = logs7d.filter(isFailureLike).length;
  const biometricFailures7d = logs7d.filter(
    (log) => isBiometricAction(log.action) && isFailureLike(log),
  ).length;

  const ipFailureCounts = new Map<string, number>();
  logs7d.filter(isFailureLike).forEach((log) => {
    const sourceIp = log.ip_address || "unknown";
    ipFailureCounts.set(sourceIp, (ipFailureCounts.get(sourceIp) || 0) + 1);
  });

  const flaggedIps = Array.from(ipFailureCounts.values()).filter((count) => count >= 3).length;

  const highRiskUsers = new Set(
    logs7d
      .filter(isFailureLike)
      .map((log) => log.resource_id)
      .filter((id): id is string => Boolean(id)),
  ).size;

  const threatLevel: SecurityThreatLevel =
    failed24h >= 30 || flaggedIps >= 5 ? "HIGH" : failed24h >= 10 || flaggedIps >= 2 ? "MEDIUM" : "LOW";

  const groupedIncidents = new Map<string, SecurityIncident>();
  logs7d.filter(isFailureLike).forEach((log) => {
    const sourceIp = log.ip_address || "unknown";
    const actor = log.resource_id || "unknown";
    const key = `${sourceIp}:${actor}:${log.action}`;
    const current = groupedIncidents.get(key);

    if (!current) {
      groupedIncidents.set(key, {
        id: key,
        title: log.action.replace(/_/g, " "),
        severity: "low",
        reason: "Repeated failure pattern",
        count: 1,
        latestAt: log.created_at,
        actor,
        sourceIp,
      });
      return;
    }

    current.count += 1;
    if (new Date(log.created_at) > new Date(current.latestAt)) {
      current.latestAt = log.created_at;
    }
  });

  const incidents = Array.from(groupedIncidents.values())
    .map((incident) => {
      const severity: SecurityIncidentSeverity =
        incident.count >= 5 ? "high" : incident.count >= 3 ? "medium" : "low";

      return {
        ...incident,
        severity,
        reason:
          severity === "high"
            ? "Frequent repeated failures from same source"
            : severity === "medium"
              ? "Multiple failures require review"
              : "Single/low-volume failure pattern",
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  return {
    failed24h,
    failed7d,
    biometricFailures7d,
    flaggedIps,
    highRiskUsers,
    threatLevel,
    incidents,
  };
};
