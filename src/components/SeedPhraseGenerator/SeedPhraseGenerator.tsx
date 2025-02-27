import { useState, useEffect, useRef } from 'react';
import { entropyToMnemonic } from 'bip39';
import { QRCodeSVG } from 'qrcode.react';
import { Modal } from '../Modal/Modal';
import { Network } from '../../types/networks';
import './SeedPhraseGenerator.scss';
import { AddressGenerator } from '../AddressGenerator/AddressGenerator';
import { compressSeedPhrase, decompressSeedPhrase } from '../../utils/seedPhraseCompression';
import { ethers } from 'ethers';

type WordCount = 12 | 18 | 24;

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
}

const QRModal = ({ isOpen, onClose, url }: QRModalProps) => (
  <Modal isOpen={isOpen} onClose={onClose}>
    <div className="qr-modal">
      <h3>Scan QR Code</h3>
      <div className="qr-code">
        <QRCodeSVG 
          value={url}
          size={256}
          level="H"
          includeMargin={true}
        />
      </div>
      <div className="url">{url}</div>
    </div>
  </Modal>
);

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (phrase: string) => void;
}

const ManualEntryModal = ({ isOpen, onClose, onSubmit }: ManualEntryModalProps) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const words = value.trim().split(/\s+/);
    if (![12, 18, 24].includes(words.length)) {
      setError('Please enter 12, 18, or 24 words');
      return;
    }
    
    try {
      // Validate the mnemonic
      ethers.HDNodeWallet.fromPhrase(value.trim());
      onSubmit(value.trim());
      onClose();
      setValue('');
      setError('');
    } catch (err) {
      setError('Invalid seed phrase');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="manual-entry-modal">
        <h3>Enter Seed Phrase</h3>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter 12, 18, or 24 words separated by spaces"
          rows={4}
        />
        {error && <div className="error">{error}</div>}
        <button 
          className="submit-button"
          onClick={handleSubmit}
        >
          Submit
        </button>
      </div>
    </Modal>
  );
};

const isValidNetwork = (network: string): network is Network => {
  return ['ETH', 'SUI', 'SOL'].includes(network);
};

