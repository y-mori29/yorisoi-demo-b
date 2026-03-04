# よりそい — デモB環境用

このリポジトリは、**よりそい**の**デモB環境**用です。この環境を Google Cloud Run にデプロイするためのコードとスクリプトが含まれています。

---

## この環境の構成

デモB環境は、次の3つの Cloud Run サービスで構成されます。

| コンポーネント | 役割 | Cloud Run サービス名 |
|----------------|------|---------------------|
| **backend** | API・AI解析（音声認識・SOAP生成） | `demo-b-backend` |
| **frontend** | 現場用録音アプリ（スマホ） | `demo-b-frontend` |
| **dashboard** | 記録の確認・編集用管理画面（PC） | `demo-b-dashboard` |

- **backend** … `backend/`。Node.js (Express)。音声アップロード受付、Speech-to-Text、Gemini による構造化、Firestore 保存。
- **frontend** … `frontend/`。Next.js。施設・患者選択、録音、チャンク送信。
- **dashboard** … `dashboard/`。Vite + React。SOAP 閲覧・編集、施設・患者管理。

---

## Cloud Run へのデプロイ方法

### 前提条件

- **Google Cloud SDK（gcloud）** がインストールされ、認証済みであること。
- **GCP プロジェクト**（デフォルト: `yorisoi-medical`）への権限があること。
- 環境変数ファイル **`deploy_env_demo_b.yaml`**（または `deploy_env.yaml`）をルートに用意すること。API キー・バケット名・`ALLOW_ORIGIN` 等。リポジトリには機密を入れず、`deploy_env.example.yaml` をコピーして値を埋めてローカルで管理してください。

### デプロイの実行

PowerShell でリポジトリのルートに移動し、次を実行します。

```powershell
# 全コンポーネントをデプロイ
./deploy.ps1 -Target all

# 個別にデプロイする場合
./deploy.ps1 -Target backend
./deploy.ps1 -Target frontend
./deploy.ps1 -Target dashboard
```

- スクリプトは `demo-b-backend` / `demo-b-frontend` / `demo-b-dashboard` をビルド・デプロイします。
- backend の URL を取得したうえで、frontend と dashboard のビルド時にその URL を埋め込みます。
- リージョンはデフォルトで `asia-northeast1` です。

### デプロイ後の確認

- Cloud Run コンソールで `demo-b-backend` / `demo-b-frontend` / `demo-b-dashboard` の URL を確認してください。
