// SMTP_SECUREの明示指定を優先しつつ、未指定ならポート465(暗黙TLS)だけtrueにする。
// 465なのにsecure:falseだとSTARTTLSネゴシエーションを試みて接続に失敗するため。
export function resolveSmtpSecure(port: number, secureEnv: string | undefined) {
  return secureEnv ? secureEnv === 'true' : port === 465;
}
