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
- ログイン／マイページへのWeb導線

投稿、参加申請、ログインなど認証が必要な操作は、現行のNextAuthセッションを壊さないようWebへ引き継ぎます。ネイティブ認証を追加する場合は、モバイル専用トークン交換APIを別途実装してください。

## API

読み取り専用の `/api/mobile/v1` を利用します。Prismaやサービスアカウント情報はアプリへ含めません。

## 検証

```bash
npm run lint
npm run typecheck
npx expo-doctor
```
