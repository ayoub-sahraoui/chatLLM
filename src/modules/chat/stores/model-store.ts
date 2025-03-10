/* eslint-disable @typescript-eslint/no-explicit-any */
import { makeAutoObservable } from "mobx";
import { ChatMessage, ChatOptions, Model } from "../types";
import { ModelResponse, Ollama } from "ollama";
import { v4 as uuidv4 } from "uuid";

class ModelStore {
  models: Model[] = [];
  selectedModel: Model | null = null;
  loadingModels: boolean = false;
  ollama: Ollama;
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
  };

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
    this.ollama = new Ollama({ host: "http://localhost:11434" });
    this.loadModels();
  }

  async loadModels() {
    this.loadingModels = true;
    try {
      const response = await this.ollama.list();

      if (response.models) {
        this.models = response.models.map((model: ModelResponse) => ({
          id: uuidv4(),
          name: model.name,
          description: `${model.size} - ${model.expires_at}`,
          provider: "ollama",
        })) as Model[];

        // Select first model by default if none is selected
        if (!this.selectedModel && this.models.length > 0) {
          this.selectModel(this.models[0]);
        }
      }
      this.loadingModels = false;
    } catch (error) {
      this.loadingModels = false;
      console.error("Error loading models:", error);
      this.models = [];
    }
  }

  async queryModel(prompt: string): Promise<string> {
    if (!this.selectedModel) {
      throw new Error("No model selected");
    }

    try {
      let result = "";

      // Using the streaming API from Ollama library
      const response = await this.ollama.generate({
        model: this.selectedModel.name,
        prompt,
        stream: true,
      });

      // Process the streamed response
      for await (const part of response) {
        if (part.response) {
          result += part.response;
        }
      }

      return result || "No response received";
    } catch (error) {
      console.error("Error querying model:", error);
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
      let result = "";

      // Check if the selected model supports the requested features
      if (
        this.hasImagesInMessages(messages) &&
        !this.modelSupportsVision(this.selectedModel.name)
      ) {
        throw new Error(
          `Model ${this.selectedModel.name} does not support vision capabilities`
        );
      }

      // Using the chat API from Ollama
      const response = await this.ollama.chat({
        model: this.selectedModel.name,
        messages,
        stream: true,
        options,
      });

      // Process the streamed response
      for await (const part of response) {
        if (part.message?.content) {
          result += part.message.content;
        }
      }

      return result || "No response received";
    } catch (error) {
      console.error("Error in chat:", error);
      throw error;
    }
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
      let result = "";

      // Check if the selected model supports the requested features
      if (
        this.hasImagesInMessages(messages) &&
        !this.modelSupportsVision(this.selectedModel.name)
      ) {
        throw new Error(
          `Model ${this.selectedModel.name} does not support vision capabilities`
        );
      }

      // Using the chat API from Ollama with streaming
      const response = await this.ollama.chat({
        model: this.selectedModel.name,
        messages,
        stream: true,
      });

      // Set up a handler for the abort signal
      if (signal) {
        signal.addEventListener(
          "abort",
          () => {
            // We need to stop the iteration somehow
            // Since we can't directly abort the Ollama stream,
            // we'll rely on handling the AbortError in the catch block
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
          result += chunk;

          // Ensure we're not passing undefined or null to the callback
          if (chunk) {
            onChunk(chunk);
          }
        }
      }

      return result || "No response received";
    } catch (error) {
      // Check if this is an abort error
      if (error instanceof DOMException && error.name === "AbortError") {
        console.log("Request was aborted");
        throw error; // Re-throw to be handled by the caller
      }

      console.error("Error in chat:", error);
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

  selectModel(model: Model) {
    this.selectedModel = model;
  }

  selectModelByName(modelName: string) {
    const model = this.models.find((m) => m.name === modelName);
    if (!model) return;
    this.selectedModel = model;
  }
}

export const modelStore = new ModelStore();
