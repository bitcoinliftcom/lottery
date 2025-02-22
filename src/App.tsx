import './App.css'
import { SeedPhraseGenerator } from './components/SeedPhraseGenerator/SeedPhraseGenerator'

function App() {
  return (
    <div className="app">
      <h1>Multi-Chain Wallet Scanner</h1>
      <p className="description">
        Generate seed phrases and scan for balances across Ethereum and SUI networks
      </p>
      <SeedPhraseGenerator />
    </div>
  )
}

export default App
