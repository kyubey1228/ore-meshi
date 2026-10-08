type ApiErrorBody = { message?: unknown };

export async function readJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.includes('application/json')) {
    const status = response.status ? ` (HTTP ${response.status})` : '';
    throw new Error(`${fallbackMessage}${status}`);
  }

  try {
    return await response.json() as T;
  } catch {
    throw new Error(`${fallbackMessage} (応答形式が不正です)`);
  }
}

export function apiErrorMessage(body: ApiErrorBody, fallbackMessage: string) {
  return typeof body.message === 'string' && body.message.trim() ? body.message : fallbackMessage;
}
