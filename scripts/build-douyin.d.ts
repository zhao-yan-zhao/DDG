export interface BuildDouyinOptions {
  rootDir?: string;
  sourceDir?: string;
  targetDir?: string;
  appId?: string;
  projectName?: string;
}

export interface BuildDouyinResult {
  success: boolean;
  targetDir: string;
  copiedFilesCount: number;
  totalBytes: number;
  entryFile: string;
}

export function buildDouyin(options?: BuildDouyinOptions): BuildDouyinResult;
