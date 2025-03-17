# pinax-mcp

> An MCP client for connecting to Pinax Token API MCP.

```console
Usage: pinax-mcp [options]

An MCP client for connecting to Pinax Token API MCP.

Options:
  -V, --version            output the version number
  --sse-url <string>       SSE URL (default: "https://token-api.service.pinax.network/sse", env: SSE_URL)
  --api-key <string>       Pinax API Key (env: PINAX_API_KEY)
  -v, --verbose <boolean>  Enable verbose logging (choices: "true", "false", default: false, env: VERBOSE)
  -h, --help               display help for command
```

## Configuration

You will need [`npx`](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) or [`bunx`](https://bun.sh/) installed and available in your path.

Get you API key at https://pinax.network/

### Claude Desktop

You will need to edit your `claude_desktop_config.json` file. If it doesn't exist, you can create one.

**Config location**
- OSX: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mcp-pinax": {
      "command": "npx",
      "args": [
        "@pinax/mcp",
        "--api-key",
        "<your-pinax-api-key>",
        "--sse-url",
        "https://token-api.service.pinax.network/sse"
      ]
    }
  }
}
```

---
#### Troubleshooting

To enable logs for the MCP, use the `--verbose true` option.

> ENOENT

![screenshot_2025-03-14_12-12-30](https://github.com/user-attachments/assets/b8d6c4e8-9af5-4168-9f45-00939386a469)

Try to use the full path of the command instead:
- Run `which npx` or `which bunx` to get the path of the command
- Replace `npx` or `bunx` in the configuration file with the full path

Example: `/home/user/bin/bunx`

> Server disconnected

![screenshot_2025-03-14_12-15-19](https://github.com/user-attachments/assets/24981bc1-5976-4bda-8a54-3f6ab53a4a5e)

Double-check your API key otherwise look in your navigator if `https://token-api.service.pinax.network/sse` is reachable.

> [!NOTE]
> You can always have a look at the full logs under `Claude/logs/mcp.log` and `Claude/logs/mcp-server-pinax.log` for more details.
