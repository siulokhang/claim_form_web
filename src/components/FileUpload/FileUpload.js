import React, { useState } from "react";
import "./FileUpload.css";

function FileUpload({ onFileUpload, onBack }) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === "application/pdf") setFile(droppedFile);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile?.type === "application/pdf") setFile(selectedFile);
  };

  const handleConfirm = async () => {
    if (!file) return alert("Please select a file first");
    setIsLoading(true);

    try {
      // Fetch the latest enum lists before uploading
      const fetchEnumLists = async () => {
        const response = await fetch("http://10.120.0.132:3001/getAllEnumLists");
        const result = await response.json();
        if (result.data.success === "true") {
          return {
            companyList: result.data.companyList || [],
            costCenterList: result.data.costCenterList || [],
            purposeList: result.data.purposeList || [],
          };
        } else {
          console.error("Failed to fetch enum lists:", result.data.msg);
          throw new Error("Failed to fetch enum lists");
        }
      };

      const enumLists = await fetchEnumLists();

      const formData = new FormData();
      formData.append("claimForm", file);

      const response = await fetch("http://10.120.0.132:3001/upload", {
        method: "POST",
        body: formData,
      });

      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const result = await response.json();
        if (response.ok) {
          onFileUpload(file, result.data, result.pngFiles, enumLists);
        } else {
          alert(result.error || "File upload failed.");
        }
      } else {
        alert("Unexpected response from the server. Please try again.");
      }
    } catch (error) {
      alert("Failed to upload file. Please check your network connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-container file-upload-container">
      <div className="page-header">
        <button onClick={onBack || (() => window.location.href = "/")} className="back-button">
          返回主選單
        </button>
        <h2 className="page-title">上傳資料</h2>
      </div>
      <div className="upload-content">
        <div className="upload-box">
          <h3 className="section-title">上傳檔案：</h3>
          <div
            className={`drop-zone ${isDragging ? "dragging" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <p className="drag-text">拖曳 PDF 到此處或點擊選擇</p>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="file-input"
              id="fileInput"
            />
            <label htmlFor="fileInput" className="file-label">
              選擇檔案
            </label>
          </div>
          {file && <p className="file-info">已選擇檔案：{file.name}</p>}
          <button onClick={handleConfirm} className="action-button primary" disabled={isLoading}>
            {isLoading ? "上傳中..." : "確認"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FileUpload;
