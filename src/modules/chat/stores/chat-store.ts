/* eslint-disable @typescript-eslint/no-explicit-any */
import { makeAutoObservable } from "mobx";
import { v4 as uuidv4 } from "uuid";
import { modelStore } from "./model-store";
import { Conversation, Message } from "../types";
import { toast } from "sonner";

class ChatStore {
  conversations: Conversation[] = [];
  activeConversationId: string | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });

    // Create initial conversation
    this.createNewConversation();
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

    try {
      // Convert existing messages to the format expected by the model
      const messageHistory = this.getMessageHistoryForModel(conversation);

      // Stream response from model
      await modelStore.streamChat(messageHistory, (chunk) => {
        // Incrementally update bot message with each received chunk
        botMessage.appendContent(chunk);
      });

      // Mark response as complete
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
      console.error("Error sending message:", error);
      botMessage.setContent(
        "Sorry, there was an error processing your request."
      );
      botMessage.setIsResponding(false);

      toast.error("Failed to get a response from the model.");
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

    try {
      // Stream response from model with images
      await modelStore.streamChatWithImages(content, images, (chunk) => {
        // Incrementally update bot message with each chunk
        botMessage.appendContent(chunk);
      });

      // Mark response as complete
      botMessage.setIsResponding(false);

      // Update conversation title if it's a new conversation
      if (
        conversation.title === "New Conversation" &&
        conversation.messages.length <= 3
      ) {
        conversation.updateTitle("Image Analysis");
      }
    } catch (error) {
      console.error("Error processing image:", error);
      botMessage.setContent("Sorry, there was an error analyzing the image.");
      botMessage.setIsResponding(false);

      toast.error("Failed to process image with the AI model.");
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
  }
}

export const chatStore = new ChatStore();
