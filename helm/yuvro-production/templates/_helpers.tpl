{{/*
Expand the name of the chart.
*/}}
{{- define "yuvro-production.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "yuvro-production.fullname" -}}
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
{{- define "yuvro-production.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "yuvro-production.labels" -}}
helm.sh/chart: {{ include "yuvro-production.chart" . }}
{{ include "yuvro-production.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "yuvro-production.selectorLabels" -}}
app.kubernetes.io/name: {{ include "yuvro-production.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Common environment variables for database
*/}}
{{- define "yuvro-production.dbEnv" -}}
- name: DATABASE_HOST
  value: {{ .Values.global.database.host }}
- name: DATABASE_PORT
  value: "{{ .Values.global.database.port }}"
- name: DATABASE_USER
  valueFrom:
    secretKeyRef:
      name: yuvro-db-credentials
      key: username
- name: DATABASE_PASSWORD
  valueFrom:
    secretKeyRef:
      name: yuvro-db-credentials
      key: password
- name: PGSSLMODE
  value: "{{ .Values.global.database.sslMode }}"
{{- end }}
