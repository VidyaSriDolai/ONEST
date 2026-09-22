import { authenticateApiKey } from '../modules/certificates/api-keys.service.js';
import type { NextFunction, Request, Response } from 'express';


/**
 * Optional API-key authentication for the public verification endpoint.
 *
 * Deliberately non-blocking: the endpoint works with no key at all (that is
 * what a QR scan does). A valid key only changes attribution — the check is
 * logged against the key and the API channel — so employers can see their own
 * machine-to-machine usage. An invalid key is treated exactly like no key,
 * rather than returning 401, so probing cannot distinguish the two.
 */
export async function optionalApiKey(req: Request, _res: Response, next: NextFunction) {
  const presented = req.get('x-api-key');
  if (!presented) {
    next();
    return;
  }

  try {
    const resolved = await authenticateApiKey(presented);
    if (resolved) req.apiKey = resolved;
  } catch {
    // Key lookup failures must never break a verification.
  }
  next();
}
