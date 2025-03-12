import React, { useState } from "react";
import { observer } from "mobx-react-lite";
import { settingsStore } from "../stores/settings-store";
import { modelStore } from "../../chat/stores/model-store";
import { ProviderType } from "../../chat/types";

// Import shadcn components
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const GeneralSettings: React.FC = observer(() => {
  const [saveStatus, setSaveStatus] = useState<{
    type: "success" | "error" | "loading" | null;
    message: string;
  }>({ type: null, message: "" });

  const handleToggleProvider = (provider: ProviderType, enabled: boolean) => {
    settingsStore.toggleProvider(provider, enabled);
    modelStore.refreshProviders();
    setSaveStatus({
      type: "success",
      message: `${provider} provider ${enabled ? "enabled" : "disabled"}`,
    });
    setTimeout(() => setSaveStatus({ type: null, message: "" }), 3000);
  };

  const handleSaveBaseUrl = (provider: ProviderType, baseUrl: string) => {
    settingsStore.setBaseUrl(provider, baseUrl);
    setSaveStatus({
      type: "success",
      message: `${provider} base URL updated`,
    });
    setTimeout(() => setSaveStatus({ type: null, message: "" }), 3000);
  };

  const handleSaveApiKey = (provider: ProviderType, apiKey: string) => {
    settingsStore.setApiKey(provider, apiKey);
    modelStore.refreshProviders();
    setSaveStatus({
      type: "success",
      message: `${provider} API key updated`,
    });
    setTimeout(() => setSaveStatus({ type: null, message: "" }), 3000);
  };

  const testConnection = async (provider: ProviderType) => {
    try {
      setSaveStatus({
        type: "loading",
        message: `Testing ${provider} connection...`,
      });

      // Make sure models are refreshed with latest settings
      await modelStore.refreshProviders();

      // Test the specific provider connection
      const success = await modelStore.testProvider(provider);

      if (success) {
        // Get models for this provider
        const providerModels = modelStore.models.filter(
          (model) => model.provider === provider
        );

        if (providerModels.length > 0) {
          setSaveStatus({
            type: "success",
            message: `Successfully connected to ${provider}! Found ${providerModels.length} models.`,
          });
        } else {
          setSaveStatus({
            type: "error",
            message:
              provider === "openai"
                ? `Connected to ${provider} but couldn't find models. Verify that models are configured in settings.`
                : `Connected to ${provider} but couldn't find any models. Please check your configuration.`,
          });
        }
      } else {
        setSaveStatus({
          type: "error",
          message: `Could not connect to ${provider}. Please check your credentials and network connection.`,
        });
      }
    } catch (error) {
      setSaveStatus({
        type: "error",
        message: `Failed to connect to ${provider}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    }

    setTimeout(() => setSaveStatus({ type: null, message: "" }), 5000);
  };

  return (
    <div className="container mx-auto py-6">
      {saveStatus.type && (
        <Alert
          className={`mb-6 ${
            saveStatus.type === "success"
              ? "bg-green-50 dark:bg-green-900/20"
              : saveStatus.type === "loading"
              ? "bg-blue-50 dark:bg-blue-900/20"
              : "bg-red-50 dark:bg-red-900/20"
          }`}
        >
          {saveStatus.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          ) : saveStatus.type === "loading" ? (
            <div className="h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          )}
          <AlertTitle>
            {saveStatus.type === "success"
              ? "Success"
              : saveStatus.type === "loading"
              ? "Loading"
              : "Error"}
          </AlertTitle>
          <AlertDescription>{saveStatus.message}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="ollama" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="ollama">Ollama</TabsTrigger>
          <TabsTrigger value="openai">OpenAI</TabsTrigger>
          <TabsTrigger value="anthropic">Anthropic</TabsTrigger>
          <TabsTrigger value="deepseek">DeepSeek</TabsTrigger>
          <TabsTrigger value="gemini">Gemini</TabsTrigger>
          <TabsTrigger value="app">App Settings</TabsTrigger>
        </TabsList>

        {/* Ollama Settings */}
        <TabsContent value="ollama">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Ollama Settings
                {settingsStore.isProviderEnabled("ollama") && (
                  <Badge
                    variant="outline"
                    className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  >
                    Active
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Configure your local Ollama instance to use with this app
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="enable-ollama"
                  className="flex flex-col items-start"
                >
                  <span>Enable Ollama</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Use models from your local Ollama instance
                  </span>
                </Label>
                <Switch
                  id="enable-ollama"
                  checked={settingsStore.isProviderEnabled("ollama")}
                  onCheckedChange={(checked) =>
                    handleToggleProvider("ollama", checked)
                  }
                />
              </div>

              <div>
                <Label htmlFor="ollama-url">Base URL</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <Input
                    id="ollama-url"
                    placeholder="http://localhost:11434"
                    value={
                      settingsStore.getProviderConfig("ollama")?.baseUrl || ""
                    }
                    onChange={(e) =>
                      settingsStore.setBaseUrl("ollama", e.target.value)
                    }
                    disabled={!settingsStore.isProviderEnabled("ollama")}
                  />
                  <Button
                    variant="outline"
                    onClick={() =>
                      handleSaveBaseUrl(
                        "ollama",
                        settingsStore.getProviderConfig("ollama")?.baseUrl || ""
                      )
                    }
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => testConnection("ollama")}
                disabled={!settingsStore.isProviderEnabled("ollama")}
              >
                Test Connection
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* OpenAI Settings */}
        <TabsContent value="openai">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                OpenAI Settings
                {settingsStore.isProviderEnabled("openai") && (
                  <Badge
                    variant="outline"
                    className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  >
                    Active
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Connect to OpenAI's API to use their models like GPT-4
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="enable-openai"
                  className="flex flex-col items-start"
                >
                  <span>Enable OpenAI</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Use models from OpenAI's API
                  </span>
                </Label>
                <Switch
                  id="enable-openai"
                  checked={settingsStore.isProviderEnabled("openai")}
                  onCheckedChange={(checked) =>
                    handleToggleProvider("openai", checked)
                  }
                />
              </div>

              <div>
                <Label htmlFor="openai-api-key">API Key</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <Input
                    id="openai-api-key"
                    type="password"
                    placeholder="sk-..."
                    value={
                      settingsStore.getProviderConfig("openai")?.apiKey || ""
                    }
                    onChange={(e) =>
                      settingsStore.setApiKey("openai", e.target.value)
                    }
                    disabled={!settingsStore.isProviderEnabled("openai")}
                  />
                  <Button
                    variant="outline"
                    onClick={() =>
                      handleSaveApiKey(
                        "openai",
                        settingsStore.getProviderConfig("openai")?.apiKey || ""
                      )
                    }
                    disabled={!settingsStore.isProviderEnabled("openai")}
                  >
                    Save Key
                  </Button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Your API key is stored locally and never sent to our servers
                </p>
              </div>

              <div>
                <Label htmlFor="openai-url">Base URL (Optional)</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <Input
                    id="openai-url"
                    placeholder="https://api.openai.com/v1"
                    value={
                      settingsStore.getProviderConfig("openai")?.baseUrl || ""
                    }
                    onChange={(e) =>
                      settingsStore.setBaseUrl("openai", e.target.value)
                    }
                    disabled={!settingsStore.isProviderEnabled("openai")}
                  />
                  <Button
                    variant="outline"
                    onClick={() =>
                      handleSaveBaseUrl(
                        "openai",
                        settingsStore.getProviderConfig("openai")?.baseUrl || ""
                      )
                    }
                    disabled={!settingsStore.isProviderEnabled("openai")}
                  >
                    Apply
                  </Button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  For API proxies or OpenAI-compatible endpoints
                </p>
              </div>

              <div>
                <Label>Available Models</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(
                    settingsStore.getProviderConfig("openai")?.models || []
                  ).map((model) => (
                    <Badge key={model} variant="outline">
                      {model}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  These models will be available when OpenAI is enabled
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => testConnection("openai")}
                disabled={
                  !settingsStore.isProviderEnabled("openai") ||
                  !settingsStore.getProviderConfig("openai")?.apiKey
                }
              >
                Test Connection
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Anthropic Settings */}
        <TabsContent value="anthropic">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Anthropic Settings
                {settingsStore.isProviderEnabled("anthropic") && (
                  <Badge
                    variant="outline"
                    className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  >
                    Active
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Connect to Anthropic's API to use Claude models
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="enable-anthropic"
                  className="flex flex-col items-start"
                >
                  <span>Enable Anthropic</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Use Claude models from Anthropic's API
                  </span>
                </Label>
                <Switch
                  id="enable-anthropic"
                  checked={settingsStore.isProviderEnabled("anthropic")}
                  onCheckedChange={(checked) =>
                    handleToggleProvider("anthropic", checked)
                  }
                />
              </div>

              <div>
                <Label htmlFor="anthropic-api-key">API Key</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <Input
                    id="anthropic-api-key"
                    type="password"
                    placeholder="sk-ant-..."
                    value={
                      settingsStore.getProviderConfig("anthropic")?.apiKey || ""
                    }
                    onChange={(e) =>
                      settingsStore.setApiKey("anthropic", e.target.value)
                    }
                    disabled={!settingsStore.isProviderEnabled("anthropic")}
                  />
                  <Button
                    variant="outline"
                    onClick={() =>
                      handleSaveApiKey(
                        "anthropic",
                        settingsStore.getProviderConfig("anthropic")?.apiKey ||
                          ""
                      )
                    }
                    disabled={!settingsStore.isProviderEnabled("anthropic")}
                  >
                    Save Key
                  </Button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Your API key is stored locally and never sent to our servers
                </p>
              </div>

              <div>
                <Label htmlFor="anthropic-url">Base URL (Optional)</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <Input
                    id="anthropic-url"
                    placeholder="https://api.anthropic.com"
                    value={
                      settingsStore.getProviderConfig("anthropic")?.baseUrl ||
                      ""
                    }
                    onChange={(e) =>
                      settingsStore.setBaseUrl("anthropic", e.target.value)
                    }
                    disabled={!settingsStore.isProviderEnabled("anthropic")}
                  />
                  <Button
                    variant="outline"
                    onClick={() =>
                      handleSaveBaseUrl(
                        "anthropic",
                        settingsStore.getProviderConfig("anthropic")?.baseUrl ||
                          ""
                      )
                    }
                    disabled={!settingsStore.isProviderEnabled("anthropic")}
                  >
                    Apply
                  </Button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  For API proxies or Anthropic-compatible endpoints
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => testConnection("anthropic")}
                disabled={
                  !settingsStore.isProviderEnabled("anthropic") ||
                  !settingsStore.getProviderConfig("anthropic")?.apiKey
                }
              >
                Test Connection
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* DeepSeek Settings */}
        <TabsContent value="deepseek">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                DeepSeek Settings
                {settingsStore.isProviderEnabled("deepseek") && (
                  <Badge
                    variant="outline"
                    className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  >
                    Active
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Connect to DeepSeek's API to use their advanced AI models
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="enable-deepseek"
                  className="flex flex-col items-start"
                >
                  <span>Enable DeepSeek</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Use models from DeepSeek's API
                  </span>
                </Label>
                <Switch
                  id="enable-deepseek"
                  checked={settingsStore.isProviderEnabled("deepseek")}
                  onCheckedChange={(checked) =>
                    handleToggleProvider("deepseek", checked)
                  }
                />
              </div>

              <div>
                <Label htmlFor="deepseek-api-key">API Key</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <Input
                    id="deepseek-api-key"
                    type="password"
                    placeholder="sk_..."
                    value={
                      settingsStore.getProviderConfig("deepseek")?.apiKey || ""
                    }
                    onChange={(e) =>
                      settingsStore.setApiKey("deepseek", e.target.value)
                    }
                    disabled={!settingsStore.isProviderEnabled("deepseek")}
                  />
                  <Button
                    variant="outline"
                    onClick={() =>
                      handleSaveApiKey(
                        "deepseek",
                        settingsStore.getProviderConfig("deepseek")?.apiKey ||
                          ""
                      )
                    }
                    disabled={!settingsStore.isProviderEnabled("deepseek")}
                  >
                    Save Key
                  </Button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Your API key is stored locally and never sent to our servers
                </p>
              </div>

              <div>
                <Label htmlFor="deepseek-url">Base URL</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <Input
                    id="deepseek-url"
                    placeholder="https://api.deepseek.com/v1"
                    value={
                      settingsStore.getProviderConfig("deepseek")?.baseUrl || ""
                    }
                    onChange={(e) =>
                      settingsStore.setBaseUrl("deepseek", e.target.value)
                    }
                    disabled={!settingsStore.isProviderEnabled("deepseek")}
                  />
                  <Button
                    variant="outline"
                    onClick={() =>
                      handleSaveBaseUrl(
                        "deepseek",
                        settingsStore.getProviderConfig("deepseek")?.baseUrl ||
                          ""
                      )
                    }
                    disabled={!settingsStore.isProviderEnabled("deepseek")}
                  >
                    Apply
                  </Button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Default is https://api.deepseek.com/v1
                </p>
              </div>

              <div>
                <Label>Available Models</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(
                    settingsStore.getProviderConfig("deepseek")?.models || []
                  ).map((model) => (
                    <Badge key={model} variant="outline">
                      {model}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  These models will be available when DeepSeek is enabled
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => testConnection("deepseek")}
                disabled={
                  !settingsStore.isProviderEnabled("deepseek") ||
                  !settingsStore.getProviderConfig("deepseek")?.apiKey
                }
              >
                Test Connection
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Gemini Settings */}
        <TabsContent value="gemini">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Google Gemini Settings
                {settingsStore.isProviderEnabled("gemini") && (
                  <Badge
                    variant="outline"
                    className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  >
                    Active
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Connect to Google's Gemini API to use their advanced AI models
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="enable-gemini"
                  className="flex flex-col items-start"
                >
                  <span>Enable Gemini</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Use models from Google's Gemini API
                  </span>
                </Label>
                <Switch
                  id="enable-gemini"
                  checked={settingsStore.isProviderEnabled("gemini")}
                  onCheckedChange={(checked) =>
                    handleToggleProvider("gemini", checked)
                  }
                />
              </div>

              <div>
                <Label htmlFor="gemini-api-key">API Key</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <Input
                    id="gemini-api-key"
                    type="password"
                    placeholder="YOUR_API_KEY"
                    value={
                      settingsStore.getProviderConfig("gemini")?.apiKey || ""
                    }
                    onChange={(e) =>
                      settingsStore.setApiKey("gemini", e.target.value)
                    }
                    disabled={!settingsStore.isProviderEnabled("gemini")}
                  />
                  <Button
                    variant="outline"
                    onClick={() =>
                      handleSaveApiKey(
                        "gemini",
                        settingsStore.getProviderConfig("gemini")?.apiKey || ""
                      )
                    }
                    disabled={!settingsStore.isProviderEnabled("gemini")}
                  >
                    Save Key
                  </Button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Your API key is stored locally and never sent to our servers
                </p>
              </div>

              <div>
                <Label>Available Models</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(
                    settingsStore.getProviderConfig("gemini")?.models || []
                  ).map((model) => (
                    <Badge key={model} variant="outline">
                      {model}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  These models will be available when Gemini is enabled
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => testConnection("gemini")}
                disabled={
                  !settingsStore.isProviderEnabled("gemini") ||
                  !settingsStore.getProviderConfig("gemini")?.apiKey
                }
              >
                Test Connection
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* App Settings */}
        <TabsContent value="app">
          <Card>
            <CardHeader>
              <CardTitle>App Settings</CardTitle>
              <CardDescription>
                Configure general application settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                More application settings coming soon.
              </p>

              {/* Model provider info */}
              <div>
                <h3 className="text-lg font-medium mb-2">
                  Available Providers
                </h3>
                <div className="space-y-2">
                  {["ollama", "openai", "anthropic", "deepseek", "gemini"].map(
                    (provider) => (
                      <div
                        key={provider}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              settingsStore.isProviderEnabled(
                                provider as ProviderType
                              )
                                ? "bg-green-500"
                                : "bg-gray-300 dark:bg-gray-600"
                            }`}
                          />
                          <span className="text-sm capitalize">{provider}</span>
                        </div>
                        <Badge
                          variant={
                            settingsStore.isProviderEnabled(
                              provider as ProviderType
                            )
                              ? "default"
                              : "outline"
                          }
                        >
                          {settingsStore.isProviderEnabled(
                            provider as ProviderType
                          )
                            ? "Enabled"
                            : "Disabled"}
                        </Badge>
                      </div>
                    )
                  )}
                </div>
              </div>

              <Separator />

              {/* Total models count */}
              <div>
                <h3 className="text-lg font-medium mb-2">Models</h3>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total available models</span>
                  <Badge variant="outline">{modelStore.models.length}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
});

export default GeneralSettings;
