interface ScriptPlaceholders {
  setup: string;
  dev: string;
  cleanup: string;
  deployment: string;
}

interface ScriptPlaceholderStrategy {
  getPlaceholders(): ScriptPlaceholders;
}

class WindowsScriptPlaceholderStrategy implements ScriptPlaceholderStrategy {
  getPlaceholders(): ScriptPlaceholders {
    return {
      setup: `@echo off
npm install
REM Add any setup commands here...`,
      dev: `@echo off
npm run dev
REM Add dev server start command here...`,
      cleanup: `@echo off
REM Add cleanup commands here...
REM This runs after coding agent execution - only if changes were made`,
      deployment: `@echo off
REM Add deployment commands here...
REM Example: npm run build && npm run deploy`,
    };
  }
}

class UnixScriptPlaceholderStrategy implements ScriptPlaceholderStrategy {
  getPlaceholders(): ScriptPlaceholders {
    return {
      setup: `#!/bin/bash
npm install
# Add any setup commands here...`,
      dev: `#!/bin/bash
npm run dev
# Add dev server start command here...`,
      cleanup: `#!/bin/bash
# Add cleanup commands here...
# This runs after coding agent execution - only if changes were made`,
      deployment: `#!/bin/bash
# Add deployment commands here...
# Example: npm run build && npm run deploy`,
    };
  }
}

class ScriptPlaceholderContext {
  private strategy: ScriptPlaceholderStrategy;

  constructor(strategy: ScriptPlaceholderStrategy) {
    this.strategy = strategy;
  }

  setStrategy(strategy: ScriptPlaceholderStrategy): void {
    this.strategy = strategy;
  }

  getPlaceholders(): ScriptPlaceholders {
    return this.strategy.getPlaceholders();
  }
}

export function createScriptPlaceholderStrategy(
  osType: string
): ScriptPlaceholderStrategy {
  if (osType.toLowerCase().includes('windows')) {
    return new WindowsScriptPlaceholderStrategy();
  }
  return new UnixScriptPlaceholderStrategy();
}

export { ScriptPlaceholderContext, type ScriptPlaceholders };
