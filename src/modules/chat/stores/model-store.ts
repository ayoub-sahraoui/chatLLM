/* eslint-disable @typescript-eslint/no-explicit-any */
import { makeAutoObservable, runInAction } from "mobx";
import {
  ChatMessage,
  ChatOptions,
  Model,
  ModelError,
  ProviderType,
} from "../types";
import { ModelResponse, Ollama } from "ollama";
import { v4 as uuidv4 } from "uuid";
import { commandSystem } from "../commands/command-system";
import { settingsStore } from "../../settings/stores/settings-store";
import axios from "axios";
import OpenAI from "openai";
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

class ModelStore {
  models: Model[] = [];
  selectedModel: Model | null = null;
  loadingModels: boolean = false;
  ollama: Ollama | null = null;
  openai: OpenAI | null = null;
  geminiAI: GoogleGenerativeAI | null = null;
  geminiModels: Record<string, GenerativeModel> = {};
  error: ModelError | null = null;
  defaultSystemMessage: ChatMessage = {
    role: "system",
    content: "You are a helpful assistant. Use clear and concise language.",
  };
  modelsCapabilities: Record<string, string[]> = {
    "llama3.2": ["text-generation", "reasoning"],
    "llama3.2:11b": ["text-generation", "vision", "reasoning"],
    "llama3.2:90b": ["text-generation", "vision", "reasoning"],
    llava: ["vision", "text-generation", "reasoning"],
    "llava:7b": ["vision", "text-generation", "reasoning"],
    "llava:13b": ["vision", "text-generation", "reasoning"],
    "llava:34b": ["vision", "text-generation", "reasoning"],
    phi3: ["text-generation", "reasoning"],
    llama3: ["text-generation", "reasoning"],
    "dolphin-llama3": ["text-generation", "reasoning"],
    wizardlm2: ["text-generation", "deep-reasoning"],
    llama2: ["text-generation"],
    mistral: ["text-generation", "reasoning"],
    "mixtral:8x7b": ["text-generation", "reasoning"],
    "mixtral:8x22b": ["text-generation", "reasoning"],
    "command-r": ["text-generation", "deep-reasoning"],
    "command-r-plus": ["text-generation", "deep-reasoning"],
    "dolphin-phi": ["text-generation", "reasoning"],
    phi: ["text-generation", "reasoning"],
    "neural-chat": ["text-generation", "reasoning"],
    "starling-lm": ["text-generation", "reasoning"],
    codellama: ["code-generation"],
    "llama2-uncensored": ["text-generation"],
    "llama2:13b": ["text-generation", "reasoning"],
    "llama2:70b": ["text-generation", "reasoning"],
    "orca-mini": ["text-generation", "reasoning"],
    vicuna: ["text-generation", "reasoning"],
    "gemma:2b": ["text-generation", "reasoning"],
    "gemma:7b": ["text-generation", "reasoning"],
    "DeepSeek-V3": ["text-generation"],
    "DeepSeek-R1": ["code-generation", "reasoning"],
    "gemini-2.0-flash": ["text-generation", "vision", "reasoning"],
    "gemini-2.0-flash-lite": ["text-generation", "vision", "reasoning"],
    "gemini-2.0-pro": [
      "text-generation",
      "vision",
      "reasoning",
      "deep-reasoning",
    ],
  };

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
    this.initializeProviders();
    this.loadModels();
  }

  initializeProviders() {
    // Initialize Ollama client
    const ollamaConfig = settingsStore.getProviderConfig("ollama");
    if (ollamaConfig && ollamaConfig.enabled) {
      this.ollama = new Ollama({
        host: ollamaConfig.baseUrl || "http://localhost:11434",
      });
    } else {
      this.ollama = null; // Explicitly set to null if not enabled
    }

    // Initialize OpenAI client
    const openaiConfig = settingsStore.getProviderConfig("openai");
    if (openaiConfig && openaiConfig.enabled && openaiConfig.apiKey) {
      this.openai = new OpenAI({
        apiKey: openaiConfig.apiKey,
        baseURL: openaiConfig.baseUrl,
        dangerouslyAllowBrowser: true, // Add this flag to allow browser usage
      });
    }

    // Initialize DeepSeek client (We'll use axios directly for API calls)
    const deepseekConfig = settingsStore.getProviderConfig("deepseek");
    if (deepseekConfig && deepseekConfig.enabled && deepseekConfig.apiKey) {
      // We don't need to initialize a client for DeepSeek here
      // We'll use axios directly for API calls when needed
    }

    // Initialize Gemini client
    const geminiConfig = settingsStore.getProviderConfig("gemini");
    if (geminiConfig && geminiConfig.enabled && geminiConfig.apiKey) {
      this.geminiAI = new GoogleGenerativeAI(geminiConfig.apiKey);

      // Pre-initialize models
      if (geminiConfig.models) {
        geminiConfig.models.forEach((modelName) => {
          this.geminiModels[modelName] = this.geminiAI!.getGenerativeModel({
            model: modelName,
          });
        });
      }
    } else {
      this.geminiAI = null;
      this.geminiModels = {};
    }
  }

  async loadModels() {
    this.loadingModels = true;
    this.error = null;
    this.models = [];

    try {
      // Load models from all enabled providers
      await this.loadOllamaModels();
      await this.loadOpenAIModels();
      await this.loadDeepSeekModels(); // Add DeepSeek models loading
      await this.loadGeminiModels(); // Add Gemini models loading

      // Select first model by default if none is selected
      if (!this.selectedModel && this.models.length > 0) {
        this.selectModel(this.models[0]);
      }
    } catch (error) {
      this.setError("loadModels", error);
    } finally {
      runInAction(() => {
        this.loadingModels = false;
      });
    }
  }

  private async loadOllamaModels() {
    if (!settingsStore.isProviderEnabled("ollama") || !this.ollama) return;

    try {
      const response = await this.ollama.list();

      if (response.models) {
        const ollamaModels = response.models.map((model: ModelResponse) => ({
          id: uuidv4(),
          name: model.name,
          description: `${model.size} - ${model.modified_at}`,
          provider: "ollama",
        })) as Model[];

        runInAction(() => {
          this.models = [...this.models, ...ollamaModels];
        });
      }
    } catch (error) {
      this.setError("loadOllamaModels", error);
    }
  }

  private async loadOpenAIModels() {
    const openaiConfig = settingsStore.getProviderConfig("openai");
    if (!openaiConfig?.enabled) return;

    try {
      // Check if we have predefined models and use them
      if (openaiConfig.models && openaiConfig.models.length > 0) {
        const openaiModels = openaiConfig.models.map((modelName) => ({
          id: uuidv4(),
          name: modelName,
          description: `OpenAI ${modelName}`,
          provider: "openai",
        })) as Model[];

        runInAction(() => {
          this.models = [...this.models, ...openaiModels];
        });
        console.log(
          `Loaded ${openaiModels.length} OpenAI models from configuration`
        );
      } else {
        console.warn("No OpenAI models defined in configuration");
      }
    } catch (error) {
      this.setError("loadOpenAIModels", error);
    }
  }

  private async loadDeepSeekModels() {
    const deepseekConfig = settingsStore.getProviderConfig("deepseek");
    if (!deepseekConfig?.enabled) return;

    try {
      // For DeepSeek, we'll use the predefined models from settings
      if (deepseekConfig.models && deepseekConfig.models.length > 0) {
        const deepseekModels = deepseekConfig.models.map((modelName) => ({
          id: uuidv4(),
          name: modelName,
          description: `DeepSeek ${modelName}`,
          provider: "deepseek",
        })) as Model[];

        runInAction(() => {
          this.models = [...this.models, ...deepseekModels];
        });
        console.log(
          `Loaded ${deepseekModels.length} DeepSeek models from configuration`
        );
      } else {
        console.warn("No DeepSeek models defined in configuration");
      }
    } catch (error) {
      this.setError("loadDeepSeekModels", error);
    }
  }

  private async loadGeminiModels() {
    const geminiConfig = settingsStore.getProviderConfig("gemini");
    if (!geminiConfig?.enabled) return;

    try {
      // For Gemini, we'll use the predefined models from settings
      if (geminiConfig.models && geminiConfig.models.length > 0) {
        const geminiModels = geminiConfig.models.map((modelName) => ({
          id: uuidv4(),
          name: modelName,
          description: `Google ${modelName}`,
          provider: "gemini",
        })) as Model[];

        runInAction(() => {
          this.models = [...this.models, ...geminiModels];
        });
        console.log(
          `Loaded ${geminiModels.length} Gemini models from configuration`
        );
      } else {
        console.warn("No Gemini models defined in configuration");
      }
    } catch (error) {
      this.setError("loadGeminiModels", error);
    }
  }

  // Add a method to test provider connections
  async testProvider(providerType: ProviderType): Promise<boolean> {
    try {
      this.clearError();

      if (providerType === "openai") {
        const config = settingsStore.getProviderConfig("openai");
        if (!config?.enabled || !config?.apiKey) {
          throw new Error("OpenAI is not enabled or missing API key");
        }

        // If we don't have an OpenAI client yet, create one temporarily
        let client = this.openai;
        if (!client) {
          client = new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseUrl || "https://api.openai.com/v1",
            dangerouslyAllowBrowser: true,
          });
        }

        // Just do a simple API call to verify the connection
        const response = await client.models.list();
        return response.data.length > 0;
      } else if (providerType === "ollama") {
        if (!this.ollama) {
          const config = settingsStore.getProviderConfig("ollama");
          if (!config?.enabled) {
            throw new Error("Ollama is not enabled");
          }
          this.ollama = new Ollama({
            host: config.baseUrl || "http://localhost:11434",
          });
        }
        await this.ollama.list();
        return true;
      } else if (providerType === "anthropic") {
        // Not implemented yet, but return true if enabled
        const config = settingsStore.getProviderConfig("anthropic");
        return !!config?.enabled && !!config?.apiKey;
      } else if (providerType === "deepseek") {
        const config = settingsStore.getProviderConfig("deepseek");
        if (!config?.enabled || !config?.apiKey) {
          throw new Error("DeepSeek is not enabled or missing API key");
        }

        // For DeepSeek, we'll just check if we have valid configuration
        // A real implementation would call the models endpoint to verify access
        const hasModels = config.models && config.models.length > 0;
        return Boolean(config.enabled && config.apiKey && hasModels);
      } else if (providerType === "gemini") {
        const config = settingsStore.getProviderConfig("gemini");
        if (!config?.enabled || !config?.apiKey) {
          throw new Error("Gemini is not enabled or missing API key");
        }

        // Initialize Gemini if needed
        if (!this.geminiAI) {
          this.geminiAI = new GoogleGenerativeAI(config.apiKey);
        }

        // Test with a simple model
        const model = this.geminiAI.getGenerativeModel({
          model: "gemini-2.0-flash",
        });
        await model.generateContent("Test connection");
        return true;
      }

      return false;
    } catch (error) {
      this.setError(`testProvider-${providerType}`, error);
      return false;
    }
  }

  private setError(source: string, error: any) {
    const modelError: ModelError = new Error(
      error.message || "An unknown error occurred"
    ) as ModelError;

    modelError.provider = source;
    modelError.name = "ModelError";

    if (axios.isAxiosError(error)) {
      modelError.statusCode = error.response?.status;
      modelError.details = JSON.stringify(error.response?.data);
    }

    console.error(`Error in ${source}:`, error);
    runInAction(() => {
      this.error = modelError;
    });
  }

  async queryModel(prompt: string, systemMsg?: string): Promise<string> {
    if (!this.selectedModel) {
      throw new Error("No model selected");
    }

    try {
      this.error = null;

      // Determine which provider to use based on the selected model
      if (this.selectedModel.provider === "ollama") {
        return this.queryOllamaModel(prompt, systemMsg);
      } else if (this.selectedModel.provider === "openai") {
        return this.queryOpenAIModel(prompt, systemMsg);
      } else if (this.selectedModel.provider === "deepseek") {
        return this.queryDeepSeekModel(prompt, systemMsg);
      } else if (this.selectedModel.provider === "gemini") {
        return this.queryGeminiModel(prompt, systemMsg);
      } else {
        throw new Error(`Unsupported provider: ${this.selectedModel.provider}`);
      }
    } catch (error) {
      this.setError("queryModel", error);
      throw error;
    }
  }

  private async queryOllamaModel(
    prompt: string,
    systemMsg?: string
  ): Promise<string> {
    if (!this.ollama) {
      throw new Error("Ollama provider not initialized");
    }

    let result = "";
    const systemMessage = systemMsg || this.defaultSystemMessage.content;

    try {
      const response = await this.ollama.generate({
        model: this.selectedModel!.name,
        prompt: prompt,
        system: systemMessage,
        stream: true,
      });

      for await (const part of response) {
        if (part.response) {
          result += part.response;
        }
      }

      return result || "No response received";
    } catch (error) {
      this.setError("queryOllamaModel", error);
      throw error;
    }
  }

  private async queryOpenAIModel(
    prompt: string,
    systemMsg?: string
  ): Promise<string> {
    if (!this.openai) {
      throw new Error("OpenAI provider not initialized");
    }

    try {
      const systemMessage = systemMsg || this.defaultSystemMessage.content;

      const messages = [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt },
      ];

      const response = await this.openai.chat.completions.create({
        model: this.selectedModel!.name,
        messages: messages as any,
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content || "No response received";
    } catch (error) {
      this.setError("queryOpenAIModel", error);
      throw error;
    }
  }

  private async queryDeepSeekModel(
    prompt: string,
    systemMsg?: string
  ): Promise<string> {
    const deepseekConfig = settingsStore.getProviderConfig("deepseek");
    if (!deepseekConfig || !deepseekConfig.apiKey) {
      throw new Error("DeepSeek API key is not configured");
    }

    try {
      const systemMessage = systemMsg || this.defaultSystemMessage.content;

      const response = await axios.post(
        `${deepseekConfig.baseUrl}/chat/completions`,
        {
          model: this.selectedModel!.name,
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${deepseekConfig.apiKey}`,
          },
        }
      );

      return (
        response.data.choices[0]?.message?.content || "No response received"
      );
    } catch (error) {
      this.setError("queryDeepSeekModel", error);
      throw error;
    }
  }

  private async queryGeminiModel(
    prompt: string,
    systemMsg?: string
  ): Promise<string> {
    if (!this.geminiAI) {
      throw new Error("Gemini provider not initialized");
    }

    try {
      const systemMessage = systemMsg || this.defaultSystemMessage.content;
      const modelName = this.selectedModel!.name;

      // Get or create the model instance
      let model = this.geminiModels[modelName];
      if (!model) {
        model = this.geminiAI.getGenerativeModel({ model: modelName });
        this.geminiModels[modelName] = model;
      }

      // For Gemini, we need to include system message in the chat history
      const chat = model.startChat({
        history: [
          { role: "user", parts: [{ text: "System: " + systemMessage }] },
          {
            role: "model",
            parts: [{ text: "I understand and will follow these guidelines." }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
        },
      });

      const result = await chat.sendMessage(prompt);
      return result.response.text();
    } catch (error) {
      this.setError("queryGeminiModel", error);
      throw error;
    }
  }

  /**
   * Send a chat message with conversation history
   */
  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    if (!this.selectedModel) {
      throw new Error("No model selected");
    }

    try {
      this.clearError();

      // Check if the selected model supports the requested features
      if (
        this.hasImagesInMessages(messages) &&
        !this.modelSupportsVision(this.selectedModel.name)
      ) {
        throw new Error(
          `Model ${this.selectedModel.name} does not support vision capabilities`
        );
      }

      // Add default system message if one isn't already present
      const hasSystemMessage = messages.some((msg) => msg.role === "system");
      const finalMessages = hasSystemMessage
        ? messages
        : [this.defaultSystemMessage, ...messages];

      // Route to appropriate provider
      if (this.selectedModel.provider === "ollama") {
        return this.ollamaChat(finalMessages, options);
      } else if (this.selectedModel.provider === "openai") {
        return this.openaiChat(finalMessages, options);
      } else if (this.selectedModel.provider === "deepseek") {
        return this.deepSeekChat(finalMessages, options);
      } else if (this.selectedModel.provider === "gemini") {
        return this.geminiChat(finalMessages, options);
      } else {
        throw new Error(`Unsupported provider: ${this.selectedModel.provider}`);
      }
    } catch (error) {
      this.setError("chat", error);
      throw error;
    }
  }

  private async ollamaChat(
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<string> {
    if (!this.ollama) {
      throw new Error("Ollama provider not initialized");
    }

    try {
      const response = await this.ollama.chat({
        model: this.selectedModel!.name,
        messages: messages,
        options: options,
      });

      return response.message?.content || "No response received";
    } catch (error) {
      this.setError("ollamaChat", error);
      throw error;
    }
  }

  private async openaiChat(
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<string> {
    if (!this.openai) {
      throw new Error("OpenAI provider not initialized");
    }

    try {
      // Convert our internal format to OpenAI's format
      const openAIMessages = messages.map((msg) => ({
        role: msg.role,
        content: this.formatOpenAIMessage(msg),
      }));

      const response = await this.openai.chat.completions.create({
        model: this.selectedModel!.name,
        messages: openAIMessages as any,
        temperature: options?.temperature || 0.7,
      });

      return response.choices[0]?.message?.content || "No response received";
    } catch (error) {
      this.setError("openaiChat", error);
      throw error;
    }
  }

  private async deepSeekChat(
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<string> {
    const deepseekConfig = settingsStore.getProviderConfig("deepseek");
    if (!deepseekConfig || !deepseekConfig.apiKey) {
      throw new Error("DeepSeek API key is not configured");
    }

    try {
      // Convert our internal format to DeepSeek's format
      const deepSeekMessages = messages.map((msg) => ({
        role: msg.role,
        content: this.formatDeepSeekMessage(msg),
      }));

      const response = await axios.post(
        `${deepseekConfig.baseUrl}/chat/completions`,
        {
          model: this.selectedModel!.name,
          messages: deepSeekMessages,
          temperature: options?.temperature || 0.7,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${deepseekConfig.apiKey}`,
          },
        }
      );

      return (
        response.data.choices[0]?.message?.content || "No response received"
      );
    } catch (error) {
      this.setError("deepSeekChat", error);
      throw error;
    }
  }

  private async geminiChat(
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<string> {
    if (!this.geminiAI) {
      throw new Error("Gemini provider not initialized");
    }

    try {
      const modelName = this.selectedModel!.name;

      // Get or create the model instance
      let model = this.geminiModels[modelName];
      if (!model) {
        model = this.geminiAI.getGenerativeModel({ model: modelName });
        this.geminiModels[modelName] = model;
      }

      // Convert messages to Gemini format
      // Extract system message
      const systemMessage = messages.find((msg) => msg.role === "system");
      const userMessages = messages.filter((msg) => msg.role !== "system");

      // Create a chat history with system message at the beginning
      const chatHistory = [];
      if (systemMessage) {
        chatHistory.push(
          {
            role: "user",
            parts: [{ text: "System: " + systemMessage.content }],
          },
          {
            role: "model",
            parts: [{ text: "I understand and will follow these guidelines." }],
          }
        );
      }

      // Add user/assistant messages
      for (let i = 0; i < userMessages.length; i++) {
        const msg = userMessages[i];
        if (msg.role === "user") {
          chatHistory.push({
            role: "user",
            parts: [{ text: msg.content }],
          });
        } else if (msg.role === "assistant") {
          chatHistory.push({
            role: "model",
            parts: [{ text: msg.content }],
          });
        }
      }

      // Start chat with history
      const chat = model.startChat({
        history: chatHistory,
        generationConfig: {
          temperature: options?.temperature || 0.7,
        },
      });

      // Get the last user message to send
      const lastUserMessage = userMessages
        .filter((msg) => msg.role === "user")
        .pop();
      if (!lastUserMessage) {
        throw new Error("No user message found to send");
      }

      const result = await chat.sendMessage(lastUserMessage.content);
      return result.response.text();
    } catch (error) {
      this.setError("geminiChat", error);
      throw error;
    }
  }

  /**
   * Format messages for DeepSeek API
   * Converts our internal message format to DeepSeek's expected format
   */
  private formatDeepSeekMessage(message: ChatMessage): any {
    // Handle text-only messages
    if (!message.images || message.images.length === 0) {
      return message.content;
    }

    // Handle messages with images for DeepSeek
    let formattedContent = message.content || "";

    // Add images using Markdown format which is supported by DeepSeek's vision models
    message.images.forEach((imageUrl, index) => {
      if (imageUrl.startsWith("data:image")) {
        // For base64 images, we need to include them directly
        formattedContent += `\n![Image ${index + 1}](${imageUrl})`;
      } else {
        // For URL images
        formattedContent += `\n![Image ${index + 1}](${imageUrl})`;
      }
    });

    return formattedContent;
  }

  /**
   * Format messages for OpenAI API
   * Converts our internal message format to OpenAI's expected format
   */
  private formatOpenAIMessage(message: ChatMessage): any {
    // Handle text-only messages
    if (!message.images || message.images.length === 0) {
      return message.content;
    }

    // Handle messages with images
    const content: any[] = [];

    // Add the text part if it exists
    if (message.content) {
      content.push({ type: "text", text: message.content });
    }

    // Add image parts
    for (const imageUrl of message.images) {
      if (imageUrl.startsWith("data:image")) {
        // Handle base64 images
        content.push({
          type: "image_url",
          image_url: {
            url: imageUrl,
          },
        });
      } else {
        // Handle regular URLs
        content.push({
          type: "image_url",
          image_url: {
            url: imageUrl,
          },
        });
      }
    }

    return content;
  }

  // Add the missing selectModel and clearError methods
  selectModel(model: Model) {
    runInAction(() => {
      this.selectedModel = model;
    });
  }

  clearError() {
    runInAction(() => {
      this.error = null;
    });
  }

  // Add proper typing for the methods being called in the code
  selectModelByName(modelName: string) {
    const model = this.models.find((m) => m.name === modelName);
    if (model) {
      this.selectModel(model);
    }
  }

  refreshProviders() {
    this.initializeProviders();
    this.loadModels();
  }

  /**
   * Stream chat responses chunk by chunk with callback
   */
  async streamChat(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<string> {
    if (!this.selectedModel) {
      throw new Error("No model selected");
    }

    try {
      this.error = null;

      // Check if the selected model supports the requested features
      if (
        this.hasImagesInMessages(messages) &&
        !this.modelSupportsVision(this.selectedModel.name)
      ) {
        throw new Error(
          `Model ${this.selectedModel.name} does not support vision capabilities`
        );
      }

      // Add default system message if one isn't already present
      const hasSystemMessage = messages.some((msg) => msg.role === "system");
      const finalMessages = hasSystemMessage
        ? messages
        : [this.defaultSystemMessage, ...messages];

      // Route to appropriate provider streaming method
      if (this.selectedModel.provider === "ollama") {
        return this.streamOllamaChat(finalMessages, onChunk, signal);
      } else if (this.selectedModel.provider === "openai") {
        return this.streamOpenAIChat(finalMessages, onChunk, signal);
      } else if (this.selectedModel.provider === "deepseek") {
        return this.streamDeepSeekChat(finalMessages, onChunk, signal);
      } else {
        throw new Error(`Unsupported provider: ${this.selectedModel.provider}`);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        console.log("Request was aborted");
        throw error; // Re-throw to be handled by the caller
      }

      this.setError("streamChat", error);
      throw error;
    }
  }

  private async streamOllamaChat(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<string> {
    if (!this.ollama) {
      throw new Error("Ollama provider not initialized");
    }

    let result = "";
    let isReasoningModel =
      this.modelHasCapability("reasoning") ||
      this.modelHasCapability("deep-reasoning");
    let hasAddedThinkTag = false;
    let hasClosedThinkTag = false;
    let tokenCount = 0;

    try {
      // Using the chat API from Ollama with streaming
      const response = await this.ollama.chat({
        model: this.selectedModel!.name,
        messages: messages,
        stream: true,
      });

      // Set up a handler for the abort signal
      if (signal) {
        signal.addEventListener(
          "abort",
          () => {
            throw new DOMException("Aborted", "AbortError");
          },
          { once: true }
        );
      }

      // Process the streamed response and call the callback for each chunk
      for await (const part of response) {
        // Check if aborted
        if (signal?.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }

        if (part.message?.content) {
          const chunk = part.message.content;
          tokenCount++;

          // For reasoning models, add think tags around initial output
          if (isReasoningModel) {
            // If we're just starting and haven't added the think tag yet
            if (tokenCount <= 2 && !hasAddedThinkTag) {
              const openTag = "<think>\n";
              result += openTag;
              onChunk(openTag);
              hasAddedThinkTag = true;
            }

            // Add the chunk content
            result += chunk;
            onChunk(chunk);

            // After a certain number of tokens, close the thinking tag if not closed yet
            if (tokenCount >= 20 && !hasClosedThinkTag) {
              const closeTag = "\n</think>\n\n";
              result += closeTag;
              onChunk(closeTag);
              hasClosedThinkTag = true;
            }
          } else {
            // For non-reasoning models, just output the content
            result += chunk;
            onChunk(chunk);
          }
        }
      }

      // If we've added a think tag but never closed it, close it now
      if (hasAddedThinkTag && !hasClosedThinkTag) {
        const closeTag = "\n</think>\n\n";
        result += closeTag;
        onChunk(closeTag);
      }

      return result || "No response received";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error; // Re-throw abort errors
      }

      this.setError("streamOllamaChat", error);
      throw error;
    }
  }

  private async streamOpenAIChat(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<string> {
    if (!this.openai) {
      throw new Error("OpenAI provider not initialized");
    }

    let result = "";
    let isReasoningModel =
      this.modelHasCapability("reasoning") ||
      this.modelHasCapability("deep-reasoning");
    let hasAddedThinkTag = false;
    let hasClosedThinkTag = false;
    let tokenCount = 0;

    try {
      // Convert our internal message format to OpenAI's format
      const openAIMessages = messages.map((msg) => ({
        role: msg.role,
        content: this.formatOpenAIMessage(msg),
      }));

      const stream = await this.openai.chat.completions.create(
        {
          model: this.selectedModel!.name,
          messages: openAIMessages as any,
          stream: true,
          temperature: 0.7,
        },
        { signal }
      );

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";

        if (content) {
          tokenCount++;

          // For reasoning models, add think tags around initial output
          if (isReasoningModel) {
            // If we're just starting and haven't added the think tag yet
            if (tokenCount <= 2 && !hasAddedThinkTag) {
              const openTag = "<think>\n";
              result += openTag;
              onChunk(openTag);
              hasAddedThinkTag = true;
            }

            // Add the chunk content
            result += content;
            onChunk(content);

            // After a certain number of tokens, close the thinking tag if not closed yet
            if (tokenCount >= 20 && !hasClosedThinkTag) {
              const closeTag = "\n</think>\n\n";
              result += closeTag;
              onChunk(closeTag);
              hasClosedThinkTag = true;
            }
          } else {
            // For non-reasoning models, just output the content
            result += content;
            onChunk(content);
          }
        }
      }

      // If we've added a think tag but never closed it, close it now
      if (hasAddedThinkTag && !hasClosedThinkTag) {
        const closeTag = "\n</think>\n\n";
        result += closeTag;
        onChunk(closeTag);
      }

      return result;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error; // Re-throw abort errors
      }

      this.setError("streamOpenAIChat", error);
      throw error;
    }
  }

  private async streamDeepSeekChat(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<string> {
    const deepseekConfig = settingsStore.getProviderConfig("deepseek");
    if (!deepseekConfig || !deepseekConfig.apiKey) {
      throw new Error("DeepSeek API key is not configured");
    }

    let result = "";
    let isReasoningModel =
      this.modelHasCapability("reasoning") ||
      this.modelHasCapability("deep-reasoning");
    let hasAddedThinkTag = false;
    let hasClosedThinkTag = false;
    let tokenCount = 0;

    try {
      // Convert our internal message format to DeepSeek's format
      const deepSeekMessages = messages.map((msg) => ({
        role: msg.role,
        content: this.formatDeepSeekMessage(msg),
      }));

      const response = await axios.post(
        `${deepseekConfig.baseUrl}/chat/completions`,
        {
          model: this.selectedModel!.name,
          messages: deepSeekMessages,
          temperature: 0.7,
          stream: true,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${deepseekConfig.apiKey}`,
          },
          responseType: "stream",
          signal,
        }
      );

      // Process the streamed response line by line
      const reader = response.data.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || "";

              if (content) {
                tokenCount++;

                // For reasoning models, add think tags around initial output
                if (isReasoningModel) {
                  // If we're just starting and haven't added the think tag yet
                  if (tokenCount <= 2 && !hasAddedThinkTag) {
                    const openTag = "<think>\n";
                    result += openTag;
                    onChunk(openTag);
                    hasAddedThinkTag = true;
                  }

                  // Add the chunk content
                  result += content;
                  onChunk(content);

                  // After a certain number of tokens, close the thinking tag if not closed yet
                  if (tokenCount >= 20 && !hasClosedThinkTag) {
                    const closeTag = "\n</think>\n\n";
                    result += closeTag;
                    onChunk(closeTag);
                    hasClosedThinkTag = true;
                  }
                } else {
                  // For non-reasoning models, just output the content
                  result += content;
                  onChunk(content);
                }
              }
            } catch (err) {
              console.error("Error parsing DeepSeek stream chunk:", err);
            }
          }
        }
      }

      // If we've added a think tag but never closed it, close it now
      if (hasAddedThinkTag && !hasClosedThinkTag) {
        const closeTag = "\n</think>\n\n";
        result += closeTag;
        onChunk(closeTag);
      }

      return result || "No response received";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error; // Re-throw abort errors
      }

      this.setError("streamDeepSeekChat", error);
      throw error;
    }
  }

  /**
   * Stream a chat response with images
   */
  async streamChatWithImages(
    prompt: string,
    images: string[],
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<string> {
    if (!this.modelHasCapability("vision")) {
      throw new Error("Selected model does not support vision capabilities");
    }

    const message: ChatMessage = {
      role: "user",
      content: prompt,
      images,
    };

    return this.streamChat(
      [message],
      (chunk: string) => {
        if (chunk) {
          onChunk(chunk);
        }
      },
      signal
    );
  }

  /**
   * Check if any messages contain images
   */
  private hasImagesInMessages(messages: ChatMessage[]): boolean {
    return messages.some((msg) => msg.images && msg.images.length > 0);
  }

  /**
   * Check if the model supports vision based on its name
   */
  private modelSupportsVision(modelName: string): boolean {
    const baseModelName = this.getBaseModelName(modelName);
    const capabilities = this.modelsCapabilities[baseModelName] || [];
    return capabilities.includes("vision");
  }

  /**
   * Extract base model name from full model name
   */
  private getBaseModelName(fullName: string): string {
    // Split by colon and get the first part
    return fullName.split(":")[0];
  }

  /**
   * Get available capabilities for the current model
   */
  getSelectedModelCapabilities(): string[] {
    if (!this.selectedModel) return [];

    const baseModelName = this.getBaseModelName(this.selectedModel.name);
    return this.modelsCapabilities[baseModelName] || [];
  }

  /**
   * Check if the current model supports a specific capability
   */
  modelHasCapability(capability: string): boolean {
    if (!this.selectedModel) return false;

    // Provider-specific capability checks
    if (this.selectedModel.provider === "openai") {
      if (capability === "vision") {
        return (
          this.selectedModel.name.includes("vision") ||
          (this.selectedModel.name.includes("gpt-4") &&
            !this.selectedModel.name.includes("gpt-4-32k"))
        );
      }
      return true; // OpenAI models generally support text generation and reasoning
    } else if (this.selectedModel.provider === "deepseek") {
      if (capability === "vision") {
        return this.selectedModel.name.includes("vl");
      }
      if (capability === "code-generation") {
        return this.selectedModel.name.includes("coder");
      }
      return true; // DeepSeek models generally support text generation and reasoning
    }

    // Use existing capability check for other models
    const capabilities = this.getSelectedModelCapabilities();
    return capabilities.includes(capability);
  }

  /**
   * Generate a chat response with image
   */
  async chatWithImages(prompt: string, images: string[]): Promise<string> {
    if (!this.modelHasCapability("vision")) {
      throw new Error("Selected model does not support vision capabilities");
    }

    const message: ChatMessage = {
      role: "user",
      content: prompt,
      images,
    };

    return this.chat([message]);
  }

  /**
   * Process input for commands and execute model query
   */
  async processInput(input: string): Promise<string> {
    // Check if input is a command
    const commandResult = commandSystem.processCommandInput(input);

    if (commandResult.isCommand) {
      // Use command-specific system message if provided
      return this.queryModel(commandResult.prompt, commandResult.systemMessage);
    } else {
      // Regular query without command
      return this.queryModel(input);
    }
  }

  /**
   * Process message for chat mode with potential commands
   */
  async processChat(
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<string> {
    if (messages.length === 0) return "";

    // Only process commands on the last user message
    const lastMsg = messages[messages.length - 1];

    if (lastMsg.role === "user" && typeof lastMsg.content === "string") {
      const commandResult = commandSystem.processCommandInput(lastMsg.content);

      if (commandResult.isCommand) {
        // Replace the original message with the processed command
        const updatedMessages = [
          ...messages.slice(0, -1),
          {
            ...lastMsg,
            content: commandResult.prompt,
          },
        ];

        // Use command-specific system message if provided
        if (commandResult.systemMessage) {
          // Check if there's already a system message
          const sysMessageIndex = updatedMessages.findIndex(
            (m) => m.role === "system"
          );

          if (sysMessageIndex >= 0) {
            // Replace existing system message
            updatedMessages[sysMessageIndex] = {
              role: "system",
              content: commandResult.systemMessage,
            };
          } else {
            // Add system message at the beginning
            updatedMessages.unshift({
              role: "system",
              content: commandResult.systemMessage,
            });
          }
        }

        return this.chat(updatedMessages, options);
      }
    }

    // No command found, proceed with normal chat
    return this.chat(messages, options);
  }

  /**
   * Stream chat with support for commands
   */
  async processStreamChat(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<string> {
    if (messages.length === 0) return "";

    // Only process commands on the last user message
    const lastMsg = messages[messages.length - 1];

    if (lastMsg.role === "user" && typeof lastMsg.content === "string") {
      const commandResult = commandSystem.processCommandInput(lastMsg.content);

      if (commandResult.isCommand) {
        // Replace the original message with the processed command
        const updatedMessages = [
          ...messages.slice(0, -1),
          {
            ...lastMsg,
            content: commandResult.prompt,
          },
        ];

        // Use command-specific system message if provided
        if (commandResult.systemMessage) {
          // Check if there's already a system message
          const sysMessageIndex = updatedMessages.findIndex(
            (m) => m.role === "system"
          );

          if (sysMessageIndex >= 0) {
            // Replace existing system message
            updatedMessages[sysMessageIndex] = {
              role: "system",
              content: commandResult.systemMessage,
            };
          } else {
            // Add system message at the beginning
            updatedMessages.unshift({
              role: "system",
              content: commandResult.systemMessage,
            });
          }
        }

        return this.streamChat(updatedMessages, onChunk, signal);
      }
    }

    // No command found, proceed with normal chat
    return this.streamChat(messages, onChunk, signal);
  }
}

export const modelStore = new ModelStore();
