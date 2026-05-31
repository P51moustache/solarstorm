'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, Check, ChevronDown, ChevronRight, Key, Zap, Clock, Shield } from 'lucide-react';

interface EndpointProps {
  method: 'GET' | 'POST';
  path: string;
  description: string;
  auth: boolean;
  rateLimit: string;
  response: string;
  example?: string;
}

function Endpoint({ method, path, description, auth, rateLimit, response, example }: EndpointProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const curl = `curl -X ${method} "https://solarstorm.app${path}" \\
  -H "X-API-Key: your_api_key_here"`;
    await navigator.clipboard.writeText(curl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-solar-border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-[#0d1424] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`px-2 py-1 text-xs font-bold rounded ${
            method === 'GET' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
          }`}>
            {method}
          </span>
          <code className="text-sm text-solar-text font-mono">{path}</code>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-solar-muted" />
        ) : (
          <ChevronRight className="w-4 h-4 text-solar-muted" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 pt-0 border-t border-solar-border">
          <p className="text-sm text-solar-muted mb-4">{description}</p>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-solar-muted" />
              <span className="text-xs text-solar-muted">
                {auth ? 'API Key Required' : 'No Auth Required'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-solar-muted" />
              <span className="text-xs text-solar-muted">{rateLimit}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-solar-muted" />
              <span className="text-xs text-solar-muted">HTTPS Only</span>
            </div>
          </div>

          {/* cURL Example */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-solar-muted">cURL Example</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs text-solar-muted hover:text-solar-text"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="bg-[#0a0f1a] rounded-lg p-3 text-xs text-solar-text overflow-x-auto">
              <code>{`curl -X ${method} "https://solarstorm.app${path}" \\
  -H "X-API-Key: your_api_key_here"`}</code>
            </pre>
          </div>

          {/* Response */}
          <div>
            <span className="text-xs font-medium text-solar-muted mb-2 block">Response</span>
            <pre className="bg-[#0a0f1a] rounded-lg p-3 text-xs text-solar-text overflow-x-auto">
              <code>{response}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-[#060910]">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 text-sm text-solar-muted hover:text-solar-text mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Settings
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-solar-emerald/20 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-solar-emerald" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-solar-text">SolarStorm API</h1>
              <p className="text-sm text-solar-muted">v1.0 · REST API for space weather data</p>
            </div>
          </div>
          <p className="text-solar-muted">
            Access real-time space weather data programmatically. All endpoints return JSON.
          </p>
        </div>

        {/* Authentication */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-solar-text mb-4">Authentication</h2>
          <div className="bg-solar-card rounded-lg p-4">
            <p className="text-sm text-solar-muted mb-4">
              Include your API key in the <code className="text-solar-emerald">X-API-Key</code> header
              with every request:
            </p>
            <pre className="bg-[#0a0f1a] rounded-lg p-3 text-sm text-solar-text">
              <code>{`curl -H "X-API-Key: ss_live_your_key_here" \\
  https://solarstorm.app/api/v1/current`}</code>
            </pre>
          </div>
        </section>

        {/* Rate Limits */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-solar-text mb-4">Rate Limits</h2>
          <div className="bg-solar-card rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-solar-border">
                  <th className="px-4 py-3 text-left text-xs font-medium text-solar-muted">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-solar-muted">Per Minute</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-solar-muted">Per Day</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-3 text-sm text-solar-text">Pro</td>
                  <td className="px-4 py-3 text-sm text-solar-text font-mono">60</td>
                  <td className="px-4 py-3 text-sm text-solar-text font-mono">1,000</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-solar-muted mt-2">
            Rate limit headers are included in every response:
            <code className="text-solar-emerald ml-1">X-RateLimit-Remaining</code>,
            <code className="text-solar-emerald ml-1">X-RateLimit-Reset</code>
          </p>
        </section>

        {/* Endpoints */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-solar-text mb-4">Endpoints</h2>
          <div className="space-y-4">
            <Endpoint
              method="GET"
              path="/api/v1/current"
              description="Get current space weather conditions including Kp index, solar wind, particle flux, and solar activity."
              auth={true}
              rateLimit="60/min (Pro)"
              response={`{
  "timestamp": "2024-01-26T12:00:00Z",
  "geomagnetic": {
    "kp": 3,
    "kp_timestamp": "2024-01-26T11:30:00Z",
    "scale": "Unsettled"
  },
  "solar_wind": {
    "speed_km_s": 425,
    "density_p_cm3": 5.2,
    "bz_nT": -2.5,
    "bt_nT": 6.1,
    "timestamp": "2024-01-26T11:55:00Z"
  },
  "particle_flux": {
    "proton": {
      "flux_10mev_pfu": 0.5,
      "s_scale": "S0",
      "description": "None"
    },
    "electron": {
      "flux_2mev": 250,
      "charging_risk": "low"
    }
  },
  "solar_activity": {
    "sfi": 145,
    "sfi_trend": "rising",
    "sfi_30day_avg": 138
  }
}`}
            />

            <Endpoint
              method="GET"
              path="/api/health"
              description="Health check endpoint for monitoring. No authentication required."
              auth={false}
              rateLimit="No limit"
              response={`{
  "status": "healthy",
  "timestamp": "2024-01-26T12:00:00Z",
  "uptime": 86400,
  "version": "1.0.0"
}`}
            />
          </div>
        </section>

        {/* Error Codes */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-solar-text mb-4">Error Codes</h2>
          <div className="bg-solar-card rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-solar-border">
                  <th className="px-4 py-3 text-left text-xs font-medium text-solar-muted">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-solar-muted">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-solar-border">
                <tr>
                  <td className="px-4 py-3 text-sm text-solar-text font-mono">401</td>
                  <td className="px-4 py-3 text-sm text-solar-muted">Invalid or missing API key</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm text-solar-text font-mono">403</td>
                  <td className="px-4 py-3 text-sm text-solar-muted">API key revoked or expired</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm text-solar-text font-mono">429</td>
                  <td className="px-4 py-3 text-sm text-solar-muted">Rate limit exceeded</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm text-solar-text font-mono">500</td>
                  <td className="px-4 py-3 text-sm text-solar-muted">Internal server error</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* SDKs */}
        <section>
          <h2 className="text-lg font-semibold text-solar-text mb-4">SDKs & Libraries</h2>
          <div className="bg-solar-card rounded-lg p-4">
            <p className="text-sm text-solar-muted">
              SDKs for popular languages coming soon. For now, use any HTTP client to access the API.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
