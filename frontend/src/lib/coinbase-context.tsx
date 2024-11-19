import { BrowserRESTClient } from "@coinbase/sdk"
import { createContext, useContext, ReactNode } from "react"

const client = new BrowserRESTClient()

const CoinbaseContext = createContext<BrowserRESTClient | undefined>(undefined)

export function CoinbaseProvider({ children }: { children: ReactNode }) {
  return (
    <CoinbaseContext.Provider value={client}>
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
