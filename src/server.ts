import express from "express";
import cors from "cors";
import { createMCPClient } from "./mcp-client";
import { MCPClientConfig } from "./types";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Store MCP client instances
const mcpClients = new Map();

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Connect to an MCP server
app.post("/mcp/connect", async (req, res) => {
  try {
    const { serverId, config }: { serverId: string; config: MCPClientConfig } =
      req.body;

    if (!serverId || !config) {
      return res
        .status(400)
        .json({ error: "serverId and config are required" });
    }

    // Check if client already exists
    if (mcpClients.has(serverId)) {
      return res.status(400).json({ error: "Client already connected" });
    }

    const client = await createMCPClient(config);

    mcpClients.set(serverId, client);

    res.json({
      message: "Successfully connected to MCP server",
      serverId,
      capabilities: await client.getServerCapabilities(),
    });
  } catch (error) {
    console.error("Connection error:", error);
    res.status(500).json({ error: "Failed to connect to MCP server" });
  }
});

// Disconnect from an MCP server
app.post("/mcp/disconnect/:serverId", async (req, res) => {
  try {
    const { serverId } = req.params;
    const client = mcpClients.get(serverId);

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    await client.disconnect();
    mcpClients.delete(serverId);

    res.json({ message: "Successfully disconnected from MCP server" });
  } catch (error) {
    console.error("Disconnection error:", error);
    res.status(500).json({ error: "Failed to disconnect from MCP server" });
  }
});

// List available tools
app.get("/mcp/:serverId/tools", async (req, res) => {
  try {
    const { serverId } = req.params;
    const client = mcpClients.get(serverId);

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    const tools = await client.listTools();
    res.json({ tools });
  } catch (error) {
    console.error("List tools error:", error);
    res.status(500).json({ error: "Failed to list tools" });
  }
});

// Call a tool
app.post("/mcp/:serverId/tools/:toolName", async (req, res) => {
  try {
    const { serverId, toolName } = req.params;
    const { arguments: toolArgs } = req.body;

    const client = mcpClients.get(serverId);

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    const result = await client.callTool(toolName, toolArgs);
    res.json({ result });
  } catch (error) {
    console.error("Tool call error:", error);
    res.status(500).json({ error: "Failed to call tool" });
  }
});

// List available resources
app.get("/mcp/:serverId/resources", async (req, res) => {
  try {
    const { serverId } = req.params;
    const client = mcpClients.get(serverId);

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    const resources = await client.listResources();
    res.json({ resources });
  } catch (error) {
    console.error("List resources error:", error);
    res.status(500).json({ error: "Failed to list resources" });
  }
});

// Read a resource
app.get("/mcp/:serverId/resources/*", async (req, res) => {
  try {
    const { serverId } = req.params;
    const resourceUri = req.params; // Get the wildcard part

    const client = mcpClients.get(serverId);

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    const contents = await client.readResource(resourceUri);
    res.json({ contents });
  } catch (error) {
    console.error("Read resource error:", error);
    res.status(500).json({ error: "Failed to read resource" });
  }
});

// List connected servers
app.get("/mcp/servers", (req, res) => {
  const servers = Array.from(mcpClients.keys()).map((serverId) => ({
    serverId,
    connected: mcpClients.get(serverId)?.isConnected() || false,
  }));

  res.json({ servers });
});

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
);

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Received SIGTERM, shutting down gracefully...");
  // Disconnect all MCP clients
  for (const [serverId, client] of mcpClients) {
    try {
      await client.disconnect();
      console.log(`Disconnected from ${serverId}`);
    } catch (error) {
      console.error(`Error disconnecting from ${serverId}:`, error);
    }
  }
  process.exit(0);
});

// Start server
app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`MCP Server running on port ${PORT}`);
});
