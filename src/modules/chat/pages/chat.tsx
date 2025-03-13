import { Menu, MessageCircle, Search, Settings } from "lucide-react";
import ChatBox from "../components/chat-box";
import Conversation from "../components/conversation";
import ConversationsList from "../components/conversations-list";
import { useLocalObservable, observer } from "mobx-react-lite";
import clsx from "clsx";
import { chatStore } from "../stores/chat-store";
import { modelStore } from "../stores/model-store";
import SearchModal from "../components/search-modal";
import ThemeToggle from "../../../components/theme-toggle";
import AppLogo from "../../../assets/chatllm-icon.svg";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import GeneralSettings from "@/modules/settings/pages/general-settings";

const Chat = observer(function Chat() {
  const localState = useLocalObservable(() => ({
    sidebarOpen: true,
    searchQuery: "",
    filteredConversations: [],
    toggleSidebar() {
      this.sidebarOpen = !this.sidebarOpen;
    },
  }));
  const handleCreateConversation = () => {
    if (modelStore.selectedModel === null) {
      return;
    }
    chatStore.createNewConversation();
  };
  const handleSearchConversation = () => {};
  const handleToggleSidebar = () => {
    localState.toggleSidebar();
  };

  return (
    <div className="flex h-full w-full gap-4 dark:bg-gray-900">
      {/* Sidebar */}
      <div
        className={clsx(
          "m-3 gap-2 flex flex-col transition-all duration-300 overflow-hidden dark:text-gray-100",
          localState.sidebarOpen ? "w-[300px]" : "w-[0px]"
        )}
      >
        <div className="flex justify-between">
          <div className="flex gap-1 items-center">
            <Menu
              onClick={handleToggleSidebar}
              className="fixed top-3 left-3 w-8 h-8 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg hover:cursor-pointer"
            />
          </div>
          <div className="flex gap-2">
            <SearchModal>
              <Search
                onClick={handleSearchConversation}
                className="w-8 h-8 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg hover:cursor-pointer"
              />
            </SearchModal>
            <MessageCircle
              onClick={handleCreateConversation}
              className="w-8 h-8 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg hover:cursor-pointer"
            />
          </div>
        </div>
        <h1>Conversations</h1>
        <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1">
          <ConversationsList />
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex justify-between items-center p-2">
          <div className="flex gap-2 items-center">
            <img src={AppLogo} className="w-8 h-8" alt="" />
            <span className="font-bold dark:text-gray-100">ChatLLM</span>
          </div>
          <div className="flex gap-2 items-center">
            <ThemeToggle />
            <Dialog>
              <DialogTrigger>
                <Settings className="w-8 h-8 p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg hover:cursor-pointer" />
              </DialogTrigger>
              <DialogContent>
                <DialogTitle>Settings</DialogTitle>
                <GeneralSettings />
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <Conversation />
        <ChatBox />
      </div>
    </div>
  );
});

export default Chat;
