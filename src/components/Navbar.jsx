import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

const ZORA_CHAIN_ID = '0x3b9ac9ff';
const ZORA_PARAMS = {
  chainId: ZORA_CHAIN_ID,
  chainName: 'Zora Sepolia Testnet',
  nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://sepolia.rpc.zora.energy'],
  blockExplorerUrls: ['https://sepolia.explorer.zora.energy'],
};

const Navbar = () => {
  const [account, setAccount] = useState(null);
  const [chainOk, setChainOk] = useState(false);

  useEffect(() => {
    if (window.ethereum && window.ethereum.selectedAddress) {
      setAccount(window.ethereum.selectedAddress);
    }
    window.ethereum?.on('accountsChanged', (accounts) => {
      setAccount(accounts[0] || null);
    });
    window.ethereum?.on('chainChanged', checkChain);
    checkChain();
    return () => {
      window.ethereum?.removeAllListeners('accountsChanged');
      window.ethereum?.removeAllListeners('chainChanged');
    };
  }, []);

  const checkChain = async () => {
    if (window.ethereum) {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      setChainOk(chainId === ZORA_CHAIN_ID);
      if (chainId !== ZORA_CHAIN_ID) {
        toast.error('Please switch to Zora Sepolia Testnet to use the app!');
      }
    }
  };

  const switchToZora = async () => {
    if (!window.ethereum) return toast.error('MetaMask not detected');
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ZORA_CHAIN_ID }],
      });
    } catch (switchError) {
      // If the chain is not added, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [ZORA_PARAMS],
          });
        } catch (addError) {
          toast.error('Failed to add Zora Sepolia Testnet');
        }
      } else {
        toast.error('Failed to switch network');
      }
    }
    checkChain();
  };

  const connectWallet = async () => {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      checkChain();
    } else {
      toast.error('MetaMask not detected');
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
  };

  return (
    <nav>
      <div>
        <Link to="/" className="brand">PayPerView</Link>
        <Link to="/upload" className={chainOk ? '' : 'disabled'}>Upload</Link>
      </div>
      <div className="nav-actions">
        {!chainOk && (
          <button 
            onClick={switchToZora} 
            className="btn-warning"
          >
            Switch to Zora Sepolia
          </button>
        )}
        {account ? (
          <div className="wallet-info">
            <span className="address">
              {account.slice(0, 6)}...{account.slice(-4)}
            </span>
            <button onClick={disconnectWallet} className="btn-outline">
              Disconnect
            </button>
          </div>
        ) : (
          <button onClick={connectWallet} className="btn-primary">
            Connect Wallet
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar; 