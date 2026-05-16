# pi-grok

**Native Grok provider** for the [Pi Coding Agent](https://pi.dev).

Registers a `grok-build` model that talks to the xAI Responses-style
endpoint and also overrides auth on pi's built-in `xai` provider so the
other Grok models (`grok-4.3`, `grok-code-fast-1`, …) reach `api.x.ai`
with the same credentials.

## Authentication

Two ways to authenticate, picked automatically in this order:

1. **API key in the environment** — set `XAI_API_KEY` (or
   `GROK_BUILD_API_KEY` for an override that *only* affects this
   provider). Works with any `xai-…` API key from `console.x.ai`. This
   is the path to use in containers, CI, slicc, or anywhere
   `~/.grok/auth.json` is not available.

2. **Grok Build CLI credentials** — `~/.grok/auth.json`, populated by
   running the `grok` TUI once. The extension reads the OAuth tokens
   from that file, refreshes them against `https://auth.x.ai/oauth2/token`
   when they are within 5 min of expiry, and writes the refreshed
   tokens back atomically so the Grok TUI stays in sync.

Refresh runs lazily on every pi request (uncached `!command` resolver),
so a long pi session can outlive the 6-hour access-token window without
intervention.

### Environment variables

| Variable               | Purpose                                                      |
|------------------------|--------------------------------------------------------------|
| `XAI_API_KEY`          | Plain xAI API key. Used as-is, no refresh.                   |
| `GROK_BUILD_API_KEY`   | Same as `XAI_API_KEY` but scoped to this provider only.      |
| `XAI_BASE_URL`         | Override `https://api.x.ai/v1` (e.g. for a proxy).           |
| `PI_GROK_AUTH_FILE`    | Alternate path to a `grok` auth.json.                        |
| `PI_GROK_CLIENT_ID`    | Alternate OAuth client id for the refresh request.           |

## Installation

```bash
pi install npm:@ai-ecoverse/pi-grok
```

`pi install` is pi's built-in package manager — it fetches the
extension from npm, registers it in your global `settings.json`, and
loads it on the next pi run. Pass `-l` / `--local` to install it into
the current project's `.pi/settings.json` instead.

Other sources also work — e.g. `pi install git:github.com/ai-ecoverse/pi-grok`
or `pi install ./path/to/local/checkout` for development. To remove
it again: `pi remove npm:@ai-ecoverse/pi-grok`.

If you'd rather not register it globally, you can still side-load on a
single invocation:

```bash
pi -e npm:@ai-ecoverse/pi-grok
```

## Usage

```bash
# Start a session with Grok Build
pi --model grok-build

# Or switch model inside a session
/model grok-build
```

`grok-build` rejects an explicit `reasoning_effort` parameter, so the
model is registered as non-reasoning. The other xAI models reached via
this extension keep pi's built-in reasoning behavior.

## Development

```bash
npm install
npm run build
```

## License

Apache-2.0
