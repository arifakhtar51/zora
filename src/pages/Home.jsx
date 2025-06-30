import { useEffect, useState } from 'react';
import { BrowserProvider, Contract, formatEther } from 'ethers';
import { toast } from 'react-toastify';
import VideoPlayer from '../components/VideoPlayer';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../utils/contract';

const ZORA_CHAIN_ID = '0x3b9ac9ff';

const Home = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [canView, setCanView] = useState(false);
  const [viewTimeLeft, setViewTimeLeft] = useState(0);
  const [account, setAccount] = useState(null);
  const [chainOk, setChainOk] = useState(true);

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

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const provider = new BrowserProvider(window.ethereum);
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      const [uploaders, videoHashes, thumbnailHashes, prices, times] = await contract.getVideos();
      const vids = uploaders.map((u, i) => ({
        uploader: u,
        videoHash: videoHashes[i],
        thumbnailHash: thumbnailHashes[i],
        price: prices[i],
        displayTime: times[i],
        id: i,
      }));
      setVideos(vids);
    } catch (err) {
      toast.error('Failed to fetch videos');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handlePayToView = async (video) => {
    if (!account) return toast.error('Connect wallet first');
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.payToView(video.id, { value: video.price });
      await tx.wait();
      toast.success('Payment successful!');
      setSelectedVideo(video);
      checkCanView(video);
    } catch (err) {
      toast.error('Payment failed');
    }
  };

  const checkCanView = async (video) => {
    if (!account) return;
    try {
      const provider = new BrowserProvider(window.ethereum);
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      const allowed = await contract.canView(video.id, account);
      setCanView(allowed);
      // Countdown timer logic may need to be updated for v6 if you use contract storage access
    } catch (err) {
      setCanView(false);
    }
  };

  useEffect(() => {
    if (selectedVideo) checkCanView(selectedVideo);
    // eslint-disable-next-line
  }, [selectedVideo, account]);

  useEffect(() => {
    if (!canView || !viewTimeLeft) return;
    const interval = setInterval(() => {
      setViewTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [canView, viewTimeLeft]);

  if (!chainOk) {
    return (
      <main className="fade-in">
        <div className="card text-center">
          <h2 className="mb-3">Network Error</h2>
          <p className="mb-3">Please switch to the Zora Sepolia Testnet to use the app.</p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="fade-in">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading videos...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="fade-in">
      <h2 className="mb-4">Discover Videos</h2>
      
      {videos.length === 0 ? (
        <div className="card text-center">
          <h3>No videos available</h3>
          <p>Be the first to upload a video!</p>
        </div>
      ) : (
        <div className="video-grid">
          {videos.map((video) => (
            <div key={video.id} className="video-card">
              <div className="video-thumbnail">
                <img 
                  src={`https://gateway.pinata.cloud/ipfs/${video.thumbnailHash}`} 
                  alt="thumbnail" 
                  loading="lazy"
                />
              </div>
              <div className="video-info">
                <div className="video-price">
                  <div className="price">{formatEther(video.price)} ETH</div>
                  <div className="time">{video.displayTime}s</div>
                </div>
                <button
                  onClick={() => { if (account) { setSelectedVideo(video); checkCanView(video); } }}
                  className="btn-primary"
                  disabled={!account}
                  title={!account ? 'Connect your wallet to pay and view' : ''}
                >
                  Pay to View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {selectedVideo && (
        <div className="mt-5 fade-in">
          <h3 className="mb-3">Selected Video</h3>
          {canView ? (
            <div className="video-player-container">
              <VideoPlayer ipfsHash={selectedVideo.videoHash} />
              {/* {viewTimeLeft > 0 && <div className="time-left">Time left: {viewTimeLeft} sec</div>} */}
            </div>
          ) : (
            <div className="card">
              <h4 className="mb-2">Purchase Required</h4>
              <p className="mb-3">You need to pay to view this video.</p>
              <button
                onClick={() => account && handlePayToView(selectedVideo)}
                className="btn-primary"
                disabled={!account}
                title={!account ? 'Connect your wallet to pay and view' : ''}
              >
                Pay {formatEther(selectedVideo.price)} ETH to View
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
};

export default Home; 