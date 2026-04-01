
import("@opentelemetry/sdk-trace-web")
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { logger } from './logging';

const isOtelEnabled = import.meta.env.VITE_OTEL_ENABLED === 'true';
const otlpUrl = import.meta.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces';

console.log('OpenTelemetry enabled:', isOtelEnabled);
console.log('OTLP Trace Exporter URL:', otlpUrl);

let tracer: any;

if (isOtelEnabled) {
  const exporter = new OTLPTraceExporter({
    url: otlpUrl,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const provider = new WebTracerProvider({
    spanProcessors: [new BatchSpanProcessor(exporter)]
  });

  provider.register();

  // Set global environment variables for auto-instrumentations
  if (typeof window !== 'undefined') {
    (window as any).OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = otlpUrl;
  }

  // Register instrumentations with explicit configuration
  registerInstrumentations({
    instrumentations: [
      getWebAutoInstrumentations({
        '@opentelemetry/instrumentation-document-load': {
          enabled: true,
        },
        '@opentelemetry/instrumentation-user-interaction': {
          enabled: true,
        },
        '@opentelemetry/instrumentation-fetch': {
          enabled: true,
          propagateTraceHeaderCorsUrls: [
            /^http:\/\/localhost:8001\/.*$/,
            /^http:\/\/localhost:8002\/.*$/,
          ],
        },
        '@opentelemetry/instrumentation-xml-http-request': {
          enabled: true,
          propagateTraceHeaderCorsUrls: [
            /^http:\/\/localhost:8001\/.*$/,
            /^http:\/\/localhost:8002\/.*$/,
          ],
        },
      }),
    ],
  });

  tracer = trace.getTracer('yc-web', '1.0.0');
} else {
  // Create a no-op tracer when OpenTelemetry is disabled
  tracer = {
    startSpan: () => ({
      setStatus: () => { },
      setAttributes: () => { },
      recordException: () => { },
      end: () => { },
    }),
  };
}

/**
 * Create a custom span for tracking user interactions
 */
export function createSpan(name: string, attributes?: Record<string, string | number | boolean>) {
  if (!isOtelEnabled) {
    return {
      setStatus: () => { },
      setAttributes: () => { },
      recordException: () => { },
      end: () => { },
    };
  }

  return tracer.startSpan(name, {
    attributes: {
      'component': 'yc-web',
      ...attributes,
    },
  });
}

/**
 * Wrap a function with tracing
 */
export function withTracing<T extends (...args: any[]) => any>(
  name: string,
  fn: T,
  attributes?: Record<string, string | number | boolean>
): T {
  return ((...args: any[]) => {
    const span = createSpan(name, attributes);

    try {
      const result = fn(...args);

      // Handle promises
      if (result && typeof result.then === 'function') {
        return result
          .then((value: any) => {
            span.setStatus({ code: SpanStatusCode.OK });
            span.end();
            return value;
          })
          .catch((error: any) => {
            span.recordException(error);
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: error.message
            });
            span.end();
            throw error;
          });
      }

      // Handle synchronous results
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      return result;
    } catch (error: any) {
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message
      });
      span.end();
      throw error;
    }
  }) as T;
}

export function trackUserAction(action: string, details?: Record<string, any>) {
  const span = createSpan(`user.${action}`, {
    'user.action': action,
    'user.id': localStorage.getItem('userId') || 'anonymous',
    ...details,
  });
  // Auto-end the span after a short delay for user actions
  setTimeout(() => {
    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
  }, 100);
}

/**
 * Track API calls
 */
export function trackApiCall(method: string, url: string, status?: number, duration?: number) {
  const attributes: Record<string, string | number | boolean> = {
    'http.method': method,
    'http.url': url,
  };

  if (status !== undefined) {
    attributes['http.status_code'] = status;
  }

  if (duration !== undefined) {
    attributes['http.duration_ms'] = duration;
  }

  const span = createSpan(`api.${method.toLowerCase()}`, attributes);
  if (status && status >= 400) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: `HTTP ${status}`
    });
  } else {
    span.setStatus({ code: SpanStatusCode.OK });
  }

  span.end();
}

export function trackCodeExecution(language: string, success: boolean, duration?: number, error?: string) {
  const attributes: Record<string, string | number | boolean> = {
    'code.language': language,
    'code.success': success,
  };

  if (duration !== undefined) {
    attributes['code.duration_ms'] = duration;
  }

  const span = createSpan('code.execution', attributes);

  if (!success && error) {
    logger.logCodeExecution(language, success, duration, error);
    span.recordException(new Error(error));
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error
    });
  } else {
    span.setStatus({ code: SpanStatusCode.OK });
  }

  span.end();
}

export function trackNavigation(from: string, to: string) {
  const span = createSpan('navigation', {
    'navigation.from': from,
    'navigation.to': to,
  });

  span.setStatus({ code: SpanStatusCode.OK });
  span.end();
}

export { tracer };