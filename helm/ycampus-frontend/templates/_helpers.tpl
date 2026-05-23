{{- define "ycampus-frontend.name" -}}
{{- default "ycampus-frontend" .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "ycampus-frontend.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name (include "ycampus-frontend.name" .) | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{- define "ycampus-frontend.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "ycampus-frontend.labels" -}}
helm.sh/chart: {{ include "ycampus-frontend.chart" . }}
{{ include "ycampus-frontend.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "ycampus-frontend.selectorLabels" -}}
app.kubernetes.io/name: {{ include "ycampus-frontend.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}