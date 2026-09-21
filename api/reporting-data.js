const https = require("https");

const CONFIG = {
  appsScriptUrl: process.env.HHL_APPS_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbzWbSCtckH7zEt2n1g6SdM0HC-7OGWmPAadVpSyDFEky6oZbHfVdukOERwTky0eC7YxDA/exec",
  appsScriptSecret: process.env.HHL_APPS_SCRIPT_SECRET || "",
  timeoutMs: Number(process.env.HHL_APPS_SCRIPT_TIMEOUT_MS || 30000),
};

let lastGoodData = null;

function requestJson(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { family: 4 }, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          if (redirects >= 5) return reject(new Error("Too many redirects while loading dashboard data"));
          return requestJson(new URL(res.headers.location, url).toString(), redirects + 1).then(resolve).catch(reject);
        }
        try {
          const parsed = data ? JSON.parse(data) : {};
          if (parsed.error) return reject(new Error([parsed.error, parsed.detail].filter(Boolean).join(": ")));
          resolve(parsed);
        } catch (err) {
          reject(new Error("Invalid JSON response from the reporting service"));
        }
      });
    });
    req.setTimeout(CONFIG.timeoutMs, () => req.destroy(new Error("Reporting service timed out")));
    req.on("error", reject);
  });
}

async function loadReportingData() {
  if (!CONFIG.appsScriptUrl || !CONFIG.appsScriptSecret) {
    throw new Error("Apps Script dashboard connection is not configured");
  }

  const url = new URL(CONFIG.appsScriptUrl);
  url.searchParams.set("key", CONFIG.appsScriptSecret);

  try {
    const payload = await requestJson(url.toString());
    lastGoodData = {
      rows: payload.rows || [],
      dataUpdatedAt: payload.dataUpdatedAt || payload.updatedAt || "",
    };
    return Object.assign({ stale: false, warning: "" }, lastGoodData);
  } catch (err) {
    if (lastGoodData) {
      return Object.assign({
        stale: true,
        warning: `Using the last loaded data because the live refresh failed: ${err.message}`,
      }, lastGoodData);
    }
    throw err;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const data = await loadReportingData();
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      rows: data.rows,
      dataUpdatedAt: data.dataUpdatedAt,
      updatedAt: data.dataUpdatedAt,
      stale: data.stale,
      warning: data.warning,
    });
  } catch (err) {
    res.status(500).json({
      error: "Dashboard data could not be loaded.",
      detail: err && err.message ? err.message : String(err),
    });
  }
};
