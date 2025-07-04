import React, { useState, useRef } from 'react';
import './App.css';

function App() {
  const [formData, setFormData] = useState({
    text: '',
    emoji: '',
    x: 330,
    y: 180,
    fontSize: 48,
    emojiSize: 250,
    textColor: '#ffffff'
  });
  const [baseImage, setBaseImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState('');
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState(0);
  const [initialMousePos, setInitialMousePos] = useState({ x: 0, y: 0 });
  const [textBounds, setTextBounds] = useState({ width: 0, height: 0 });
  const [imageScale, setImageScale] = useState(1);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const previewRef = useRef(null);
  const imageRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEmojiSelect = (emoji) => {
    setFormData(prev => ({
      ...prev,
      emoji: emoji,
      text: '' // 絵文字を選んだらテキストをクリア
    }));
    setShowEmojiPicker(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBaseImage(file);
    }
  };

  const calculateTextBounds = () => {
    const text = formData.emoji || formData.text;
    const fontSize = formData.emoji ? formData.emojiSize : formData.fontSize;
    
    let bounds;
    // 簡易的なサイズ計算
    if (formData.emoji) {
      bounds = { width: fontSize, height: fontSize };
    } else {
      // テキストの場合は最大幅を設定して改行を考慮
      const maxWidth = 400; // 最大幅を少し大きく
      const charWidth = fontSize * 0.6; // 文字幅の近似
      const totalWidth = text.length * charWidth;
      
      let width, height;
      if (totalWidth <= maxWidth) {
        // 1行に収まる場合
        width = Math.max(totalWidth, fontSize); // 最小幅を保証
        height = fontSize * 1.2; // 行高を考慮
      } else {
        // 複数行になる場合
        width = maxWidth;
        const lines = Math.ceil(totalWidth / maxWidth);
        height = fontSize * 1.2 * lines; // 行高を考慮
      }
      
      bounds = { width, height };
    }
    
    console.log(`calculateTextBounds: text="${text}", fontSize=${fontSize}, bounds=`, bounds);
    return bounds;
  };

  const handleImageLoad = () => {
    if (imageRef.current) {
      // 実際の画像サイズと表示サイズの比率を計算
      const naturalWidth = imageRef.current.naturalWidth;
      const displayWidth = imageRef.current.clientWidth;
      const scale = naturalWidth / displayWidth;
      setImageScale(scale);
      console.log(`Image scale: ${scale} (natural: ${naturalWidth}, display: ${displayWidth})`);
    }
  };

  const startPreview = () => {
    if (!formData.text && !formData.emoji) {
      alert('テキストまたは絵文字を入力してください');
      return;
    }
    // プレビューモード開始時にtextBoundsを設定
    const bounds = calculateTextBounds();
    setTextBounds(bounds);
    setPreviewMode(true);
    console.log('Preview started with bounds:', bounds);
  };

  const handleMouseDown = (e) => {
    if (!previewMode) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // ドラッグ開始時に最新のtextBoundsを強制的に再計算
    const currentBounds = calculateTextBounds();
    setTextBounds(currentBounds);
    
    const canvasRect = previewRef.current.getBoundingClientRect();
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top;
    
    console.log(`=== DRAG START ===`);
    console.log(`Mouse down at: (${x}, ${y}), formData: (${formData.x}, ${formData.y})`);
    console.log(`Canvas rect:`, canvasRect);
    console.log(`Current textBounds:`, currentBounds);
    console.log(`FormData:`, formData);
    
    setIsDragging(true);
    setIsResizing(false); // リサイズ状態をクリア
    // 座標系を統一：クリック位置と現在の中心位置の差分を計算
    setDragOffset({ x: x - formData.x, y: y - formData.y });
  };

  const handleResizeMouseDown = (e, direction) => {
    if (!previewMode) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // リサイズ開始時に最新のtextBoundsを強制的に再計算
    const currentBounds = calculateTextBounds();
    setTextBounds(currentBounds);
    
    console.log(`=== RESIZE START ===`);
    console.log(`Resize handle clicked: ${direction}`);
    console.log(`Initial size: ${formData.emoji ? formData.emojiSize : formData.fontSize}`);
    console.log(`Current textBounds:`, currentBounds);
    console.log(`FormData:`, formData);
    
    setIsResizing(true);
    setIsDragging(false); // ドラッグ状態をクリア
    setResizeDirection(direction);
    setInitialMousePos({ x: e.clientX, y: e.clientY });
    setInitialSize(formData.emoji ? formData.emojiSize : formData.fontSize);
  };

  const handleMouseMove = (e) => {
    if (!previewMode) return;
    
    if (isDragging && previewRef.current) {
      const rect = previewRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - dragOffset.x;
      const y = e.clientY - rect.top - dragOffset.y;
      
      // 画像の境界内に制限（余白を考慮）
      const margin = 50;
      const newX = Math.max(margin, Math.min(rect.width - margin, x));
      const newY = Math.max(margin, Math.min(rect.height - margin, y));
      
      console.log(`Dragging to: (${newX}, ${newY})`);
      
      setFormData(prev => ({
        ...prev,
        x: newX,
        y: newY
      }));
    } else if (isResizing) {
      const deltaX = e.clientX - initialMousePos.x;
      const deltaY = e.clientY - initialMousePos.y;
      
      let sizeDelta = 0;
      
      // コーナーに応じてサイズ変更の方向を決定
      switch (resizeDirection) {
        case 'nw': // 左上
          sizeDelta = -(deltaX + deltaY) / 2;
          break;
        case 'ne': // 右上
          sizeDelta = (deltaX - deltaY) / 2;
          break;
        case 'sw': // 左下
          sizeDelta = (-deltaX + deltaY) / 2;
          break;
        case 'se': // 右下
          sizeDelta = (deltaX + deltaY) / 2;
          break;
        default:
          sizeDelta = (deltaX + deltaY) / 2;
      }
      
      if (formData.emoji) {
        const newSize = Math.max(20, Math.min(500, initialSize + sizeDelta));
        console.log(`Resizing emoji: ${initialSize} -> ${newSize} (delta: ${sizeDelta}, current: ${formData.emojiSize})`);
        
        // 状態を同期的に更新
        setFormData(prev => ({
          ...prev,
          emojiSize: newSize
        }));
        
        // textBoundsを同期的に更新
        const newBounds = { width: newSize, height: newSize };
        setTextBounds(newBounds);
        console.log('Updated textBounds for emoji:', newBounds);
      } else if (formData.text) {
        const newSize = Math.max(12, Math.min(200, initialSize + sizeDelta / 3));
        console.log(`Resizing text: ${initialSize} -> ${newSize} (delta: ${sizeDelta}, current: ${formData.fontSize})`);
        
        // 状態を同期的に更新
        setFormData(prev => ({
          ...prev,
          fontSize: newSize
        }));
        
        // textBoundsを同期的に更新（改行を考慮）
        const text = formData.text;
        const maxWidth = 400;
        const charWidth = newSize * 0.6;
        const totalWidth = text.length * charWidth;
        
        let width, height;
        if (totalWidth <= maxWidth) {
          width = Math.max(totalWidth, newSize);
          height = newSize * 1.2;
        } else {
          width = maxWidth;
          const lines = Math.ceil(totalWidth / maxWidth);
          height = newSize * 1.2 * lines;
        }
        
        const newBounds = { width, height };
        setTextBounds(newBounds);
        console.log('Updated textBounds for text:', newBounds);
      }
    }
  };

  const handleWheel = (e) => {
    if (!previewMode) return;
    
    e.preventDefault();
    const delta = e.deltaY > 0 ? -5 : 5;
    
    if (formData.emoji) {
      const newSize = Math.max(20, Math.min(500, formData.emojiSize + delta));
      setFormData(prev => ({
        ...prev,
        emojiSize: newSize
      }));
      const newBounds = { width: newSize, height: newSize };
      setTextBounds(newBounds);
      console.log('Wheel resize emoji bounds:', newBounds);
    } else if (formData.text) {
      const newSize = Math.max(12, Math.min(200, formData.fontSize + delta));
      setFormData(prev => ({
        ...prev,
        fontSize: newSize
      }));
      // テキストの場合は動的に計算（改行を考慮）
      const text = formData.text;
      const maxWidth = 400;
      const charWidth = newSize * 0.6;
      const totalWidth = text.length * charWidth;
      
      let width, height;
      if (totalWidth <= maxWidth) {
        width = Math.max(totalWidth, newSize);
        height = newSize * 1.2;
      } else {
        width = maxWidth;
        const lines = Math.ceil(totalWidth / maxWidth);
        height = newSize * 1.2 * lines;
      }
      
      const newBounds = { width, height };
      setTextBounds(newBounds);
      console.log('Wheel resize text bounds:', newBounds);
    }
  };

  const getBaseImageUrl = () => {
    if (baseImage) {
      return URL.createObjectURL(baseImage);
    }
    return 'http://localhost:8000/default-image';
  };

  const generateIcon = async () => {
    if (!formData.text && !formData.emoji) {
      alert('テキストまたは絵文字を入力してください');
      return;
    }

    setIsGenerating(true);
    setGeneratedImage(null);

    try {
      const data = new FormData();
      
      if (formData.text) data.append('text', formData.text);
      if (formData.emoji) data.append('emoji', formData.emoji);
      // スケールを考慮した座標を送信
      data.append('x', Math.round(formData.x * imageScale));
      data.append('y', Math.round(formData.y * imageScale));
      data.append('font_size', Math.round(formData.fontSize * imageScale));
      data.append('emoji_size', Math.round(formData.emojiSize * imageScale));
      data.append('text_color', formData.textColor);
      
      if (baseImage) {
        data.append('base_image', baseImage);
      }

      const response = await fetch('http://localhost:8000/generate', {
        method: 'POST',
        body: data
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: '不明なエラー' }));
        throw new Error(errorData.detail || '生成に失敗しました');
      }

      const result = await response.json();
      setGeneratedImage(result.download_url);
      setPreviewMode(false);
      // プレビューモード終了時にtextBoundsをリセット
      const bounds = calculateTextBounds();
      setTextBounds(bounds);
      console.log('Preview ended, textBounds reset:', bounds);
      loadGallery();
    } catch (error) {
      console.error('Error:', error);
      alert('生成中にエラーが発生しました: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const loadGallery = async () => {
    try {
      const response = await fetch('http://localhost:8000/gallery');
      if (response.ok) {
        const data = await response.json();
        setGallery(data.images || []);
      }
    } catch (error) {
      console.error('Gallery loading error:', error);
    }
  };

  const downloadImage = (url, filename) => {
    const link = document.createElement('a');
    link.href = `http://localhost:8000${url}`;
    link.download = filename;
    link.click();
  };

  // 人気の絵文字一覧
  const popularEmojis = [
    '😂', '😍', '😘', '😊', '😉', '😁', '😋', '😀',
    '😅', '😆', '😄', '😃', '😢', '😭', '😱', '😨',
    '😡', '😠', '😤', '😣', '😎', '😌', '😒', '😏',
    '😓', '😔', '😲', '😕', '😐', '😑', '😮', '🙄',
    '😥', '😰', '😯', '😴', '😵', '😷', '😻', '😼',
    '🐶', '🐱', '🐹', '🐰', '🐻', '🐼', '🐨', '🐯',
    '🦁', '🐸', '🐵', '🐒', '🐔', '🐧', '🐦', '🐤',
    '🐝', '🐛', '🐌', '🐞', '🐜', '🐚', '🐙', '🐠',
    '❤️', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔',
    '✨', '🎆', '🎉', '🎈', '🎇', '🎅', '🎄', '🎂',
    '🔥', '👍', '👎', '👏', '🙏', '✌️', '🤞', '👊',
    '✅', '❌', '❓', '❗', '💯', '🔝', '🔞', '🚫'
  ];

  const EmojiPicker = () => {
    if (!showEmojiPicker) return null;

    return (
      <div className="emoji-picker-overlay" onClick={() => setShowEmojiPicker(false)}>
        <div className="emoji-picker" onClick={e => e.stopPropagation()}>
          <div className="emoji-picker-header">
            <h3>絵文字を選んでください</h3>
            <button 
              className="emoji-picker-close"
              onClick={() => setShowEmojiPicker(false)}
            >
              ×
            </button>
          </div>
          <div className="emoji-grid">
            {popularEmojis.map((emoji, index) => (
              <button
                key={index}
                className="emoji-item"
                onClick={() => handleEmojiSelect(emoji)}
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  React.useEffect(() => {
    loadGallery();
  }, []);

  React.useEffect(() => {
    // プレビューモード中でも、手動でサイズを変更した場合はtextBoundsを更新
    // ただし、リサイズ中は手動更新を避ける（マウス操作中の競合を防ぐ）
    if ((formData.text || formData.emoji) && !isResizing) {
      const newBounds = calculateTextBounds();
      setTextBounds(newBounds);
      console.log('textBounds updated due to form change (not during resize):', newBounds);
    }
  }, [formData.fontSize, formData.emojiSize, formData.text, formData.emoji, isResizing]);

  // グローバルマウスイベントリスナー
  React.useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      console.log('Global mouse move detected', { isDragging, isResizing });
      if (isDragging || isResizing) {
        handleMouseMove(e);
      }
    };

    const handleGlobalMouseUp = () => {
      console.log('Global mouse up detected', { isDragging, isResizing });
      if (isDragging || isResizing) {
        console.log('Global mouse up - stopping drag/resize');
        
        // 操作終了後にtextBoundsを再計算して同期
        const finalBounds = calculateTextBounds();
        setTextBounds(finalBounds);
        console.log('Final textBounds after mouse up:', finalBounds);
        
        setIsDragging(false);
        setIsResizing(false);
        setResizeDirection('');
      }
    };

    if (previewMode && (isDragging || isResizing)) {
      console.log('Adding global mouse listeners');
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        console.log('Removing global mouse listeners');
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [previewMode, isDragging, isResizing, dragOffset, initialMousePos, initialSize, formData]);

  return (
    <div className="App">
      <div className="container">
        <h1>🐱 Hirsakam Icon Generator</h1>
        
        <div className="main-content">
          <div className="form-section">
            <h2>設定</h2>
            
            <div className="form-group">
              <label>ベース画像（オプション）:</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="file-input"
              />
              {baseImage && (
                <div className="uploaded-image-info">
                  選択済み: {baseImage.name}
                </div>
              )}
            </div>

            <div className="form-group">
              <label>テキスト:</label>
              <input
                type="text"
                name="text"
                value={formData.text}
                onChange={handleInputChange}
                placeholder="カスタムテキストを入力"
                className="text-input"
              />
            </div>

            <div className="form-group">
              <label>テキストの色:</label>
              <div className="color-input-container">
                <input
                  type="color"
                  name="textColor"
                  value={formData.textColor}
                  onChange={handleInputChange}
                  className="color-input"
                />
                <span className="color-preview" style={{ backgroundColor: formData.textColor }}></span>
                <span className="color-value">{formData.textColor}</span>
              </div>
            </div>

            <div className="form-group">
              <label>絵文字:</label>
              <div className="emoji-input-container">
                <input
                  type="text"
                  name="emoji"
                  value={formData.emoji}
                  onChange={handleInputChange}
                  placeholder="絵文字を選んでください"
                  className="text-input emoji-display"
                  readOnly
                />
                <button
                  type="button"
                  className="emoji-picker-button"
                  onClick={() => setShowEmojiPicker(true)}
                >
                  😊 選ぶ
                </button>
                {formData.emoji && (
                  <button
                    type="button"
                    className="emoji-clear-button"
                    onClick={() => setFormData(prev => ({ ...prev, emoji: '' }))}
                  >
                    クリア
                  </button>
                )}
              </div>
            </div>

            <div className="position-controls">
              <h3>位置設定</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>X座標:</label>
                  <input
                    type="number"
                    name="x"
                    value={formData.x}
                    onChange={handleInputChange}
                    className="number-input"
                  />
                </div>
                <div className="form-group">
                  <label>Y座標:</label>
                  <input
                    type="number"
                    name="y"
                    value={formData.y}
                    onChange={handleInputChange}
                    className="number-input"
                  />
                </div>
              </div>
            </div>

            <div className="size-controls">
              <h3>サイズ設定</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>フォントサイズ:</label>
                  <input
                    type="number"
                    name="fontSize"
                    value={formData.fontSize}
                    onChange={handleInputChange}
                    className="number-input"
                  />
                </div>
                <div className="form-group">
                  <label>絵文字サイズ:</label>
                  <input
                    type="number"
                    name="emojiSize"
                    value={formData.emojiSize}
                    onChange={handleInputChange}
                    className="number-input"
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={startPreview} 
              disabled={!formData.text && !formData.emoji}
              className="preview-button-single"
            >
              プレビュー
            </button>
          </div>

          <div className="result-section">
            <h2>{previewMode ? 'プレビュー（ドラッグで位置・四隅の○でサイズ調整）' : '生成結果'}</h2>
            {previewMode ? (
              <div className="preview-container">
                <div 
                  className="preview-canvas"
                  ref={previewRef}
                  onWheel={handleWheel}
                >
                  <img 
                    ref={imageRef}
                    src={getBaseImageUrl()} 
                    alt="ベース画像"
                    className="base-preview-image"
                    draggable={false}
                    onLoad={handleImageLoad}
                  />
                  <div 
                    className="text-overlay-container"
                    style={{
                      left: Math.max(0, formData.x - (Math.max(textBounds.width, 50) + 40) / 2),
                      top: Math.max(0, formData.y - (Math.max(textBounds.height, 50) + 40) / 2),
                      width: Math.min(500, Math.max(textBounds.width, 50) + 40),
                      height: Math.min(500, Math.max(textBounds.height, 50) + 40),
                      cursor: isDragging ? 'grabbing' : 'grab',
                      userSelect: 'none'
                    }}
                    onMouseDown={(e) => {
                      console.log('TEXT CONTAINER CLICKED!');
                      e.stopPropagation();
                      handleMouseDown(e);
                    }}
                  >
                    <div className="bounding-box">
                      <div 
                        className="text-overlay"
                        style={{
                          fontSize: formData.emoji ? `${formData.emojiSize}px` : `${formData.fontSize}px`,
                          color: formData.text ? formData.textColor : 'inherit',
                          pointerEvents: 'none', // リサイズハンドルのクリックを妨げない
                          maxWidth: formData.text ? '400px' : 'none',
                          wordWrap: 'break-word',
                          overflowWrap: 'break-word',
                          hyphens: 'auto',
                          lineHeight: '1.2',
                          // テキストが長い場合のみ改行を許可
                          whiteSpace: (() => {
                            if (!formData.text) return 'nowrap';
                            const fontSize = formData.fontSize;
                            const charWidth = fontSize * 0.6;
                            const totalWidth = formData.text.length * charWidth;
                            return totalWidth > 400 ? 'normal' : 'nowrap';
                          })()
                        }}
                      >
                        {formData.emoji || formData.text}
                      </div>
                      
                      {/* 四隅のリサイズハンドル */}
                      <div 
                        className="resize-handle corner-nw"
                        onMouseDown={(e) => {
                          console.log('RESIZE HANDLE NW CLICKED!');
                          e.stopPropagation();
                          handleResizeMouseDown(e, 'nw');
                        }}
                      />
                      <div 
                        className="resize-handle corner-ne"
                        onMouseDown={(e) => {
                          console.log('RESIZE HANDLE NE CLICKED!');
                          e.stopPropagation();
                          handleResizeMouseDown(e, 'ne');
                        }}
                      />
                      <div 
                        className="resize-handle corner-sw"
                        onMouseDown={(e) => {
                          console.log('RESIZE HANDLE SW CLICKED!');
                          e.stopPropagation();
                          handleResizeMouseDown(e, 'sw');
                        }}
                      />
                      <div 
                        className="resize-handle corner-se"
                        onMouseDown={(e) => {
                          console.log('RESIZE HANDLE SE CLICKED!');
                          e.stopPropagation();
                          handleResizeMouseDown(e, 'se');
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="preview-info">
                  <div className="current-settings">
                    <span>位置: ({Math.round(formData.x)}, {Math.round(formData.y)})</span>
                    <span>
                      {formData.emoji 
                        ? `絵文字サイズ: ${formData.emojiSize}px` 
                        : `フォントサイズ: ${formData.fontSize}px`
                      }
                    </span>
                  </div>
                </div>
                <div className="preview-controls">
                  <button 
                    onClick={() => {
                      setPreviewMode(false);
                      // プレビューモード終了時にtextBoundsをリセット
                      const bounds = calculateTextBounds();
                      setTextBounds(bounds);
                      console.log('Preview ended via back button, textBounds reset:', bounds);
                    }}
                    className="back-button"
                  >
                    戻る
                  </button>
                  <button 
                    onClick={generateIcon} 
                    disabled={isGenerating}
                    className="generate-from-preview-button"
                  >
                    {isGenerating ? '生成中...' : 'この位置で生成'}
                  </button>
                </div>
              </div>
            ) : generatedImage ? (
              <div className="generated-image">
                <img 
                  src={`http://localhost:8000${generatedImage}`} 
                  alt="生成されたアイコン"
                  className="result-image"
                />
                <button 
                  onClick={() => downloadImage(generatedImage, 'hirsakam_icon.jpg')}
                  className="download-button"
                >
                  ダウンロード
                </button>
              </div>
            ) : (
              <div className="default-preview">
                <img 
                  ref={imageRef}
                  src={getBaseImageUrl()}
                  alt="ベース画像（hirsakam.jpg）"
                  className="default-base-image"
                  onLoad={handleImageLoad}
                />
                <p className="default-instruction">
                  テキストや絵文字を入力して「プレビュー」ボタンを押してください
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="gallery-section">
          <h2>ギャラリー</h2>
          <div className="gallery-grid">
            {gallery.map((image, index) => (
              <div key={index} className="gallery-item">
                <img 
                  src={`http://localhost:8000${image.url}`} 
                  alt={`Gallery item ${index + 1}`}
                  className="gallery-image"
                />
                <button 
                  onClick={() => downloadImage(image.url, image.filename)}
                  className="gallery-download"
                >
                  ダウンロード
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <EmojiPicker />
    </div>
  );
}

export default App;
