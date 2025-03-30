import React, { useState } from "react";
import "./FileUpload.css";

function FileUpload({ onFileUpload }) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // Add loading state

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === "application/pdf") {
      setFile(droppedFile);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
    }
  };

  const handleConfirm = async () => {
    if (file) {
      console.log("Uploading file:", file.name); // Log the file name
      setIsLoading(true); // Set loading to true
      try {
        const formData = new FormData();
        formData.append("claimForm", file);

        const response = await fetch("http://localhost:3001/upload", {
          method: "POST",
          body: formData,
        });

        console.log("Upload response status:", response.status); // Log response status
        const contentType = response.headers.get("content-type");
        console.log("Response content-type:", contentType); // Log content type

        // Check if the response is JSON
        if (contentType && contentType.includes("application/json")) {
          const result = await response.json();
          console.log("Upload response data:", result); // Log the response data

          if (response.ok) {
            console.log("File upload successful");
            onFileUpload(file, result.data, result.pngFiles); // Pass the extracted data and pngFiles
          } else {
            console.warn("File upload failed:", result.error || response.statusText);
            alert(result.error || "File upload failed.");
          }
        } else {
          // Handle non-JSON responses
          const text = await response.text();
          console.warn("Unexpected response:", text); // Log unexpected response
          alert("Unexpected response from the server. Please try again.");
        }
      } catch (error) {
        console.error("Error uploading file:", error.message || error);
        alert("Failed to upload file. Please check your network connection and try again.");
      } finally {
        setIsLoading(false); // Set loading to false
      }
    } else {
      alert("Please select a file first");
    }
  };

  return (
    <div className="container">
      <div className="upload-box">
        <h2 className="title">上傳檔案：</h2>
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

        <button onClick={handleConfirm} className="confirm-button" disabled={isLoading}>
          {isLoading ? "上傳中..." : "確認"}
        </button>
      </div>
    </div>
  );
}

export default FileUpload;
