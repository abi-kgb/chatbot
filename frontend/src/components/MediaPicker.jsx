import React, { useState, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';

// Reliable fallback GIF animations using stable CDN URLs
const GIF_PACKS = {
  trending: [
    { id: 't1', title: 'Laughing Hysterically', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/512.gif' },
    { id: 't2', title: 'Mind Blown', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f92f/512.gif' },
    { id: 't3', title: 'Sparkling Heart', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f496/512.gif' },
    { id: 't4', title: 'Fire Flame', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.gif' },
    { id: 't5', title: 'Party Confetti', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f973/512.gif' },
    { id: 't6', title: 'Cool Sunglasses', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60e/512.gif' },
    { id: 't7', title: 'Star Eyes', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f929/512.gif' },
    { id: 't8', title: 'Clapping Hands', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44f/512.gif' }
  ],
  funny: [
    { id: 'f1', title: 'Laughing Hysterically', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/512.gif' },
    { id: 'f2', title: 'Rolling On Floor Laughing', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f923/512.gif' },
    { id: 'f3', title: 'Cat Laughing', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f431/512.gif' },
    { id: 'f4', title: 'Winking Friendly Eye', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f609/512.gif' },
    { id: 'f5', title: 'Cool Shades Boss', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60e/512.gif' },
    { id: 'f6', title: 'Zany Face', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f92a/512.gif' },
    { id: 'f7', title: 'Monkey See No Evil', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f648/512.gif' },
    { id: 'f8', title: 'Dog Happy Face', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f436/512.gif' }
  ],
  sad: [
    { id: 's1', title: 'Loudly Crying Face', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f62d/512.gif' },
    { id: 's2', title: 'Crying Tear Eye', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f622/512.gif' },
    { id: 's3', title: 'Pleading Face', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f97a/512.gif' },
    { id: 's4', title: 'Sad But Relieved', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f625/512.gif' },
    { id: 's5', title: 'Broken Heart', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f494/512.gif' },
    { id: 's6', title: 'Sad Disappointed Face', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f61e/512.gif' },
    { id: 's7', title: 'Downcast Eyes', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f614/512.gif' },
    { id: 's8', title: 'Weary Sigh', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f629/512.gif' }
  ],
  love: [
    { id: 'l1', title: 'Sparkling Hearts', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f496/512.gif' },
    { id: 'l2', title: 'Blowing Kiss', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f618/512.gif' },
    { id: 'l3', title: 'Heart Eyes Love', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60d/512.gif' },
    { id: 'l4', title: 'Two Dancing Hearts', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f495/512.gif' },
    { id: 'l5', title: 'Beating Heart', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f493/512.gif' },
    { id: 'l6', title: 'Red Heart', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/2764_fe0f/512.gif' },
    { id: 'l7', title: 'Cupid Arrow Heart', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f498/512.gif' },
    { id: 'l8', title: 'Teddy Bear Love', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f43b/512.gif' }
  ],
  dance: [
    { id: 'd1', title: 'Party Confetti Face', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f973/512.gif' },
    { id: 'd2', title: 'Party Popper Horn', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f389/512.gif' },
    { id: 'd3', title: 'Confetti Ball Streamers', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f38a/512.gif' },
    { id: 'd4', title: 'Musical Notes Dancing', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f3b6/512.gif' },
    { id: 'd5', title: 'Sparkle Stars', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/2728/512.gif' },
    { id: 'd6', title: 'Rocket Flight Sky', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.gif' },
    { id: 'd7', title: 'Dancing Penguin', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f427/512.gif' },
    { id: 'd8', title: 'Winner Gold Trophy', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f3c6/512.gif' }
  ],
  clapping: [
    { id: 'c1', title: 'Clapping Applause', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44f/512.gif' },
    { id: 'c2', title: 'Thumbs Up Approval', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f44d/512.gif' },
    { id: 'c3', title: 'Champagne Glasses Toast', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f942/512.gif' },
    { id: 'c4', title: 'Party Celebration', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f389/512.gif' },
    { id: 'c5', title: 'Gold Crown Royalty', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f451/512.gif' },
    { id: 'c6', title: 'Fire Flame Hot', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.gif' },
    { id: 'c7', title: 'Beer Mugs Toast', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f37b/512.gif' },
    { id: 'c8', title: 'Hundred Score 100', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f4af/512.gif' }
  ],
  wow: [
    { id: 'w1', title: 'Mind Blown Shock', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f92f/512.gif' },
    { id: 'w2', title: 'Astonished Face', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f632/512.gif' },
    { id: 'w3', title: 'Flushed Face', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f633/512.gif' },
    { id: 'w4', title: 'Screaming In Fear', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f631/512.gif' },
    { id: 'w5', title: 'Cat Shocked Face', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f640/512.gif' },
    { id: 'w6', title: 'Star Eyes Wow', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f929/512.gif' },
    { id: 'w7', title: 'Wide Eyed Surprise', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f62e/512.gif' },
    { id: 'w8', title: 'Face With Monocle', url: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f9d0/512.gif' }
  ]
};

const GIF_CATEGORIES = [
  { id: 'trending', label: '🔥 Trending', query: '' },
  { id: 'funny', label: '😂 Funny', query: 'funny laughing' },
  { id: 'sad', label: '😭 Sad', query: 'sad crying' },
  { id: 'love', label: '❤️ Love', query: 'romantic love' },
  { id: 'dance', label: '💃 Dance', query: 'party dance' },
  { id: 'clapping', label: '👏 Cheers', query: 'cheers applause' },
  { id: 'wow', label: '😱 Wow', query: 'shocked wow' }
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
  const [gifs, setGifs] = useState(GIF_PACKS[GIF_CATEGORIES[0].id] || GIF_PACKS['trending']);
  const [loadingGifs, setLoadingGifs] = useState(false);

  // Stickers state
  const [stickerQuery, setStickerQuery] = useState('');
  const [activeStickerCategory, setActiveStickerCategory] = useState(STICKER_CATEGORIES[0]);
  const [stickers, setStickers] = useState(STICKER_PACKS[STICKER_CATEGORIES[0].id]);
  const [loadingStickers, setLoadingStickers] = useState(false);

  // Handle GIF queries instantly with local, unbreakable animation packs
  useEffect(() => {
    if (activeTab === 'gif') {
      const targetPack = GIF_PACKS[activeGifCategory.id] || GIF_PACKS['trending'] || GIF_PACKS['funny'];
      
      if (!gifQuery.trim()) {
        setGifs(targetPack);
        return;
      }

      const query = gifQuery.trim().toLowerCase();
      const allGifs = Object.values(GIF_PACKS).flat();
      const matches = allGifs.filter(g => g.title.toLowerCase().includes(query));
      setGifs(matches.length > 0 ? matches : targetPack);
    }
  }, [activeTab, gifQuery, activeGifCategory]);

  // Handle Sticker queries instantly with local, unbreakable sticker packs
  useEffect(() => {
    if (activeTab === 'sticker') {
      const targetPack = STICKER_PACKS[activeStickerCategory.id] || STICKER_PACKS['pets'];
      
      if (!stickerQuery.trim()) {
        setStickers(targetPack);
        return;
      }

      const query = stickerQuery.trim().toLowerCase();
      const allStickers = Object.values(STICKER_PACKS).flat();
      const matches = allStickers.filter(s => s.title.toLowerCase().includes(query));
      setStickers(matches.length > 0 ? matches : targetPack);
    }
  }, [activeTab, stickerQuery, activeStickerCategory]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: 'var(--bg-secondary)',
      borderTop: '1px solid var(--border-color)',
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
              height="100%"
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
            <div 
              onWheel={(e) => { if (e.deltaY !== 0) e.currentTarget.scrollLeft += e.deltaY; }}
              style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}
            >
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
            <div 
              onWheel={(e) => { if (e.deltaY !== 0) e.currentTarget.scrollLeft += e.deltaY; }}
              style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}
            >
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

export { MediaPicker };
