# pi-grok

**Native Grok Build provider** for the [Pi Coding Agent](https://pi.dev).

This extension gives Pi first-class support for Grok Build by using the exact same authentication as the official Grok TUI.

## Features

- Uses `~/.grok/auth.json` automatically (the token from running `grok`)
- Automatic token refresh using the built-in refresh token
- Model name: `grok-build`
- Full reasoning effort support (`low`, `medium`, `high`, `xhigh`, `max`)
- Multiple credential input methods (file, direct token, raw JSON)

## Installation

```bash
# Load the extension
pi -e ~/Developer/ai-ecoverse/pi-grok

# Or add it permanently in your Pi config
```

## Usage

```bash
# Start a session with Grok Build
pi --model grok-build

# Or switch model inside a session
/model grok-build
```

### Reasoning Effort

```bash
pi --model grok-build --reasoning-effort high
# or
pi --model grok-build --reasoning-effort max
```

Supported values: `low`, `medium`, `high`, `xhigh`, `max`

## Configuration Options

You can pass configuration when loading the extension:

```typescript
{
  // 1. Read from file (default)
  authFilePath: "~/.grok/auth.json",

  // 2. Provide access token directly
  accessToken: "eyJ...",

  // 3. Provide the entire auth.json contents
  authJson: "{ ... full contents of ~/.grok/auth.json ... }",

  // Optional
  clientId: "...",
  baseUrl: "https://api.x.ai/v1"
}
```

## Comparison with Official xAI Provider

| Feature                        | Official xAI (console.x.ai)      | `grok-build` (this extension)          |
|--------------------------------|----------------------------------|----------------------------------------|
| Uses `xai-...` API key         | Yes                              | Optional (fallback)                    |
| Uses Grok Build session token  | No                               | Yes (primary)                          |
| Automatic token refresh        | No                               | Yes                                    |
| Access to Grok Build features  | Limited                          | Full                                   |
| Reasoning effort               | Basic                            | Native (`low` → `max`)                 |
| Works while using Grok TUI     | Conflicts possible               | Seamless (shares auth)                 |
| Requires separate login        | Yes                              | No (reuses existing Grok Build login)  |

## Why This Exists

The official way to use Grok in Pi requires a separate API key from console.x.ai. This extension instead reuses the authentication from **Grok Build** itself — the same one you use when running the `grok` TUI.

This is especially useful if you:
- Spend most of your time in Grok Build
- Want Pi to have access to the same models and capabilities
- Don’t want to manage multiple sets of credentials

## Development

```bash
npm install
npm run build
```

## License

Apache-2.0
