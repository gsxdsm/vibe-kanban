import { useEffect, useRef, useState } from 'react';
import { stripAnsi } from 'fancy-ansi';

const urlPatterns = [
  // Match any http(s) URL - we'll always replace the hostname with browser hostname
  // Matches: http://hostname, http://hostname:port, http://hostname:port/path
  /(https?:\/\/\S+)/i,
  // Fallback: match host:port patterns for common dev server outputs
  /(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[[0-9a-f:]+\]|(?:\d{1,3}\.){3}\d{1,3}):(\d{2,5})/i,
];

export type DevserverUrlInfo = {
  url: string;
  port?: number;
  scheme: 'http' | 'https';
};

// Get the hostname from the current browser location, falling back to 'localhost'
const getBrowserHostname = (): string => {
  if (typeof window !== 'undefined' && window.location.hostname) {
    return window.location.hostname;
  }
  return 'localhost';
};

export const detectDevserverUrl = (line: string): DevserverUrlInfo | null => {
  const cleaned = stripAnsi(line);
  const browserHostname = getBrowserHostname();

  const fullUrlMatch = urlPatterns[0].exec(cleaned);
  if (fullUrlMatch) {
    try {
      const parsed = new URL(fullUrlMatch[1]);
      // Always use the browser's hostname so previews work when accessing
      // from a different machine (e.g., remote development)
      parsed.hostname = browserHostname;
      return {
        url: parsed.toString(),
        port: parsed.port ? Number(parsed.port) : undefined,
        scheme: parsed.protocol === 'https:' ? 'https' : 'http',
      };
    } catch {
      // Ignore invalid URLs and fall through to host:port detection.
    }
  }

  const hostPortMatch = urlPatterns[1].exec(cleaned);
  if (hostPortMatch) {
    const port = Number(hostPortMatch[1]);
    const scheme = /https/i.test(cleaned) ? 'https' : 'http';
    return {
      url: `${scheme}://${browserHostname}:${port}`,
      port,
      scheme: scheme as 'http' | 'https',
    };
  }

  return null;
};

export const useDevserverUrlFromLogs = (
  logs: Array<{ content: string }> | undefined
): DevserverUrlInfo | undefined => {
  const [urlInfo, setUrlInfo] = useState<DevserverUrlInfo | undefined>();
  const lastIndexRef = useRef(0);

  useEffect(() => {
    if (!logs) {
      setUrlInfo(undefined);
      lastIndexRef.current = 0;
      return;
    }

    // Reset when logs are cleared (new process started)
    if (logs.length < lastIndexRef.current) {
      lastIndexRef.current = 0;
      setUrlInfo(undefined);
      // Return early - we'll re-run on next render with cleared state
      return;
    }

    if (urlInfo) {
      lastIndexRef.current = logs.length;
      return;
    }

    let detectedUrl: DevserverUrlInfo | undefined;
    const newEntries = logs.slice(lastIndexRef.current);
    newEntries.some((entry) => {
      const detected = detectDevserverUrl(entry.content);
      if (detected) {
        detectedUrl = detected;
        return true;
      }
      return false;
    });

    if (detectedUrl) {
      setUrlInfo(detectedUrl);
    }

    lastIndexRef.current = logs.length;
  }, [logs, urlInfo]);

  return urlInfo;
};
