/** Thin fetch wrapper for the Gauß API (same-origin /api, session cookie). */
export async function api<T>(path: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? undefined : {'Content-Type': 'application/json'},
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
    })
  } catch {
    throw new Error('Keine Verbindung zum Server.')
  }
  const data = await res.json().catch(() => null)
  if (data === null) throw new Error('Der Server ist gerade nicht erreichbar. Bitte versuche es später noch einmal.')
  if (!res.ok) throw new Error((data as {error?: string}).error ?? 'Etwas ist schiefgelaufen.')
  return data as T
}