export const SeedPhraseGenerator = () => {
  const [seedPhrase, setSeedPhrase] = useState<string[]>([]);
  const [compressedPhrase, setCompressedPhrase] = useState<string>('');
  const [showQR, setShowQR] = useState(false);
  const [selectedNetworks, setSelectedNetworks] = useState<Network[]>(['ETH']);
  const [wordCount, setWordCount] = useState<WordCount>(12);
  const addressGeneratorRef = useRef<{ generateAddresses: () => void }>({ generateAddresses: () => {} });
  const [showManualEntry, setShowManualEntry] = useState(false);

  // Handle URL path and hash changes
  useEffect(() => {
    const handleUrlChange = () => {
      const pathSegments = window.location.pathname.split('/').filter(Boolean);
      const hash = window.location.hash.slice(1);
      
      // Get networks from path with type checking
      const networks = pathSegments.length > 0 
        ? pathSegments[0].split('+').filter(isValidNetwork)
        : ['ETH'] as Network[];
      
      if (hash) {
        try {
          const decompressed = decompressSeedPhrase(hash);
          setSeedPhrase(decompressed);
          setCompressedPhrase(hash);
        } catch (error) {
          console.error('Invalid hash in URL:', error);
        }
      }
      
      // Update selected networks
      if (networks.length > 0) {
        setSelectedNetworks(networks);
      }
    };

    // Check URL on initial load
    handleUrlChange();

    // Listen for hash and history changes
    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  const updateUrl = (compressed: string, networks: Network[]) => {
    const networkPath = networks.join('+');
    const newUrl = `/${networkPath}#${compressed}`;
    window.history.pushState(null, '', newUrl);
  };

  // Add callback ref to store the generateAddresses function
  const setAddressGeneratorRef = (generateAddresses: () => void) => {
    addressGeneratorRef.current = { generateAddresses };
  };

  const generateSeedPhrase = () => {
    const entropyBytes = wordCount * 4/3;
    const entropy = new Uint8Array(entropyBytes);
    crypto.getRandomValues(entropy);
    
    const entropyHex = Array.from(entropy)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    const mnemonic = entropyToMnemonic(entropyHex);
    const words = mnemonic.split(' ');
    
    const compressed = compressSeedPhrase(words);
    updateUrl(compressed, selectedNetworks);
    
    setSeedPhrase(words);
    setCompressedPhrase(compressed);

    // Trigger address generation after a short delay to allow state updates
    setTimeout(() => {
      addressGeneratorRef.current?.generateAddresses();
    }, 100);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getShareableUrl = () => {
    const networkPath = selectedNetworks.join('+');
    return `${window.location.origin}/${networkPath}#${compressedPhrase}`;
  };

  const copyShareableLink = () => {
    navigator.clipboard.writeText(getShareableUrl());
  };

  const toggleNetwork = (network: Network) => {
    setSelectedNetworks(prev => {
      const newNetworks = prev.includes(network) 
        ? prev.filter(n => n !== network)
        : [...prev, network];
      
      // Update URL when networks change
      updateUrl(compressedPhrase, newNetworks);
      
      return newNetworks;
    });
  };

  const handleManualEntry = (phrase: string) => {
    const words = phrase.split(/\s+/);
    setSeedPhrase(words);
    setWordCount(words.length as WordCount);
    const compressed = compressSeedPhrase(words);
    updateUrl(compressed, selectedNetworks);
    setCompressedPhrase(compressed);
    
    // Trigger address generation
    setTimeout(() => {
      addressGeneratorRef.current?.generateAddresses();
    }, 100);
  };

  return (
    <div className="seed-phrase-generator">
      <div className="controls">
        <div className="word-count-selector">
          <label>Seed Phrase Length:</label>
          <div className="word-count-options">
            {[12, 18, 24].map((count) => (
              <button
                key={count}
                className={`word-count-button ${wordCount === count ? 'active' : ''}`}
                onClick={() => setWordCount(count as WordCount)}
              >
                {count} words
              </button>
            ))}
          </div>
        </div>
        
        <div className="button-group">
          <button 
            className="generate-button"
            onClick={generateSeedPhrase}
          >
            Generate New Seed Phrase
          </button>
          <button 
            className="manual-entry-button"
            onClick={() => setShowManualEntry(true)}
          >
            Enter Manually
          </button>
        </div>
      </div>

      {seedPhrase.length > 0 && (
        <>
          <div className="seed-phrase">
            {seedPhrase.map((word, index) => (
              <div key={index} className="word-container">
                <div className="word-number">{index + 1}.</div>
                <div className="word">{word}</div>
              </div>
            ))}
          </div>
          
          <div className="actions-row">
            <div className="compressed-section">
              <div className="label-row">
                <label>Compressed Format</label>
                <div className="share-actions">
                  <button 
                    className="share-button"
                    onClick={() => setShowQR(true)}
                    title="Show QR Code"
                  >
                    🔲
                  </button>
                  <button 
                    className="share-button"
                    onClick={copyShareableLink}
                    title="Copy Link"
                  >
                    📋
                  </button>
                </div>
              </div>
              <div className="value-with-copy">
                <div className="value">{compressedPhrase}</div>
                <button 
                  className="copy-button"
                  onClick={() => copyToClipboard(compressedPhrase)}
                  title="Copy compressed phrase"
                >
                  📋
                </button>
              </div>
            </div>

            <button 
              className="copy-button copy-phrase-button"
              onClick={() => copyToClipboard(seedPhrase.join(' '))}
            >
              Copy Seed Phrase
            </button>
          </div>

          <AddressGenerator 
            seedPhrase={seedPhrase} 
            selectedNetworks={selectedNetworks}
            toggleNetwork={toggleNetwork}
            onInit={setAddressGeneratorRef}
          />
        </>
      )}

      <QRModal
        isOpen={showQR}
        onClose={() => setShowQR(false)}
        url={getShareableUrl()}
      />

      <ManualEntryModal
        isOpen={showManualEntry}
        onClose={() => setShowManualEntry(false)}
        onSubmit={handleManualEntry}
      />
    </div>
  );
}; 