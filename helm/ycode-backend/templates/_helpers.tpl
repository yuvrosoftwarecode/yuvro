{{/*
Expand the name of the chart.
*/}}
{{- define "ycode-backend.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "ycode-backend.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "ycode-backend.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "ycode-backend.labels" -}}
helm.sh/chart: {{ include "ycode-backend.chart" . }}
{{ include "ycode-backend.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "ycode-backend.selectorLabels" -}}
app.kubernetes.io/name: {{ include "ycode-backend.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Database host
*/}}
{{- define "ycode-backend.databaseHost" -}}
{{- if .Values.postgresql.enabled }}
{{- printf "%s-postgresql-ycode" .Release.Name }}
{{- else if .Values.postgresql.existingManaged }}
{{- .Values.postgresql.host }}
{{- else }}
{{- .Values.database.host | default "localhost" }}
{{- end }}
{{- end }}

{{/*
Code executor URL
*/}}
{{- define "ycode-backend.codeExecutorUrl" -}}
{{- if eq .Values.global.deployEnv "local" }}
http://localhost:8002
{{- else }}
http://{{ .Release.Name }}-code-executor:{{ .Values.codeExecutor.service.port | default 8002 }}
{{- end }}
{{- end }}