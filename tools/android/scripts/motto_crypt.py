#!/usr/bin/env python3
"""Decrypt Motto Immortal client files (EncryptUtil: AES-256-CBC, Base64 key/IV from libil2cpp).

Same key/IV in the CN and the global client.

  small files (patcher-settings.json, branch-version.json, ...): whole file is AES-CBC
  packages (*.zip, packages, ...): segments [int32 LE length][data]: AES-CBC block (first 16 KiB), XOR-with-key rest, alternating

Usage:
  python3 -I scripts/motto_crypt.py IN [IN ...] --out DIR
"""
from __future__ import annotations

import argparse
import base64
import sys
from pathlib import Path

from Crypto.Cipher import AES

KEY = base64.b64decode("DLAmIpzEV3+RO7kv7sO2o4tunUNQUSsvoetEjll+aGg=")
IV = base64.b64decode("WJlACRfTVlmjHPPFg+Icqg==")


def _unpad(data: bytes) -> bytes:
    if data:
        n = data[-1]
        if 1 <= n <= 16 and data.endswith(bytes([n]) * n):
            return data[:-n]
    return data


def _cbc(body: bytes) -> bytes:
    body = body[: len(body) // 16 * 16]
    return AES.new(KEY, AES.MODE_CBC, IV).decrypt(body)


def _xor(data: bytes) -> bytes:
    k = KEY
    return bytes(x ^ k[i % len(k)] for i, x in enumerate(data))


def _segmented(raw: bytes) -> bytes | None:
    """[len][AES block][len][XOR rest][len][AES block]... (XOR restarts per segment).

    Segments alternate AES / XOR; the AES blocks hold the first 16 KiB of each part.
    A trailing marker shorter than 4 bytes is ignored. None if the layout does not fit.
    """
    out, pos, idx = [], 0, 0
    while pos + 4 <= len(raw):
        n = int.from_bytes(raw[pos : pos + 4], "little")
        pos += 4
        if n == 0 or pos + n > len(raw):
            return None
        seg = raw[pos : pos + n]
        pos += n
        if idx % 2 == 0:
            if n % 16:
                return None
            out.append(_unpad(_cbc(seg)))
        else:
            out.append(_xor(seg))
        idx += 1
    return b"".join(out)


def decrypt(raw: bytes) -> bytes:
    """Return plaintext; tries the whole-file layout first, then the segmented layout."""
    plain = _cbc(raw)
    if plain[:1] in (b"{", b"[") or plain[:2] == b"PK":
        return _unpad(plain)
    seg = _segmented(raw)
    return seg if seg is not None else _unpad(plain)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("paths", nargs="+", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    for p in args.paths:
        plain = decrypt(p.read_bytes())
        target = args.out / p.name
        target.write_bytes(plain)
        print(f"{p} -> {target} ({len(plain):,} B) head={plain[:12]!r}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
