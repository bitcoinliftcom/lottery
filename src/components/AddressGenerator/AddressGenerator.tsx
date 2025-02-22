import { useState } from 'react';
import { ethers } from 'ethers';
import { SuiClient } from '@mysten/sui.js/client';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import './AddressGenerator.scss';

interface AddressGeneratorProps {
  seedPhrase: string[];
}

interface WalletInfo {
  ethAddress?: string;
  suiAddress?: string;
  privateKey: string;
  balances: {
    ETH?: string;
    SUI?: string;
  };
  index: number;
}

type Network = 'ETH' | 'SUI';

export const AddressGenerator = ({ seedPhrase }: AddressGeneratorProps) => {
  const [numberOfAddresses, setNumberOfAddresses] = useState<number>(5);
  const [startIndex, setStartIndex] = useState<number>(0);
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedNetworks, setSelectedNetworks] = useState<Network[]>(['ETH']);

  const getEthBalance = async (address: string) => {
    const provider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');
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
        }
        
        if (selectedNetworks.includes('SUI')) {
          const suiWallet = deriveSuiAddress(mnemonic, i);
          wallet.suiAddress = suiWallet.address;
          if (!wallet.privateKey) wallet.privateKey = suiWallet.privateKey;
          balances.SUI = await getSuiBalance(suiWallet.address);
        }
        
        newWallets.push(wallet);
      }
      
      setWallets(newWallets);
    } catch (error) {
      console.error('Error generating addresses:', error);
    }
    setIsLoading(false);
  };

  const toggleNetwork = (network: Network) => {
    setSelectedNetworks(prev => 
      prev.includes(network) 
        ? prev.filter(n => n !== network)
        : [...prev, network]
    );
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
          </div>
        </div>

        <button 
          className="generate-button"
          onClick={generateAddresses}
          disabled={isLoading || selectedNetworks.length === 0}
        >
          {isLoading ? 'Generating...' : 'Generate Addresses'}
        </button>
      </div>

      {wallets.length > 0 && (
        <div className="wallets-table">
          <table>
            <thead>
              <tr>
                <th>Index</th>
                {selectedNetworks.includes('ETH') && <th>ETH Address</th>}
                {selectedNetworks.includes('SUI') && <th>SUI Address</th>}
                {selectedNetworks.includes('ETH') && <th>ETH Balance</th>}
                {selectedNetworks.includes('SUI') && <th>SUI Balance</th>}
                <th>Private Key</th>
              </tr>
            </thead>
            <tbody>
              {wallets.map((wallet) => (
                <tr key={wallet.index} className={
                  Object.values(wallet.balances).some(balance => Number(balance) > 0) ? 'has-balance' : ''
                }>
                  <td>{wallet.index}</td>
                  {selectedNetworks.includes('ETH') && <td>{wallet.ethAddress}</td>}
                  {selectedNetworks.includes('SUI') && <td>{wallet.suiAddress}</td>}
                  {selectedNetworks.includes('ETH') && <td>{wallet.balances.ETH}</td>}
                  {selectedNetworks.includes('SUI') && <td>{wallet.balances.SUI}</td>}
                  <td>
                    {Object.values(wallet.balances).some(balance => Number(balance) > 0) 
                      ? wallet.privateKey 
                      : '***********'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}; 