export interface BuildWechatOptions {
  rootDir?: string;
  sourceDir?: string;
  targetDir?: string;
  appId?: string;
  projectName?: string;
  openDataContext?: string;
}

export interface BuildWechatResult {
  success: boolean;
  targetDir: string;
  copiedFilesCount: number;
  totalBytes: number;
  entryFile: string;
}

export function buildWechat(options?: BuildWechatOptions): BuildWechatResult;
