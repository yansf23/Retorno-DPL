import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
const isLeader = user === 'herlayne';
document.getElementById('welcome').innerText = `Bem-vindo(a), ${user}`;

// Carregar dados do Firestore
async function loadData() {
  const querySnapshot = await getDocs(collection(db, "retornos"));
  const tabela = document.querySelector("#data-table tbody");
  tabela.innerHTML = "";

  querySnapshot.forEach((docSnapshot) => {
    const data = docSnapshot.data();
    const tr = document.createElement("tr");
    
    // Adiciona células com os dados
    const fields = ['equipe', 'lider', 'data', 'instalacao', 'numeroNota', 'irregularidade', 'observacao', 'situacao'];
    fields.forEach(field => {
      const td = document.createElement("td");
      td.innerText = data[field] || "";
      tr.appendChild(td);
    });

    // Adiciona células de ações
    const actionsTd = document.createElement("td");
    
    if (isLeader) {
      const resolveBtn = document.createElement("button");
      resolveBtn.className = "action-btn resolve-btn";
      resolveBtn.innerText = "Resolvido";
      resolveBtn.onclick = () => updateStatus(docSnapshot.id, "Resolvido");
      actionsTd.appendChild(resolveBtn);
    }

    const pendingBtn = document.createElement("button");
    pendingBtn.className = "action-btn pending-btn";
    pendingBtn.innerText = "Pendente";
    pendingBtn.onclick = () => updateStatus(docSnapshot.id, "Pendente");
    actionsTd.appendChild(pendingBtn);

    tr.appendChild(actionsTd);
    tabela.appendChild(tr);
  });

  // Adiciona filtros
  setupFilters();
}

// Atualizar status
async function updateStatus(docId, status) {
  try {
    await updateDoc(doc(db, "retornos", docId), {
      situacao: status
    });
    loadData(); // Recarrega os dados após atualização
  } catch (e) {
    console.error("Erro ao atualizar status:", e);
  }
}

// Configurar filtros
function setupFilters() {
  const filterInputs = [
    'equipe', 'lider', 'data', 'instalacao', 'nota', 'irregularidade', 'situacao'
  ];

  filterInputs.forEach((filter, index) => {
    const input = document.getElementById(`filter-${filter}`);
    input.addEventListener('keyup', function() {
      const filterValue = this.value.toLowerCase();
      const table = document.getElementById("data-table");
      const rows = table.getElementsByTagName("tr");

      for (let i = 1; i < rows.length; i++) {
        const cell = rows[i].getElementsByTagName("td")[index];
        if (cell) {
          const textValue = cell.textContent || cell.innerText;
          if (textValue.toLowerCase().indexOf(filterValue) > -1) {
            rows[i].style.display = "";
          } else {
            rows[i].style.display = "none";
          }
        }
      }
    });
  });
}

// Carrega os dados quando a página é aberta
window.addEventListener('DOMContentLoaded', loadData);
