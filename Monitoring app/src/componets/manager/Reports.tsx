// ... (previous imports and state declarations)
const Reports: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportForm, setReportForm] = useState<ReportGenerationParams>({
    type: 'daily',
    employeeIds: [],
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchReports();
    fetchEmployees();
  }, []);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      const response = await window.electronAPI.reports.getSaved();
      
      if (response.success) {
        setReports(response.reports);
      } else {
        console.error('Failed to fetch reports:', response.message);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await window.electronAPI.employee.getAll();
      
      if (response.success) {
        setEmployees(response.data);
      } else {
        console.error('Failed to fetch employees:', response.message);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleGenerateReport = async () => {
    try {
      const response = await window.electronAPI.reports.generateReport(
        reportForm.type,
        reportForm.employeeIds,
        reportForm.startDate,
        reportForm.endDate
      );
      
      if (response.success) {
        setShowGenerateModal(false);
        resetReportForm();
        fetchReports();
        alert('Report generated successfully');
      } else {
        alert(`Failed to generate report: ${response.message}`);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('An error occurred while generating the report');
    }
  };

  const handleExportReport = async (reportData: any, format: string) => {
    try {
      const response = await window.electronAPI.reports.exportReport(reportData, format);
      
      if (response.success) {
        alert(`Report exported successfully to ${response.filePath}`);
      } else {
        alert(`Failed to export report: ${response.message}`);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('An error occurred while exporting the report');
    }
  };

  const viewReportDetails = async (reportId: number) => {
    try {
      const response = await window.electronAPI.reports.getReportDetails(reportId);
      
      if (response.success) {
        setSelectedReport(response.report);
        setShowDetailsModal(true);
      } else {
        alert(`Failed to get report details: ${response.message}`);
      }
    } catch (error) {
      console.error('Error getting report details:', error);
      alert('An error occurred while getting report details');
    }
  };

  const resetReportForm = () => {
    const dateRange = getDateRangeForReportType(reportForm.type);
    setReportForm({
      type: 'daily',
      employeeIds: [],
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    });
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'type') {
      const dateRange = getDateRangeForReportType(value as 'daily' | 'weekly' | 'monthly');
      setReportForm({
        ...reportForm,
        [name]: value,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
    } else {
      setReportForm({
        ...reportForm,
        [name]: value
      });
    }
  };

  const handleEmployeeSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => parseInt(option.value));
    setReportForm({
      ...reportForm,
      employeeIds: selectedOptions
    });
  };

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="reports">
      <div className="page-header">
        <h2>Reports</h2>
        <button className="add-btn" onClick={() => setShowGenerateModal(true)}>
          Generate Report
        </button>
      </div>
      
      {reports.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📈</div>
          <h3>No reports found</h3>
          <p>Generate your first report to get started</p>
          <button className="add-btn" onClick={() => setShowGenerateModal(true)}>
            Generate Report
          </button>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Period</th>
                <th>Created By</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td>
                    <span className="report-type-badge">
                      {report.type.charAt(0).toUpperCase() + report.type.slice(1)}
                    </span>
                  </td>
                  <td>
                    {formatDate(report.startDate)} - {formatDate(report.endDate)}
                  </td>
                  <td>{report.created_by_username}</td>
                  <td>{formatDateTime(report.created_at)}</td>
                  <td>
                    <button
                      className="view-btn"
                      onClick={() => viewReportDetails(report.id)}
                    >
                      View
                    </button>
                    <button
                      className="export-btn"
                      onClick={() => handleExportReport(report.data, 'pdf')}
                    >
                      Export PDF
                    </button>
                    <button
                      className="export-btn"
                      onClick={() => handleExportReport(report.data, 'excel')}
                    >
                      Export Excel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Generate Report</h3>
              <button className="modal-close" onClick={() => setShowGenerateModal(false)}>
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="type">Report Type</label>
                <select
                  id="type"
                  name="type"
                  value={reportForm.type}
                  onChange={handleFormChange}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="employees">Employees</label>
                <select
                  id="employees"
                  name="employees"
                  multiple
                  value={reportForm.employeeIds.map(id => id.toString())}
                  onChange={handleEmployeeSelection}
                >
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.fullName}
                    </option>
                  ))}
                </select>
                <small>Hold Ctrl/Cmd to select multiple employees</small>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="startDate">Start Date</label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={reportForm.startDate}
                    onChange={handleFormChange}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="endDate">End Date</label>
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    value={reportForm.endDate}
                    onChange={handleFormChange}
                  />
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="secondary" onClick={() => setShowGenerateModal(false)}>
                Cancel
              </button>
              <button onClick={handleGenerateReport}>Generate Report</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Report Details Modal */}
      {showDetailsModal && selectedReport && (
        <div className="modal">
          <div className="modal-content modal-large">
            <div className="modal-header">
              <h3>
                {selectedReport.type.charAt(0).toUpperCase() + selectedReport.type.slice(1)} Report Details
              </h3>
              <button className="modal-close" onClick={() => setShowDetailsModal(false)}>
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="report-summary">
                <h4>Summary</h4>
                <p>
                  <strong>Period:</strong> {formatDate(selectedReport.startDate)} - {formatDate(selectedReport.endDate)}
                </p>
                <p>
                  <strong>Generated on:</strong> {formatDateTime(selectedReport.generated_at)}
                </p>
                <p>
                  <strong>Total Employees:</strong> {selectedReport.data.employees.length}
                </p>
              </div>
              
              <div className="report-employees">
                <h4>Employee Details</h4>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Attendance Rate</th>
                      <th>Productivity Score</th>
                      <th>Total Work Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReport.data.employees.map((employee: any) => (
                      <tr key={employee.id}>
                        <td>{employee.fullName}</td>
                        <td>{employee.role}</td>
                        <td>{employee.attendance.attendanceRate.toFixed(2)}%</td>
                        <td>{employee.productivity.productivityScore.toFixed(2)}%</td>
                        <td>{formatMinutes(employee.productivity.totalWorkTime)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="secondary" onClick={() => setShowDetailsModal(false)}>
                Close
              </button>
              <button onClick={() => handleExportReport(selectedReport.data, 'pdf')}>
                Export PDF
              </button>
              <button onClick={() => handleExportReport(selectedReport.data, 'excel')}>
                Export Excel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;