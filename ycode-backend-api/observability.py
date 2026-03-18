"""
OpenTelemetry configuration for Django backend
"""
import os
import logging
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.instrumentation.django import DjangoInstrumentor

# Note: Using psycopg v3, not psycopg2 - instrumentation handled differently
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.instrumentation.logging import LoggingInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter
from opentelemetry._logs import set_logger_provider
from prometheus_client import start_http_server, Counter, Histogram, Gauge
import time
import json

# Prometheus metrics
REQUEST_COUNT = Counter(
    "http_requests_total", "Total HTTP requests", ["method", "endpoint", "status"]
)
REQUEST_DURATION = Histogram(
    "http_request_duration_seconds", "HTTP request duration", ["method", "endpoint"]
)
ACTIVE_CONNECTIONS = Gauge("active_connections", "Active database connections")


def setup_telemetry():
    """Initialize OpenTelemetry tracing and metrics"""

    # Check if OpenTelemetry is enabled
    otel_enabled = os.getenv("OTEL_ENABLED", "false").lower() == "true"

    if not otel_enabled:
        logging.info("OpenTelemetry is disabled")
        return

    logging.info("Initializing OpenTelemetry...")

    # Resource identifies your service
    resource = Resource.create(
        {
            "service.name": os.getenv("OTEL_SERVICE_NAME", "yc-backend-api"),
            "service.version": "1.0.0",
            "service.instance.id": os.getenv("HOSTNAME", "localhost"),
        }
    )

    # Configure tracing
    trace_provider = TracerProvider(resource=resource)
    trace.set_tracer_provider(trace_provider)

    # Configure OTLP exporter
    otlp_exporter = OTLPSpanExporter(
        endpoint=os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317"),
        insecure=True,
    )

    span_processor = BatchSpanProcessor(otlp_exporter)
    trace_provider.add_span_processor(span_processor)

    # Configure metrics
    metric_reader = PeriodicExportingMetricReader(
        OTLPMetricExporter(
            endpoint=os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317"),
            insecure=True,
        ),
        export_interval_millis=5000,
    )

    metrics_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
    metrics.set_meter_provider(metrics_provider)

    # Configure logging
    logger_provider = LoggerProvider(resource=resource)
    set_logger_provider(logger_provider)

    otlp_log_exporter = OTLPLogExporter(
        endpoint=os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317"),
        insecure=True,
    )

    logger_provider.add_log_record_processor(BatchLogRecordProcessor(otlp_log_exporter))

    # Set up OTLP logging handler
    handler = LoggingHandler(level=logging.INFO, logger_provider=logger_provider)

    # Configure Django logger specifically
    django_logger = logging.getLogger("django")
    django_logger.addHandler(handler)
    django_logger.setLevel(logging.INFO)

    # Configure application logger
    app_logger = logging.getLogger("yc-backend-api")
    app_logger.addHandler(handler)
    app_logger.setLevel(logging.INFO)

    # Auto-instrument Django
    DjangoInstrumentor().instrument()
    # Note: psycopg v3 instrumentation is handled automatically by Django instrumentor
    RequestsInstrumentor().instrument()
    LoggingInstrumentor().instrument(set_logging_format=True)

    # Start Prometheus metrics server
    try:
        start_http_server(9001)  # Different port for backend metrics
        logging.info("Prometheus metrics server started on port 9001")
    except Exception as e:
        logging.warning(f"Could not start Prometheus server: {e}")


def get_tracer(name: str):
    """Get a tracer instance"""
    return trace.get_tracer(name)


def get_meter(name: str):
    """Get a meter instance"""
    return metrics.get_meter(name)


def log_structured(level: str, message: str, **kwargs):
    """Log structured data with additional context"""
    import uuid

    logger = logging.getLogger("yc-backend-api")

    # Convert UUID objects to strings for JSON serialization
    serializable_kwargs = {}
    for key, value in kwargs.items():
        if isinstance(value, uuid.UUID):
            serializable_kwargs[key] = str(value)
        else:
            serializable_kwargs[key] = value

    # Create structured log entry (don't include 'message' in extra to avoid conflicts)
    log_data = {
        "timestamp": time.time(),
        "service": "yc-backend-api",
        **serializable_kwargs,
    }

    # Log based on level with structured data as extra
    log_message = (
        f"{message} | {json.dumps(serializable_kwargs)}"
        if serializable_kwargs
        else message
    )

    if level.upper() == "ERROR":
        logger.error(log_message, extra=log_data)
    elif level.upper() == "WARNING":
        logger.warning(log_message, extra=log_data)
    elif level.upper() == "INFO":
        logger.info(log_message, extra=log_data)
    elif level.upper() == "DEBUG":
        logger.debug(log_message, extra=log_data)
    else:
        logger.info(log_message, extra=log_data)


class TracingMiddleware:
    """Custom middleware for additional tracing and metrics"""

    def __init__(self, get_response):
        self.get_response = get_response
        self.otel_enabled = os.getenv("OTEL_ENABLED", "false").lower() == "true"
        self.tracer = get_tracer(__name__) if self.otel_enabled else None

    def __call__(self, request):
        start_time = time.time()

        if self.otel_enabled and self.tracer:
            with self.tracer.start_as_current_span(
                f"{request.method} {request.path}",
                attributes={
                    "http.method": request.method,
                    "http.url": request.build_absolute_uri(),
                    "http.user_agent": request.META.get("HTTP_USER_AGENT", ""),
                    "user.id": getattr(request.user, "id", None)
                    if hasattr(request, "user")
                    else None,
                },
            ) as span:
                return self._process_request_with_tracing(request, start_time, span)
        else:
            return self._process_request_without_tracing(request, start_time)

    def _process_request_with_tracing(self, request, start_time, span):
        response = self.get_response(request)

        # Add response attributes to span
        span.set_attribute("http.status_code", response.status_code)
        span.set_attribute(
            "http.response_size",
            len(response.content) if hasattr(response, "content") else 0,
        )

        self._record_metrics_and_logs(request, response, start_time)
        return response

    def _process_request_without_tracing(self, request, start_time):
        response = self.get_response(request)
        self._record_metrics_and_logs(request, response, start_time)
        return response

    def _record_metrics_and_logs(self, request, response, start_time):
        # Record Prometheus metrics
        duration = time.time() - start_time
        REQUEST_COUNT.labels(
            method=request.method, endpoint=request.path, status=response.status_code
        ).inc()

        REQUEST_DURATION.labels(method=request.method, endpoint=request.path).observe(
            duration
        )

        # Log request details
        user_id = (
            getattr(request.user, "id", None) if hasattr(request, "user") else None
        )
        log_structured(
            "info",
            "HTTP Request",
            method=request.method,
            path=request.path,
            status_code=response.status_code,
            duration_ms=duration * 1000,
            user_id=str(user_id) if user_id else None,
            user_agent=request.META.get("HTTP_USER_AGENT", "")[
                :100
            ],  # Truncate long user agents
            remote_addr=request.META.get("REMOTE_ADDR", ""),
        )
