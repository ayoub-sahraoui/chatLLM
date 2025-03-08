import UserMessage from './user-message'
import BotMessage from './bot-message'
import { chatStore } from '../stores/chat-store'
import { observer } from 'mobx-react-lite'

const Conversation = observer(function Conversation() {

    if (chatStore.activeConversation === null) {
        return (
            <div className="flex justify-center items-center flex-col gap-2 p-3 h-full overflow-y-auto">
                <h1 className='text-4xl font-bold'>What can I help with?</h1>
                <p className='font-light'>
                    Start new conversation or select existing one
                </p>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-2 p-3 h-full overflow-y-auto">
            {chatStore.activeConversation?.messages.map((message) => {
                if (message.role === 'user') {
                    return <UserMessage key={message.id} message={message} />
                }
                return <BotMessage key={message.id} message={message} />
            })}
        </div>
    )
});

export default Conversation