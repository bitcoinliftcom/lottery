import { useState } from 'react';
import { Modal } from '../Modal/Modal';
import './BalanceAlert.scss';

interface Balance {
  network: string;
  address: string;
  privateKey: string;
  amount: string;
}

interface BalanceAlertProps {
  isOpen: boolean;
  onClose: () => void;
  balances: Balance[];
}

export const BalanceAlert = ({ isOpen, onClose, balances }: BalanceAlertProps) => {
  const [isRevealed, setIsRevealed] = useState(false);
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="balance-alert">
        <h3>🎉 Found Balance!</h3>
        {balances.map((balance, index) => (
          <div key={index} className="balance-item">
            <div className="network">{balance.network}</div>
            <div className="amount">{balance.amount}</div>
            <div className="address-row">
              <label>Address:</label>
              <div className="value-with-copy">
                <div className="value">{balance.address}</div>
                <button 
                  className="copy-button"
                  onClick={() => copyToClipboard(balance.address)}
                >
                  📋
                </button>
              </div>
            </div>
            <div className="key-row">
              <label>Private Key:</label>
              <div className="value-with-copy">
                <div className="value">
                  {isRevealed ? balance.privateKey : '********************************'}
                </div>
                {isRevealed && (
                  <button 
                    className="copy-button"
                    onClick={() => copyToClipboard(balance.privateKey)}
                  >
                    📋
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        <button 
          className="reveal-button"
          onClick={() => setIsRevealed(!isRevealed)}
        >
          {isRevealed ? 'Hide' : 'Reveal'} Private Keys
        </button>
      </div>
    </Modal>
  );
}; 