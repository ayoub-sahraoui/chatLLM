/* eslint-disable @typescript-eslint/no-explicit-any */
import { makeAutoObservable, reaction } from "mobx";
import { v4 as uuidv4 } from "uuid";
import { modelStore } from "./model-store";
import { Conversation, Message } from "../types";
import { toast } from "sonner";

const STORAGE_KEY = "chatllm-conversations";

class ChatStore {
  conversations: Conversation[] = [];
  activeConversationId: string | null = null;
  currentAbortController: AbortController | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });

    // Load conversations from localStorage
    this.loadFromStorage();

    // If no conversations exist, create a new one
    if (this.conversations.length === 0) {
      this.createNewConversation();
    } else {
      // Set the first conversation as active if none is active
      if (!this.activeConversationId && this.conversations.length > 0) {
        this.activeConversationId = this.conversations[0].id;
      }
    }

    // Set up reaction to save changes to localStorage
    reaction(
      () => JSON.stringify(this.conversations),
      () => this.saveToStorage()
    );

    // Also react to activeConversationId changes
    reaction(
      () => this.activeConversationId,
      () => this.saveToStorage()
    );
  }

  loadFromStorage() {
    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      if (storedData) {
        const data = JSON.parse(storedData);

        // Restore conversations with proper class instances
        this.conversations = data.conversations.map((convData: any) => {
          const conv = new Conversation(
            convData.id,
            convData.title,
            convData.modelId
          );

          // Restore messages
          if (convData.messages) {
            conv.messages = convData.messages.map((msgData: any) => {
              const msg = new Message(
                msgData.id,
                msgData.content,
                msgData.role,
                new Date(msgData.timestamp),
                msgData.isResponding
              );

              // Restore attachments if any
              if (msgData.attachments) {
                msg.attachments = [...msgData.attachments];
              }

              return msg;
            });
          }

          return conv;
        });

        // Restore active conversation
        this.activeConversationId = data.activeConversationId;
      }
    } catch (error) {
      console.error("Failed to load conversations from storage:", error);
      toast.error("Failed to load previous conversations");
    }
  }

  saveToStorage() {
    try {
      const dataToStore = {
        conversations: this.conversations,
        activeConversationId: this.activeConversationId,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore));
    } catch (error) {
      console.error("Failed to save conversations to storage:", error);
      toast.error("Failed to save conversations");
    }
  }

  get activeConversation(): Conversation | undefined {
    if (!this.activeConversationId) return undefined;
    return this.conversations.find(
      (conv) => conv.id === this.activeConversationId
    );
  }

  createNewConversation(): string {
    const id = uuidv4();
    const conversation = new Conversation(
      id,
      "New Conversation",
      modelStore.selectedModel?.id || ""
    );

    this.conversations.push(conversation);
    this.activeConversationId = id;
    this.saveToStorage();
    return id;
  }

  async sendMessage(content: string) {
    if (!content.trim()) return;
    if (!this.activeConversation) {
      this.createNewConversation();
    }

    const conversation = this.activeConversation!;

    // Add user message
    const userMessage = new Message(uuidv4(), content, "user");
    conversation.addMessage(userMessage);

    // Create bot message with loading indicator
    const botMessage = new Message(uuidv4(), "", "bot", new Date(), true);
    conversation.addMessage(botMessage);

    // Create a new AbortController for this request
    this.currentAbortController = new AbortController();
    const signal = this.currentAbortController.signal;

    try {
      // Convert existing messages to the format expected by the model
      const messageHistory = this.getMessageHistoryForModel(conversation);

      // Stream response from model with abort signal
      await modelStore.streamChat(
        messageHistory,
        (chunk) => {
          // Incrementally update bot message with each received chunk
          botMessage.appendContent(chunk);
        },
        signal // Pass the abort signal to the model store
      );

      // Mark response as complete
      botMessage.setIsResponding(false);
      this.currentAbortController = null;

      // Update conversation title if it's a new conversation
      if (
        conversation.title === "New Conversation" &&
        conversation.messages.length <= 3
      ) {
        const shortenedContent =
          content.length > 30 ? content.substring(0, 30) + "..." : content;
        conversation.updateTitle(shortenedContent);
      }
    } catch (error) {
      console.error("Error sending message:", error);

      if (signal.aborted) {
        botMessage.setContent(
          botMessage.content + "\n\n[Message generation stopped.]"
        );
      } else {
        botMessage.setContent(
          "Sorry, there was an error processing your request."
        );
        toast.error("Failed to get a response from the model.");
      }

      botMessage.setIsResponding(false);
      this.currentAbortController = null;
    }
  }

  async sendMessageWithImages(content: string, images: string[]) {
    if (!this.activeConversation) {
      this.createNewConversation();
    }

    const conversation = this.activeConversation!;

    // Add user message with images
    const userMessage = new Message(uuidv4(), content, "user");

    // Add image attachments if available
    images.forEach((image, index) => {
      userMessage.addAttachment({
        id: uuidv4(),
        name: `Image ${index + 1}`,
        type: "image",
        url: `data:image/jpeg;base64,${image}`,
      });
    });

    conversation.addMessage(userMessage);

    // Create bot message with loading indicator
    const botMessage = new Message(uuidv4(), "", "bot", new Date(), true);
    conversation.addMessage(botMessage);

    // Create a new AbortController for this request
    this.currentAbortController = new AbortController();
    const signal = this.currentAbortController.signal;

    try {
      // Stream response from model with images and abort signal
      await modelStore.streamChatWithImages(
        content,
        images,
        (chunk) => {
          // Incrementally update bot message with each chunk
          botMessage.appendContent(chunk);
        },
        signal // Pass the abort signal to the model store
      );

      // Mark response as complete
      botMessage.setIsResponding(false);
      this.currentAbortController = null;

      // Update conversation title if it's a new conversation
      if (
        conversation.title === "New Conversation" &&
        conversation.messages.length <= 3
      ) {
        conversation.updateTitle("Image Analysis");
      }
    } catch (error) {
      console.error("Error processing image:", error);

      if (signal.aborted) {
        botMessage.setContent(
          botMessage.content + "\n\n[Image analysis stopped by user]"
        );
        toast.info("Image analysis stopped");
      } else {
        botMessage.setContent("Sorry, there was an error analyzing the image.");
        toast.error("Failed to process image with the AI model.");
      }

      botMessage.setIsResponding(false);
      this.currentAbortController = null;
    }
  }

  // Cancel the current message generation
  cancelCurrentMessage() {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
  }

  private getMessageHistoryForModel(conversation: Conversation) {
    return conversation.messages
      .map((msg) => {
        // Convert internal message format to the format expected by Ollama API
        const role =
          msg.role === "user"
            ? "user"
            : ("assistant" as "user" | "system" | "assistant");

        if (msg.attachments && msg.attachments.length > 0) {
          // Handle messages with images
          const images = msg.attachments
            .filter((a) => a.type === "image")
            .map((a) => {
              // Extract base64 data from dataURL
              const base64Data = a.url.split(",")[1];
              return base64Data;
            });

          return {
            role,
            content: msg.content,
            images: images.length > 0 ? images : undefined,
          };
        }

        // Text-only message
        return {
          role,
          content: msg.content,
        };
      })
      .filter((msg) => msg.content.trim() !== ""); // Filter out empty messages
  }

  setActiveConversation(id: string) {
    this.activeConversationId = id;
  }

  deleteConversation(id: string) {
    this.conversations = this.conversations.filter((conv) => conv.id !== id);
    if (this.activeConversationId === id) {
      this.activeConversationId = this.conversations[0]?.id || null;
      if (!this.activeConversationId) {
        this.createNewConversation();
      }
    }
    this.saveToStorage();
  }

  // Method to clear all conversations
  clearAllConversations() {
    this.conversations = [];
    this.activeConversationId = null;
    this.saveToStorage();
    this.createNewConversation();
    toast.success("All conversations cleared");
  }

  /**
   * Send a single message using the processInput method from modelStore
   * This is useful for simple, non-conversation interactions or quick commands
   */
  async sendSingleMessage(content: string) {
    if (!content.trim()) return;
    if (!this.activeConversation) {
      this.createNewConversation();
    }

    const conversation = this.activeConversation!;

    // Add user message
    const userMessage = new Message(uuidv4(), content, "user");
    conversation.addMessage(userMessage);

    // Create bot message with loading indicator
    const botMessage = new Message(uuidv4(), "", "bot", new Date(), true);
    conversation.addMessage(botMessage);

    try {
      // Process input (handles commands automatically)
      const response = await modelStore.processInput(content);

      // Update bot message with response
      botMessage.setContent(response);
      botMessage.setIsResponding(false);

      // Update conversation title if it's a new conversation
      if (
        conversation.title === "New Conversation" &&
        conversation.messages.length <= 3
      ) {
        const shortenedContent =
          content.length > 30 ? content.substring(0, 30) + "..." : content;
        conversation.updateTitle(shortenedContent);
      }
    } catch (error) {
      console.error("Error processing message:", error);
      botMessage.setContent(
        "Sorry, there was an error processing your request."
      );
      toast.error("Failed to get a response from the model.");
      botMessage.setIsResponding(false);
    }
  }
}

export const chatStore = new ChatStore();
