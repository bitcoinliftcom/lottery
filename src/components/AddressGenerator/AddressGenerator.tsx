import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { SuiClient } from '@mysten/sui.js/client';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Modal } from '../Modal/Modal';
import { Network } from '../../types/networks';
import './AddressGenerator.scss';
import { BalanceAlert } from '../BalanceAlert/BalanceAlert';

interface AddressGeneratorProps {
  seedPhrase: string[];
  selectedNetworks: Network[];
  toggleNetwork: (network: Network) => void;
  onInit: (generateAddresses: () => void) => void;
}

interface WalletInfo {
  ethAddress?: string;
  suiAddress?: string;
  solAddress?: string;
  privateKey: string;
  balances: {
    ETH?: string;
    ARB?: string;
    SUI?: string;
    SOL?: string;
  };
  index: number;
}

interface PrivateKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  privateKey: string;
  address: string;
}

interface Balance {
  network: string;
  address: string;
  privateKey: string;
  amount: string;
}

const PrivateKeyModal = ({ isOpen, onClose, privateKey, address }: PrivateKeyModalProps) => {
  const [isRevealed, setIsRevealed] = useState(false);
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="private-key-modal">
        <h3>Wallet Details</h3>
        
        <div className="modal-field">
          <label>Address:</label>
          <div className="value-with-copy">
            <div className="value">{address}</div>
            <button 
              className="copy-button"
              onClick={() => copyToClipboard(address)}
              title="Copy address"
            >
              📋
            </button>
          </div>
        </div>

        <div className="modal-field">
          <label>Private Key:</label>
          <div className="value-with-copy">
            <div className="value">
              {isRevealed ? privateKey : '********************************'}
            </div>
            {isRevealed && (
              <button 
                className="copy-button"
                onClick={() => copyToClipboard(privateKey)}
                title="Copy private key"
              >
                📋
              </button>
            )}
          </div>
        </div>
        
        <button 
          className="reveal-button"
          onClick={() => setIsRevealed(!isRevealed)}
        >
          {isRevealed ? 'Hide' : 'Reveal'} Private Key
        </button>
      </div>
    </Modal>
  );
};

