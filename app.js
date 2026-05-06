// ================= BASE URL =================
const BASE_URL = "https://codeorbit-backend-kxo0.onrender.com";

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
const searchBox = document.getElementById("searchBox");

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

// ================= LOAD =================
async function loadFromDB() {
  const token = getToken();

  try {
    const res = await fetch(`${PROJECT_API}/load`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: token }),
    });

    const data = await res.json();

    files =
      data.files && Object.keys(data.files).length
        ? data.files
        : {
            "main.py": "print('Hello Python 🚀')",
            "main.c":
              '#include <stdio.h>\nint main(){ printf("Hello C\\n"); return 0; }',
            "main.cpp":
              '#include <iostream>\nusing namespace std;\nint main(){ cout << "Hello C++"; }',
            "Main.java":
              'class Main{ public static void main(String[] args){ System.out.println("Hello Java"); }}',
          };

    current = Object.keys(files)[0];

    openFile(current);
    renderFiles();
  } catch {
    output.innerText = "Error loading project";
  }
}

// ================= SAVE =================
async function saveToDB() {
  const token = getToken();

  await fetch(`${PROJECT_API}/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: token,
      files,
    }),
  });
}

// ================= AUTO SAVE =================
function autoSave() {
  clearTimeout(saveTimeout);

  saveTimeout = setTimeout(() => {
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

    // ✏️ EDIT
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

// ================= SEARCH BUTTON =================
function searchFiles() {
  const query = searchBox.value.toLowerCase().trim();
  let found = false;

  [...fileList.children].forEach((el) => {
    const name = el.firstChild.textContent.toLowerCase();

    if (query !== "" && name.includes(query)) {
      el.style.background = "#1f6feb"; // highlight blue
      found = true;
    } else {
      el.style.background = "";
    }
  });

  noResult.style.display = found || query === "" ? "none" : "block";

  highlightCode(query);
}

// ================= CODE HIGHLIGHT =================
function highlightCode(query) {
  if (!query) return;

  const text = editor.value;
  const regex = new RegExp(query, "gi");

  const highlighted = text.replace(regex, (match) => `>>${match}<<`);

  output.innerText = "Search Highlight:\n\n" + highlighted;
}

// ================= RUN =================
async function run() {
  output.innerText = "Running...\n";

  let lang = "python";

  if (current.endsWith(".c")) lang = "c";
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
  a.download = current;
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
