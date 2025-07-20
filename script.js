import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

const user = localStorage.getItem('user');
const isLeader = user === 'herlayne';
document.getElementById('welcome').innerText = `Bem-vindo(a), ${user}`;

// Filtros por coluna
document.querySelectorAll('.filter-input').forEach((input, index) => {
  input.addEventListener('input', () => {
    const valoresFiltro = Array.from(document.querySelectorAll('.filter-input')).map(i => i.value.toLowerCase());
    document.querySelectorAll('#data-table tbody tr').forEach(row => {
      let mostrar = true;
      row.querySelectorAll('td').forEach((td, i) => {
        if (!td.innerText.toLowerCase().includes(valoresFiltro[i])) mostrar = false;
      });
      row.style.display = mostrar ? '' : 'none';
    });
  });
});

// Exemplo de uso da função para adicionar retorno:
async function adicionarRetorno(docData) {
  if (!isLeader && docData.situacao.toLowerCase() === 'resolvido') {
    alert("Somente a líder pode adicionar retornos resolvidos.");
    return;
  }

  try {
    await addDoc(collection(db, "retornos"), docData);

    const tabela = document.querySelector("#data-table tbody");
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
