import React, { useState, useEffect } from 'react';
import { FaSort, FaSortUp, FaSortDown, FaSearch, FaTimesCircle, FaCheckCircle, FaFilePdf, FaInfoCircle } from 'react-icons/fa';
import './UploadRecords.css';

function UploadRecords({ onBack }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortField, setSortField] = useState('uploadDate');
  const [sortDirection, setSortDirection] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);

  useEffect(() => {
    fetchUploadRecords();
  }, []);

  useEffect(() => {
    // Filter and sort records when records, searchTerm, or sort parameters change
    filterAndSortRecords();
  }, [records, searchTerm, sortField, sortDirection]);

  const fetchUploadRecords = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://10.120.0.132:3001/getUploadRecords');
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Check if the response has the expected structure
      if (data && data.records && Array.isArray(data.records)) {
        setRecords(data.records);
      } else if (data && Array.isArray(data)) {
        // Fallback for old API response format
        setRecords(data);
      } else {
        console.error('Unexpected response format:', data);
        setRecords([]);
        setError('Received invalid data format from server.');
      }
    } catch (err) {
      setError('Failed to fetch upload records. Please try again later.');
      console.error('Error fetching upload records:', err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const viewErrorDetails = (record) => {
    setSelectedRecord(record);
    setShowErrorModal(true);
  };

  const closeErrorModal = () => {
    setShowErrorModal(false);
    setSelectedRecord(null);
  };

  const viewErrorPDF = async (submissionId) => {
    if (!submissionId) {
      alert('No submission ID available for this record');
      return;
    }

    try {
      const response = await fetch(`http://:3001/failedSubmission/${submissionId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      // Get the PDF blob from the response
      const pdfBlob = await response.blob();
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      // Open the PDF in a new tab
      window.open(pdfUrl, "_blank");
    } catch (error) {
      console.error('Error fetching error PDF:', error);
      alert('Failed to retrieve the error PDF. Please try again later.');
    }
  };

  const filterAndSortRecords = () => {
    // Ensure records is an array before operations
    if (!Array.isArray(records)) {
      console.error('Records is not an array:', records);
      setFilteredRecords([]);
      return;
    }
    
    let filtered = [...records];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(record => 
        (record.uploader && record.uploader.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (record.status && record.status.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (record.uploadDate && new Date(record.uploadDate).toLocaleDateString().includes(searchTerm))
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      if (sortField === 'uploadDate') {
        const dateA = new Date(a.uploadDate || 0);
        const dateB = new Date(b.uploadDate || 0);
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      } else if (sortField === 'uploader' || sortField === 'status') {
        const valueA = (a[sortField] || '').toLowerCase();
        const valueB = (b[sortField] || '').toLowerCase();
        return sortDirection === 'asc' 
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      } else {
        return sortDirection === 'asc' ? (a.id || 0) - (b.id || 0) : (b.id || 0) - (a.id || 0);
      }
    });
    
    setFilteredRecords(filtered);
  };

  const handleSort = (field) => {
    // If clicking on the same field, toggle direction, otherwise set to ascending
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return <FaSort />;
    return sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  return (
    <div className="page-container upload-records-container">
      <div className="page-header">
        <button onClick={onBack || (() => window.location.href = "/")} className="back-button">
          返回主選單
        </button>
        <h2 className="page-title">上傳記錄查詢</h2>
      </div>
      
      <div className="search-container">
        <FaSearch className="search-icon" />
        <input
          type="text"
          placeholder="搜尋員工編號、狀態或日期..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        {searchTerm && (
          <FaTimesCircle 
            className="clear-search" 
            onClick={() => setSearchTerm('')}
          />
        )}
      </div>
      
      {loading ? (
        <div className="loading-container">載入中...</div>
      ) : error ? (
        <div className="error-container">{error}</div>
      ) : filteredRecords.length === 0 ? (
        <div className="no-records">沒有找到符合條件的上傳記錄</div>
      ) : (
        <div className="table-container">
          <table className="records-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('id')}>
                  編號 {getSortIcon('id')}
                </th>
                <th onClick={() => handleSort('status')}>
                  狀態 {getSortIcon('status')}
                </th>
                <th onClick={() => handleSort('uploadDate')}>
                  上傳日期 {getSortIcon('uploadDate')}
                </th>
                <th onClick={() => handleSort('uploader')}>
                  員工編號 {getSortIcon('uploader')}
                </th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record, index) => (
                <tr key={record.id || index} className={record.status && record.status.toLowerCase() === 'failed' ? 'failed-record' : ''}>
                  <td>{record.id}</td>
                  <td className="status-cell">
                    {record.status && record.status.toLowerCase() === 'success' ? (
                      <><FaCheckCircle className="success-icon" /> 成功</>
                    ) : (
                      <><FaTimesCircle className="failed-icon" /> 失敗</>
                    )}
                  </td>
                  <td>{record.uploadDate ? formatDate(record.uploadDate) : '-'}</td>
                  <td>{record.uploader || '-'}</td>
                  <td className="actions-cell">
                    {record.status && record.status.toLowerCase() === 'failed' && (
                      <>
                        {record.errorDetails && (
                          <button 
                            onClick={() => viewErrorDetails(record)}
                            className="action-button info-button"
                            title="查看錯誤詳情"
                          >
                            <FaInfoCircle />
                          </button>
                        )}
                        {record.submissionId && (
                          <button 
                            onClick={() => viewErrorPDF(record.submissionId)}
                            className="action-button pdf-button"
                            title="查看錯誤PDF"
                          >
                            <FaFilePdf />
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <div className="records-summary">
        總共找到 {filteredRecords.length} 條記錄
        {searchTerm ? ` (搜尋結果)` : ''}
      </div>
      
      <button 
        className="action-button"
        onClick={fetchUploadRecords}
      >
        刷新資料
      </button>

      {/* Error Details Modal */}
      {showErrorModal && selectedRecord && (
        <div className="modal-overlay" onClick={closeErrorModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">錯誤詳情</h3>
            <div className="modal-body">
              <p><strong>編號:</strong> {selectedRecord.id}</p>
              <p><strong>上傳日期:</strong> {formatDate(selectedRecord.uploadDate)}</p>
              <p><strong>員工編號:</strong> {selectedRecord.uploader}</p>
              <div className="error-details">
                <h4>錯誤信息:</h4>
                <pre>{selectedRecord.errorDetails || '沒有詳細錯誤資訊'}</pre>
              </div>
              {selectedRecord.submissionId && (
                <button 
                  onClick={() => viewErrorPDF(selectedRecord.submissionId)}
                  className="view-pdf-button"
                >
                  查看錯誤 PDF
                </button>
              )}
            </div>
            <button onClick={closeErrorModal} className="close-modal-button">關閉</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UploadRecords;
