import React, { useState, useRef, useEffect } from 'react';
import type { UploadItem, RoomInfo } from './types';
import { createRoom, uploadFileToRoom } from './api';
import { formatBytes } from './utils';
import { ExpirationCountdown } from './ExpirationCountdown';
import { Copy, Check, Upload, Trash2, ArrowLeft, AlertCircle } from 'lucide-react';

interface SendViewProps {
  onBack: () => void;
}

export const SendView: React.FC<SendViewProps> = ({ onBack }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<boolean>(false);
  const [copiedPasscode, setCopiedPasscode] = useState<boolean>(false);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize room when mounting SendView
  useEffect(() => {
    let mounted = true;
    async function initRoom() {
      setLoading(true);
      setError(null);
      try {
        const data = await createRoom();
        if (mounted) {
          setRoom({
            roomId: data.roomId,
            passcode: data.passcode,
            createdAt: data.createdAt,
            expiresAt: data.expiresAt,
            totalSizeBytes: 0,
            maxFileSizeBytes: data.maxFileSizeBytes,
            maxRoomSizeBytes: data.maxRoomSizeBytes,
            files: []
          });
        }
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to create room');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    initRoom();
    return () => {
      mounted = false;
    };
  }, []);

  const copyToClipboard = async (text: string, type: 'id' | 'passcode' | 'all') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'id') {
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
      } else if (type === 'passcode') {
        setCopiedPasscode(true);
        setTimeout(() => setCopiedPasscode(false), 2000);
      } else {
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 2000);
      }
    } catch {
      setError('Unable to copy to clipboard');
    }
  };

  const handleFilesAdded = (files: FileList | null) => {
    if (!files || files.length === 0 || !room || isExpired) return;

    setError(null);
    const newItems: UploadItem[] = [];
    const maxFileSize = room.maxFileSizeBytes;
    const maxRoomSize = room.maxRoomSizeBytes;

    let currentTotalSize = room.totalSizeBytes + queue.reduce((acc, q) => acc + q.file.size, 0);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.size > maxFileSize) {
        setError(`File "${file.name}" exceeds maximum allowed individual size of ${formatBytes(maxFileSize)}.`);
        continue;
      }

      if (currentTotalSize + file.size > maxRoomSize) {
        setError(`Adding "${file.name}" would exceed the 1 GB room capacity.`);
        continue;
      }

      currentTotalSize += file.size;
      newItems.push({
        id: crypto.randomUUID(),
        file,
        progress: 0,
        status: 'pending'
      });
    }

    if (newItems.length > 0) {
      setQueue((prev) => [...prev, ...newItems]);
    }
  };

  const removeQueueItem = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const startUpload = async () => {
    if (!room || !room.passcode || isExpired) return;

    const pendingItems = queue.filter((item) => item.status === 'pending');
    if (pendingItems.length === 0) return;

    for (const item of pendingItems) {
      // update status to uploading
      setQueue((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: 'uploading', progress: 0 } : i))
      );

      try {
        await uploadFileToRoom(room.roomId, room.passcode, item.file, (_, __, percent) => {
          setQueue((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, progress: percent } : i))
          );
        });

        // mark as completed and update room total size
        setQueue((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: 'completed', progress: 100 } : i))
        );

        setRoom((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            totalSizeBytes: prev.totalSizeBytes + item.file.size,
            files: [
              ...prev.files,
              {
                id: item.id,
                filename: item.file.name,
                size_bytes: item.file.size,
                content_type: item.file.type,
                status: 'uploaded',
                uploaded_at: Math.floor(Date.now() / 1000),
                created_at: Math.floor(Date.now() / 1000)
              }
            ]
          };
        });
      } catch (err: any) {
        setQueue((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: 'error', errorMessage: err.message || 'Upload failed' }
              : i
          )
        );
      }
    }
  };

  const uploadedSize = (room?.totalSizeBytes || 0);
  const remainingSize = Math.max(0, (room?.maxRoomSizeBytes || 1073741824) - uploadedSize);
  const capacityPercent = Math.min(
    100,
    Math.round((uploadedSize / (room?.maxRoomSizeBytes || 1073741824)) * 100)
  );

  return (
    <div className="card">
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={16} /> Back to Home
      </button>

      <div className="card-header">
        <h2 className="card-title">Send Files</h2>
        {room && (
          <ExpirationCountdown
            expiresAt={room.expiresAt}
            onExpire={() => setIsExpired(true)}
          />
        )}
      </div>

      {error && (
        <div className="alert alert-danger">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button className="btn-icon" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {loading && !room && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>
          Creating temporary room...
        </p>
      )}

      {room && (
        <>
          {/* Credentials Box */}
          <div className="credentials-box">
            <div className="credential-item">
              <span className="credential-label">Room ID</span>
              <div className="credential-value-wrapper">
                <span className="credential-value">{room.roomId}</span>
                <button
                  className="btn-icon"
                  title="Copy Room ID"
                  onClick={() => copyToClipboard(room.roomId, 'id')}
                >
                  {copiedId ? <Check size={16} color="var(--success-color)" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            <div className="credential-item">
              <span className="credential-label">Passcode</span>
              <div className="credential-value-wrapper">
                <span className="credential-value">{room.passcode}</span>
                <button
                  className="btn-icon"
                  title="Copy Passcode"
                  onClick={() => copyToClipboard(room.passcode || '', 'passcode')}
                >
                  {copiedPasscode ? <Check size={16} color="var(--success-color)" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
            <button
              className="btn btn-subtle"
              onClick={() =>
                copyToClipboard(
                  `Room ID: ${room.roomId}\nPasscode: ${room.passcode}\nAccess files at: ${window.location.origin}${window.location.pathname}`,
                  'all'
                )
              }
            >
              {copiedAll ? <Check size={14} /> : <Copy size={14} />} Copy All Credentials
            </button>
          </div>

          {/* Capacity Bar */}
          <div className="capacity-container">
            <div className="capacity-header">
              <span>Uploaded: {formatBytes(uploadedSize)}</span>
              <span>Remaining: {formatBytes(remainingSize)} / 1 GB</span>
            </div>
            <div className="capacity-bar-track">
              <div className="capacity-bar-fill" style={{ width: `${capacityPercent}%` }} />
            </div>
          </div>

          {/* Drag & Drop Area */}
          <div
            className={`dropzone ${isDragging ? 'active' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFilesAdded(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              multiple
              style={{ display: 'none' }}
              onChange={(e) => handleFilesAdded(e.target.files)}
              disabled={isExpired}
            />
            <Upload className="dropzone-icon" />
            <div className="dropzone-title">Drag & drop files here, or click to browse</div>
            <div className="dropzone-subtitle">Up to 500 MB per file • Max 1 GB per room</div>
          </div>

          {/* Queue List */}
          {queue.length > 0 && (
            <div>
              <ul className="file-list">
                {queue.map((item) => (
                  <li key={item.id} className="file-item">
                    <div className="file-info">
                      <span className="file-name" title={item.file.name}>{item.file.name}</span>
                      <span className="file-size">{formatBytes(item.file.size)}</span>
                      {item.status === 'error' && (
                        <span style={{ color: 'var(--danger-color)', fontSize: '0.75rem' }}>
                          {item.errorMessage || 'Failed'}
                        </span>
                      )}
                    </div>

                    <div className="file-status-group">
                      {item.status === 'uploading' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="file-progress-bar">
                            <div
                              className="file-progress-fill"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                          <span style={{ fontSize: '0.75rem', minWidth: '35px' }}>{item.progress}%</span>
                        </div>
                      )}

                      {item.status === 'completed' && (
                        <span style={{ color: 'var(--success-color)', fontSize: '0.85rem' }}>
                          Uploaded
                        </span>
                      )}

                      {item.status === 'pending' && (
                        <button
                          className="btn-icon btn-danger"
                          title="Remove from queue"
                          onClick={() => removeQueueItem(item.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              {queue.some((i) => i.status === 'pending') && (
                <button
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={startUpload}
                  disabled={isExpired}
                >
                  Upload Queued Files
                </button>
              )}
            </div>
          )}

          {isExpired && (
            <div className="alert alert-danger" style={{ marginTop: '20px' }}>
              This room has expired. New uploads and downloads are blocked.
            </div>
          )}
        </>
      )}
    </div>
  );
};
