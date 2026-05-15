/**
 * Configuration options for the Grok Build provider.
 */
export interface GrokBuildProviderConfig {
  /**
   * Path to the Grok auth file.
   * Default: ~/.grok/auth.json
   */
  authFilePath?: string;

  /**
   * Direct access token (JWT). Takes precedence over file if provided.
   */
  accessToken?: string;

  /**
   * Refresh token. Required if providing accessToken manually and you want auto-refresh.
   */
  refreshToken?: string;

  /**
   * Full raw contents of auth.json (as string or object).
   * Useful when you want to pass the entire file contents via config.
   */
  authJson?: string | Record<string, any>;

  /**
   * Client ID for the Grok Build OAuth app.
   * Usually not needed unless using a non-standard client.
   */
  clientId?: string;

  /**
   * Base URL for xAI API.
   * Default: https://api.x.ai/v1
   */
  baseUrl?: string;
}
