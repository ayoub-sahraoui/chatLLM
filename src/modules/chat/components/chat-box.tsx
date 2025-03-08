import { Input } from "@/components/ui/input";
import { AtSign, SendHorizonal, Sparkle, Upload } from 'lucide-react';
import ModelsList from "./models-list";
import { chatStore } from "../stores/chat-store";
import { observer, useLocalObservable } from "mobx-react-lite";
import CapabilityToggle from "./capability-toggle";
import { useRef } from "react";
import { modelStore } from "../stores/model-store";
import { toast } from "sonner";

const ChatBox = observer(function ChatBox() {
    const localState = useLocalObservable(() => ({
        message: '',
        selectedFiles: [] as File[],
        setMessage(message: string) {
            this.message = message;
        },
        addFile(file: File) {
            this.selectedFiles.push(file);
        },
        clearFiles() {
            this.selectedFiles = [];
        }
    }));

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSendMessage = async () => {
        if (!localState.message.trim() && localState.selectedFiles.length === 0) return;

        try {
            if (localState.selectedFiles.length > 0) {
                // Only proceed if model supports vision
                if (!modelStore.modelHasCapability("vision")) {
                    toast("Model incompatible", {
                        description: "The selected model does not support image analysis. Please select a vision-capable model like llava or llama3.2:11b.",
                    });
                    return;
                }

                // Process images
                const imagePromises = localState.selectedFiles.map(file => {
                    return new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            const base64Data = reader.result as string;
                            // Convert to base64 string without data:image/jpeg;base64, prefix
                            const base64String = base64Data.split(',')[1];
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
                // Send text-only message
                chatStore.sendMessage(localState.message);
            }

            // Reset state
            localState.setMessage('');
            localState.clearFiles();
        } catch (error) {
            console.error("Error sending message with images:", error);
            toast("Error", {
                description: "Failed to send message with images. Please try again.",
            });
        }
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
                description: "The selected model doesn't support image analysis. Please select a vision-capable model first.",
            });
            return;
        }

        // Check file types (only allow images)
        const validFiles = Array.from(files).filter(file =>
            file.type.startsWith('image/')
        );

        if (validFiles.length === 0) {
            toast("Invalid files", {
                description: "Please select image files only (JPEG, PNG, etc.)",
            });
            return;
        }

        // Check file size (max 5MB per file)
        const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
        const oversizedFiles = validFiles.filter(file => file.size > MAX_FILE_SIZE);

        if (oversizedFiles.length > 0) {
            toast("Files too large", {
                description: "Some images exceed the 5MB size limit and were not added",
            });
        }

        // Add valid files to state
        validFiles
            .filter(file => file.size <= MAX_FILE_SIZE)
            .forEach(file => localState.addFile(file));

        // Reset file input for future uploads
        e.target.value = '';

        // Show confirmation toast
        toast("Images ready", {
            description: `${validFiles.length} image(s) added and ready to send`,
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Send message when Enter is pressed
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="flex flex-col gap-2 mb-4 items-center border rounded-lg bg-white p-4 mx-auto w-[600px]">
            {localState.selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 w-full mb-2">
                    {localState.selectedFiles.map((file, index) => (
                        <div key={index} className="relative bg-gray-100 rounded-md p-2">
                            <span className="text-sm">{file.name}</span>
                            <button
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                                onClick={() => {
                                    localState.selectedFiles = localState.selectedFiles.filter((_, i) => i !== index);
                                }}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}
            <div className="flex gap-2 w-full">
                <Input
                    onChange={(e) => localState.setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    value={localState.message}
                    className="border-0 shadow-none outline-none border-none rounded-full"
                    placeholder="Type a message"
                />
                <SendHorizonal onClick={handleSendMessage} className="w-8 h-8 p-1 hover:bg-gray-100 rounded-lg hover:cursor-pointer" />
                <Upload onClick={handleUploadFile} className="w-8 h-8 p-1 hover:bg-gray-100 rounded-lg hover:cursor-pointer" />
                {/* Hidden file input element */}
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                    accept="image/*"
                    multiple
                />
            </div>
            <div className="flex gap-2">
                <CapabilityToggle icon={<Sparkle size={18} />} label="DeepThink" onToggle={(value) => console.log(value)} />
                <CapabilityToggle icon={<AtSign size={18} />} label="Search" onToggle={(value) => console.log(value)} />
                <div className="cursor-pointer flex gap-2 w-full items-center justify-center">
                    <ModelsList />
                </div>
            </div>
        </div>
    )
});

export default ChatBox;