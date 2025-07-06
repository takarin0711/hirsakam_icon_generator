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
            x: 200,
            y: 150,
            width: width,
            height: height,
            originalWidth: img.width,
            originalHeight: img.height,
            opacity: 1,
            rotation: 0
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
      prev.map((img, i) => i === index ? { ...img, ...updates } : img)
    );
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
      
      // 描画キャンバスを初期化（複数回の試行で確実に実行）
      setTimeout(() => {
        if (drawingMode && previewMode && drawingCanvasRef.current) {
          initializeDrawingCanvas();
        }
      }, 200);
      
      setTimeout(() => {
        if (drawingMode && previewMode && drawingCanvasRef.current) {
          initializeDrawingCanvas();
        }
      }, 600);
      
      setTimeout(() => {
        if (drawingMode && previewMode && drawingCanvasRef.current) {
          initializeDrawingCanvas();
        }
      }, 1000);
    }
  };

  const initializeDrawingCanvas = () => {
    if (drawingCanvasRef.current && imageRef.current) {
      const canvas = drawingCanvasRef.current;
      const context = canvas.getContext('2d');
      
      const clientWidth = imageRef.current.clientWidth;
      const clientHeight = imageRef.current.clientHeight;
      
      // サイズが0の場合は再試行
      if (clientWidth === 0 || clientHeight === 0) {
        setTimeout(() => initializeDrawingCanvas(), 500);
        return;
      }
      
      canvas.width = clientWidth;
      canvas.height = clientHeight;
      
      // コンテキストの設定
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.globalCompositeOperation = 'source-over';
      
      // 描画設定を初期化（デフォルトの黒い線を防ぐ）
      context.strokeStyle = drawingColor;
      context.lineWidth = drawingThickness;
      
      drawingContextRef.current = context;
      
      // 履歴をクリア（初期状態は保存しない）
      setDrawingHistory([]);
      setHistoryIndex(-1);
      
      // 初期化完了をマーク（少し遅延を入れて確実に完了）
      setTimeout(() => {
        setCanvasReady(true);
      }, 100);
    } else {
      console.log('❌ Canvas init failed - Canvas:', !!drawingCanvasRef.current, 'Image:', !!imageRef.current);
      setCanvasReady(false);
    }
  };

  const saveToHistory = () => {
    if (!drawingCanvasRef.current) {
      console.log('saveToHistory: No canvas available');
      return;
    }
    
    const canvas = drawingCanvasRef.current;
    
    // キャンバスが有効でない場合は保存をスキップ
    if (canvas.width === 0 || canvas.height === 0) {
      console.log('saveToHistory: Canvas has zero size, skipping save');
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

  const clearDrawing = () => {
    if (!drawingCanvasRef.current) return;
    
    const canvas = drawingCanvasRef.current;
    const context = drawingContextRef.current;
    context.clearRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
  };

  const handleDrawingStart = (e) => {
    // キャンバスの準備状態をチェック
    if (!canvasReady) {
      console.log('Canvas not ready yet, delaying drawing start');
      // キャンバスが準備できるまで少し待つ
      setTimeout(() => {
        if (canvasReady) {
          handleDrawingStart(e);
        }
      }, 200);
      return;
    }
    
    if (drawingCanvasRef.current) {
      const canvas = drawingCanvasRef.current;
      
      if (canvas.width === 0 || canvas.height === 0) {
        console.error('Canvas size is zero - drawing prevented');
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
      console.error('No drawing context available');
      return;
    }
    
    // 初回描画の準備
    if (drawingHistory.length === 0) {
      // 初回描画時は現在のキャンバス状態を確認
      const currentImageData = canvas.toDataURL();
      const emptyCanvas = document.createElement('canvas');
      emptyCanvas.width = canvas.width;
      emptyCanvas.height = canvas.height;
      const emptyImageData = emptyCanvas.toDataURL();
      
      // 現在のキャンバスが空でない場合はクリア
      if (currentImageData !== emptyImageData) {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    
    // 前回のパスをクリア
    context.closePath();
    
    // 描画設定を確実に適用
    context.strokeStyle = drawingColor;
    context.lineWidth = drawingThickness;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    
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
    
    console.log(`=== ${elementType?.toUpperCase() || 'ELEMENT'} DRAG START ===`);
    console.log(`Mouse down at: (${x}, ${y})`);
    
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
    
    console.log(`=== TEXT/EMOJI RESIZE START ===`);
    console.log(`Resize handle clicked: ${direction}`);
    console.log(`Initial size: ${formData.emoji ? formData.emojiSize : formData.fontSize}`);
    console.log(`Current textBounds:`, currentBounds);
    console.log(`FormData:`, formData);
    
    setIsResizing(true);
    setIsDragging(false); // ドラッグ状態をクリア
    // テキスト/絵文字操作時はオーバーレイ操作状態をクリアしない
    // setIsOverlayDragging(false);
    // setIsOverlayResizing(false);
    // setSelectedOverlayIndex(-1);
    setResizeDirection(direction);
    setInitialMousePos({ x: e.clientX, y: e.clientY });
    setInitialSize(formData.emoji ? formData.emojiSize : formData.fontSize);
  };

  const handleOverlayMouseDown = (e, overlayIndex) => {
    if (!previewMode) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    console.log(`=== OVERLAY DRAG START ===`);
    console.log(`Overlay clicked: index ${overlayIndex}`);
    
    setSelectedOverlayIndex(overlayIndex);
    setIsOverlayDragging(true);
    setIsOverlayResizing(false); // リサイズ状態をクリア
    
    const canvasRect = previewRef.current.getBoundingClientRect();
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top;
    const overlay = overlayImages[overlayIndex];
    
    console.log(`Mouse down at: (${x}, ${y}), overlay at: (${overlay.x}, ${overlay.y})`);
    setDragOffset({ x: x - overlay.x, y: y - overlay.y });
  };

  const handleOverlayResizeMouseDown = (e, overlayIndex, direction) => {
    if (!previewMode) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    console.log(`=== OVERLAY RESIZE START ===`);
    console.log(`Overlay resize handle clicked: ${direction} for overlay ${overlayIndex}`);
    
    setSelectedOverlayIndex(overlayIndex);
    setIsOverlayResizing(true);
    setIsOverlayDragging(false); // ドラッグ状態をクリア
    setResizeDirection(direction);
    setInitialMousePos({ x: e.clientX, y: e.clientY });
    
    const overlay = overlayImages[overlayIndex];
    setInitialSize(overlay.width);
    console.log(`Initial overlay size: ${overlay.width}x${overlay.height}`);
  };

  const handleMouseMove = (e) => {
    if (!previewMode) return;
    
    if (isOverlayDragging && selectedOverlayIndex >= 0 && previewRef.current) {
      const rect = previewRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - dragOffset.x;
      const y = e.clientY - rect.top - dragOffset.y;
      
      // 境界制限を削除して自由に移動可能に
      console.log(`Overlay dragging to: (${x}, ${y})`);
      updateOverlayImage(selectedOverlayIndex, { x: x, y: y });
    } else if (isOverlayResizing && selectedOverlayIndex >= 0) {
      const deltaX = e.clientX - initialMousePos.x;
      const deltaY = e.clientY - initialMousePos.y;
      
      console.log(`Mouse delta: (${deltaX}, ${deltaY}), direction: ${resizeDirection}`);
      
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
      
      console.log(`Overlay resizing: ${initialSize} -> ${newWidth} (delta: ${sizeDelta}, aspectRatio: ${aspectRatio})`);
      console.log(`Original size: ${currentOverlay.originalWidth}x${currentOverlay.originalHeight}`);
      updateOverlayImage(selectedOverlayIndex, { 
        width: newWidth, 
        height: newHeight 
      });
    } else if (isDragging && previewRef.current) {
      const rect = previewRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - dragOffset.x;
      const y = e.clientY - rect.top - dragOffset.y;
      
      // 境界制限を削除して自由に移動可能に
      console.log(`Dragging ${activeElement} to: (${x}, ${y})`);
      
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

  const handleWheelOnTextOverlay = (e) => {
    if (!previewMode) return;
    
    e.preventDefault();
    e.stopPropagation();
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
                rotation: overlay.rotation || 0
              });
            };
            reader.readAsDataURL(blob);
          });
        }));
        
        data.append('overlay_images', JSON.stringify(overlayData));
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

  // ベース画像変更時にキャンバスを再初期化（keyによる強制再マウント後）
  React.useEffect(() => {
    if (previewMode && drawingMode && imageRef.current) {
      console.log('Base image changed, forcing canvas remount and reinitializing');
      // keyプロパティによる強制再マウント後、十分な時間を待つ
      setTimeout(() => {
        console.log('Post-remount canvas init attempt 1');
        if (drawingCanvasRef.current && imageRef.current) {
          initializeDrawingCanvas();
        }
      }, 500);
      setTimeout(() => {
        console.log('Post-remount canvas init attempt 2');
        if (drawingCanvasRef.current && imageRef.current) {
          initializeDrawingCanvas();
        }
      }, 1200);
    }
  }, [baseImage]);

  // 描画モードの切り替え時にキャンバスを再初期化
  React.useEffect(() => {
    if (drawingMode && previewMode && imageRef.current) {
      // 描画状態をリセット
      setIsDrawing(false);
      setCanvasReady(false); // キャンバス準備状態をリセット
      // keyによる強制再マウント後、より長い遅延で初期化
      setTimeout(() => {
        if (drawingCanvasRef.current && imageRef.current) {
          initializeDrawingCanvas();
        }
      }, 300);
      setTimeout(() => {
        if (drawingCanvasRef.current && imageRef.current) {
          initializeDrawingCanvas();
        }
      }, 800);
      setTimeout(() => {
        if (drawingCanvasRef.current && imageRef.current) {
          initializeDrawingCanvas();
        }
      }, 1500);
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
                <input
                  type="text"
                  name="text"
                  value={formData.text}
                  onChange={handleInputChange}
                  placeholder="カスタムテキストを入力"
                  className="text-input"
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
            <h2>{previewMode ? 'プレビュー（ドラッグで位置・サイズ調整 / 描画モード）' : '生成結果'}</h2>
            {previewMode ? (
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
                      console.log('Background clicked, clearing overlay selection');
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
                    key={`canvas-${baseImage ? baseImage.name : 'default'}-${drawingMode}`}
                    ref={drawingCanvasRef}
                    className={`drawing-canvas ${drawingMode ? 'drawing-active' : ''}`}
                    onMouseDown={handleDrawingStart}
                    onMouseMove={handleDrawingMove}
                    onMouseUp={handleDrawingEnd}
                    onMouseLeave={handleDrawingEnd}
                    style={{
                      display: drawingMode ? 'block' : 'none',
                      zIndex: drawingMode ? 1000 : 5
                    }}
                  />
                  
                  {/* 描画モード時の固定表示オーバーレイ */}
                  {drawingMode && (
                    <>
                      {/* 絵文字の固定表示 */}
                      {formData.emoji && (
                        <div 
                          style={{
                            left: emojiPosition.x - formData.emojiSize / 2,
                            top: emojiPosition.y - formData.emojiSize / 2,
                            width: formData.emojiSize,
                            height: formData.emojiSize,
                            position: 'absolute',
                            pointerEvents: 'none',
                            zIndex: 8,
                            transform: `rotate(${emojiRotation}deg)`,
                            transformOrigin: 'center center'
                          }}
                        >
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
                      )}
                      
                      {/* テキストの固定表示 */}
                      {formData.text && (
                        <div 
                          className="text-overlay"
                          style={{
                            fontSize: `${formData.fontSize}px`,
                            color: formData.textColor,
                            pointerEvents: 'none',
                            position: 'absolute',
                            left: textPosition.x - 100,
                            top: textPosition.y - formData.fontSize / 2,
                            width: '200px',
                            textAlign: 'center',
                            zIndex: 8,
                            transform: `rotate(${textRotation}deg)`,
                            transformOrigin: 'center center'
                          }}
                        >
                          {formData.text}
                        </div>
                      )}
                    </>
                  )}

                  {/* テキスト表示（独立） */}
                  {formData.text && (
                    <div 
                      className="text-overlay-container"
                      style={{
                        left: textPosition.x - 100,
                        top: textPosition.y - 30,
                        width: 200,
                        height: 60,
                        cursor: drawingMode ? 'default' : (isDragging && activeElement === 'text' ? 'grabbing' : 'grab'),
                        userSelect: 'none',
                        pointerEvents: drawingMode ? 'none' : 'auto',
                        display: drawingMode ? 'none' : 'block',
                        border: activeElement === 'text' ? '2px dashed rgba(102, 126, 234, 0.8)' : '2px dashed rgba(102, 126, 234, 0.3)'
                      }}
                      onMouseDown={(e) => {
                        console.log('TEXT CONTAINER CLICKED!');
                        e.stopPropagation();
                        setActiveElement('text');
                        handleMouseDown(e, 'text');
                      }}
                      onWheel={handleWheelOnTextOverlay}
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
                          {formData.text}
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
                        border: activeElement === 'emoji' ? '2px dashed rgba(102, 126, 234, 0.8)' : '2px dashed rgba(102, 126, 234, 0.3)'
                      }}
                      onMouseDown={(e) => {
                        console.log('EMOJI CONTAINER CLICKED!');
                        e.stopPropagation();
                        setActiveElement('emoji');
                        handleMouseDown(e, 'emoji');
                      }}
                      onWheel={handleWheelOnTextOverlay}
                    >
                      <div className="bounding-box">
                        <div style={{
                          transform: `rotate(${emojiRotation}deg)`,
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
                        zIndex: selectedOverlayIndex === index ? 20 : 12,
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
                        src={overlay.url}
                        alt={`Overlay ${index + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          opacity: overlay.opacity,
                          pointerEvents: 'none', // 画像自体はポインターイベントを受け取らない
                          borderRadius: '2px',
                          transform: `rotate(${overlay.rotation || 0}deg)`,
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
                {(formData.text || formData.emoji) && (
                  <div className="preview-info">
                    <div className="current-settings">
                      {formData.text && (
                        <span>テキスト位置: ({Math.round(textPosition.x)}, {Math.round(textPosition.y)}) サイズ: {formData.fontSize}px</span>
                      )}
                      {formData.emoji && (
                        <span>絵文字位置: ({Math.round(emojiPosition.x)}, {Math.round(emojiPosition.y)}) サイズ: {formData.emojiSize}px</span>
                      )}
                    </div>
                  </div>
                )}
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
