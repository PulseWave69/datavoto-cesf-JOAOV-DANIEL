// script.js — gravação das respostas no Firestore
// Responsável: Firebase & Data Lead (validação/UX: Front-end Lead)

import { db, COLECAO } from "./firebase-config.js";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const form = document.getElementById("form-pesquisa");
const btnEnviar = document.getElementById("btn-enviar");
const status = document.getElementById("status");
const sucesso = document.getElementById("sucesso");
const btnOutra = document.getElementById("btn-outra");

const MAX_PAUTAS = 3;

/* ---------------- Utilidades de UI ---------------- */

function mostrarErro(nome, mensagem) {
  const el = document.querySelector(`[data-erro-para="${nome}"]`);
  if (el) el.textContent = mensagem;
  const campo = form.elements[nome];
  // RadioNodeList não tem classList; marcamos só inputs/selects individuais
  if (campo && campo.classList) campo.classList.add("invalido");
}

function limparErros() {
  document.querySelectorAll(".erro").forEach((e) => (e.textContent = ""));
  document.querySelectorAll(".invalido").forEach((e) => e.classList.remove("invalido"));
  status.textContent = "";
  status.className = "";
}

/* ---------------- Leitura + validação ---------------- */

/**
 * Lê o formulário, valida e devolve o documento pronto para o Firestore.
 * Retorna null se houver erro (as mensagens já foram exibidas).
 */
function lerFormulario() {
  limparErros();
  const dados = new FormData(form);
  let valido = true;
  let primeiroErro = null;

  const falhar = (nome, msg) => {
    mostrarErro(nome, msg);
    valido = false;
    primeiroErro ??= nome;
  };

  const faixaEtaria = dados.get("faixaEtaria");
  const bairro = dados.get("bairro");
  const rotina = dados.get("rotina");
  const rendaFamiliar = dados.get("rendaFamiliar");
  const certezaVoto = dados.get("certezaVoto");
  const pautas = dados.getAll("pautas");

  if (!faixaEtaria) falhar("faixaEtaria", "Escolha a sua faixa etária.");
  if (!bairro) falhar("bairro", "Escolha o seu bairro.");
  if (!rotina) falhar("rotina", "Diga se você estuda, trabalha ou ambos.");
  if (!rendaFamiliar) falhar("rendaFamiliar", "Escolha uma faixa de renda.");
  if (!certezaVoto) falhar("certezaVoto", "Escolha uma opção.");

  // IMPORTANTE (dica do professor): inputs chegam como String.
  // Convertendo para Number antes de gravar, senão a média no painel quebra.
  const moradores = Number(form.elements.moradores.value);
  const trabalhadores = Number(form.elements.trabalhadores.value);

  if (form.elements.moradores.value === "" || !Number.isInteger(moradores) || moradores < 1) {
    falhar("moradores", "Informe um número inteiro a partir de 1.");
  }
  if (form.elements.trabalhadores.value === "" || !Number.isInteger(trabalhadores) || trabalhadores < 0) {
    falhar("trabalhadores", "Informe um número inteiro a partir de 0.");
  } else if (Number.isInteger(moradores) && trabalhadores > moradores) {
    falhar("trabalhadores", "Não pode ser maior que o total de moradores.");
  }

  if (pautas.length === 0) falhar("pautas", "Marque pelo menos uma pauta.");
  if (pautas.length > MAX_PAUTAS) falhar("pautas", `Marque no máximo ${MAX_PAUTAS} pautas.`);

  if (!valido) {
    const alvo = form.elements[primeiroErro];
    (alvo?.focus ? alvo : alvo?.[0])?.focus();
    return null;
  }

  return {
    faixaEtaria,
    bairro,
    rotina,
    rendaFamiliar,
    moradores,        // Number
    trabalhadores,    // Number
    certezaVoto,
    pautas,           // Array de strings
    criadoEm: serverTimestamp(), // marcação temporal do servidor
  };
}

/* ---------------- Envio assíncrono ---------------- */

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const documento = lerFormulario();
  if (!documento) return;

  btnEnviar.disabled = true;
  status.textContent = "Enviando…";

  try {
    await addDoc(collection(db, COLECAO), documento);
    form.hidden = true;
    sucesso.hidden = false;
    sucesso.focus();
    form.reset();
  } catch (erro) {
    console.error("Falha ao gravar no Firestore:", erro);
    status.textContent = "Não foi possível enviar. Verifique a conexão e tente de novo.";
    status.className = "falha";
  } finally {
    btnEnviar.disabled = false;
  }
});

btnOutra.addEventListener("click", () => {
  sucesso.hidden = true;
  form.hidden = false;
  limparErros();
  form.elements.faixaEtaria.focus();
});

// Limita as pautas a 3 enquanto a pessoa marca
form.addEventListener("change", (e) => {
  if (e.target.name !== "pautas") return;
  const marcadas = form.querySelectorAll('input[name="pautas"]:checked');
  if (marcadas.length > MAX_PAUTAS) {
    e.target.checked = false;
    mostrarErro("pautas", `Marque no máximo ${MAX_PAUTAS} pautas.`);
  } else {
    document.querySelector('[data-erro-para="pautas"]').textContent = "";
  }
});
