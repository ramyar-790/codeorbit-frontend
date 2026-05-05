const BASE_URL = "https://codeorbit-backend-1.onrender.com";

const API = `${BASE_URL}/api/auth`;
const PROJECT_API = `${BASE_URL}/api/project`;
const RUN_API = `${BASE_URL}/api/run`;

// ================= GLOBAL =================
let files = {};
let current = "";
let saveTimeout;

// ================= DOM =================
const editor = document.getElementById("editor");
const fileList = document.getElementById("fileList");
const filename = document.getElementById("filename");
const output = document.getElementById("output");
const noResult = document.getElementById("noResult");

// ================= TOKEN =================
const getToken = () => localStorage.getItem("token");

// ================= AUTH GUARD =================
(function () {
  const token = getToken();
  if (!token || token === "null") {
    window.location.href = "auth.html";
  }
})();

// ================= INIT =================
if (editor) loadFromDB();

// ================= LOAD PROJECT =================
async function loadFromDB() {
  const token = getToken();
  if (!token) return (window.location.href = "auth.html");

  try {
    const res = await fetch(`${PROJECT_API}/load`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // ✅ FIX
      },
    });

    const data = await res.json();

    files =
      data.files && Object.keys(data.files).length
        ? data.files
        : { "main.py": "print('Hello CodeOrbit 🚀')" };

    current = Object.keys(files)[0];

    openFile(current);
    renderFiles();
  } catch (err) {
    output.innerText = "Error loading project";
  }
}

// ================= SAVE =================
async function saveToDB() {
  const token = getToken();
  if (!token) return;

  try {
    await fetch(`${PROJECT_API}/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // ✅ FIX
      },
      body: JSON.stringify({ files }),
    });
  } catch (err) {
    console.log("Save failed");
  }
}

// ================= AUTO SAVE =================
function autoSave() {
  clearTimeout(saveTimeout);

  saveTimeout = setTimeout(() => {
    if (!current) return;
    files[current] = editor.value;
    saveToDB();
  }, 800);
}

// ================= OPEN FILE =================
function openFile(name) {
  current = name;
  editor.value = files[name] || "";
  filename.innerText = name;
}

// ================= RENDER FILES =================
function renderFiles() {
  fileList.innerHTML = "";

  Object.keys(files).forEach((f) => {
    const div = document.createElement("div");
    div.textContent = f;

    if (f === current) div.classList.add("active");

    div.onclick = () => {
      files[current] = editor.value;
      openFile(f);
      renderFiles();
    };

    // ✏️ RENAME
    const edit = document.createElement("span");
    edit.innerText = " ✏️";
    edit.onclick = (e) => {
      e.stopPropagation();

      const newName = prompt("Rename file:", f);
      if (!newName || files[newName]) return;

      files[newName] = files[f];
      delete files[f];

      if (current === f) current = newName;

      saveToDB();
      renderFiles();
    };

    // ❌ DELETE
    const del = document.createElement("span");
    del.innerText = " ❌";
    del.style.color = "red";

    del.onclick = (e) => {
      e.stopPropagation();

      delete files[f];

      if (Object.keys(files).length === 0) {
        files["main.py"] = "";
      }

      current = Object.keys(files)[0];
      openFile(current);

      saveToDB();
      renderFiles();
    };

    div.appendChild(edit);
    div.appendChild(del);

    fileList.appendChild(div);
  });
}

// ================= SEARCH =================
function searchAll(query) {
  const q = query.toLowerCase().trim();
  let found = false;

  [...fileList.children].forEach((el) => {
    const name = el.firstChild.textContent.toLowerCase();

    if (q !== "" && name.includes(q)) {
      el.classList.add("highlight");
      found = true;
    } else {
      el.classList.remove("highlight");
    }
  });

  if (noResult) {
    noResult.style.display = found || q === "" ? "none" : "block";
  }
}

// ================= RUN CODE =================
async function run() {
  output.innerText = "Running...\n";

  let lang = "js";

  if (current.endsWith(".py")) lang = "python";
  else if (current.endsWith(".c")) lang = "c";
  else if (current.endsWith(".cpp")) lang = "cpp";
  else if (current.endsWith(".java")) lang = "java";

  try {
    const res = await fetch(RUN_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: editor.value,
        lang,
      }),
    });

    const data = await res.json();
    output.innerText = data.output || "No output";
  } catch (err) {
    output.innerText = "Error: " + err.message;
  }
}

// ================= ACTIONS =================
function save() {
  files[current] = editor.value;
  saveToDB();
  output.innerText = "Saved ☁️";
}

function clearOut() {
  output.innerText = "";
}

function downloadFile() {
  const blob = new Blob([editor.value], { type: "text/plain" });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = current || "code.txt";
  a.click();
}

function newFile() {
  const name = prompt("File name:");
  if (!name) return;

  files[name] = "";
  openFile(name);
  saveToDB();
  renderFiles();
}

function newFolder() {
  const name = prompt("Folder name:");
  if (!name) return;

  files[name + "/readme.txt"] = "// folder created";
  openFile(name + "/readme.txt");

  saveToDB();
  renderFiles();
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "auth.html";
}

// ================= LIVE EDIT =================
editor?.addEventListener("input", () => {
  files[current] = editor.value;
  autoSave();
});
