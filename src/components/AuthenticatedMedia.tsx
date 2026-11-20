import React, { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

async function fetchMediaBlob(
  mediaId: string,
  token: string,
  download = false,
): Promise<Blob> {
  const url = `/api/media/${encodeURIComponent(mediaId)}${download ? '?download=1' : ''}`;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    let message = 'Gagal memuatkan fail rakaman.';
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore non-JSON error body
    }
    throw new Error(message);
  }
  return res.blob();
}

export async function downloadAuthenticatedMedia(
  mediaId: string,
  token: string,
  filename: string,
): Promise<void> {
  const blob = await fetchMediaBlob(mediaId, token, true);
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename || 'rakaman-suara.webm';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

interface AuthenticatedAudioPlayerProps {
  mediaId: string;
  token: string;
  downloadFilename?: string;
  className?: string;
  showDownloadButton?: boolean;
  onLoadError?: (msg: string) => void;
}

export const AuthenticatedAudioPlayer: React.FC<AuthenticatedAudioPlayerProps> = ({
  mediaId,
  token,
  downloadFilename,
  className = 'w-full h-9',
  showDownloadButton = false,
  onLoadError,
}) => {
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [downloading, setDownloading] = useState<boolean>(false);
  const releasePauseRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let active = true;
    let currentUrl = '';
    setLoading(true);
    setErrorMsg('');

    fetchMediaBlob(mediaId, token)
      .then((blob) => {
        if (!active) return;
        currentUrl = URL.createObjectURL(blob);
        setBlobUrl(currentUrl);
      })
      .catch((err) => {
        if (!active) return;
        const msg = err instanceof Error ? err.message : 'Gagal memuatkan rakaman audio.';
        setErrorMsg(msg);
        onLoadError?.(msg);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      releasePauseRef.current?.();
      releasePauseRef.current = null;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [mediaId, token]);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadAuthenticatedMedia(
        mediaId,
        token,
        downloadFilename || `rakaman-${mediaId}.webm`,
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memuat turun fail rakaman.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-[#FAF6EE]/10 bg-[#121A30] px-3 py-2 text-xs text-[#C8B6E2]">
        Memuatkan audio rakaman...
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="rounded-lg border border-amber-400/35 bg-amber-950/35 px-3 py-2 text-xs text-amber-200">
        {errorMsg}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <audio
        controls
        src={blobUrl}
        className={className}
        onPlay={() => {
          if (!releasePauseRef.current) {
            releasePauseRef.current = soundEngine.pushMediaPlaybackPause();
          }
        }}
        onPause={() => {
          releasePauseRef.current?.();
          releasePauseRef.current = null;
        }}
        onEnded={() => {
          releasePauseRef.current?.();
          releasePauseRef.current = null;
        }}
      />
      {showDownloadButton && (
        <button
          type="button"
          onClick={() => void handleDownload()}
          disabled={downloading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D4AF37]/50 bg-[#162038] text-xs font-semibold text-[#D4AF37] hover:bg-[#233256] disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{downloading ? 'Memuat Turun...' : 'Muat Turun Rakaman'}</span>
        </button>
      )}
    </div>
  );
};

interface AuthenticatedVideoPlayerProps {
  mediaId: string;
  token: string;
  className?: string;
}

export const AuthenticatedVideoPlayer: React.FC<AuthenticatedVideoPlayerProps> = ({
  mediaId,
  token,
  className = 'w-full max-h-80 rounded-xl bg-black',
}) => {
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const releasePauseRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let active = true;
    let currentUrl = '';
    setLoading(true);
    setErrorMsg('');

    fetchMediaBlob(mediaId, token)
      .then((blob) => {
        if (!active) return;
        currentUrl = URL.createObjectURL(blob);
        setBlobUrl(currentUrl);
      })
      .catch((err) => {
        if (!active) return;
        setErrorMsg(err instanceof Error ? err.message : 'Gagal memuatkan video.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      releasePauseRef.current?.();
      releasePauseRef.current = null;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [mediaId, token]);

  if (loading) {
    return (
      <div className="rounded-xl border border-[#FAF6EE]/10 bg-[#121A30] p-4 text-xs text-[#C8B6E2]">
        Memuatkan video persembahan...
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="rounded-xl border border-amber-400/35 bg-amber-950/35 p-4 text-xs text-amber-200">
        {errorMsg}
      </div>
    );
  }

  return (
    <video
      controls
      src={blobUrl}
      className={className}
      onPlay={() => {
        if (!releasePauseRef.current) {
          releasePauseRef.current = soundEngine.pushMediaPlaybackPause();
        }
      }}
      onPause={() => {
        releasePauseRef.current?.();
        releasePauseRef.current = null;
      }}
      onEnded={() => {
        releasePauseRef.current?.();
        releasePauseRef.current = null;
      }}
    />
  );
};