export const AddressGenerator = ({ 
  seedPhrase, 
  selectedNetworks, 
  toggleNetwork,
  onInit
}: AddressGeneratorProps) => {
  const [numberOfAddresses, setNumberOfAddresses] = useState<number>(5);
  const [startIndex, setStartIndex] = useState<number>(0);
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<Network>(selectedNetworks[0]);
  const [selectedWallet, setSelectedWallet] = useState<{address: string, privateKey: string} | null>(null);
  const [foundBalances, setFoundBalances] = useState<Balance[]>([]);
  const [showBalanceAlert, setShowBalanceAlert] = useState(false);
  const [autoGenerateEnabled, setAutoGenerateEnabled] = useState(false);

  // Register the generateAddresses function with parent
  useEffect(() => {
    onInit(generateAddresses);
  }, [onInit]);

  // Auto-generate addresses when networks change
  useEffect(() => {
    if (selectedNetworks.length > 0) {
      generateAddresses();
    }
  }, [selectedNetworks]);

  // Update activeTab when selectedNetworks changes
  useEffect(() => {
    if (!selectedNetworks.includes(activeTab) && selectedNetworks.length > 0) {
      setActiveTab(selectedNetworks[0]);
    }
  }, [selectedNetworks, activeTab]);

  // Check URL parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setAutoGenerateEnabled(params.get('a') === 'true');
  }, []);

  // Add Solana connection constant
  const solanaConnection = new Connection('https://api.mainnet-beta.solana.com');

  const getEthBalance = async (address: string) => {
    const provider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  };

  const getArbBalance = async (address: string) => {
    const provider = new ethers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  };

  const getSuiBalance = async (address: string) => {
    try {
      const suiClient = new SuiClient({
        url: 'https://fullnode.mainnet.sui.io:443'
      });
      
      const balance = await suiClient.getAllBalances({
        owner: address,
      });
      
      const suiBalance = balance.find(b => b.coinType === '0x2::sui::SUI');
      return suiBalance ? suiBalance.totalBalance : '0';
    } catch (error) {
      console.error('Error getting SUI balance:', error);
      return '0';
    }
  };

  const getSolanaBalance = async (address: string) => {
    try {
      const publicKey = new PublicKey(address);
      const balance = await solanaConnection.getBalance(publicKey);
      return (balance / 1000000000).toString(); // Convert lamports to SOL
    } catch (error) {
      console.error('Error getting Solana balance:', error);
      return '0';
    }
  };

  const deriveSuiAddress = (mnemonic: string, index: number) => {
    // Create master node
    const masterNode = ethers.HDNodeWallet.fromPhrase(mnemonic);
    
    // Derive the path in steps to avoid the root path error
    const suiPath = [44, 784, 0, 0, index];
    let currentNode = masterNode;
    
    for (const step of suiPath) {
      currentNode = currentNode.deriveChild(step);
    }
    
    // Create SUI keypair from the derived private key
    const privateKeyBytes = Buffer.from(currentNode.privateKey.slice(2), 'hex');
    const keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);
    
    return {
      address: keypair.getPublicKey().toSuiAddress(),
      privateKey: currentNode.privateKey
    };
  };

  const deriveSolanaAddress = (mnemonic: string, index: number) => {
    // Create master node
    const masterNode = ethers.HDNodeWallet.fromPhrase(mnemonic);
    
    // Derive path for Solana (m/44'/501'/0'/0')
    const solPath = [44, 501, 0, 0, index];
    let currentNode = masterNode;
    
    for (const step of solPath) {
      currentNode = currentNode.deriveChild(step);
    }
    
    // Convert private key to Solana keypair
    const privateKeyBytes = Buffer.from(currentNode.privateKey.slice(2), 'hex');
    const keypair = Keypair.fromSeed(privateKeyBytes.slice(0, 32));
    
    return {
      address: keypair.publicKey.toString(),
      privateKey: currentNode.privateKey
    };
  };

  const checkAndShowBalance = (wallet: WalletInfo) => {
    const newBalances: Balance[] = [];
    
    if (wallet.ethAddress && Number(wallet.balances.ETH) > 0) {
      newBalances.push({
        network: 'Ethereum',
        address: wallet.ethAddress,
        privateKey: wallet.privateKey,
        amount: `${wallet.balances.ETH} ETH`
      });
    }
    
    if (wallet.ethAddress && Number(wallet.balances.ARB) > 0) {
      newBalances.push({
        network: 'Arbitrum',
        address: wallet.ethAddress,
        privateKey: wallet.privateKey,
        amount: `${wallet.balances.ARB} ARB`
      });
    }
    
    if (wallet.suiAddress && Number(wallet.balances.SUI) > 0) {
      newBalances.push({
        network: 'SUI',
        address: wallet.suiAddress,
        privateKey: wallet.privateKey,
        amount: `${wallet.balances.SUI} SUI`
      });
    }
    
    if (wallet.solAddress && Number(wallet.balances.SOL) > 0) {
      newBalances.push({
        network: 'Solana',
        address: wallet.solAddress,
        privateKey: wallet.privateKey,
        amount: `${wallet.balances.SOL} SOL`
      });
    }

    if (newBalances.length > 0) {
      setFoundBalances(newBalances);
      setShowBalanceAlert(true);
    }
  };

  // Check if any wallet has balance
  const hasAnyBalance = (wallets: WalletInfo[]): boolean => {
    return wallets.some(wallet => {
      return Object.values(wallet.balances).some(balance => Number(balance) > 0);
    });
  };

  const generateAddresses = async () => {
    setIsLoading(true);
    try {
      const mnemonic = seedPhrase.join(' ');
      const newWallets: WalletInfo[] = [];
      const masterNode = ethers.HDNodeWallet.fromPhrase(mnemonic);
      
      for (let i = startIndex; i < startIndex + numberOfAddresses; i++) {
        const balances: WalletInfo['balances'] = {};
        const wallet: WalletInfo = {
          privateKey: '',
          balances,
          index: i
        };
        
        if (selectedNetworks.includes('ETH')) {
          const derivedNode = masterNode.deriveChild(i);
          const walletWithProvider = derivedNode.connect(new ethers.JsonRpcProvider('https://eth.llamarpc.com'));
          wallet.ethAddress = walletWithProvider.address;
          wallet.privateKey = walletWithProvider.privateKey;
          balances.ETH = await getEthBalance(walletWithProvider.address);
          balances.ARB = await getArbBalance(walletWithProvider.address);
        }
        
        if (selectedNetworks.includes('SUI')) {
          const suiWallet = deriveSuiAddress(mnemonic, i);
          wallet.suiAddress = suiWallet.address;
          if (!wallet.privateKey) wallet.privateKey = suiWallet.privateKey;
          balances.SUI = await getSuiBalance(suiWallet.address);
        }

        if (selectedNetworks.includes('SOL')) {
          const solWallet = deriveSolanaAddress(mnemonic, i);
          wallet.solAddress = solWallet.address;
          if (!wallet.privateKey) wallet.privateKey = solWallet.privateKey;
          balances.SOL = await getSolanaBalance(solWallet.address);
        }
        
        newWallets.push(wallet);
      }
      
      setWallets(newWallets);

      // Check balances and show alert if found
      for (const wallet of newWallets) {
        checkAndShowBalance(wallet);
      }

      // If auto-generate is enabled and no balance found, try next batch
      if (autoGenerateEnabled && !hasAnyBalance(newWallets)) {
        setStartIndex(prev => prev + numberOfAddresses);
        // Add small delay to prevent rate limiting
        setTimeout(() => {
          generateAddresses();
        }, 1000);
      }

    } catch (error) {
      console.error('Error generating addresses:', error);
    }
    setIsLoading(false);
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 5)}...${address.slice(-5)}`;
  };

  const openPrivateKey = (address: string, privateKey: string) => {
    setSelectedWallet({ address, privateKey });
  };

  return (
    <div className="address-generator">
      <div className="controls">
        <div className="control-group">
          <label htmlFor="numberOfAddresses">Number of Addresses (1-50):</label>
          <input
            type="number"
            id="numberOfAddresses"
            min="1"
            max="50"
            value={numberOfAddresses}
            onChange={(e) => setNumberOfAddresses(Math.min(50, Math.max(1, parseInt(e.target.value))))}
          />
        </div>
        
        <div className="control-group">
          <label htmlFor="startIndex">Start Index:</label>
          <input
            type="range"
            id="startIndex"
            min="0"
            max="1000"
            value={startIndex}
            onChange={(e) => setStartIndex(parseInt(e.target.value))}
          />
          <span>{startIndex}</span>
        </div>

        <div className="control-group">
          <label>Select Networks:</label>
          <div className="network-toggles">
            <label>
              <input
                type="checkbox"
                checked={selectedNetworks.includes('ETH')}
                onChange={() => toggleNetwork('ETH')}
              />
              Ethereum
            </label>
            <label>
              <input
                type="checkbox"
                checked={selectedNetworks.includes('SUI')}
                onChange={() => toggleNetwork('SUI')}
              />
              SUI
            </label>
            <label>
              <input
                type="checkbox"
                checked={selectedNetworks.includes('SOL')}
                onChange={() => toggleNetwork('SOL')}
              />
              Solana
            </label>
          </div>
        </div>

        <button 
          className="generate-button"
          onClick={generateAddresses}
          disabled={isLoading || selectedNetworks.length === 0}
        >
          {isLoading ? 'Generating...' : 'Generate Addresses'}
        </button>

        {autoGenerateEnabled && (
          <div className="auto-generate-notice">
            Auto-generating addresses until balance found...
            <button 
              className="stop-button"
              onClick={() => {
                setAutoGenerateEnabled(false);
                const url = new URL(window.location.href);
                url.searchParams.delete('a');
                window.history.replaceState({}, '', url.toString());
              }}
            >
              Stop
            </button>
          </div>
        )}
      </div>

      {wallets.length > 0 && (
        <div className="wallets-tabs">
          <div className="tabs-header">
            {selectedNetworks.map(network => (
              <button
                key={network}
                className={`tab-button ${activeTab === network ? 'active' : ''}`}
                onClick={() => setActiveTab(network)}
              >
                {network}
              </button>
            ))}
          </div>

          <div className="tab-content">
            <table>
              <thead>
                <tr>
                  <th>Address</th>
                  <th>Balance</th>
                  {activeTab === 'ETH' && <th>ARB Balance</th>}
                </tr>
              </thead>
              <tbody>
                {wallets.map((wallet) => {
                  const address = activeTab === 'ETH' ? wallet.ethAddress :
                                activeTab === 'SUI' ? wallet.suiAddress :
                                wallet.solAddress;
                  const balance = wallet.balances[activeTab];
                  const arbBalance = wallet.balances.ARB;

                  return address && (
                    <tr key={`${wallet.index}-${activeTab}`} 
                        className={Number(balance) > 0 || (activeTab === 'ETH' && Number(arbBalance) > 0) ? 'has-balance' : ''}>
                      <td>
                        <a 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault();
                            openPrivateKey(address, wallet.privateKey);
                          }}
                        >
                          {truncateAddress(address)}
                        </a>
                      </td>
                      <td>{balance}</td>
                      {activeTab === 'ETH' && <td>{arbBalance}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PrivateKeyModal
        isOpen={!!selectedWallet}
        onClose={() => setSelectedWallet(null)}
        privateKey={selectedWallet?.privateKey || ''}
        address={selectedWallet?.address || ''}
      />

      <BalanceAlert
        isOpen={showBalanceAlert}
        onClose={() => setShowBalanceAlert(false)}
        balances={foundBalances}
      />
    </div>
  );
}; 