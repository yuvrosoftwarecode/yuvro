export interface ProjectRunner {
  initialize(files: Record<string, string>): Promise<void>;
  installDependencies(onData?: (data: string) => void): Promise<void>;
  startDevServer(onData?: (data: string) => void): Promise<void>;
  stop(): Promise<void>;
  getPreviewUrl(): Promise<string>;
}
