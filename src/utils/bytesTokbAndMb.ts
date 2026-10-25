type ByteConversion = {
  KB: number;
  MB: number;
};

export function bytesToKbAndMb(bytes: number): ByteConversion {
  const k = 1024;

  const kb = bytes / k;
  const mb = kb / k;

  return {
    KB: kb,
    MB: mb,
  };
}
