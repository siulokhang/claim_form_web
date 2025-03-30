import React, { useState } from "react";
import FileUpload from "./components/FileUpload/FileUpload";
import PDFPreview from "./components/PDFPreview/PDFPreview";
import Login from "./components/Login/Login";
import "./styles/global.css";

function App() {
  const [currentPage, setCurrentPage] = useState("login");
  const [selectedFile, setSelectedFile] = useState(null);
  const [extractedData, setExtractedData] = useState([]);
  const [pngFiles, setPngFiles] = useState([]); // Add state for pngFiles

  const handleFileUpload = (file, data, pngFiles) => {
    console.log("File uploaded:", file.name); // Log file name
    console.log("Extracted data:", data); // Log extracted data
    console.log("PNG files:", pngFiles); // Log PNG files
    setSelectedFile(file);
    setExtractedData(data);
    setPngFiles(pngFiles); // Set the pngFiles state
    setCurrentPage("preview");
  };

  const handleBackToUpload = () => {
    console.log("Returning to upload page");
    setCurrentPage("upload");
    setSelectedFile(null);
    setExtractedData([]);
    setPngFiles([]); // Reset the pngFiles state
  };

  const handleLogin = () => {
    console.log("Login successful, navigating to upload page");
    setCurrentPage("upload");
  };

  const handleSubmitSuccess = () => {
    console.log("Submission successful, returning to upload page");
    setCurrentPage("upload");
    setSelectedFile(null);
    setExtractedData([]);
    setPngFiles([]);
  };

  return (
    <div className="app-container">
      {currentPage === "login" ? (
        <Login onLogin={handleLogin} />
      ) : currentPage === "upload" ? (
        <FileUpload onFileUpload={handleFileUpload} />
      ) : (
        <PDFPreview 
          file={selectedFile} 
          data={extractedData} 
          pngFiles={pngFiles} 
          onBack={handleBackToUpload} 
          onSubmitSuccess={handleSubmitSuccess} 
        />
      )}
    </div>
  );
}

export default App;
