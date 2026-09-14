# ビルド時のPrisma / OpenSSLエラー

`libquery_engine-debian-openssl-1.1.x.so.node`と`libssl.so.1.1: cannot open shared object file`は、Prismaが選択したエンジンに必要なOSライブラリをロードできないことを示す。eslintの非推奨警告やnpmの更新通知が今回の終了原因ではない。

トップページはビルド時にDB取得せず、リクエスト時に起動済みの公開フィードを参照する方式へ変更した。これでトップページの事前生成によるビルド失敗を避ける。架空の空一覧をビルドして配信する方式ではない。

これはOSライブラリをインストールする修正ではない。実行環境でもエラーが出る場合は、ホスティング環境に適切なOpenSSLライブラリが必要。Debian/Ubuntu系の管理可能なイメージではOpenSSLをインストールした上で依存関係を再生成する。OpenSSL 3しかない環境で1.1の名前へシンボリックリンクを張らない（ABI互換性はない）。

既存schemaには`debian-openssl-3.0.x`も含まれる。`binaryTargets`はエンジンを同梱する設定であり、OSのlibsslを導入したり自動検出を強制変更する設定ではない。再デプロイ後に`/api/health`と募集一覧で実行時のDB接続も確認する。

公式資料: [Prismaのシステム要件](https://www.prisma.io/docs/orm/reference/system-requirements)。OpenSSL検出に失敗すると1.1.xへフォールバックする仕様が説明されている。
