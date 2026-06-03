import { useState, useEffect } from 'react';
import { Target, Phone, PhoneCall, Users, Clock, PhoneOff } from 'lucide-react';
import * as advancedAnalyticsService from '../../services/advancedAnalyticsService';
import * as cookieCache from '../../utils/cookieCache';

const CallMetricsCard = ({ filters, onLoadTime }) => {
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
      const cached = cookieCache.getCachedReport('call-metrics', filters);
      
      if (cached) {
        setData(cached.data);
        const loadTime = Math.round(performance.now() - startTime);
        onLoadTime(loadTime, true);
        setLoading(false);
        return;
      }

      // Check if service exists, if not provide mock data for now or call it
      if (typeof advancedAnalyticsService.getCallMetrics !== 'function') {
        throw new Error('advancedAnalyticsService.getCallMetrics is not implemented');
      }

      const response = await advancedAnalyticsService.getCallMetrics(filters);
      setData(response.data);
      
      cookieCache.cacheReport('call-metrics', filters, response.data);
      
      const loadTime = Math.round(performance.now() - startTime);
      onLoadTime(loadTime, false);
    } catch (err) {
      setError(err.message || 'Failed to load call metrics data');
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

  const { overview = {}, byEmployee = [], statusDistribution = [] } = data;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg border border-indigo-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-indigo-700">Total Calls</span>
            <Phone className="w-5 h-5 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-indigo-900">{overview.total_calls || 0}</p>
          <p className="text-xs text-indigo-600 mt-1">Total volume</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700">Avg Duration</span>
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-900">
            {overview.avg_duration ? Math.round(overview.avg_duration) : 0}s
          </p>
          <p className="text-xs text-blue-600 mt-1">Per answered call</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-lg border border-emerald-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-emerald-700">Connectivity Rate</span>
            <PhoneCall className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-900">
            {overview.connectivity_rate ? Math.round(overview.connectivity_rate) : 0}%
          </p>
          <p className="text-xs text-emerald-600 mt-1">Connected calls</p>
        </div>

        <div className="bg-gradient-to-br from-rose-50 to-rose-100 p-4 rounded-lg border border-rose-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-rose-700">Missed Calls</span>
            <PhoneOff className="w-5 h-5 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-900">
            {overview.missed_calls || 0}
          </p>
          <p className="text-xs text-rose-600 mt-1">Unanswered</p>
        </div>
      </div>

      {/* Distribution */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Call Status Distribution</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statusDistribution.map((status) => (
             <div key={status.status} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
               <div className="flex items-center justify-between mb-2">
                 <span className="text-sm font-medium text-gray-700">{status.status}</span>
                 <span className="text-sm font-bold text-gray-900">{status.count}</span>
               </div>
               <div className="w-full bg-gray-200 rounded-full h-2">
                 <div className="bg-sky-500 h-2 rounded-full" style={{ width: `${(status.count / (overview.total_calls || 1)) * 100}%` }}></div>
               </div>
             </div>
          ))}
        </div>
      </div>

      {/* By Employee */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Calls by Employee</h3>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Calls</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Answered</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Duration (s)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {byEmployee.map((emp) => (
                <tr key={emp.employee_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      {emp.employee_name || `Employee #${emp.employee_id}`}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.total_calls}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.answered_calls}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{Math.round(emp.avg_duration || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CallMetricsCard;
