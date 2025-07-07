import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, onSnapshot, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

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
const colRef = collection(db, "retornos");

const usuarios = ["Yan", "Dandara", "Daniela", "Mylena", "Vanessa", "Mikaelly", "Herlayne", "Charliene", "Thaís"];
const lideres = ["Herlayne", "Thaís"];

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
}
