/**
 * Environment variable utilities
 * Handles differences between Vite (import.meta.env) and Node.js (process.env)
 */

/**
 * Get environment variable value
 * Supports both Vite (import.meta.env) and Node.js (process.env) environments
 */
export const getEnv = (key: string, defaultValue: string = ''): string => {
  // For Node.js/test environment
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] || defaultValue;
  }
  
  // For Vite/browser environment - use eval to avoid Jest syntax error
  try {
    // eslint-disable-next-line no-eval
    const importMeta = eval('import.meta');
    if (importMeta && importMeta.env && importMeta.env[key]) {
      return importMeta.env[key] || defaultValue;
    }
  } catch (e) {
    // import.meta not available in this environment
  }
  
  return defaultValue;
};

/**
 * Get API key from environment
 * Supports both Vite (import.meta.env) and Node.js (process.env) environments
 */
export const getApiKey = (): string => {
  return getEnv('VITE_OPENAI_API_KEY');
};
