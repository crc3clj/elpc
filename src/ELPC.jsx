import React, { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import "./styles.css";
import * as XLSX from "xlsx";


const departments = ["MOE1", "MOE2", "MOE3", "MOE4"];
const fetchAllData = async () => {
  const base = import.meta.env.BASE_URL;

  try {
    // CONFIG din public/data
    const configRes = await fetch(`${base}data/config.json`);
    const config = await configRes.json();

    // EXCEL din public/data
    const filePath = `${base}data/${config.dataPath}`;

    const res = await fetch(filePath);
    const arrayBuffer = await res.arrayBuffer();

    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    const result = workbook.SheetNames.map(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const rows = jsonData
        .slice(1)
        .map(row =>
          row.map(cell =>
            cell !== null && cell !== undefined
              ? String(cell).replace(/['"]+/g, "").trim()
              : ""
          )
        );

      return {
        department: sheetName,
        data: rows
      };
    });

    return result;
  } catch (error) {
    console.error("Error loading Excel file:", error);
    return [];
  }
};

const getUniqueValues = array =>
  [...new Set(array.filter(item => item && item.trim() !== ""))];

const getShift = currentTime => {
  const hours = currentTime.getHours();
  if (hours >= 6 && hours < 18) return 1;
  return 2;
};

export default function Elpc() {
  const [allData, setAllData] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState(localStorage.getItem("selectedSheet") || "");
  const [filteredData, setFilteredData] = useState([]);
  const [filteredFunctions, setFilteredFunctions] = useState([]);
  const [selectedFunction, setSelectedFunction] = useState(localStorage.getItem("selectedFunction") || "");
  const [filteredHalls, setFilteredHalls] = useState([]);
  const [selectedHall, setSelectedHall] = useState(localStorage.getItem("selectedHall") || "");
  const [filteredLines, setFilteredLines] = useState([]);
  const [selectedLine, setSelectedLine] = useState("");
  const [qrData, setQrData] = useState([]);
  const [currentDay, setCurrentDay] = useState("");
  const [shift, setShift] = useState(1);
  const [applicableFunctions, setApplicableFunctions] = useState([]);
  const [selectedOthers, setSelectedOthers] = useState("");
  const [tableData, setTableData] = useState([]);
  const [hasShift2, setHasShift2] = useState(false);

  useEffect(() => {
    fetchAllData().then(setAllData);
    setCurrentDay(new Date().toLocaleString("en-us", { weekday: "long" }));
  }, []);

  useEffect(() => {
    if (selectedSheet) {
      localStorage.setItem("selectedSheet", selectedSheet);
      const sheetData = allData.find(sheet => sheet.department === selectedSheet)?.data || [];
      setFilteredData(sheetData);

      const allowedFunctions = ["MFO-LL", "MFO-SL", "MFO-FM"]; //exclude functions MFO-LL, MFO-SL, MFO-FM 
      setFilteredFunctions(
        getUniqueValues(sheetData.map(row => row[0])).filter(func => allowedFunctions.includes(func))
      );

      setApplicableFunctions(
        getUniqueValues(sheetData.flatMap(row => row.slice(8, 50))).filter(val => val !== "MFO-SL")
      );
    }
  }, [selectedSheet, allData]);

  useEffect(() => {
    localStorage.setItem("selectedFunction", selectedFunction);
    const filtered = selectedFunction
      ? filteredData.filter(row => row[0] === selectedFunction)
      : filteredData;

    setFilteredHalls(getUniqueValues(filtered.map(row => row[1])));
  }, [selectedFunction, filteredData]);

  useEffect(() => {
    localStorage.setItem("selectedHall", selectedHall);
    const filtered = filteredData.filter(row =>
      (selectedFunction ? row[0] === selectedFunction : true) &&
      (selectedHall ? row[1] === selectedHall : true)
    );

    setFilteredLines(getUniqueValues(filtered.map(row => row[2])));
  }, [selectedHall, filteredData, selectedFunction]);

  // --- QR code logic ---
  useEffect(() => {
    const currentShift = selectedFunction === "MFO-FM" ? 1 : getShift(new Date());
    setShift(currentShift);

    if (!selectedLine && !selectedOthers) {
      setQrData([]);
      return;
    }

    let rowsForQrGeneration = [];

    if (selectedOthers) {
      const filtered = filteredData.filter(row =>
        (selectedHall ? row[1] === selectedHall : true) &&
        (selectedLine ? row[2] === selectedLine : true) &&
        row.slice(8, 50).includes(selectedOthers)
      );

      filtered.forEach(row => {
        rowsForQrGeneration.push({
          name: row[6]?.trim() || "Unnamed",
          link: row[7]?.trim() || "#"
        });
      });
    } else if (selectedLine) {
      const filtered = filteredData.filter(row =>
        row[2] === selectedLine &&
        row[3] === currentShift.toString() &&
        (selectedFunction ? row[0] === selectedFunction : true) &&
        (selectedHall ? row[1] === selectedHall : true)
      );

      filtered.forEach(row => {
        const qrCount = parseInt(row[4], 10) || 0;
        const rowIndex = filteredData.indexOf(row);
        for (let i = 0; i < qrCount; i++) {
          const qrRow = filteredData[rowIndex + i];
          if (qrRow?.[5]?.toLowerCase().trim() === currentDay.toLowerCase()) {
            rowsForQrGeneration.push({
              name: qrRow[6]?.trim() || "Unnamed",
              link: qrRow[7]?.trim() || "#"
            });
          }
        }
      });
    }

    const uniqueQrData = Array.from(new Map(rowsForQrGeneration.map(item => [item.link + item.name, item])).values());
    setQrData(uniqueQrData);
  }, [selectedLine, selectedHall, selectedFunction, selectedOthers, filteredData, currentDay]);

  // --- Function to generate weekly table ---
  const generateWeeklyTable = () => {
    if (selectedFunction && selectedHall && selectedLine) {

      const shifts = [1, 2];
      const result = {};
      let hasShift2 = false;
      let isFiveQr = false;

      shifts.forEach(shiftVal => {
        const filtered = filteredData
          .map((row, index) => ({ row, index }))
          .filter(({ row }) =>
            row[0] === selectedFunction &&
            row[1] === selectedHall &&
            row[2] === selectedLine &&
            row[3] === shiftVal.toString()
          );

        if (filtered.length > 0) {
          const firstRowIndex = filtered[0].index;
          const nrRows = parseInt(filtered[0].row[4], 10) || 0;

          if (nrRows === 5) {
            isFiveQr = true;
          }

          if (shiftVal === 2 && nrRows > 0) {
            hasShift2 = true;
          }

          for (let i = 0; i < nrRows; i++) {
            const dataRow = filteredData[firstRowIndex + i];
            if (dataRow) {
              const day = dataRow[5];
              if (!result[day]) {
                result[day] = { day, shift1: "", shift2: "" };
              }

              if (shiftVal === 1) {
                result[day].shift1 = dataRow[6];
              } else {
                result[day].shift2 = dataRow[6];
              }
            }
          }
        }
      });

      setTableData(Object.values(result));

      // set hasShift2
      setHasShift2(hasShift2 && !isFiveQr);
    }
  };
  // --- LIVE WEEKLY TABLE ---
  useEffect(() => {
    if (selectedOthers) {
      setTableData([]);
      return;
    }

    if (!(selectedFunction && selectedHall && selectedLine)) {
      setTableData([]);
      return;
    }

    const shifts = [1, 2];
    const result = {};
    let hasShift2Local = false;
    let isFiveQr = false;

    shifts.forEach(shiftVal => {
      const filtered = filteredData
        .map((row, index) => ({ row, index }))
        .filter(({ row }) =>
          row[0] === selectedFunction &&
          row[1] === selectedHall &&
          row[2] === selectedLine &&
          row[3] === shiftVal.toString()
        );

      if (filtered.length > 0) {
        const firstRowIndex = filtered[0].index;
        const nrRows = parseInt(filtered[0].row[4], 10) || 0;

        if (nrRows === 5) isFiveQr = true;
        if (shiftVal === 2 && nrRows > 0) hasShift2Local = true;

        for (let i = 0; i < nrRows; i++) {
          const dataRow = filteredData[firstRowIndex + i];
          if (dataRow) {
            const day = dataRow[5];
            if (!result[day]) {
              result[day] = { day, shift1: "", shift2: "" };
            }

            if (shiftVal === 1) {
              result[day].shift1 = dataRow[6];
            } else {
              result[day].shift2 = dataRow[6];
            }
          }
        }
      }
    });

    setTableData(Object.values(result));
    setHasShift2(hasShift2Local && !isFiveQr);

  }, [selectedFunction, selectedHall, selectedLine, selectedOthers, filteredData]);

  return (
    <div className="body">
      <div className="top-right-email">
        <span style={{ color: "black" }}>Contact: </span>
        <a href="mailto:Ozgur.Cengiz@ro.bosch.com">Ozgur Cengiz</a>
      </div>

      <div className="container">
        <select
          className="select-dropdown"
          value={selectedSheet}
          onChange={(e) => setSelectedSheet(e.target.value)}
        >
          <option value="">Select Value Stream</option>
          {departments.map((dep, index) => (
            <option key={index} value={dep}>{dep}</option>
          ))}
        </select>

        {selectedSheet && (
          <>
            <select
              className="select-dropdown"
              value={selectedFunction}
              onChange={(e) => {
                setSelectedFunction(e.target.value);
                setSelectedOthers(""); // reset Flexible
              }}
              style={{ backgroundColor: "#FFC300", border: "none", outline: "none", boxShadow: "none" }}
            >
              <option value="">MFOx only - Select Function</option>
              {filteredFunctions.sort().map((func, index) => (
                <option key={index} value={func}>{func}</option>
              ))}
            </select>

            <select className="select-dropdown" value={selectedHall} onChange={(e) => {
              setSelectedHall(e.target.value);
              setSelectedOthers("");
            }}>
              <option value="">Select Hall</option>
              {filteredHalls.sort().map((hall, index) => (
                <option key={index} value={hall}>{hall}</option>
              ))}
            </select>

            <select className="select-dropdown" value={selectedLine} onChange={(e) => {
              setSelectedLine(e.target.value);
              setSelectedOthers("");
            }}>
              <option value="">Select Line</option>
              {filteredLines.sort().map((line, index) => (
                <option key={index} value={line}>{line}</option>
              ))}
            </select>
          </>
        )}

        {selectedSheet && applicableFunctions.length > 0 && (
          <select
            className="select-dropdown"
            value={selectedOthers}
            onChange={(e) => setSelectedOthers(e.target.value)}
            style={{ backgroundColor: "#FFC300", border: "none", outline: "none", boxShadow: "none" }}
          >
            <option value="">Other - Flexible</option>
            {applicableFunctions.sort().map((val, index) => (
              <option key={index} value={val}>{val}</option>
            ))}
          </select>
        )}
      </div>

      {/* --- QR Codes --- */}
      {qrData.length > 0 && (
        <div className="qr-container">
          {qrData.map((qr, index) => (
            <div key={index} className="qr-box">
              <p className="qr-name" style={{ color: 'black' }}>{qr.name}</p>
              <a href={qr.link} target="_blank" rel="noopener noreferrer">
                <QRCodeCanvas value={qr.link} size={150} />
              </a>
            </div>
          ))}
        </div>
      )}

      {/* --- Weekly Table între QR și butoane --- */}
      {tableData.length > 0 && (
        <table className="table" style={{ margin: "20px auto", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid black", padding: "5px", color: "black" }}>Day</th>
              <th style={{ border: "1px solid black", padding: "5px", color: "black" }}>Task Shift 1</th>
              {hasShift2 && (
                <th style={{ border: "1px solid black", padding: "5px", color: "black" }}>Task Shift 2</th>
              )}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, index) => (
              <tr key={index}>
                <td style={{ border: "1px solid black", padding: "5px", color: "black" }}>{row.day}</td>
                <td style={{ border: "1px solid black", padding: "5px", color: "black" }}>{row.shift1}</td>
                {hasShift2 && (
                  <td style={{ border: "1px solid black", padding: "5px", color: "black" }}>{row.shift2}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* --- Reset Button / Weekly Schedule --- */}
      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <div style={{ display: "inline-flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
          <button
            className="select-reset-selections"
            style={{ cursor: "pointer" }}
            onClick={() => {
              localStorage.removeItem("selectedSheet");
              localStorage.removeItem("selectedFunction");
              localStorage.removeItem("selectedHall");
              localStorage.removeItem("selectedLine");
              localStorage.removeItem("selectedOthers");
              setTableData([]);
              window.location.reload();
            }}
          >
            Reset Selections
          </button>
        </div>

        {/* --- usefull links --- */}
        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <p><a href="https://bosch-my.sharepoint.com/:b:/p/ceo6clj/EXj9aARocvFDrt5aRHVkImYBCYfu5GtYJNQu5zVCr-GhnQ?e=8UamGZ" target="_blank" rel="noopener noreferrer" style={{ color: 'blue' }}>How to get access to eLPC</a></p>
          <p><a href="https://bosch-my.sharepoint.com/:b:/p/ceo6clj/ETWqMHRqHPBBo0F77VseFEwBoxXr4UWqjUfATps_86J9Sw?e=fmd2r6" target="_blank" rel="noopener noreferrer" style={{ color: 'blue' }}>How to make User settings for MFOx</a></p>
          <p><a href="https://bosch-my.sharepoint.com/:b:/p/ceo6clj/EcdyZA0wEoxDiNxYumRnWCYB7HIVrm2v975BZ9fx_09rlQ?e=h1U3KG" target="_blank" rel="noopener noreferrer" style={{ color: 'blue' }}>How to make tag mode settings</a></p>
          <p><a href="https://pbi-reporting.bosch.com/reports/powerbi/CLJP_MFD/CljP-All/eLPC%20Weekly%20Report" target="_blank" rel="noopener noreferrer" style={{ color: 'blue' }}>MSE Weekly LPC Report</a></p>
          <p><a href="https://pbi-reporting.bosch.com/reports/powerbi/CLJP_MFD/CljP-All/eLPC%20Monthly%20Report" target="_blank" rel="noopener noreferrer" style={{ color: 'blue' }}>Monthly Realization Report</a></p>
          <p><a href="https://pbi-reporting.bosch.com/reports/powerbi/CLJP_MFD/CljP-All/SuperOPL" target="_blank" rel="noopener noreferrer" style={{ color: 'blue' }}>SuperOPL Status Report</a></p>
        </div>
      </div>
    </div>
  );
}