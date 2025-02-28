import './App.css'
import './theme.css'
import { SeedPhraseGenerator } from './components/SeedPhraseGenerator/SeedPhraseGenerator'
import { ThemeProvider } from './context/ThemeContext'
import { ThemeToggle } from './components/ThemeToggle/ThemeToggle'

function App() {
  return (
    <ThemeProvider>
      <div className="app">
        <ThemeToggle />
        <h1>Multi-Chain Wallet Scanner</h1>
        <p className="description">
          Generate seed phrases and scan for balances across Ethereum, SUI, and Solana networks
        </p>
        <SeedPhraseGenerator />
      </div>
    </ThemeProvider>
  )
}

export default App
