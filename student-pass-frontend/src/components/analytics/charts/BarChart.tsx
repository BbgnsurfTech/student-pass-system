import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  TooltipItem
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface BarChartProps {
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string | string[];
      borderWidth?: number;
    }>;
  };
  title?: string;
  height?: number;
  horizontal?: boolean;
  stacked?: boolean;
  showLegend?: boolean;
  showGrid?: boolean;
  animate?: boolean;
  tooltipFormatter?: (value: number, label: string) => string;
  onBarClick?: (dataIndex: number, datasetIndex: number) => void;
  className?: string;
  maxBarThickness?: number;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  title,
  height = 400,
  horizontal = false,
  stacked = false,
  showLegend = true,
  showGrid = true,
  animate = true,
  tooltipFormatter,
  onBarClick,
  className = '',
  maxBarThickness = 50
}) => {
  const defaultColors = [
    '#3B82F6', // blue-500
    '#10B981', // emerald-500
    '#F59E0B', // amber-500
    '#EF4444', // red-500
    '#8B5CF6', // violet-500
    '#06B6D4', // cyan-500
    '#F97316', // orange-500
    '#84CC16'  // lime-500
  ];

  const processedData = {
    ...data,
    datasets: data.datasets.map((dataset, index) => ({
      ...dataset,
      backgroundColor: dataset.backgroundColor || 
        (Array.isArray(data.labels) 
          ? data.labels.map((_, i) => defaultColors[i % defaultColors.length] + '80')
          : defaultColors[index % defaultColors.length] + '80'
        ),
      borderColor: dataset.borderColor || 
        (Array.isArray(data.labels)
          ? data.labels.map((_, i) => defaultColors[i % defaultColors.length])
          : defaultColors[index % defaultColors.length]
        ),
      borderWidth: dataset.borderWidth || 1,
      maxBarThickness
    }))
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? 'y' as const : 'x' as const,
    animation: animate ? {
      duration: 1000,
      easing: 'easeInOutQuart'
    } : false,
    plugins: {
      legend: {
        display: showLegend,
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: '500'
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
          label: (context: TooltipItem<'bar'>) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y || context.parsed.x;
            
            if (tooltipFormatter) {
              return `${label}: ${tooltipFormatter(value, context.label)}`;
            }
            
            return `${label}: ${value.toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      x: {
        stacked,
        display: true,
        grid: {
          display: showGrid && !horizontal,
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          font: {
            size: 11
          },
          maxRotation: horizontal ? 0 : 45,
          callback: function(value, index) {
            if (!horizontal && typeof value === 'number') {
              if (value >= 1000000) {
                return (value / 1000000).toFixed(1) + 'M';
              }
              if (value >= 1000) {
                return (value / 1000).toFixed(1) + 'K';
              }
              return value.toString();
            }
            return data.labels[index] || value;
          }
        },
        beginAtZero: !horizontal
      },
      y: {
        stacked,
        display: true,
        grid: {
          display: showGrid && horizontal,
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          font: {
            size: 11
          },
          callback: function(value, index) {
            if (horizontal && typeof value === 'number') {
              if (value >= 1000000) {
                return (value / 1000000).toFixed(1) + 'M';
              }
              if (value >= 1000) {
                return (value / 1000).toFixed(1) + 'K';
              }
              return value.toString();
            }
            return horizontal ? (data.labels[index] || value) : value;
          }
        },
        beginAtZero: horizontal
      }
    },
    onClick: (event, elements) => {
      if (elements.length > 0 && onBarClick) {
        const element = elements[0];
        onBarClick(element.index, element.datasetIndex);
      }
    }
  };

  return (
    <div className={`w-full ${className}`} style={{ height: `${height}px` }}>
      <Bar data={processedData} options={options} />
    </div>
  );
};

export default BarChart;