{{- define "ycampus-backend.name" -}}
{{- default "ycampus-backend" .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "ycampus-backend.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name (include "ycampus-backend.name" .) | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{- define "ycampus-backend.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "ycampus-backend.labels" -}}
helm.sh/chart: {{ include "ycampus-backend.chart" . }}
{{ include "ycampus-backend.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "ycampus-backend.selectorLabels" -}}
app.kubernetes.io/name: {{ include "ycampus-backend.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "ycampus-backend.databaseHost" -}}
{{- if .Values.postgresql.enabled }}
{{- printf "%s-postgresql-ycampus" .Release.Name }}
{{- else if .Values.postgresql.existingManaged }}
{{- .Values.postgresql.host }}
{{- else }}
{{- .Values.database.host | default "localhost" }}
{{- end }}
{{- end }}

{{- define "ycampus-backend.codeExecutorUrl" -}}
{{- if eq .Values.global.deployEnv "local" }}
http://localhost:8002
{{- else }}
http://{{ .Release.Name }}-code-executor:{{ .Values.codeExecutor.service.port | default 8002 }}
{{- end }}
{{- end }}