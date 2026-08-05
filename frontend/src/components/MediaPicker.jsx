import React, { useState, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';

// Dedicated, unique GIF category packs using unblockable WebP format!
const GIF_PACKS = {
  funny: [
    { id: 'f1', title: 'Laughing Hysterically', url: 'https://media0.giphy.com/media/10JhviFuU2gWD6/giphy.webp' },
    { id: 'f2', title: 'Minions Giggling', url: 'https://media1.giphy.com/media/Z5zuypybI5dYI/giphy.webp' },
    { id: 'f3', title: 'Cat Laughing', url: 'https://media2.giphy.com/media/Q81NcsY6YxK7jxnr4v/giphy.webp' },
    { id: 'f4', title: 'Chuckling Meme', url: 'https://media3.giphy.com/media/9T1k5pwZ3wRcA/giphy.webp' },
    { id: 'f5', title: 'Rolling On Floor Laughing', url: 'https://media0.giphy.com/media/lszAB3TzFtRaU/giphy.webp' },
    { id: 'f6', title: 'Suppressing A Laugh', url: 'https://media1.giphy.com/media/CoDp6NnSmItoY/giphy.webp' },
    { id: 'f7', title: 'Animated Cartoon Laugh', url: 'https://media2.giphy.com/media/wWUE0LFNI3S6I/giphy.webp' },
    { id: 'f8', title: 'Funny Dog Smirk', url: 'https://media3.giphy.com/media/BdfyC6lBBYAxy/giphy.webp' }
  ],
  sad: [
    { id: 's1', title: 'Sad Crying TV Scene', url: 'https://media0.giphy.com/media/ROF8OQvDmxytW/giphy.webp' },
    { id: 's2', title: 'Sad Pikachu Crying', url: 'https://media1.giphy.com/media/L95W4wv8nnb9K/giphy.webp' },
    { id: 's3', title: 'Lonely Crying Cat', url: 'https://media2.giphy.com/media/qQdL532ZANbjy/giphy.webp' },
    { id: 's4', title: 'Tearful Eyes Puppy', url: 'https://media3.giphy.com/media/26FmRmcfF4s3u2mQ/giphy.webp' },
    { id: 's5', title: 'Heartbroken Comfort Hug', url: 'https://media0.giphy.com/media/3o6wrvdLFbw4Z5AAs8/giphy.webp' },
    { id: 's6', title: 'Rainy Crying Window', url: 'https://media1.giphy.com/media/d2lcHJTG5TwyB5qn/giphy.webp' },
    { id: 's7', title: 'Sad Bear Solitary', url: 'https://media2.giphy.com/media/OPU6wzx8JrHna/giphy.webp' },
    { id: 's8', title: 'Emotional Tear Wiping', url: 'https://media3.giphy.com/media/xT9DPuMFeilLak0VAA/giphy.webp' }
  ],
  love: [
    { id: 'l1', title: 'Blowing Hearts Kiss', url: 'https://media0.giphy.com/media/26BRv0ThflsHCqDrG/giphy.webp' },
    { id: 'l2', title: 'Cute Bear Hug', url: 'https://media1.giphy.com/media/MDJ9IbxxvDUQM/giphy.webp' },
    { id: 'l3', title: 'Floating Pink Hearts', url: 'https://media2.giphy.com/media/LqxeCjCg3271Z8Iq0z/giphy.webp' },
    { id: 'l4', title: 'Love You Mucho', url: 'https://media3.giphy.com/media/26FLdmIp6wJr91JAI/giphy.webp' },
    { id: 'l5', title: 'Romantic Cartoon Hug', url: 'https://media0.giphy.com/media/ev6539aPewaEE/giphy.webp' },
    { id: 'l6', title: 'Heart Thumping Fast', url: 'https://media1.giphy.com/media/3o7TKoWXm3okO1kgHC/giphy.webp' },
    { id: 'l7', title: 'Puppy Love Eyes', url: 'https://media2.giphy.com/media/M33UV4NDvkTHa/giphy.webp' },
    { id: 'l8', title: 'Sweetheart Kisses', url: 'https://media3.giphy.com/media/G1iE6f5bdfyN2/giphy.webp' }
  ],
  dance: [
    { id: 'd1', title: 'Excited Party Dance', url: 'https://media0.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.webp' },
    { id: 'd2', title: 'Snoopy Celebration Dance', url: 'https://media1.giphy.com/media/blSTtZehjAZ8I/giphy.webp' },
    { id: 'd3', title: 'Disco Dancing Groove', url: 'https://media2.giphy.com/media/BZY2KYgoYOLKa2D5n3/giphy.webp' },
    { id: 'd4', title: 'Minion Party Dance', url: 'https://media3.giphy.com/media/13HgwMw4MWNTb2/giphy.webp' },
    { id: 'd5', title: 'Penguin Dancing Happy', url: 'https://media0.giphy.com/media/Y4pAQv58ETJgRwoPrI/giphy.webp' },
    { id: 'd6', title: 'Groovy Dance Floor', url: 'https://media1.giphy.com/media/11sBLVxNs7v6WA/giphy.webp' },
    { id: 'd7', title: 'Joyful Jumping Cheer', url: 'https://media2.giphy.com/media/EK0DwtW9k7cVG/giphy.webp' },
    { id: 'd8', title: 'Celebrating Victory', url: 'https://media3.giphy.com/media/nuknC875TxyoM/giphy.webp' }
  ],
  clapping: [
    { id: 'c1', title: 'Standing Ovation Applause', url: 'https://media0.giphy.com/media/3o7qDEq2bMbcbPRQ2c/giphy.webp' },
    { id: 'c2', title: 'Leonardo DiCaprio Toast', url: 'https://media1.giphy.com/media/t2sKa4JKNW9DawxAYi/giphy.webp' },
    { id: 'c3', title: 'Slow Clap Approving', url: 'https://media2.giphy.com/media/2x0tJPI3P8rIfGA9k3/giphy.webp' },
    { id: 'c4', title: 'Minion Clapping Happy', url: 'https://media3.giphy.com/media/111ebonMs90YLu/giphy.webp' },
    { id: 'c5', title: 'Elegant Wine Toast', url: 'https://media0.giphy.com/media/GCLlQnV4ndg7C/giphy.webp' },
    { id: 'c6', title: 'Enthusiastic Thumbs Up', url: 'https://media1.giphy.com/media/XrmjSStqO7QGk/giphy.webp' },
    { id: 'c7', title: 'Cheering Crowd Victory', url: 'https://media2.giphy.com/media/xT5LMHxhOfscxPfIfu/giphy.webp' },
    { id: 'c8', title: 'Perfect Score 10/10', url: 'https://media3.giphy.com/media/dVdIu1HNxeKyqzkgPA/giphy.webp' }
  ],
  wow: [
    { id: 'w1', title: 'Mind Blown Universe', url: 'https://media0.giphy.com/media/26ufdipQqB2lhNA4g/giphy.webp' },
    { id: 'w2', title: 'Surprised Gasps', url: 'https://media1.giphy.com/media/VgfO1F3gGvS1G/giphy.webp' },
    { id: 'w3', title: 'Jaw Drop Wow', url: 'https://media2.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.webp' },
    { id: 'w4', title: 'Wide Eyed Shock', url: 'https://media3.giphy.com/media/l41YkxvU8c7J7Bmw/giphy.webp' },
    { id: 'w5', title: 'Cat Shocked Face', url: 'https://media0.giphy.com/media/13HvcH85f7V5U4/giphy.webp' },
    { id: 'w6', title: 'OMG Excitement Scream', url: 'https://media1.giphy.com/media/5wWf7H89PisM6An8UAU/giphy.webp' },
    { id: 'w7', title: 'Dramatic Soap Opera Gasps', url: 'https://media2.giphy.com/media/k5m2GqX5q4sF2/giphy.webp' },
    { id: 'w8', title: 'Unbelievable Amazement', url: 'https://media3.giphy.com/media/l0IylOPCNkiqOgMyA/giphy.webp' }
  ]
};

const GIF_CATEGORIES = [
  { id: 'funny', label: '😂 Funny', query: 'funny laughing meme' },
  { id: 'sad', label: '😭 Sad', query: 'sad crying tears' },
  { id: 'love', label: '❤️ Love', query: 'romantic hugs kiss' },
  { id: 'dance', label: '💃 Dance', query: 'party dance celebration' },
  { id: 'clapping', label: '👏 Cheers', query: 'clapping applause toast' },
  { id: 'wow', label: '😱 Wow', query: 'shocked mind blown wow' }
];

// 100% reliable, permanent Google Noto Animated Stickers! (Never expire or show "content not available")
const STICKER_PACKS = {
  pets: [
    { id: 'p1', title: 'Cute Cat Waving', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f431/512.gif' },
    { id: 'p2', title: 'Happy Dog Face', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f436/512.gif' },
    { id: 'p3', title: 'Clever Fox', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f98a/512.gif' },
    { id: 'p4', title: 'Playful Monkey', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f435/512.gif' },
    { id: 'p5', title: 'Happy White Bunny', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f430/512.gif' },
    { id: 'p6', title: 'Magical Unicorn', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f984/512.gif' },
    { id: 'p7', title: 'Happy Green Frog', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f438/512.gif' },
    { id: 'p8', title: 'Cute Baby Chick', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f425/512.gif' }
  ],
  bears: [
    { id: 'b1', title: 'Friendly Teddy Bear', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f43b/512.gif' },
    { id: 'b2', title: 'Koala Bear Hug', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f428/512.gif' },
    { id: 'b3', title: 'Panda Munching', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f43c/512.gif' },
    { id: 'b4', title: 'Roaring Lion Cub', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f981/512.gif' },
    { id: 'b5', title: 'Tiger Mascot', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f42f/512.gif' },
    { id: 'b6', title: 'See No Evil Monkey', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f648/512.gif' },
    { id: 'b7', title: 'Wise Cartoon Owl', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f989/512.gif' },
    { id: 'b8', title: 'Happy Pink Piglet', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f437/512.gif' }
  ],
  emojis: [
    { id: 'e1', title: 'Star Eyed Smiley', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f929/512.gif' },
    { id: 'e2', title: 'Laughing Tears Face', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/512.gif' },
    { id: 'e3', title: 'Heart Eyes Love', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60d/512.gif' },
    { id: 'e4', title: 'Cool Shades Boss', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60e/512.gif' },
    { id: 'e5', title: 'Mind Blown Shock', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f92f/512.gif' },
    { id: 'e6', title: 'Party Confetti Face', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f973/512.gif' },
    { id: 'e7', title: 'Winking Friendly Eye', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f609/512.gif' },
    { id: 'e8', title: 'Angel Halo Smiley', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f607/512.gif' }
  ],
  love: [
    { id: 'l1', title: 'Sparkling Hearts', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f496/512.gif' },
    { id: 'l2', title: 'Two Dancing Hearts', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f495/512.gif' },
    { id: 'l3', title: 'Cupid Arrow Heart', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f498/512.gif' },
    { id: 'l4', title: 'Thumbs Up Hand', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44d/512.gif' },
    { id: 'l5', title: 'Clapping Applause', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44f/512.gif' },
    { id: 'l6', title: 'Thank You Prayer Hands', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f64f/512.gif' },
    { id: 'l7', title: 'Blazing Fire Flame', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.gif' },
    { id: 'l8', title: 'Gold Crown Royalty', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f451/512.gif' }
  ],
  party: [
    { id: 'pt1', title: 'Party Popper Horn', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f389/512.gif' },
    { id: 'pt2', title: 'Confetti Ball Streamers', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f38a/512.gif' },
    { id: 'pt3', title: 'Birthday Cake Candles', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f382/512.gif' },
    { id: 'pt4', title: 'Champagne Glasses Toast', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f942/512.gif' },
    { id: 'pt5', title: 'Beer Mugs Toast', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f37b/512.gif' },
    { id: 'pt6', title: 'Winner Gold Trophy', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f3c6/512.gif' },
    { id: 'pt7', title: 'Rocket Flight Sky', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.gif' },
    { id: 'pt8', title: 'Twinkling Magic Sparkles', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/2728/512.gif' }
  ]
};

const STICKER_CATEGORIES = [
  { id: 'pets', label: '🐱 Cute Pets', query: 'cute animal cartoon sticker' },
  { id: 'bears', label: '🐻 Teddy Bears', query: 'cute bear cartoon sticker' },
  { id: 'emojis', label: '🤪 3D Emojis', query: '3d emoji animated sticker' },
  { id: 'love', label: '❤️ Hearts & Love', query: 'animated hearts hands sticker' },
  { id: 'party', label: '🎉 Party Time', query: 'celebration confetti sticker' }
];

const GIPHY_KEY = 'GlVGYHkr3WSbnllcaVyMVNaRo71j22Rz';

export default function MediaPicker({ onSelectEmoji, onSelectGif, onSelectSticker, onClose }) {
  const [activeTab, setActiveTab] = useState('emoji');
  
  // GIFs state (with categories & distinct packs)
  const [gifQuery, setGifQuery] = useState('');
  const [activeGifCategory, setActiveGifCategory] = useState(GIF_CATEGORIES[0]);
  const [gifs, setGifs] = useState(GIF_PACKS[GIF_CATEGORIES[0].id]);
  const [loadingGifs, setLoadingGifs] = useState(false);

  // Stickers state
  const [stickerQuery, setStickerQuery] = useState('');
  const [activeStickerCategory, setActiveStickerCategory] = useState(STICKER_CATEGORIES[0]);
  const [stickers, setStickers] = useState(STICKER_PACKS[STICKER_CATEGORIES[0].id]);
  const [loadingStickers, setLoadingStickers] = useState(false);

  // Handle GIF queries with instant category pack switching & WebP prioritization
  useEffect(() => {
    if (activeTab === 'gif') {
      const fetchGifs = async () => {
        setLoadingGifs(true);
        
        // Pick the matching GIF pack based on category chip or search keyword!
        let targetPack = GIF_PACKS[activeGifCategory.id] || GIF_PACKS['funny'];
        const queryLower = gifQuery.trim().toLowerCase();
        if (queryLower === 'sad' || queryLower.includes('cry')) targetPack = GIF_PACKS['sad'];
        else if (queryLower === 'love' || queryLower.includes('heart')) targetPack = GIF_PACKS['love'];
        else if (queryLower === 'dance' || queryLower.includes('party')) targetPack = GIF_PACKS['dance'];
        else if (queryLower === 'clapping' || queryLower.includes('cheer')) targetPack = GIF_PACKS['clapping'];
        else if (queryLower === 'wow' || queryLower.includes('shock')) targetPack = GIF_PACKS['wow'];
        else if (queryLower === 'funny' || queryLower.includes('laugh')) targetPack = GIF_PACKS['funny'];

        if (!gifQuery.trim()) {
          setGifs(targetPack);
          setLoadingGifs(false);
          return;
        }

        try {
          const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(gifQuery)}&limit=24&rating=g`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (data.data && data.data.length > 0) {
              const parsed = data.data.map(item => ({
                id: item.id,
                title: item.title,
                url: item.images?.fixed_height?.webp || item.images?.original?.webp || item.images?.fixed_height?.url
              }));
              setGifs(parsed);
              setLoadingGifs(false);
              return;
            }
          }
        } catch (err) {
          console.warn('Giphy GIF fetch fallback', err);
        }
        setGifs(targetPack);
        setLoadingGifs(false);
      };
      const timer = setTimeout(fetchGifs, 200);
      return () => clearTimeout(timer);
    }
  }, [activeTab, gifQuery, activeGifCategory]);

  // Handle Sticker Pack selection and keyword searches
  useEffect(() => {
    if (activeTab === 'sticker') {
      const fetchStickers = async () => {
        setLoadingStickers(true);
        
        const targetPack = STICKER_PACKS[activeStickerCategory.id] || STICKER_PACKS['pets'];
        
        if (!stickerQuery.trim()) {
          setStickers(targetPack);
          setLoadingStickers(false);
          return;
        }

        try {
          const query = `${stickerQuery.trim()} cartoon sticker`;
          const url = `https://api.giphy.com/v1/stickers/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(query)}&limit=24&rating=g`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (data.data && data.data.length > 0) {
              const parsed = data.data.map(item => ({
                id: item.id,
                title: item.title,
                url: item.images?.fixed_height?.webp || item.images?.original?.webp || item.images?.fixed_height?.url
              }));
              setStickers(parsed);
              setLoadingStickers(false);
              return;
            }
          }
        } catch (err) {
          console.warn('Giphy Stickers fetch fallback', err);
        }
        setStickers(targetPack);
        setLoadingStickers(false);
      };
      const timer = setTimeout(fetchStickers, 150);
      return () => clearTimeout(timer);
    }
  }, [activeTab, stickerQuery, activeStickerCategory]);

  return (
    <div style={{
      width: '360px',
      height: '430px',
      backgroundColor: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      boxShadow: '0 4px 25px rgba(0,0,0,0.35)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        {activeTab === 'emoji' && (
          <div style={{ width: '100%', height: '100%' }}>
            <EmojiPicker 
              onEmojiClick={onSelectEmoji}
              width="100%"
              height="380px"
              searchDisabled={false}
              skinTonesDisabled={false}
            />
          </div>
        )}

        {/* Tab 2: GIFs (Rectangular reaction clips with Category Chips!) */}
        {activeTab === 'gif' && (
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--text-secondary)" style={{ position: 'absolute', left: '10px' }}>
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
              <input
                type="text"
                placeholder="Search reaction GIFs (e.g. sad, love)..."
                value={gifQuery}
                onChange={(e) => setGifQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  borderRadius: '20px',
                  border: 'none',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Quick-Switch Category Chips for GIFs */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
              {GIF_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setActiveGifCategory(cat); setGifQuery(''); }}
                  style={{
                    padding: '5px 11px',
                    borderRadius: '16px',
                    border: 'none',
                    backgroundColor: activeGifCategory.id === cat.id && !gifQuery ? '#00a884' : 'var(--bg-primary)',
                    color: activeGifCategory.id === cat.id && !gifQuery ? 'white' : 'var(--text-secondary)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    fontWeight: '600',
                    transition: 'all 0.2s'
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {gifQuery ? `GIF matches for "${gifQuery}"` : `🎬 ${activeGifCategory.label} GIFs`}
            </div>

            {loadingGifs ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, color: 'var(--text-secondary)', fontSize: '13px' }}>
                Loading reaction GIFs...
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', overflowY: 'auto', paddingBottom: '55px' }}>
                {gifs.map((gif) => (
                  <div
                    key={gif.id}
                    onClick={() => onSelectGif(gif)}
                    style={{
                      height: '110px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      position: 'relative',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      transition: 'transform 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <img
                      src={gif.url}
                      alt={gif.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/512.gif';
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Stickers (Transparent animated cartoon characters) */}
        {activeTab === 'sticker' && (
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--text-secondary)" style={{ position: 'absolute', left: '10px' }}>
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
              <input
                type="text"
                placeholder="Search cartoon character stickers..."
                value={stickerQuery}
                onChange={(e) => setStickerQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  borderRadius: '20px',
                  border: 'none',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Cartoon Sticker Packs / Category Switches */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
              {STICKER_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setActiveStickerCategory(cat); setStickerQuery(''); }}
                  style={{
                    padding: '5px 11px',
                    borderRadius: '16px',
                    border: 'none',
                    backgroundColor: activeStickerCategory.id === cat.id && !stickerQuery ? '#00a884' : 'var(--bg-primary)',
                    color: activeStickerCategory.id === cat.id && !stickerQuery ? 'white' : 'var(--text-secondary)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    fontWeight: '600',
                    transition: 'all 0.2s'
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {stickerQuery ? `Sticker matches for "${stickerQuery}"` : `✨ ${activeStickerCategory.label} Sticker Pack`}
            </div>

            {loadingStickers ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, color: 'var(--text-secondary)', fontSize: '13px' }}>
                Loading transparent sticker pack...
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', overflowY: 'auto', paddingBottom: '55px', paddingTop: '4px' }}>
                {stickers.map((stk) => (
                  <div
                    key={stk.id}
                    onClick={() => onSelectSticker(stk)}
                    style={{
                      height: '85px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '10px',
                      backgroundColor: 'transparent',
                      transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.22)'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <img
                      src={stk.url}
                      alt={stk.title}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.3))' }}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'https://fonts.gstatic.com/s/e/notoemoji/latest/2728/512.gif';
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* WhatsApp Style Floating Pill Bottom Switcher */}
      <div style={{
        position: 'absolute',
        bottom: '8px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#202c33',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '24px',
        padding: '3px',
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
        zIndex: 10
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('emoji')}
          title="Emojis"
          style={{
            background: activeTab === 'emoji' ? 'rgba(255,255,255,0.15)' : 'transparent',
            border: 'none',
            borderRadius: '20px',
            padding: '6px 16px',
            color: activeTab === 'emoji' ? '#00a884' : '#8696a0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 2C6.477 22 2 17.523 2 12S6.477 2 12 2S22 6.477 22 12S17.523 22 12 22ZM12 20C16.418 20 20 16.418 20 12S16.418 4 12 4S4 7.582 4 12S7.582 20 12 20ZM8.5 11C7.671 11 7 10.329 7 9.5S7.671 8 8.5 8S10 8.671 10 9.5S9.329 11 8.5 11ZM15.5 11C14.671 11 14 10.329 14 9.5S14.671 8 15.5 8S17 8.671 17 9.5S16.329 11 15.5 11ZM12 16.5C9.721 16.5 7.755 15.111 6.822 13.064C6.671 12.732 6.818 12.339 7.15 12.188C7.482 12.037 7.875 12.184 8.026 12.516C8.653 13.889 9.972 14.821 11.5 14.821H12.5C14.028 14.821 15.347 13.889 15.974 12.516C16.125 12.184 16.518 12.037 16.85 12.188C17.182 12.339 17.329 12.732 17.178 13.064C16.245 15.111 14.279 16.5 12 16.5Z"></path>
          </svg>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('gif')}
          title="Reaction Video GIFs"
          style={{
            background: activeTab === 'gif' ? 'rgba(255,255,255,0.15)' : 'transparent',
            border: 'none',
            borderRadius: '20px',
            padding: '6px 16px',
            color: activeTab === 'gif' ? '#00a884' : '#8696a0',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '13px',
            letterSpacing: '0.5px',
            transition: 'all 0.2s'
          }}
        >
          GIF
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sticker')}
          title="Transparent Cartoon Stickers"
          style={{
            background: activeTab === 'sticker' ? 'rgba(255,255,255,0.15)' : 'transparent',
            border: 'none',
            borderRadius: '20px',
            padding: '6px 16px',
            color: activeTab === 'sticker' ? '#00a884' : '#8696a0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M19.5 9.5c-.3 0-.5-.2-.5-.5V4.5C19 4.2 18.8 4 18.5 4H5.5C5.2 4 5 4.2 5 4.5v15c0 .3.2.5.5.5h13c.3 0 .5-.2.5-.5v-4.5c0-.3.2-.5.5-.5s.5.2.5.5v4.5c0 .8-.7 1.5-1.5 1.5H5.5C4.7 21 4 20.3 4 19.5v-15C4 3.7 4.7 3 5.5 3h13c.8 0 1.5.7 1.5 1.5v4.5c0 .3-.2.5-.5.5ZM17.2 12.2c-.3 0-.5-.2-.5-.5s.2-.5.5-.5h.3c.3 0 .5.2.5.5s-.2.5-.5.5h-.3Z"/>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c2.42 0 4.68-.86 6.45-2.31l-4.14-4.14c-.19-.19-.31-.45-.31-.73V8.19c0-.28.12-.54.31-.73l4.14-4.14C16.68 1.86 14.42 1 12 1v1Z" opacity="0.4"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
