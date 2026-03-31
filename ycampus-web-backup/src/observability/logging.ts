/**
 * Structured logging for React frontend
 */

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: number;
  service: string;
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
  [key: string]: any;
}

class Logger {
  private service: string;
  private userId?: string;
  private sessionId: string;
  private logLevel: LogEntry['level'];

  constructor() {
    this.service = 'yc-web';
    this.sessionId = this.generateSessionId();
    this.userId = localStorage.getItem('userId') || undefined;
    this.logLevel = (import.meta.env.VITE_LOG_LEVEL as LogEntry['level']) || 'info';
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private createLogEntry(level: LogEntry['level'], message: string, extra: Record<string, any> = {}): LogEntry {
    return {
      level,
      message,
      timestamp: Date.now(),
      service: this.service,
      userId: this.userId,
      sessionId: this.sessionId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...extra
    };
  }

  private shouldLog(level: LogEntry['level']): boolean {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.logLevel];
  }

  private async sendLog(entry: LogEntry): Promise<void> {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    try {
      // Send to console for development
      const consoleMethod = entry.level === 'warn' ? 'warn' : entry.level === 'error' ? 'error' : 'log';
      console[consoleMethod](`[${entry.level.toUpperCase()}] ${entry.message}`, entry);

      // Send to OTLP endpoint if enabled and configured
      const isOtelEnabled = import.meta.env.VITE_OTEL_ENABLED === 'true';
      const logsEndpoint = import.meta.env.VITE_OTEL_LOGS_ENDPOINT || 
                          (import.meta.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT?.replace('/v1/traces', '/v1/logs'));
      
      if (isOtelEnabled && logsEndpoint) {
        
        // Create OTLP logs payload
        const otlpPayload = {
          resourceLogs: [{
            resource: {
              attributes: [
                { key: 'service.name', value: { stringValue: this.service } },
                { key: 'service.version', value: { stringValue: '1.0.0' } },
                { key: 'service.instance.id', value: { stringValue: this.sessionId } }
              ]
            },
            scopeLogs: [{
              scope: {
                name: 'yc-web-logger',
                version: '1.0.0'
              },
              logRecords: [{
                timeUnixNano: (entry.timestamp * 1000000).toString(),
                severityNumber: this.getSeverityNumber(entry.level),
                severityText: entry.level.toUpperCase(),
                body: { stringValue: entry.message },
                attributes: Object.entries(entry)
                  .filter(([key]) => !['level', 'message', 'timestamp', 'service'].includes(key))
                  .map(([key, value]) => ({
                    key,
                    value: { stringValue: String(value) }
                  }))
              }]
            }]
          }]
        };

        await fetch(logsEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(otlpPayload)
        }).catch(error => {
          console.warn('Failed to send log to OTLP endpoint:', error);
        });
      }
    } catch (error) {
      console.error('Failed to send log:', error);
    }
  }

  private getSeverityNumber(level: LogEntry['level']): number {
    switch (level) {
      case 'debug': return 5;
      case 'info': return 9;
      case 'warn': return 13;
      case 'error': return 17;
      default: return 9;
    }
  }

  debug(message: string, extra?: Record<string, any>): void {
    const entry = this.createLogEntry('debug', message, extra);
    this.sendLog(entry);
  }

  info(message: string, extra?: Record<string, any>): void {
    const entry = this.createLogEntry('info', message, extra);
    this.sendLog(entry);
  }

  warn(message: string, extra?: Record<string, any>): void {
    const entry = this.createLogEntry('warn', message, extra);
    this.sendLog(entry);
  }

  error(message: string, error?: Error, extra?: Record<string, any>): void {
    const logExtra = { ...extra };
    
    if (error) {
      logExtra.error_name = error.name;
      logExtra.error_message = error.message;
      logExtra.error_stack = error.stack;
    }

    const entry = this.createLogEntry('error', message, logExtra);
    this.sendLog(entry);
  }

  // Convenience methods for common use cases
  logUserAction(action: string, details?: Record<string, any>): void {
    this.info(`User action: ${action}`, { action_type: 'user_interaction', ...details });
  }

  logApiCall(method: string, url: string, status: number, duration: number, error?: Error): void {
    const level = status >= 400 ? 'error' : 'info';
    const message = `API ${method} ${url} - ${status}`;
    
    const extra = {
      api_method: method,
      api_url: url,
      api_status: status,
      api_duration_ms: duration,
      action_type: 'api_call'
    };

    if (level === 'error') {
      this.error(message, error, extra);
    } else {
      this.info(message, extra);
    }
  }

  logCodeExecution(language: string, success: boolean, duration?: number, error?: string): void {
    const message = `Code execution: ${language} - ${success ? 'success' : 'failed'}`;
    const extra = {
      code_language: language,
      code_success: success,
      code_duration_ms: duration,
      action_type: 'code_execution'
    };

    if (!success) {
      this.error(message, error ? new Error(error) : undefined, extra);
    } else {
      this.info(message, extra);
    }
  }

  logNavigation(from: string, to: string): void {
    this.info(`Navigation: ${from} -> ${to}`, {
      navigation_from: from,
      navigation_to: to,
      action_type: 'navigation'
    });
  }

  updateUserId(userId: string): void {
    this.userId = userId;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for use in error boundaries
export const logError = (error: Error, errorInfo?: any) => {
  logger.error('React Error Boundary', error, {
    error_info: errorInfo,
    action_type: 'react_error'
  });
};