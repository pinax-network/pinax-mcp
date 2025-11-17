# MCP Client: `@pinax/mcp`

![license](https://img.shields.io/github/license/pinax-network/pinax-mcp)

> An MCP Client for connecting to MCP Server‐compatible services at https://thegraph.market.

## Usage

```console
Usage: @pinax/mcp [options]

A bridge client for connecting Claude Desktop and other MCP-compatible clients to remote MCP servers.

Options:
  -V, --version              output the version number
  --remote-url <string>      Remote MCP server URL (env: REMOTE_URL)
  --sse-url <string>         [DEPRECATED] Use --remote-url instead (env: SSE_URL)
  --access-token <string>    JWT Access Token (env: ACCESS_TOKEN)
  -v, --verbose <boolean>    Enable verbose logging (choices: "true", "false", default: false, env: VERBOSE)
  -h, --help                 display help for command
```

Documentation: https://thegraph.com/docs/en/ai-suite/token-api-mcp/introduction/

## Endpoints

This MCP allows LLMSs to access data provided by [The Graph Token API](https://thegraph.com/docs/en/token-api/quick-start/).

Two MCPs are available: 
- Use `https://token-api.mcp.thegraph.com/mcp` for the REST-based MCP (all tiers)
- Use `https://token-api.mcp.thegraph.com/sse` for the SQL-based MCP (paid tiers)

## Authentication

1. Create a free account at https://thegraph.market using your GitHub credentials
2. Go to **Dashboard**
3. Click **Create New Key**
4. Click **Generate Access Token**

## Configuration

### Environment Variables (`.env`)

```env
ACCESS_TOKEN=<your-jwt-token-from-thegraph.market>
REMOTE_URL=https://token-api.mcp.thegraph.com/mcp
```

### Claude Desktop Configuration

Add to your Claude Desktop config file:

**Location:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%/Claude/claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**Configuration:**
```json
{
  "mcpServers": {
    "pinax": {
      "command": "npx",
      "args": [
        "@pinax/mcp",
        "--remote-url",
        "https://token-api.mcp.thegraph.com/mcp",
        "--access-token",
        "YOUR_ACCESS_TOKEN_HERE"
      ]
    }
  }
}
```

Or using environment variables:

```json
{
  "mcpServers": {
    "pinax": {
      "command": "npx",
      "args": ["@pinax/mcp"],
      "env": {
        "REMOTE_URL": "https://token-api.mcp.thegraph.com/mcp",
        "ACCESS_TOKEN": "YOUR_ACCESS_TOKEN_HERE"
      }
    }
  }
}
```

### Using with Bun (Development)

```json
{
  "mcpServers": {
    "pinax": {
      "command": "/path/to/bun",
      "args": [
        "run",
        "/path/to/pinax-mcp/index.ts",
        "--remote-url",
        "http://localhost:8080/mcp",
        "--access-token",
        "YOUR_ACCESS_TOKEN_HERE",
        "-v",
        "true"
      ]
    }
  }
}
```

## Supported Clients

This bridge works with any MCP client that supports stdio transport:

- [Claude Desktop](https://beta.docs.pinax.network/mcp/claude)
- [Cline](https://beta.docs.pinax.network/mcp/cline)
- [Cursor](https://beta.docs.pinax.network/mcp/cursor)
- Any other MCP-compatible application

## Troubleshooting

### Enable Verbose Logging

Add `-v true` to your command or set `VERBOSE=true` in your environment:

```bash
npx @pinax/mcp --remote-url https://example.com/mcp --access-token YOUR_TOKEN -v true
```

### Common Issues

**Connection Timeout:**
- Verify your `ACCESS_TOKEN` is valid
- Check that the `REMOTE_URL` is correct and accessible

**Authentication Failed:**
- Generate a new access token at https://thegraph.market
- Ensure the token hasn't expired

**Server Disconnected:**
- Check Claude Desktop logs for detailed error messages
- Verify network connectivity to the remote server

## Development

### Install Dependencies

```bash
npm install
# or
bun install
```

### Run Locally

```bash
bun run index.ts --remote-url http://localhost:8080/mcp --access-token YOUR_TOKEN -v true
```

### Build

```bash
npm run build
# or
bun run build
```

## Architecture

```
┌─────────────────┐          ┌──────────────┐          ┌─────────────────┐
│  Claude Desktop │◄──stdio─►│  MCP Bridge  │◄──HTTP──►│  Remote MCP     │
│  (or other      │          │   Client     │    or    │  Server         │
│   MCP client)   │          └──────────────┘◄──SSE───►└─────────────────┘
└─────────────────┘
```

## License

[Apache 2.0](LICENSE)