import { Message } from "../types";

interface UserMessageProps {
    message: Message;
}

function UserMessage({ message }: UserMessageProps) {
    return (
        <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg max-w-[80%] self-end dark:text-gray-100">
            {message.content}
        </div>
    )
}

export default UserMessage