import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, onSnapshot, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyB7aQRg_9UOMBwU7j7gIP8Fl6yVUmg",
  authDomain: "retorno-dpl.firebaseapp.com",
  projectId: "retorno-dpl",
  storageBucket: "retorno-dpl.appspot.com",
  messagingSenderId: "1034863780733",
  appId: "1:1034863780733:web:06f185a80f4de6d5cfa7d4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const colRef = collection(db, "retornos");

const usuarios = ["Yan", "Dandara", "Daniela", "Mylena", "Vanessa", "Mikaelly", "Herlayne", "Charliene", "Thaís", "Mario", "Mateus"];
const lideres = ["Herlayne", "Thaís", "Mario", "Mateus"];

window.login = function () {
  const nome = document.getElementById("username").value.trim();
  if (usuarios.includes(nome)) {
    localStorage.setItem("usuario", nome);
    window.location.href = "dashboard.html";
  } else {
    document.getElementById("error-msg").innerText = "Usuário não autorizado.";
  }
};

window.logout = function () {
  localStorage.removeItem("usuario");
  window.location.href = "index.html";
};

window.handleFileImport = function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  
  reader.onload = async function(e) {
    try {
      const { utils, read } = await import("https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs");
      
      const data = new Uint8Array(e.target.result);
      const workbook = read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = utils.sheet_to_json(firstSheet);
      
      const progressElement = document.createElement('div');
      progressElement.id = 'import-progress';
      document.querySelector('.header').appendChild(progressElement);
      
      let successCount = 0;
      
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        progressElement.innerText = `Importando ${i+1} de ${jsonData.length}...`;
        
        try {
          await addDoc(colRef, {
            equipe: row.Equipe || row.equipe || '',
            lider: row.Líder || row.lider || row.Líderes || '',
            data: formatDate(row.Data || row.data || ''),
            instalacao: row.Instalação || row.instalacao || row.Instalacao || '',
            nota: row.Nota || row.nota || row['Número da Nota'] || '',
            irregularidade: row.Irregularidade || row.irregularidade || '',
            observacao: row.Observação || row.observacao || row.Observacao || '',
            situacao: row.Situação || row.situacao || row.Situacao || 'Pendente',
            usuario: localStorage.getItem("usuario")
          });
          successCount++;
          
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Erro na linha ${i+1}:`, error);
        }
      }
      
      progressElement.innerText = `Importação concluída! ${successCount}/${jsonData.length} registros adicionados.`;
      setTimeout(() => progressElement.remove(), 5000);
    } catch (error) {
      console.error("Erro na importação:", error);
      alert("Erro ao processar a planilha. Verifique o formato.");
    }
  };
  
  reader.readAsArrayBuffer(file);
  event.target.value = '';
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  return date.toISOString().split('T')[0];
}

if (window.location.pathname.includes("dashboard")) {
  const nome = localStorage.getItem("usuario");
  if (!nome) window.location.href = "index.html";

  document.getElementById("welcome").innerText = `Bem-vindo, ${nome}`;

  const form = document.getElementById("retornoForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const dados = {
      equipe: form.equipe.value,
      lider: form.lider.value,
      data: form.data.value,
      instalacao: form.instalacao.value,
      nota: form.nota.value,
      irregularidade: form.irregularidade.value,
      observacao: form.observacao.value,
      situacao: form.situacao.value,
      usuario: nome
    };

    if (!lideres.includes(nome) && dados.situacao === "Resolvido") {
      alert("Somente líderes podem marcar como Resolvido.");
      return;
    }

    await addDoc(colRef, dados);
    form.reset();
  });

  function renderizarTabela(snapshotDocs) {
    const container = document.getElementById("tabela-container");
    let html = `<table><thead><tr>
      <th>Equipe</th><th>Líder</th><th>Data</th><th>Instalação</th>
      <th>Número da Nota</th><th>Irregularidade</th><th>Observação</th><th>Situação</th>`;
    if (lideres.includes(nome)) html += `<th>Ações</th>`;
    html += `</tr></thead><tbody>`;

    snapshotDocs.forEach(docSnap => {
      const d = docSnap.data();
      const id = docSnap.id;
      html += `<tr>
        <td>${d.equipe}</td><td>${d.lider}</td><td>${d.data}</td><td>${d.instalacao}</td>
        <td>${d.nota}</td><td>${d.irregularidade}</td><td>${d.observacao || ''}</td><td>
        ${lideres.includes(nome) ? `<select onchange="atualizarSituacao('${id}', this.value)">
          <option ${d.situacao === 'Pendente' ? 'selected' : ''}>Pendente</option>
          <option ${d.situacao === 'Resolvido' ? 'selected' : ''}>Resolvido</option>
        </select>` : d.situacao}</td>`;
      if (lideres.includes(nome)) {
        html += `<td><button onclick="removerRetorno('${id}')">Remover</button></td>`;
      }
      html += `</tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
  }

  function aplicarFiltro(docs) {
    const filtro = document.getElementById("filtro")?.value.toLowerCase() || "";
    return docs.filter(doc => {
      const d = doc.data();
      return Object.values(d).some(v => String(v).toLowerCase().includes(filtro));
    });
  }

  onSnapshot(colRef, (snapshot) => {
    const docsFiltrados = snapshot.docs.filter(doc => {
      const d = doc.data();
      return lideres.includes(nome) || d.usuario === nome;
    });
    const filtrados = aplicarFiltro(docsFiltrados);
    renderizarTabela(filtrados);
  });

  window.atualizarSituacao = async function (id, novaSit) {
    await updateDoc(doc(db, "retornos", id), { situacao: novaSit });
  }

  window.removerRetorno = async function (id) {
    if (confirm("Remover este retorno?")) {
      await deleteDoc(doc(db, "retornos", id));
    }
  }

  window.exportarExcel = async function () {
    const { utils, writeFile } = await import("https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs");
    const snapshot = await getDocs(colRef);
    const dados = snapshot.docs.filter(doc => {
      const d = doc.data();
      return lideres.includes(nome) || d.usuario === nome;
    }).map(doc => doc.data());

    const worksheet = utils.json_to_sheet(dados);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Retornos");
    writeFile(workbook, "retornos.xlsx");
  }

  window.filtrarTabela = () => {
    getDocs(colRef).then(snapshot => {
      const docsFiltrados = snapshot.docs.filter(doc => {
        const d = doc.data();
        return lideres.includes(nome) || d.usuario === nome;
      });
      const filtrados = aplicarFiltro(docsFiltrados);
      renderizarTabela(filtrados);
    });
  }

  document.getElementById('fileInput').addEventListener('change', handleFileImport, false);
}
