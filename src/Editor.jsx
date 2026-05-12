import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import "./styles.css";

export default function Editor() {
  const [workbook, setWorkbook] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState("");

  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(false);

  const [openFilter, setOpenFilter] = useState(null);
  const [editingCell, setEditingCell] = useState(null);

  const [changes, setChanges] = useState([]);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  useEffect(() => {
    const loadExcel = async () => {
      try {
        const base = import.meta.env.BASE_URL;

        const configRes = await fetch(`${import.meta.env.BASE_URL}data/config.json`);
        const config = await configRes.json();

        const filePath = `${import.meta.env.BASE_URL}data/${config.dataPath}`;

        const res = await fetch(filePath);
        const buffer = await res.arrayBuffer();

        const wb = XLSX.read(buffer, { type: "array" });

        setWorkbook(wb);
        setSheetNames(wb.SheetNames);
      } catch (err) {
        console.error("Excel load error:", err);
      }
    };

    loadExcel();
  }, []);

  // 📊 Load sheet
  useEffect(() => {
    if (!workbook || !selectedSheet) return;

    setLoading(true);

    setTimeout(() => {
      const sheet = workbook.Sheets[selectedSheet];
      const range = XLSX.utils.decode_range(sheet["!ref"]);

      const allData = [];

      for (let R = range.s.r; R <= range.e.r; R++) {
        const row = [];

        for (let C = range.s.c; C <= range.e.c; C++) {
          const addr = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = sheet[addr];
          row.push(cell ? String(cell.v) : "");
        }

        allData.push(row);
      }

      setHeaders(allData[0] || []);
      setRows(allData.slice(1));
      setFilters({});
      setLoading(false);
    }, 50);
  }, [workbook, selectedSheet]);

  const handleFilterChange = (colIndex, value) => {
    setFilters(prev => ({
      ...prev,
      [colIndex]: value
    }));
  };

  const getUniqueValues = (colIndex) => {
    return [...new Set(rows.map(r => r[colIndex]).filter(Boolean))];
  };

  const filteredRows = rows.filter(row => {
    return Object.entries(filters).every(([col, value]) => {
      if (!value) return true;
      return row[col] === value;
    });
  });

  // ✏️ UPDATE CELL (IMPORTANT FIX IMMUTABLE)
  const updateCell = (rowIndex, colIndex, value) => {
    // 1. update UI
    setRows(prev => {
      const copy = [...prev];
      copy[rowIndex] = [...copy[rowIndex]];
      copy[rowIndex][colIndex] = value;
      return copy;
    });

    // 2. track changes
    setChanges(prev => {
      const filtered = prev.filter(
        c => !(c.r === rowIndex && c.c === colIndex)
      );

      return [...filtered, {
        r: rowIndex,
        c: colIndex,
        value
      }];
    });
  };
  const handleSave = async () => {
    try {
      const configRes = await fetch(`${import.meta.env.BASE_URL}data/config.json`);
      const config = await configRes.json();

      await fetch(`${config.apiUrl}/save-excel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sheetName: selectedSheet,
          changes
        })
      });

      setToast({
        show: true,
        message: "✔ Salvare reușită!",
        type: "success"
      });

      setChanges([]);
    } catch (err) {
      setToast({
        show: true,
        message: "❌ Eroare la salvare!",
        type: "error"
      });
    }

    setTimeout(() => {
      setToast({ show: false, message: "", type: "" });
    }, 2500);
  };

  return (
    <div className="body">
      <div className="container">

        {/* SHEET SELECT */}
        <select
          className="select-dropdown"
          value={selectedSheet}
          onChange={(e) => setSelectedSheet(e.target.value)}
        >
          <option value="">Select Sheet</option>
          {sheetNames.map((name, i) => (
            <option key={i} value={name}>
              {name}
            </option>
          ))}
        </select>
        <button className="select-dropdown"
          onClick={handleSave}>
          Save
        </button>

      </div>
      {
        toast.show && (
          <div
            style={{
              position: "fixed",
              bottom: "20px",
              right: "20px",
              padding: "10px 16px",
              borderRadius: "6px",
              color: "#fff",
              background: toast.type === "success" ? "#22c55e" : "#ef4444",
              fontSize: "14px",
              boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
              zIndex: 9999
            }}
          >
            {toast.message}
          </div>
        )
      }

      {/* LOADING */}
      {loading && (
        <div style={{ textAlign: "center", marginTop: "20px" }}>
          Loading...
        </div>
      )}

      {/* TABLE */}
      {!loading && headers.length > 0 && (
        <div
          style={{
            marginTop: "20px",
            maxHeight: "100vh",
            maxWidth: "100vw",
            overflow: "auto",
            border: "1px solid #ccc"
          }}
        >
          <table
            style={{
              borderCollapse: "collapse",
              fontSize: "12px",
              width: "max-content"
            }}
          >

            {/* HEADER */}
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th
                    key={i}
                    style={{
                      position: "sticky",
                      top: 0,
                      background: "#f2f2f2",
                      border: "1px solid #ccc",
                      minWidth: "140px",
                      padding: "4px",
                      color: "black"
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <div style={{ fontWeight: "bold" }}>
                        {h || `Col ${i + 1}`}
                      </div>

                      {/* FILTER BUTTON */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenFilter(openFilter === i ? null : i);
                        }}
                        style={{
                          width: 18,
                          height: 18,
                          fontSize: 10,
                          borderRadius: 4,
                          border: "1px solid #ccc",
                          background: openFilter === i ? "#2563eb" : "#fff",
                          color: openFilter === i ? "#fff" : "#333",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        ⏷
                      </button>

                      {/* DROPDOWN */}
                      {openFilter === i && (
                        <div
                          style={{
                            position: "absolute",
                            top: "100%",
                            right: 0,
                            background: "#fff",
                            border: "1px solid #d1d5db",
                            borderRadius: 8,
                            zIndex: 1000,
                            maxHeight: 220,
                            overflowY: "auto",
                            width: 200,
                            boxShadow: "0 10px 25px rgba(0,0,0,0.15)"
                          }}
                        >
                          <div
                            onClick={() => {
                              handleFilterChange(i, "");
                              setOpenFilter(null);
                            }}
                            style={{
                              padding: "8px 10px",
                              cursor: "pointer"
                            }}
                          >
                            All
                          </div>

                          {getUniqueValues(i).map((val, idx) => (
                            <div
                              key={idx}
                              onClick={() => {
                                handleFilterChange(i, val);
                                setOpenFilter(null);
                              }}
                              style={{
                                padding: "8px 10px",
                                cursor: "pointer"
                              }}
                            >
                              {val}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* BODY */}
            <tbody>
              {filteredRows.map((row, rIdx) => (
                <tr key={rIdx}>
                  {row.map((cell, cIdx) => {
                    const isEditing =
                      editingCell?.r === rIdx && editingCell?.c === cIdx;

                    return (
                      <td
                        key={cIdx}
                        style={{
                          border: "1px solid #ddd",
                          padding: "4px",
                          minWidth: "140px",
                          color: "black",
                          whiteSpace: "nowrap"
                        }}
                        onClick={() =>
                          setEditingCell({ r: rIdx, c: cIdx })
                        }
                      >
                        {isEditing ? (
                          <input
                            autoFocus
                            defaultValue={cell}
                            onBlur={(e) => {
                              updateCell(rIdx, cIdx, e.target.value);
                              setEditingCell(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                updateCell(rIdx, cIdx, e.target.value);
                                setEditingCell(null);
                              }
                            }}
                            style={{
                              width: "100%",
                              border: "none",
                              outline: "none",
                              fontSize: "12px",
                              background: "#fff",
                              color: "#000"
                            }}
                          />
                        ) : (
                          cell
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>

          </table>
        </div>
      )}
    </div>

  );
}