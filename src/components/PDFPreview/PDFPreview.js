import React, { useState, useEffect } from "react";
import { FaGripVertical } from "react-icons/fa"; // Import a drag handle icon
import "./PDFPreview.css";

function PDFPreview({ file, data = [], pngFiles, companyList = [], costCenterList = [], purposeList = [], onBack, onSubmitSuccess }) {
  const [pdfData, setPdfData] = useState({
    pages: [],
    currentPage: 1,
  });

  const [extractedData, setExtractedData] = useState(data.map(page => page.text) || []);
  const [sortedPngFiles, setSortedPngFiles] = useState([]); // Add state for sorted pngFiles
  const [confirmedPages, setConfirmedPages] = useState([]); // Track confirmed pages
  const [draggedRowIndex, setDraggedRowIndex] = useState(null);
  const [tooltip, setTooltip] = useState({ visible: false, message: "", position: { x: 0, y: 0 } });
  const [totalAmount, setTotalAmount] = useState(0); // Add state for total amount

  const companies = companyList.map((item) => item.Name); // Map to names
  const costCenters = costCenterList.map((item) => item.Name); // Map to names
  const purposes = purposeList.map((item) => item.Name); // Map to names

  const resolveYear = (dateString) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // Months are 0-based
    
    // Extract month and day from the date string
    // Handle both MM/DD and MM-DD formats
    const separator = dateString.includes('/') ? '/' : '-';
    let [month, day] = dateString.split(separator).map(Number);
    
    // Default to day 1 if day is not provided or invalid
    day = isNaN(day) ? 1 : day;
    
    // If the current month is less than the date's month, use previous year
    // Otherwise use current year
    const year = currentMonth < month ? currentYear - 1 : currentYear;
    
    // Format as YYYY-MM-DD with zero padding
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  };
  
  // Function to standardize the date format from dd/mm/yyyy to yyyy-mm-dd
  const standardizeDateFormat = (dateString) => {
    if (!dateString) return "";

    // Split the date string into day, month, and year
    const parts = dateString.split("/");
    if (parts.length !== 3) {
      console.error("Invalid date format:", dateString);
      return ""; // Return an empty string for invalid formats
    }

    let [day, month, year] = parts;

    // Resolve '????' year based on the current date
    if (year === "????") {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1; // Months are 0-based

      // Use the previous year if the current month is less than the provided month
      year = currentMonth < parseInt(month, 10) ? currentYear - 1 : currentYear;
    }

    // Ensure all parts are valid and return the date in yyyy-mm-dd format
    if (!day || !month || !year) {
      console.error("Invalid date parts:", { day, month, year });
      return ""; // Return an empty string for invalid parts
    }

    return `${year.toString().padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

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

    // Preprocess extractedData to separate top-level fields and text array
    const processedData = data.map((pageData) => {
      const topLevelFields = {};
      const textArray = [];

      // Check if pageData is an array of objects
      const items = Array.isArray(pageData) ? pageData : pageData.text;

      if (Array.isArray(items)) {
        items.forEach((item) => {
          const processedItem = { ...item };

          // Extract top-level fields (員工編號, 日期, 編號)
          if (item.員工編號) {
            topLevelFields.員工編號 = item.員工編號;
          }
          if (item.日期) {
            topLevelFields.日期 = standardizeDateFormat(item.日期); // Standardize date format
          }
          if (item.編號) {
            topLevelFields.編號 = item.編號;

            // Automatically select company based on 編號
            const firstChar = item.編號.charAt(0).toUpperCase();
            if (!/^[A-Z]$/.test(firstChar) || firstChar === "L") {
              topLevelFields.公司 = "LIK ON SECURITY LTD";
            } else if (firstChar === "H") {
              topLevelFields.公司 = "HOMELY SERVICE LTD";
            }
          }

          // Skip top-level fields from being added to the text array
          if (!item.員工編號 && !item.日期 && !item.編號) {
            // Convert date format to YYYY-MM-DD if present
            if (processedItem.CostingDate) {
              processedItem.CostingDate = standardizeDateFormat(processedItem.CostingDate);
            }

            // Check for problematic 工程編號 based on Status and CostingDate
            const today = new Date();
            if (
              processedItem.Status === "已凍結" &&
              processedItem.CostingDate &&
              new Date(processedItem.CostingDate) < new Date(today.setMonth(today.getMonth() - 3))
            ) {
              processedItem.isProblematic = true;
            } else if (processedItem.Status === "不存在") {
              processedItem.isProblematic = true;
            } else {
              processedItem.isProblematic = false;
            }

            textArray.push(processedItem);
          }
        });
      } else {
        console.error("pageData is not an array or does not contain a valid text property:", pageData);
      }

      return {
        ...topLevelFields,
        text: textArray.map((item, index, array) => {
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

          // Automatically select costCenter and purpose based on 工程編號
          if ("工程編號" in updatedItem) {
            const projectCode = updatedItem.工程編號.toLowerCase(); // Convert to lowercase for case-insensitive matching
            if (/er|ar|amj|j/.test(projectCode)) {
              updatedItem.costCenter = "ELV";
              updatedItem.purpose = "ELV";
            } else if (/baj/.test(projectCode)) {
              updatedItem.costCenter = "Project";
              updatedItem.purpose = "Project";
            } else if (/admin/.test(projectCode)) {
              updatedItem.costCenter = "Admin";
              updatedItem.purpose = "Admin";
            } else if (/mas/.test(projectCode) && /hym/.test(projectCode)) {
              updatedItem.costCenter = "Contract";
              updatedItem.purpose = "Contract";
            } else if (/bdm/.test(projectCode) && /pang/.test(projectCode)) {
              updatedItem.costCenter = "Data Centre";
              updatedItem.purpose = "Data Centre";
            } else if (/main/.test(projectCode)) {
              updatedItem.costCenter = "Other";
              updatedItem.purpose = "Other";
            }
          }

          return updatedItem;
        }),
      };
    });

    console.log("Processed extracted data before filling:", processedData); // Log processed data before filling
    setExtractedData(processedData);
  }, [file, data, pngFiles]);

  useEffect(() => {
    // Calculate the total amount whenever the extractedData or currentPage changes
    const currentPageData = extractedData[pdfData.currentPage - 1]?.text || [];
    const total = currentPageData.reduce((sum, row) => {
      const amount = parseFloat(row.金額) || 0;
      return sum + amount;
    }, 0);
    setTotalAmount(total);
  }, [extractedData, pdfData.currentPage]);

  const currentPageData = extractedData[pdfData.currentPage - 1]?.text?.filter(
    (row) => row.費用項目 !== undefined && row.工程編號 !== undefined && row.金額 !== undefined
  ) || []; // Ensure currentPageData is always an array

  const currentPageFields = extractedData[pdfData.currentPage - 1] || {};

  const handleInputChange = (e, index) => {
    const { name, value } = e.target;

    setExtractedData((prevData) =>
      prevData.map((data, pageIndex) =>
        pageIndex === pdfData.currentPage - 1
          ? {
              ...data,
              text: data.text.map((item, itemIndex) => {
                if (itemIndex === index) {
                  const updatedItem = { ...item, [name]: value };

                  // If the updated field is 工程編號, make an API call to check frozen status
                  if (name === "工程編號" && value.trim()) {
                    checkFrozenStatus(value, index).then((response) => {
                      setExtractedData((prevData) =>
                        prevData.map((data, pageIndex) =>
                          pageIndex === pdfData.currentPage - 1
                            ? {
                                ...data,
                                text: data.text.map((innerItem, innerIndex) =>
                                  innerIndex === index
                                    ? {
                                        ...innerItem,
                                        Status: response.Status,
                                        isProblematic: response.isProblematic,
                                        highlightColor: response.Status === "不存在" ? "red" : "default",
                                      }
                                    : innerItem
                                ),
                              }
                            : data
                        )
                      );
                    });
                  }

                  return updatedItem;
                }
                return item;
              }),
            }
          : data
      )
    );
  };

  const checkFrozenStatus = async (projectCode, index) => {
    try {
      const response = await fetch(`http://10.120.0.132:3001/checkFrozenStatus`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectCode }),
      });

      if (!response.ok) {
        console.error("Failed to fetch frozen status:", response.statusText);
        return { Status: "未知", isProblematic: true }; // Default fallback
      }

      const data = await response.json();
      console.log("Frozen status response:", data); // Debugging log

      // Update the highlight status based on the response
      const isProblematic = data.Status === "已凍結" || data.Status === "不存在";

      // Show tooltip if the status is "不存在"
      if (data.Status === "不存在") {
        const inputElement = document.querySelector(`#工程編號-${index}`);
        if (inputElement) {
          const rect = inputElement.getBoundingClientRect();
          console.log("Tooltip position:", rect); // Debugging log
          setTooltip({
            visible: true,
            message: "項目不存在",
            position: { x: rect.left + window.scrollX, y: rect.top + window.scrollY - 30 },
          });

          // Set highlight color to red initially
          setExtractedData((prevData) =>
            prevData.map((data, pageIndex) =>
              pageIndex === pdfData.currentPage - 1
                ? {
                    ...data,
                    text: data.text.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, highlightColor: "red" }
                        : item
                    ),
                  }
                : data
            )
          );

          // Hide tooltip after 1 second and change highlight color to yellow
          setTimeout(() => {
            setTooltip((prev) => ({ ...prev, visible: false }));
            setExtractedData((prevData) =>
              prevData.map((data, pageIndex) =>
                pageIndex === pdfData.currentPage - 1
                  ? {
                      ...data,
                      text: data.text.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, highlightColor: "yellow" } // Change highlight color to yellow
                          : item
                      ),
                    }
                  : data
              )
            );
          }, 1000);
        }
      }

      return {
        Status: data.Status || "未知",
        isProblematic,
      };
    } catch (error) {
      console.error("Error checking frozen status:", error);
      return { Status: "未知", isProblematic: true }; // Default fallback
    }
  };

  const handleDropdownChange = (e, field, index) => {
    const { value } = e.target;
    setExtractedData((prevData) =>
      prevData.map((data, pageIndex) =>
        pageIndex === pdfData.currentPage - 1
          ? {
              ...data,
              text: data.text.map((item, itemIndex) =>
                itemIndex === index ? { ...item, [field]: value } : item
              ),
            }
          : data
      )
    );
  };

  const handleAddRow = () => {
    setExtractedData((prevData) =>
      prevData.map((data, pageIndex) =>
        pageIndex === pdfData.currentPage - 1
          ? {
              ...data,
              text: [...data.text, { 費用項目: "", 工程編號: "", 金額: "" }], // Ensure all fields are initialized
            }
          : data
      )
    );
  };

  const handleRemoveRow = (index) => {
    setExtractedData((prevData) =>
      prevData.map((data, pageIndex) =>
        pageIndex === pdfData.currentPage - 1
          ? {
              ...data,
              text: data.text.filter((_, itemIndex) => itemIndex !== index),
            }
          : data
      )
    );
  };

  const handleMoveRow = (index, direction) => {
    setExtractedData((prevData) =>
      prevData.map((data, pageIndex) => {
        if (pageIndex === pdfData.currentPage - 1) {
          const newData = [...data.text];
          const targetIndex = direction === "up" ? index - 1 : index + 1;

          // Ensure the target index is within bounds
          if (targetIndex >= 0 && targetIndex < newData.length) {
            // Swap the rows
            [newData[index], newData[targetIndex]] = [newData[targetIndex], newData[index]];
          }

          return { ...data, text: newData };
        }
        return data;
      })
    );
  };

  const handleDragStart = (index, e) => {
    setDraggedRowIndex(index); // 设置被拖动的行索引
    e.dataTransfer.effectAllowed = "move"; // 设置拖动效果
  };

  const handleDragEnd = (e) => {
    setDraggedRowIndex(null); // 清理拖动状态
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // 阻止默认行为以允许拖放
    e.dataTransfer.dropEffect = "move"; // 设置拖放效果
  };

  const handleDrop = (index) => {
    setExtractedData((prevData) =>
      prevData.map((data, pageIndex) => {
        if (pageIndex === pdfData.currentPage - 1) {
          const newData = [...data.text];
          const draggedRow = newData.splice(draggedRowIndex, 1)[0]; // 移除被拖动的行
          newData.splice(index, 0, draggedRow); // 插入到目标位置
          return { ...data, text: newData };
        }
        return data;
      })
    );
    setDraggedRowIndex(null); // 清理拖动状态
  };

  const isFieldHighlighted = (value, fieldName, isProblematic) => {
    // Highlight only the 工程編號 column if problematic
    if (fieldName === "工程編號" && isProblematic) {
      return true;
    }
    // Skip highlighting for 費用項目
    if (fieldName === "費用項目") {
      return false;
    }
    // Highlight fields with invalid values
    return !value || value === "---" || value.includes("?") || value.includes("---");
  };

  const validateData = () => {
    console.log("Validating extracted data:", extractedData); // Log extracted data
    for (const pageData of extractedData) {
      for (const item of pageData.text) {
        const today = new Date();
        const threeMonthsAgo = new Date(today.setMonth(today.getMonth() - 3));

        // Check for invalid values in required fields
        if (
          ("工程編號" in item && (!item.工程編號?.trim() || item.工程編號.includes("---") || item.工程編號.includes("?"))) ||
          ("金額" in item && (!item.金額?.trim() || item.金額.includes("---") || item.金額.includes("?"))) ||
          ("員工編號" in pageData && (!/^\d{6}$/.test(pageData.員工編號) || pageData.員工編號.includes("---") || pageData.員工編號.includes("?"))) ||
          ("日期" in pageData && (!pageData.日期?.trim() || pageData.日期.includes("?"))) || // Add validation for 日期
          (item.Status === "已凍結" && item.CostingDate && new Date(item.CostingDate) < threeMonthsAgo) || // Highlight if frozen and older than 3 months
          (item.Status === "不存在") || // Highlight if status is "不存在"
          (!item.costCenter?.trim()) || // Ensure costCenter is not empty
          (!item.purpose?.trim()) // Ensure purpose is not empty
        ) {
          if (!item.costCenter?.trim() || !item.purpose?.trim()) {
            alert("用途與成本中心不能為空，請選擇一個項目。");
          } else {
            alert("請修正標記的欄位。欄位不能包含 '---'、'?' 或是空白、同時請確認工程編號沒有過期超過三個月。");
          }
          console.error("Validation failed for item:", item); // Log invalid item
          return false;
        }
      }
    }
    console.log("Validation passed");
    return true;
  };

  const fetchErrorPDF = async (submissionId) => {
    try {
      // Make a GET request to fetch the error PDF
      const response = await fetch(`http://10.120.0.132:3001/failedSubmission/${submissionId}`, {
        method: 'GET',
      });
      
      if (!response.ok) {
        console.error('Failed to fetch error PDF:', response.statusText);
        return null;
      }
      
      // Get the PDF blob from the response
      const pdfBlob = await response.blob();
      return pdfBlob;
    } catch (error) {
      console.error('Error fetching error PDF:', error);
      return null;
    }
  };

  const submitToApi = async () => {
    try {
      // Arrays to track results
      const successfulPages = [];
      const failedPages = [];
      
      // Process each page
      for (let pageIndex = 0; pageIndex < extractedData.length; pageIndex++) {
        const pageData = extractedData[pageIndex];
        const pageNumber = pageIndex + 1;

        // Debugging: Log pageData for each page
        console.log(`Processing page ${pageNumber}:`, pageData);

        const formattedData = {
          PettyCashNo: pageData.編號 || "", // Use 編號 as PettyCashNo
          StaffNo: pageData.員工編號 || "", // Use 員工編號 as StaffNo
          RequestedOn: pageData.日期 || "", // Use 日期 as RequestedOn
          LikOnCompanyId: companyList.find((c) => c.Name === pageData.公司)?.Id || "", // Map 公司 to LikOnCompanyId
          PettyCashItemList: Array.isArray(pageData.text)
            ? pageData.text.map((item) => ({
                ItemDesc: item.費用項目 || "",
                SubTatal: parseFloat(item.金額) || 0,
                PettyCashCostCenterId: costCenterList.find((c) => c.Name === item.costCenter)?.Id || 20, // Default to 20
                PettyCashPurposeId: purposeList.find((p) => p.Name === item.purpose)?.Id || 20,       // Default to 20
                JobNo: item.工程編號 || "",
                ContractNo: item.ContractNo || "",
              }))
            : [],
        };

        // Debugging: Log formattedData for each page
        console.log(`Formatted data for page ${pageNumber}:`, formattedData);

        try {
          const response = await fetch("http://10.120.0.132:3001/uploadFinalData", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(formattedData),
          });

          if (!response.ok) {
            const responseData = await response.json();
            console.error(`Failed to submit data for page ${pageNumber}:`, responseData);
            
            // Add to failed pages
            failedPages.push({
              pageNumber,
              pettyCashNo: pageData.編號 || `Page ${pageNumber}`,
              error: responseData.message || 'Unknown error',
              submissionId: responseData.submissionId,
              errorList: responseData.errList || []
            });
            
            // Continue to the next page instead of returning
            continue;
          }

          const result = await response.json();
          console.log(`Page ${pageNumber} submitted successfully:`, result);
          
          // Add to successful pages
          successfulPages.push({
            pageNumber,
            pettyCashNo: pageData.編號 || `Page ${pageNumber}`,
            warningList: result.errList || []
          });
          
          // Display any warnings if available
          if (result.errList && result.errList.length > 0) {
            console.warn(`Warnings for page ${pageNumber}:`, result.errList);
          }
        } catch (error) {
          console.error(`Error submitting page ${pageNumber}:`, error);
          
          // Add to failed pages
          failedPages.push({
            pageNumber,
            pettyCashNo: pageData.編號 || `Page ${pageNumber}`,
            error: error.message || 'Error during submission'
          });
          
          // Continue to the next page
          continue;
        }
      }

      // After processing all pages, show summary
      if (failedPages.length === 0) {
        // All pages were successful
        alert("所有頁面資料已成功遞交!");
        onSubmitSuccess();
      } else if (successfulPages.length === 0) {
        // All pages failed
        alert("所有頁面遞交失敗!");
        
        // Display error details for the first failed page
        const firstFailedPage = failedPages[0];
        if (firstFailedPage.submissionId) {
          const errorPdfBlob = await fetchErrorPDF(firstFailedPage.submissionId);
          if (errorPdfBlob) {
            const pdfUrl = URL.createObjectURL(errorPdfBlob);
            window.open(pdfUrl, "_blank");
          }
        }
        
        // Display summary of all errors
        const errorSummary = failedPages.map(page => 
          `${page.pettyCashNo}: ${page.error}`
        ).join('\n');
        alert(`錯誤摘要:\n${errorSummary}`);
      } else {
        // Some pages succeeded, some failed
        const successCount = successfulPages.length;
        const failCount = failedPages.length;
        const totalCount = extractedData.length;
        
        alert(`處理完成: ${successCount}/${totalCount} 頁成功, ${failCount}/${totalCount} 頁失敗`);
        
        // If some pages failed, show error details
        if (failedPages.length > 0) {
          const errorSummary = failedPages.map(page => 
            `${page.pettyCashNo}: ${page.error}`
          ).join('\n');
          alert(`失敗頁面:\n${errorSummary}`);
          
          // Try to fetch and display the first error PDF
          const firstFailedPage = failedPages[0];
          if (firstFailedPage.submissionId) {
            const errorPdfBlob = await fetchErrorPDF(firstFailedPage.submissionId);
            if (errorPdfBlob) {
              const pdfUrl = URL.createObjectURL(errorPdfBlob);
              window.open(pdfUrl, "_blank");
            }
          }
        }
        
        // If there were successful pages, navigate back (can be modified based on requirements)
        if (successfulPages.length > 0) {
          onSubmitSuccess();
        }
      }
    } catch (error) {
      console.error("Error in overall submission process:", error);
      alert("提交過程中發生錯誤，請稍後再試。");
    }
  };

  const handleSubmit = () => {
    console.log("Submitting data...");
    if (validateData()) {
      submitToApi(); // Call the new function
    }
  };

  const handleToggleConfirmPage = () => {
    const currentPageIndex = pdfData.currentPage - 1;

    // Validate only the current page
    const currentPageData = extractedData[currentPageIndex]?.text || [];
    const today = new Date();
    const threeMonthsAgo = new Date(today.setMonth(today.getMonth() - 3));

    for (const item of currentPageData) {
      if (
        ("工程編號" in item && (!item.工程編號?.trim() || item.工程編號.includes("---") || item.工程編號.includes("?"))) ||
        ("金額" in item && (!item.金額?.trim() || item.金額.includes("---") || item.金額.includes("?"))) ||
        (!item.costCenter?.trim()) || // Ensure costCenter is not empty
        (!item.purpose?.trim()) || // Ensure purpose is not empty
        (item.Status === "已凍結" && item.CostingDate && new Date(item.CostingDate) < threeMonthsAgo) || // Highlight if frozen and older than 3 months
        (item.Status === "不存在") // Highlight if status is "不存在"
      ) {
        if (!item.costCenter?.trim() || !item.purpose?.trim()) {
          alert("用途與成本中心不能為空，請選擇一個項目。");
        } else {
          alert("請修正標記的欄位。欄位不能包含 '---'、'?' 或是空白、同時請確認工程編號沒有過期超過三個月。");
        }
        console.error("Validation failed for item:", item); // Log invalid item
        return; // Stop if validation fails
      }
    }

    // Toggle confirmation for the current page
    setConfirmedPages((prev) =>
      prev.map((confirmed, index) =>
        index === currentPageIndex ? !confirmed : confirmed
      )
    );

    if (confirmedPages[currentPageIndex]) {
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

  const handleDateChange = (e) => {
    const value = e.target.value;
    
    // Just use the value as is since it's already in YYYY-MM-DD format
    setExtractedData((prevData) =>
      prevData.map((page, index) =>
        index === pdfData.currentPage - 1
          ? { ...page, 日期: value }
          : page
      )
    );
  };

  return (
    <div className="page-container">
      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="tooltip"
          style={{
            position: "absolute",
            left: tooltip.position.x,
            top: tooltip.position.y,
            backgroundColor: "black",
            color: "white",
            padding: "5px 10px",
            borderRadius: "4px",
            fontSize: "12px",
            zIndex: 1000,
          }}
        >
          {tooltip.message}
        </div>
      )}

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

      {/* Preview Container */}
      <div className="preview-container">
        <div className="page-header">
          <button onClick={onBack} className="back-button">
            返回
          </button>
          <h2 className="page-title">預覽編輯</h2>
        </div>
        <div className="preview-layout">
          {/* Main Content Section */}
          <div className="main-content">
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
              <div className="form-group">
                <label htmlFor="companyDropdown">公司</label>
                <select
                  id="companyDropdown"
                  className="dropdown"
                  value={currentPageFields.公司 || ""} // Bind the selected value
                  onChange={(e) =>
                    setExtractedData((prevData) =>
                      prevData.map((page, index) =>
                        index === pdfData.currentPage - 1
                          ? { ...page, 公司: e.target.value }
                          : page
                      )
                    )
                  }
                  disabled={confirmedPages[pdfData.currentPage - 1]} // Disable if page is confirmed
                >
                  <option value="">選擇公司</option>
                  {companies.map((company, idx) => (
                    <option key={idx} value={company}>
                      {company}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="employeeId">員工編號</label>
                <input
                  type="text"
                  id="employeeId"
                  value={currentPageFields.員工編號 || ""}
                  onChange={(e) =>
                    setExtractedData((prevData) =>
                      prevData.map((page, index) =>
                        index === pdfData.currentPage - 1
                          ? { ...page, 員工編號: e.target.value }
                          : page
                      )
                    )
                  }
                  className="input-field"
                  autoComplete="off"
                  disabled={confirmedPages[pdfData.currentPage - 1]} // Disable if page is confirmed
                />
              </div>
              <div className="form-group">
                <label htmlFor="date">日期</label>
                <input
                  type="date"
                  id="date"
                  value={currentPageFields.日期 || ""}
                  onChange={handleDateChange}
                  className="input-field"
                  autoComplete="off"
                  disabled={confirmedPages[pdfData.currentPage - 1]} // Disable if page is confirmed
                />
              </div>
              <div className="form-group">
                <label htmlFor="identifier">編號</label>
                <input
                  type="text"
                  id="identifier"
                  value={currentPageFields.編號 || ""}
                  onChange={(e) =>
                    setExtractedData((prevData) =>
                      prevData.map((page, index) =>
                        index === pdfData.currentPage - 1
                          ? { ...page, 編號: e.target.value }
                          : page
                      )
                    )
                  }
                  className="input-field"
                  autoComplete="off"
                  disabled={confirmedPages[pdfData.currentPage - 1]} // Disable if page is confirmed
                />
              </div>
              {/* Add a wrapper div for the table to enable horizontal scrolling */}
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>拖曳</th>
                      <th>費用項目</th>
                      <th>工程編號</th>
                      <th>金額</th>
                      <th>成本中心</th>
                      <th>用途</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPageData.map((item, index) => (
                      <tr
                        key={index}
                        draggable={!confirmedPages[pdfData.currentPage - 1]} // Disable dragging if page is confirmed
                        onDragStart={(e) => handleDragStart(index, e)}
                        onDragOver={(e) => handleDragOver(e)}
                        onDrop={() => handleDrop(index)}
                        onDragEnd={(e) => handleDragEnd(e)}
                        className={item.isProblematic ? "problematic-row" : ""}
                      >
                        <td>
                          <span className="drag-handle">
                            <FaGripVertical />
                          </span>
                        </td>
                        <td
                          className={isFieldHighlighted(item.費用項目, "費用項目", item.isProblematic) ? "highlighted-cell" : ""}
                        >
                          <input
                            type="text"
                            name="費用項目"
                            value={item.費用項目 || ""}
                            onChange={(e) => handleInputChange(e, index)}
                            autoComplete="off"
                            className={`input-field ${item.highlightColor === "red" ? "highlighted-field-red" : item.highlightColor === "yellow" ? "highlighted-field-yellow" : ""}`}
                            disabled={confirmedPages[pdfData.currentPage - 1]} // Disable if page is confirmed
                          />
                        </td>
                        <td
                          className={isFieldHighlighted(item.工程編號, "工程編號", item.isProblematic) ? "highlighted-cell" : ""}
                        >
                          <input
                            type="text"
                            id={`工程編號-${index}`}
                            name="工程編號"
                            value={item.工程編號 || ""}
                            onChange={(e) => handleInputChange(e, index)}
                            autoComplete="off"
                            className={`input-field ${item.highlightColor === "red" ? "highlighted-field-red" : item.highlightColor === "yellow" ? "highlighted-field-yellow" : ""}`}
                            disabled={confirmedPages[pdfData.currentPage - 1]} // Disable if page is confirmed
                          />
                        </td>
                        <td
                          className={isFieldHighlighted(item.金額, "金額", item.isProblematic) ? "highlighted-cell" : ""}
                        >
                          <input
                            type="text"
                            name="金額"
                            value={item.金額 || ""}
                            onChange={(e) => handleInputChange(e, index)}
                            autoComplete="off"
                            className={`input-field ${isFieldHighlighted(item.金額, "金額", item.isProblematic) ? "highlighted-field" : ""}`}
                            disabled={confirmedPages[pdfData.currentPage - 1]} // Disable if page is confirmed
                          />
                        </td>
                        <td>
                          <select
                            value={item.costCenter || ""}
                            onChange={(e) => handleDropdownChange(e, "costCenter", index)}
                            className="dropdown"
                            disabled={confirmedPages[pdfData.currentPage - 1]} // Disable if page is confirmed
                          >
                            <option value="">選擇成本中心</option>
                            {costCenters.map((center, idx) => (
                              <option key={idx} value={center}>
                                {center}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            value={item.purpose || ""}
                            onChange={(e) => handleDropdownChange(e, "purpose", index)}
                            className="dropdown"
                            disabled={confirmedPages[pdfData.currentPage - 1]} // Disable if page is confirmed
                          >
                            <option value="">選擇用途</option>
                            {purposes.map((purpose, idx) => (
                              <option key={idx} value={purpose}>
                                {purpose}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <button
                            onClick={() => handleRemoveRow(index)}
                            className="remove-row-button"
                            disabled={confirmedPages[pdfData.currentPage - 1]} // Disable if page is confirmed
                          >
                            移除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Total Amount Section */}
              <div className="total-amount">
                <strong>總金額：</strong> {totalAmount.toFixed(2)} 元
              </div>
              <div className="action-buttons">
                <button
                  onClick={handleAddRow}
                  className="action-button"
                  disabled={confirmedPages[pdfData.currentPage - 1]} // Disable if page is confirmed
                >
                  新增列
                </button>
                <button
                  onClick={handleToggleConfirmPage}
                  className={`action-button ${confirmedPages[pdfData.currentPage - 1] ? "danger" : "primary"}`}
                >
                  {confirmedPages[pdfData.currentPage - 1] ? "取消確認" : "確認此頁"}
                </button>
                {allPagesConfirmed && (
                  <button onClick={handleSubmit} className="action-button primary submit-button">
                    提交
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PDFPreview;
