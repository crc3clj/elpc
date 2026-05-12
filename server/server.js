import express from "express";
import cors from "cors";
import XLSX from "xlsx";
import fs from "fs";
import path from "path";

const app = express();

/* =========================
   MIDDLEWARE
========================= */
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json({ limit: "50mb" }));

/* =========================
   TEST ROUTE
========================= */
app.get("/", (req, res) => {
  console.log("🔥 GET / hit");
  res.send("API Server is running");
});

/* =========================
   SAVE EXCEL ROUTE
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

    // 📌 CONFIG din public/data
    const configPath = path.resolve("public/data/config.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

    // 📌 EXCEL din public/data
    const filePath = path.resolve("public/data", config.dataPath);

    if (!fs.existsSync(filePath)) {
      console.log("❌ File not found:", filePath);
      return res.status(404).send("Excel file not found");
    }

    const wb = XLSX.readFile(filePath);

    if (!wb.Sheets[sheetName]) {
      console.log("❌ Sheet not found:", sheetName);
      return res.status(404).send("Sheet not found");
    }

    const ws = wb.Sheets[sheetName];

    // 📌 aplicare modificări
    changes.forEach(({ r, c, value }) => {
      const cell = XLSX.utils.encode_cell({
        r: r + 1,
        c
      });

      ws[cell] = { t: "s", v: value };
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