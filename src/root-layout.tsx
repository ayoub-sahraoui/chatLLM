import { Route, Routes } from 'react-router'
import Chat from './modules/chat/pages/chat'
import { Toaster } from 'sonner'


function RootLayout() {
    return (
        <main className='h-screen w-full max-h-screen flex bg-white'>
            <Routes>
                <Route index path="/" element={<Chat />} />
            </Routes>
            <Toaster />
        </main>
    )
}

export default RootLayout