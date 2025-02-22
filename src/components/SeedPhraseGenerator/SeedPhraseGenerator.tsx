import { useState } from 'react';
import { entropyToMnemonic } from 'bip39';
import './SeedPhraseGenerator.scss';
import { AddressGenerator } from '../AddressGenerator/AddressGenerator';

export const SeedPhraseGenerator = () => {
  const [seedPhrase, setSeedPhrase] = useState<string[]>([]);

  const generateSeedPhrase = () => {
    // Generate 16 bytes (128 bits) of random values
    const entropy = new Uint8Array(16);
    crypto.getRandomValues(entropy);
    
    // Convert entropy to hex string
    const entropyHex = Array.from(entropy)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Generate mnemonic from entropy
    const mnemonic = entropyToMnemonic(entropyHex);
    setSeedPhrase(mnemonic.split(' '));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(seedPhrase.join(' '));
  };

  return (
    <div className="seed-phrase-generator">
      <button 
        className="generate-button"
        onClick={generateSeedPhrase}
      >
        Generate Seed Phrase
      </button>

      {seedPhrase.length > 0 && (
        <>
          <div className="seed-phrase-grid">
            {seedPhrase.map((word, index) => (
              <div key={index} className="word-cell">
                <span className="word-number">{index + 1}.</span>
                <span className="word">{word}</span>
              </div>
            ))}
          </div>
          
          <button 
            className="copy-button"
            onClick={copyToClipboard}
          >
            Copy Seed Phrase
          </button>

          <AddressGenerator seedPhrase={seedPhrase} />
        </>
      )}
    </div>
  );
}; 