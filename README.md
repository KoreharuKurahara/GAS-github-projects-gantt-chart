# GAS GitHub Projects Gantt Chart

Google Apps Script (GAS) を使用して、GitHub Projects V2 のデータを Google Sheets に自動同期し、ガントチャートを表示するツールです。

## 機能

- **GitHub Projects V2 との連携**: GitHub の Organization プロジェクトからアイテムを自動取得
- **ガントチャート自動生成**: 予定と実績を別行で可視化
- **日付範囲設定**: カスタマイズ可能な期間設定
- **ステータス管理**: Status フィールドで進捗状況を追跡
- **視覚的な表示**:
  - 予定タスク（青色）と実際のタスク（緑色）を色分け
  - 土日を灰色で強調
  - 本日の日付をオレンジでハイライト

## セットアップ

### 前提条件

- Google Sheets アカウント
- GitHub Organization のオーナーまたはメンテナー権限
- GitHub Personal Access Token (PAT)

### インストール手順

1. **Google Sheets を作成**
   - [Google Sheets](https://sheets.google.com) で新しいスプレッドシートを作成します

2. **Apps Script を開く**
   - `拡張機能` → `Apps Script` をクリック

3. **スクリプトをコピー**
   - [googlesheet_gantt.gs](./googlesheet_gantt.gs) の内容をコピーして、Apps Script エディタに貼り付けます

4. **GitHub Personal Access Token を設定**
   - [GitHub Settings](https://github.com/settings/personal-access-tokens/new) で新しい PAT を作成します
   - スコープ: `read:org`
   - Apps Script の `プロジェクト設定` → `スクリプトプロパティ` で `GH_TOKEN` キーに PAT を設定

5. **スクリプトプロパティを設定**
   - スクリプトエディタの `プロジェクト設定` → `スクリプトプロパティ` を開く
   - 以下のプロパティを追加:
     | キー | 値 |
     |------|-----|
     | `GH_TOKEN` | あなたの GitHub Personal Access Token |

6. **スクリプトをカスタマイズ**
   - スクリプトファイルの以下の定数を編集:
     ```javascript
     const ORG_NAME = "your-org";           // あなたの Organization 名
     const OWNER_NAME = "your-username";    // あなたの GitHub ユーザー名
     const PROJECT_NUMBER = 1;              // プロジェクト番号
     const GANTT_START_DATE = new Date(2026, 0, 1);   // 開始日
     const GANTT_END_DATE = new Date(2026, 3, 30);    // 終了日
     ```

7. **初回実行**
   - `syncGitHubProject()` 関数を実行します
   - 権限承認ダイアログが表示されたら承認します

## 使用方法

### 手動実行

1. Apps Script エディタから `syncGitHubProject()` 関数を選択して実行

### 定期自動実行

1. `トリガー` ボタンをクリック
2. `+ トリガーを追加` をクリック
3. 以下の設定で新しいトリガーを作成:
   - 実行する関数: `syncGitHubProject`
   - 実行するデプロイ: `Head`
   - イベントのタイプ: `時間ベース` → `時間ごと` (推奨: 1時間)

## シートの見方

| 列 | 説明 |
|----|------|
| A | タイトル（イシュー名） |
| B | タイプ（予定/実際） |
| C | ステータス |
| D | 開始日 |
| E | 終了日 |
| F〜 | ガントチャート（日付別） |

## GitHub Projects の必須フィールド

スクリプトが正常に動作するには、GitHub Projects に以下のフィールドが必要です:

- `Status` (単一選択)
- `PlanStartDate` (日付)
- `PlanEndDate` (日付)
- `RealStartDate` (日付)
- `RealEndDate` (日付)

## トラブルシューティング

### "Project not found" エラー

- Organization 名が正しいか確認
- プロジェクト番号が正しいか確認
- PAT のスコープに `read:org` が含まれているか確認

### データが同期されない

- GitHub の API レート制限を確認
- Console ログでエラー詳細を確認: `console.log()` の出力を確認

## ライセンス

このプロジェクトは [MIT License](./LICENSE) の下で公開されています。

## 貢献

バグ報告や機能リクエストは [Issues](../../issues) でお願いします。
Pull Request も歓迎です！

## 作成者

[KoreharuKurahara](https://github.com/KoreharuKurahara)
