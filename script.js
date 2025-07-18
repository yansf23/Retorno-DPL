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
      
      console.log("Dados lidos da planilha:", jsonData);
      
      const progressElement = document.createElement('div');
      progressElement.id = 'import-progress';
      document.querySelector('.header').appendChild(progressElement);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        progressElement.innerText = `Importando ${i+1} de ${jsonData.length}...`;
        
        try {
          const retornoData = {
            equipe: row.Equipe || row.equipe || row['Nome da Equipe'] || '',
            lider: row.Líder || row.lider || row.Líderes || row.Responsável || '',
            data: formatDate(row.Data || row.data || row['Data do Retorno'] || ''),
            instalacao: row.Instalação || row.instalacao || row.Instalacao || row['Nº Instalação'] || '',
            nota: row.Nota || row.nota || row['Número da Nota'] || row['Nota Fiscal'] || '',
            irregularidade: row.Irregularidade || row.irregularidade || row.Problema || '',
            observacao: row.Observação || row.observacao || row.Observacao || row.Comentários || '',
            obs2: row['Obs 2'] || row.obs2 || row.Obs2 || row['Observação 2'] || '',
            medidorInstalado: row['Medidor Instalado'] || row.medidorInstalado || row['Medidor'] || row.Medidor || '',
            situacao: row.Situação || row.situacao || row.Situacao || row.Status || 'Pendente',
            usuario: localStorage.getItem("usuario")
          };
          
          console.log(`Processando linha ${i+1}:`, retornoData);
          
          await addDoc(colRef, retornoData);
          successCount++;
          
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Erro na linha ${i+1}:`, error, "Dados:", row);
          errorCount++;
        }
      }
      
      progressElement.innerHTML = `
        Importação concluída!<br>
        Sucesso: ${successCount} registros<br>
        Erros: ${errorCount} registros
      `;
      setTimeout(() => progressElement.remove(), 10000);
    } catch (error) {
      console.error("Erro na importação:", error);
      alert("Erro ao processar a planilha. Verifique o console (F12) para detalhes.");
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
      obs2: form.obs2.value,
      medidorInstalado: form.medidorInstalado.value,
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
      <th>Número da Nota</th><th>Irregularidade</th><th>Observação</th><th>Obs 2</th><th>Medidor Instalado</th><th>Situação</th>`;
    if (lideres.includes(nome)) html += `<th>Ações</th>`;
    html += `</tr></thead><tbody>`;

    snapshotDocs.forEach(docSnap => {
      const d = docSnap.data();
      const id = docSnap.id;
      html += `<tr>
        <td>${d.equipe}</td><td>${d.lider}</td><td>${d.data}</td><td>${d.instalacao}</td>
        <td>${d.nota}</td><td>${d.irregularidade}</td><td>${d.observacao || ''}</td><td>${d.obs2 || ''}</td><td>${d.medidorInstalado || ''}</td><td>
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
    }).map(doc => ({
      Equipe: doc.data().equipe,
      Líder: doc.data().lider,
      Data: doc.data().data,
      Instalação: doc.data().instalacao,
      Nota: doc.data().nota,
      Irregularidade: doc.data().irregularidade,
      Observação: doc.data().observacao,
      "Obs 2": doc.data().obs2,
      "Medidor Instalado": doc.data().medidorInstalado,
      Situação: doc.data().situacao,
      Usuário: doc.data().usuario
    }));

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
