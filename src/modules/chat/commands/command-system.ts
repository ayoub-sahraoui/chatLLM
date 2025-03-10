export interface Command {
  name: string;
  description: string;
  template: string;
  systemMessage?: string;
  execute: (input: string) => { prompt: string; systemMessage?: string };
}

export class CommandSystem {
  private commands: Record<string, Command>;

  constructor() {
    // Initialize commands
    this.commands = {
      help: this.createCommand(
        "help",
        "Get help with using the chat interface and available commands",
        "Available commands:\n{commandList}\n\nProvide a concise explanation of what each command does and how to use it effectively.",
        "You are a helpful assistant explaining how to use the chat interface and its commands. Be concise yet thorough."
      ),
      ask: this.createCommand(
        "ask",
        "Ask a direct question to get a straightforward answer",
        "{input}",
        "You are a knowledgeable assistant providing clear, factual answers. Answer directly without unnecessary context."
      ),
      explain: this.createCommand(
        "explain",
        "Get a detailed explanation of a concept",
        "Explain in detail: {input}",
        "You are an educational assistant. Provide a comprehensive explanation with examples when appropriate."
      ),
      rewrite: this.createCommand(
        "rewrite",
        "Rewrite or improve given text",
        "Rewrite the following text to improve clarity, grammar, and flow:\n\n{input}",
        "You are an editor focused on improving text while maintaining the original meaning. Provide the improved version without explanations."
      ),
      compose: this.createCommand(
        "compose",
        "Compose an email, message, or other text",
        "Compose {input}",
        "You are a writing assistant skilled at drafting professional and effective communications."
      ),
      summarize: this.createCommand(
        "summarize",
        "Summarize a long text into key points",
        "Summarize the following text:\n\n{input}",
        "You are a summarization specialist. Extract and present the key points concisely."
      ),
      code: this.createCommand(
        "code",
        "Generate code based on a description",
        "Generate code for: {input}",
        "You are a programming assistant. Provide clean, well-commented code that solves the described problem."
      ),
      debug: this.createCommand(
        "debug",
        "Debug or improve existing code",
        "Debug or improve the following code:\n\n{input}",
        "You are a debugging specialist. Identify issues, suggest fixes, and explain your reasoning."
      ),
      translate: this.createCommand(
        "translate",
        "Translate text to another language",
        "Translate the following to {language}:\n\n{input}",
        "You are a translation assistant with perfect fluency in multiple languages."
      ),
      brainstorm: this.createCommand(
        "brainstorm",
        "Generate ideas on a topic",
        "Brainstorm ideas about: {input}",
        "You are a creative assistant. Generate diverse and innovative ideas on the given topic."
      ),
    };
  }

  // Helper for creating commands
  private createCommand(
    name: string,
    description: string,
    template: string,
    systemMessage?: string
  ): Command {
    return {
      name,
      description,
      template,
      systemMessage,
      execute: (input: string) => {
        // Replace {input} placeholders with the actual input
        const prompt = template.replace(/{input}/g, input);
        return { prompt, systemMessage };
      },
    };
  }

  /**
   * Parse input string to detect commands
   * @param input User input string
   * @returns Command object and remainingText if command was detected, null otherwise
   */
  public parseCommand(input: string): {
    command: Command;
    remainingText: string;
  } | null {
    // Check if input starts with '/'
    if (!input.startsWith("/")) {
      return null;
    }

    // Extract the potential command name
    const parts = input.slice(1).split(" ");
    const commandName = parts[0].toLowerCase();

    // Check if it's a valid command
    if (!(commandName in this.commands)) {
      return null;
    }

    // Return the command and the remaining text
    const remainingText = parts.slice(1).join(" ").trim();
    return {
      command: this.commands[commandName],
      remainingText,
    };
  }

  /**
   * Get a formatted list of available commands with descriptions
   */
  public getCommandsList(): string {
    return Object.entries(this.commands)
      .map(([name, cmd]) => `/${name} - ${cmd.description}`)
      .join("\n");
  }

  /**
   * Process user input for commands
   * @param input User input text
   * @returns Processed prompt and system message if command was detected
   */
  public processCommandInput(input: string): {
    isCommand: boolean;
    prompt: string;
    systemMessage?: string;
  } {
    const commandInfo = this.parseCommand(input);

    if (!commandInfo) {
      return { isCommand: false, prompt: input };
    }

    const { command, remainingText } = commandInfo;

    // Special case for help command
    if (command.name === "help") {
      const commandList = this.getCommandsList();
      const result = command.execute(commandList);
      return {
        isCommand: true,
        prompt: result.prompt,
        systemMessage: result.systemMessage,
      };
    }

    // Process other commands
    const result = command.execute(remainingText);
    return {
      isCommand: true,
      prompt: result.prompt,
      systemMessage: result.systemMessage,
    };
  }

  /**
   * Get all available commands
   * @returns Record of all commands
   */
  public getAllCommands(): Record<string, Command> {
    return { ...this.commands };
  }
}

// Export a default instance for backward compatibility
export const commandSystem = new CommandSystem();
export const { processCommandInput } = commandSystem;
