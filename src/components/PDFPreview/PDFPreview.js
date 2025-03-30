import React, { useState, useEffect } from "react";
import "./PDFPreview.css";

function PDFPreview({ file, data, pngFiles, onBack, onSubmitSuccess }) {
  const [pdfData, setPdfData] = useState({
    pages: [],
    currentPage: 1,
  });

  const [extractedData, setExtractedData] = useState(data.map(page => page.text) || []);
  const [sortedPngFiles, setSortedPngFiles] = useState([]); // Add state for sorted pngFiles
  const [confirmedPages, setConfirmedPages] = useState([]); // Track confirmed pages

  useEffect(() => {
    console.log("Received pngFiles:", pngFiles); // Log pngFiles for debugging
    if (!file) {
      return;
    }

    // Ensure pngFiles is an array before sorting
    const sortedFiles = (pngFiles || []).sort((a, b) => {
      const numA = parseInt(a.fileName.match(/page-(\d+)\.jpg/)[1], 10);
      const numB = parseInt(b.fileName.match(/page-(\d+)\.jpg/)[1], 10);
      return numA - numB;
    });

    setPdfData({
      pages: data.map((_, index) => `Page ${index + 1} content`),
      currentPage: 1,
    });

    setSortedPngFiles(sortedFiles);

    // Initialize confirmedPages state with false for each page
    setConfirmedPages(new Array(data.length).fill(false));

    // Get the current date
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // Months are 0-indexed

    // Preprocess extractedData to replace '---', format 金額, fill empty 費用項目, and update 日期
    const processedData = data.map((pageData) =>
      pageData.text.map((item, index, array) => {
        const updatedItem = { ...item };

        // Replace '---' with the nearest non-empty field above
        for (const key in updatedItem) {
          if (updatedItem[key] === "---") {
            for (let i = index - 1; i >= 0; i--) {
              if (array[i][key]?.trim() && array[i][key] !== "---") {
                updatedItem[key] = array[i][key];
                break;
              }
            }
          }
        }

        // Fill empty 費用項目 with the nearest non-empty value above
        if ("費用項目" in updatedItem && !updatedItem.費用項目.trim()) {
          for (let i = index - 1; i >= 0; i--) {
            if (array[i].費用項目?.trim()) {
              updatedItem.費用項目 = array[i].費用項目;
              break;
            }
          }
        }

        // Remove decimal point if no numbers after it for 金額
        if ("金額" in updatedItem && /^[0-9]+\.0*$/.test(updatedItem.金額)) {
          updatedItem.金額 = parseInt(updatedItem.金額, 10).toString();
        }

        // Update 日期 if the year is ????
        if ("日期" in updatedItem && updatedItem.日期.includes("????")) {
          const [_, month, day] = updatedItem.日期.split("-");
          const recordMonth = parseInt(month, 10);

          if (recordMonth < currentMonth) {
            updatedItem.日期 = `${currentYear}-${month}-${day}`;
          } else {
            updatedItem.日期 = `${currentYear - 1}-${month}-${day}`;
          }
        }

        return updatedItem;
      })
    );

    setExtractedData(processedData);
  }, [file, data, pngFiles]);

  const currentPageData = extractedData[pdfData.currentPage - 1] || [];

  const handleInputChange = (e, index) => {
    const { name, value } = e.target;
    setExtractedData((prevData) =>
      prevData.map((data, pageIndex) =>
        pageIndex === pdfData.currentPage - 1
          ? data.map((item, itemIndex) => {
              if (itemIndex === index) {
                let updatedValue = value;

                // If the value is '---' or empty, find the nearest non-empty field above
                if (value === "---" || (name === "費用項目" && !value.trim())) {
                  for (let i = itemIndex - 1; i >= 0; i--) {
                    if (data[i][name]?.trim() && data[i][name] !== "---") {
                      updatedValue = data[i][name];
                      break;
                    }
                  }
                }

                return { ...item, [name]: updatedValue };
              }
              return item;
            })
          : data
      )
    );
  };

  const handleAddRow = () => {
    setExtractedData((prevData) =>
      prevData.map((data, pageIndex) =>
        pageIndex === pdfData.currentPage - 1
          ? [...data, { 費用項目: "", 工程編號: "", 金額: "" }] // Ensure all fields are initialized
          : data
      )
    );
  };

  const handleRemoveRow = (index) => {
    setExtractedData((prevData) =>
      prevData.map((data, pageIndex) =>
        pageIndex === pdfData.currentPage - 1
          ? data.filter((_, itemIndex) => itemIndex !== index)
          : data
      )
    );
  };

  const isFieldHighlighted = (value, fieldName) => {
    // Skip highlighting for 費用項目
    if (fieldName === "費用項目") {
      return false;
    }
    return !value || value === "---" || value.includes("?") || value.includes("---");
  };

  const validateData = () => {
    console.log("Validating extracted data:", extractedData); // Log extracted data
    for (const pageData of extractedData) {
      for (const item of pageData) {
        // Check for invalid values in required fields
        if (
          ("工程編號" in item && (!item.工程編號?.trim() || item.工程編號.includes("---") || item.工程編號.includes("?") )) ||
          ("金額" in item && (!item.金額?.trim() || item.金額.includes("---") || item.金額.includes("?") )) ||
          ("員工編號" in item && (!/^\d{6}$/.test(item.員工編號) || item.員工編號.includes("---") || item.員工編號.includes("?") )) ||
          ("日期" in item && (!item.日期?.trim() || item.日期.includes("?") )) // Add validation for 日期
        ) {
          console.error("Validation failed for item:", item); // Log invalid item
          alert("請修正標記的欄位。欄位不能包含 '---'、'?' 或是空白。");
          return false;
        }
      }
    }
    console.log("Validation passed");
    return true;
  };

  const handleSubmit = () => {
    console.log("Submitting data...");
    if (validateData()) {
      console.log("Data submitted successfully:", extractedData); // Log submitted data
      alert("資料遞交成功!");
      onSubmitSuccess();
    }
  };

  const handleToggleConfirmPage = () => {
    if (!confirmedPages[pdfData.currentPage - 1]) {
      // Validate data before confirming the page
      if (!validateData()) {
        return; // Stop if validation fails
      }
    }

    setConfirmedPages((prev) =>
      prev.map((confirmed, index) =>
        index === pdfData.currentPage - 1 ? !confirmed : confirmed
      )
    );

    if (confirmedPages[pdfData.currentPage - 1]) {
      alert("Page confirmation canceled!");
    }
  };

  const allPagesConfirmed = confirmedPages.every((confirmed) => confirmed);

  const handlePageClick = (pageIndex) => {
    setPdfData((prev) => ({
      ...prev,
      currentPage: pageIndex + 1,
    }));
  };

  return (
    <div className="preview-container">
      <div className="preview-header">
        <button onClick={onBack} className="back-button">
          返回
        </button>
      </div>
      <div className="preview-layout">
        {/* Page Widget Section */}
        <div className="page-widget">
          <h3 className="widget-title">頁數</h3>
          <ul className="page-list">
            {pdfData.pages.map((_, index) => (
              <li
                key={index}
                className={`page-item ${
                  pdfData.currentPage === index + 1 ? "active" : ""
                } ${confirmedPages[index] ? "confirmed" : ""}`}
                onClick={() => handlePageClick(index)}
              >
                第 {index + 1} 頁 {confirmedPages[index] ? "✔" : ""}
              </li>
            ))}
          </ul>
        </div>

        {/* PDF Preview Section */}
        <div className="pdf-section">
          <h2 className="section-title">預覽</h2>
          <div className="pdf-controls">
            <button
              className="control-button"
              onClick={() =>
                setPdfData((prev) => ({
                  ...prev,
                  currentPage: Math.max(1, prev.currentPage - 1),
                }))
              }
            >
              上一頁
            </button>
            <span>第 {pdfData.currentPage} 頁</span>
            <button
              className="control-button"
              onClick={() =>
                setPdfData((prev) => ({
                  ...prev,
                  currentPage: Math.min(
                    prev.pages.length,
                    prev.currentPage + 1
                  ),
                }))
              }
            >
              下一頁
            </button>
          </div>
          <div className="pdf-viewer">
            <div className="pdf-placeholder">
              {sortedPngFiles && sortedPngFiles.length > 0 ? (
                <img
                  src={`data:image/png;base64,${sortedPngFiles[pdfData.currentPage - 1].base64data}`}
                  alt={`Page ${pdfData.currentPage}`}
                  className="pdf-image"
                />
              ) : (
                <p>未選擇 PDF</p>
              )}
            </div>
          </div>
        </div>

        {/* Extracted Data Section */}
        <div className="data-section">
          <h2 className="section-title">擷取的資料</h2>
          <div className="data-grid">
            {currentPageData.map((item, index) => (
              item.ID !== undefined || item["日期"] !== undefined || item["員工編號"] !== undefined || item["編號"] !== undefined ? (
                <div key={index} className="data-item">
                  <label>{Object.keys(item)[0]}:</label>
                  <input
                    type="text"
                    name={Object.keys(item)[0]}
                    value={Object.values(item)[0]}
                    onChange={(e) => handleInputChange(e, index)}
                    className={isFieldHighlighted(Object.values(item)[0], Object.keys(item)[0]) ? "highlighted-field" : ""}
                    autoComplete="off"
                  />
                </div>
              ) : null
            ))}
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>費用項目</th>
                <th>工程編號</th>
                <th>金額</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {currentPageData.map((item, index) => (
                item.費用項目 !== undefined && item.工程編號 !== undefined && item.金額 !== undefined ? (
                  <tr key={index}>
                    <td className={isFieldHighlighted(item.費用項目, "費用項目") ? "highlighted-cell" : ""}>
                      <input
                        type="text"
                        name="費用項目"
                        value={item.費用項目}
                        onChange={(e) => handleInputChange(e, index)}
                        className={isFieldHighlighted(item.費用項目, "費用項目") ? "highlighted-field" : ""}
                        autoComplete="off"
                      />
                    </td>
                    <td className={isFieldHighlighted(item.工程編號, "工程編號") ? "highlighted-cell" : ""}>
                      <input
                        type="text"
                        name="工程編號"
                        value={item.工程編號}
                        onChange={(e) => handleInputChange(e, index)}
                        className={isFieldHighlighted(item.工程編號, "工程編號") ? "highlighted-field" : ""}
                        autoComplete="off"
                      />
                    </td>
                    <td className={isFieldHighlighted(item.金額, "金額") ? "highlighted-cell" : ""}>
                      <input
                        type="text"
                        name="金額"
                        value={item.金額}
                        onChange={(e) => handleInputChange(e, index)}
                        className={isFieldHighlighted(item.金額, "金額") ? "highlighted-field" : ""}
                        autoComplete="off"
                      />
                    </td>
                    <td>
                      <button onClick={() => handleRemoveRow(index)} className="remove-row-button">
                        移除
                      </button>
                    </td>
                  </tr>
                ) : null
              ))}
            </tbody>
          </table>
          <div className="action-buttons">
            <button onClick={handleAddRow} className="add-row-button">
              新增列
            </button>
            <button
              onClick={handleToggleConfirmPage}
              className="confirm-page-button"
            >
              {confirmedPages[pdfData.currentPage - 1] ? "取消確認" : "確認此頁"}
            </button>
            {allPagesConfirmed && ( // Show Submit button only if all pages are confirmed
              <button
                onClick={handleSubmit}
                className="submit-button"
              >
                提交
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PDFPreview;
