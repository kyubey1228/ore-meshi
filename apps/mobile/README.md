# 俺は誰かと飯が食いたい！ Mobile

既存のNext.js Webをバックエンドとして利用するExpo SDK 57アプリです。管理画面、グロース画面、法人画面は含みません。

## 起動

```bash
cp .env.example .env.local
npm install
npm start
```

実機からローカルのNext.jsへ接続するときは、`localhost` ではなくPCのLAN内IPを `EXPO_PUBLIC_API_URL` と `EXPO_PUBLIC_WEB_URL` に指定してください。環境変数を設定しなければ本番Webへ接続します。

## アプリ内の画面

- 募集中の飯一覧・エリア検索
- 募集詳細・共有
- メディア記事一覧・記事本文・共有
- Xネイティブログインとアプリ内セッション
- マイページへの導線

X認証画面は安全なシステムブラウザで開きます。認証後は `ore-meshi://auth/callback` でアプリへ戻り、PKCE付きの一回限りコードをモバイルセッションへ交換します。アクセストークンは端末のSecureStoreへ保存され、Xのシークレットはアプリに含まれません。

カスタムURLスキームを利用するため、ログイン確認はExpo GoではなくDevelopment Buildまたはストア用ビルドで行ってください。

## API

`/api/mobile/v1` とモバイル認証APIを利用します。Prisma、OAuthシークレット、サービスアカウント情報はアプリへ含めません。初回デプロイ前にルートディレクトリで `npm run db:deploy` を実行してモバイルセッション用テーブルを作成してください。

## 検証

```bash
npm run lint
npm run typecheck
npx expo-doctor
```
