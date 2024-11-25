import {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
} from "react"
import {
  BrowserRESTClient,
  WebSocketClient,
  WebSocketChannelName,
  WebSocketEvent,
} from "@coinbase/sdk"

interface CoinbaseContextType {
  restClient: BrowserRESTClient
  wsClient: WebSocketClient | null
}

const restClient = new BrowserRESTClient()
const CoinbaseContext = createContext<CoinbaseContextType | undefined>(
  undefined
)

export function CoinbaseProvider({ children }: { children: ReactNode }) {
  const [wsClient, setWsClient] = useState<WebSocketClient | null>(null)

  useEffect(() => {
    const ws = new WebSocketClient(restClient)
    ws.on(WebSocketEvent.ON_OPEN, () => {
      console.log("WebSocket connected, subscribing to heartbeats")
      ws.subscribe({
        channel: WebSocketChannelName.HEARTBEAT,
      })
    })
    ws.connect()
    setWsClient(ws)

    return () => {
      ws.disconnect("Component unmounting")
    }
  }, [])

  return (
    <CoinbaseContext.Provider value={{ restClient, wsClient }}>
      {children}
    </CoinbaseContext.Provider>
  )
}

export function useCoinbase() {
  const context = useContext(CoinbaseContext)
  if (context === undefined) {
    throw new Error("useCoinbase must be used within a CoinbaseProvider")
  }
  return context
}
