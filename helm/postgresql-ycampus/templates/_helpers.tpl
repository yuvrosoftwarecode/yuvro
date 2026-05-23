{{- define "postgresql-ycampus.name" -}}
{{- default "postgresql" .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "postgresql-ycampus.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name "postgresql-ycampus" | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{- define "postgresql-ycampus.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "postgresql-ycampus.labels" -}}
helm.sh/chart: {{ include "postgresql-ycampus.chart" . }}
{{ include "postgresql-ycampus.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "postgresql-ycampus.selectorLabels" -}}
app.kubernetes.io/name: {{ include "postgresql-ycampus.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}