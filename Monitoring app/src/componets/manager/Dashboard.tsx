import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { formatMinutes, formatDate } from '../../utils/helpers';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement);

const Dashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    totalEmployees: 0,
    onlineEmployees: 0,
    offlineEmployees: 0,
    todayAttendance: {
      present: 0,
      absent: 0,
      late: 0
    },
    weeklyAttendance: [],
    topApplications: [],
    productivityData: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch live status for all employees
      const liveStatusResponse = await window.electronAPI.monitoring.getLiveStatus();
      
      if (liveStatusResponse.success) {
        const employees = liveStatusResponse.employees;
        
        // Calculate counts
        const onlineCount = employees.filter(emp => emp.status === 'Online').length;
        const offlineCount = employees.filter(emp => emp.status === 'Offline').length;
        
        // Get today's attendance
        const today = new Date().toISOString().split('T')[0];
        const attendanceResponse = await window.electronAPI.monitoring.getAttendance(0, today, today);
        
        let presentCount = 0;
        let absentCount = 0;
        let lateCount = 0;
        
        if (attendanceResponse.success) {
          for (const record of attendanceResponse.attendance) {
            switch (record.status) {
              case 'present':
                presentCount++;
                break;
              case 'absent':
                absentCount++;
                break;
              case 'late':
                presentCount++;
                lateCount++;
                break;
            }
          }
        }
        
        // Get weekly attendance data
        const weeklyAttendanceData = await getWeeklyAttendanceData();
        
        // Get top applications
        const topApplicationsData = await getTopApplicationsData();
        
        // Get productivity data
        const productivityData = await getProductivityData();
        
        setDashboardData({
          totalEmployees: employees.length,
          onlineEmployees: onlineCount,
          offlineEmployees: offlineCount,
          todayAttendance: {
            present: presentCount,
            absent: absentCount,
            late: lateCount
          },
          weeklyAttendance: weeklyAttendanceData,
          topApplications: topApplicationsData,
          productivityData: productivityData
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getWeeklyAttendanceData = async () => {
    try {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 7);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = today.toISOString().split('T')[0];
      
      // Get all employees
      const employeesResponse = await window.electronAPI.employee.getAll();
      
      if (!employeesResponse.success) {
        return [];
      }
      
      const employees = employeesResponse.data;
      const weeklyData = [];
      
      // Generate data for each day of the week
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        let presentCount = 0;
        let absentCount = 0;
        
        // Get attendance for all employees on this date
        for (const employee of employees) {
          const attendanceResponse = await window.electronAPI.monitoring.getAttendance(employee.id, dateStr, dateStr);
          
          if (attendanceResponse.success && attendanceResponse.attendance.length > 0) {
            const attendance = attendanceResponse.attendance[0];
            
            if (attendance.status === 'present' || attendance.status === 'late') {
              presentCount++;
            } else {
              absentCount++;
            }
          } else {
            absentCount++;
          }
        }
        
        weeklyData.push({
          date: formatDate(dateStr),
          present: presentCount,
          absent: absentCount
        });
      }
      
      return weeklyData;
    } catch (error) {
      console.error('Error getting weekly attendance data:', error);
      return [];
    }
  };

  const getTopApplicationsData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get all employees
      const employeesResponse = await window.electronAPI.employee.getAll();
      
      if (!employeesResponse.success) {
        return [];
      }
      
      const employees = employeesResponse.data;
      const appUsageMap = new Map<string, number>();
      
      // Get app usage for all employees today
      for (const employee of employees) {
        const appUsageResponse = await window.electronAPI.monitoring.getAppUsage(employee.id, today, today);
        
        if (appUsageResponse.success) {
          for (const app of appUsageResponse.data) {
            const currentUsage = appUsageMap.get(app.application_name) || 0;
            appUsageMap.set(app.application_name, currentUsage + app.total_time);
          }
        }
      }
      
      // Convert to array and sort by usage time
      const appUsageArray = Array.from(appUsageMap.entries())
        .map(([name, time]) => ({ application_name: name, total_time: time }))
        .sort((a, b) => b.total_time - a.total_time)
        .slice(0, 10);
      
      return appUsageArray;
    } catch (error) {
      console.error('Error getting top applications data:', error);
      return [];
    }
  };

  const getProductivityData = async () => {
    try {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 7);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = today.toISOString().split('T')[0];
      
      // Get all employees
      const employeesResponse = await window.electronAPI.employee.getAll();
      
      if (!employeesResponse.success) {
        return [];
      }
      
      const employees = employeesResponse.data;
      const productivityData = [];
      
      // Generate data for each day of the week
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        let totalProductivity = 0;
        let employeeCount = 0;
        
        // Get productivity for all employees on this date
        for (const employee of employees) {
          const productivityResponse = await window.electronAPI.monitoring.getProductivityMetrics(employee.id, dateStr, dateStr);
          
          if (productivityResponse.success) {
            totalProductivity += productivityResponse.data.productivityScore;
            employeeCount++;
          }
        }
        
        const avgProductivity = employeeCount > 0 ? totalProductivity / employeeCount : 0;
        
        productivityData.push({
          date: formatDate(dateStr),
          productivity: avgProductivity
        });
      }
      
      return productivityData;
    } catch (error) {
      console.error('Error getting productivity data:', error);
      return [];
    }
  };

  // Prepare chart data
  const attendanceChartData = {
    labels: dashboardData.weeklyAttendance.map(item => item.date),
    datasets: [
      {
        label: 'Present',
        data: dashboardData.weeklyAttendance.map(item => item.present),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      },
      {
        label: 'Absent',
        data: dashboardData.weeklyAttendance.map(item => item.absent),
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1
      }
    ]
  };

  const statusPieChartData = {
    labels: ['Online', 'Offline'],
    datasets: [
      {
        data: [dashboardData.onlineEmployees, dashboardData.offlineEmployees],
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

  const attendancePieChartData = {
    labels: ['Present', 'Absent', 'Late'],
    datasets: [
      {
        data: [
          dashboardData.todayAttendance.present - dashboardData.todayAttendance.late,
          dashboardData.todayAttendance.absent,
          dashboardData.todayAttendance.late
        ],
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(255, 99, 132, 0.6)',
          'rgba(255, 206, 86, 0.6)'
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 206, 86, 1)'
        ],
        borderWidth: 1
      }
    ]
  };

  const productivityChartData = {
    labels: dashboardData.productivityData.map(item => item.date),
    datasets: [
      {
        label: 'Average Productivity (%)',
        data: dashboardData.productivityData.map(item => item.productivity),
        fill: false,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        tension: 0.1
      }
    ]
  };

  const topAppsChartData = {
    labels: dashboardData.topApplications.map(app => app.application_name),
    datasets: [
      {
        label: 'Usage Time (minutes)',
        data: dashboardData.topApplications.map(app => app.total_time),
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
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Dashboard</h2>
        <button onClick={fetchDashboardData}>Refresh</button>
      </div>
      
      <div className="dashboard-grid">
        <div className="stat-card">
          <h3>Total Employees</h3>
          <div className="stat-value">{dashboardData.totalEmployees}</div>
        </div>
        
        <div className="stat-card">
          <h3>Online Now</h3>
          <div className="stat-value">{dashboardData.onlineEmployees}</div>
        </div>
        
        <div className="stat-card">
          <h3>Present Today</h3>
          <div className="stat-value">{dashboardData.todayAttendance.present}</div>
        </div>
        
        <div className="stat-card">
          <h3>Absent Today</h3>
          <div className="stat-value">{dashboardData.todayAttendance.absent}</div>
        </div>
      </div>
      
      <div className="dashboard-charts">
        <div className="chart-container">
          <h3>Weekly Attendance</h3>
          <Bar data={attendanceChartData} />
        </div>
        
        <div className="chart-container">
          <h3>Current Status</h3>
          <Pie data={statusPieChartData} />
        </div>
        
        <div className="chart-container">
          <h3>Today's Attendance</h3>
          <Pie data={attendancePieChartData} />
        </div>
        
        <div className="chart-container">
          <h3>Weekly Productivity</h3>
          <Line data={productivityChartData} />
        </div>
        
        <div className="chart-container">
          <h3>Top Applications Today</h3>
          <Bar data={topAppsChartData} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;