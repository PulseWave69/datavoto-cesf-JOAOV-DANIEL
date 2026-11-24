// admin.js — painel administrativo
// Responsável: Backend & Analytics Lead

import { db, COLECAO } from "./firebase-config.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

/* ====================================================
   1) CONTROLE DE ACESSO POR SENHA (simples, no navegador)
   ----------------------------------------------------
   Guardamos só o hash SHA-256 da senha, nunca a senha em texto.
   Senha padrão: cesf2026  (TROQUEM!)
   Para gerar outro hash, rode no console do navegador:
     crypto.subtle.digest("SHA-256", new TextEncoder().encode("nova-senha"))
       .then(b => console.log([...new Uint8Array(b)].map(x => x.toString(16).padStart(2,"0")).join("")))
   AVISO: isto é proteção de interface, não segurança real
   (o código é público no GitHub Pages). Para segurança de verdade, use Firebase Auth.
   ==================================================== */
const HASH_SENHA = "4a7642be7f9af49836659ca908f2300022f3763a15a94ec4719d54f58eb65db5";
const CHAVE_SESSAO = "datavoto_admin_ok";

async function sha256(texto) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const telaLogin = document.getElementById("tela-login");
const telaPainel = document.getElementById("tela-painel");
const formLogin = document.getElementById("form-login");
const erroLogin = document.getElementById("erro-login");
const statusPainel = document.getElementById("status-painel");

function entrar() {
  telaLogin.hidden = true;
  telaPainel.hidden = false;
  carregarPainel();
}

formLogin.addEventListener("submit", async (e) => {
  e.preventDefault();
  const digitada = document.getElementById("senha").value;
  if ((await sha256(digitada)) === HASH_SENHA) {
    sessionStorage.setItem(CHAVE_SESSAO, "1");
    erroLogin.textContent = "";
    entrar();
  } else {
    erroLogin.textContent = "Senha incorreta.";
  }
});

document.getElementById("btn-sair").addEventListener("click", () => {
  sessionStorage.removeItem(CHAVE_SESSAO);
  location.reload();
});
document.getElementById("btn-atualizar").addEventListener("click", carregarPainel);

if (sessionStorage.getItem(CHAVE_SESSAO) === "1") entrar();

/* ====================================================
   2) CONSULTA + AGREGAÇÕES
   ==================================================== */

/** Média de um campo numérico, ignorando valores que não sejam Number. */
function media(lista, campo) {
  const nums = lista.map((r) => r[campo]).filter((v) => typeof v === "number" && !Number.isNaN(v));
  if (nums.length === 0) return 0;
  return nums.reduce((soma, v) => soma + v, 0) / nums.length;
}

/** Conta ocorrências de um campo texto. Retorna Map(rótulo -> contagem). */
function contar(lista, campo) {
  const mapa = new Map();
  for (const r of lista) {
    const v = r[campo];
    if (v) mapa.set(v, (mapa.get(v) ?? 0) + 1);
  }
  return mapa;
}

/** Conta ocorrências de um campo que é array (pautas). */
function contarArray(lista, campo) {
  const mapa = new Map();
  for (const r of lista) {
    for (const v of r[campo] ?? []) mapa.set(v, (mapa.get(v) ?? 0) + 1);
  }
  return mapa;
}

/** Ordena do maior para o menor, mantendo ordem fixa quando passada. */
function ordenado(mapa, ordemFixa) {
  if (ordemFixa) {
    const rotulos = ordemFixa.filter((r) => mapa.has(r));
    return { rotulos, valores: rotulos.map((r) => mapa.get(r)) };
  }
  const pares = [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  return { rotulos: pares.map((p) => p[0]), valores: pares.map((p) => p[1]) };
}

/* ====================================================
   3) GRÁFICOS (Chart.js)
   ==================================================== */
const CORES = ["#0b4f6c", "#f2a541", "#2f8f9d", "#c97f12", "#6a8da0", "#e0c068", "#1d6f8a", "#8c5a0b", "#4fa6b5"];
const graficos = {}; // guarda instâncias para destruir antes de redesenhar

function desenhar(idCanvas, tipo, { rotulos, valores }, opcoes = {}) {
  graficos[idCanvas]?.destroy();
  const ehRosca = tipo === "doughnut";
  graficos[idCanvas] = new Chart(document.getElementById(idCanvas), {
    type: tipo,
    data: {
      labels: rotulos,
      datasets: [{
        label: "Respostas",
        data: valores,
        backgroundColor: ehRosca ? CORES : CORES[0],
        borderWidth: ehRosca ? 2 : 0,
        borderColor: "#fff",
        borderRadius: ehRosca ? 0 : 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: opcoes.horizontal ? "y" : "x",
      plugins: { legend: { display: ehRosca, position: "bottom" } },
      scales: ehRosca ? {} : {
        [opcoes.horizontal ? "x" : "y"]: { beginAtZero: true, ticks: { precision: 0 } },
      },
    },
  });
}

const ORDEM_FAIXA = ["Até 15 anos", "16 a 17 anos", "18 a 24 anos", "25 a 34 anos", "35 a 44 anos", "45 a 59 anos", "60 anos ou mais"];
const ORDEM_RENDA = ["Até 1 salário mínimo", "De 1 a 2 salários mínimos", "De 2 a 4 salários mínimos", "De 4 a 8 salários mínimos", "Mais de 8 salários mínimos", "Prefiro não informar"];

/* ====================================================
   4) CARREGAMENTO
   ==================================================== */
async function carregarPainel() {
  statusPainel.textContent = "Carregando respostas…";
  try {
    const snap = await getDocs(collection(db, COLECAO));
    const respostas = snap.docs.map((d) => d.data());

    // Métricas gerais
    document.getElementById("m-total").textContent = respostas.length;
    document.getElementById("m-moradores").textContent = media(respostas, "moradores").toFixed(1).replace(".", ",");
    document.getElementById("m-trabalhadores").textContent = media(respostas, "trabalhadores").toFixed(1).replace(".", ",");

    // Gráficos
    desenhar("g-faixa", "bar", ordenado(contar(respostas, "faixaEtaria"), ORDEM_FAIXA));
    desenhar("g-rotina", "doughnut", ordenado(contar(respostas, "rotina")));
    desenhar("g-renda", "bar", ordenado(contar(respostas, "rendaFamiliar"), ORDEM_RENDA), { horizontal: true });
    desenhar("g-voto", "doughnut", ordenado(contar(respostas, "certezaVoto")));
    desenhar("g-pautas", "bar", ordenado(contarArray(respostas, "pautas")));
    desenhar("g-bairro", "bar", ordenado(contar(respostas, "bairro")));

    statusPainel.textContent = respostas.length === 0
      ? "Ainda não há respostas. Compartilhe o link da pesquisa."
      : `Atualizado às ${new Date().toLocaleTimeString("pt-BR")}.`;
  } catch (erro) {
    console.error(erro);
    statusPainel.textContent = "Erro ao ler o Firestore. Confira as regras de segurança e a configuração.";
  }
}
