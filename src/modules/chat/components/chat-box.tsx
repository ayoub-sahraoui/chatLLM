import { Input } from "@/components/ui/input";
import { AtSign, SendHorizonal, StopCircle, Upload } from "lucide-react";
import ModelsList from "./models-list";
import { chatStore } from "../stores/chat-store";
import { observer, useLocalObservable } from "mobx-react-lite";
import CapabilityToggle from "./capability-toggle";
import { useEffect, useRef, useState } from "react";
import { modelStore } from "../stores/model-store";
import { toast } from "sonner";
import { commandSystem } from "../commands/command-system";

const ChatBox = observer(function ChatBox() {
  const localState = useLocalObservable(() => ({
    message: "",
    selectedFiles: [] as File[],
    loading: false,
    error: "",
    setMessage(message: string) {
      this.message = message;
    },
    addFile(file: File) {
      this.selectedFiles.push(file);
    },
    clearFiles() {
      this.selectedFiles = [];
    },
    setLoading(loading: boolean) {
      this.loading = loading;
    },
    setError(error: string) {
      this.error = error;
    },
    clearError() {
      this.error = "";
    },
  }));

  // Command autocomplete state
  const [showCommands, setShowCommands] = useState(false);
  const [filteredCommands, setFilteredCommands] = useState<
    Array<{ name: string; description: string }>
  >([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const commandsRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Effect to close command popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        commandsRef.current &&
        !commandsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowCommands(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle input changes for command autocomplete
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    localState.setMessage(value);

    // Check if we should show command suggestions
    if (value.startsWith("/")) {
      const commandPrefix = value.slice(1).split(" ")[0].toLowerCase();

      // Get all available commands from command system
      const allCommands = commandSystem.getAllCommands();

      // Filter commands based on what user has typed
      const filtered = Object.entries(allCommands)
        .filter(([name]) => name.startsWith(commandPrefix))
        .map(([name, cmd]) => ({ name, description: cmd.description }));

      setFilteredCommands(filtered);
      setShowCommands(filtered.length > 0);
    } else {
      setShowCommands(false);
    }
  };

  // Handle command selection
  const selectCommand = (commandName: string) => {
    // Replace the command portion of the input with the selected command
    const currentMessage = localState.message;
    const parts = currentMessage.split(" ");
    parts[0] = `/${commandName}`;

    const newMessage = parts.join(" ");
    localState.setMessage(newMessage);

    setShowCommands(false);

    // Focus the input and place cursor at the end
    if (inputRef.current) {
      inputRef.current.focus();
      // Set timeout to ensure this happens after state update
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.selectionStart = inputRef.current.value.length;
          inputRef.current.selectionEnd = inputRef.current.value.length;
        }
      }, 0);
    }
  };

  const validateBeforeSend = (): boolean => {
    // Check if there is a selected model
    if (!modelStore.selectedModel) {
      localState.setError("No model selected. Please select a model first.");
      toast.error("No model selected", {
        description: "Please select a model before sending a message",
      });
      return false;
    }

    // Reset error if everything is fine
    localState.clearError();
    return true;
  };

  const handleSendMessage = async () => {
    if (!localState.message.trim() && localState.selectedFiles.length === 0)
      return;

    // If we're already loading/generating, cancel the current request
    if (localState.loading) {
      chatStore.cancelCurrentMessage();
      localState.setLoading(false);
      return;
    }

    // Validate before sending
    if (!validateBeforeSend()) {
      return;
    }

    try {
      localState.setLoading(true);

      if (localState.selectedFiles.length > 0) {
        // Only proceed if model supports vision
        if (!modelStore.modelHasCapability("vision")) {
          toast.error("Model incompatible", {
            description:
              "The selected model does not support image analysis. Please select a vision-capable model like llava or llama3.2:11b.",
          });
          return;
        }

        // Process images
        const imagePromises = localState.selectedFiles.map((file) => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const base64Data = reader.result as string;
              // Convert to base64 string without data:image/jpeg;base64, prefix
              const base64String = base64Data.split(",")[1];
              resolve(base64String);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        });

        const base64Images = await Promise.all(imagePromises);

        // Send message with images
        chatStore.sendMessageWithImages(localState.message, base64Images);
      } else {
        // Check if message starts with / (command)
        if (localState.message.startsWith("/")) {
          // Use processInput for command processing
          await chatStore.sendSingleMessage(localState.message);
        } else {
          // Send regular message
          await chatStore.sendMessage(localState.message);
        }
      }

      // Reset state
      localState.setMessage("");
      localState.clearFiles();
    } catch (error) {
      console.error("Error sending message with images:", error);

      // Set specific error messages based on the error type
      if (error instanceof Error) {
        localState.setError(error.message);
        toast.error("Error", {
          description: error.message,
        });
      } else {
        localState.setError("An unknown error occurred");
        toast.error("Error", {
          description: "Failed to send message. Please try again.",
        });
      }
    } finally {
      localState.setLoading(false);
    }
  };

  // Function to handle stopping/canceling message generation
  const handleStopGeneration = () => {
    chatStore.cancelCurrentMessage();
    localState.setLoading(false);
  };

  const handleUploadFile = () => {
    // Trigger file input click
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check if model supports vision
    if (!modelStore.modelHasCapability("vision")) {
      toast("Vision not supported", {
        description:
          "The selected model doesn't support image analysis. Please select a vision-capable model first.",
      });
      return;
    }

    // Check file types (only allow images)
    const validFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/")
    );

    if (validFiles.length === 0) {
      toast("Invalid files", {
        description: "Please select image files only (JPEG, PNG, etc.)",
      });
      return;
    }

    // Check file size (max 5MB per file)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = validFiles.filter(
      (file) => file.size > MAX_FILE_SIZE
    );

    if (oversizedFiles.length > 0) {
      toast("Files too large", {
        description: "Some images exceed the 5MB size limit and were not added",
      });
    }

    // Add valid files to state
    validFiles
      .filter((file) => file.size <= MAX_FILE_SIZE)
      .forEach((file) => localState.addFile(file));

    // Reset file input for future uploads
    e.target.value = "";

    // Show confirmation toast
    toast("Images ready", {
      description: `${validFiles.length} image(s) added and ready to send`,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle command navigation with arrow keys
    if (showCommands && filteredCommands.length > 0) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault(); // Prevent cursor movement in input

        // Navigate through commands is handled by the div's event listeners
        const commandElements =
          commandsRef.current?.querySelectorAll("[data-command]");
        if (commandElements?.length) {
          const firstCommand = commandElements[0] as HTMLDivElement;
          firstCommand.focus();
        }
        return;
      }

      if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        if (filteredCommands.length > 0) {
          // Select the first command in the list
          selectCommand(filteredCommands[0].name);
        }
        return;
      }

      if (e.key === "Escape") {
        setShowCommands(false);
        return;
      }
    }

    // Send message when Enter is pressed (if not navigating commands)
    if (e.key === "Enter" && !showCommands) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Effect to check model availability on component mount
  useEffect(() => {
    // Check if there's a model selected
    if (modelStore.models.length === 0) {
      localState.setError(
        "No models available. Please check your provider settings."
      );
    } else if (!modelStore.selectedModel) {
      localState.setError(
        "No model selected. Please select a model to continue."
      );
    } else {
      localState.clearError();
    }
  }, [modelStore.models.length, modelStore.selectedModel]);

  return (
    <div className="flex flex-col gap-2 mb-4 items-center border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 p-4 mx-auto w-[600px]">
      {localState.error && (
        <div className="w-full p-2 mb-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-600 dark:text-red-400 text-sm">
          {localState.error}
        </div>
      )}
      {localState.selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 w-full mb-2">
          {localState.selectedFiles.map((file, index) => (
            <div
              key={index}
              className="relative bg-gray-100 dark:bg-gray-700 rounded-md p-2"
            >
              <span className="text-sm dark:text-gray-200">{file.name}</span>
              <button
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                onClick={() => {
                  localState.selectedFiles = localState.selectedFiles.filter(
                    (_, i) => i !== index
                  );
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 w-full relative">
        <Input
          ref={inputRef}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          value={localState.message}
          className="border-0 shadow-none outline-none border-none rounded-full dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
          placeholder={
            modelStore.selectedModel
              ? "Type a message or / for commands"
              : "Select a model to start chatting..."
          }
          disabled={localState.loading || !modelStore.selectedModel}
        />
        <button
          onClick={
            localState.loading ? handleStopGeneration : handleSendMessage
          }
          className={`w-8 h-8 p-1 rounded-lg ${
            !modelStore.selectedModel && !localState.loading
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-gray-100 dark:hover:bg-gray-700 hover:cursor-pointer"
          }`}
          title={
            !modelStore.selectedModel
              ? "Please select a model"
              : localState.loading
              ? "Stop generation"
              : "Send message"
          }
          disabled={!modelStore.selectedModel && !localState.loading}
        >
          {localState.loading ? (
            <StopCircle className="w-6 h-6 opacity-50 dark:text-gray-300" />
          ) : (
            <SendHorizonal className="w-6 h-6 dark:text-gray-300" />
          )}
        </button>
        <Upload
          onClick={
            !modelStore.selectedModel || localState.loading
              ? undefined
              : handleUploadFile
          }
          className={`w-8 h-8 p-1 rounded-lg ${
            !modelStore.selectedModel || localState.loading
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-gray-100 dark:hover:bg-gray-700 hover:cursor-pointer"
          } dark:text-gray-300`}
        />
        {/* Hidden file input element */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileChange}
          accept="image/*"
          multiple
        />

        {/* Command autocomplete dropdown */}
        {showCommands && (
          <div
            ref={commandsRef}
            className="absolute bottom-full left-0 mb-1 w-full max-h-[200px] overflow-y-auto bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700"
          >
            {filteredCommands.map((cmd, index) => (
              <div
                key={cmd.name}
                data-command={cmd.name}
                tabIndex={0}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex justify-between dark:text-gray-100"
                onClick={() => selectCommand(cmd.name)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    selectCommand(cmd.name);
                  }
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    const next = commandsRef.current?.querySelector(
                      `[data-command]:nth-child(${index + 2})`
                    ) as HTMLDivElement;
                    next?.focus();
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    const prev = commandsRef.current?.querySelector(
                      `[data-command]:nth-child(${index})`
                    ) as HTMLDivElement;
                    if (prev) {
                      prev?.focus();
                    } else {
                      inputRef.current?.focus();
                    }
                  }
                }}
              >
                <span className="font-medium">/{cmd.name}</span>
                <span className="text-gray-500 dark:text-gray-400 text-sm">
                  {cmd.description}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <CapabilityToggle
          icon={<AtSign size={18} />}
          label="Search"
          onToggle={(value) => console.log(value)}
        />
        <div className="cursor-pointer flex gap-2 w-full items-center justify-center">
          <ModelsList />
        </div>
      </div>
    </div>
  );
});

export default ChatBox;
