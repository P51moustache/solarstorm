'use client';

import { useState } from 'react';
import { Download, FileJson, FileSpreadsheet, FileText, Calendar, Check, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/state/useAuthStore';
import {
  exportTecData,
  exportScintillationData,
  formatAsCSV,
  formatAsRinexLike,
  type GnssExportOptions,
  type TecExportRecord,
  type ScintillationExportRecord,
} from '@/lib/services/gnssExport';

type ExportFormat = 'json' | 'csv' | 'rinex-like';
type DataType = 'tec' | 'scintillation';

export function DataExportWidget() {
  const { user } = useAuthStore();
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [dataType, setDataType] = useState<DataType>('tec');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExport = async () => {
    if (!user?.id) return;

    setIsExporting(true);
    setExportSuccess(false);

    try {
      const options: GnssExportOptions = {
        startDate: new Date(dateRange.start),
        endDate: new Date(dateRange.end),
        dataTypes: [dataType],
        format,
      };

      let data: TecExportRecord[] | ScintillationExportRecord[];
      let content: string;
      let filename: string;
      let mimeType: string;

      if (dataType === 'tec') {
        data = await exportTecData(user.id, options);
      } else {
        data = await exportScintillationData(user.id, options);
      }

      if (data.length === 0) {
        alert('No data available for the selected date range');
        setIsExporting(false);
        return;
      }

      switch (format) {
        case 'json':
          content = JSON.stringify(data, null, 2);
          filename = `solarstorm-${dataType}-${dateRange.start}-to-${dateRange.end}.json`;
          mimeType = 'application/json';
          break;
        case 'csv':
          content = formatAsCSV(data as unknown as Record<string, unknown>[]);
          filename = `solarstorm-${dataType}-${dateRange.start}-to-${dateRange.end}.csv`;
          mimeType = 'text/csv';
          break;
        case 'rinex-like':
          if (dataType === 'tec') {
            content = formatAsRinexLike(data as TecExportRecord[]);
          } else {
            content = formatAsCSV(data as unknown as Record<string, unknown>[]);
          }
          filename = `solarstorm-${dataType}-${dateRange.start}-to-${dateRange.end}.txt`;
          mimeType = 'text/plain';
          break;
        default:
          throw new Error('Unknown format');
      }

      // Trigger download
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const formatOptions: { value: ExportFormat; label: string; icon: React.ElementType; desc: string }[] = [
    { value: 'csv', label: 'CSV', icon: FileSpreadsheet, desc: 'Spreadsheet compatible' },
    { value: 'json', label: 'JSON', icon: FileJson, desc: 'Programmatic access' },
    { value: 'rinex-like', label: 'RINEX', icon: FileText, desc: 'GNSS standard format' },
  ];

  return (
    <div className="bg-[#0d1424] border border-solar-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-solar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <Download className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-solar-text">Data Export</h3>
            <p className="text-xs text-solar-muted">Download TEC & scintillation data</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Data Type Selection */}
        <div>
          <label className="block text-xs text-solar-muted mb-2">Data Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setDataType('tec')}
              className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                dataType === 'tec'
                  ? 'bg-solar-emerald/20 border-solar-emerald text-solar-emerald'
                  : 'border-solar-border text-solar-muted hover:border-solar-text'
              }`}
            >
              TEC Data
            </button>
            <button
              onClick={() => setDataType('scintillation')}
              className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                dataType === 'scintillation'
                  ? 'bg-solar-emerald/20 border-solar-emerald text-solar-emerald'
                  : 'border-solar-border text-solar-muted hover:border-solar-text'
              }`}
            >
              Scintillation
            </button>
          </div>
        </div>

        {/* Date Range */}
        <div>
          <label className="block text-xs text-solar-muted mb-2">
            <Calendar className="w-3 h-3 inline mr-1" />
            Date Range
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full bg-[#0a0f1a] border border-solar-border rounded-lg px-3 py-2 text-sm text-solar-text focus:outline-none focus:border-solar-emerald"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full bg-[#0a0f1a] border border-solar-border rounded-lg px-3 py-2 text-sm text-solar-text focus:outline-none focus:border-solar-emerald"
            />
          </div>
        </div>

        {/* Format Selection */}
        <div>
          <label className="block text-xs text-solar-muted mb-2">Export Format</label>
          <div className="space-y-2">
            {formatOptions.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => setFormat(opt.value)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg border transition-colors ${
                    format === opt.value
                      ? 'bg-solar-emerald/20 border-solar-emerald'
                      : 'border-solar-border hover:border-solar-text'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${format === opt.value ? 'text-solar-emerald' : 'text-solar-muted'}`}
                  />
                  <div className="flex-1 text-left">
                    <p className={`text-sm ${format === opt.value ? 'text-solar-emerald' : 'text-solar-text'}`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-solar-muted">{opt.desc}</p>
                  </div>
                  {format === opt.value && <Check className="w-4 h-4 text-solar-emerald" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={isExporting}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors ${
            exportSuccess
              ? 'bg-green-500/20 text-green-400'
              : 'bg-solar-emerald text-white hover:bg-solar-emerald/80'
          } disabled:opacity-50`}
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Exporting...
            </>
          ) : exportSuccess ? (
            <>
              <Check className="w-4 h-4" />
              Downloaded!
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Export Data
            </>
          )}
        </button>
      </div>
    </div>
  );
}
