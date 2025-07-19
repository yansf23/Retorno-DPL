import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBFaDw7RrG_9JOW8mWUV7gIP8F1f6yVUmg",
  authDomain: "retorno-dpl.firebaseapp.com",
  projectId: "retorno-dpl",
  storageBucket: "retorno-dpl.appspot.com",
  messagingSenderId: "1084860780733",
  appId: "1:1084860780733:web:0e185af0d4e6dc3fa7d4d4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Mostrar usuário logado
const user = localStorage.getItem('user');
document.getElementById('welcome').innerText = `Bem-vindo(a), ${user}`;

// Função para importar planilha
window.importarPlanilha = async function () {
  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];

  if (!file) return alert("Selecione uma planilha primeiro!");

  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(worksheet);

  const tabela = document.querySelector("#data-table tbody");
  tabela.innerHTML = "";

  for (const row of jsonData) {
    const docData = {
      equipe: row.Equipe || "",
      lider: row.Líder || "",
      data: row.Data || "",
      instalacao: row.Instalação || "",
      numeroNota: row["Número da Nota"] || "",
      irregularidade: row.Irregularidade || "",
      observacao: row.Observação || "",
      situacao: row.Situação || ""
    };

    try {
      await addDoc(collection(db, "retornos"), docData);

      const tr = document.createElement("tr");
      for (const key in docData) {
        const td = document.createElement("td");
        td.innerText = docData[key];
        tr.appendChild(td);
      }
      tabela.appendChild(tr);
    } catch (e) {
      console.error("Erro ao salvar no Firestore:", e);
    }
  }

  alert("Importação concluída!");
}
