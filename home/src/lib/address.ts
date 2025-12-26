import { isAddress } from 'viem';

export function normalizeAndValidateAddress(value: string): `0x${string}` | null {
  const trimmed = value.trim();
  if (!isAddress(trimmed)) return null;
  return trimmed as `0x${string}`;
}

