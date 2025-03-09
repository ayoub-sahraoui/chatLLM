import { Copy, Loader2, Pause, Play } from 'lucide-react'
import { Message } from '../types';
import { observer, useLocalObservable } from 'mobx-react-lite';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import { useEffect, useRef } from 'react';

interface BotMessageProps {
    message: Message;
}

const BotMessage = observer(function BotMessage({ message }: BotMessageProps) {
    const localState = useLocalObservable(() => ({
        speaking: false,
        toggleSpeech() {
            this.speaking = !this.speaking;
        }
    }));

    // Reference to scroll to the end when new content arrives
    const messageEndRef = useRef<HTMLDivElement>(null);

    // Scroll to end when content updates during streaming
    useEffect(() => {
        if (message.isResponding && messageEndRef.current) {
            messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
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
    const safeContent = message.content ? message.content.toString() : '';

    return (
        <div className="p-4 rounded-lg max-w-[100%] relative markdown-content">


            <div className="prose prose-sm max-w-none dark:prose-invert">
                {safeContent ? (
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                    >
                        {safeContent}
                    </ReactMarkdown>
                ) : (
                    message.isResponding &&
                    <div className="flex gap-1 items-center top-1 left-1 p-1">
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        <span>Responding...</span>
                    </div>
                )}
            </div>

            <div className="flex gap-2 mt-2 justify-start opacity-50 hover:opacity-100 transition-opacity">
                <Copy
                    className="w-4 h-4 hover:bg-gray-100 hover:cursor-pointer rounded"
                    onClick={handleCopy}
                />
                {localState.speaking ? (
                    <Pause
                        className="w-4 h-4 hover:bg-gray-100 hover:cursor-pointer rounded"
                        onClick={handleSpeak}
                    />
                ) : (
                    <Play
                        className="w-4 h-4 hover:bg-gray-100 hover:cursor-pointer rounded"
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