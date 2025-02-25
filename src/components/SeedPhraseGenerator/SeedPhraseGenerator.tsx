import { useState, useEffect } from 'react';
import { entropyToMnemonic } from 'bip39';
import { QRCodeSVG } from 'qrcode.react';
import { Modal } from '../Modal/Modal';
import './SeedPhraseGenerator.scss';
import { AddressGenerator } from '../AddressGenerator/AddressGenerator';
import { compressSeedPhrase, decompressSeedPhrase } from '../../utils/seedPhraseCompression';

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

export const SeedPhraseGenerator = () => {
  const [seedPhrase, setSeedPhrase] = useState<string[]>([]);
  const [compressedPhrase, setCompressedPhrase] = useState<string>('');
  const [showQR, setShowQR] = useState(false);

  // Handle URL hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1); // Remove the # symbol
      if (hash) {
        try {
          const decompressed = decompressSeedPhrase(hash);
          setSeedPhrase(decompressed);
          setCompressedPhrase(hash);
        } catch (error) {
          console.error('Invalid hash in URL:', error);
        }
      }
    };

    // Check hash on initial load
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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
    const words = mnemonic.split(' ');
    
    const compressed = compressSeedPhrase(words);
    
    // Update URL hash without triggering a page reload
    window.history.pushState(null, '', `#${compressed}`);
    
    setSeedPhrase(words);
    setCompressedPhrase(compressed);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getShareableUrl = () => {
    return `${window.location.origin}${window.location.pathname}#${compressedPhrase}`;
  };

  const copyShareableLink = () => {
    navigator.clipboard.writeText(getShareableUrl());
  };

  return (
    <div className="seed-phrase-generator">
      <button 
        className="generate-button"
        onClick={generateSeedPhrase}
      >
        Generate New Seed Phrase
      </button>

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

          <AddressGenerator seedPhrase={seedPhrase} />
        </>
      )}

      <QRModal
        isOpen={showQR}
        onClose={() => setShowQR(false)}
        url={getShareableUrl()}
      />
    </div>
  );
}; 