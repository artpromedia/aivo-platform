declare module 'tailwindcss/plugin' {
  const plugin: (...args: any[]) => any;
  export default plugin;
}

declare module 'tailwindcss/types/config' {
  export interface PluginAPI {
    addBase: (base: Record<string, Record<string, string>>) => void;
  }
}
