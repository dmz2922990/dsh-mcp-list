# dsh-mcp-list

A [DeepSeek Harness](https://www.npmjs.com/package/@deepseek-ai/dsh) web plugin
that adds an **MCP** page to the Settings panel:

- Lists every mounted MCP server and its tools, grouped by server name.
- Truncated tool descriptions expand to the full text on click.
- A call-count column plus a per-server total-calls badge, computed by scanning
  the most recent sessions for `mcp__<server>__<tool>` occurrences
  (index-free, works with `session-query openAt: "never"`).
- `Open config` opens the deployment's `cordis.patch.yml` MCP patch file in
  the system editor (`open` / `xdg-open`).

## Layout

- `lib/index.js` — Host half. Injects `webServer` and serves same-origin JSON
  routes under `/mcp-list` (`/servers`, `/counts`, `/open-config`).
- `lib/client.js` — Web Client half (`dsh.client`, platform `web`). Registers
  the settings page through the `settings.section` slot and fetches the routes
  above.

## Install

Add the package to a DSH web profile's `node_modules` (e.g. via
`npm install <git+https://github.com/dmz2922990/dsh-mcp-list.git>` or a
symlink), then append a loader entry to the profile's `cordis.patch.yml`:

```yaml
- insert:
    - id: mcp-list
      name: dsh-mcp-list
```

## License

MIT
