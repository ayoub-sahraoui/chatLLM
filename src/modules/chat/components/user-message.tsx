import { Message } from "../types";

interface UserMessageProps {
    message: Message;
}

function UserMessage({ message }: UserMessageProps) {
    return (
        <div className="bg-gray-100 p-2 rounded-lg max-w-[80%] self-end">
            {message.content}
        </div>
    )
}

export default UserMessage