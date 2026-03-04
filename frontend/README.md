# よりそい — Frontend（録音アプリ）

よりそいシステムの**フロントエンド**です。訪問薬局・在宅医療の現場で使う**録音用 Web アプリ**で、スマートフォンのブラウザで利用します。

## 役割

- 施設・患者の選択
- マイクからの音声録音（AudioWorklet / Raw PCM）
- 録音データのチャンク送信（通信が不安定でもデータ消失を防ぐ）
- 録音停止後は解析を待たずに即「完了」画面へ遷移（非同期設計）

## 技術スタック

- Next.js 14, React 18, TypeScript, Tailwind CSS

## 前提条件

- Node.js v18 以上
- バックエンド API の URL（環境変数 `NEXT_PUBLIC_API_BASE_URL`、未設定時は `http://localhost:8081`）

## ローカルでの起動

```bash
npm install
npm run dev
```

ブラウザで表示された URL（例: http://localhost:3000）を開いて利用します。バックエンドが別途起動している必要があります。

## ビルド・本番

```bash
npm run build
npm start
```

本番デプロイ時は、デプロイスクリプトがバックエンド URL を環境変数に注入します。ルートの [README.md](../README.md) のデプロイコマンドを参照してください。

## プロジェクト全体について

- ワークスペースの構成・他アプリ（backend / dashboard）の説明は、ルートの [README.md](../README.md) および [docs/WORKSPACE_GUIDE_FOR_BEGINNERS.md](../docs/WORKSPACE_GUIDE_FOR_BEGINNERS.md) を参照してください。
