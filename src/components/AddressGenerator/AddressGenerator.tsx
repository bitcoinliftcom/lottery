import { useState } from 'react';
import { ethers } from 'ethers';
import './AddressGenerator.scss';

interface AddressGeneratorProps {
  seedPhrase: string[];
}

interface WalletInfo {
  address: string;
  privateKey: string;
  balance: string;
  index: number;
}

export const AddressGenerator = ({ seedPhrase }: AddressGeneratorProps) => {
  const [numberOfAddresses, setNumberOfAddresses] = useState<number>(5);
  const [startIndex, setStartIndex] = useState<number>(0);
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const generateAddresses = async () => {
    setIsLoading(true);
    try {
      const mnemonic = seedPhrase.join(' ');
      const provider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');
      
      const newWallets: WalletInfo[] = [];
      const masterNode = ethers.HDNodeWallet.fromPhrase(mnemonic);
      
      for (let i = startIndex; i < startIndex + numberOfAddresses; i++) {
        // Get the i-th account
        const derivedNode = masterNode.deriveChild(i);
        const walletWithProvider = derivedNode.connect(provider);
        
        const balance = await provider.getBalance(walletWithProvider.address);
        
        newWallets.push({
          address: walletWithProvider.address,
          privateKey: walletWithProvider.privateKey,
          balance: ethers.formatEther(balance),
          index: i
        });
      }
      
      setWallets(newWallets);
    } catch (error) {
      console.error('Error generating addresses:', error);
    }
    setIsLoading(false);
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

        <button 
          className="generate-button"
          onClick={generateAddresses}
          disabled={isLoading}
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
                <th>Address</th>
                <th>Balance (ETH)</th>
                <th>Private Key</th>
              </tr>
            </thead>
            <tbody>
              {wallets.map((wallet) => (
                <tr key={wallet.index} className={Number(wallet.balance) > 0 ? 'has-balance' : ''}>
                  <td>{wallet.index}</td>
                  <td>{wallet.address}</td>
                  <td>{wallet.balance}</td>
                  <td>
                    {Number(wallet.balance) > 0 ? wallet.privateKey : '***********'}
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