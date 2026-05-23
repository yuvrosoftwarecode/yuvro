{{/*
Expand the name of the chart.
*/}}
{{- define "postgresql-ycode.name" -}}
{{- default "postgresql" .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "postgresql-ycode.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name "postgresql-ycode" | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "postgresql-ycode.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "postgresql-ycode.labels" -}}
helm.sh/chart: {{ include "postgresql-ycode.chart" . }}
{{ include "postgresql-ycode.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "postgresql-ycode.selectorLabels" -}}
app.kubernetes.io/name: {{ include "postgresql-ycode.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}