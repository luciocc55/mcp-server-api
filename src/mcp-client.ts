/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Tool, Resource } from "@modelcontextprotocol/sdk/types.js";
import { MCPClientConfig } from "./types.js";

class MCPClient {
  private client: Client;
  private transport: StdioClientTransport;
  private connected: boolean = false;

  constructor(private config: MCPClientConfig) {
    // Initialize the transport with the server command and arguments
    this.transport = new StdioClientTransport({
      command: config.command,
      args: config.args || [],
      env: config.env,
    });

    // Create the MCP client
    this.client = new Client(
      {
        name: "mcp-typescript-client",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );
  }

  /**
   * Connect to the MCP server
   */
  async connect(): Promise<void> {
    if (this.connected) {
      throw new Error("Client is already connected");
    }

    try {
      await this.client.connect(this.transport);
      this.connected = true;
      console.log("Successfully connected to MCP server");
    } catch (error) {
      console.error("Failed to connect to MCP server:", error);
      throw error;
    }
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      await this.client.close();
      this.connected = false;
      console.log("Disconnected from MCP server");
    } catch (error) {
      console.error("Error disconnecting from MCP server:", error);
      throw error;
    }
  }

  /**
   * Check if the client is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * List available tools from the server
   */
  async listTools(): Promise<Tool[]> {
    this.ensureConnected();

    try {
      const response = await this.client.listTools();
      return response.tools;
    } catch (error) {
      console.error("Failed to list tools:", error);
      throw error;
    }
  }

  /**
   * Call a specific tool
   */
  async callTool(name: string, arguments_?: Record<string, any>): Promise<any> {
    this.ensureConnected();

    try {
      const response = await this.client.callTool({
        name,
        arguments: arguments_ || {},
      });
      return response.content;
    } catch (error) {
      console.error(`Failed to call tool "${name}":`, error);
      throw error;
    }
  }

  /**
   * List available resources from the server
   */
  async listResources(): Promise<Resource[]> {
    this.ensureConnected();

    try {
      const response = await this.client.listResources();
      return response.resources;
    } catch (error) {
      console.error("Failed to list resources:", error);
      throw error;
    }
  }

  /**
   * Read a specific resource
   */
  async readResource(uri: string): Promise<any> {
    this.ensureConnected();

    try {
      const response = await this.client.readResource({ uri });
      return response.contents;
    } catch (error) {
      console.error(`Failed to read resource "${uri}":`, error);
      throw error;
    }
  }

  /**
   * Get server capabilities
   */
  async getServerCapabilities(): Promise<any> {
    this.ensureConnected();
    return this.client.getServerCapabilities();
  }

  /**
   * Ensure the client is connected before making requests
   */
  private ensureConnected(): void {
    if (!this.connected) {
      throw new Error("Client is not connected. Call connect() first.");
    }
  }
}

export async function createMCPClient(
  config: MCPClientConfig
): Promise<MCPClient> {
  const client = new MCPClient(config);
  await client.connect();
  return client;
}
