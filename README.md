# pinax-mcp

> An MCP client for connecting to Pinax Token API MCP.

## Configuration

You will need [`npx`](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) or [`bunx`](https://bun.sh/) installed and available in your path.

Get you API key at https://pinax.network/

### Claude Desktop

You will need to edit your `claude_desktop_config.json` file. If it doesn't exist, you can create one.

**Config location**
- OSX: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `.config/Claude/claude_desktop_config.json`

#### npm

```json
{
  "mcpServers": {
    "pinax": {
      "command": "npx",
      "args": [
        "",
        "<your-pinax-api-key>",
        "https://token-api.service.pinax.network/sse"
      ]
    }
  }
}
```

#### bun

```json
{
  "mcpServers": {
    "pinax": {
      "command": "bunx",
      "args": [
        "",
        "<your-pinax-api-key>",
        "https://token-api.service.pinax.network/sse"
      ]
    }
  }
}
```

#### Troubleshooting

**ENOENT**

[image]

Try to use the full path of the command instead:
- Run `which npx` or `which bunx` to get the path of the command
- Replace `npx` or `bunx` with the full path

Example: `/home/user/bin/bunx`

**Disconnected**

Double-check your API key otherwise look in your navigator if `https://token-api.service.pinax.network/sse` is reachable.

> [!NOTE]
> You can always have a look at the full logs under `Claude/logs/mcp.log` and `Claude/logs/mcp-server-pinax.log` for more details.