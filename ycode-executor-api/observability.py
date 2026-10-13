"""
OpenTelemetry configuration for FastAPI code executor
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
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.logging import LoggingInstrumentor
from opentelemetry.sdk.resources import Resource
from prometheus_client import start_http_server, Counter, Histogram, Gauge
import time

# Prometheus metrics
CODE_EXECUTIONS = Counter('code_executions_total', 'Total code executions', ['language', 'status'])
EXECUTION_DURATION = Histogram('code_execution_duration_seconds', 'Code execution duration', ['language'])
ACTIVE_EXECUTIONS = Gauge('active_code_executions', 'Currently running code executions')
MEMORY_USAGE = Gauge('code_execution_memory_bytes', 'Memory usage during code execution')

def setup_telemetry():
    """Initialize OpenTelemetry tracing and metrics"""
    
    # Check if OpenTelemetry is enabled
    otel_enabled = os.getenv("OTEL_ENABLED", "false").lower() == "true"
    
    if not otel_enabled:
        logging.info("OpenTelemetry is disabled")
        return
    
    logging.info("Initializing OpenTelemetry...")
    
    # Resource identifies your service
    resource = Resource.create({
        "service.name": os.getenv("OTEL_SERVICE_NAME", "ycode-executor-api"),
        "service.version": "1.0.0",
        "service.instance.id": os.getenv("HOSTNAME", "localhost"),
    })
    
    # Configure tracing
    trace_provider = TracerProvider(resource=resource)
    trace.set_tracer_provider(trace_provider)
    
    # Configure OTLP exporter
    otlp_exporter = OTLPSpanExporter(
        endpoint=os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317"),
        insecure=True
    )
    
    span_processor = BatchSpanProcessor(otlp_exporter)
    trace_provider.add_span_processor(span_processor)
    
    # Configure metrics
    metric_reader = PeriodicExportingMetricReader(
        OTLPMetricExporter(
            endpoint=os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317"),
            insecure=True
        ),
        export_interval_millis=5000,
    )
    
    metrics_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
    metrics.set_meter_provider(metrics_provider)
    
    # Auto-instrument FastAPI and HTTP clients
    HTTPXClientInstrumentor().instrument()
    LoggingInstrumentor().instrument(set_logging_format=True)
    
    # Start Prometheus metrics server on different port
    try:
        start_http_server(9002)  # Different port for code executor metrics
        logging.info("Prometheus metrics server started on port 9002")
    except Exception as e:
        logging.warning(f"Could not start Prometheus server: {e}")

def instrument_fastapi_app(app):
    """Instrument FastAPI application"""
    otel_enabled = os.getenv("OTEL_ENABLED", "false").lower() == "true"
    if otel_enabled:
        FastAPIInstrumentor.instrument_app(app)
    return app

def get_tracer(name: str):
    """Get a tracer instance"""
    otel_enabled = os.getenv("OTEL_ENABLED", "false").lower() == "true"
    if otel_enabled:
        return trace.get_tracer(name)
    else:
        # Return a no-op tracer
        class NoOpTracer:
            def start_as_current_span(self, name, **kwargs):
                class NoOpSpan:
                    def __enter__(self):
                        return self
                    def __exit__(self, *args):
                        pass
                    def set_attribute(self, key, value):
                        pass
                return NoOpSpan()
        return NoOpTracer()

def get_meter(name: str):
    """Get a meter instance"""
    return metrics.get_meter(name)

def record_code_execution(language: str, status: str, duration: float, memory_usage: int = 0):
    """Record code execution metrics"""
    CODE_EXECUTIONS.labels(language=language, status=status).inc()
    EXECUTION_DURATION.labels(language=language).observe(duration)
    if memory_usage > 0:
        MEMORY_USAGE.set(memory_usage)