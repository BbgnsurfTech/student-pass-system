import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ChartOptions,
  TooltipItem
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface LineChartProps {
  data: {
    labels: string[] | Date[];
    datasets: Array<{
      label: string;
      data: number[];
      borderColor?: string;
      backgroundColor?: string;
      fill?: boolean;
      tension?: number;
    }>;
  };
  title?: string;
  height?: number;
  timeScale?: boolean;
  showLegend?: boolean;
  showGrid?: boolean;
  animate?: boolean;
  tooltipFormatter?: (value: number, label: string) => string;
  onDataPointClick?: (dataIndex: number, datasetIndex: number) => void;
  className?: string;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  title,
  height = 400,
  timeScale = false,
  showLegend = true,
  showGrid = true,
  animate = true,
  tooltipFormatter,
  onDataPointClick,
  className = ''
}) => {
  const defaultColors = [
    '#3B82F6', // blue-500
    '#10B981', // emerald-500
    '#F59E0B', // amber-500
    '#EF4444', // red-500
    '#8B5CF6', // violet-500
    '#06B6D4', // cyan-500
  ];

  const processedData = {
    ...data,
    datasets: data.datasets.map((dataset, index) => ({
      ...dataset,
      borderColor: dataset.borderColor || defaultColors[index % defaultColors.length],
      backgroundColor: dataset.backgroundColor || `${defaultColors[index % defaultColors.length]}20`,
      fill: dataset.fill !== undefined ? dataset.fill : false,
      tension: dataset.tension !== undefined ? dataset.tension : 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: 2,
    }))
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
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
          label: (context: TooltipItem<'line'>) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            
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
        type: timeScale ? 'time' : 'category',
        display: true,
        grid: {
          display: showGrid,
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          font: {
            size: 11
          },
          maxRotation: 45
        },
        ...(timeScale && {
          time: {
            displayFormats: {
              hour: 'HH:mm',
              day: 'MMM dd',
              week: 'MMM dd',
              month: 'MMM yyyy'
            }
          }
        })
      },
      y: {
        display: true,
        grid: {
          display: showGrid,
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          font: {
            size: 11
          },
          callback: function(value) {
            if (typeof value === 'number') {
              if (value >= 1000000) {
                return (value / 1000000).toFixed(1) + 'M';
              }
              if (value >= 1000) {
                return (value / 1000).toFixed(1) + 'K';
              }
              return value.toString();
            }
            return value;
          }
        },
        beginAtZero: true
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    },
    onClick: (event, elements) => {
      if (elements.length > 0 && onDataPointClick) {
        const element = elements[0];
        onDataPointClick(element.index, element.datasetIndex);
      }
    }
  };

  return (
    <div className={`w-full ${className}`} style={{ height: `${height}px` }}>
      <Line data={processedData} options={options} />
    </div>
  );
};

export default LineChart;