import { Copy, Loader2, Pause, Play } from "lucide-react";
import { Message } from "../types";
import { observer, useLocalObservable } from "mobx-react-lite";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";
import { useEffect, useRef } from "react";

interface BotMessageProps {
  message: Message;
}

// Helper function to process content with think tags
const processThinkContent = (content: string) => {
  if (!content) return { thinking: null, mainContent: "" };

  const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);

  if (thinkMatch) {
    const thinking = thinkMatch[1].trim();
    const mainContent = content.replace(/<think>[\s\S]*?<\/think>/, "").trim();
    return { thinking, mainContent };
  }

  return { thinking: null, mainContent: content };
};

const BotMessage = observer(function BotMessage({ message }: BotMessageProps) {
  const localState = useLocalObservable(() => ({
    speaking: false,
    toggleSpeech() {
      this.speaking = !this.speaking;
    },
  }));

  // Reference to scroll to the end when new content arrives
  const messageEndRef = useRef<HTMLDivElement>(null);

  // Scroll to end when content updates during streaming
  useEffect(() => {
    if (message.isResponding && messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [message.content, message.isResponding]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
  };

  const handleSpeak = () => {
    if (localState.speaking) {
      // Stop speech if currently speaking
      window.speechSynthesis.cancel();
      localState.toggleSpeech();
    } else {
      // Start speech if not speaking
      const utterance = new SpeechSynthesisUtterance(message.content);

      utterance.onend = () => {
        localState.speaking = false;
      };

      window.speechSynthesis.speak(utterance);
      localState.toggleSpeech();
    }
  };

  // Cleanup speech when component unmounts
  useEffect(() => {
    return () => {
      if (localState.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Ensure content is a valid string for ReactMarkdown
  const safeContent = message.content ? message.content.toString() : "";

  // Process content to separate thinking from main content
  const { thinking, mainContent } = processThinkContent(safeContent);

  return (
    <div className="p-4 rounded-lg max-w-[100%] relative markdown-content dark:text-gray-100">
      <div className="prose prose-sm max-w-none dark:prose-invert">
        {thinking && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/30 rounded-md border border-amber-200 dark:border-amber-700">
            <div className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1">
              Thinking...
            </div>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {thinking}
            </ReactMarkdown>
          </div>
        )}

        {mainContent ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
          >
            {mainContent}
          </ReactMarkdown>
        ) : (
          message.isResponding && (
            <div className="flex gap-1 items-center top-1 left-1 p-1">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400 dark:text-gray-500" />
              <span>Responding...</span>
            </div>
          )
        )}
      </div>

      <div className="flex gap-2 mt-2 justify-start opacity-50 hover:opacity-100 transition-opacity">
        <Copy
          className="w-4 h-4 hover:bg-gray-100 dark:hover:bg-gray-700 hover:cursor-pointer rounded"
          onClick={handleCopy}
        />
        {localState.speaking ? (
          <Pause
            className="w-4 h-4 hover:bg-gray-100 dark:hover:bg-gray-700 hover:cursor-pointer rounded"
            onClick={handleSpeak}
          />
        ) : (
          <Play
            className="w-4 h-4 hover:bg-gray-100 dark:hover:bg-gray-700 hover:cursor-pointer rounded"
            onClick={handleSpeak}
          />
        )}
      </div>

      {/* Invisible element for auto-scrolling */}
      <div ref={messageEndRef} />
    </div>
  );
});

export default BotMessage;
