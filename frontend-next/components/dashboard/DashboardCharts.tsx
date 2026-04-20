import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useLocale } from '../../contexts/LocaleContext';
import { 
  ChartBarIcon, 
  ChartPieIcon,
  MapIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon
} from '@heroicons/react/24/outline';

// Chart data interfaces
interface MonthlyShipmentData {
  month: string;
  shipments: number;
  previousYear?: number;
}

interface FinancialData {
  month: string;
  expenses: number;
  revenue: number;
}

interface ShipmentTypeData {
  type: string;
  count: number;
  percentage: number;
  color: string;
}

interface LocationData {
  city: string;
  country: string;
  shipments: number;
  lat: number;
  lng: number;
}

interface ChartsData {
  monthlyShipments: MonthlyShipmentData[];
  financialTrends: FinancialData[];
  shipmentTypes: ShipmentTypeData[];
  locations: LocationData[];
}

export default function DashboardCharts() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const isRTL = locale === 'ar';
  
  const [chartsData, setChartsData] = useState<ChartsData>({
    monthlyShipments: [],
    financialTrends: [],
    shipmentTypes: [],
    locations: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedChart, setSelectedChart] = useState<'shipments' | 'financial' | 'types' | 'locations'>('shipments');

  useEffect(() => {
    const fetchChartsData = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch('http://localhost:4000/api/dashboard/charts', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setChartsData(data);
        } else {
          // Use sample data for development
          setChartsData(getSampleChartsData());
        }
      } catch (error) {
        console.error('Error fetching charts data:', error);
        // Use sample data on error
        setChartsData(getSampleChartsData());
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchChartsData();
    }
  }, [user]);

  const getSampleChartsData = (): ChartsData => {
    const months = isRTL 
      ? ['سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر', 'يناير', 'فبراير']
      : ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];
    
    return {
      monthlyShipments: months.map((month, index) => ({
        month,
        shipments: Math.floor(Math.random() * 50) + 20,
        previousYear: Math.floor(Math.random() * 40) + 15
      })),
      financialTrends: months.map((month, index) => ({
        month,
        expenses: Math.floor(Math.random() * 100000) + 50000,
        revenue: Math.floor(Math.random() * 150000) + 80000
      })),
      shipmentTypes: [
        { 
          type: isRTL ? 'بحري' : 'Sea', 
          count: 45, 
          percentage: 52, 
          color: '#3B82F6' 
        },
        { 
          type: isRTL ? 'جوي' : 'Air', 
          count: 28, 
          percentage: 32, 
          color: '#10B981' 
        },
        { 
          type: isRTL ? 'بري' : 'Land', 
          count: 14, 
          percentage: 16, 
          color: '#F59E0B' 
        }
      ],
      locations: [
        { city: isRTL ? 'الرياض' : 'Riyadh', country: 'SA', shipments: 25, lat: 24.7136, lng: 46.6753 },
        { city: isRTL ? 'جدة' : 'Jeddah', country: 'SA', shipments: 18, lat: 21.4858, lng: 39.1925 },
        { city: isRTL ? 'الدمام' : 'Dammam', country: 'SA', shipments: 12, lat: 26.4207, lng: 50.0888 },
        { city: isRTL ? 'دبي' : 'Dubai', country: 'AE', shipments: 8, lat: 25.2048, lng: 55.2708 },
        { city: isRTL ? 'الكويت' : 'Kuwait', country: 'KW', shipments: 5, lat: 29.3117, lng: 47.4818 }
      ]
    };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
                <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const renderMonthlyShipmentsChart = () => {
    const maxValue = Math.max(...chartsData.monthlyShipments.map(d => d.shipments));
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
          <ChartBarIcon className="h-5 w-5 mr-2" />
          {isRTL ? 'الشحنات الشهرية - آخر 6 أشهر' : 'Monthly Shipments - Last 6 Months'}
        </h3>
        
        <div className="h-64 flex items-end justify-between space-x-2 rtl:space-x-reverse">
          {chartsData.monthlyShipments.map((data, index) => {
            const height = (data.shipments / maxValue) * 100;
            const prevHeight = data.previousYear ? (data.previousYear / maxValue) * 100 : 0;
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="w-full flex justify-center space-x-1 rtl:space-x-reverse mb-2">
                  {/* Current year */}
                  <div 
                    className="bg-blue-500 rounded-t relative group cursor-pointer"
                    style={{ height: `${height}%`, width: '60%', minHeight: '4px' }}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      {data.shipments}
                    </div>
                  </div>
                  
                  {/* Previous year (if available) */}
                  {data.previousYear && (
                    <div 
                      className="bg-gray-300 dark:bg-gray-600 rounded-t relative group cursor-pointer"
                      style={{ height: `${prevHeight}%`, width: '40%', minHeight: '4px' }}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        {data.previousYear}
                      </div>
                    </div>
                  )}
                </div>
                
                <span className="text-xs text-gray-600 dark:text-gray-400 text-center">
                  {data.month}
                </span>
              </div>
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="flex justify-center items-center mt-4 space-x-4 rtl:space-x-reverse">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isRTL ? '2024' : '2024'}
            </span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded mr-2"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isRTL ? '2023' : '2023'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderFinancialTrendsChart = () => {
    const maxValue = Math.max(
      ...chartsData.financialTrends.map(d => Math.max(d.expenses, d.revenue))
    );
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
          <ArrowTrendingUpIcon className="h-5 w-5 mr-2" />
          {isRTL ? 'المصروفات مقابل الإيراد' : 'Expenses vs Revenue'}
        </h3>
        
        <div className="h-64 relative">
          {/* Y-axis labels */}
          <div className="absolute left-0 h-full flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400 rtl:left-auto rtl:right-0">
            {[100, 75, 50, 25, 0].map(percent => (
              <span key={percent}>
                {Math.floor((maxValue * percent) / 100 / 1000)}K
              </span>
            ))}
          </div>
          
          {/* Chart area */}
          <div className="ml-8 h-full flex items-end justify-between rtl:ml-0 rtl:mr-8">
            {chartsData.financialTrends.map((data, index) => {
              const expenseHeight = (data.expenses / maxValue) * 100;
              const revenueHeight = (data.revenue / maxValue) * 100;
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center mx-1">
                  <div className="w-full flex justify-center space-x-1 rtl:space-x-reverse mb-2">
                    {/* Expenses */}
                    <div 
                      className="bg-red-500 rounded-t relative group cursor-pointer"
                      style={{ height: `${expenseHeight}%`, width: '45%', minHeight: '4px' }}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        {(data.expenses / 1000).toFixed(0)}K
                      </div>
                    </div>
                    
                    {/* Revenue */}
                    <div 
                      className="bg-green-500 rounded-t relative group cursor-pointer"
                      style={{ height: `${revenueHeight}%`, width: '45%', minHeight: '4px' }}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        {(data.revenue / 1000).toFixed(0)}K
                      </div>
                    </div>
                  </div>
                  
                  <span className="text-xs text-gray-600 dark:text-gray-400 text-center">
                    {data.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex justify-center items-center mt-4 space-x-4 rtl:space-x-reverse">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isRTL ? 'المصروفات' : 'Expenses'}
            </span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isRTL ? 'الإيراد' : 'Revenue'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderShipmentTypesChart = () => {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
          <ChartPieIcon className="h-5 w-5 mr-2" />
          {isRTL ? 'توزيع الشحنات بالنوع' : 'Shipment Distribution by Type'}
        </h3>
        
        <div className="flex items-center justify-center h-64">
          {/* Simple pie chart representation */}
          <div className="relative w-48 h-48">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              {chartsData.shipmentTypes.map((type, index) => {
                const prevPercentages = chartsData.shipmentTypes
                  .slice(0, index)
                  .reduce((sum, t) => sum + t.percentage, 0);
                
                const strokeDasharray = `${type.percentage} ${100 - type.percentage}`;
                const strokeDashoffset = -prevPercentages;
                
                return (
                  <circle
                    key={type.type}
                    cx="50"
                    cy="50"
                    r="15.91549430918954" // radius that gives circumference of 100
                    fill="transparent"
                    stroke={type.color}
                    strokeWidth="8"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-300 hover:stroke-width-10"
                  />
                );
              })}
            </svg>
            
            {/* Center label */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {chartsData.shipmentTypes.reduce((sum, type) => sum + type.count, 0)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {isRTL ? 'إجمالي' : 'Total'}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="space-y-2 mt-4">
          {chartsData.shipmentTypes.map((type) => (
            <div key={type.type} className="flex items-center justify-between">
              <div className="flex items-center">
                <div 
                  className="w-3 h-3 rounded mr-3"
                  style={{ backgroundColor: type.color }}
                ></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {type.type}
                </span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {type.count} ({type.percentage}%)
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderLocationsHeatmap = () => {
    const maxShipments = Math.max(...chartsData.locations.map(l => l.shipments));
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
          <MapIcon className="h-5 w-5 mr-2" />
          {isRTL ? 'خريطة حرارية - مواقع الشحنات' : 'Heat Map - Shipment Locations'}
        </h3>
        
        <div className="h-64">
          {/* Simplified map representation */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg h-full relative overflow-hidden">
            {chartsData.locations.map((location, index) => {
              const intensity = (location.shipments / maxShipments) * 100;
              const size = Math.max(20, (location.shipments / maxShipments) * 40);
              
              return (
                <div
                  key={location.city}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                  style={{
                    left: `${20 + (index * 15)}%`,
                    top: `${30 + (index % 2 ? 20 : -10)}%`,
                  }}
                >
                  <div
                    className="rounded-full transition-all duration-200 group-hover:scale-110"
                    style={{
                      width: `${size}px`,
                      height: `${size}px`,
                      backgroundColor: `rgba(239, 68, 68, ${intensity / 100})`,
                      border: '2px solid rgba(239, 68, 68, 0.8)'
                    }}
                  >
                    {/* Tooltip */}
                    <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {location.city}: {location.shipments} {isRTL ? 'شحنة' : 'shipments'}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Map background pattern */}
            <div className="absolute inset-0 opacity-20">
              <svg className="w-full h-full">
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" className="text-gray-300 dark:text-gray-600" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Locations list */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {chartsData.locations.map((location) => (
            <div key={location.city} className="flex items-center justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-300">
                {location.city}
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {location.shipments} {isRTL ? 'شحنة' : 'shipments'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8 rtl:space-x-reverse">
          {[
            { key: 'shipments', label: isRTL ? 'الشحنات الشهرية' : 'Monthly Shipments', icon: ChartBarIcon },
            { key: 'financial', label: isRTL ? 'المالية' : 'Financial', icon: ArrowTrendingUpIcon },
            { key: 'types', label: isRTL ? 'أنواع الشحنات' : 'Shipment Types', icon: ChartPieIcon },
            { key: 'locations', label: isRTL ? 'المواقع' : 'Locations', icon: MapIcon }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setSelectedChart(tab.key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 rtl:space-x-reverse ${
                  selectedChart === tab.key
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Chart Content */}
      <div className="grid grid-cols-1 gap-6">
        {selectedChart === 'shipments' && renderMonthlyShipmentsChart()}
        {selectedChart === 'financial' && renderFinancialTrendsChart()}
        {selectedChart === 'types' && renderShipmentTypesChart()}
        {selectedChart === 'locations' && renderLocationsHeatmap()}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {chartsData.monthlyShipments.reduce((sum, data) => sum + data.shipments, 0)}
          </div>
          <div className="text-sm text-blue-600 dark:text-blue-400">
            {isRTL ? 'إجمالي الشحنات (6 أشهر)' : 'Total Shipments (6 months)'}
          </div>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {Math.round(chartsData.financialTrends.reduce((sum, data) => sum + data.revenue, 0) / 1000)}K
          </div>
          <div className="text-sm text-green-600 dark:text-green-400">
            {isRTL ? 'إجمالي الإيراد' : 'Total Revenue'}
          </div>
        </div>
        
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {Math.round(chartsData.financialTrends.reduce((sum, data) => sum + data.expenses, 0) / 1000)}K
          </div>
          <div className="text-sm text-yellow-600 dark:text-yellow-400">
            {isRTL ? 'إجمالي المصروفات' : 'Total Expenses'}
          </div>
        </div>
        
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {chartsData.locations.length}
          </div>
          <div className="text-sm text-purple-600 dark:text-purple-400">
            {isRTL ? 'المواقع النشطة' : 'Active Locations'}
          </div>
        </div>
      </div>
    </div>
  );
}