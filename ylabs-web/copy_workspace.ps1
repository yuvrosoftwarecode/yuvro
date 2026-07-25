New-Item -ItemType Directory -Force -Path 'D:\yuvro\yuvro\ylabs-web\src\components\recruiter'
Copy-Item -Path 'D:\yuvro\yuvro-labs\src\components\recruiter\IntelligenceTab.tsx' -Destination 'D:\yuvro\yuvro\ylabs-web\src\components\recruiter\IntelligenceTab.tsx' -Force
Copy-Item -Path 'D:\yuvro\yuvro-labs\src\components\recruiter\SettingsTab.tsx' -Destination 'D:\yuvro\yuvro\ylabs-web\src\components\recruiter\SettingsTab.tsx' -Force
Copy-Item -Path 'D:\yuvro\yuvro-labs\src\lib\recruiterCandidateDetail.ts' -Destination 'D:\yuvro\yuvro\ylabs-web\src\lib\recruiterCandidateDetail.ts' -Force
Copy-Item -Path 'D:\yuvro\yuvro-labs\src\routes\recruiter.evaluations.$id.workspace.tsx' -Destination 'D:\yuvro\yuvro\ylabs-web\src\routes\recruiter.evaluations.$id.workspace.tsx' -Force
Write-Host "Copy completed successfully."
