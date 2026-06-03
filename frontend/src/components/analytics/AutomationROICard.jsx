import { useState, useEffect, useCallback } from 'react';
import { Zap, GitBranch, TestTube, TrendingUp } from 'lucide-react';
import * as advancedAnalyticsService from '../../services/advancedAnalyticsService';
import * as cookieCache from '../../utils/cookieCache';

const AutomationROICard = ({ filters, onLoadTime }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    const startTime = performance.now();
    setLoading(true);
    setError(null);

    try {
      const cached = cookieCache.getCachedReport('automation-roi', filters);
      
      if (cached) {
        setData(cached.data);
        onLoadTime(Math.round(performance.now() - startTime), true);
        setLoading(false);
        return;
      }

      const response = await advancedAnalyticsService.getAutomationROI(filters);
      setData(response.data);
      cookieCache.cacheReport('automation-roi', filters, response.data);
      onLoadTime(Math.round(performance.now() - startTime), false);
    } catch (err) {
      setError(err.message || 'Failed to load automation ROI data');
    } finally {
      setLoading(false);
    }
  }, [filters, onLoadTime]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600">
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { automations = [], sequences = [], abTests = [], comparison = {} } = data;

  return (
    <div className="space-y-6">
      {/* Outreach Summary */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Outreach Summary</h3>
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-lg border border-indigo-200">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-indigo-700">📧 Overall Outreach Stats</span>
            <Zap className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <span className="text-sm text-indigo-700 block mb-1">Total Emails Sent</span>
              <span className="text-2xl font-bold text-indigo-900">{comparison.total_emails || 0}</span>
            </div>
            <div>
              <span className="text-sm text-indigo-700 block mb-1">Total Clicks</span>
              <span className="text-2xl font-bold text-indigo-900">{comparison.total_clicks || 0}</span>
            </div>
            <div>
              <span className="text-sm text-indigo-700 block mb-1">Overall Click Rate</span>
              <span className="text-2xl font-bold text-indigo-900">{comparison.click_rate ? `${comparison.click_rate}%` : '0%'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Automations */}
      {automations.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Top Automations
          </h3>
          <div className="space-y-3">
            {automations.map((auto) => (
              <div key={auto.automation_id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${auto.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                    <span className="font-medium text-gray-900">{auto.name}</span>
                  </div>
                  <span className="text-xs text-gray-500">{auto.trigger_type}</span>
                </div>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Total Runs</div>
                    <div className="font-semibold text-gray-900">{auto.total_runs}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Successful</div>
                    <div className="font-semibold text-green-600">{auto.success_runs}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Failed</div>
                    <div className="font-semibold text-red-600">{auto.failure_runs}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Success Rate</div>
                    <div className={`font-semibold ${
                      auto.success_rate >= 90 ? 'text-green-600' : auto.success_rate >= 70 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {auto.success_rate}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sequences */}
      {sequences.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Email Sequences
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Sequence</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">Enrollments</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">Active</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">Completed</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">Completion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sequences.map((seq) => (
                  <tr key={seq.sequence_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${seq.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                        <span className="font-medium text-gray-900">{seq.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-900">{seq.total_enrollments}</td>
                    <td className="px-4 py-3 text-center text-sm text-blue-600">{seq.active}</td>
                    <td className="px-4 py-3 text-center text-sm text-green-600">{seq.completed}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        seq.completion_rate >= 70 
                          ? 'bg-green-100 text-green-800' 
                          : seq.completion_rate >= 40 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {seq.completion_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* A/B Tests */}
      {abTests.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            A/B Test Results
          </h3>
          <div className="space-y-4">
            {abTests.map((test) => {
              const winner = test.variant_a_open_rate > test.variant_b_open_rate ? 'A' : 'B';
              const winnerRate = winner === 'A' ? test.variant_a_open_rate : test.variant_b_open_rate;
              const loserRate = winner === 'A' ? test.variant_b_open_rate : test.variant_a_open_rate;
              const lift = loserRate > 0 ? ((winnerRate - loserRate) / loserRate * 100).toFixed(1) : 0;

              return (
                <div key={test.test_id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-gray-900">{test.name}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      test.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {test.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`p-3 rounded border-2 ${winner === 'A' ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}>
                      <div className="text-sm font-medium text-gray-700 mb-1">
                        Variant A: {test.variant_a_name}
                        {winner === 'A' && <span className="ml-2">🏆</span>}
                      </div>
                      <div className="text-xs text-gray-600 mb-2">
                        {test.variant_a_sent} sent • {test.variant_a_opens} opens
                      </div>
                      <div className="text-2xl font-bold text-gray-900">{test.variant_a_open_rate}%</div>
                    </div>
                    <div className={`p-3 rounded border-2 ${winner === 'B' ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}>
                      <div className="text-sm font-medium text-gray-700 mb-1">
                        Variant B: {test.variant_b_name}
                        {winner === 'B' && <span className="ml-2">🏆</span>}
                      </div>
                      <div className="text-xs text-gray-600 mb-2">
                        {test.variant_b_sent} sent • {test.variant_b_opens} opens
                      </div>
                      <div className="text-2xl font-bold text-gray-900">{test.variant_b_open_rate}%</div>
                    </div>
                  </div>
                  {lift > 0 && (
                    <div className="mt-3 text-sm text-gray-600">
                      <strong>Winner:</strong> Variant {winner} with {lift}% lift
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomationROICard;
