import { observer } from 'mobx-react-lite';
import { chatStore } from '../stores/chat-store';
import ConversationItem from './conversation-item';

const ConversationsList = observer(function ConversationsList() {
    return (
        chatStore.conversations.map((conversation) => (
            <ConversationItem key={conversation.id} conversation={conversation} />
        ))
    )
})

export default ConversationsList