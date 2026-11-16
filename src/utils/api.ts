export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data: T;
}

/**
 * Safe JSON fetch wrapper that prevents cryptic
 * "Unexpected token 'T', \"The page c\"... is not valid JSON" errors
 * when an API endpoint returns HTML or plain-text (e.g. 404/500/502).
 */
export async function apiFetch<T = any>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const res = await fetch(url, options);
  const rawText = await res.text();

  if (!rawText) {
    return {
      ok: res.ok,
      status: res.status,
      data: { success: res.ok } as T,
    };
  }

  try {
    const parsed = JSON.parse(rawText) as T;
    return {
      ok: res.ok,
      status: res.status,
      data: parsed,
    };
  } catch {
    const preview = rawText.trim();
    if (res.status === 404 || preview.startsWith('The page c')) {
      throw new Error(
        'Không kết nối được máy chủ xử lý (/api). Vui lòng kiểm tra cấu hình Backend Node.js hoặc truy cập đường dẫn chính thức của hệ thống.'
      );
    }
    throw new Error(
      `Máy chủ trả về phản hồi không hợp lệ (HTTP ${res.status}). Vui lòng thử lại sau.`
    );
  }
}
