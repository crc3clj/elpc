import React, { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import "./styles.css";

const googleSheetId = "1E8CxbgIqomYX3VIJJSJTP2raqT8JmA_q5lG_N6e1Ggg";
const departments = ["MOE1", "MOE2", "MOE3", "MOE4"];

const fetchAllData = async () => {
  try {
    const requests = departments.map(dep =>
      fetch(`https://docs.google.com/spreadsheets/d/${googleSheetId}/gviz/tq?tqx=out:csv&sheet=${dep}`)
        .then(response => response.text())
        .then(text =>
          text
            .split("\n")
            .slice(1)
            .map(row => row.split(",").map(cell => cell.replace(/['"]+/g, "").trim()))
        )
        .then(rows => ({ department: dep, data: rows }))
    );
    return Promise.all(requests);
  } catch (error) {
    console.error("Error fetching data:", error);
    return [];
  }
};

const getUniqueValues = array => [...new Set(array.filter(item => item && item.trim() !== ""))];

const getShift = currentTime => {
  const hours = currentTime.getHours();
  if (hours >= 6 && hours < 14) return 1;
  if (hours >= 14 && hours < 22) return 2;
  return 3;
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

  useEffect(() => {
    fetchAllData().then(setAllData);
    setCurrentDay(new Date().toLocaleString("en-us", { weekday: "long" }));
  }, []);

  useEffect(() => {
    if (selectedSheet) {
      localStorage.setItem("selectedSheet", selectedSheet);
      const sheetData = allData.find(sheet => sheet.department === selectedSheet)?.data || [];
      setFilteredData(sheetData);
      setFilteredFunctions(getUniqueValues(sheetData.map(row => row[0])));
      setApplicableFunctions(getUniqueValues(sheetData.flatMap(row => row.slice(8, 14))));
    }
  }, [selectedSheet, allData]);

  useEffect(() => {
    if (selectedFunction) {
      localStorage.setItem("selectedFunction", selectedFunction);
      const filtered = filteredData.filter(row => row[0] === selectedFunction);
      setFilteredHalls(getUniqueValues(filtered.map(row => row[1])));
    }
  }, [selectedFunction, filteredData]);

  useEffect(() => {
    if (selectedHall) {
      localStorage.setItem("selectedHall", selectedHall);
      const filtered = filteredData.filter(row => row[1] === selectedHall);
      setFilteredLines(getUniqueValues(filtered.map(row => row[2])));
    }
  }, [selectedHall, filteredData]);

  useEffect(() => {
    const currentShift = selectedFunction === "MFO-FM" ? 1 : getShift(new Date());
    setShift(currentShift);

    let rowsForQrGeneration = [];

    // Dacă s-a selectat 'Others', actualizează lista de QR-uri
    if (selectedOthers) {
      const filtered = filteredData.filter(row =>
        row[1] === selectedHall &&
        row[2] === selectedLine &&
        row.slice(8, 14).includes(selectedOthers)
      );

      filtered.forEach(row => {
        const qrCount = parseInt(row[4], 10) || 0;
        const rowIndex = filteredData.indexOf(row);
        for (let i = 0; i < qrCount; i++) {
          const qrRow = filteredData[rowIndex + i];
          if (qrRow) {
            rowsForQrGeneration.push({
              name: qrRow[6]?.trim() || "Unnamed",
              link: qrRow[7]?.trim() || "#"
            });
          }
        }
      });
    } else if (selectedLine) {
      const filtered = filteredData.filter(row =>
        row[0] === selectedFunction &&
        row[1] === selectedHall &&
        row[2] === selectedLine &&
        row[3] === currentShift.toString()
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

    // elimină duplicate după `link` și `name`
    const uniqueQrData = Array.from(new Map(rowsForQrGeneration.map(item => [item.link + item.name, item])).values());
    setQrData(uniqueQrData);
  }, [selectedLine, selectedHall, selectedFunction, selectedOthers, filteredData, currentDay]);

  return (
    <div className="body">
      <div className="container">
        <select className="select-dropdown" value={selectedSheet} onChange={(e) => setSelectedSheet(e.target.value)}>
          <option value="">Select Department</option>
          {departments.map((dep, index) => <option key={index} value={dep}>{dep}</option>)}
        </select>

        {filteredFunctions.length > 0 && (
          <select className="select-dropdown" value={selectedFunction} onChange={(e) => setSelectedFunction(e.target.value)}>
            <option value="">Select Function</option>
            {filteredFunctions.map((func, index) => <option key={index} value={func}>{func}</option>)}
          </select>
        )}

        {filteredHalls.length > 0 && (
          <select className="select-dropdown" value={selectedHall} onChange={(e) => setSelectedHall(e.target.value)}>
            <option value="">Select Hall</option>
            {filteredHalls.map((hall, index) => <option key={index} value={hall}>{hall}</option>)}
          </select>
        )}

        {filteredLines.length > 0 && (
          <select className="select-dropdown" value={selectedLine} onChange={(e) => setSelectedLine(e.target.value)}>
            <option value="">Select Line</option>
            {filteredLines.map((line, index) => <option key={index} value={line}>{line}</option>)}
          </select>
        )}

        {applicableFunctions.length > 0 && (
          <select className="select-dropdown" value={selectedOthers} onChange={(e) => setSelectedOthers(e.target.value)}>
            <option value="">Others</option>
            {applicableFunctions.map((val, index) => <option key={index} value={val}>{val}</option>)}
          </select>
        )}
      </div>

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

      <div className="bottom-links">
        <p><a href="https://bosch-my.sharepoint.com/:b:/p/ceo6clj/EXj9aARocvFDrt5aRHVkImYBCYfu5GtYJNQu5zVCr-GhnQ?e=8UamGZ" target="_blank" rel="noopener noreferrer" style={{ color: 'blue' }}>How to get access to eLPC</a></p>
        <p><a href="https://bosch-my.sharepoint.com/:b:/p/ceo6clj/ETWqMHRqHPBBo0F77VseFEwBoxXr4UWqjUfATps_86J9Sw?e=fmd2r6" target="_blank" rel="noopener noreferrer" style={{ color: 'blue' }}>How to make User settings for MFOx</a></p>
        <p><a href="https://bosch-my.sharepoint.com/:b:/p/ceo6clj/EcdyZA0wEoxDiNxYumRnWCYB7HIVrm2v975BZ9fx_09rlQ?e=h1U3KG" target="_blank" rel="noopener noreferrer" style={{ color: 'blue' }}>How to make tag mode settings</a></p>
        <p><a href="https://pbi-reporting.bosch.com/reports/powerbi/CLJP_MFD/CljP-All/eLPC%20Weekly%20Report" target="_blank" rel="noopener noreferrer" style={{ color: 'blue' }}>MSE Weekly LPC Report</a></p>
        <p><a href="https://pbi-reporting.bosch.com/reports/powerbi/CLJP_MFD/CljP-All/eLPC%20Monthly%20Report" target="_blank" rel="noopener noreferrer" style={{ color: 'blue' }}>Monthly Realization Report</a></p>
        <p><a href="https://pbi-reporting.bosch.com/reports/powerbi/CLJP_MFD/CljP-All/SuperOPL" target="_blank" rel="noopener noreferrer" style={{ color: 'blue' }}>SuperOPL Status Report</a></p>
      </div>
    </div>
  );
}
