import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
  TooltipItem
} from 'chart.js';
import { Pie, Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface PieChartProps {
  data: {
    labels: string[];
    datasets: Array<{
      label?: string;
      data: number[];
      backgroundColor?: string[];
      borderColor?: string[];
      borderWidth?: number;
    }>;
  };
  title?: string;
  height?: number;
  doughnut?: boolean;
  showLegend?: boolean;
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  animate?: boolean;
  tooltipFormatter?: (value: number, label: string, percentage: number) => string;
  onSegmentClick?: (dataIndex: number) => void;
  className?: string;
  cutout?: string | number; // For doughnut charts
  showPercentages?: boolean;
}

export const PieChart: React.FC<PieChartProps> = ({
  data,
  title,
  height = 400,
  doughnut = false,
  showLegend = true,
  legendPosition = 'right',
  animate = true,
  tooltipFormatter,
  onSegmentClick,
  className = '',
  cutout = '50%',
  showPercentages = true
}) => {
  const defaultColors = [
    '#3B82F6', // blue-500
    '#10B981', // emerald-500
    '#F59E0B', // amber-500
    '#EF4444', // red-500
    '#8B5CF6', // violet-500
    '#06B6D4', // cyan-500
    '#F97316', // orange-500
    '#84CC16', // lime-500
    '#EC4899', // pink-500
    '#6B7280'  // gray-500
  ];

  const processedData = {
    ...data,
    datasets: data.datasets.map((dataset) => ({
      ...dataset,
      backgroundColor: dataset.backgroundColor || 
        data.labels.map((_, index) => defaultColors[index % defaultColors.length]),
      borderColor: dataset.borderColor || 
        data.labels.map((_, index) => defaultColors[index % defaultColors.length]),
      borderWidth: dataset.borderWidth || 2,
      hoverBackgroundColor: dataset.backgroundColor || 
        data.labels.map((_, index) => defaultColors[index % defaultColors.length] + 'CC'),
      hoverBorderWidth: 3
    }))
  };

  const totalValue = data.datasets[0]?.data.reduce((sum, value) => sum + value, 0) || 0;

  const options: ChartOptions<'pie' | 'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: animate ? {
      animateRotate: true,
      animateScale: true,
      duration: 1000,
      easing: 'easeInOutQuart'
    } : false,
    plugins: {
      legend: {
        display: showLegend,
        position: legendPosition,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: '500'
          },
          generateLabels: (chart) => {
            const originalLabels = ChartJS.defaults.plugins.legend.labels.generateLabels(chart);
            
            if (showPercentages && totalValue > 0) {
              return originalLabels.map((label, index) => {
                const value = data.datasets[0]?.data[index] || 0;
                const percentage = ((value / totalValue) * 100).toFixed(1);
                return {
                  ...label,
                  text: `${label.text} (${percentage}%)`
                };
              });
            }
            
            return originalLabels;
          }
        }
      },
      title: {
        display: !!title,
        text: title,
        font: {
          size: 16,
          weight: 'bold'
        },
        padding: {
          bottom: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: (context: TooltipItem<'pie' | 'doughnut'>) => {
            const label = context.label || '';
            const value = context.parsed;
            const percentage = totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) : '0';
            
            if (tooltipFormatter) {
              return tooltipFormatter(value, label, parseFloat(percentage));
            }
            
            return `${label}: ${value.toLocaleString()} (${percentage}%)`;
          }
        }
      }
    },
    onClick: (event, elements) => {
      if (elements.length > 0 && onSegmentClick) {
        const element = elements[0];
        onSegmentClick(element.index);
      }
    },
    ...(doughnut && { cutout })
  };

  const ChartComponent = doughnut ? Doughnut : Pie;

  return (
    <div className={`w-full ${className}`} style={{ height: `${height}px` }}>
      <ChartComponent data={processedData} options={options} />
      
      {/* Center text for doughnut charts */}
      {doughnut && totalValue > 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {totalValue.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PieChart;