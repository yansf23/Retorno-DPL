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

// Função auxiliar para obter valores de múltiplas colunas possíveis
function getValue(row, possibleKeys) {
  for (const key of possibleKeys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return row[key];
    }
  }
  return '';
}

// Função especial para extrair irregularidades
function extrairIrregularidade(row) {
  // Primeiro tenta encontrar em colunas nomeadas
  const irregularidade = getValue(row, [
    'Irregularidade', 'IRREGULARIDADE', 'Problema', 'PROBLEMA',
    'Tipo Irregularidade', 'Motivo', 'MOTIVO', 'Descrição do Problema'
  ]);
  
  // Se não encontrar, procura por padrões no texto
  if (!irregularidade) {
    for (const key in row) {
      if (typeof row[key] === 'string') {
        const lowerValue = row[key].toLowerCase();
        if (lowerValue.includes('sem foto') || 
            lowerValue.includes('incompleto') ||
            lowerValue.includes('faltando') ||
            lowerValue.includes('divergente')) {
          return row[key].substring(0, 150); // Limita o tamanho
        }
      }
    }
  }
  
  return irregularidade || '';
}

// Função especial para extrair observações
function extrairObservacao(row) {
  // Tenta encontrar em colunas convencionais
  const obs = getValue(row, [
    'Observação', 'OBSERVACAO', 'Observacao', 'Comentários', 
    'COMENTARIOS', 'Obs', 'OBS', 'Obs.', 'Anotações', 'ANOTACOES'
  ]);
  
  // Se não encontrar, procura texto longo em outras colunas
  if (!obs) {
    for (const key in row) {
      const value = row[key];
      if (typeof value === 'string' && value.length > 30 && 
          !key.match(/data|instalacao|nota|equipe|lider|situacao/i)) {
        return value.substring(0, 250); // Limita o tamanho
      }
    }
  }
  
  return obs || '';
}

// Função especial para extrair situação
function extrairSituacao(row) {
  // Tenta encontrar em colunas nomeadas
  const situacao = getValue(row, [
    'Situação', 'SITUACAO', 'Status', 'STATUS', 
    'Estado', 'ESTADO', 'Resolução', 'RESOLUCAO'
  ]);
  
  // Analisa o conteúdo para determinar se está resolvido
  if (situacao) {
    const situacaoLower = situacao.toString().toLowerCase();
    if (situacaoLower.includes('resolv') || 
        situacaoLower.includes('conclu') ||
        situacaoLower.includes('finaliz') ||
        situacaoLower.includes('ok') ||
        situacaoLower.includes('complet') ||
        situacaoLower.includes('atendido')) {
      return 'Resolvido';
    }
  }
  
  // Verifica outras colunas para indicadores de resolução
  for (const key in row) {
    const value = row[key];
    if (typeof value === 'string' && value.toLowerCase().includes('resolvido')) {
      return 'Resolvido';
    }
  }
  
  return 'Pendente';
}

// Função para formatar data corretamente
function formatarDataParaFirestore(dataStr) {
  if (!dataStr) return '';
  
  // Se for número (timestamp do Excel)
  if (/^\d+$/.test(dataStr)) {
    const excelTimestamp = parseInt(dataStr);
    if (!isNaN(excelTimestamp)) {
      // Converter timestamp do Excel (dias desde 01/01/1900)
      const date = new Date((excelTimestamp - (25567 + 1)) * 86400 * 1000);
      if (!isNaN(date.getTime())) {
        return formatarDataParaExibicao(date);
      }
    }
  }
  
  // Tentar como objeto Date primeiro
  const dateAttempt = new Date(dataStr);
  if (!isNaN(dateAttempt.getTime())) {
    return formatarDataParaExibicao(dateAttempt);
  }
  
  // Tentar formato DD/MM/YYYY
  const brFormat = dataStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (brFormat) {
    const day = parseInt(brFormat[1], 10);
    const month = parseInt(brFormat[2], 10) - 1;
    let year = parseInt(brFormat[3], 10);
    if (year < 100) year += 2000;
    
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      return formatarDataParaExibicao(date);
    }
  }
  
  // Tentar formato YYYY-MM-DD
  const intFormat = dataStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (intFormat) {
    const date = new Date(dataStr);
    if (!isNaN(date.getTime())) {
      return formatarDataParaExibicao(date);
    }
  }
  
  console.warn("Formato de data não reconhecido:", dataStr);
  return '';
}

function formatarDataParaExibicao(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

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
      
      console.log("Dados brutos da planilha:", jsonData);
      
      const progressElement = document.createElement('div');
      progressElement.id = 'import-progress';
      document.querySelector('.header').appendChild(progressElement);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        progressElement.innerText = `Importando ${i+1} de ${jsonData.length}...`;
        
        try {
          // Mostra os nomes reais das colunas na primeira linha
          if (i === 0) {
            console.log("Nomes reais das colunas na planilha:", Object.keys(row));
          }

          const retornoData = {
            equipe: getValue(row, ['Equipe', 'equipe', 'Nome da Equipe', 'EQUIPE']),
            lider: getValue(row, ['Líder', 'Lider', 'lider', 'Líderes', 'Responsável', 'RESPONSAVEL']),
            data: formatarDataParaFirestore(getValue(row, ['Data', 'data', 'DATA', 'Data Retorno'])),
            instalacao: getValue(row, ['Instalação', 'Instalacao', 'instalacao', 'Nº Instalação', 'INSTALACAO']),
            nota: getValue(row, ['Nota', 'nota', 'Número da Nota', 'NUMERO NOTA', 'NOTA FISCAL']),
            irregularidade: extrairIrregularidade(row),
            observacao: extrairObservacao(row),
            obs2: getValue(row, ['Obs 2', 'OBS2', 'Observação 2', 'Obs Complementar', 'OBS COMPLEMENTAR']),
            medidorInstalado: getValue(row, ['Medidor Instalado', 'MEDIDOR', 'Medidor', 'Nº Medidor']),
            situacao: extrairSituacao(row),
            usuario: localStorage.getItem("usuario")
          };

          console.log(`Dados processados linha ${i+1}:`, retornoData);
          
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

window.limparTodosRetornos = async function() {
  const nome = localStorage.getItem("usuario");
  if (!lideres.includes(nome)) {
    alert("Apenas líderes podem limpar todos os retornos.");
    return;
  }

  if (!confirm("ATENÇÃO! Isso irá remover TODOS os retornos permanentemente. Deseja continuar?")) {
    return;
  }

  try {
    const progressElement = document.createElement('div');
    progressElement.id = 'import-progress';
    progressElement.innerText = "Removendo todos os retornos...";
    document.querySelector('.header').appendChild(progressElement);

    const snapshot = await getDocs(colRef);
    const batchSize = 20;
    const docs = snapshot.docs;
    
    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = docs.slice(i, i + batchSize);
      await Promise.all(batch.map(doc => deleteDoc(doc.ref)));
      progressElement.innerText = `Removendo... ${Math.min(i + batchSize, docs.length)}/${docs.length}`;
    }

    progressElement.innerText = "Todos os retornos foram removidos com sucesso!";
    setTimeout(() => progressElement.remove(), 5000);
  } catch (error) {
    console.error("Erro ao remover retornos:", error);
    alert("Ocorreu um erro ao remover os retornos.");
  }
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
