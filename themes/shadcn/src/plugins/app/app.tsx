import { Toaster } from '../../components/ui/sonner'
import { Page } from './components/page'
import { AvatarContext } from './context/avatar-context'
import 'tona-sonner/dist/index.css'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAvatar } from './hooks/use-avatar'

function PageWrapper() {
  const avatar = useAvatar()

  return (
    <TooltipProvider>
      <AvatarContext.Provider value={avatar}>
        <Page />
      </AvatarContext.Provider>
    </TooltipProvider>
  )
}

export function App() {
  return (
    <>
      <PageWrapper />
      <Toaster />
    </>
  )
}
