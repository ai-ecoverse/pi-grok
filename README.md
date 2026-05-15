# pi-grok

Native **Grok Build** provider and extension for the [Pi Coding Agent](https://pi.dev).

## Features

- Uses the same authentication as the official Grok Build TUI (`~/.grok/auth.json`)
- Automatic token refresh using the built-in refresh token
- Model name: `grok-build`
- Full support for Grok's reasoning effort levels (`low`, `medium`, `high`, `xhigh`, `max`)
- Multiple ways to provide credentials (file, direct token, raw JSON)

## Installation

```bash
# Development / local usage
pi -e ~/Developer/ai-ecoverse/pi-grok
```

## Usage

### Basic (recommended)

Once loaded, you can use:

```bash
pi --model grok-build
# or
/model grok-build
```

### Configuration Options

You can pass configuration when loading the extension:

```typescript
// In your Pi extension or config
{
  "authFilePath": "~/.grok/auth.json",           // default
  "accessToken": "eyJ...",                       // direct token
  "authJson": "{ ... full auth.json ... }",      // full file contents
}
```

## Comparison with Official xAI Provider

| Feature                        | Official xAI (`console.x.ai`) | `grok-build` (this extension) |
|--------------------------------|-------------------------------|-------------------------------|
| Uses `xai-...` API key         | Yes                           | Optional                      |
| Uses Grok Build session token  | No                            | Yes (primary)                 |
| Automatic token refresh        | Manual                        | Yes                           |
| Access to Grok Build features  | Limited                       | Full                          |
| Reasoning effort mapping       | Basic                         | Native (`low` → `max`)        |
| Works while using Grok TUI     | No                            | Yes                           |

This provider is ideal if you primarily use **Grok Build** as your daily driver and want Pi to use the exact same authentication and capabilities.

## Reasoning Effort Levels

Supported values (passed via `--reasoning-effort` or in config):

- `low`
- `medium`
- `high`
- `xhigh`
- `max`

These map to Pi's thinking levels internally.

## Development

```bash
npm install
npm run build
```

## License

Apache-2.0
