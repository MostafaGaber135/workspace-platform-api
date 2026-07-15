/**
 * Public, framework-free contract for a Workspace as returned by the API.
 *
 * This is the ONLY workspace shape exposed over the wire. The internal
 * `normalizedName` column (the case-insensitive uniqueness key) is deliberately
 * absent and must never be serialized into a response. Timestamps are ISO-8601
 * strings (UTC), matching how the API serializes dates.
 */
export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}
