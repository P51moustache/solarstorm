'use client';

import { useEffect, useState } from 'react';
import { Key, Plus, Trash2, Copy, Check, Eye, EyeOff, AlertTriangle, ExternalLink } from 'lucide-react';
import { useApiKeyStore } from '@/lib/state/useApiKeyStore';
import { useAuthStore } from '@/lib/state/useAuthStore';
import { API_RATE_LIMITS } from '@/lib/services/apiKeys';

export function ApiKeySettings() {
  const { user, tier } = useAuthStore();
  const {
    keys,
    isLoading,
    error,
    newKeySecret,
    fetchKeys,
    createKey,
    removeKey,
    clearNewKeySecret,
  } = useApiKeyStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchKeys(user.id);
    }
  }, [user?.id, fetchKeys]);

  const handleCreateKey = async () => {
    if (!user?.id || !newKeyName.trim()) return;

    await createKey(user.id, newKeyName.trim(), 'pro');
    setNewKeyName('');
    setShowCreateModal(false);
    setShowNewKey(true);
  };

  const handleCopyKey = async (key: string, keyId: string) => {
    await navigator.clipboard.writeText(key);
    setCopiedKeyId(keyId);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const handleDeleteKey = (keyId: string) => {
    if (!user?.id) return;
    if (confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      removeKey(keyId, user.id);
    }
  };

  const limits = API_RATE_LIMITS.pro;

  return (
    <div className="bg-[#0d1424] border border-solar-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-solar-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <Key className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-solar-text">API Access</h3>
            <p className="text-xs text-solar-muted">
              {limits.dailyLimit.toLocaleString()} requests/day, {limits.maxRequests}/minute
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-solar-emerald/20 text-solar-emerald rounded-lg text-sm font-medium hover:bg-solar-emerald/30 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Key
        </button>
      </div>

      {/* New Key Alert */}
      {newKeySecret && (
        <div className="m-4 p-4 bg-amber-500/10 border border-amber-500/50 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-400 mb-2">
                Save your API key now - it won&apos;t be shown again!
              </p>
              <div className="flex items-center gap-2 bg-[#0a0f1a] rounded-lg p-2">
                <code className="flex-1 text-sm text-solar-text font-mono break-all">
                  {showNewKey ? newKeySecret : '•'.repeat(40)}
                </code>
                <button
                  onClick={() => setShowNewKey(!showNewKey)}
                  className="p-1.5 text-solar-muted hover:text-solar-text transition-colors"
                >
                  {showNewKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleCopyKey(newKeySecret, 'new')}
                  className="p-1.5 text-solar-muted hover:text-solar-text transition-colors"
                >
                  {copiedKeyId === 'new' ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <button
                onClick={clearNewKeySecret}
                className="mt-2 text-xs text-solar-muted hover:text-solar-text"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="m-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Keys List */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-solar-emerald border-t-transparent rounded-full animate-spin" />
          </div>
        ) : keys.length === 0 ? (
          <div className="text-center py-8">
            <Key className="w-10 h-10 text-solar-muted mx-auto mb-3" />
            <p className="text-sm text-solar-text mb-1">No API keys yet</p>
            <p className="text-xs text-solar-muted">
              Create an API key to access the SolarStorm API programmatically
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-3 bg-[#0a0f1a] rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-solar-text">{key.name}</span>
                    <code className="text-xs text-solar-muted font-mono">{key.key_prefix}</code>
                  </div>
                  <p className="text-xs text-solar-muted mt-1">
                    Created {new Date(key.created_at).toLocaleDateString()}
                    {key.last_used_at && (
                      <> · Last used {new Date(key.last_used_at).toLocaleDateString()}</>
                    )}
                    {key.requests_today > 0 && (
                      <> · {key.requests_today.toLocaleString()} requests today</>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteKey(key.id)}
                  className="p-2 text-solar-muted hover:text-red-400 transition-colors"
                  title="Revoke key"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* API Documentation Link */}
      <div className="px-4 pb-4">
        <a
          href="/api-docs"
          className="flex items-center justify-center gap-2 w-full py-2 border border-solar-border rounded-lg text-sm text-solar-muted hover:text-solar-text hover:border-solar-emerald transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          View API Documentation
        </a>
      </div>

      {/* Create Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#0d1424] border border-solar-border rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-solar-text mb-4">Create API Key</h3>
            <div className="mb-4">
              <label className="block text-sm text-solar-muted mb-2">Key Name</label>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., Production Server"
                className="w-full bg-[#0a0f1a] border border-solar-border rounded-lg px-3 py-2 text-sm text-solar-text focus:outline-none focus:border-solar-emerald"
                autoFocus
              />
              <p className="text-xs text-solar-muted mt-2">
                Give your key a descriptive name to identify where it&apos;s used
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewKeyName('');
                }}
                className="flex-1 py-2 border border-solar-border rounded-lg text-sm text-solar-muted hover:text-solar-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateKey}
                disabled={!newKeyName.trim()}
                className="flex-1 py-2 bg-solar-emerald text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-solar-emerald/80 transition-colors"
              >
                Create Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
