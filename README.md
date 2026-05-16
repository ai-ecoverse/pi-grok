> ⚠️ **DEPRECATED — DO NOT USE**
>
> This package (`@ai-ecoverse/pi-grok`) is **deprecated** and will receive **no further updates or security patches**.
>
> ## Recommended Replacement
>
> Migrate to the official, actively maintained version:
>
> - **Repository**: [stnly/pi-grok](https://github.com/stnly/pi-grok)
> - **Install command**:
>   ```bash
>   pi remove npm:@ai-ecoverse/pi-grok
>   pi install git:github.com/stnly/pi-grok
>   ```
>   Then run `/reload` inside pi.
>
> ### Why switch?
>
> The stnly/pi-grok extension is the **original and recommended** implementation. It offers:
>
> - Native OAuth 2.0 + PKCE login flow directly inside pi (`/login`)
> - Live model discovery — new Grok models appear automatically
> - Proper payload sanitization for xAI's Responses API (images, reasoning replay, effort levels)
> - Typed error handling and robust token refresh
> - Support for the full Grok model lineup (`grok-build`, `grok-4.3`, `grok-4.20-*` reasoning and non-reasoning variants, etc.)
> - Actively maintained by the original author
>
> After installing the new extension, use models like:
>
> ```bash
> pi --model xai-oauth/grok-4.3
> # or
> /model xai-oauth/grok-build
> ```
>
> ---
>
> # pi-grok (archived)

**Native Grok provider** for the [Pi Coding Agent](https://pi.dev) — **archived**.

This was a bridge that let users of the Grok Build CLI (`grok` TUI) consume `~/.grok/auth.json` credentials (with refresh) or `XAI_API_KEY` inside pi. It registered a `grok-build` model and overrode auth on the built-in `xai` provider.

**This package is no longer maintained.** The information below is kept for historical reference only.

## Migration (Required)

**This package is deprecated.** To migrate:

1. Remove the old extension:
   ```bash
   pi remove npm:@ai-ecoverse/pi-grok
   ```

2. Install the official replacement:
   ```bash
   pi install git:github.com/stnly/pi-grok
   ```

3. Reload pi:
   ```bash
   /reload
   ```

4. Use the new provider and models, e.g.:
   ```bash
   pi --model xai-oauth/grok-4.3
   # or inside a session:
   /model xai-oauth/grok-build
   ```

See the [stnly/pi-grok README](https://github.com/stnly/pi-grok) for full documentation.

---

## Historical Documentation (Archived)

The sections below describe how the now-deprecated `@ai-ecoverse/pi-grok` bridge worked. They are kept only for reference.

### Authentication (legacy)

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

### Environment variables (legacy)

| Variable               | Purpose                                                      |
|------------------------|--------------------------------------------------------------|
| `XAI_API_KEY`          | Plain xAI API key. Used as-is, no refresh.                   |
| `GROK_BUILD_API_KEY`   | Same as `XAI_API_KEY` but scoped to this provider only.      |
| `XAI_BASE_URL`         | Override `https://api.x.ai/v1` (e.g. for a proxy).           |
| `PI_GROK_AUTH_FILE`    | Alternate path to a `grok` auth.json.                        |
| `PI_GROK_CLIENT_ID`    | Alternate OAuth client id for the refresh request.           |

### Usage (legacy)

```bash
# Start a session with Grok Build (via the deprecated bridge)
pi --model grok-build

# Or switch model inside a session
/model grok-build
```

`grok-build` rejects an explicit `reasoning_effort` parameter, so the
model is registered as non-reasoning. The other xAI models reached via
this extension keep pi's built-in reasoning behavior.

### Development (legacy)

```bash
npm install
npm run build
```

## License

Apache-2.0 (archived package)
