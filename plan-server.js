const http = require("node:http");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");

const port = Number(process.env.PORT || 4173);
const dataDirectory = path.join(__dirname, "data");
const selectionsFile = path.join(dataDirectory, "plan-selections.jsonl");
const plans = {
  starter: { name: "DStv Starter", monthlyPrice: 5 },
  select: { name: "DStv Select", monthlyPrice: 15 },
  sports: { name: "DStv Sports", monthlyPrice: 20 },
  ultimate: { name: "DStv Ultimate", monthlyPrice: 30 }
};
const paymentMethods = new Set(["airtelMoney", "orangeMoney"]);
const publicFiles = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/index.html": ["index.html", "text/html; charset=utf-8"],
  "/styles.css": ["styles.css", "text/css; charset=utf-8"],
  "/script.js": ["script.js", "text/javascript; charset=utf-8"],
  "/trial.html": ["trial.html", "text/html; charset=utf-8"]
};

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  const chunks = [];
  let bytesRead = 0;
  for await (const chunk of request) {
    bytesRead += chunk.length;
    if (bytesRead > 4096) {
      const error = new Error("Request body is too large.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.statusCode = 400;
    throw error;
  }
}

async function readSelections() {
  try {
    const content = await fs.readFile(selectionsFile, "utf8");
    return content.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function handleApi(request, response, url) {
  if (url.pathname !== "/api/plan-selections") return false;

  if (request.method === "GET") {
    sendJson(response, 200, { selections: await readSelections() });
    return true;
  }

  if (request.method !== "POST") {
    response.writeHead(405, { Allow: "GET, POST" });
    response.end();
    return true;
  }

  const body = await readJsonBody(request);
  const hasPlan = body && Object.prototype.hasOwnProperty.call(plans, body.planId);
  if (!hasPlan) {
    sendJson(response, 400, { error: "Veuillez choisir une offre DStv valide." });
    return true;
  }
  if (!paymentMethods.has(body.paymentMethod)) {
    sendJson(response, 400, { error: "Veuillez choisir un moyen de paiement accepté." });
    return true;
  }

  const plan = plans[body.planId];
  const selection = {
    reference: randomUUID(),
    createdAt: new Date().toISOString(),
    planId: body.planId,
    planName: plan.name,
    monthlyPrice: plan.monthlyPrice,
    currency: "USD",
    paymentMethod: body.paymentMethod
  };
  await fs.mkdir(dataDirectory, { recursive: true });
  await fs.appendFile(selectionsFile, `${JSON.stringify(selection)}\n`, "utf8");
  sendJson(response, 201, { selection });
  return true;
}

async function serveFile(request, response, url) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end();
    return;
  }
  const file = publicFiles[url.pathname];
  if (!file) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Page introuvable");
    return;
  }
  const content = await fs.readFile(path.join(__dirname, file[0]));
  response.writeHead(200, {
    "Content-Type": file[1],
    "Content-Length": content.length,
    "Cache-Control": "no-cache"
  });
  response.end(request.method === "HEAD" ? undefined : content);
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://127.0.0.1:${port}`);
    if (await handleApi(request, response, url)) return;
    await serveFile(request, response, url);
  } catch (error) {
    console.error(error);
    if (!response.headersSent) {
      sendJson(response, error.statusCode || 500, {
        error: error.statusCode ? error.message : "Le serveur n’a pas pu traiter la demande."
      });
    } else {
      response.destroy();
    }
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`DStv DRC app and plan API listening at http://127.0.0.1:${port}`);
});
