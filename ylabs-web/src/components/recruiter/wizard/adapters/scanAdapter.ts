import { labTaskAIService, InspectRepoResponse } from "@/services/labTaskAIService";

export interface ScanProgressCallback {
  (stageIndex: number): void;
}

export async function runScanRepository(payload: {
  repoIdentifier: string;
  branch: string;
  installationId?: string | null;
  onProgress: ScanProgressCallback;
}): Promise<{ files: string[]; fileCount: number; keyFiles: Record<string, string>; cloneToken?: string }> {
  if (!payload.repoIdentifier.trim()) {
    throw new Error("Repository identifier or URL is required to scan.");
  }

  payload.onProgress(0); // Cloning repository
  await new Promise((r) => setTimeout(r, 400));

  payload.onProgress(1); // Indexing files
  const apiRes: InspectRepoResponse = await labTaskAIService.inspectRepo({
    repo_identifier: payload.repoIdentifier,
    branch: payload.branch || "main",
    installation_id: payload.installationId || undefined,
    include_clone_token: true,
  });

  payload.onProgress(2); // Detecting dependencies
  await new Promise((r) => setTimeout(r, 400));

  if (apiRes && Array.isArray(apiRes.files)) {
    return {
      files: apiRes.files,
      fileCount: apiRes.file_count ?? apiRes.files.length,
      keyFiles: apiRes.key_files || {},
      cloneToken: apiRes.clone_token,
    };
  }

  throw new Error("Could not inspect repository. Please check the repository permissions and branch name.");
}
