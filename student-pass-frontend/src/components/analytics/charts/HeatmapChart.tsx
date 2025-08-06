import React, { useMemo } from 'react';
import { format, startOfWeek, eachDayOfInterval, eachHourOfInterval, startOfHour } from 'date-fns';

interface HeatmapData {
  date: Date;
  value: number;
}

interface HeatmapChartProps {
  data: HeatmapData[];
  title?: string;
  height?: number;
  type?: 'daily' | 'hourly' | 'weekly';
  colorScheme?: 'blue' | 'green' | 'red' | 'purple';
  showLabels?: boolean;
  onCellClick?: (data: HeatmapData) => void;
  className?: string;
  minValue?: number;
  maxValue?: number;
}

export const HeatmapChart: React.FC<HeatmapChartProps> = ({
  data,
  title,
  height = 400,
  type = 'daily',
  colorScheme = 'blue',
  showLabels = true,
  onCellClick,
  className = '',
  minValue,
  maxValue
}) => {
  const colorSchemes = {
    blue: ['#EBF8FF', '#BEE3F8', '#90CDF4', '#63B3ED', '#4299E1', '#3182CE', '#2B6CB0'],
    green: ['#F0FFF4', '#C6F6D5', '#9AE6B4', '#68D391', '#48BB78', '#38A169', '#2F855A'],
    red: ['#FED7D7', '#FEB2B2', '#FC8181', '#F56565', '#E53E3E', '#C53030', '#9B2C2C'],
    purple: ['#FAF5FF', '#E9D8FD', '#D6BCFA', '#B794F6', '#9F7AEA', '#805AD5', '#6B46C1']
  };

  const colors = colorSchemes[colorScheme];

  // Calculate min and max values if not provided
  const { calculatedMin, calculatedMax } = useMemo(() => {
    if (data.length === 0) return { calculatedMin: 0, calculatedMax: 1 };
    
    const values = data.map(d => d.value);
    return {
      calculatedMin: minValue !== undefined ? minValue : Math.min(...values),
      calculatedMax: maxValue !== undefined ? maxValue : Math.max(...values)
    };
  }, [data, minValue, maxValue]);

  // Generate grid based on type
  const gridData = useMemo(() => {
    if (data.length === 0) return [];

    const dataMap = new Map(data.map(d => [format(d.date, 'yyyy-MM-dd-HH'), d]));
    
    switch (type) {
      case 'hourly': {
        // 24 hours x 7 days grid
        const grid: Array<Array<{ date: Date; value: number; label: string }>> = [];
        
        for (let day = 0; day < 7; day++) {
          const dayRow: Array<{ date: Date; value: number; label: string }> = [];
          for (let hour = 0; hour < 24; hour++) {
            const date = new Date();
            date.setDate(date.getDate() - (6 - day));
            date.setHours(hour, 0, 0, 0);
            
            const key = format(date, 'yyyy-MM-dd-HH');
            const dataPoint = dataMap.get(key);
            
            dayRow.push({
              date,
              value: dataPoint?.value || 0,
              label: `${format(date, 'EEE')} ${format(date, 'HH:mm')}`
            });
          }
          grid.push(dayRow);
        }
        return grid;
      }
      
      case 'weekly': {
        // 7 weeks x 7 days grid
        const grid: Array<Array<{ date: Date; value: number; label: string }>> = [];
        const startDate = startOfWeek(new Date());
        
        for (let week = 0; week < 7; week++) {
          const weekRow: Array<{ date: Date; value: number; label: string }> = [];
          for (let day = 0; day < 7; day++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() - (6 - week) * 7 + day);
            
            const key = format(date, 'yyyy-MM-dd-HH');
            const dataPoint = dataMap.get(key);
            
            weekRow.push({
              date,
              value: dataPoint?.value || 0,
              label: format(date, 'MMM dd, yyyy')
            });
          }
          grid.push(weekRow);
        }
        return grid;
      }
      
      default: {
        // Daily view: 31 days x 1 row
        const grid: Array<Array<{ date: Date; value: number; label: string }>> = [[]];
        
        for (let day = 0; day < 31; day++) {
          const date = new Date();
          date.setDate(date.getDate() - (30 - day));
          date.setHours(0, 0, 0, 0);
          
          const key = format(date, 'yyyy-MM-dd-HH');
          const dataPoint = dataMap.get(key);
          
          grid[0].push({
            date,
            value: dataPoint?.value || 0,
            label: format(date, 'MMM dd, yyyy')
          });
        }
        return grid;
      }
    }
  }, [data, type]);

  const getColor = (value: number): string => {
    if (calculatedMax === calculatedMin) return colors[0];
    
    const normalizedValue = (value - calculatedMin) / (calculatedMax - calculatedMin);
    const colorIndex = Math.floor(normalizedValue * (colors.length - 1));
    return colors[Math.max(0, Math.min(colors.length - 1, colorIndex))];
  };

  const getCellSize = () => {
    switch (type) {
      case 'hourly':
        return 'w-4 h-4';
      case 'weekly':
        return 'w-6 h-6';
      default:
        return 'w-3 h-8';
    }
  };

  const getGridLayout = () => {
    switch (type) {
      case 'hourly':
        return 'grid-cols-24 gap-1';
      case 'weekly':
        return 'grid-cols-7 gap-1';
      default:
        return 'grid-cols-31 gap-1';
    }
  };

  return (
    <div className={`w-full ${className}`} style={{ minHeight: `${height}px` }}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      
      <div className="space-y-4">
        {/* Time labels for hourly view */}
        {type === 'hourly' && showLabels && (
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i}>{i * 4}:00</span>
            ))}
          </div>
        )}
        
        {/* Heatmap grid */}
        <div className="space-y-1">
          {gridData.map((row, rowIndex) => (
            <div key={rowIndex} className={`grid ${getGridLayout()}`}>
              {row.map((cell, cellIndex) => (
                <div
                  key={cellIndex}
                  className={`${getCellSize()} rounded-sm cursor-pointer transition-all duration-200 hover:scale-110 hover:z-10 relative`}
                  style={{ backgroundColor: getColor(cell.value) }}
                  onClick={() => onCellClick?.(cell)}
                  title={`${cell.label}: ${cell.value.toLocaleString()}`}
                >
                  {/* Optional cell value display */}
                  {showLabels && cell.value > 0 && type === 'weekly' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-medium text-white">
                        {cell.value > 999 ? Math.round(cell.value / 1000) + 'k' : cell.value}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
        
        {/* Day labels for hourly and weekly views */}
        {(type === 'hourly' || type === 'weekly') && showLabels && (
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
              <span key={index} className="w-12 text-center">{day}</span>
            ))}
          </div>
        )}
        
        {/* Legend */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Less</span>
            <div className="flex space-x-1">
              {colors.slice(0, 5).map((color, index) => (
                <div
                  key={index}
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <span className="text-sm text-gray-500">More</span>
          </div>
          
          <div className="text-sm text-gray-500">
            {calculatedMin.toLocaleString()} - {calculatedMax.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeatmapChart;