import { makeObservable, observable, action } from "mobx";

export class Message {
  id: string;
  content: string;
  role: "user" | "bot" | "system";
  timestamp: Date;
  isResponding?: boolean;
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
  }>;

  constructor(
    id: string,
    content: string,
    role: "user" | "bot" | "system",
    timestamp: Date = new Date(),
    isResponding: boolean = false,
    attachments: Array<{
      id: string;
      name: string;
      type: string;
      url: string;
    }> = []
  ) {
    this.id = id;
    this.content = content || "";
    this.role = role;
    this.timestamp = timestamp;
    this.isResponding = isResponding;
    this.attachments = attachments;

    makeObservable(this, {
      id: observable,
      content: observable,
      role: observable,
      timestamp: observable,
      isResponding: observable,
      attachments: observable,
      setContent: action,
      appendContent: action,
      setIsResponding: action,
      addAttachment: action,
    });
  }

  setContent(content: string) {
    this.content = content || "";
  }

  appendContent(chunk: string) {
    // Prevent appending undefined or null chunks
    if (chunk == null) return;

    // Ensure content is always a string
    if (!this.content) {
      this.content = "";
    }

    this.content += chunk;
  }

  setIsResponding(isResponding: boolean) {
    this.isResponding = isResponding;
  }

  addAttachment(attachment: {
    id: string;
    name: string;
    type: string;
    url: string;
  }) {
    if (!this.attachments) {
      this.attachments = [];
    }
    this.attachments.push(attachment);
  }

  toJSON() {
    return {
      id: this.id,
      content: this.content,
      role: this.role,
      timestamp: this.timestamp.toISOString(),
      isResponding: this.isResponding,
      attachments: this.attachments,
    };
  }
}

export class Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  modelId: string;

  constructor(
    id: string,
    title: string,
    modelId: string,
    messages: Message[] = [],
    createdAt: Date = new Date(),
    updatedAt: Date = new Date()
  ) {
    this.id = id;
    this.title = title;
    this.messages = messages;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.modelId = modelId;

    makeObservable(this, {
      id: observable,
      title: observable,
      messages: observable,
      createdAt: observable,
      updatedAt: observable,
      modelId: observable,
      addMessage: action,
      updateTitle: action,
      setModelId: action,
    });
  }

  addMessage(message: Message) {
    this.messages.push(message);
    this.updatedAt = new Date();
  }

  updateTitle(title: string) {
    this.title = title;
    this.updatedAt = new Date();
  }

  setModelId(modelId: string) {
    this.modelId = modelId;
    this.updatedAt = new Date();
  }
}

export class Model {
  id: string;
  name: string;
  provider: string;
  description?: string;

  constructor(
    id: string,
    name: string,
    provider: string,
    description?: string
  ) {
    this.id = id;
    this.name = name;
    this.provider = provider;
    this.description = description;

    makeObservable(this, {
      id: observable,
      name: observable,
      provider: observable,
      description: observable,
      updateName: action,
      updateDescription: action,
    });
  }

  updateName(name: string) {
    this.name = name;
  }

  updateDescription(description: string) {
    this.description = description;
  }
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  images?: string[];
}

export interface ChatOptions {
  seed?: number;
  temperature?: number;
  num_predict?: number;
  top_k?: number;
  top_p?: number;
}

export interface ChatResponse {
  content: string;
  model: string;
  created_at: string;
  done: boolean;
  total_duration?: number;
}
