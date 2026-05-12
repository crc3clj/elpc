import express from "express";
import cors from "cors";
import XLSX from "xlsx";
import fs from "fs";

const app = express();

/* =========================
   MIDDLEWARE
========================= */
app.use(cors());
app.use(express.json({ limit: "50mb" }));

/* =========================
   TEST ROUTE (DEBUG)
   verifică dacă backend-ul răspunde
========================= */
app.get("/", (req, res) => {
  console.log("🔥 GET / hit");
  res.send("API Server is running");
});

/* =========================
   SAVE ROUTE (DEBUG HEAVY)
========================= */
app.post("/save-excel", (req, res) => {
  console.log("🔥 SAVE ROUTE HIT");
  console.log("BODY:", JSON.stringify(req.body, null, 2));

  try {
    const { sheetName, changes } = req.body;

    if (!sheetName || !changes) {
      console.log("❌ Missing data");
      return res.status(400).send("Missing data");
    }

    const filePath = "data/eLPC.xlsx";

    if (!fs.existsSync(filePath)) {
      console.log("❌ File not found");
      return res.status(404).send("Excel file not found");
    }

    const wb = XLSX.readFile(filePath);

    if (!wb.Sheets[sheetName]) {
      console.log("❌ Sheet not found:", sheetName);
      return res.status(404).send("Sheet not found");
    }

    const ws = wb.Sheets[sheetName];

    // aplicăm modificările
    changes.forEach(({ r, c, value }) => {
  const cell = XLSX.utils.encode_cell({
    r: r + 1,  // index 0, excel row 1
    c
  });

  ws[cell] = { v: value };
});

    wb.Sheets[sheetName] = ws;

    XLSX.writeFile(wb, filePath);

    console.log("✅ File saved successfully");

    res.send("Saved successfully");
  } catch (err) {
    console.error("💥 SERVER ERROR:", err);
    res.status(500).send("Server error");
  }
});

/* =========================
   START SERVER
========================= */
app.listen(3001, () => {
  console.log("🚀 API Server running on http://localhost:3001");
});