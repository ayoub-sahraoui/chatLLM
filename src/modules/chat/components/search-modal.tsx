import { observer, useLocalObservable } from "mobx-react-lite";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Conversation } from "../types";
import { chatStore } from "../stores/chat-store";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface ConversationsSearchModalProps {
    children: React.ReactNode;
}

const SearchModal = observer(function SearchModal({ children }: ConversationsSearchModalProps) {
    // Replace multiple useState calls with a single local observable store
    const localState = useLocalObservable(() => ({
        open: false,
        searchQuery: "",
        searchResults: [] as Conversation[],

        setOpen(value: boolean) {
            this.open = value;
            if (!value) {
                this.searchQuery = "";
            }
        },

        setSearchQuery(query: string) {
            this.searchQuery = query;
            this.updateSearchResults();
        },

        updateSearchResults() {
            if (!this.searchQuery.trim()) {
                this.searchResults = [];
                return;
            }

            this.searchResults = chatStore.conversations.filter(
                (conversation) =>
                    conversation.title.toLowerCase().includes(this.searchQuery.toLowerCase())
            );
        },

        selectConversation(conversationId: string) {
            chatStore.setActiveConversation(conversationId);
            this.setOpen(false);
        }
    }));

    return (
        <Dialog open={localState.open} onOpenChange={(open) => localState.setOpen(open)}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Search size={18} />
                        Search Conversations
                    </DialogTitle>
                </DialogHeader>

                <Input
                    placeholder="Search by conversation title..."
                    value={localState.searchQuery}
                    onChange={(e) => localState.setSearchQuery(e.target.value)}
                    autoFocus
                    className="mb-4"
                />

                <div className="max-h-72 overflow-y-auto">
                    {localState.searchResults.length > 0 ? (
                        <div className="space-y-2">
                            {localState.searchResults.map((conversation) => (
                                <Button
                                    key={conversation.id}
                                    variant="outline"
                                    className="w-full justify-start text-left h-auto py-3"
                                    onClick={() => localState.selectConversation(conversation.id)}
                                >
                                    <div>
                                        <p className="font-medium">{conversation.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(conversation.updatedAt).toLocaleString()}
                                        </p>
                                    </div>
                                </Button>
                            ))}
                        </div>
                    ) : localState.searchQuery ? (
                        <p className="text-center text-muted-foreground py-4">
                            No conversations found
                        </p>
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    );
});

export default SearchModal;