import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import FileUpload from "./components/FileUpload/FileUpload";
import PDFPreview from "./components/PDFPreview/PDFPreview";
import Login from "./components/Login/Login";
import UploadRecords from "./components/UploadRecords/UploadRecords";
import "./styles/global.css";
import "./styles/shared.css"; // Add the shared styles
import "./components/Menu/Menu.css";

function App() {
  const [state, setState] = useState({
    currentPage: "login",
    selectedFile: null,
    extractedData: [],
    pngFiles: [],
    companyList: [],
    costCenterList: [],
    purposeList: [],
  });

  useEffect(() => {
    const fetchEnumLists = async () => {
      try {
        const response = await fetch("http://10.120.0.132:3001/getAllEnumLists");
        const result = await response.json();
        if (result.data.success === "true") {
          setState((prev) => ({
            ...prev,
            companyList: result.data.companyList || [],
            costCenterList: result.data.costCenterList || [],
            purposeList: result.data.purposeList || [],
          }));
        } else {
          console.error("Failed to fetch enum lists:", result.data.msg);
        }
      } catch (error) {
        console.error("Error fetching enum lists:", error.message);
      }
    };

    fetchEnumLists();
  }, []);

  const navigateTo = (page, reset = false) => {
    setState((prev) => ({
      ...prev,
      currentPage: page,
      ...(reset && { selectedFile: null, extractedData: [], pngFiles: [] }),
    }));
  };

  const handleFileUpload = (file, data, pngFiles, enumLists) => {
    setState((prev) => ({
      ...prev,
      currentPage: "preview",
      selectedFile: file,
      extractedData: data || [],
      pngFiles: pngFiles || [],
      companyList: enumLists.companyList || prev.companyList,
      costCenterList: enumLists.costCenterList || prev.costCenterList,
      purposeList: enumLists.purposeList || prev.purposeList,
    }));
  };

  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route
            path="/"
            element={
              state.currentPage === "login" ? (
                <Login onLogin={() => navigateTo("menu")} />
              ) : state.currentPage === "menu" ? (
                <div className="menu-container">
                  <h2>功能選單</h2>
                  <button
                    onClick={() => navigateTo("upload")}
                    className="menu-button"
                  >
                    上傳資料
                  </button>
                  <button
                    onClick={() => navigateTo("query")}
                    className="menu-button"
                  >
                    查詢已上傳資料
                  </button>
                </div>
              ) : state.currentPage === "upload" ? (
                <FileUpload 
                  onFileUpload={handleFileUpload} 
                  onBack={() => navigateTo("menu")} 
                />
              ) : state.currentPage === "query" ? (
                <UploadRecords onBack={() => navigateTo("menu")} />
              ) : (
                <PDFPreview
                  file={state.selectedFile}
                  data={state.extractedData}
                  pngFiles={state.pngFiles}
                  companyList={state.companyList}
                  costCenterList={state.costCenterList}
                  purposeList={state.purposeList}
                  onBack={() => navigateTo("upload", true)}
                  onSubmitSuccess={() => navigateTo("menu")}
                />
              )
            }
          />
          
          {/* Add route for /claim_form_web */}
          <Route
            path="/claim_form_web"
            element={
              state.currentPage === "login" ? (
                <Login onLogin={() => navigateTo("menu")} />
              ) : state.currentPage === "menu" ? (
                <div className="menu-container">
                  <h2>功能選單</h2>
                  <button
                    onClick={() => navigateTo("upload")}
                    className="menu-button"
                  >
                    上傳資料
                  </button>
                  <button
                    onClick={() => navigateTo("query")}
                    className="menu-button"
                  >
                    查詢已上傳資料
                  </button>
                </div>
              ) : state.currentPage === "upload" ? (
                <FileUpload 
                  onFileUpload={handleFileUpload} 
                  onBack={() => navigateTo("menu")} 
                />
              ) : state.currentPage === "query" ? (
                <UploadRecords onBack={() => navigateTo("menu")} />
              ) : (
                <PDFPreview
                  file={state.selectedFile}
                  data={state.extractedData}
                  pngFiles={state.pngFiles}
                  companyList={state.companyList}
                  costCenterList={state.costCenterList}
                  purposeList={state.purposeList}
                  onBack={() => navigateTo("upload", true)}
                  onSubmitSuccess={() => navigateTo("menu")}
                />
              )
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
