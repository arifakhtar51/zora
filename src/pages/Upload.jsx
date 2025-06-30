import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, parseEther } from 'ethers';
import { toast } from 'react-toastify';
import axios from 'axios';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../utils/contract';

const PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI5OTMyNjE0OC1hMzIzLTQ0YzItYjUwNi00MTU0YTNiMTNmMzMiLCJlbWFpbCI6ImFyaWZha2h0YXI5MDJAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6IjMzZGRkZjg0YjEyOTQxMjI3ZWI3Iiwic2NvcGVkS2V5U2VjcmV0IjoiNDBiNDQ2ZTJkYWNjM2Y3MzQ5OTI4ODgxZTc1NmVlYzg4OGE3YmYxNjEyYWRlYzRkODE2MmYxY2NjNTI5ZWZhNCIsImV4cCI6MTc4MTg4NDY5MX0.Z0T0LvsNHTyV7YLBmiuzb79xI3uUaIm2L8YQDZ2cKBc';
const ZORA_CHAIN_ID = '0x3b9ac9ff';

const Upload = () => {
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [price, setPrice] = useState('');
  const [displayTime, setDisplayTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [chainOk, setChainOk] = useState(true);
  const [account, setAccount] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

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
    }
  };

  const uploadToPinata = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
        maxBodyLength: 'Infinity',
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${PINATA_JWT}`,
        },
      });
      return res.data.IpfsHash;
    } catch (err) {
      throw new Error(
        err?.response?.data?.error?.details ||
        err?.response?.data?.error ||
        err?.message ||
        'Unknown Pinata error'
      );
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!videoFile || !thumbnailFile || !price || !displayTime) {
      toast.error('Fill all fields');
      return;
    }
    if (!window.ethereum) {
      toast.error('MetaMask is not installed or not detected!');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [videoHash, thumbnailHash] = await Promise.all([
        uploadToPinata(videoFile),
        uploadToPinata(thumbnailFile),
      ]);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.uploadVideo(
        videoHash,
        thumbnailHash,
        parseEther(price),
        displayTime
      );
      await tx.wait();
      toast.success('Video uploaded!');
      setVideoFile(null);
      setThumbnailFile(null);
      setPrice('');
      setDisplayTime('');
      setPreviewUrl(null);
    } catch (err) {
      toast.error(`Upload failed: ${err.message}`);
    }
    setLoading(false);
  };

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!chainOk) {
    return (
      <main className="fade-in">
        <div className="card text-center">
          <h2 className="mb-3">Network Error</h2>
          <p className="mb-3">Please switch to the Zora Sepolia Testnet to upload videos.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="fade-in">
      <h2 className="mb-4 text-center">Upload Video</h2>
      <div className="form-container">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="video">Video File</label>
            <input 
              type="file" 
              id="video"
              accept="video/*" 
              onChange={e => setVideoFile(e.target.files[0])} 
              className="file-input"
            />
            {videoFile && (
              <div className="file-info mt-2">
                <span>{videoFile.name}</span>
                <span>{Math.round(videoFile.size / 1024 / 1024 * 10) / 10} MB</span>
              </div>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="thumbnail">Thumbnail Image</label>
            <input 
              type="file" 
              id="thumbnail"
              accept="image/*" 
              onChange={handleThumbnailChange}
              className="file-input" 
            />
            {previewUrl && (
              <div className="thumbnail-preview mt-2">
                <img src={previewUrl} alt="Thumbnail preview" />
              </div>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="price">ETH Price</label>
            <input 
              type="number" 
              id="price"
              step="0.0001" 
              min="0" 
              value={price} 
              onChange={e => setPrice(e.target.value)} 
              placeholder="0.01"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="time">Valid View Time (seconds)</label>
            <input 
              type="number" 
              id="time"
              min="1" 
              value={displayTime} 
              onChange={e => setDisplayTime(e.target.value)} 
              placeholder="300"
            />
          </div>
          
          <div className="form-actions">
            <button
              type="submit"
              className={loading ? "btn-secondary" : "btn-primary"}
              disabled={loading || !account}
              title={!account ? 'Connect your wallet to upload' : ''}
            >
              {loading ? (
                <>
                  <span className="spinner-small"></span>
                  Uploading...
                </>
              ) : (
                'Upload Video'
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
};

export default Upload; 