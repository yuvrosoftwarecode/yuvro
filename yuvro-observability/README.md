# Yuvro Platform Observability Stack

This directory contains the configuration for the comprehensive observability stack for the Yuvro Platform, including distributed tracing, metrics collection, and monitoring dashboards.

## Components

### 1. OpenTelemetry Collector
- **Purpose**: Collects, processes, and exports telemetry data (traces, metrics, logs)
- **Port**: 4317 (gRPC), 4318 (HTTP)
- **Configuration**: `otel-collector-config.yaml`

### 2. Jaeger
- **Purpose**: Distributed tracing backend for storing and visualizing traces
- **Port**: 16686 (UI)
- **Features**: 
  - Trace visualization
  - Service dependency mapping
  - Performance analysis

### 3. Prometheus
- **Purpose**: Metrics collection and storage
- **Port**: 9090 (UI)
- **Configuration**: `prometheus.yml`
- **Metrics**: HTTP requests, response times, code execution metrics

### 4. Grafana
- **Purpose**: Visualization and alerting platform
- **Port**: 3001 (UI)
- **Credentials**: admin/admin
- **Dashboards**: Pre-configured dashboards for YC Platform metrics

## Service Instrumentation

### Backend (Django)
- **File**: `yc-backend-api/observability.py`
- **Features**:
  - Automatic HTTP request tracing
  - Database query tracing
  - Custom middleware for additional metrics
  - Prometheus metrics export

### Code Executor (FastAPI)
- **File**: `yuvro-code-executer/observability.py`
- **Features**:
  - Code execution tracing
  - Performance metrics (duration, memory usage)
  - Language-specific metrics
  - Error tracking

### Frontend (React)
- **File**: `yc-web/src/observability/telemetry.ts`
- **Features**:
  - User interaction tracking
  - API call tracing
  - Navigation tracking
  - Code execution event tracking

## Getting Started

### 1. Start the Observability Stack

```bash
# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

### 2. Access the Dashboards

- **Grafana**: http://localhost:3001 (admin/admin)
- **Jaeger**: http://localhost:16686
- **Prometheus**: http://localhost:9090

### 3. View Traces and Metrics

1. **Grafana Dashboards**:
   - YC Platform Overview: General health and performance metrics
   - YC Platform Detailed Metrics: Comprehensive service metrics

2. **Jaeger Traces**:
   - Search for traces by service name (yc-backend-api, yuvro-code-executer, yc-web)
   - View distributed traces across services
   - Analyze performance bottlenecks

3. **Prometheus Metrics**:
   - Query custom metrics directly
   - Set up alerts based on thresholds

## Key Metrics

### HTTP Metrics
- `http_requests_total`: Total HTTP requests by method, endpoint, status
- `http_request_duration_seconds`: Request duration histogram

### Code Execution Metrics
- `code_executions_total`: Total code executions by language and status
- `code_execution_duration_seconds`: Code execution duration
- `active_code_executions`: Currently running executions
- `code_execution_memory_bytes`: Memory usage during execution

### Database Metrics
- `active_connections`: Active database connections

## Trace Context Propagation

The system automatically propagates trace context between:
- Frontend → Backend API calls
- Backend → Code Executor service calls
- Database operations
- External API calls

## Environment Variables

### Backend Services
- `OTEL_EXPORTER_OTLP_ENDPOINT`: OpenTelemetry collector endpoint
- `OTEL_SERVICE_NAME`: Service name for tracing
- `OTEL_RESOURCE_ATTRIBUTES`: Additional resource attributes

### Frontend
- `VITE_OTEL_EXPORTER_OTLP_ENDPOINT`: OpenTelemetry collector HTTP endpoint
- `VITE_OTEL_SERVICE_NAME`: Service name for browser tracing

## Custom Instrumentation

### Adding Custom Spans (Backend)
```python
from observability import get_tracer

tracer = get_tracer(__name__)

with tracer.start_as_current_span("custom_operation") as span:
    span.set_attribute("custom.attribute", "value")
    # Your code here
```

### Adding Custom Spans (Frontend)
```typescript
import { createSpan, trackUserAction } from '../observability/telemetry';

// Track user actions
trackUserAction('button_click', { button_id: 'submit' });

// Custom spans
const span = createSpan('custom_operation', { 
  operation_type: 'data_processing' 
});
// Your code here
span.end();
```

## Troubleshooting

### Common Issues

1. **Services not appearing in Jaeger**:
   - Check OTEL_EXPORTER_OTLP_ENDPOINT configuration
   - Verify OpenTelemetry collector is running
   - Check service logs for instrumentation errors

2. **Missing metrics in Prometheus**:
   - Verify Prometheus scrape configuration
   - Check if services expose metrics endpoints
   - Ensure services are in the correct network

3. **Grafana dashboards not loading**:
   - Check Prometheus data source configuration
   - Verify dashboard provisioning files
   - Check Grafana logs for errors

### Logs and Debugging

```bash
# Check OpenTelemetry collector logs
docker-compose logs otel-collector

# Check service instrumentation
docker-compose logs backend
docker-compose logs code-executor

# Check Grafana provisioning
docker-compose logs grafana
```

## Performance Considerations

- **Sampling**: Configure trace sampling in production to reduce overhead
- **Batch Processing**: OpenTelemetry collector batches telemetry data for efficiency
- **Resource Limits**: Set appropriate memory limits for observability services
- **Retention**: Configure data retention policies for Prometheus and Jaeger

## Security

- Change default Grafana admin password in production
- Restrict access to observability dashboards
- Use proper authentication for production deployments
- Consider network segmentation for observability services