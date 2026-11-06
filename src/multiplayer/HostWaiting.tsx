import { useEffect, useState } from 'react'
import type { WaitingMessages } from './waiting-messages.ts'

export default function HostWaiting({ messages }: { messages: WaitingMessages }) {
  const [message, setMessage] = useState(() => messages.current())
  useEffect(() => {
    const timer = setInterval(() => setMessage(messages.next()), 8000)
    return () => clearInterval(timer)
  }, [messages])
  return <section aria-label="Host configuration waiting screen">
    <h2 aria-live="polite">Host is configuring the match</h2>
    <p>Waiting for the host to finish adjusting the rules.</p>
    <p aria-live="off">{message}</p>
  </section>
}
