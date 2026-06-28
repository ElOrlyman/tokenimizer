// Plugin interface — first-party and community plugins implement this.
export interface TokenimizerPlugin {
  id:          string;
  name:        string;
  version:     string;
  description: string;

  /** Called once when the plugin is installed */
  install(ctx: PluginContext): Promise<void>;

  /** Called when the plugin is removed */
  uninstall(ctx: PluginContext): Promise<void>;

  /** Optional: validate plugin is healthy */
  doctor?(ctx: PluginContext): Promise<PluginHealthResult>;
}

export interface PluginContext {
  cwd:       string;
  dryRun:    boolean;
  tokenimizerDir: string;
}

export interface PluginHealthResult {
  healthy:     boolean;
  issues:      string[];
  suggestions: string[];
}
