import "./App.css"
import { LadderCalculator } from "@/components/LadderCalculator/index"
import { ThemeProvider } from "@/components/theme-provider"
import { CoinbaseProvider } from "@/lib/coinbase-context"

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <CoinbaseProvider>
        <LadderCalculator />
      </CoinbaseProvider>
    </ThemeProvider>
  )
}

export default App
