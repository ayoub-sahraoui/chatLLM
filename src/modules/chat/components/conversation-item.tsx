import { Edit, EllipsisVertical, Trash } from 'lucide-react'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Conversation } from '../types';
import { chatStore } from '../stores/chat-store';
import clsx from 'clsx';
import { observer, useLocalObservable } from 'mobx-react-lite';

interface ConversationItemProps {
    conversation: Conversation;
}

const ConversationItem = observer(function ConversationItem({ conversation }: ConversationItemProps) {
    const localState = useLocalObservable(() => ({
        isEditing: false,
        toggleEditing: () => localState.isEditing = !localState.isEditing
    }));
    const handleDeleteConversation = () => {
        chatStore.deleteConversation(conversation.id);
    }
    const handleRenameConversation = () => {
        localState.toggleEditing();
    }
    const handleOnConversationSelected = () => {
        chatStore.setActiveConversation(conversation.id);
    }
    return (
        <div onClick={handleOnConversationSelected} className={
            clsx("flex justify-between p-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg hover:cursor-pointer dark:text-gray-100",
                chatStore.activeConversation?.id === conversation.id && "bg-gray-200 dark:bg-gray-700"
            )
        }>
            {
                localState.isEditing ?
                    <input
                        type="text"
                        value={conversation.title}
                        onChange={(e) => conversation.updateTitle(e.target.value)}
                        onBlur={localState.toggleEditing}
                        autoFocus
                        className="bg-transparent dark:text-gray-100 focus:outline-none w-full"
                    />
                    :
                    <span>{conversation.title}</span>
            }
            <Popover>
                <PopoverTrigger>
                    <EllipsisVertical className='w-6 h-6 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg hover:cursor-pointer' />
                </PopoverTrigger>
                <PopoverContent className='max-w-[200px] p-2 dark:bg-gray-800 dark:border-gray-700'>
                    <div className="flex flex-col">
                        <div onClick={handleRenameConversation} className="flex gap-2 items-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md p-2 cursor-pointer dark:text-gray-100">
                            <Edit className="w-4 h-4" />
                            <span>Rename</span>
                        </div>
                        <div onClick={handleDeleteConversation} className="flex gap-2 items-center text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md p-2 cursor-pointer">
                            <Trash className="w-4 h-4" />
                            <span>Delete</span>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
});

export default ConversationItem