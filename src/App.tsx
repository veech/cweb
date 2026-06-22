import { Composer } from './components/Composer.tsx'
import { StatusBar } from './components/StatusBar.tsx'
import { Thread } from './components/Thread.tsx'
import { useThreadController } from './lib/use-thread-controller.ts'

export function App() {
  const thread = useThreadController()

  return (
    <div className="grid h-full grid-rows-[auto_1fr_auto] bg-background text-foreground">
      <StatusBar cwd={thread.session.cwd} model={thread.session.model} permissionMode={thread.session.permissionMode} sessionId={thread.session.sessionId} status={thread.status} onReset={thread.reset} />
      <Thread
        scrollRef={thread.scrollRef}
        onScroll={thread.handleScroll}
        messages={thread.messages}
        toolResults={thread.toolResults}
        live={thread.live}
        status={thread.status}
        lastResult={thread.lastResult}
        error={thread.error}
      />
      <Composer busy={thread.busy} onSend={thread.send} onStop={thread.stop} />
    </div>
  )
}
