import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { formatMinutes, formatDate } from '../../utils/helpers';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const ActivitySummary: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activityData, setActivityData] = useState({
    productivity: {
      totalMinutes: 0,
      activeMinutes: 0,
      idleMinutes: 0,
      productivityScore: 0,
    },
    topApplications: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  // In a real app, the employee ID would be determined by login or system context
  const EMPLOYEE_ID = 1;

  useEffect(() => {
    fetchActivityData();
  }, [selectedDate]);

  const fetchActivityData = async () => {
    try {
      setIsLoading(true);
      const response = await window.electronAPI.monitoring.getProductivityMetrics(EMPLOYEE_ID, selectedDate, selectedDate);
      
      if (response.success) {
        setActivityData(response.data);
      } else {
        console.error('Failed to fetch activity data:', response.message);
      }
    } catch (error) {
      console.error('Error fetching activity data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  // Prepare chart data
  const productivityPieChartData = {
    labels: ['Active Time', 'Idle Time'],
    datasets: [
      {
        data: [activityData.productivity.activeMinutes, activityData.productivity.idleMinutes],
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 99, 132, 0.6)'
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)'
        ],
        borderWidth: 1
      }
    ]
  };

  const topAppsChartData = {
    labels: activityData.topApplications.map((app: any) => app.applicationName),
    datasets: [
      {
        label: 'Usage Time (minutes)',
        data: activityData.topApplications.map((app: any) => app.minutes),
        backgroundColor: 'rgba(153, 102, 255, 0.6)',
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 1
      }
    ]
  };

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading activity data...</p>
      </div>
    );
  }

  return (
    <div className="activity-summary">
      <div className="page-header">
        <h2>My Activity Summary</h2>
        <div className="date-picker">
          <label htmlFor="activity-date">Date:</label>
          <input
            type="date"
            id="activity-date"
            value={selectedDate}
            onChange={handleDateChange}
          />
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="stat-card">
          <h3>Total Time</h3>
          <div className="stat-value">{formatMinutes(activityData.productivity.totalMinutes)}</div>
        </div>
        
        <div className="stat-card">
          <h3>Active Time</h3>
          <div className="stat-value">{formatMinutes(activityData.productivity.activeMinutes)}</div>
        </div>
        
        <div className="stat-card">
          <h3>Idle Time</h3>
          <div className="stat-value">{formatMinutes(activityData.productivity.idleMinutes)}</div>
        </div>
        
        <div className="stat-card">
          <h3>Productivity Score</h3>
          <div className="stat-value">{activityData.productivity.productivityScore.toFixed(1)}%</div>
        </div>
      </div>

      <div className="dashboard-charts">
        <div className="chart-container">
          <h3>Time Distribution for {formatDate(selectedDate)}</h3>
          <Pie data={productivityPieChartData} />
        </div>
        
        <div className="chart-container">
          <h3>Top Applications Used</h3>
          <Bar data={topAppsChartData} />
        </div>
      </div>
    </div>
  );
};

export default ActivitySummary;