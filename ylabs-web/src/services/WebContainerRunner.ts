import { WebContainer, FileSystemTree } from '@webcontainer/api';
import { ProjectRunner } from './Runner';

let webcontainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

export class WebContainerRunner implements ProjectRunner {
  private previewUrl: string = "";
  private serverProcess: any = null;

  async initialize(files: Record<string, string>): Promise<void> {
    if (!webcontainerInstance) {
      if (!bootPromise) {
        bootPromise = WebContainer.boot();
      }
      webcontainerInstance = await bootPromise;
    }
    
    // Convert flat file record to WebContainer FileSystemTree
    const tree: FileSystemTree = {};
    for (const [path, content] of Object.entries(files)) {
      const parts = path.split('/').filter(Boolean);
      let currentLevel = tree;
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          currentLevel[part] = {
            file: {
              contents: content
            }
          };
        } else {
          if (!currentLevel[part]) {
            currentLevel[part] = { directory: {} };
          }
          currentLevel = (currentLevel[part] as any).directory;
        }
      }
    }
    
    await webcontainerInstance.mount(tree);
  }

  async installDependencies(onData?: (data: string) => void): Promise<void> {
    if (!webcontainerInstance) throw new Error("WebContainer not initialized");
    
    // Skip installation if node_modules exists AND package.json hasn't changed
    try {
      const currentPkg = await webcontainerInstance.fs.readFile('/package.json', 'utf-8');
      const cachedPkg = await webcontainerInstance.fs.readFile('/.package.json.cached', 'utf-8').catch(() => "");
      
      if (currentPkg === cachedPkg) {
        const items = await webcontainerInstance.fs.readdir('/node_modules');
        if (items && items.length > 0) {
          if (onData) onData("Dependencies are already installed. Skipping npm install to save time...\n");
          return;
        }
      }
    } catch (e) {
      // Proceed with installation
    }
    
    const installProcess = await webcontainerInstance.spawn('pnpm', [
      'install', 
      '--prefer-offline',
      '--reporter=append-only'
    ]);
    
    installProcess.output.pipeTo(
      new WritableStream({
        write(data) {
          if (onData) onData(data);
        }
      })
    );
    
    const exitCode = await installProcess.exit;
    if (exitCode !== 0) {
      throw new Error("Installation failed");
    }
    
    // Cache the package.json to prevent redundant installs later
    try {
      const currentPkg = await webcontainerInstance.fs.readFile('/package.json', 'utf-8');
      await webcontainerInstance.fs.writeFile('/.package.json.cached', currentPkg);
    } catch (e) {}
  }

  async startDevServer(onData?: (data: string) => void): Promise<void> {
    if (!webcontainerInstance) throw new Error("WebContainer not initialized");
    
    // Listen for the server-ready event to get the URL
    webcontainerInstance.on('server-ready', (port, url) => {
      this.previewUrl = url;
    });

    let runCommand = 'dev';
    try {
      const currentPkgStr = await webcontainerInstance.fs.readFile('/package.json', 'utf-8');
      const currentPkg = JSON.parse(currentPkgStr);
      if (currentPkg.scripts && !currentPkg.scripts.dev && currentPkg.scripts.start) {
        runCommand = 'start';
      }
    } catch (e) {}
    
    this.serverProcess = await webcontainerInstance.spawn('pnpm', ['run', runCommand], {
      env: { 
        BROWSER: 'none',
        WDS_SOCKET_PORT: '0',
        DISABLE_ESLINT_PLUGIN: 'true'
      }
    });
    
    let crashLogs = "";
    this.serverProcess.output.pipeTo(
      new WritableStream({
        write(data) {
          crashLogs += data;
          if (onData) onData(data);
        }
      })
    );
    
    // Wait until the preview URL is available (or a timeout occurs)
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (this.previewUrl) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      // If the process crashes or exits prematurely, reject the promise to prevent infinite hang
      this.serverProcess.exit.then((code: number) => {
        if (code !== 0 && !this.previewUrl) {
          clearInterval(checkInterval);
          reject(new Error(`Dev server exited with code ${code}\nLogs:\n${crashLogs}`));
        }
      });
      
      // Also add a fallback timeout of 30 seconds just in case Vite hangs completely
      setTimeout(() => {
        if (!this.previewUrl) {
          clearInterval(checkInterval);
          reject(new Error("Dev server startup timed out after 30 seconds"));
        }
      }, 30000);
    });
  }

  async stop(): Promise<void> {
    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = null;
    }
  }

  async getPreviewUrl(): Promise<string> {
    return this.previewUrl;
  }

  async updateFile(path: string, content: string): Promise<void> {
    if (!webcontainerInstance) return;
    try {
      // Ensure the path starts with a slash
      const absolutePath = path.startsWith('/') ? path : `/${path}`;
      await webcontainerInstance.fs.writeFile(absolutePath, content);
    } catch (e) {
      console.error(`Failed to update file ${path} in WebContainer`, e);
    }
  }
}
