export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public fields: { path: string[]; message: string }[] = [],
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  method = 'GET',
  body?: unknown,
  key?: string,
): Promise<T> {
  const response = await fetch(`/api/v1/${path}`, {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(key ? { 'Idempotency-Key': key } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok)
    throw new ApiError(
      data.code === 'STORAGE_UNAVAILABLE'
        ? 'Photo uploads are temporarily unavailable. Please try again later.'
        : data.code === 'AUTH_UNAVAILABLE'
          ? 'Sign-in is temporarily unavailable. You can still browse and contact advertisers.'
          : data.message || 'Something went wrong. Please try again.',
      data.code,
      response.status,
      data.fields,
    );
  return data as T;
}
