# MCP Client: `@pinax/mcp`

![license](https://img.shields.io/github/license/pinax-network/pinax-mcp)

> An MCP Client for connecting to MCP Server‐compatible services at https://thegraph.market.

```console
Usage: @pinax/mcp [options]

Options:
  -V, --version            output the version number
  --sse-url <string>       SSE URL (default: "https://token-api.service.pinax.network/sse", env: SSE_URL)
  --access-token <string>    https://thegraph.market JWT Access Token (env: ACCESS_TOKEN)
  -v, --verbose <boolean>  Enable verbose logging (choices: "true", "false", default: false, env: VERBOSE)
  -h, --help               display help for command
```

## Authentication

1. Create a free account at https://thegraph.market using your GitHub credentials as login.
2. Go to **Dashboard**
3. **Create New Key**
4. **Generate Access Token**

## `.env`

```env
ACCESS_TOKEN=<https://thegraph.market JWT Access Token>
SSE_URL=https://token-api.service.pinax.network/sse
```

<img width="896" alt="Image" src="https://github.com/user-attachments/assets/43c0e662-5e30-4b7d-87a0-884d6105b6a3" />

## Supported by AI Agents

- [Claude Desktop](https://beta.docs.pinax.network/mcp/claude)
- [Cline](https://beta.docs.pinax.network/mcp/cline)
- [Cursor](https://beta.docs.pinax.network/mcp/cursor)
