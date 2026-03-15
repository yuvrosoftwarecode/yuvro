#!/bin/bash

# Test script for YC Platform Observability Stack

set -e

echo "🧪 Testing YC Platform Observability Stack..."

# Test Grafana
echo "📊 Testing Grafana..."
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Grafana is healthy"
else
    echo "❌ Grafana is not responding"
    exit 1
fi

# Test Jaeger
echo "🔍 Testing Jaeger..."
if curl -s http://localhost:16686/api/services > /dev/null; then
    echo "✅ Jaeger is healthy"
else
    echo "❌ Jaeger is not responding"
    exit 1
fi

# Test Prometheus
echo "📈 Testing Prometheus..."
if curl -s http://localhost:9090/-/healthy > /dev/null; then
    echo "✅ Prometheus is healthy"
else
    echo "❌ Prometheus is not responding"
    exit 1
fi

# Test Loki
echo "📝 Testing Loki..."
if curl -s http://localhost:3100/ready > /dev/null; then
    echo "✅ Loki is healthy"
else
    echo "❌ Loki is not responding"
    exit 1
fi

# Test OpenTelemetry Collector
echo "🔄 Testing OpenTelemetry Collector..."
if curl -s http://localhost:8889/metrics > /dev/null; then
    echo "✅ OpenTelemetry Collector is healthy"
else
    echo "❌ OpenTelemetry Collector is not responding"
    exit 1
fi

# Test OTLP endpoints
echo "📡 Testing OTLP endpoints..."
if nc -z localhost 4317 2>/dev/null; then
    echo "✅ OTLP gRPC endpoint (4317) is accessible"
else
    echo "❌ OTLP gRPC endpoint (4317) is not accessible"
fi

if nc -z localhost 4318 2>/dev/null; then
    echo "✅ OTLP HTTP endpoint (4318) is accessible"
else
    echo "❌ OTLP HTTP endpoint (4318) is not accessible"
fi

echo ""
echo "🎉 Observability stack test completed successfully!"
echo ""
echo "📊 Access your dashboards:"
echo "   • Grafana: http://localhost:3001 (admin/admin)"
echo "   • Jaeger: http://localhost:16686"
echo "   • Prometheus: http://localhost:9090"
echo "   • Loki: http://localhost:3100"
echo ""
echo "🚀 Next steps:"
echo "   1. Start your application services: make dev"
echo "   2. Generate some traffic to see traces and metrics"
echo "   3. Explore the pre-configured Grafana dashboards"