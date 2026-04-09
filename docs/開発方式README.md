# 📘 開発方式README

## 🧭 本ドキュメントの目的

本プロジェクトにおける以下の標準化を目的とする：

* 開発手順の統一
* 属人化の排除
* 保守性・再現性の確保

対象：

* GAS（Google Apps Script）案件
* Discord Bot（Node.js + GCP）案件

---

# 🌿 ブランチ運用ルール

## ■ ブランチ構成

| ブランチ        | 用途     |
| ----------- | ------ |
| main        | 本番     |
| develop     | 開発統合   |
| feature/xxx | 個別機能開発 |
| hotfix/xxx  | 緊急修正   |

---

## ■ 運用ルール

* 開発は必ず `feature/xxx` から開始
* develop にマージ後テスト
* 本番反映は main のみ

```bash
git checkout -b feature/member-notification
```

---

# 🟨 GAS案件の開発方法

---

## ■ ① 事前準備

### 必須ツール

* Node.js
* clasp
* Googleアカウント

```bash
npm install -g @google/clasp
clasp login
```

---

### プロジェクト紐付け

```bash
clasp create --type standalone
```

または既存：

```bash
clasp clone <scriptId>
```

---

### スプレッドシート準備

* ローカル用シート：
  *  マスタシート：https://docs.google.com/spreadsheets/d/1sFyV-SQpZFWuDy1bMx4qq9QAvFncK4op8S47AXRIej0/edit?usp=drive_link
  *  ログシート：https://docs.google.com/spreadsheets/d/1QkgrYxXoVX7zw4Ddw2AJEs4caQ8UMQDopBnOx2Rt9-A/edit?usp=drive_link
* 本番用シート：
  * マスタシート：https://docs.google.com/spreadsheets/d/13iDJebf-qeFUwDZ48KpTwH9DawSI6Ihs50AcF3Gl8xI/edit?usp=drive_link
  * ログシート：https://docs.google.com/spreadsheets/d/12MjrwCEDHnVXv8DTGqdJ6HUGWqqHKhKPiRFl9PvGhOk/edit?usp=drive_link

必要な項目を追加・変更・削除

---
### 🔐 環境変数管理

GASでは**スクリプトプロパティを使用**

```javascript
const scriptProperties = PropertiesService.getScriptProperties();
const BOT_TOKEN = scriptProperties.getProperty("BOT_TOKEN");
```

---

### ■ 登録方法

GASエディタ →
「プロジェクトの設定」→「スクリプトプロパティ」

| キー                  | 内容           |
| ------------------- | ------------ |
| DISCORD_WEBHOOK_URL | 通知用          |
| SPREADSHEET_ID      | 対象シート        |
| ENV                 | local / prod |

---

### ■ ルール

* **コード内に直書き禁止**
* 環境ごとに値を分離
* ローカルと本番で切替

---

## ■ ② 開発規約

### 1. 命名規則

| 種別   | ルール         |
| ---- | ----------- |
| 関数   | camelCase   |
| 定数   | UPPER_SNAKE |
| シート名 | PascalCase  |
| カラム  | snake_case  |

---

### 2. シート構成（必須）

| 行   | 内容    |
| --- | ----- |
| 1行目 | 必須/任意 |
| 2行目 | 日本語   |
| 3行目 | 英語キー  |

---

### 3. コーディング方針

* ロジックとI/Oを分離
* シートアクセスは共通関数化
* ハードコード禁止（設定マスタ化）

---

### 4. NG事項

* 直接セル参照（A1など固定）
* フラグなし更新処理
* ログ未出力

---

## ■ ③ デプロイ方法（具体手順）

### ① ローカル反映

```bash
//ローカル用スクリプトIDを.clasp.jsonに反映する
cd .clasp.local.json .clasp.json

clasp push
```

---

### ② GAS側確認

* エディタでコード確認
* バージョン作成

---

### ③ デプロイ

```bash
clasp deploy
```
* デプロイ後スクリプトプロパティを必ず設定

---

### ④ トリガー設定

* GAS管理画面
* 「トリガー」→追加

例：

