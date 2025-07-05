import React, { useState, useRef } from 'react';
import './App.css';

function App() {
  const [formData, setFormData] = useState({
    text: '',
    emoji: '',
    x: 260,  // 猫の顔の中心位置に合わせる
    y: 143,  // 猫の顔の中心位置に合わせる
    fontSize: 48,
    emojiSize: 164,
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
  
  // Drawing states
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingMode, setDrawingMode] = useState(false);
  const [drawingColor, setDrawingColor] = useState('#ff0000');
  const [drawingThickness, setDrawingThickness] = useState(5);
  const [drawingHistory, setDrawingHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Overlay image states
  const [overlayImages, setOverlayImages] = useState([]);
  const [selectedOverlayIndex, setSelectedOverlayIndex] = useState(-1);
  const [isOverlayDragging, setIsOverlayDragging] = useState(false);
  const [isOverlayResizing, setIsOverlayResizing] = useState(false);
  
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

  const handleOverlayImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
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
          file: file,
          url: URL.createObjectURL(file),
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
        console.log(`New overlay added: ${width}x${height} (original: ${img.width}x${img.height})`);
      };
      img.src = URL.createObjectURL(file);
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
      console.log(`Image loaded: ${scale} (natural: ${naturalWidth}, display: ${displayWidth})`);
      console.log(`Image src: ${imageRef.current.src}`);
      console.log(`Image dimensions: ${imageRef.current.clientWidth}x${imageRef.current.clientHeight}`);
      
      // 描画キャンバスを初期化（複数回の試行で確実に実行）
      setTimeout(() => {
        console.log('Image load canvas init - attempt 1');
        if (drawingMode && previewMode && drawingCanvasRef.current) {
          initializeDrawingCanvas();
        }
      }, 200);
      
      setTimeout(() => {
        console.log('Image load canvas init - attempt 2');
        if (drawingMode && previewMode && drawingCanvasRef.current) {
          initializeDrawingCanvas();
        }
      }, 600);
      
      setTimeout(() => {
        console.log('Image load canvas init - attempt 3');
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
      
      console.log('🔧 Canvas init - Image size:', clientWidth, 'x', clientHeight);
      
      // サイズが0の場合は再試行
      if (clientWidth === 0 || clientHeight === 0) {
        console.log('⏳ Size is 0, retrying in 500ms...');
        setTimeout(() => initializeDrawingCanvas(), 500);
        return;
      }
      
      canvas.width = clientWidth;
      canvas.height = clientHeight;
      
      console.log('✅ Canvas initialized:', canvas.width, 'x', canvas.height);
      
      // コンテキストの設定
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.globalCompositeOperation = 'source-over';
      
      drawingContextRef.current = context;
      
      // 履歴をクリア
      setDrawingHistory([]);
      setHistoryIndex(-1);
      // 初期状態を履歴に保存
      setTimeout(() => saveToHistory(), 10);
    } else {
      console.log('❌ Canvas init failed - Canvas:', !!drawingCanvasRef.current, 'Image:', !!imageRef.current);
    }
  };

  const saveToHistory = () => {
    if (!drawingCanvasRef.current) return;
    
    const canvas = drawingCanvasRef.current;
    const imageData = canvas.toDataURL();
    
    setDrawingHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(imageData);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      restoreFromHistory(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < drawingHistory.length - 1) {
      setHistoryIndex(prev => prev + 1);
      restoreFromHistory(historyIndex + 1);
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

  const clearDrawing = () => {
    if (!drawingCanvasRef.current) return;
    
    const canvas = drawingCanvasRef.current;
    const context = drawingContextRef.current;
    context.clearRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
  };

  const handleDrawingStart = (e) => {
    console.log('🎨 DRAWING START - Mode:', drawingMode, 'Canvas:', !!drawingCanvasRef.current);
    
    if (drawingCanvasRef.current) {
      const canvas = drawingCanvasRef.current;
      console.log('🎨 Canvas size:', canvas.width, 'x', canvas.height);
      
      if (canvas.width === 0 || canvas.height === 0) {
        console.error('🚨 CANVAS SIZE IS ZERO! This prevents drawing.');
        return;
      }
    }
    
    if (!drawingMode || !drawingCanvasRef.current) {
      console.log('🛑 Early return - not in drawing mode or no canvas');
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    setIsDrawing(true);
    const canvas = drawingCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    console.log('🎨 Drawing at:', x, y);
    
    const context = drawingContextRef.current;
    if (!context) {
      console.error('🚨 NO DRAWING CONTEXT!');
      return;
    }
    
    // 前回のパスをクリア
    context.closePath();
    // 新しいパスを開始
    context.beginPath();
    context.strokeStyle = drawingColor;
    context.lineWidth = drawingThickness;
    context.moveTo(x, y);
    console.log('✅ Drawing started successfully');
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
    console.log('Drawing end called:', { isDrawing, drawingMode });
    if (!isDrawing || !drawingMode) return;
    
    // 現在のパスを閉じる
    if (drawingContextRef.current) {
      drawingContextRef.current.closePath();
    }
    
    setIsDrawing(false);
    saveToHistory();
    console.log('Drawing ended and saved to history');
  };

  const startPreview = () => {
    // テキストや絵文字がある場合のみtextBoundsを設定
    if (formData.text || formData.emoji) {
      const bounds = calculateTextBounds();
      setTextBounds(bounds);
      console.log('Preview started with bounds:', bounds);
    }
    // プレビュー開始時はオーバーレイの選択をクリア
    setSelectedOverlayIndex(-1);
    setPreviewMode(true);
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
    
    console.log(`=== TEXT/EMOJI DRAG START ===`);
    console.log(`Mouse down at: (${x}, ${y}), formData: (${formData.x}, ${formData.y})`);
    console.log(`Canvas rect:`, canvasRect);
    console.log(`Current textBounds:`, currentBounds);
    console.log(`FormData:`, formData);
    
    setIsDragging(true);
    setIsResizing(false); // リサイズ状態をクリア
    // テキスト/絵文字操作時はオーバーレイ操作状態をクリアしない（選択状態は維持）
    // setIsOverlayDragging(false);
    // setIsOverlayResizing(false);
    // setSelectedOverlayIndex(-1);
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
      
      // 画像の境界内に制限（余白を考慮）
      const margin = 50;
      const newX = Math.max(margin, Math.min(rect.width - margin, x));
      const newY = Math.max(margin, Math.min(rect.height - margin, y));
      
      console.log(`Overlay dragging to: (${newX}, ${newY})`);
      updateOverlayImage(selectedOverlayIndex, { x: newX, y: newY });
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
                opacity: overlay.opacity
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
      console.log('Drawing mode enabled, reinitializing canvas with forced remount');
      // 描画状態をリセット
      setIsDrawing(false);
      // keyによる強制再マウント後、より長い遅延で初期化
      setTimeout(() => {
        console.log('Drawing mode init - attempt 1 (post-remount)');
        if (drawingCanvasRef.current && imageRef.current) {
          initializeDrawingCanvas();
        }
      }, 300);
      setTimeout(() => {
        console.log('Drawing mode init - attempt 2 (post-remount)');
        if (drawingCanvasRef.current && imageRef.current) {
          initializeDrawingCanvas();
        }
      }, 800);
      setTimeout(() => {
        console.log('Drawing mode init - attempt 3 (post-remount)');
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
      console.log('textBounds updated due to form change (not during resize):', newBounds);
    }
  }, [formData.fontSize, formData.emojiSize, formData.text, formData.emoji, isResizing]);

  // グローバルマウスイベントリスナー
  React.useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      console.log('Global mouse move detected', { isDragging, isResizing, isOverlayDragging, isOverlayResizing });
      if (isDragging || isResizing || isOverlayDragging || isOverlayResizing) {
        handleMouseMove(e);
      }
    };

    const handleGlobalMouseUp = () => {
      console.log('Global mouse up detected', { isDragging, isResizing, isOverlayDragging, isOverlayResizing });
      if (isDragging || isResizing || isOverlayDragging || isOverlayResizing) {
        console.log('Global mouse up - stopping drag/resize');
        
        // 操作終了後にtextBoundsを再計算して同期
        const finalBounds = calculateTextBounds();
        setTextBounds(finalBounds);
        console.log('Final textBounds after mouse up:', finalBounds);
        
        setIsDragging(false);
        setIsResizing(false);
        setIsOverlayDragging(false);
        setIsOverlayResizing(false);
        setResizeDirection('');
        // オーバーレイの選択状態は維持する（リサイズハンドルを表示し続けるため）
        // setSelectedOverlayIndex(-1);
      }
    };

    if (previewMode && (isDragging || isResizing || isOverlayDragging || isOverlayResizing)) {
      console.log('Adding global mouse listeners');
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        console.log('Removing global mouse listeners');
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [previewMode, isDragging, isResizing, isOverlayDragging, isOverlayResizing, dragOffset, initialMousePos, initialSize, selectedOverlayIndex, formData, overlayImages]);

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
                          name="x"
                          value={formData.x}
                          onChange={handleInputChange}
                          className="number-input text-emoji-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Y座標:</label>
                        <input
                          type="number"
                          name="y"
                          value={formData.y}
                          onChange={handleInputChange}
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
                          name="x"
                          value={formData.x}
                          onChange={handleInputChange}
                          className="number-input text-emoji-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Y座標:</label>
                        <input
                          type="number"
                          name="y"
                          value={formData.y}
                          onChange={handleInputChange}
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
                      zIndex: drawingMode ? 15 : 5
                    }}
                  />
                  
                  {/* 描画モード時の固定表示オーバーレイ */}
                  {drawingMode && (
                    <div 
                      className="fixed-overlay"
                      style={{
                        left: formData.x - formData.emojiSize / 2,
                        top: formData.y - formData.emojiSize / 2,
                        width: formData.emojiSize,
                        height: formData.emojiSize,
                        position: 'absolute',
                        pointerEvents: 'none',
                        zIndex: 8
                      }}
                    >
                      {formData.emoji ? (
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
                      ) : null}
                      {formData.text ? (
                        <div 
                          className="text-overlay"
                          style={{
                            fontSize: `${formData.fontSize}px`,
                            color: formData.textColor,
                            pointerEvents: 'none',
                            position: 'absolute',
                            left: formData.x - 200,
                            top: formData.y - formData.fontSize / 2,
                            width: '400px',
                            textAlign: 'center'
                          }}
                        >
                          {formData.text}
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* テキストや絵文字がある場合のみ表示 */}
                  {(formData.text || formData.emoji) && (
                    <div 
                      className="text-overlay-container"
                      style={{
                        left: Math.max(0, formData.x - (Math.max(textBounds.width, 50) + 40) / 2),
                        top: Math.max(0, formData.y - (Math.max(textBounds.height, 50) + 40) / 2),
                        width: Math.min(500, Math.max(textBounds.width, 50) + 40),
                        height: Math.min(500, Math.max(textBounds.height, 50) + 40),
                        cursor: drawingMode ? 'default' : (isDragging ? 'grabbing' : 'grab'),
                        userSelect: 'none',
                        pointerEvents: drawingMode ? 'none' : 'auto',
                        display: drawingMode ? 'none' : 'block'
                      }}
                    onMouseDown={(e) => {
                      console.log('TEXT CONTAINER CLICKED!');
                      e.stopPropagation();
                      handleMouseDown(e);
                    }}
                    onWheel={handleWheelOnTextOverlay}
                  >
                    <div className="bounding-box">
                      {formData.emoji ? (
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
                      ) : null}
                      {formData.emoji ? (
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
                      ) : null}
                      {formData.text ? (
                        <div 
                          className="text-overlay"
                          style={{
                            fontSize: `${formData.fontSize}px`,
                            color: formData.textColor,
                            pointerEvents: 'none',
                            maxWidth: '400px',
                            wordWrap: 'break-word',
                            overflowWrap: 'break-word',
                            hyphens: 'auto',
                            lineHeight: '1.2',
                            whiteSpace: (() => {
                              const fontSize = formData.fontSize;
                              const charWidth = fontSize * 0.6;
                              const totalWidth = formData.text.length * charWidth;
                              return totalWidth > 400 ? 'normal' : 'nowrap';
                            })()
                          }}
                        >
                          {formData.text}
                        </div>
                      ) : null}
                      
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
                        console.log(`Overlay container clicked: ${index}, drawingMode: ${drawingMode}`);
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
                          borderRadius: '2px'
                        }}
                        draggable={false}
                      />
                      
                      {/* Resize handles for selected overlay */}
                      {selectedOverlayIndex === index && !drawingMode && (
                        <>
                          <div 
                            className="resize-handle corner-nw"
                            onMouseDown={(e) => {
                              console.log(`Overlay resize handle NW clicked for index ${index}`);
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
                        </>
                      )}
                    </div>
                  ))}
                </div>
                {(formData.text || formData.emoji) && (
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
                      <button
                        onClick={() => {
                          console.log('=== CANVAS DEBUG INFO ===');
                          console.log('Drawing mode:', drawingMode);
                          console.log('Preview mode:', previewMode);
                          console.log('Base image:', baseImage ? baseImage.name : 'default');
                          
                          if (drawingCanvasRef.current) {
                            const canvas = drawingCanvasRef.current;
                            console.log('Canvas:', {
                              width: canvas.width,
                              height: canvas.height,
                              style: canvas.style.cssText,
                              className: canvas.className,
                              pointerEvents: getComputedStyle(canvas).pointerEvents
                            });
                          } else {
                            console.log('No canvas ref');
                          }
                          
                          if (drawingContextRef.current) {
                            console.log('Context exists:', !!drawingContextRef.current);
                          } else {
                            console.log('No drawing context');
                          }
                          
                          if (imageRef.current) {
                            console.log('Image:', {
                              src: imageRef.current.src,
                              naturalWidth: imageRef.current.naturalWidth,
                              naturalHeight: imageRef.current.naturalHeight,
                              clientWidth: imageRef.current.clientWidth,
                              clientHeight: imageRef.current.clientHeight
                            });
                          } else {
                            console.log('No image ref');
                          }
                          
                          // 強制的にキャンバスを再初期化
                          console.log('Force reinitializing canvas...');
                          initializeDrawingCanvas();
                        }}
                        className="drawing-button"
                        style={{ background: '#17a2b8', color: 'white' }}
                      >
                        🔧 Debug
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
