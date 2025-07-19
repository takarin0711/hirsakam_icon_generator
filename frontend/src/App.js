import React, { useState, useRef } from 'react';
import './App.css';

function App() {
  const [formData, setFormData] = useState({
    text: '',
    emoji: '',
    fontSize: 48,
    emojiSize: 164,
    textColor: '#ffffff'
  });
  
  // テキストと絵文字の個別位置と回転
  const [textPosition, setTextPosition] = useState({ x: 260, y: 100 });
  const [emojiPosition, setEmojiPosition] = useState({ x: 260, y: 180 });
  const [textRotation, setTextRotation] = useState(0);
  const [emojiRotation, setEmojiRotation] = useState(0);
  const [emojiFlipHorizontal, setEmojiFlipHorizontal] = useState(false);
  
  // 現在操作中の要素
  const [activeElement, setActiveElement] = useState(null); // 'text', 'emoji', null
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
  
  // Drawing states
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingMode, setDrawingMode] = useState(false);
  const [drawingColor, setDrawingColor] = useState('#ff0000');
  const [drawingThickness, setDrawingThickness] = useState(5);
  const [drawingHistory, setDrawingHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [canvasReady, setCanvasReady] = useState(false);
  
  // 最新の描画履歴への参照
  const drawingHistoryRef = useRef([]);
  const historyIndexRef = useRef(-1);
  
  // refを最新の状態に同期
  React.useEffect(() => {
    drawingHistoryRef.current = drawingHistory;
    historyIndexRef.current = historyIndex;
  }, [drawingHistory, historyIndex]);
  
  // Overlay image states
  const [overlayImages, setOverlayImages] = useState([]);
  const [selectedOverlayIndex, setSelectedOverlayIndex] = useState(-1);
  const [isOverlayDragging, setIsOverlayDragging] = useState(false);
  const [isOverlayResizing, setIsOverlayResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [rotatingElement, setRotatingElement] = useState(null); // 'text', 'emoji', or overlay index
  const [initialAngle, setInitialAngle] = useState(0);
  const [rotationCenter, setRotationCenter] = useState({ x: 0, y: 0 });
  
  // 画像圧縮の状態
  const [imageCompressionInfo, setImageCompressionInfo] = useState(null);
  
  // レイヤー順序管理
  const [layerOrder, setLayerOrder] = useState(['text', 'emoji', 'overlay']); // ベース画像が最下位、フリーハンド描画が最上位（固定）
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [isDraggingLayer, setIsDraggingLayer] = useState(false);
  const [draggedLayerIndex, setDraggedLayerIndex] = useState(-1);
  
  // ギャラリーソート順管理
  const [gallerySortOrder, setGallerySortOrder] = useState('desc'); // 'desc' = 新しい順, 'asc' = 古い順
  
  // ギャラリーページング管理
  const [galleryPagination, setGalleryPagination] = useState({
    offset: 0,
    limit: 16,
    total: 0,
    has_next: false,
    has_prev: false
  });
  const [currentPage, setCurrentPage] = useState(1);
  
  // トリミングモード（独立したモード）
  const [trimmingMode, setTrimmingMode] = useState(false);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isCropping, setIsCropping] = useState(false);
  const [cropStartPos, setCropStartPos] = useState({ x: 0, y: 0 });
  const [croppedBaseImage, setCroppedBaseImage] = useState(null);
  
  // ガチャ機能
  const [showGachaModal, setShowGachaModal] = useState(false);
  const [gachaResult, setGachaResult] = useState(null);
  const [isGachaDrawing, setIsGachaDrawing] = useState(false);
  
  // 10連ガチャ機能
  const [showGachaTenModal, setShowGachaTenModal] = useState(false);
  const [gachaTenResults, setGachaTenResults] = useState([]);
  const [isGachaTenDrawing, setIsGachaTenDrawing] = useState(false);
  
  // Slack共有機能
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareType, setShareType] = useState('single'); // 'single' または 'ten'
  const [shareChannel, setShareChannel] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [shareResult, setShareResult] = useState(null);
  
  
  const previewRef = useRef(null);
  const imageRef = useRef(null);
  const drawingCanvasRef = useRef(null);
  const drawingContextRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // レイヤー順序管理関数
  const getLayerZIndex = (layerType) => {
    const baseZIndex = 10;
    const index = layerOrder.indexOf(layerType);
    if (index < 0) return baseZIndex;
    // 配列の後ろほど上位レイヤー（高いz-index）
    return baseZIndex + index;
  };

  const handleLayerDragStart = (e, index) => {
    setIsDraggingLayer(true);
    setDraggedLayerIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
  };

  const handleLayerDragOver = (e) => {
    if (isDraggingLayer) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleLayerDrop = (e, dropIndex) => {
    e.preventDefault();
    if (isDraggingLayer && draggedLayerIndex !== -1) {
      const newLayerOrder = [...layerOrder];
      const draggedLayer = newLayerOrder[draggedLayerIndex];
      
      // 要素を削除して新しい位置に挿入
      newLayerOrder.splice(draggedLayerIndex, 1);
      newLayerOrder.splice(dropIndex, 0, draggedLayer);
      
      setLayerOrder(newLayerOrder);
      setIsDraggingLayer(false);
      setDraggedLayerIndex(-1);
    }
  };

  const handleLayerDragEnd = () => {
    setIsDraggingLayer(false);
    setDraggedLayerIndex(-1);
  };

  const getLayerName = (layerType) => {
    switch (layerType) {
      case 'text': return 'テキスト';
      case 'emoji': return '絵文字';
      case 'overlay': return 'オーバーレイ画像';
      default: return layerType;
    }
  };

  const handleEmojiSelect = (emoji) => {
    setFormData(prev => ({
      ...prev,
      emoji: emoji
      // テキストは保持（自動クリアを削除）
    }));
    setShowEmojiPicker(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        // ファイルサイズをチェック
        const fileSizeKB = file.size / 1024;
        console.log(`ベース画像サイズ: ${fileSizeKB.toFixed(1)}KB`);
        
        // 1MB以上の場合は圧縮
        let processedFile = file;
        let compressionInfo = null;
        
        if (fileSizeKB > 1000) {
          console.log('ベース画像のファイルサイズが大きいため圧縮を開始...');
          processedFile = await compressImage(file, 1000);
          const compressedSizeKB = processedFile.size / 1024;
          console.log(`圧縮後サイズ: ${compressedSizeKB.toFixed(1)}KB`);
          
          compressionInfo = {
            original: fileSizeKB.toFixed(1),
            compressed: compressedSizeKB.toFixed(1),
            reduction: ((fileSizeKB - compressedSizeKB) / fileSizeKB * 100).toFixed(1)
          };
        }
        
        setImageCompressionInfo(compressionInfo);
        setBaseImage(processedFile);
      } catch (error) {
        console.error('ベース画像の処理中にエラーが発生しました:', error);
        alert('ベース画像の処理中にエラーが発生しました。別の画像を試してください。');
      }
    }
  };

  const compressImage = (file, maxSizeKB = 800) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // 最大解像度を設定（ファイルサイズ削減のため）
        const maxDimension = 800;
        let { width, height } = img;
        
        // アスペクト比を維持してリサイズ
        if (width > height) {
          if (width > maxDimension) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // 画像を描画
        ctx.drawImage(img, 0, 0, width, height);
        
        // 品質を調整してファイルサイズを制限
        let quality = 0.8;
        const tryCompress = () => {
          canvas.toBlob((blob) => {
            const sizeKB = blob.size / 1024;
            console.log(`圧縮結果: ${sizeKB.toFixed(1)}KB (目標: ${maxSizeKB}KB以下, 品質: ${quality})`);
            
            if (sizeKB <= maxSizeKB || quality <= 0.3) {
              // ファイルサイズが目標以下、または品質が最低レベルの場合は完了
              resolve(blob);
            } else {
              // 品質を下げて再試行
              quality -= 0.1;
              tryCompress();
            }
          }, 'image/jpeg', quality);
        };
        
        tryCompress();
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleOverlayImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        // ファイルサイズをチェック
        const fileSizeKB = file.size / 1024;
        console.log(`オリジナルファイルサイズ: ${fileSizeKB.toFixed(1)}KB`);
        
        // 800KB以上の場合は圧縮
        let processedFile = file;
        if (fileSizeKB > 800) {
          console.log('ファイルサイズが大きいため圧縮を開始...');
          processedFile = await compressImage(file, 800);
          console.log(`圧縮後サイズ: ${(processedFile.size / 1024).toFixed(1)}KB`);
        }
        
        const img = new Image();
        img.onload = () => {
          // 実際の画像のアスペクト比を維持して初期サイズを設定
          const maxSize = 150;
          let width, height;
          
          if (img.width > img.height) {
            // 横長の画像
            width = maxSize;
            height = (img.height / img.width) * maxSize;
          } else {
            // 縦長または正方形の画像
            height = maxSize;
            width = (img.width / img.height) * maxSize;
          }
          
          const newOverlay = {
            id: Date.now(),
            file: processedFile,
            url: URL.createObjectURL(processedFile),
            displayUrl: URL.createObjectURL(processedFile), // プレビュー用URL（初期値は元画像）
            x: 200,
            y: 150,
            width: width,
            height: height,
            originalWidth: img.width,
            originalHeight: img.height,
            opacity: 1,
            rotation: 0,
            removeBackground: false
          };
          setOverlayImages(prev => [...prev, newOverlay]);
          setSelectedOverlayIndex(overlayImages.length);
        };
        img.src = URL.createObjectURL(processedFile);
      } catch (error) {
        console.error('画像の処理中にエラーが発生しました:', error);
        alert('画像の処理中にエラーが発生しました。別の画像を試してください。');
      }
    }
  };

  const removeOverlayImage = (index) => {
    setOverlayImages(prev => {
      const newImages = prev.filter((_, i) => i !== index);
      if (selectedOverlayIndex === index) {
        setSelectedOverlayIndex(-1);
      } else if (selectedOverlayIndex > index) {
        setSelectedOverlayIndex(prev => prev - 1);
      }
      return newImages;
    });
  };

  const updateOverlayImage = (index, updates) => {
    setOverlayImages(prev => 
      prev.map((img, i) => {
        if (i === index) {
          const updated = { ...img, ...updates };
          // 背景透過フラグが変更された場合、透過処理されたURLを生成
          if (updates.hasOwnProperty('removeBackground')) {
            if (updates.removeBackground) {
              // 背景透過処理を適用（簡易版）
              processBackgroundRemoval(updated);
            } else {
              // 元の画像に戻す
              updated.displayUrl = updated.url;
            }
          }
          return updated;
        }
        return img;
      })
    );
  };

  // 簡易背景透過処理（プレビュー用）
  const processBackgroundRemoval = async (overlay) => {
    try {
      // Canvas を使って簡易的な背景透過処理
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        // 水平反転が有効な場合は変換を適用
        if (overlay.flipHorizontal) {
          ctx.scale(-1, 1);
          ctx.translate(-canvas.width, 0);
        }
        
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // 簡易的な背景透過処理（エッジの色を基準に）
        const corners = [
          [0, 0], // 左上
          [canvas.width - 1, 0], // 右上
          [0, canvas.height - 1], // 左下
          [canvas.width - 1, canvas.height - 1] // 右下
        ];
        
        // コーナーの色を取得して背景色を推定
        const bgColors = corners.map(([x, y]) => {
          const index = (y * canvas.width + x) * 4;
          return [data[index], data[index + 1], data[index + 2]];
        });
        
        // 最も多い色を背景色とする（簡易版）
        const bgColor = bgColors[0]; // 左上の色を背景色とする
        
        // 色の閾値
        const threshold = 30;
        
        // 各ピクセルをチェックして背景色に近い場合は透明にする
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // 背景色との差を計算
          const diff = Math.abs(r - bgColor[0]) + Math.abs(g - bgColor[1]) + Math.abs(b - bgColor[2]);
          
          if (diff < threshold) {
            data[i + 3] = 0; // アルファチャンネルを0（透明）にする
          }
        }
        
        // 背景透過処理後のイメージデータを再描画
        // 新しいキャンバスを作成して処理済みの画像を描画
        const finalCanvas = document.createElement('canvas');
        const finalCtx = finalCanvas.getContext('2d');
        
        finalCanvas.width = img.width;
        finalCanvas.height = img.height;
        
        finalCtx.putImageData(imageData, 0, 0);
        
        // 処理済み画像のURLを生成
        const processedUrl = finalCanvas.toDataURL('image/png');
        
        // オーバーレイ画像を更新
        setOverlayImages(prev => 
          prev.map(img => 
            img.id === overlay.id 
              ? { ...img, displayUrl: processedUrl }
              : img
          )
        );
      };
      
      img.src = overlay.url;
    } catch (error) {
      console.error('Background removal error:', error);
      // エラーの場合は元の画像を使用
      setOverlayImages(prev => 
        prev.map(img => 
          img.id === overlay.id 
            ? { ...img, displayUrl: img.url }
            : img
        )
      );
    }
  };

  // 角度計算のヘルパー関数
  const calculateAngle = (centerX, centerY, mouseX, mouseY) => {
    const deltaX = mouseX - centerX;
    const deltaY = mouseY - centerY;
    return Math.atan2(deltaY, deltaX) * (180 / Math.PI);
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
    
    return bounds;
  };

  const handleImageLoad = () => {
    if (imageRef.current) {
      // 実際の画像サイズと表示サイズの比率を計算
      const naturalWidth = imageRef.current.naturalWidth;
      const displayWidth = imageRef.current.clientWidth;
      const scale = naturalWidth / displayWidth;
      setImageScale(scale);
      
      // プレビューモード中でキャンバスが存在する場合、既存の描画を保持してサイズ調整
      if (previewMode && drawingCanvasRef.current) {
        setTimeout(() => {
          if (drawingCanvasRef.current && imageRef.current) {
            const canvas = drawingCanvasRef.current;
            const context = canvas.getContext('2d');
            
            const newWidth = imageRef.current.clientWidth;
            const newHeight = imageRef.current.clientHeight;
            
            // 既存の描画内容を保存
            let savedDrawing = null;
            if (canvas.width > 0 && canvas.height > 0) {
              try {
                savedDrawing = canvas.toDataURL();
              } catch (e) {
                // エラーは無視
              }
            }
            
            // キャンバスサイズを設定
            canvas.width = newWidth;
            canvas.height = newHeight;
            
            // コンテキスト設定を適用
            context.lineCap = 'round';
            context.lineJoin = 'round';
            context.globalCompositeOperation = 'source-over';
            context.strokeStyle = drawingColor;
            context.lineWidth = drawingThickness;
            
            drawingContextRef.current = context;
            
            // 既存の描画を復元
            if (savedDrawing) {
              const img = new Image();
              img.onload = () => {
                try {
                  context.drawImage(img, 0, 0, newWidth, newHeight);
                } catch (e) {
                  // エラーは無視
                }
                setCanvasReady(true);
              };
              img.src = savedDrawing;
            } else {
              setCanvasReady(true);
            }
          }
        }, 200);
      }
    }
  };

  const initializeDrawingCanvas = (preserveHistory = false) => {
    if (drawingCanvasRef.current && imageRef.current) {
      const canvas = drawingCanvasRef.current;
      const context = canvas.getContext('2d');
      
      const clientWidth = imageRef.current.clientWidth;
      const clientHeight = imageRef.current.clientHeight;
      
      // サイズが0の場合は再試行
      if (clientWidth === 0 || clientHeight === 0) {
        setTimeout(() => initializeDrawingCanvas(preserveHistory), 500);
        return;
      }
      
      // 既存の描画を保存（preserveHistoryが有効で既に描画がある場合）
      let savedDrawing = null;
      if (preserveHistory && canvas.width > 0 && canvas.height > 0) {
        try {
          savedDrawing = canvas.toDataURL();
        } catch (e) {
          // エラーは無視
        }
      }
      
      canvas.width = clientWidth;
      canvas.height = clientHeight;
      
      // コンテキストの設定
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.globalCompositeOperation = 'source-over';
      context.strokeStyle = drawingColor;
      context.lineWidth = drawingThickness;
      
      drawingContextRef.current = context;
      
      // 履歴をクリア（履歴保持フラグがfalseの場合のみ）
      if (!preserveHistory) {
        setDrawingHistory([]);
        setHistoryIndex(-1);
      }
      
      // 保存された描画を復元
      if (savedDrawing) {
        const img = new Image();
        img.onload = () => {
          try {
            context.drawImage(img, 0, 0, clientWidth, clientHeight);
          } catch (e) {
            // エラーは無視
          }
          setCanvasReady(true);
        };
        img.src = savedDrawing;
      } else {
        setTimeout(() => {
          setCanvasReady(true);
        }, 100);
      }
    } else {
      setCanvasReady(false);
    }
  };

  const saveToHistory = () => {
    if (!drawingCanvasRef.current) {
      return;
    }
    
    const canvas = drawingCanvasRef.current;
    
    // キャンバスが有効でない場合は保存をスキップ
    if (canvas.width === 0 || canvas.height === 0) {
      return;
    }
    
    try {
      const imageData = canvas.toDataURL();
      
      
      // 状態の更新を一つの関数でまとめて実行
      setDrawingHistory(prev => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push(imageData);
        // historyIndexも同時に更新
        setTimeout(() => setHistoryIndex(newHistory.length - 1), 0);
        return newHistory;
      });
    } catch (error) {
      console.error('Failed to save canvas to history:', error);
    }
  };

  const undo = () => {
    if (historyIndex > 0 && drawingHistory.length > 1) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      restoreFromHistory(newIndex);
    }
  };

  const redo = () => {
    if (historyIndex < drawingHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      restoreFromHistory(newIndex);
    }
  };

  const restoreFromHistory = (index) => {
    if (!drawingCanvasRef.current || !drawingHistory[index]) return;
    
    const canvas = drawingCanvasRef.current;
    const context = drawingContextRef.current;
    const img = new Image();
    
    img.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, 0, 0);
    };
    img.src = drawingHistory[index];
  };

  // 回転処理
  const handleRotationStart = (e, elementType, elementIndex = null) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = imageRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    let centerX, centerY, currentRotation;
    
    if (elementType === 'text') {
      centerX = textPosition.x;
      centerY = textPosition.y;
      currentRotation = textRotation;
    } else if (elementType === 'emoji') {
      centerX = emojiPosition.x;
      centerY = emojiPosition.y;
      currentRotation = emojiRotation;
    } else if (typeof elementType === 'number') {
      // オーバーレイ画像
      const overlay = overlayImages[elementType];
      centerX = overlay.x;
      centerY = overlay.y;
      currentRotation = overlay.rotation || 0;
    }
    
    const initialMouseAngle = calculateAngle(centerX, centerY, mouseX, mouseY);
    
    setIsRotating(true);
    setRotatingElement(elementType);
    setInitialAngle(initialMouseAngle - currentRotation);
    setRotationCenter({ x: centerX, y: centerY });
  };

  const handleRotationMove = (e) => {
    if (!isRotating || !imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const currentMouseAngle = calculateAngle(rotationCenter.x, rotationCenter.y, mouseX, mouseY);
    let newRotation = currentMouseAngle - initialAngle;
    
    // -180 to 180 の範囲に正規化
    while (newRotation > 180) newRotation -= 360;
    while (newRotation < -180) newRotation += 360;
    
    if (rotatingElement === 'text') {
      setTextRotation(Math.round(newRotation));
    } else if (rotatingElement === 'emoji') {
      setEmojiRotation(Math.round(newRotation));
    } else if (typeof rotatingElement === 'number') {
      updateOverlayImage(rotatingElement, { rotation: Math.round(newRotation) });
    }
  };

  const handleRotationEnd = () => {
    setIsRotating(false);
    setRotatingElement(null);
    setInitialAngle(0);
    setRotationCenter({ x: 0, y: 0 });
  };

  // トリミング機能
  const handleCropMouseDown = (e) => {
    if (!trimmingMode || !imageRef.current || !previewRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = previewRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsCropping(true);
    setCropStartPos({ x, y });
    setCropArea({ x, y, width: 0, height: 0 });
  };

  const handleCropMouseMove = (e) => {
    if (!trimmingMode || !isCropping || !previewRef.current) return;
    
    // previewRef基準の座標を使用
    const rect = previewRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    const width = currentX - cropStartPos.x;
    const height = currentY - cropStartPos.y;
    
    const newCropArea = {
      x: width > 0 ? cropStartPos.x : currentX,
      y: height > 0 ? cropStartPos.y : currentY,
      width: Math.abs(width),
      height: Math.abs(height)
    };
    
    // ログを間引く（10px以上変化した時のみ）
    if (Math.abs(newCropArea.width - cropArea.width) > 10 || Math.abs(newCropArea.height - cropArea.height) > 10) {
      console.log('Crop area updated:', newCropArea);
    }
    setCropArea(newCropArea);
  };

  const handleCropMouseUp = () => {
    if (!trimmingMode) return;
    setIsCropping(false);
  };

  const confirmCrop = async () => {
    // トリミング範囲が有効かチェック
    if (cropArea.width < 10 || cropArea.height < 10) {
      alert('トリミング範囲が小さすぎます。もう少し大きな範囲を選択してください。');
      return;
    }
    
    try {
      const displayImg = imageRef.current;
      
      // 画像が存在し、完全に読み込まれているかチェック
      if (!displayImg || !displayImg.complete || displayImg.naturalWidth === 0) {
        alert('画像が読み込まれていません。しばらく待ってから再試行してください。');
        return;
      }
      
      // previewRefとimageRefの境界の差を計算
      const previewRect = previewRef.current.getBoundingClientRect();
      const imageRect = displayImg.getBoundingClientRect();
      
      // previewRef基準の座標をimageRef基準に変換
      const offsetX = imageRect.left - previewRect.left;
      const offsetY = imageRect.top - previewRect.top;
      
      // 画像領域内の座標に変換
      const imageRelativeX = cropArea.x - offsetX;
      const imageRelativeY = cropArea.y - offsetY;
      
      // スケール計算
      const scaleX = displayImg.naturalWidth / displayImg.clientWidth;
      const scaleY = displayImg.naturalHeight / displayImg.clientHeight;
      
      // 実際の画像座標に変換
      const actualCropX = Math.max(0, Math.round(imageRelativeX * scaleX));
      const actualCropY = Math.max(0, Math.round(imageRelativeY * scaleY));
      const actualCropWidth = Math.min(displayImg.naturalWidth - actualCropX, Math.round(cropArea.width * scaleX));
      const actualCropHeight = Math.min(displayImg.naturalHeight - actualCropY, Math.round(cropArea.height * scaleY));
      
      // 有効な範囲かチェック
      if (actualCropWidth <= 0 || actualCropHeight <= 0) {
        alert('無効なトリミング範囲です。');
        return;
      }
      
      // サーバーにトリミングリクエストを送信
      const formData = new FormData();
      
      // ベース画像をFormDataに追加
      if (baseImage) {
        formData.append('base_image', baseImage);
      }
      
      // トリミング範囲をFormDataに追加
      formData.append('crop_x', actualCropX.toString());
      formData.append('crop_y', actualCropY.toString());
      formData.append('crop_width', actualCropWidth.toString());
      formData.append('crop_height', actualCropHeight.toString());
      
      const response = await fetch(`${getApiBaseUrl()}/crop`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`サーバーエラー: ${response.status} - ${errorText}`);
      }
      
      // レスポンスをBlobとして取得
      const blob = await response.blob();
      
      // FileオブジェクトとしてベースImageに設定
      const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });
      
      setCroppedBaseImage(file);
      setBaseImage(file);
      
      // トリミングモードを終了
      setTrimmingMode(false);
      setCropArea({ x: 0, y: 0, width: 0, height: 0 });
      setIsCropping(false);
      
    } catch (error) {
      alert(`トリミング中にエラーが発生しました: ${error.message}`);
    }
  };

  const cancelCrop = () => {
    setTrimmingMode(false);
    setCropArea({ x: 0, y: 0, width: 0, height: 0 });
    setIsCropping(false);
  };

  // ガチャ機能
  const drawGacha = async () => {
    if (isGachaDrawing) return;
    
    try {
      setIsGachaDrawing(true);
      setShowGachaModal(true);
      setGachaResult(null);
      
      const response = await fetch(`${getApiBaseUrl()}/gacha`);
      if (!response.ok) {
        throw new Error(`サーバーエラー: ${response.status}`);
      }
      
      const result = await response.json();
      
      // 少し演出のための遅延
      setTimeout(() => {
        setGachaResult(result);
        setIsGachaDrawing(false);
      }, 1500);
      
    } catch (error) {
      console.error('ガチャエラー:', error);
      alert(`ガチャでエラーが発生しました: ${error.message}`);
      setShowGachaModal(false);
      setIsGachaDrawing(false);
    }
  };

  const closeGachaModal = () => {
    setShowGachaModal(false);
    setGachaResult(null);
    setIsGachaDrawing(false);
  };

  const drawGachaTen = async () => {
    if (isGachaTenDrawing) return;
    
    try {
      setIsGachaTenDrawing(true);
      setShowGachaTenModal(true);
      setGachaTenResults([]);
      
      const response = await fetch(`${getApiBaseUrl()}/gacha-ten`);
      if (!response.ok) {
        throw new Error(`サーバーエラー: ${response.status}`);
      }
      
      const result = await response.json();
      
      // 少し演出のための遅延
      setTimeout(() => {
        setGachaTenResults(result.results);
        setIsGachaTenDrawing(false);
      }, 2000);
      
    } catch (error) {
      console.error('10連ガチャエラー:', error);
      alert(`10連ガチャでエラーが発生しました: ${error.message}`);
      setShowGachaTenModal(false);
      setIsGachaTenDrawing(false);
    }
  };

  const closeGachaTenModal = () => {
    setShowGachaTenModal(false);
    setGachaTenResults([]);
    setIsGachaTenDrawing(false);
  };

  // Slack共有機能
  const openShareModal = (type) => {
    setShareType(type);
    setShowShareModal(true);
    setShareChannel(process.env.SLACK_DEFAULT_CHANNEL || '#tmp-hirsakam-icon-generator');
    
    // デフォルトメッセージを設定
    if (type === 'single' && gachaResult) {
      setShareMessage(`ガチャで${gachaResult.rarity}が出ました！🎰`);
    } else if (type === 'ten' && gachaTenResults.length > 0) {
      const rarities = gachaTenResults.map(r => r.rarity);
      const ssrCount = rarities.filter(r => r === 'SSR').length;
      const srCount = rarities.filter(r => r === 'SR').length;
      setShareMessage(`10連ガチャ結果: SSR×${ssrCount}, SR×${srCount}枚！🎰✨`);
    }
    setShareResult(null);
  };

  const closeShareModal = () => {
    setShowShareModal(false);
    setShareChannel('');
    setShareMessage('');
    setIsSharing(false);
    setShareResult(null);
  };

  const captureGachaScreenshot = async () => {
    try {
      // html2canvasライブラリを使用してスクリーンショットを取得
      const { default: html2canvas } = await import('html2canvas');
      
      // ガチャモーダルの要素を取得
      const modalSelector = shareType === 'single' ? '.gacha-modal' : '.gacha-ten-modal';
      const modalElement = document.querySelector(modalSelector);
      
      if (!modalElement) {
        throw new Error('ガチャモーダルが見つかりません');
      }

      // スクリーンショット用の一時的なスタイルを追加
      const tempStyle = document.createElement('style');
      tempStyle.textContent = `
        .gacha-image-container {
          background: #ffffff !important;
          background-image: none !important;
        }
        .gacha-modal-overlay {
          background: transparent !important;
        }
      `;
      document.head.appendChild(tempStyle);

      try {
        // デバッグ用：撮影前に少し待機してスタイルを確認
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // デバッグ用：実際の背景色を確認
        const imageContainer = modalElement.querySelector('.gacha-image-container');
        if (imageContainer) {
          const computedStyle = window.getComputedStyle(imageContainer);
          console.log('スクリーンショット時の背景色:', computedStyle.background);
          console.log('スクリーンショット時の背景画像:', computedStyle.backgroundImage);
        }
        
        // スクリーンショットを取得
        const canvas = await html2canvas(modalElement, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: true,
          imageTimeout: 0,
          removeContainer: false,
          foreignObjectRendering: false,
          width: modalElement.offsetWidth,
          height: modalElement.offsetHeight,
          x: 0,
          y: 0
        });

        // 一時スタイルを削除
        document.head.removeChild(tempStyle);

        // 画像の濃度を調整
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // コントラストと明度を調整
        for (let i = 0; i < data.length; i += 4) {
          // RGB値を取得
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];
          
          // コントラストを上げる（1.2倍）
          r = Math.min(255, Math.max(0, (r - 128) * 1.2 + 128));
          g = Math.min(255, Math.max(0, (g - 128) * 1.2 + 128));
          b = Math.min(255, Math.max(0, (b - 128) * 1.2 + 128));
          
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        // デバッグ用：canvasの内容を確認
        console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
        
        // 撮影したcanvasを一時的にページに表示して確認（デバッグ用）
        const debugImg = document.createElement('img');
        debugImg.src = canvas.toDataURL();
        debugImg.style.position = 'fixed';
        debugImg.style.top = '10px';
        debugImg.style.right = '10px';
        debugImg.style.maxWidth = '200px';
        debugImg.style.maxHeight = '200px';
        debugImg.style.border = '2px solid red';
        debugImg.style.zIndex = '9999';
        document.body.appendChild(debugImg);
        
        // 5秒後にデバッグ画像を削除
        setTimeout(() => {
          if (document.body.contains(debugImg)) {
            document.body.removeChild(debugImg);
          }
        }, 5000);

        // Canvasをblobに変換
        return new Promise(resolve => {
          canvas.toBlob(resolve, 'image/png', 1.0);
        });
      } catch (error) {
        // エラー時も一時スタイルを削除
        if (document.head.contains(tempStyle)) {
          document.head.removeChild(tempStyle);
        }
        throw error;
      }
    } catch (error) {
      console.error('スクリーンショット取得エラー:', error);
      throw error;
    }
  };

  const shareToSlack = async () => {
    if (!shareChannel.trim() || !shareMessage.trim()) {
      setShareResult({ success: false, message: 'チャンネル名とメッセージを入力してください' });
      return;
    }

    setIsSharing(true);
    setShareResult(null);

    try {
      // スクリーンショットを取得
      const screenshotBlob = await captureGachaScreenshot();
      
      // FormDataを作成
      const formData = new FormData();
      formData.append('channel', shareChannel);
      formData.append('message', shareMessage);
      formData.append('screenshot', screenshotBlob, 'gacha_result.png');

      // APIに送信
      const response = await fetch(`${getApiBaseUrl()}/share-to-slack`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setShareResult({ success: true, message: result.message });
      } else {
        setShareResult({ success: false, message: result.detail || 'Slack送信に失敗しました' });
      }
    } catch (error) {
      console.error('Slack共有エラー:', error);
      setShareResult({ success: false, message: 'ネットワークエラーが発生しました' });
    } finally {
      setIsSharing(false);
    }
  };


  const clearDrawing = () => {
    if (!drawingCanvasRef.current) return;
    
    const canvas = drawingCanvasRef.current;
    const context = drawingContextRef.current;
    context.clearRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
  };

  const handleDrawingStart = (e) => {
    if (!drawingCanvasRef.current || !drawingContextRef.current) {
      return;
    }
    
    if (drawingCanvasRef.current) {
      const canvas = drawingCanvasRef.current;
      
      if (canvas.width === 0 || canvas.height === 0) {
        return;
      }
    }
    
    if (!drawingMode || !drawingCanvasRef.current) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    setIsDrawing(true);
    const canvas = drawingCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const context = drawingContextRef.current;
    if (!context) {
      return;
    }
    
    // 初回描画の準備（キャンバスをクリアしない）
    
    // 前回のパスをクリア
    context.closePath();
    
    // 描画設定を確実に適用
    context.strokeStyle = drawingColor;
    context.lineWidth = drawingThickness;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.globalCompositeOperation = 'source-over';
    
    
    // 新しいパスを開始
    context.beginPath();
    context.moveTo(x, y);
  };

  const handleDrawingMove = (e) => {
    if (!isDrawing || !drawingMode || !drawingCanvasRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const canvas = drawingCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const context = drawingContextRef.current;
    context.lineTo(x, y);
    context.stroke();
  };

  const handleDrawingEnd = () => {
    if (!isDrawing || !drawingMode) return;
    
    // 現在のパスを閉じる
    if (drawingContextRef.current) {
      drawingContextRef.current.closePath();
    }
    
    setIsDrawing(false);
    
    // 描画完了後に履歴に保存
    setTimeout(() => {
      if (drawingCanvasRef.current && drawingCanvasRef.current.width > 0) {
        // 初回描画の場合は空の状態と描画状態を同時に設定
        if (drawingHistory.length === 0) {
          const canvas = drawingCanvasRef.current;
          const emptyCanvas = document.createElement('canvas');
          emptyCanvas.width = canvas.width;
          emptyCanvas.height = canvas.height;
          const emptyData = emptyCanvas.toDataURL();
          const currentData = canvas.toDataURL();
          
          // 空の状態と描画状態を同時に履歴に追加
          setDrawingHistory([emptyData, currentData]);
          setHistoryIndex(1); // 描画状態をアクティブに
        } else {
          saveToHistory();
        }
      }
    }, 100);
  };

  const startPreview = () => {
    // テキストや絵文字がある場合のみtextBoundsを設定
    if (formData.text || formData.emoji) {
      const bounds = calculateTextBounds();
      setTextBounds(bounds);
    }
    // プレビュー開始時はオーバーレイの選択をクリア
    setSelectedOverlayIndex(-1);
    // キャンバス準備状態をリセット
    setCanvasReady(false);
    setPreviewMode(true);
  };

  const handleMouseDown = (e, elementType = null) => {
    if (!previewMode) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const canvasRect = previewRef.current.getBoundingClientRect();
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top;
    
    
    setIsDragging(true);
    setIsResizing(false);
    
    // 要素タイプに応じてドラッグオフセットを設定
    if (elementType === 'text') {
      setDragOffset({ x: x - textPosition.x, y: y - textPosition.y });
    } else if (elementType === 'emoji') {
      setDragOffset({ x: x - emojiPosition.x, y: y - emojiPosition.y });
    }
    
    setInitialMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleResizeMouseDown = (e, direction) => {
    if (!previewMode) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // リサイズ開始時に最新のtextBoundsを強制的に再計算
    const currentBounds = calculateTextBounds();
    setTextBounds(currentBounds);
    
    
    setIsResizing(true);
    setIsDragging(false); // ドラッグ状態をクリア
    // テキスト/絵文字操作時はオーバーレイ操作状態をクリアしない
    // setIsOverlayDragging(false);
    // setIsOverlayResizing(false);
    // setSelectedOverlayIndex(-1);
    setResizeDirection(direction);
    setInitialMousePos({ x: e.clientX, y: e.clientY });
    setInitialSize(activeElement === 'emoji' ? formData.emojiSize : formData.fontSize);
  };

  const handleOverlayMouseDown = (e, overlayIndex) => {
    if (!previewMode) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    
    setSelectedOverlayIndex(overlayIndex);
    setActiveElement(null); // テキスト・絵文字の選択を解除
    setIsOverlayDragging(true);
    setIsOverlayResizing(false); // リサイズ状態をクリア
    
    const canvasRect = previewRef.current.getBoundingClientRect();
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top;
    const overlay = overlayImages[overlayIndex];
    
    setDragOffset({ x: x - overlay.x, y: y - overlay.y });
  };

  const handleOverlayResizeMouseDown = (e, overlayIndex, direction) => {
    if (!previewMode) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setSelectedOverlayIndex(overlayIndex);
    setIsOverlayResizing(true);
    setIsOverlayDragging(false); // ドラッグ状態をクリア
    setResizeDirection(direction);
    setInitialMousePos({ x: e.clientX, y: e.clientY });
    
    const overlay = overlayImages[overlayIndex];
    setInitialSize(overlay.width);
  };

  const handleMouseMove = (e) => {
    if (!previewMode) return;
    
    if (isOverlayDragging && selectedOverlayIndex >= 0 && previewRef.current) {
      const rect = previewRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - dragOffset.x;
      const y = e.clientY - rect.top - dragOffset.y;
      
      // 境界制限を削除して自由に移動可能に
      updateOverlayImage(selectedOverlayIndex, { x: x, y: y });
    } else if (isOverlayResizing && selectedOverlayIndex >= 0) {
      const deltaX = e.clientX - initialMousePos.x;
      const deltaY = e.clientY - initialMousePos.y;
      
      
      let sizeDelta = 0;
      
      // コーナーに応じてサイズ変更の方向を決定（感度を上げる）
      switch (resizeDirection) {
        case 'nw': // 左上
          sizeDelta = -(deltaX + deltaY) / 1.5;
          break;
        case 'ne': // 右上
          sizeDelta = (deltaX - deltaY) / 1.5;
          break;
        case 'sw': // 左下
          sizeDelta = (-deltaX + deltaY) / 1.5;
          break;
        case 'se': // 右下
          sizeDelta = (deltaX + deltaY) / 1.5;
          break;
        default:
          sizeDelta = (deltaX + deltaY) / 1.5;
      }
      
      const currentOverlay = overlayImages[selectedOverlayIndex];
      // 元の画像のアスペクト比を使用（より正確）
      const aspectRatio = currentOverlay.originalHeight && currentOverlay.originalWidth 
        ? currentOverlay.originalHeight / currentOverlay.originalWidth 
        : currentOverlay.height / currentOverlay.width;
      const newWidth = Math.max(20, Math.min(500, initialSize + sizeDelta));
      const newHeight = newWidth * aspectRatio;
      
      updateOverlayImage(selectedOverlayIndex, { 
        width: newWidth, 
        height: newHeight 
      });
    } else if (isDragging && previewRef.current) {
      const rect = previewRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - dragOffset.x;
      const y = e.clientY - rect.top - dragOffset.y;
      
      // 境界制限を削除して自由に移動可能に
      
      // アクティブな要素に応じて位置を更新
      if (activeElement === 'text') {
        setTextPosition({ x: x, y: y });
      } else if (activeElement === 'emoji') {
        setEmojiPosition({ x: x, y: y });
      }
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
      
      if (activeElement === 'emoji' && formData.emoji) {
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
      } else if (activeElement === 'text' && formData.text) {
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


  // APIベースURLを環境に応じて動的に取得
  const getApiBaseUrl = () => {
    // 環境変数があればそれを使用（ポート8000を自動追加）
    if (process.env.SERVER_URL) {
      return `${process.env.SERVER_URL}:8000`;
    }
    
    // 開発環境またはlocalhostの場合
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    }
    
    // サーバー環境: 現在のホストのポート8000を使用
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:8000`;
  };

  const getBaseImageUrl = () => {
    if (baseImage) {
      return URL.createObjectURL(baseImage);
    }
    // デフォルト画像は静的ファイルとして提供（CORS問題を回避）
    return `${getApiBaseUrl()}/static/hirsakam.jpg`;
  };

  const generateIcon = async () => {
    // 描画データがあるかチェック
    const hasDrawing = drawingCanvasRef.current && drawingHistory.length > 1; // 初期状態以外の履歴がある
    const hasOverlays = overlayImages.length > 0;
    
    if (!formData.text && !formData.emoji && !hasDrawing && !hasOverlays) {
      alert('テキスト、絵文字、描画、またはオーバーレイ画像のいずれかを入力してください');
      return;
    }

    setIsGenerating(true);
    setGeneratedImage(null);

    try {
      const data = new FormData();
      
      if (formData.text) {
        data.append('text', formData.text);
        // テキストの座標と回転を送信
        data.append('text_x', Math.round(textPosition.x * imageScale));
        data.append('text_y', Math.round(textPosition.y * imageScale));
        data.append('font_size', Math.round(formData.fontSize * imageScale));
        data.append('text_color', formData.textColor);
        data.append('text_rotation', textRotation);
      }
      if (formData.emoji) {
        data.append('emoji', formData.emoji);
        // 絵文字の座標と回転を送信
        data.append('emoji_x', Math.round(emojiPosition.x * imageScale));
        data.append('emoji_y', Math.round(emojiPosition.y * imageScale));
        data.append('emoji_size', Math.round(formData.emojiSize * imageScale));
        data.append('emoji_rotation', emojiRotation);
        data.append('emoji_flip_horizontal', emojiFlipHorizontal);
      }
      
      if (baseImage) {
        data.append('base_image', baseImage);
      }

      // 描画データがある場合は送信
      if (drawingCanvasRef.current && drawingMode) {
        const canvas = drawingCanvasRef.current;
        const drawingDataURL = canvas.toDataURL('image/png');
        
        // Data URLをBlobに変換
        const drawingResponse = await fetch(drawingDataURL);
        const blob = await drawingResponse.blob();
        data.append('drawing_data', blob, 'drawing.png');
      }

      // オーバーレイ画像データがある場合は送信
      if (overlayImages.length > 0) {
        const overlayData = await Promise.all(overlayImages.map(async (overlay) => {
          // 画像をbase64に変換
          const response = await fetch(overlay.url);
          const blob = await response.blob();
          const reader = new FileReader();
          
          return new Promise((resolve) => {
            reader.onload = () => {
              resolve({
                data: reader.result, // base64 data URL
                x: Math.round(overlay.x * imageScale),
                y: Math.round(overlay.y * imageScale),
                width: Math.round(overlay.width * imageScale),
                height: Math.round(overlay.height * imageScale),
                opacity: overlay.opacity,
                rotation: overlay.rotation || 0,
                removeBackground: overlay.removeBackground || false,
                flipHorizontal: overlay.flipHorizontal || false
              });
            };
            reader.readAsDataURL(blob);
          });
        }));
        
        data.append('overlay_images', JSON.stringify(overlayData));
      }

      // レイヤー順序を送信
      data.append('layer_order', JSON.stringify(layerOrder));

      const response = await fetch(`${getApiBaseUrl()}/generate`, {
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
      loadGallery();
    } catch (error) {
      console.error('Error:', error);
      alert('生成中にエラーが発生しました: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const loadGallery = async (sort = null, page = null) => {
    try {
      const sortOrder = sort || gallerySortOrder;
      const pageNum = page || currentPage;
      const offset = (pageNum - 1) * galleryPagination.limit;
      
      const url = `${getApiBaseUrl()}/gallery?sort=${sortOrder}&offset=${offset}&limit=${galleryPagination.limit}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setGallery(data.images || []);
        setGalleryPagination({
          offset: data.offset,
          limit: data.limit,
          total: data.total,
          has_next: data.has_next,
          has_prev: data.has_prev
        });
      }
    } catch (error) {
      console.error('Gallery loading error:', error);
    }
  };
  
  const handleGallerySortChange = async (newSortOrder) => {
    setGallerySortOrder(newSortOrder);
    setCurrentPage(1); // ソート変更時は1ページ目に戻る
    await loadGallery(newSortOrder, 1);
  };
  
  const handlePageChange = async (newPage) => {
    setCurrentPage(newPage);
    await loadGallery(null, newPage);
  };

  const downloadImage = (url, filename) => {
    const link = document.createElement('a');
    link.href = `${getApiBaseUrl()}${url}`;
    link.download = filename;
    link.click();
  };

  // Twemoji絵文字画像を取得する関数
  const getTwemojiUrl = (emoji) => {
    if (!emoji) return null;
    const codepoint = emoji.codePointAt(0)?.toString(16);
    return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${codepoint}.png`;
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
                <img 
                  src={getTwemojiUrl(emoji)}
                  alt={emoji}
                  className="emoji-picker-twemoji"
                  onError={(e) => {
                    // Twemojiが読み込めない場合はフォールバック
                    e.target.style.display = 'none';
                    e.target.parentNode.appendChild(document.createTextNode(emoji));
                  }}
                />
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

  // ベース画像変更時にキャンバスサイズを調整（描画を保持）
  React.useEffect(() => {
    if (previewMode && imageRef.current && drawingCanvasRef.current) {
      // 現在の描画を保存
      let savedDrawing = null;
      try {
        if (drawingCanvasRef.current.width > 0) {
          savedDrawing = drawingCanvasRef.current.toDataURL();
        }
      } catch (e) {
        // エラーは無視
      }
      
      // 一時的にキャンバス準備状態をリセット
      setCanvasReady(false);
      
      // 画像がロードされるまで待ってからキャンバスを調整
      setTimeout(() => {
        if (drawingCanvasRef.current && imageRef.current) {
          const canvas = drawingCanvasRef.current;
          const context = canvas.getContext('2d');
          
          const newWidth = imageRef.current.clientWidth;
          const newHeight = imageRef.current.clientHeight;
          
          // キャンバスサイズを設定
          canvas.width = newWidth;
          canvas.height = newHeight;
          
          // コンテキストの設定を適用
          context.lineCap = 'round';
          context.lineJoin = 'round';
          context.globalCompositeOperation = 'source-over';
          context.strokeStyle = drawingColor;
          context.lineWidth = drawingThickness;
          
          drawingContextRef.current = context;
          
          // 保存された描画を復元
          if (savedDrawing) {
            const img = new Image();
            img.onload = () => {
              try {
                context.drawImage(img, 0, 0, newWidth, newHeight);
              } catch (e) {
                // エラーは無視
              }
              setCanvasReady(true);
            };
            img.src = savedDrawing;
          } else {
            setCanvasReady(true);
          }
        }
      }, 500);
    }
  }, [baseImage]);

  // 描画モードの切り替え時にキャンバスを再初期化
  React.useEffect(() => {
    if (drawingMode && previewMode && imageRef.current) {
      // 描画状態をリセット
      setIsDrawing(false);
      setCanvasReady(false); // キャンバス準備状態をリセット
      
      // 単一の初期化処理
      let hasInitialized = false;
      const initializeDrawingMode = () => {
        if (hasInitialized) return;
        
        setTimeout(() => {
          if (drawingCanvasRef.current && imageRef.current && !hasInitialized) {
            hasInitialized = true;
            initializeDrawingCanvas(true); // 描画モード切り替え時は履歴を保持
          }
        }, 500);
      };
      
      initializeDrawingMode();
    } else if (!drawingMode) {
      // 描画モードを無効にした時も状態をリセット
      setIsDrawing(false);
    }
  }, [drawingMode, previewMode]);

  React.useEffect(() => {
    // プレビューモード中でも、手動でサイズを変更した場合はtextBoundsを更新
    // ただし、リサイズ中は手動更新を避ける（マウス操作中の競合を防ぐ）
    if ((formData.text || formData.emoji) && !isResizing) {
      const newBounds = calculateTextBounds();
      setTextBounds(newBounds);
    }
  }, [formData.fontSize, formData.emojiSize, formData.text, formData.emoji, isResizing]);

  // グローバルマウスイベントリスナー
  React.useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (isDragging || isResizing || isOverlayDragging || isOverlayResizing) {
        handleMouseMove(e);
      }
      if (isRotating) {
        handleRotationMove(e);
      }
    };

    const handleGlobalMouseUp = () => {
      if (isDragging || isResizing || isOverlayDragging || isOverlayResizing) {
        
        // 操作終了後にtextBoundsを再計算して同期
        const finalBounds = calculateTextBounds();
        setTextBounds(finalBounds);
        
        setIsDragging(false);
        setIsResizing(false);
        setIsOverlayDragging(false);
        setIsOverlayResizing(false);
        setResizeDirection('');
        // オーバーレイの選択状態は維持する（リサイズハンドルを表示し続けるため）
        // setSelectedOverlayIndex(-1);
      }
      if (isRotating) {
        handleRotationEnd();
      }
    };

    if (previewMode && (isDragging || isResizing || isOverlayDragging || isOverlayResizing || isRotating)) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [previewMode, isDragging, isResizing, isOverlayDragging, isOverlayResizing, isRotating, dragOffset, initialMousePos, initialSize, selectedOverlayIndex, formData, overlayImages]);

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
              {baseImage ? (
                <div className="uploaded-image-info">
                  選択済み: {baseImage.name}
                </div>
              ) : (
                <div className="default-image-info">
                  デフォルト: hirsakam.jpg
                </div>
              )}
              
              {/* トリミングボタン */}
              <button
                onClick={() => {
                  console.log('Entering trimming mode', {
                    baseImage: baseImage,
                    baseImageUrl: getBaseImageUrl(),
                    trimmingMode: trimmingMode,
                    previewMode: previewMode
                  });
                  setTrimmingMode(true);
                }}
                className="preview-button-single"
                style={{ marginTop: '10px' }}
                disabled={trimmingMode || previewMode}
              >
                ✂️ ベース画像をトリミング
              </button>
            </div>

            <div className="form-group">
              <label>オーバーレイ画像:</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleOverlayImageUpload}
                className="file-input"
                multiple={false}
              />
              
              {overlayImages.length > 0 && (
                <div className="overlay-images-list">
                  <h4>追加された画像:</h4>
                  {overlayImages.map((overlay, index) => (
                    <div key={overlay.id} className="overlay-item">
                      <img 
                        src={overlay.url} 
                        alt={`Overlay ${index + 1}`}
                        className="overlay-thumbnail"
                      />
                      <div className="overlay-controls">
                        <div className="overlay-position-controls">
                          <div className="form-row">
                            <div className="form-group">
                              <label>X座標:</label>
                              <input
                                type="number"
                                value={Math.round(overlay.x)}
                                onChange={(e) => updateOverlayImage(index, { x: parseInt(e.target.value) || 0 })}
                                className="number-input overlay-input"
                              />
                            </div>
                            <div className="form-group">
                              <label>Y座標:</label>
                              <input
                                type="number"
                                value={Math.round(overlay.y)}
                                onChange={(e) => updateOverlayImage(index, { y: parseInt(e.target.value) || 0 })}
                                className="number-input overlay-input"
                              />
                            </div>
                          </div>
                          <div className="form-row">
                            <div className="form-group">
                              <label>幅:</label>
                              <input
                                type="number"
                                value={Math.round(overlay.width)}
                                onChange={(e) => {
                                  const newWidth = parseInt(e.target.value) || 1;
                                  const aspectRatio = overlay.originalHeight && overlay.originalWidth 
                                    ? overlay.originalHeight / overlay.originalWidth 
                                    : overlay.height / overlay.width;
                                  updateOverlayImage(index, { 
                                    width: newWidth, 
                                    height: newWidth * aspectRatio 
                                  });
                                }}
                                className="number-input overlay-input"
                              />
                            </div>
                            <div className="form-group">
                              <label>高さ:</label>
                              <input
                                type="number"
                                value={Math.round(overlay.height)}
                                onChange={(e) => {
                                  const newHeight = parseInt(e.target.value) || 1;
                                  const aspectRatio = overlay.originalWidth && overlay.originalHeight 
                                    ? overlay.originalWidth / overlay.originalHeight 
                                    : overlay.width / overlay.height;
                                  updateOverlayImage(index, { 
                                    height: newHeight, 
                                    width: newHeight * aspectRatio 
                                  });
                                }}
                                className="number-input overlay-input"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="overlay-opacity-control">
                          <label>透明度: {Math.round(overlay.opacity * 100)}%</label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={overlay.opacity}
                            onChange={(e) => updateOverlayImage(index, { opacity: parseFloat(e.target.value) })}
                            className="opacity-slider"
                          />
                        </div>
                        <div className="overlay-opacity-control">
                          <label>回転角度: {Math.round(overlay.rotation || 0)}°</label>
                          <input
                            type="range"
                            min="-180"
                            max="180"
                            value={overlay.rotation || 0}
                            onChange={(e) => updateOverlayImage(index, { rotation: parseInt(e.target.value) })}
                            className="opacity-slider"
                          />
                        </div>
                        <div className="overlay-opacity-control">
                          <label>
                            <input
                              type="checkbox"
                              checked={overlay.removeBackground || false}
                              onChange={(e) => updateOverlayImage(index, { removeBackground: e.target.checked })}
                              style={{ marginRight: '8px' }}
                            />
                            背景を透過する
                          </label>
                          <small style={{ color: '#666', fontSize: '11px', display: 'block', marginTop: '4px' }}>
                            ※プレビューは簡易版、生成時は高精度処理
                          </small>
                        </div>
                        <div className="overlay-opacity-control">
                          <label>
                            <input
                              type="checkbox"
                              checked={overlay.flipHorizontal || false}
                              onChange={(e) => updateOverlayImage(index, { flipHorizontal: e.target.checked })}
                              style={{ marginRight: '8px' }}
                            />
                            左右反転
                          </label>
                        </div>
                        <button
                          onClick={() => removeOverlayImage(index)}
                          className="remove-overlay-button"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="text-emoji-section">
              <h3>テキスト設定</h3>
              <div className="form-group">
                <label>テキスト:</label>
                <textarea
                  name="text"
                  value={formData.text}
                  onChange={handleInputChange}
                  placeholder="カスタムテキストを入力"
                  className="text-input"
                  rows="3"
                />
              </div>

              {formData.text && (
                <div className="text-controls">
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
                  <div className="text-position-controls">
                    <div className="form-row">
                      <div className="form-group">
                        <label>X座標:</label>
                        <input
                          type="number"
                          value={Math.round(textPosition.x)}
                          onChange={(e) => setTextPosition(prev => ({ ...prev, x: parseInt(e.target.value) || 0 }))}
                          className="number-input text-emoji-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Y座標:</label>
                        <input
                          type="number"
                          value={Math.round(textPosition.y)}
                          onChange={(e) => setTextPosition(prev => ({ ...prev, y: parseInt(e.target.value) || 0 }))}
                          className="number-input text-emoji-input"
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>フォントサイズ:</label>
                        <input
                          type="number"
                          name="fontSize"
                          value={formData.fontSize}
                          onChange={handleInputChange}
                          className="number-input text-emoji-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>回転角度: {textRotation}°</label>
                        <input
                          type="range"
                          min="-180"
                          max="180"
                          value={textRotation}
                          onChange={(e) => setTextRotation(parseInt(e.target.value))}
                          className="thickness-slider"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="text-emoji-section">
              <h3>絵文字設定</h3>
              <div className="form-group">
                <label>絵文字:</label>
                <div className="emoji-input-container">
                  <div className="emoji-display-wrapper">
                    {formData.emoji ? (
                      <div className="selected-emoji-display">
                        <img 
                          src={getTwemojiUrl(formData.emoji)}
                          alt={formData.emoji}
                          className="selected-emoji-twemoji"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'inline';
                          }}
                        />
                        <span className="selected-emoji-fallback" style={{display: 'none'}}>
                          {formData.emoji}
                        </span>
                      </div>
                    ) : (
                      <div className="emoji-placeholder">絵文字を選んでください</div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="emoji-picker-button"
                    onClick={() => setShowEmojiPicker(true)}
                  >
                    <img 
                      src={getTwemojiUrl('😊')}
                      alt="😊"
                      className="button-emoji-twemoji"
                    />
                    選ぶ
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

              {formData.emoji && (
                <div className="emoji-controls">
                  <div className="emoji-position-controls">
                    <div className="form-row">
                      <div className="form-group">
                        <label>X座標:</label>
                        <input
                          type="number"
                          value={Math.round(emojiPosition.x)}
                          onChange={(e) => setEmojiPosition(prev => ({ ...prev, x: parseInt(e.target.value) || 0 }))}
                          className="number-input text-emoji-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Y座標:</label>
                        <input
                          type="number"
                          value={Math.round(emojiPosition.y)}
                          onChange={(e) => setEmojiPosition(prev => ({ ...prev, y: parseInt(e.target.value) || 0 }))}
                          className="number-input text-emoji-input"
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>絵文字サイズ:</label>
                        <input
                          type="number"
                          name="emojiSize"
                          value={formData.emojiSize}
                          onChange={handleInputChange}
                          className="number-input text-emoji-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>回転角度: {emojiRotation}°</label>
                        <input
                          type="range"
                          min="-180"
                          max="180"
                          value={emojiRotation}
                          onChange={(e) => setEmojiRotation(parseInt(e.target.value))}
                          className="thickness-slider"
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>
                          <input
                            type="checkbox"
                            checked={emojiFlipHorizontal}
                            onChange={(e) => setEmojiFlipHorizontal(e.target.checked)}
                            style={{ marginRight: '8px' }}
                          />
                          左右反転
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>


            <button 
              onClick={startPreview} 
              className="preview-button-single"
            >
              プレビュー
            </button>
          </div>

          <div className="result-section">
            <h2>
              {trimmingMode ? 'トリミングモード（範囲を選択してください）' : 
               previewMode ? 'プレビュー（ドラッグで位置・サイズ調整 / 描画モード）' : 
               '生成結果'}
            </h2>
            {trimmingMode ? (
              <div className="trimming-container">
                <div 
                  className="preview-canvas"
                  ref={previewRef}
                  onMouseDown={handleCropMouseDown}
                  onMouseMove={handleCropMouseMove}
                  onMouseUp={handleCropMouseUp}
                  style={{
                    cursor: 'crosshair',
                    userSelect: 'none',
                    minHeight: '300px',
                    border: '2px dashed #ccc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    backgroundColor: 'rgba(248, 249, 250, 0.5)'
                  }}
                >
                  <img 
                    ref={imageRef}
                    src={getBaseImageUrl()} 
                    alt="ベース画像"
                    className="base-preview-image"
                    draggable={false}
                    onLoad={handleImageLoad}
                    onError={(e) => {
                      // デフォルト画像でCORSエラーの場合、crossOriginを削除して再試行
                      if (!baseImage && e.target.crossOrigin) {
                        e.target.crossOrigin = '';
                        setTimeout(() => {
                          e.target.src = e.target.src + '?retry=' + Date.now();
                        }, 100);
                      }
                    }}
                    // デフォルト画像では最初はcrossOriginを設定しない
                    {...(!baseImage ? {} : { crossOrigin: undefined })}
                    key={`trimming-${baseImage ? baseImage.name + baseImage.lastModified : 'default'}`}
                    style={{
                      pointerEvents: 'none', // イベントを親コンテナに委譲
                      maxWidth: '100%',
                      maxHeight: '400px',
                      objectFit: 'contain'
                    }}
                  />
                  
                  {/* トリミング用オーバーレイ */}
                  {(cropArea.width > 1 && cropArea.height > 1) && imageRef.current && (
                    <div
                      style={{
                        position: 'absolute',
                        // 画像の境界に合わせて配置
                        left: cropArea.x,
                        top: cropArea.y,
                        width: cropArea.width,
                        height: cropArea.height,
                        border: '2px solid #007bff',
                        backgroundColor: 'rgba(0, 123, 255, 0.1)',
                        pointerEvents: 'none',
                        zIndex: 2000
                      }}
                    >
                    </div>
                  )}
                </div>
                
                <div className="preview-controls">
                  <button 
                    onClick={() => {
                      if (cropArea.width < 1 || cropArea.height < 1) {
                        alert('範囲が小さすぎます');
                        return;
                      }
                      confirmCrop();
                    }}
                    className="generate-from-preview-button"
                    title="選択した範囲でトリミングを確定"
                    style={{
                      backgroundColor: cropArea.width < 1 || cropArea.height < 1 ? '#ccc' : '#007bff',
                      cursor: cropArea.width < 1 || cropArea.height < 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    ✓ トリミング確定 ({Math.round(cropArea.width)}×{Math.round(cropArea.height)})
                  </button>
                  <button 
                    onClick={cancelCrop}
                    className="back-button"
                    title="トリミングをキャンセル"
                  >
                    ✗ キャンセル
                  </button>
                </div>
              </div>
            ) : previewMode ? (
              <>
                <div className="preview-container">
                <div 
                  className="preview-canvas"
                  ref={previewRef}
                  onClick={(e) => {
                    // 描画モードの時は背景クリックを無視
                    if (drawingMode) return;
                    
                    // 背景をクリックした時（他の要素で stopPropagation されていない場合）
                    if (e.target === e.currentTarget || e.target.classList.contains('base-preview-image')) {
                      setSelectedOverlayIndex(-1);
                    }
                  }}
                >
                  <img 
                    ref={imageRef}
                    src={getBaseImageUrl()} 
                    alt="ベース画像"
                    className="base-preview-image"
                    draggable={false}
                    onLoad={handleImageLoad}
                    key={baseImage ? baseImage.name : 'default'}
                  />
                  
                  {/* Drawing Canvas */}
                  <canvas
                    key="drawing-canvas"
                    ref={drawingCanvasRef}
                    className={`drawing-canvas ${drawingMode ? 'drawing-active' : ''}`}
                    onMouseDown={handleDrawingStart}
                    onMouseMove={handleDrawingMove}
                    onMouseUp={handleDrawingEnd}
                    onMouseLeave={handleDrawingEnd}
                    style={{
                      display: 'block',
                      pointerEvents: drawingMode ? 'auto' : 'none',
                      zIndex: 1000
                    }}
                  />
                  
                  {/* 描画モード時の固定表示オーバーレイ */}
                  {/* 注意: 座標ズレ防止のため、通常表示と全く同じDOM構造を使用 */}
                  {/* border: transparentで視覚的には見えないが、レイアウト計算は通常表示と一致 */}
                  {drawingMode && (
                    <>
                      {/* 絵文字の固定表示 */}
                      {formData.emoji && (
                        <div 
                          className="text-overlay-container"
                          style={{
                            left: emojiPosition.x - 100,
                            top: emojiPosition.y - 100,
                            width: 200,
                            height: 200,
                            pointerEvents: 'none',
                            zIndex: getLayerZIndex('emoji'),
                            border: '2px dashed transparent' // 透明ボーダーで座標計算を通常表示と一致
                          }}
                        >
                          <div className="bounding-box" style={{ border: '2px dashed transparent' }}> {/* 透明ボーダーでレイアウト保持 */}
                            <div style={{
                              transform: `rotate(${emojiRotation}deg)${emojiFlipHorizontal ? ' scaleX(-1)' : ''}`,
                              transformOrigin: 'center center',
                              display: 'inline-block'
                            }}>
                              <img 
                                src={getTwemojiUrl(formData.emoji)}
                                alt={formData.emoji}
                                className="twemoji-preview"
                                style={{
                                  width: `${formData.emojiSize}px`,
                                  height: `${formData.emojiSize}px`,
                                  pointerEvents: 'none'
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* テキストの固定表示 */}
                      {formData.text && (
                        <div 
                          className="text-overlay-container"
                          style={{
                            left: textPosition.x,
                            top: textPosition.y,
                            width: 'auto',
                            height: 'auto',
                            transform: 'translate(-50%, -50%)',
                            pointerEvents: 'none',
                            zIndex: getLayerZIndex('text'),
                            border: '2px dashed transparent' // 透明ボーダーで座標計算を通常表示と一致
                          }}
                        >
                          <div className="bounding-box" style={{ border: '2px dashed transparent' }}> {/* 透明ボーダーでレイアウト保持 */}
                            <div 
                              className="text-overlay"
                              style={{
                                fontSize: `${formData.fontSize}px`,
                                color: formData.textColor,
                                pointerEvents: 'none',
                                textAlign: 'center',
                                lineHeight: '1.2',
                                transform: `rotate(${textRotation}deg)`,
                                transformOrigin: 'center center'
                              }}
                            >
                              {formData.text.split('\n').map((line, index) => (
                                <div key={index} style={{ margin: 0, padding: 0, whiteSpace: 'pre' }}>
                                  {line || '\u00A0'}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* テキスト表示（独立） */}
                  {formData.text && (
                    <div 
                      className="text-overlay-container"
                      style={{
                        left: textPosition.x,
                        top: textPosition.y,
                        width: 'auto',
                        height: 'auto',
                        transform: 'translate(-50%, -50%)',
                        cursor: drawingMode ? 'default' : (isDragging && activeElement === 'text' ? 'grabbing' : 'grab'),
                        userSelect: 'none',
                        pointerEvents: drawingMode ? 'none' : 'auto',
                        display: drawingMode ? 'none' : 'block',
                        border: activeElement === 'text' ? '2px dashed rgba(102, 126, 234, 0.8)' : '2px dashed rgba(102, 126, 234, 0.3)',
                        zIndex: getLayerZIndex('text')
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setActiveElement('text');
                        setSelectedOverlayIndex(-1); // オーバーレイの選択を解除
                        handleMouseDown(e, 'text');
                      }}
                    >
                      <div className="bounding-box">
                        <div 
                          className="text-overlay"
                          style={{
                            fontSize: `${formData.fontSize}px`,
                            color: formData.textColor,
                            pointerEvents: 'none',
                            textAlign: 'center',
                            lineHeight: '1.2',
                            transform: `rotate(${textRotation}deg)`,
                            transformOrigin: 'center center'
                          }}
                        >
                          {formData.text.split('\n').map((line, index) => (
                            <div key={index} style={{ margin: 0, padding: 0, whiteSpace: 'pre' }}>
                              {line || '\u00A0'}
                            </div>
                          ))}
                        </div>
                      
                        {/* テキスト用リサイズハンドル */}
                        {activeElement === 'text' && (
                          <>
                            <div 
                              className="resize-handle corner-nw"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleResizeMouseDown(e, 'nw');
                              }}
                            />
                            <div 
                              className="resize-handle corner-ne"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleResizeMouseDown(e, 'ne');
                              }}
                            />
                            <div 
                              className="resize-handle corner-sw"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleResizeMouseDown(e, 'sw');
                              }}
                            />
                            <div 
                              className="resize-handle corner-se"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleResizeMouseDown(e, 'se');
                              }}
                            />
                            <div 
                              className="rotation-handle"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleRotationStart(e, 'text');
                              }}
                              title="ドラッグして回転"
                            />
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 絵文字表示（独立） */}
                  {formData.emoji && (
                    <div 
                      className="text-overlay-container"
                      style={{
                        left: emojiPosition.x - 100,
                        top: emojiPosition.y - 100,
                        width: 200,
                        height: 200,
                        cursor: drawingMode ? 'default' : (isDragging && activeElement === 'emoji' ? 'grabbing' : 'grab'),
                        userSelect: 'none',
                        pointerEvents: drawingMode ? 'none' : 'auto',
                        display: drawingMode ? 'none' : 'block',
                        border: activeElement === 'emoji' ? '2px dashed rgba(102, 126, 234, 0.8)' : '2px dashed rgba(102, 126, 234, 0.3)',
                        zIndex: getLayerZIndex('emoji')
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setActiveElement('emoji');
                        setSelectedOverlayIndex(-1); // オーバーレイの選択を解除
                        handleMouseDown(e, 'emoji');
                      }}
                    >
                      <div className="bounding-box">
                        <div style={{
                          transform: `rotate(${emojiRotation}deg)${emojiFlipHorizontal ? ' scaleX(-1)' : ''}`,
                          transformOrigin: 'center center',
                          display: 'inline-block'
                        }}>
                          <img 
                            src={getTwemojiUrl(formData.emoji)}
                            alt={formData.emoji}
                            className="twemoji-preview"
                            style={{
                              width: `${formData.emojiSize}px`,
                              height: `${formData.emojiSize}px`,
                              pointerEvents: 'none'
                            }}
                            onError={(e) => {
                              // Twemojiが読み込めない場合はフォールバック
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'block';
                            }}
                          />
                          <div 
                            className="emoji-fallback"
                            style={{
                              fontSize: `${formData.emojiSize}px`,
                              display: 'none',
                              pointerEvents: 'none'
                            }}
                          >
                            {formData.emoji}
                          </div>
                        </div>
                        
                        {/* 絵文字用リサイズハンドル */}
                        {activeElement === 'emoji' && (
                          <>
                            <div 
                              className="resize-handle corner-nw"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleResizeMouseDown(e, 'nw');
                              }}
                            />
                            <div 
                              className="resize-handle corner-ne"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleResizeMouseDown(e, 'ne');
                              }}
                            />
                            <div 
                              className="resize-handle corner-sw"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleResizeMouseDown(e, 'sw');
                              }}
                            />
                            <div 
                              className="resize-handle corner-se"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleResizeMouseDown(e, 'se');
                              }}
                            />
                            <div 
                              className="rotation-handle"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleRotationStart(e, 'emoji');
                              }}
                              title="ドラッグして回転"
                            />
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Overlay Images */}
                  {overlayImages.map((overlay, index) => (
                    <div
                      key={overlay.id}
                      className="overlay-image-container"
                      style={{
                        position: 'absolute',
                        left: overlay.x - overlay.width / 2,
                        top: overlay.y - overlay.height / 2,
                        width: overlay.width,
                        height: overlay.height,
                        cursor: drawingMode ? 'default' : (selectedOverlayIndex === index && (isOverlayDragging || isOverlayResizing) ? 'grabbing' : 'grab'),
                        userSelect: 'none',
                        pointerEvents: drawingMode ? 'none' : 'auto',
                        zIndex: getLayerZIndex('overlay'),
                        border: selectedOverlayIndex === index ? '2px dashed rgba(102, 126, 234, 0.8)' : '2px dashed rgba(102, 126, 234, 0.3)',
                        borderRadius: '4px'
                      }}
                      onMouseDown={(e) => {
                        if (!drawingMode) {
                          e.stopPropagation();
                          handleOverlayMouseDown(e, index);
                        }
                      }}
                    >
                      <img
                        src={overlay.displayUrl || overlay.url}
                        alt={`Overlay ${index + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          opacity: overlay.opacity,
                          pointerEvents: 'none', // 画像自体はポインターイベントを受け取らない
                          borderRadius: '2px',
                          transform: `rotate(${overlay.rotation || 0}deg)${overlay.flipHorizontal ? ' scaleX(-1)' : ''}`,
                          transformOrigin: 'center center'
                        }}
                        draggable={false}
                      />
                      
                      {/* Resize handles for selected overlay */}
                      {selectedOverlayIndex === index && !drawingMode && (
                        <>
                          <div 
                            className="resize-handle corner-nw"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              handleOverlayResizeMouseDown(e, index, 'nw');
                            }}
                          />
                          <div 
                            className="resize-handle corner-ne"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              handleOverlayResizeMouseDown(e, index, 'ne');
                            }}
                          />
                          <div 
                            className="resize-handle corner-sw"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              handleOverlayResizeMouseDown(e, index, 'sw');
                            }}
                          />
                          <div 
                            className="resize-handle corner-se"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              handleOverlayResizeMouseDown(e, index, 'se');
                            }}
                          />
                          <div 
                            className="rotation-handle"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              handleRotationStart(e, index);
                            }}
                            title="ドラッグして回転"
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <div className="preview-controls">
                  <button 
                    onClick={() => setShowLayerPanel(true)}
                    className="layer-button"
                    title="レイヤー順序を変更"
                  >
                    📐 レイヤー
                  </button>
                  <button 
                    onClick={() => {
                      setPreviewMode(false);
                      // プレビューモード終了時にtextBounds をリセット
                      const bounds = calculateTextBounds();
                      setTextBounds(bounds);
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
              <div className="drawing-controls-preview">
                <h3>描画ツール</h3>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={drawingMode}
                      onChange={(e) => setDrawingMode(e.target.checked)}
                    />
{drawingMode ? '描画モード (絵文字・テキスト固定)' : '描画モードを有効にする'}
                  </label>
                </div>
                
                {drawingMode && !canvasReady && (
                  <div style={{ 
                    padding: '10px', 
                    background: '#fff3cd', 
                    border: '1px solid #ffeaa7', 
                    borderRadius: '4px', 
                    marginBottom: '15px',
                    fontSize: '14px',
                    color: '#856404'
                  }}>
                    ⏳ キャンバスを準備中です... 少々お待ちください
                  </div>
                )}
                
                {drawingMode && (
                  <>
                    <div className="form-group">
                      <label>描画色:</label>
                      <div className="color-input-container">
                        <input
                          type="color"
                          value={drawingColor}
                          onChange={(e) => setDrawingColor(e.target.value)}
                          className="color-input"
                        />
                        <span className="color-preview" style={{ backgroundColor: drawingColor }}></span>
                        <span className="color-value">{drawingColor}</span>
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label>線の太さ: {drawingThickness}px</label>
                      <input
                        type="range"
                        min="1"
                        max="20"
                        value={drawingThickness}
                        onChange={(e) => setDrawingThickness(parseInt(e.target.value))}
                        className="thickness-slider"
                      />
                    </div>
                    
                    <div className="drawing-buttons">
                      <button
                        onClick={undo}
                        disabled={historyIndex <= 0}
                        className="drawing-button undo-button"
                      >
                        ↶ Undo
                      </button>
                      <button
                        onClick={redo}
                        disabled={historyIndex >= drawingHistory.length - 1}
                        className="drawing-button redo-button"
                      >
                        ↷ Redo
                      </button>
                      <button
                        onClick={clearDrawing}
                        className="drawing-button clear-button"
                      >
                        🗑️ クリア
                      </button>
                    </div>
                  </>
                )}
              </div>
              </>
            ) : generatedImage ? (
              <div className="generated-image">
                <img 
                  src={`${getApiBaseUrl()}${generatedImage}`} 
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
                  key={baseImage ? baseImage.name : 'default'}
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
          <div className="gallery-controls">
            <div className="gallery-sort-controls">
              <span>並び順: </span>
              <button 
                className={`sort-button ${gallerySortOrder === 'desc' ? 'active' : ''}`}
                onClick={() => handleGallerySortChange('desc')}
              >
                新しい順
              </button>
              <button 
                className={`sort-button ${gallerySortOrder === 'asc' ? 'active' : ''}`}
                onClick={() => handleGallerySortChange('asc')}
              >
                古い順
              </button>
            </div>
            <div className="gallery-info">
              {galleryPagination.total > 0 && (
                <span>
                  全{galleryPagination.total}件中 {galleryPagination.offset + 1}〜{Math.min(galleryPagination.offset + galleryPagination.limit, galleryPagination.total)}件を表示
                </span>
              )}
            </div>
          </div>
          <div className="gallery-grid">
            {gallery.map((image, index) => (
              <div key={index} className="gallery-item">
                <img 
                  src={`${getApiBaseUrl()}${image.url}`} 
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
          
          {/* ページネーション */}
          {galleryPagination.total > galleryPagination.limit && (
            <div className="gallery-pagination">
              <button 
                className="pagination-button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!galleryPagination.has_prev}
              >
                ← 前へ
              </button>
              
              <div className="pagination-info">
                {Math.max(1, currentPage - 2) !== 1 && (
                  <>
                    <button 
                      className="pagination-number"
                      onClick={() => handlePageChange(1)}
                    >
                      1
                    </button>
                    {Math.max(1, currentPage - 2) > 2 && <span className="pagination-ellipsis">...</span>}
                  </>
                )}
                
                {Array.from({ length: Math.min(5, Math.ceil(galleryPagination.total / galleryPagination.limit)) }, (_, i) => {
                  const pageNum = Math.max(1, currentPage - 2) + i;
                  const totalPages = Math.ceil(galleryPagination.total / galleryPagination.limit);
                  if (pageNum <= totalPages) {
                    return (
                      <button 
                        key={pageNum}
                        className={`pagination-number ${pageNum === currentPage ? 'active' : ''}`}
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  return null;
                })}
                
                {Math.min(currentPage + 2, Math.ceil(galleryPagination.total / galleryPagination.limit)) !== Math.ceil(galleryPagination.total / galleryPagination.limit) && (
                  <>
                    {Math.min(currentPage + 2, Math.ceil(galleryPagination.total / galleryPagination.limit)) < Math.ceil(galleryPagination.total / galleryPagination.limit) - 1 && <span className="pagination-ellipsis">...</span>}
                    <button 
                      className="pagination-number"
                      onClick={() => handlePageChange(Math.ceil(galleryPagination.total / galleryPagination.limit))}
                    >
                      {Math.ceil(galleryPagination.total / galleryPagination.limit)}
                    </button>
                  </>
                )}
              </div>
              
              <button 
                className="pagination-button"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!galleryPagination.has_next}
              >
                次へ →
              </button>
            </div>
          )}
          
          {/* ガチャボタン */}
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center' }}>
              <button
                onClick={drawGacha}
                disabled={isGachaDrawing || isGachaTenDrawing}
                className="gacha-button"
              >
                {isGachaDrawing ? '🎰 ガチャ中...' : '🎰 単発ガチャ'}
              </button>
              <button
                onClick={drawGachaTen}
                disabled={isGachaDrawing || isGachaTenDrawing}
                className="gacha-ten-button"
              >
                {isGachaTenDrawing ? '🎰 10連ガチャ中...' : '🎰 10連ガチャ'}
              </button>
              
              {/* other_image表示（固定画像） */}
              <div className="other-images-container">
                <img
                  src={`${getApiBaseUrl()}/other-image/389b04f7ba17e4d1.png`}
                  alt="Decoration"
                  className="other-image-thumbnail"
                  onError={(e) => {
                    console.error('Other load error:', e);
                    e.target.style.display = 'none';
                  }}
                />
                <div className="speech-bubble">
                  <div className="speech-bubble-text">
                    10゛連゛無゛料゛！゛
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <EmojiPicker />
      
      {/* レイヤー順序管理パネル */}
      {showLayerPanel && (
        <div className="layer-panel-overlay">
          <div className="layer-panel">
            <div className="layer-panel-header">
              <h3>レイヤー順序</h3>
              <button
                onClick={() => setShowLayerPanel(false)}
                className="layer-panel-close"
              >
                ×
              </button>
            </div>
            <div className="layer-panel-content">
              <div className="layer-info">
                <small>ドラッグして順序を変更（下が最下位、上が最上位）</small>
              </div>
              <div className="layer-list">
                {/* フリーハンド描画（固定・最上位） */}
                <div className="layer-item layer-fixed">
                  <span className="layer-icon">🖍️</span>
                  <span className="layer-name">フリーハンド描画</span>
                  <span className="layer-status">（固定・最上位）</span>
                </div>
                
                {/* 動的レイヤー（ドラッグ可能） */}
                {layerOrder.slice().reverse().map((layerType, reverseIndex) => {
                  const actualIndex = layerOrder.length - 1 - reverseIndex;
                  const hasContent = 
                    (layerType === 'text' && formData.text) ||
                    (layerType === 'emoji' && formData.emoji) ||
                    (layerType === 'overlay' && overlayImages.length > 0);
                  
                  // すべてのレイヤータイプはドラッグ可能（空でも順序変更のため）
                  const isDraggable = true;
                  
                  return (
                    <div
                      key={layerType}
                      className={`layer-item ${!hasContent ? 'layer-empty' : ''} ${isDraggingLayer && draggedLayerIndex === actualIndex ? 'layer-dragging' : ''}`}
                      draggable={isDraggable}
                      onDragStart={(e) => handleLayerDragStart(e, actualIndex)}
                      onDragOver={handleLayerDragOver}
                      onDrop={(e) => handleLayerDrop(e, actualIndex)}
                      onDragEnd={handleLayerDragEnd}
                    >
                      <span className="layer-icon">
                        {layerType === 'text' ? '📝' : layerType === 'emoji' ? '😀' : '🖼️'}
                      </span>
                      <span className="layer-name">{getLayerName(layerType)}</span>
                      {!hasContent && <span className="layer-status">（空）</span>}
                    </div>
                  );
                })}
                
                {/* ベース画像（固定・最下位） */}
                <div className="layer-item layer-fixed">
                  <span className="layer-icon">🖼️</span>
                  <span className="layer-name">ベース画像</span>
                  <span className="layer-status">（固定・最下位）</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* ガチャモーダル */}
      {showGachaModal && (
        <div className="gacha-modal-overlay">
          <div className="gacha-modal">
            <div className="gacha-modal-header">
              <h3>単発ガチャ結果</h3>
              <div className="gacha-modal-header-buttons">
                {gachaResult && !isGachaDrawing && (
                  <button
                    onClick={() => openShareModal('single')}
                    className="gacha-share-button"
                  >
                    📤 共有
                  </button>
                )}
                <button
                  onClick={closeGachaModal}
                  className="gacha-modal-close"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="gacha-modal-content">
              {isGachaDrawing ? (
                <div className="gacha-loading">
                  <div className="loading-spinner"></div>
                  <p>ガチャを引いています...</p>
                </div>
              ) : gachaResult ? (
                <div className="gacha-result">
                  <div className={`gacha-rarity gacha-rarity-${gachaResult.rarity.toLowerCase()}`}>
                    {gachaResult.rarity}
                  </div>
                  <div className={`gacha-single-image-container rarity-frame-${gachaResult.rarity.toLowerCase()}`}>
                    <img
                      src={`${getApiBaseUrl()}${gachaResult.image_url}`}
                      alt={`${gachaResult.rarity} ガチャ画像`}
                      className="gacha-single-image"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* 10連ガチャモーダル */}
      {showGachaTenModal && (
        <div className="gacha-modal-overlay">
          <div className="gacha-ten-modal">
            <div className="gacha-modal-header">
              <h3>10連ガチャ結果</h3>
              <div className="gacha-modal-header-buttons">
                {gachaTenResults.length > 0 && !isGachaTenDrawing && (
                  <button
                    onClick={() => openShareModal('ten')}
                    className="gacha-share-button"
                  >
                    📤 共有
                  </button>
                )}
                <button
                  onClick={closeGachaTenModal}
                  className="gacha-modal-close"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="gacha-modal-content">
              {isGachaTenDrawing ? (
                <div className="gacha-loading">
                  <div className="loading-spinner"></div>
                  <p>10連ガチャを引いています...</p>
                </div>
              ) : (
                <div className="gacha-ten-results">
                  {gachaTenResults.map((result, index) => (
                    <div key={index} className="gacha-ten-item">
                      <div className={`gacha-rarity gacha-rarity-${result.rarity.toLowerCase()}`}>
                        {result.rarity}
                      </div>
                      <div className={`gacha-ten-image-container rarity-frame-${result.rarity.toLowerCase()}`}>
                        <img
                          src={`${getApiBaseUrl()}${result.image_url}`}
                          alt={`${result.rarity} ガチャ画像`}
                          className="gacha-ten-image"
                        />
                      </div>
                      {index === 9 && (
                        <div className="guaranteed-badge">SR以上確定</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Slack共有モーダル */}
      {showShareModal && (
        <div className="share-modal-overlay">
          <div className="share-modal">
            <div className="share-modal-header">
              <h3>Slackに共有</h3>
              <button
                onClick={closeShareModal}
                className="share-modal-close"
              >
                ×
              </button>
            </div>
            <div className="share-modal-content">
              <div className="share-form">
                <div className="form-group">
                  <label htmlFor="shareChannel">投稿先チャンネル:</label>
                  <input
                    type="text"
                    id="shareChannel"
                    value={shareChannel}
                    onChange={(e) => setShareChannel(e.target.value)}
                    placeholder="#tmp-hirsakam-icon-generator"
                    className="text-input"
                    disabled={isSharing}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="shareMessage">メッセージ:</label>
                  <textarea
                    id="shareMessage"
                    value={shareMessage}
                    onChange={(e) => setShareMessage(e.target.value)}
                    placeholder="ガチャ結果をシェア！"
                    className="text-input"
                    rows="3"
                    disabled={isSharing}
                  />
                </div>

                {shareResult && (
                  <div className={`share-result ${shareResult.success ? 'success' : 'error'}`}>
                    {shareResult.message}
                  </div>
                )}

                <div className="share-buttons">
                  <button
                    onClick={shareToSlack}
                    disabled={isSharing || !shareChannel.trim() || !shareMessage.trim()}
                    className={`preview-button-single ${isSharing ? 'sharing' : ''}`}
                  >
                    {isSharing ? '📤 送信中...' : '📤 Slackに投稿'}
                  </button>
                  <button
                    onClick={closeShareModal}
                    className="back-button"
                    disabled={isSharing}
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
