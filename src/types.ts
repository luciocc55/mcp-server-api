export interface MCPClientConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}
