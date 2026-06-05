import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Target, Clock } from 'lucide-react';
import * as advancedAnalyticsService from '../../services/advancedAnalyticsService';
import * as cookieCache from '../../utils/cookieCache';

const SalesPipelineCard = ({ filters, onLoadTime }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    const startTime = performance.now();
    setLoading(true);
    setError(null);

    try {
      // Check cache first
      const cached = cookieCache.getCachedReport('sales-pipeline', filters);
      
      if (cached) {
        setData(cached.data);
        const loadTime = Math.round(performance.now() - startTime);
        onLoadTime(loadTime, true);
        setLoading(false);
        return;
      }

      // Fetch fresh data
      const response = await advancedAnalyticsService.getSalesPipeline(filters);
      setData(response.data);
      
      // Cache the result
      cookieCache.cacheReport('sales-pipeline', filters, response.data);
      
      const loadTime = Math.round(performance.now() - startTime);
      onLoadTime(loadTime, false);
    } catch (err) {
      setError(err.message || 'Failed to load sales pipeline data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchData}
          className="mt-4 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { funnel, velocity, conversions, revenue } = data;

  // Calculate total contacts in pipeline
  const totalContacts = funnel.reduce((sum, stage) => sum + stage.count, 0);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700">Total Pipeline</span>
            <Target className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-900">{totalContacts}</p>
          <p className="text-xs text-blue-600 mt-1">Contacts</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700">Total Revenue</span>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-900">
            ${revenue.total_revenue.toLocaleString()}
          </p>
          <p className="text-xs text-green-600 mt-1">{revenue.total_deals} deals closed</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-700">Avg Deal Value</span>
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-900">
            ${Math.round(revenue.avg_deal_value).toLocaleString()}
          </p>
          <p className="text-xs text-purple-600 mt-1">Per closed deal</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-orange-700">Lead → MQL</span>
            <Clock className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-orange-900">
            {conversions[0]?.rate || 0}%
          </p>
          <p className="text-xs text-orange-600 mt-1">Conversion rate</p>
        </div>
      </div>

      {/* Funnel Visualization */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Funnel</h3>
        <div className="space-y-3">
          {funnel.map((stage, index) => {
            const percentage = totalContacts > 0 ? (stage.count / totalContacts) * 100 : 0;
            const colors = {
              LEAD: 'bg-gray-500',
              MQL: 'bg-blue-500',
              SQL: 'bg-indigo-500',
              OPPORTUNITY: 'bg-purple-500',
              CUSTOMER: 'bg-green-500',
              EVANGELIST: 'bg-yellow-500',
              DORMANT: 'bg-red-500',
            };

            return (
              <div key={stage.status} className="relative">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{stage.status}</span>
                  <span className="text-sm text-gray-600">
                    {stage.count} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                  <div
                    className={`h-full ${colors[stage.status]} transition-all duration-500 flex items-center justify-between px-3`}
                    style={{ width: `${Math.max(percentage, 5)}%` }}
                  >
                    <span className="text-xs text-white font-medium">
                      🔥 {stage.hot_count} | 🌡️ {stage.warm_count} | ❄️ {stage.cold_count}
                    </span>
                    <span className="text-xs text-white font-medium">
                      Score: {Number(stage.avg_interest_score)?.toFixed(1) || 0}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Conversion Rates */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Rates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {conversions.map((conv) => (
            <div key={conv.conversion_type} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {conv.conversion_type.replace(/_/g, ' → ')}
                </span>
                <span className={`text-lg font-bold ${
                  conv.rate >= 50 ? 'text-green-600' : conv.rate >= 25 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {conv.rate}%
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span>{conv.converted} converted</span>
                <span>•</span>
                <span>{conv.total} total</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Deal Velocity */}
      {velocity.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Deal Velocity (Avg Days)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {velocity.map((vel) => (
              <div key={`${vel.from_status}-${vel.to_status}`} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">
                  {vel.from_status} → {vel.to_status}
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {vel.avg_days ? Math.round(vel.avg_days) : 0} days
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesPipelineCard;
