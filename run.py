#!/usr/bin/env python3
"""
Hirsakam Icon Generator - 統合実行スクリプト
"""

import subprocess
import sys
import os
import time
import signal
from pathlib import Path

def run_backend():
    """バックエンドサーバーを起動"""
    backend_dir = Path(__file__).parent / "backend"
    
    # 必要なディレクトリを作成
    os.makedirs("output", exist_ok=True)
    os.makedirs("temp_uploads", exist_ok=True)
    
    # 仮想環境のアクティベート
    venv_path = Path(__file__).parent / "venv"
    if venv_path.exists():
        if sys.platform == "win32":
            python_path = venv_path / "Scripts" / "python.exe"
        else:
            python_path = venv_path / "bin" / "python"
    else:
        python_path = "python3"
    
    print("🚀 バックエンドサーバーを起動中...")
    print(f"📂 Working directory: {backend_dir}")
    
    try:
        # FastAPIサーバーを起動
        process = subprocess.Popen([
            str(python_path), "app.py"
        ], cwd=backend_dir)
        
        print("✅ バックエンドサーバーが起動しました (http://localhost:8000)")
        print("💡 フロントエンドは別のターミナルで以下を実行してください:")
        print("   python3 run.py frontend")
        print("\n⏹️  終了するには Ctrl+C を押してください")
        
        # プロセスの終了を待機
        process.wait()
        
    except KeyboardInterrupt:
        print("\n🛑 サーバーを終了しています...")
        process.terminate()
        process.wait()
        print("✅ サーバーが正常に終了しました")
    except Exception as e:
        print(f"❌ エラーが発生しました: {e}")
        sys.exit(1)

def run_frontend():
    """フロントエンドサーバーを起動"""
    frontend_dir = Path(__file__).parent / "frontend"
    
    print("🎨 フロントエンドサーバーを起動中...")
    print(f"📂 Working directory: {frontend_dir}")
    
    try:
        # npm startを実行
        process = subprocess.Popen([
            "npm", "start"
        ], cwd=frontend_dir)
        
        print("✅ フロントエンドサーバーが起動しました (http://localhost:3000)")
        print("\n⏹️  終了するには Ctrl+C を押してください")
        
        # プロセスの終了を待機
        process.wait()
        
    except KeyboardInterrupt:
        print("\n🛑 サーバーを終了しています...")
        process.terminate()
        process.wait()
        print("✅ サーバーが正常に終了しました")
    except Exception as e:
        print(f"❌ エラーが発生しました: {e}")
        sys.exit(1)

def run_both():
    """バックエンドとフロントエンドを同時起動"""
    print("🐱 Hirsakam Icon Generator を起動しています...")
    print("=" * 50)
    
    # 必要なディレクトリを作成
    os.makedirs("output", exist_ok=True)
    os.makedirs("temp_uploads", exist_ok=True)
    
    backend_dir = Path(__file__).parent / "backend"
    frontend_dir = Path(__file__).parent / "frontend"
    
    # 仮想環境のアクティベート
    venv_path = Path(__file__).parent / "venv"
    if venv_path.exists():
        if sys.platform == "win32":
            python_path = venv_path / "Scripts" / "python.exe"
        else:
            python_path = venv_path / "bin" / "python"
    else:
        python_path = "python3"
    
    try:
        # バックエンドを起動
        print("🚀 バックエンドサーバーを起動中...")
        backend_process = subprocess.Popen([
            str(python_path), "app.py"
        ], cwd=backend_dir)
        
        # 少し待機
        time.sleep(3)
        
        # フロントエンドを起動
        print("🎨 フロントエンドサーバーを起動中...")
        frontend_process = subprocess.Popen([
            "npm", "start"
        ], cwd=frontend_dir)
        
        print("\n✅ 起動完了!")
        print("🔗 フロントエンド: http://localhost:3000")
        print("🔗 バックエンドAPI: http://localhost:8000")
        print("📚 API ドキュメント: http://localhost:8000/docs")
        print("\nCtrl+C で終了します...")
        
        # プロセスの終了を待機
        backend_process.wait()
        frontend_process.wait()
        
    except KeyboardInterrupt:
        print("\n🛑 アプリケーションを終了中...")
        # プロセスを終了
        backend_process.terminate()
        frontend_process.terminate()
        
        # 終了を待機
        backend_process.wait()
        frontend_process.wait()
        
        print("✅ 終了しました")
    except Exception as e:
        print(f"❌ エラーが発生しました: {e}")
        sys.exit(1)

def main():
    """メイン関数"""
    if len(sys.argv) < 2:
        # デフォルトで両方起動
        run_both()
        return
    
    mode = sys.argv[1].lower()
    
    if mode == "backend":
        run_backend()
    elif mode == "frontend":
        run_frontend()
    elif mode == "both":
        run_both()
    elif mode == "help" or mode == "-h" or mode == "--help":
        print("🐱 Hirsakam Icon Generator")
        print("=" * 50)
        print("使用方法:")
        print("  python3 run.py           # 両方同時に起動（デフォルト）")
        print("  python3 run.py backend   # バックエンドサーバーのみ起動")
        print("  python3 run.py frontend  # フロントエンドサーバーのみ起動")
        print("  python3 run.py both      # 両方同時に起動")
        print("  python3 run.py help      # このヘルプを表示")
        print("\n推奨（別々のターミナルで起動する場合）:")
        print("  1. 最初のターミナル: python3 run.py backend")
        print("  2. 2つ目のターミナル: python3 run.py frontend")
    else:
        print(f"❌ 不明なモード: {mode}")
        print("利用可能なモード: backend, frontend, both, help")
        print("ヘルプ: python3 run.py help")
        sys.exit(1)

if __name__ == "__main__":
    main()