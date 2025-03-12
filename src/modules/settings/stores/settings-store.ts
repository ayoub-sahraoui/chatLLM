import { makeAutoObservable } from "mobx";
import {
  ProviderSettings,
  ProviderConfig,
  ProviderType,
} from "../../chat/types";

class SettingsStore {
  providers: ProviderSettings = {
    ollama: {
      type: "ollama",
      baseUrl: "http://localhost:11434",
      enabled: true,
    },
    openai: {
      type: "openai",
      apiKey: "",
      baseUrl: "https://api.openai.com/v1",
      enabled: false,
      models: ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo", "gpt-4-vision"],
    },
    anthropic: {
      type: "anthropic",
      apiKey: "",
      baseUrl: "https://api.anthropic.com",
      enabled: false,
      models: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
    },
    deepseek: {
      type: "deepseek",
      apiKey: "",
      baseUrl: "https://api.deepseek.com/v1",
      enabled: false,
      models: ["DeepSeek-V3", "DeepSeek-R1"],
    },
    gemini: {
      type: "gemini",
      apiKey: "",
      enabled: false,
      models: ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-2.0-pro"],
    },
  };

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
    this.loadSettings();
  }

  updateProviderConfig(
    providerType: ProviderType,
    config: Partial<ProviderConfig>
  ) {
    this.providers[providerType] = {
      ...this.providers[providerType],
      ...config,
    };
    this.saveSettings();
  }

  toggleProvider(providerType: ProviderType, enabled: boolean) {
    this.providers[providerType].enabled = enabled;
    this.saveSettings();
  }

  setApiKey(providerType: ProviderType, apiKey: string) {
    if (this.providers[providerType]) {
      this.providers[providerType].apiKey = apiKey;
      this.saveSettings();
    }
  }

  setBaseUrl(providerType: ProviderType, baseUrl: string) {
    if (this.providers[providerType]) {
      this.providers[providerType].baseUrl = baseUrl;
      this.saveSettings();
    }
  }

  getEnabledProviders(): ProviderType[] {
    return Object.entries(this.providers)
      .filter(([_, config]) => config.enabled)
      .map(([key]) => key as ProviderType);
  }

  isProviderEnabled(providerType: ProviderType): boolean {
    return this.providers[providerType]?.enabled || false;
  }

  getProviderConfig(providerType: ProviderType): ProviderConfig | undefined {
    return this.providers[providerType];
  }

  private saveSettings() {
    try {
      localStorage.setItem(
        "chatllm_provider_settings",
        JSON.stringify(this.providers)
      );
    } catch (e) {
      console.error("Failed to save settings:", e);
    }
  }

  private loadSettings() {
    try {
      const savedSettings = localStorage.getItem("chatllm_provider_settings");
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);

        // Make sure to preserve default models if they're not in the saved settings
        if (parsedSettings.openai && !parsedSettings.openai.models) {
          parsedSettings.openai.models = this.providers.openai.models;
        }

        if (parsedSettings.anthropic && !parsedSettings.anthropic.models) {
          parsedSettings.anthropic.models = this.providers.anthropic.models;
        }

        // Handle DeepSeek models
        if (parsedSettings.deepseek && !parsedSettings.deepseek.models) {
          parsedSettings.deepseek.models = this.providers.deepseek.models;
        }

        // Initialize DeepSeek if it doesn't exist in saved settings
        if (!parsedSettings.deepseek) {
          parsedSettings.deepseek = this.providers.deepseek;
        }

        // Initialize Gemini if it doesn't exist in saved settings
        if (!parsedSettings.gemini) {
          parsedSettings.gemini = this.providers.gemini;
        }

        this.providers = {
          ...this.providers,
          ...parsedSettings,
        };
      }
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
  }
}

export const settingsStore = new SettingsStore();