* 毎日10時
* 時間主導型

---

## ■ ④ 稼働方法

### 手動実行

* GASエディタ → 実行

---

### 自動実行

* トリガーによる定期実行

---

### 実行フロー

```text
① トリガー起動
② メイン関数実行
③ データ取得
④ 処理
⑤ ログ出力
```

---

## ■ ⑤ テスト方法

### 1. 単体テスト

* 関数単位で実行
* Logger.log確認

---

### 2. 疑似データテスト

* ローカルシート使用
* テストデータ投入

---

### 3. 本番想定テスト

* トリガー実行
* ログ確認

---

### 4. チェック項目

* 重複実行されないか
* フラグ更新されるか
* エラー時ログ出るか

---

---

# 🟦 Bot案件の開発方法（Node.js + Discord + GCP）

---

## ■ ① 事前準備

### 必須

* Node.js
* Discord Developerアカウント
* GCPプロジェクト

---

### Discord Bot作成

1. Developer Portalで作成
2. Token取得
    * 初回は対象のBotから「Bot」＞「トークンをリセット」
    * その後同じトークンは表示されなくなるのでSecretManagerに保存
3. Intent有効化
    * 対象のBotから「Bot」＞「Server Members Intent」をON

---

### 環境変数管理（重要）

Botは **Secret Manager を使用**

---

### ■ Secret登録

* SecretManagerのGUIを使用

---

### ■ 取得方法（Node.js）

```javascript
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

const client = new SecretManagerServiceClient();

async function getSecret(name) {
  const [version] = await client.accessSecretVersion({
    name: `projects/PROJECT_ID/secrets/${name}/versions/latest`,
  });
  return version.payload.data.toString();
}
```

---

### ■ 管理対象

| キー             | 内容           |
| -------------- | ------------ |
| BOT_TOKEN      | Discordトークン  |
| SPREADSHEET_ID | シートID        |
| ENV            | local / prod |

---

### ■ ルール

* **.env禁止（本番）**
* Secret Manager以外に置かない
* Gitに絶対含めない

---

## ■ ② 開発規約

### 1. ディレクトリ構成

```id="u2cz0k"
bot/
 ├─ index.js
 ├─ services/
 ├─ utils/
 ├─ config/
```

---

### 2. 設計方針

* API処理分離
* Discord処理と業務ロジック分離
* 環境変数で制御

---

### 3. ログ

* console.log禁止
* 構造ログ（JSON推奨）

---

### 4. エラー処理

* try-catch必須
* エラーは必ずログ出力

---

## ■ ③ デプロイ方法（具体手順）

### ① GCPログイン

```bash
gcloud auth login
gcloud config set project <PROJECT_ID>
```

---

### ② デプロイ（Cloud Run）

```bash
gcloud run deploy bot-service \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated
```

---

### ③Secret紐付け

```bash
gcloud run services update bot-service \
  --update-secrets BOT_TOKEN=BOT_TOKEN:latest
```

---

### ④ 起動確認

* Cloud Run URL確認
* ログ確認

---

## ■ ④ 稼働方法

### 常駐型

* Cloud Run起動状態維持

---

### イベント駆動

* Discordイベント受信
* HTTPトリガー

---

### フロー

```text
① Bot起動
② Discord接続
③ イベント受信
④ 処理
⑤ 外部連携（Sheets等）
```

---

## ■ ⑤ テスト方法

### 1. ローカル実行

```bash
node src/index.js
```

---

### 2. Discord検証

* テストサーバで確認
* 権限チェック

---

### 3. API連携テスト

* Sheets書き込み確認
* エラー確認

---

### 4. 本番テスト

* Cloud Runログ確認
* 実ユーザー影響確認

---

## ■ テスト観点

* Intent設定漏れ
* Token不正
* 権限不足（Webhook / Role）
* API制限

---

# 🔚 補足

この開発方式のポイント：

### ✔ 保守性重視

→ 少ない人数での保守ができるようにログ出力、自動テストを強化

### ✔ 分離設計

→ GASとBotを役割分担

### ✔ 本番事故防止

→ ローカル→develop→本番の順

