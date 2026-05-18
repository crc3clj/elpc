import express from "express";
import cors from "cors";
import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

/* =========================
   __dirname (ESM)
========================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =========================
   MIDDLEWARE
========================= */
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json({
  limit: "50mb"
}));

/* =========================
   CONFIG + PATH HELPERS
========================= */

function getConfig() {
  // încearcă mai multe locații
  const possiblePaths = [
    path.join(__dirname, "../public/data/config.json"),
    path.join(__dirname, "public/data/config.json"),
    path.join(process.cwd(), "public/data/config.json"),
    path.join(process.cwd(), "data/config.json")
  ];

  console.log("🔎 Searching config...");

  for (const p of possiblePaths) {
    console.log("Trying:", p);

    if (fs.existsSync(p)) {
      console.log("✅ CONFIG FOUND:", p);

      return JSON.parse(
        fs.readFileSync(p, "utf8")
      );
    }
  }

  throw new Error(
    "config.json not found"
  );
}

function resolveExcelPath(dataPath) {
  console.log(
    "📌 resolveExcelPath input:",
    dataPath
  );

  // path absolut
  if (path.isAbsolute(dataPath)) {
    console.log(
      "✅ Absolute path"
    );
    return dataPath;
  }

  // relativ -> încearcă public
  const possibleExcelPaths = [
    path.join(
      __dirname,
      "../public",
      dataPath
    ),
    path.join(
      __dirname,
      "public",
      dataPath
    ),
    path.join(
      process.cwd(),
      "public",
      dataPath
    ),
    path.join(
      process.cwd(),
      dataPath
    )
  ];

  for (const p of possibleExcelPaths) {
    console.log(
      "Trying excel:",
      p
    );

    if (fs.existsSync(p)) {
      console.log(
        "✅ EXCEL FOUND:",
        p
      );

      return p;
    }
  }

  // fallback
  return possibleExcelPaths[0];
}

/* =========================
   TEST
========================= */
app.get("/", (req, res) => {
  console.log("🔥 GET /");

  res.send(
    "API Server is running"
  );
});

/* =========================
   LOAD EXCEL
========================= */
app.post(
  "/load-excel",
  (req, res) => {
    try {
      console.log(
        "\n🔥 LOAD ROUTE HIT"
      );

      const config =
        getConfig();

      console.log(
        "CONFIG:",
        config
      );

      const filePath =
        resolveExcelPath(
          config.dataPath
        );

      console.log(
        "📂 FINAL LOAD PATH:",
        filePath
      );

      if (
        !fs.existsSync(
          filePath
        )
      ) {
        console.log(
          "❌ Excel not found"
        );

        return res
          .status(404)
          .send(
            "Excel file not found"
          );
      }

      const file =
        fs.readFileSync(
          filePath
        );

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      console.log(
        "✅ LOAD OK"
      );

      res.send(file);

    } catch (err) {
      console.error(
        "💥 LOAD ERROR:",
        err
      );

      res
        .status(500)
        .send(
          err.message
        );
    }
  }
);

/* =========================
   SAVE EXCEL
========================= */
app.post(
  "/save-excel",
  (req, res) => {
    try {
      console.log(
        "\n🔥 SAVE ROUTE HIT"
      );

      const {
        sheetName,
        changes
      } = req.body;

      console.log(
        "BODY:",
        req.body
      );

      if (
        !sheetName ||
        !changes
      ) {
        return res
          .status(400)
          .send(
            "Missing data"
          );
      }

      const config =
        getConfig();

      const filePath =
        resolveExcelPath(
          config.dataPath
        );

      console.log(
        "📁 FINAL SAVE PATH:",
        filePath
      );

      if (
        !fs.existsSync(
          filePath
        )
      ) {
        return res
          .status(404)
          .send(
            "Excel file not found"
          );
      }

      const wb =
        XLSX.readFile(
          filePath
        );

      if (
        !wb.Sheets[
          sheetName
        ]
      ) {
        return res
          .status(404)
          .send(
            "Sheet not found"
          );
      }

      const ws =
        wb.Sheets[
          sheetName
        ];

      changes.forEach(
        ({
          r,
          c,
          value
        }) => {
          const cell =
            XLSX.utils.encode_cell(
              {
                r:
                  r + 1,
                c
              }
            );

          ws[cell] = {
            t: "s",
            v: value
          };
        }
      );

      wb.Sheets[
        sheetName
      ] = ws;

      XLSX.writeFile(
        wb,
        filePath
      );

      console.log(
        "✅ SAVE OK"
      );

      res.send(
        "Saved successfully"
      );

    } catch (err) {
      console.error(
        "💥 SAVE ERROR:",
        err
      );

      res
        .status(500)
        .send(
          err.message
        );
    }
  }
);

/* =========================
   START
========================= */
const PORT = 3001;

app.listen(
  PORT,
  () => {
    console.log(
      `🚀 API running on http://localhost:${PORT}`
    );
  }
);