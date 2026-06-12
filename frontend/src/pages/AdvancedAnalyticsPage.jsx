import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  Mail, 
  Zap, 
  Phone,
  RefreshCw, 
  Calendar,
  Download,
  Filter,
  Clock,
  Database
} from 'lucide-react';
import * as advancedAnalyticsService from '../services/advancedAnalyticsService';
import * as cookieCache from '../utils/cookieCache';
import SalesPipelineCard from '../components/analytics/SalesPipelineCard';
import TeamPerformanceCard from '../components/analytics/TeamPerformanceCard';
import ContactLifecycleCard from '../components/analytics/ContactLifecycleCard';
import EmailCampaignsCard from '../components/analytics/EmailCampaignsCard';
import AutomationROICard from '../components/analytics/AutomationROICard';
import CallMetricsCard from '../components/analytics/CallMetricsCard';

const AdvancedAnalyticsPage = () => {
  const [activeTab, setActiveTab] = useState('sales-pipeline');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    employeeId: '',
  });
  const [loadTimes, setLoadTimes] = useState({});
  const [cacheStats, setCacheStats] = useState({ count: 0, sizeKB: 0 });
  const [showFilters, setShowFilters] = useState(false);

  // Update cache stats
  useEffect(() => {
    const stats = cookieCache.getCacheStats();
    setCacheStats(stats);
  }, [activeTab]);

  const tabs = [
    { id: 'sales-pipeline', label: 'Sales Pipeline', icon: BarChart3 },
    { id: 'team-performance', label: 'Team Performance', icon: Users },
    { id: 'contact-lifecycle', label: 'Contact Lifecycle', icon: TrendingUp },
    { id: 'email-campaigns', label: 'Email Campaigns', icon: Mail },
    { id: 'automation-roi', label: 'Automation ROI', icon: Zap },
    // { id: 'call-metrics', label: 'Call Metrics', icon: Phone },
  ];

  const handleRefresh = () => {
    // Invalidate cache for current tab
    cookieCache.invalidateReport(activeTab, filters);
    // Force re-render by updating a dummy state
    setLoadTimes(prev => ({ ...prev, [activeTab]: null }));
  };

  const handleClearAllCaches = () => {
    if (confirm('Clear all cached reports? This will force fresh data loads.')) {
      cookieCache.clearAllReportCaches();
      setCacheStats({ count: 0, sizeKB: 0 });
      setLoadTimes({});
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    // Invalidate cache when filters change
    cookieCache.invalidateReport(activeTab, filters);
    setShowFilters(false);
  };

  const handleResetFilters = () => {
    setFilters({ startDate: '', endDate: '', employeeId: '' });
    cookieCache.invalidateReport(activeTab, {});
  };

  const renderActiveCard = () => {
    const commonProps = {
      filters,
      onLoadTime: (time, isCached) => {
        setLoadTimes(prev => ({ 
          ...prev, 
          [activeTab]: { time, isCached, timestamp: new Date().toISOString() } 
        }));
      },
    };

    switch (activeTab) {
      case 'sales-pipeline':
        return <SalesPipelineCard {...commonProps} />;
      case 'team-performance':
        return <TeamPerformanceCard {...commonProps} />;
      case 'contact-lifecycle':
        return <ContactLifecycleCard {...commonProps} />;
      case 'email-campaigns':
        return <EmailCampaignsCard {...commonProps} />;
      case 'automation-roi':
        return <AutomationROICard {...commonProps} />;
      case 'call-metrics':
        return <CallMetricsCard {...commonProps} />;
      default:
        return null;
    }
  };

  const currentLoadTime = loadTimes[activeTab];
  const cacheAge = cookieCache.getCacheAge(activeTab, filters);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Advanced Analytics</h1>
            <p className="text-gray-600 mt-1">Real-time business intelligence dashboard</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Cache Stats */}
            <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 flex items-center gap-2">
              <Database className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {cacheStats.count} cached ({cacheStats.sizeKB} KB)
              </span>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg border flex items-center gap-2 transition-colors ${
                showFilters 
                  ? 'bg-sky-500 text-white border-sky-500' 
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>

            {/* Clear Cache */}
            <button
              onClick={handleClearAllCaches}
              className="px-4 py-2 bg-red-50 text-red-600 rounded-lg border border-red-200 hover:bg-red-100 flex items-center gap-2 transition-colors"
            >
              <Database className="w-4 h-4" />
              Clear Cache
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee ID (optional)
                </label>
                <input
                  type="number"
                  value={filters.employeeId}
                  onChange={(e) => handleFilterChange('employeeId', e.target.value)}
                  placeholder="All employees"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-end gap-2">
                <button
                  onClick={handleApplyFilters}
                  className="flex-1 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
                >
                  Apply
                </button>
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Load Time Benchmark */}
        {currentLoadTime && (
          <div className={`p-3 rounded-lg border flex items-center justify-between ${
            currentLoadTime.isCached 
              ? 'bg-green-50 border-green-200' 
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center gap-2">
              <Clock className={`w-4 h-4 ${currentLoadTime.isCached ? 'text-green-600' : 'text-blue-600'}`} />
              <span className={`text-sm font-medium ${currentLoadTime.isCached ? 'text-green-700' : 'text-blue-700'}`}>
                {currentLoadTime.isCached ? '⚡ Cached Load' : '🌐 Fresh Load'}: {currentLoadTime.time}ms
              </span>
            </div>
            
            {cacheAge && (
              <span className="text-xs text-gray-600">
                Cached {cacheAge.hours}h ago
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 mb-6">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-sky-500 text-sky-600 bg-sky-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Report Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {renderActiveCard()}
      </div>
    </div>
  );
};

export default AdvancedAnalyticsPage;
