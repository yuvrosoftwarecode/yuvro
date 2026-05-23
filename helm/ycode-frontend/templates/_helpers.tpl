{{- define "ycode-frontend.name" -}}
{{- default "ycode-frontend" .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "ycode-frontend.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name (include "ycode-frontend.name" .) | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{- define "ycode-frontend.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "ycode-frontend.labels" -}}
helm.sh/chart: {{ include "ycode-frontend.chart" . }}
{{ include "ycode-frontend.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "ycode-frontend.selectorLabels" -}}
app.kubernetes.io/name: {{ include "ycode-frontend.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}