# MCP Client: `@pinax/mcp`

![license](https://img.shields.io/github/license/pinax-network/pinax-mcp)

> An MCP Client for connecting to MCP Server‐compatible services at https://app.pinax.network.

## Usage

```console
Usage: @pinax/mcp [options]

A bridge client for connecting Claude Desktop and other MCP-compatible clients to remote MCP servers.

Options:
  -V, --version              output the version number
  --remote-url <string>      Remote MCP server URL (env: REMOTE_URL)
  --access-token <string>    JWT Access Token (env: ACCESS_TOKEN)
  -v, --verbose <boolean>    Enable verbose logging (choices: "true", "false", default: false, env: VERBOSE)
  -h, --help                 display help for command
```

Documentation: https://app.pinax.network/docs/guides/mcp

## Endpoints

This MCP allows LLMs to access data provided by the [Pinax Token API](https://app.pinax.network/docs).

- Use `https://mcp.pinax.network` for the MCP server (Streamable HTTP)

## Authentication

1. Sign in at https://app.pinax.network
2. Go to [**Keys**](https://app.pinax.network/keys)
3. Copy your project key and generate a JWT Access Token

## Configuration

### Environment Variables (`.env`)

```env
ACCESS_TOKEN=<your-jwt-token-from-app.pinax.network>
REMOTE_URL=https://mcp.pinax.network
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
        "https://mcp.pinax.network",
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
        "REMOTE_URL": "https://mcp.pinax.network",
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
- Generate a new access token at https://app.pinax.network/keys
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
│  (or other      │          │   Client     │          │  Server         │
│   MCP client)   │          └──────────────┘          └─────────────────┘
└─────────────────┘
```

## License

[Apache 2.0](LICENSE)