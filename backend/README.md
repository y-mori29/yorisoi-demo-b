# よりそい — Backend（API・AI解析サーバー）

よりそいシステムの**バックエンド**です。録音された音声を受け取り、音声認識（Speech-to-Text）と AI（Gemini）で医療記録（SOAP 等）に変換し、Firestore に保存します。

## 役割

- フロントエンド・ダッシュボードからの API リクエストの受け付け
- 音声アップロード用の署名付き URL（GCS）の発行
- 音声の正規化（ffmpeg）、音声認識、文脈補正、構造化データ生成（非同期処理）
- 施設・患者・記録（encounters）の取得・更新

## 技術スタック

- Node.js, Express
- Firebase Admin（Firestore）, Google Cloud Storage, Speech-to-Text, Gemini

## 前提条件

- Node.js v18 以上
- Firebase のサービスアカウントキー（`sa-key.json`）を `backend/` 直下に配置
- `.env` にバケット名・API キー等を設定（`deploy_env.example.yaml` やルートのドキュメントを参照）

## ローカルでの起動

```bash
npm install
npm start
```

デフォルトではポート 8081 で待ち受けます。ルートの [HANDOVER_TECHNICAL_SPEC.md](../HANDOVER_TECHNICAL_SPEC.md) にローカル開発環境の構築手順の詳細があります。

## プロジェクト全体について

- ワークスペースの構成・他アプリ（frontend / dashboard）の説明は、ルートの [README.md](../README.md) および [docs/WORKSPACE_GUIDE_FOR_BEGINNERS.md](../docs/WORKSPACE_GUIDE_FOR_BEGINNERS.md) を参照してください。
